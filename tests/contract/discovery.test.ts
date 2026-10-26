import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { globSync } from "glob";
import { checkDiscovery } from "../../tools/lib/discovery.js";
import { ROOT } from "../../tools/lib/releases.js";
import { validateManifest } from "../../tools/validate-manifest.js";

const spec = resolve(ROOT, "spec/latest");
const read = (name: string) => JSON.parse(readFileSync(resolve(spec, "examples", `${name}.example.json`), "utf8"));
const manifest = validateManifest(spec, "discovery tests");
const cardUrl = "https://demo-toyota.example.com/.well-known/agent-card.json";
const params = (card: any) => card.capabilities.extensions[0].params;
const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats(ajv);
for (const file of globSync("schemas/**/*.schema.json", { cwd: spec })) ajv.addSchema(JSON.parse(readFileSync(resolve(spec, file), "utf8")));
const validateCard = ajv.getSchema(`${manifest.schema_base_url}agent-card.schema.json`)!;

function deployedTools(card: any): any[] {
  const tools = read("mcp-manifest").tools;
  tools.find((tool: any) => tool.name === "aap_inventory_search")._meta["autoagentprotocol.org/aap"].capabilities = params(card).skills["inventory.search"].capabilities;
  return tools;
}

test("paired discovery and deployed MCP metadata agree on contract, skills and capabilities", () => {
  const card = read("agent-card"), poppy = read("poppy");
  assert.equal(validateCard(card), true, JSON.stringify(validateCard.errors));
  assert.deepEqual(checkDiscovery(card, poppy, manifest, cardUrl, deployedTools(card)), []);
  poppy.organization.domain = poppy.organization.domain.toUpperCase();
  assert.deepEqual(checkDiscovery(card, poppy, manifest, cardUrl), [], "DNS case does not change dealer identity");
  const nativeMcp = { type: "mcp", url: params(card).mcp.url, resource: params(card).mcp.url };
  poppy.apis.push(nativeMcp);
  assert.deepEqual(checkDiscovery(card, poppy, manifest, cardUrl), []);
  nativeMcp.resource += "/different";
  assert.ok(checkDiscovery(card, poppy, manifest, cardUrl).some(error => error.includes("both url and resource")));
});

test("discovery rejects missing MCP generations, missing feature vocabulary and unpinned schemas", () => {
  for (const change of [
    (card: any) => delete params(card).mcp,
    (card: any) => params(card).mcp.protocol_versions.pop(),
    (card: any) => params(card).mcp.url += "?token=example",
    (card: any) => delete params(card).skills["inventory.facets"],
    (card: any) => params(card).skills["inventory.search"].request_schema = "https://other.example/schema.json",
  ]) {
    const card = read("agent-card");
    change(card);
    assert.equal(validateCard(card), false);
  }
});

test("cross-document checks catch declarations that JSON Schema cannot compare", () => {
  for (const change of [
    (card: any, poppy: any) => poppy.extensions["autoagentprotocol.org/aap"].mcp += "/other",
    (card: any) => card.skills.pop(),
    (card: any) => card.skills.push(card.skills[0]),
    (card: any) => Object.assign(params(card).skills["inventory.search"].capabilities, { default_limit: 60, max_limit: 50 }),
    (card: any) => params(card).skills["inventory.search"].capabilities.sort_fields = ["year"],
    (card: any) => params(card).llms_txt = "https://another-dealer.example/llms.txt",
    (card: any) => params(card).poppy = "https://another-dealer.example/.well-known/poppy.json",
    (card: any, poppy: any) => poppy.extensions["autoagentprotocol.org/aap"].aap_version = "2.1.0",
  ]) {
    const card = read("agent-card"), poppy = read("poppy");
    change(card, poppy);
    assert.ok(checkDiscovery(card, poppy, manifest, cardUrl).length);
  }
  const card = read("agent-card"), tools = deployedTools(card);
  tools[0]._meta["autoagentprotocol.org/aap"].version = "2.1.0";
  assert.ok(checkDiscovery(card, read("poppy"), manifest, cardUrl, tools).some(error => error.includes("MCP metadata")));
  const missing = deployedTools(card);
  missing.pop();
  assert.ok(checkDiscovery(card, read("poppy"), manifest, cardUrl, missing).some(error => error.includes("same AAP skill subset")));
  const mismatched = deployedTools(card);
  mismatched.find((tool: any) => tool.name === "aap_inventory_search")._meta["autoagentprotocol.org/aap"].capabilities = { ...params(card).skills["inventory.search"].capabilities, max_limit: 50 };
  assert.ok(checkDiscovery(card, read("poppy"), manifest, cardUrl, mismatched).some(error => error.includes("capabilities must agree")));
});
