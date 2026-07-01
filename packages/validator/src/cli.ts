// aap-validate — command-line conformance checker for Auto Agent Protocol payloads.
//
// Usage:
//   aap-validate <file.json>                 # auto-detect schema from the payload's `type`
//   aap-validate <schema-or-type> <file.json>
//   aap-validate --list
//
// It validates a JSON payload against the AAP JSON Schemas bundled with this
// package (the current released spec). Exit code 0 = valid, 1 = invalid,
// 2 = usage/IO error — so it drops straight into CI.

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import type { ErrorObject } from "ajv";
import { AAPValidator } from "./index.js";

const EXIT_OK = 0;
const EXIT_INVALID = 1;
const EXIT_USAGE = 2;

// AAP message `type` -> schema basename, mirroring spec/<latest>/skills.yaml.
// Lets a caller validate a payload by its on-the-wire DataPart `type` instead of
// having to know the schema file name (which differs for inventory.vehicle).
const TYPE_TO_SCHEMA: Record<string, string> = {
  "dealer.information.request": "dealer-information-request",
  "dealer.information.response": "dealer-information-response",
  "inventory.facets.request": "inventory-facets-request",
  "inventory.facets.response": "inventory-facets-response",
  "inventory.search.request": "inventory-search-request",
  "inventory.search.response": "inventory-search-response",
  "inventory.vehicle.request": "vehicle-detail-request",
  "inventory.vehicle.response": "vehicle-detail-response",
  "lead.submit.request": "lead-submit-request",
  "lead.submit.response": "lead-submit-response",
};

interface ParsedArgs {
  positionals: string[];
  schemasDir?: string;
  list: boolean;
  help: boolean;
  version: boolean;
}

function parseArgs(argv: string[]): ParsedArgs {
  const out: ParsedArgs = { positionals: [], list: false, help: false, version: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "-h":
      case "--help":
        out.help = true;
        break;
      case "-v":
      case "--version":
        out.version = true;
        break;
      case "--list":
        out.list = true;
        break;
      case "--schemas":
        out.schemasDir = argv[++i];
        break;
      default:
        if (arg.startsWith("--schemas=")) {
          out.schemasDir = arg.slice("--schemas=".length);
        } else if (arg.startsWith("-")) {
          fail(`unknown option: ${arg}`);
        } else {
          out.positionals.push(arg);
        }
    }
  }
  return out;
}

const HELP = `aap-validate — validate a payload against the Auto Agent Protocol schemas

Usage:
  aap-validate <file.json>                 Auto-detect the schema from the payload's "type"
  aap-validate <schema-or-type> <file.json>  Validate against a named schema or AAP message type
  aap-validate --list                      List the available schema names and message types

Options:
  --schemas <dir>   Validate against schemas in <dir> instead of the bundled set
  -h, --help        Show this help
  -v, --version     Print the package version

Examples:
  aap-validate ./agent-card.json
  aap-validate inventory-search-request ./search.json
  aap-validate inventory.search.request ./search.json
  curl -s https://dealer.example.com/.well-known/agent-card.json -o card.json && aap-validate agent-card card.json

Exit codes: 0 valid · 1 invalid · 2 usage/IO error`;

function fail(message: string): never {
  process.stderr.write(`aap-validate: ${message}\n`);
  process.exit(EXIT_USAGE);
}

function resolveSchemasDir(override?: string): string {
  if (override) {
    if (!existsSync(override)) fail(`--schemas directory not found: ${override}`);
    return override;
  }
  // Schemas are bundled next to this file at build time (dist/schemas).
  const bundled = resolve(__dirname, "schemas");
  if (existsSync(bundled)) return bundled;
  fail(
    "bundled schemas not found. Run `pnpm --filter @autoagentprotocol/validator build`, " +
      "or pass --schemas <dir> pointing at a spec/<version>/schemas directory."
  );
}

function readPackageVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(resolve(__dirname, "..", "package.json"), "utf-8"));
    return typeof pkg.version === "string" ? pkg.version : "unknown";
  } catch {
    return "unknown";
  }
}

