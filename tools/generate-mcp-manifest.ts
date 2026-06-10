import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { parse as parseYaml } from "yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

interface Skill {
  id: string;
  name: string;
  description: string;
  request_schema: string;
  response_schema: string;
  request_type: string;
  response_type: string;
  media_type_request?: string;
  media_type_response?: string;
  tags?: string[];
  examples?: string[];
}

interface SkillsManifest {
  version: string;
  schema_base_url: string;
  skills: Skill[];
}

function toMcpToolName(skillId: string): string {
  return `aap_${skillId.replace(/\./g, "_")}`;
}

/**
 * Rewrite relative `$ref`s (e.g. `./vehicle.schema.json`, `./inventory-search-request.schema.json#/$defs/filters`)
 * to absolute schema-base URLs so the inlined inputSchema is resolvable by any MCP/LLM client. Local
 * `#/...` refs are left untouched.
 */
function rewriteRefs(node: unknown, base: string): unknown {
  if (Array.isArray(node)) return node.map((n) => rewriteRefs(n, base));
  if (node && typeof node === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (k === "$ref" && typeof v === "string" && v.startsWith("./")) {
        out[k] = base + v.slice(2);
      } else {
        out[k] = rewriteRefs(v, base);
      }
    }
    return out;
  }
  return node;
}

/** Inline a request schema as a self-contained JSON Schema usable directly as an MCP tool inputSchema. */
function inlineInputSchema(version: string, file: string, base: string): Record<string, unknown> {
  const path = resolve(ROOT, "spec", version, "schemas", file);
  const schema = JSON.parse(readFileSync(path, "utf-8")) as Record<string, unknown>;
  // MCP inputSchema is a plain JSON Schema object; drop the dialect/$id so clients don't try to refetch it.
  delete schema["$schema"];
  delete schema["$id"];
  return rewriteRefs(schema, base) as Record<string, unknown>;
}

async function main() {
  const versions = ["v0.1", "v0.2", "v1.0"];

  for (const version of versions) {
    const skillsFile = resolve(ROOT, "spec", version, "skills.yaml");
    const outDir = resolve(ROOT, "generated", version);
    mkdirSync(outDir, { recursive: true });

    const manifest = parseYaml(readFileSync(skillsFile, "utf-8")) as SkillsManifest;

    const tools = manifest.skills.map((skill) => ({
      name: toMcpToolName(skill.id),
      // A2A skill name + a description an LLM can reason about.
      title: skill.name,
      description: skill.description,
      // Self-contained input contract (inlined) so the LLM knows exactly what arguments to send.
      inputSchema: inlineInputSchema(version, skill.request_schema, manifest.schema_base_url),
      annotations: {
        title: skill.name,
        readOnlyHint: skill.id !== "lead.submit",
        aap_skill_id: skill.id,
        aap_request_type: skill.request_type,
        aap_response_type: skill.response_type,
        aap_response_schema: `${manifest.schema_base_url}${skill.response_schema}`,
        aap_media_type_request: skill.media_type_request,
        aap_media_type_response: skill.media_type_response,
        aap_tags: skill.tags ?? [],
        aap_examples: skill.examples ?? [],
      },
    }));

    const mcpManifest = {
      name: "auto-agent-protocol",
      version: manifest.version,
      description:
        "MCP server descriptor that exposes Auto Agent Protocol automotive skills as MCP tools. Each tool's inputSchema is the full, self-contained AAP request schema; to invoke a skill, wrap the tool arguments as the `data` of an A2A DataPart and send them to the dealer agent's A2A endpoint (JSON-RPC `SendMessage` or HTTP+JSON `message:send`). The dealer's agent-card.json (capabilities.extensions advertising the AAP automotive-retail URI) lists which of these skills the agent implements.",
      protocolVersion: "2025-06-18",
      tools,
    };

    const outFile = resolve(outDir, "mcp.json");
    writeFileSync(outFile, JSON.stringify(mcpManifest, null, 2) + "\n");
    console.log(`Generated ${outFile}`);
  }
}

main();
