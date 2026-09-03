import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";
import { parse as parseYaml } from "yaml";
import { DRAFT_VERSION, ROOT, isMain } from "./lib/releases.js";

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

export function generateMcp(specDir: string, outDir: string, version: string): void {
    const skillsFile = resolve(specDir, "skills.yaml");
    mkdirSync(outDir, { recursive: true });

    const manifest = parseYaml(readFileSync(skillsFile, "utf-8")) as SkillsManifest;
    if (manifest.version !== version) throw new Error(`Manifest version ${manifest.version} does not match requested output ${version}`);

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

if (isMain(import.meta.url)) {
  try {
    generateMcp(resolve(ROOT, "spec/latest"), resolve(ROOT, "generated/latest"), DRAFT_VERSION);
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}
