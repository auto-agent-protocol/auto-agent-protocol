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
}

interface SkillsManifest {
  version: string;
  schema_base_url: string;
  skills: Skill[];
}

function toMcpToolName(skillId: string): string {
  return `aap_${skillId.replace(/\./g, "_")}`;
}

async function main() {
  const versions = ["v0.1"];

  for (const version of versions) {
    const skillsFile = resolve(ROOT, "spec", version, "skills.yaml");
    const outDir = resolve(ROOT, "generated", version);
    mkdirSync(outDir, { recursive: true });

    const manifest = parseYaml(readFileSync(skillsFile, "utf-8")) as SkillsManifest;

    const tools = manifest.skills.map((skill) => ({
      name: toMcpToolName(skill.id),
      description: skill.description,
      inputSchema: {
        $ref: `${manifest.schema_base_url}${skill.request_schema}`,
      },
      annotations: {
        aap_skill_id: skill.id,
        aap_request_type: skill.request_type,
        aap_response_type: skill.response_type,
        aap_response_schema: `${manifest.schema_base_url}${skill.response_schema}`,
      },
    }));

    const mcpManifest = {
      name: "auto-agent-protocol",
      version: manifest.version,
      description:
        "MCP server descriptor that exposes Auto Agent Protocol automotive skills as MCP tools. Each tool's input matches the corresponding AAP request schema; the wrapper invokes the dealer's A2A endpoint with the same payload as a typed DataPart.",
      protocolVersion: "2025-06-18",
      tools,
    };

    const outFile = resolve(outDir, "mcp.json");
    writeFileSync(outFile, JSON.stringify(mcpManifest, null, 2) + "\n");
    console.log(`Generated ${outFile}`);
  }
}

main();
