import { cpSync, mkdirSync, writeFileSync, readdirSync, rmSync, readFileSync } from "fs";
import { resolve, basename, relative, sep } from "path";

const ROOT = resolve(__dirname, "../../..");
const OUT = resolve(__dirname, "../dist");
const SCHEMAS_OUT = resolve(OUT, "schemas");

// The package ships only the approved stable release selected by releases.json.
// Working changes under spec/latest never alter a published package build.
function stableVersion(): string {
  const registry = JSON.parse(readFileSync(resolve(ROOT, "releases.json"), "utf8")) as {
    stable?: string;
    releases?: Array<{contract: string}>;
  };
  if (!registry.releases?.some(release => release.contract === registry.stable)) {
    throw new Error("releases.json has no valid stable release");
  }
  return registry.stable!;
}

// inventory-search-request.schema.json -> inventorySearchRequest
function exportName(schemaFile: string): string {
  return basename(schemaFile, ".schema.json")
    .split("-")
    .map((s, i) => (i === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1)))
    .join("");
}

// Every schema file under `dir`, recursively, as posix paths relative to `base`.
function listSchemas(dir: string, base: string = dir): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) return listSchemas(full, base);
    return entry.name.endsWith(".schema.json") ? [relative(base, full).split(sep).join("/")] : [];
  });
}

function main() {
  const stable = stableVersion();

  // Clean dist so a schema renamed/removed in the stable release can't linger and
  // get published under files:["dist"]. Ship the schemas under a stable,
  // version-agnostic `dist/schemas/` directory.
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(SCHEMAS_OUT, { recursive: true });
  cpSync(resolve(ROOT, "spec", stable, "schemas"), SCHEMAS_OUT, { recursive: true });

  const all = listSchemas(SCHEMAS_OUT); // e.g. ["agent-card.schema.json", "_primitives/address.schema.json"]
  const topLevel = all.filter((rel) => !rel.includes("/"));

  // The main entry exports the stable schemas as data:
  //  - one `<name>Schema` named export per top-level request/response schema,
  //  - `allSchemas` (every schema, including _primitives) so a consumer can
  //    register the complete set for cross-file $ref resolution without touching
  //    the filesystem,
  //  - `LATEST` (single source of truth) so downstream code never hardcodes a
  //    version. Raw files remain reachable via the version-agnostic
  //    "@autoagentprotocol/schemas/latest/<name>.schema" subpath.
  let js = `// Auto-generated schema index (stable = ${stable})\n"use strict";\n`;
  let dts = `// Auto-generated schema index (stable = ${stable})\n`;
  for (const rel of topLevel) {
    const name = exportName(rel);
    js += `exports.${name}Schema = require("./schemas/${rel}");\n`;
    dts += `export declare const ${name}Schema: Record<string, unknown>;\n`;
  }
  js += `exports.allSchemas = [\n${all.map((rel) => `  require("./schemas/${rel}")`).join(",\n")}\n];\n`;
  js += `exports.LATEST = ${JSON.stringify(stable)};\n`;
  dts += `export declare const allSchemas: Record<string, unknown>[];\n`;
  dts += `export declare const LATEST: string;\n`;

  writeFileSync(resolve(OUT, "index.js"), js);
  writeFileSync(resolve(OUT, "index.d.ts"), dts);

  console.log(`Built @autoagentprotocol/schemas: stable ${stable} (${all.length} schemas)`);
}

main();