// Normalise whatever the user passed (a schema basename, a `*.schema.json`
// file name, or an AAP message `type`) into a loaded schema key, or null.
function normaliseSchemaName(input: string, known: Set<string>): string | null {
  const stripped = input.endsWith(".schema.json")
    ? input.slice(0, -".schema.json".length)
    : input;
  if (known.has(stripped)) return stripped;
  const mapped = TYPE_TO_SCHEMA[input] ?? TYPE_TO_SCHEMA[stripped];
  if (mapped && known.has(mapped)) return mapped;
  return null;
}

// Pull the AAP `type` from a payload (top level, or from a DataPart's `data`).
function detectType(payload: unknown): string | null {
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    if (typeof obj.type === "string") return obj.type;
    const data = obj.data;
    if (data && typeof data === "object" && typeof (data as Record<string, unknown>).type === "string") {
      return (data as Record<string, unknown>).type as string;
    }
  }
  return null;
}

function formatErrors(errors: ErrorObject[]): string {
  return errors
    .map((e) => {
      const where = e.instancePath || "(root)";
      const extra =
        e.keyword === "additionalProperties" && e.params && "additionalProperty" in e.params
          ? ` (\`${(e.params as { additionalProperty: string }).additionalProperty}\`)`
          : e.keyword === "enum" && e.params && "allowedValues" in e.params
            ? ` (allowed: ${JSON.stringify((e.params as { allowedValues: unknown[] }).allowedValues)})`
            : "";
      return `  • ${where} ${e.message ?? "is invalid"}${extra}`;
    })
    .join("\n");
}

function loadJson(file: string): unknown {
  if (!existsSync(file)) fail(`file not found: ${file}`);
  let raw: string;
  try {
    raw = readFileSync(file, "utf-8");
  } catch (e) {
    fail(`cannot read ${file}: ${(e as Error).message}`);
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    fail(`${file} is not valid JSON: ${(e as Error).message}`);
  }
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    process.stdout.write(`${HELP}\n`);
    process.exit(EXIT_OK);
  }
  if (args.version) {
    process.stdout.write(`${readPackageVersion()}\n`);
    process.exit(EXIT_OK);
  }

  const validator = new AAPValidator();
  validator.loadSchemas(resolveSchemasDir(args.schemasDir));
  const known = new Set(validator.getSchemaNames());

  if (args.list) {
    process.stdout.write("Available schemas:\n");
    for (const name of [...known].sort()) process.stdout.write(`  ${name}\n`);
    process.stdout.write("\nMessage types (usable in place of a schema name):\n");
    for (const t of Object.keys(TYPE_TO_SCHEMA)) process.stdout.write(`  ${t}  ->  ${TYPE_TO_SCHEMA[t]}\n`);
    process.exit(EXIT_OK);
  }

  if (args.positionals.length === 0) {
    process.stderr.write(`${HELP}\n`);
    process.exit(EXIT_USAGE);
  }

  // One positional => the file (auto-detect schema). Two => <schema> <file>.
  let schemaArg: string | undefined;
  let file: string;
  if (args.positionals.length === 1) {
    file = args.positionals[0];
  } else {
    schemaArg = args.positionals[0];
    file = args.positionals[1];
  }

  const payload = loadJson(file);

  let schemaName: string | null;
  if (schemaArg) {
    schemaName = normaliseSchemaName(schemaArg, known);
    if (!schemaName) {
      fail(`unknown schema or type "${schemaArg}". Run \`aap-validate --list\` to see the options.`);
    }
  } else {
    const type = detectType(payload);
    if (!type) {
      fail(
        `could not auto-detect a schema: ${file} has no "type" field. ` +
          `Pass a schema name explicitly, e.g. \`aap-validate agent-card ${file}\` (see --list).`
      );
    }
    schemaName = normaliseSchemaName(type, known);
    if (!schemaName) {
      fail(`payload "type" is "${type}", which has no matching AAP schema. Run \`aap-validate --list\`.`);
    }
  }

  const result = validator.validate(schemaName, payload);
  if (result.valid) {
    process.stdout.write(`✓ OK — ${file} is a valid ${schemaName}\n`);
    process.exit(EXIT_OK);
  }

  process.stderr.write(`✗ INVALID — ${file} failed ${schemaName}:\n`);
  process.stderr.write(`${formatErrors(result.errors ?? [])}\n`);
  process.exit(EXIT_INVALID);
}

main();
