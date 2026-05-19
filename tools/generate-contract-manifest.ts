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
          "Always call inventory.search or inventory.vehicle before lead.submit so that the VIN, stock, or vehicle_id you put in vehicle_of_interest is one this dealer actually has in stock or in transit.",
          "Never invoke lead.submit without an explicit, verbatim ConsentGrant captured from the user; consent.allowed_channels MUST be a subset of channels the user agreed to, and consent.scope MUST be ['lead_submission'].",
          "When quoting price to the user, prefer the FTC-final 'price' field; if you show 'list_price' or 'msrp', clearly label them and mention that taxes and fees apply.",
          "Treat 'last_verified_at' as the source of truth for availability claims; if it is older than 24 hours, re-fetch via inventory.vehicle before promising the user the unit is still available.",
          "vehicle_of_interest.condition MUST be one of new|used|cpo. trade_in.condition MUST be one of excellent|good|fair|poor. Buyer agents MUST NOT mix the two vocabularies.",
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
