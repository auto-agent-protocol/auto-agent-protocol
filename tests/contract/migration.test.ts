import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { globSync } from "glob";
import { ROOT } from "../../tools/lib/releases.js";
import { validateManifest } from "../../tools/validate-manifest.js";

const validators = new Map<string, (schema: string, value: unknown) => boolean>();
for (const version of ["v2.1", "latest"]) {
  const ajv = new Ajv2020({ strict: false, allErrors: true });
  addFormats(ajv);
  const schemas = new Map<string, string>();
  for (const file of globSync("**/*.schema.json", { cwd: resolve(ROOT, "spec", version, "schemas") })) {
    const schema = JSON.parse(readFileSync(resolve(ROOT, "spec", version, "schemas", file), "utf8"));
    ajv.addSchema(schema);
    schemas.set(file.replace(".schema.json", ""), schema.$id);
  }
  validators.set(version, (name, value) => ajv.getSchema(schemas.get(name)!)!(value) as boolean);
}
const old = validators.get("v2.1")!;
const current = validators.get("latest")!;

test("migration rejects empty and duplicate filter values instead of silently broadening a search", () => {
  for (const filters of [{ make: [] }, { make: ["Honda", "Honda"] }, { query: "" }, { query: "   " }]) {
    // AAP 4.0 renamed message types to snake_case; AAP 2.1 used the dotted spelling.
    assert.equal(old("inventory-search-request", { type: "inventory.search.request", filters }), true);
    assert.equal(current("inventory-search-request", { type: "inventory_search_request", filters }), false);
  }
  assert.equal(current("inventory-search-request", { type: "inventory_search_request", filters: { make: ["Honda"], query: "EX-L" } }), true);
});

test("migration requires the effective page size even when the request omitted pagination", () => {
  const response = { type: "inventory_search_response", data: { total: 0, vehicles: [] } };
  assert.equal(old("inventory-search-response", { ...response, type: "inventory.search.response" }), true);
  const data = { ...response.data, next_cursor: null, applied_filters: {}, sort: { field: "price", order: "asc" } };
  assert.equal(current("inventory-search-response", { ...response, data }), false);
  assert.equal(current("inventory-search-response", { ...response, data: { ...data, limit: 20 } }), true);
});

test("rate-limited responses provide a machine-readable minimum delay in milliseconds", () => {
  const error = { type: "aap_error", error_id: "err-1", created_at: "2026-10-26T10:00:00Z", code: "RATE_LIMITED", message: "Try later.", retryable: true };
  const seconds = { ...error, details: { retry_after_seconds: 1 } };
  assert.equal(old("error", { ...seconds, type: "aap.error" }), true);
  assert.equal(current("error", seconds), false);
  assert.equal(current("error", error), false);
  assert.equal(current("error", { ...error, details: { retry_after_ms: 1000 } }), true);
  assert.equal(current("error", { ...error, details: { retry_after_ms: -1 } }), false);
});

test("AAP 4.0 uses snake_case skill ids, message types and envelope types everywhere", () => {
  const manifest = validateManifest(resolve(ROOT, "spec/latest"), "snake_case");
  assert.deepEqual(manifest.skills!.map(skill => skill.id), ["dealer_information", "inventory_facets", "inventory_search", "inventory_vehicle", "lead_submit", "trade_in_submit", "credit_application_submit"]);
  for (const skill of manifest.skills!) {
    assert.match(skill.id!, /^[a-z]+(_[a-z]+)+$/, `${skill.id} is snake_case`);
    assert.equal(skill.request_type, `${skill.id}_request`); assert.equal(skill.response_type, `${skill.id}_response`);
  }
  const dotted = /"(?:type|id|skill|request_type|response_type)":\s*"[a-z_]+\.[a-z_.]+"/;
  for (const file of globSync("**/*.json", { cwd: resolve(ROOT, "spec/latest") })) {
    assert.doesNotMatch(readFileSync(resolve(ROOT, "spec/latest", file), "utf8"), dotted, `${file} still carries a dotted identifier`);
  }
  for (const [name, dottedType, snakeType] of [["inventory-search-request", "inventory.search.request", "inventory_search_request"], ["lead-submit-response", "lead.submit.response", "lead_submit_response"], ["error", "aap.error", "aap_error"]]) {
    const example = JSON.parse(readFileSync(resolve(ROOT, `spec/latest/examples/${name}.example.json`), "utf8"));
    assert.equal(example.type, snakeType);
    assert.equal(current(name, example), true);
    assert.equal(current(name, { ...example, type: dottedType }), false, `the 3.x spelling ${dottedType} is not valid in 4.0`);
  }
  // Every field AAP itself defines is snake_case. Discovery and authentication shapes mirror A2A, MCP, OAuth and PAP and keep those protocols' names.
  const mirrored = /^(poppy|agent-card|mcp-endpoint)/;
  for (const file of globSync("**/*.schema.json", { cwd: resolve(ROOT, "spec/latest/schemas") }).filter(name => !mirrored.test(name))) {
    const fields = new Set<string>();
    const walk = (node: unknown): void => {
      if (Array.isArray(node)) node.forEach(walk);
      else if (node && typeof node === "object") for (const [key, value] of Object.entries(node)) {
        if (key === "properties" && value && typeof value === "object") Object.keys(value).forEach(field => fields.add(field));
        walk(value);
      }
    };
    walk(JSON.parse(readFileSync(resolve(ROOT, "spec/latest/schemas", file), "utf8")));
    for (const field of fields) assert.match(field, /^[a-z][a-z0-9_]*$/, `${file}: field ${field} is snake_case`);
  }
  const validation = JSON.parse(readFileSync(resolve(ROOT, "spec/latest/examples/error-validation.jsonrpc.example.json"), "utf8"));
  assert.ok(JSON.stringify(validation).includes('"instance_location"') && !JSON.stringify(validation).includes("instanceLocation"));
  assert.deepEqual(JSON.parse(readFileSync(resolve(ROOT, "spec/latest/schemas/event.schema.json"), "utf8")).properties.event_kind.enum, ["lead_status_changed", "appointment_status_changed"]);
  const previous = validateManifest(resolve(ROOT, "spec/v3.2"), "v3.2");
  assert.deepEqual(previous.skills!.map(skill => skill.id!.replaceAll(".", "_")), manifest.skills!.slice(0, 5).map(skill => skill.id), "the five core skills only changed spelling");
});
