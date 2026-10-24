import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { DRAFT_VERSION, ROOT, isMain } from "./lib/releases.js";

type Schema = Record<string, unknown>;

interface Skill {
  id: string;
  name: string;
  description: string;
  request_schema: string;
  response_schema: string;
  request_type: string;
  response_type: string;
}

interface SkillsManifest {
  version: string;
  extension_uri: string;
  schema_base_url: string;
  skills: Skill[];
}

export const MCP_VERSIONS = ["2026-07-28", "2025-11-25"] as const;
export const AAP_MCP_META = "autoagentprotocol.org/aap";

function bundleSchemas(schemasDir: string, files: string[]): Schema {
  const documents = new Map<string, Schema>();
  const definitions: Record<string, unknown> = {};
  const sources = new Map<string, string>();

  function read(file: string): Schema {
    if (relative(schemasDir, file).startsWith("..")) throw new Error(`Schema escapes its directory: ${file}`);
    if (!documents.has(file)) documents.set(file, JSON.parse(readFileSync(file, "utf8")) as Schema);
    return documents.get(file)!;
  }

  function reference(ref: string, file: string): string {
    const [path, fragment = ""] = ref.split("#");
    if (/^[a-z][a-z0-9+.-]*:/i.test(path) || (fragment && !fragment.startsWith("/"))) {
      throw new Error(`MCP schemas require local JSON Pointer references: ${ref}`);
    }
    const target = path ? resolve(dirname(file), path) : file;
    const name = `${relative(schemasDir, target).replace(/\.schema\.json$/, "")}${fragment}`.replace(/[^a-zA-Z0-9_]/g, "_");
    const source = `${target}#${fragment}`;
    if (sources.has(name) && sources.get(name) !== source) throw new Error(`MCP schema definition collision: ${name}`);
    if (!sources.has(name)) {
      sources.set(name, source);
      definitions[name] = {};
      let value: unknown = read(target);
      for (const segment of fragment.split("/").slice(1)) {
        const key = decodeURIComponent(segment).replace(/~1/g, "/").replace(/~0/g, "~");
        if (!value || typeof value !== "object" || !(key in value)) throw new Error(`Unresolved schema reference: ${ref}`);
        value = (value as Schema)[key];
      }
      definitions[name] = rewrite(value, target);
    }
    return `#/$defs/${name}`;
  }

  function rewrite(value: unknown, file: string): unknown {
    if (Array.isArray(value)) return value.map(item => rewrite(item, file));
    if (!value || typeof value !== "object") return value;
    return Object.fromEntries(Object.entries(value).flatMap(([key, item]) => {
      if (["$id", "$schema", "$defs"].includes(key)) return [];
      return [[key, key === "$ref" && typeof item === "string" ? reference(item, file) : rewrite(item, file)]];
    }));
  }

  const paths = files.map(file => resolve(schemasDir, file));
  const root = paths.length === 1
    ? rewrite(read(paths[0]), paths[0]) as Schema
    : { type: "object", oneOf: paths.map(file => ({ $ref: reference("#", file) })) };
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    ...root,
    ...(Object.keys(definitions).length ? { $defs: definitions } : {}),
  };
}

export function generateMcp(specDir: string, outDir: string, version: string): void {
  const manifest = parseYaml(readFileSync(resolve(specDir, "skills.yaml"), "utf8")) as SkillsManifest;
  if (manifest.version !== version) throw new Error(`Manifest version ${manifest.version} does not match requested output ${version}`);
  const schemasDir = resolve(specDir, "schemas");
  const tools = manifest.skills.map(skill => {
    const readOnly = ["dealer.information", "inventory.facets", "inventory.search", "inventory.vehicle"].includes(skill.id);
    if (!readOnly && skill.id !== "lead.submit") throw new Error(`MCP behavior annotations are not defined for ${skill.id}`);
    const inputSchema = bundleSchemas(schemasDir, [skill.request_schema]);
    return {
      name: `aap_${skill.id.replaceAll(".", "_")}`,
      title: skill.name,
      description: skill.description,
      inputSchema,
      outputSchema: bundleSchemas(schemasDir, [skill.response_schema, "error.schema.json"]),
      annotations: {
        readOnlyHint: readOnly,
        destructiveHint: false,
        idempotentHint: readOnly,
        openWorldHint: true,
      },
      _meta: {
        [AAP_MCP_META]: {
          version: manifest.version,
          skill: skill.id,
          request_type: skill.request_type,
          response_type: skill.response_type,
          request_schema: `${manifest.schema_base_url}${skill.request_schema}`,
          response_schema: `${manifest.schema_base_url}${skill.response_schema}`,
          error_schema: `${manifest.schema_base_url}error.schema.json`,
          ...(skill.id === "inventory.search" && existsSync(resolve(schemasDir, "inventory-capabilities.schema.json"))
            ? { capabilities_schema: `${manifest.schema_base_url}inventory-capabilities.schema.json` }
            : {}),
        },
      },
    };
  });

  const catalog = {
    name: "auto-agent-protocol",
    version: manifest.version,
    description: "Reference MCP tool catalog for Auto Agent Protocol. Publish the implemented subset through tools/list with deployment-specific capabilities. Tool arguments and structuredContent use the shared AAP payloads; errors use aap.error with isError: true. This catalog is not an MCP endpoint or a JSON-RPC response.",
    protocolVersion: MCP_VERSIONS[0],
    supportedProtocolVersions: MCP_VERSIONS,
    transport: "streamable-http",
    extension_uri: manifest.extension_uri,
    tools,
  };
  mkdirSync(outDir, { recursive: true });
  const outFile = resolve(outDir, "mcp.json");
  writeFileSync(outFile, JSON.stringify(catalog, null, 2) + "\n");
  console.log(`Generated ${outFile}`);
}

if (isMain(import.meta.url)) {
  try {
    generateMcp(resolve(ROOT, "spec/latest"), resolve(ROOT, "generated/latest"), DRAFT_VERSION);
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}
