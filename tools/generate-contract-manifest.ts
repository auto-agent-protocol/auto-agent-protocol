import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { parse as parseYaml } from "yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

interface Skill {
  id: string;
  request_schema: string;
  response_schema: string;
  anonymous_allowed: boolean;
  consent_required: boolean;
  adf_compatible: boolean;
}

interface SkillsManifest {
  version: string;
  schema_base_url: string;
  skills: Skill[];
}

async function main() {
  const versions = ["v0.1"];

  for (const version of versions) {
    const skillsFile = resolve(ROOT, "spec", version, "skills.yaml");
    const outDir = resolve(ROOT, "generated", version);
    mkdirSync(outDir, { recursive: true });

    const manifest = parseYaml(readFileSync(skillsFile, "utf-8")) as SkillsManifest;

    const sample = {
      contract: {
        name: "Auto Agent Protocol A2A Automotive Retail Profile",
        version: "0.1.0",
        uri: "https://autoagentprotocol.org/v0.1/",
      },
      dealer: {
        dealer_id: "dealer_demo_toyota",
        name: "Demo Toyota",
        managed_by: "Lumika AI",
      },
      a2a: {
        endpoint: "https://demo-toyota.agents.lumika.ai/a2a",
        protocol_binding: "JSONRPC",
        skills: manifest.skills.map((s) => ({
          id: s.id,
          request_schema: `${manifest.schema_base_url}${s.request_schema}`,
          response_schema: `${manifest.schema_base_url}${s.response_schema}`,
          anonymous_allowed: s.anonymous_allowed,
          consent_required: s.consent_required,
          ...(s.id.startsWith("lead.") ? { adf_compatible: s.adf_compatible } : {}),
        })),
      },
      auth_type: null,
      llm: {
        guide_url: "https://demo-toyota.agents.lumika.ai/.well-known/auto-agent-llm-guide.md",
        rules: [
          "Use inventory.search or inventory.vehicle before submitting a lead if the user is still researching.",
          "Do not submit lead.general, lead.vehicle, or lead.appointment unless the user explicitly consents to share contact information with this dealer.",
          "Use lead.vehicle for vehicle-specific CRM/ADF leads.",
          "Use lead.appointment for test drive, call, video call, showroom visit, or trade-in appraisal appointment requests.",
          "Never invent VIN, stock number, price, availability, or consent.",
        ],
      },
    };

    const outFile = resolve(outDir, "contract-manifest.sample.json");
    writeFileSync(outFile, JSON.stringify(sample, null, 2) + "\n");
    console.log(`Generated ${outFile}`);
  }
}

main();
