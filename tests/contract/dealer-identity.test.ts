import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { globSync } from "glob";
import { ROOT } from "../../tools/lib/releases.js";

const spec = resolve(ROOT, "spec/latest");
const read = (file: string) => JSON.parse(readFileSync(resolve(spec, file), "utf8"));
const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats(ajv);
for (const file of globSync("schemas/**/*.schema.json", { cwd: spec })) ajv.addSchema(read(file));
const validate = (name: string, value: unknown) => ajv.getSchema(read(`schemas/${name}.schema.json`).$id)!(value);

test("an aggregate listing's dealer ID resolves through the existing dealer information skill", () => {
  const listing = { dealer_id: "d-7", vehicle_id: "listing-42", status: "available", updated_at: "2026-10-26T10:00:00Z" };
  assert.equal(validate("inventory-listing", listing), true);
  assert.equal(validate("dealer-information-request", { type: "dealer.information.request", dealer_id: listing.dealer_id }), true);
  assert.equal(validate("dealer-information-response", {
    type: "dealer.information.response",
    data: { dealer_id: listing.dealer_id, name: "Demo Toyota", rooftops: [{ name: "Demo Toyota San Francisco", website: "https://demo-toyota.example.com" }] },
  }), true);
  assert.equal(validate("dealer-information-request", { type: "dealer.information.request", dealer_id: "" }), false);
  assert.equal(validate("dealer-information-request", { type: "dealer.information.request" }), true, "ordinary dealer requests remain parameterless");
  assert.equal(validate("dealer-information-response", read("examples/dealer-information-response.example.json")), true);
  assert.equal(validate("error", { ...read("examples/error.example.json"), code: "DEALER_NOT_FOUND" }), true);
});

test("aggregate discovery requires the seller lookup skill but dealer scope does not", () => {
  const card = read("examples/agent-card.example.json");
  const skills = card.capabilities.extensions[0].params.skills;
  const capabilities = skills["inventory.search"].capabilities;
  capabilities.filters = capabilities.filters.filter((key: string) => key !== "rooftops");
  delete skills["dealer.information"];
  card.skills = card.skills.filter((skill: { id: string }) => skill.id !== "dealer.information");
  assert.equal(validate("agent-card", card), true);
  capabilities.scope = "aggregate";
  assert.equal(validate("agent-card", card), false);
  const original = read("examples/agent-card.example.json");
  skills["dealer.information"] = original.capabilities.extensions[0].params.skills["dealer.information"];
  card.skills.push(original.skills.find((skill: { id: string }) => skill.id === "dealer.information"));
  assert.equal(validate("agent-card", card), true);
});
