import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { globSync } from "glob";
import { ROOT } from "../../tools/lib/releases.js";

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
    const request = { type: "inventory.search.request", filters };
    assert.equal(old("inventory-search-request", request), true);
    assert.equal(current("inventory-search-request", request), false);
  }
  assert.equal(current("inventory-search-request", { type: "inventory.search.request", filters: { make: ["Honda"], query: "EX-L" } }), true);
});

test("migration requires the effective page size even when the request omitted pagination", () => {
  const response = { type: "inventory.search.response", data: { total: 0, vehicles: [] } };
  assert.equal(old("inventory-search-response", response), true);
  const data = { ...response.data, next_cursor: null, applied_filters: {}, sort: { field: "price", order: "asc" } };
  assert.equal(current("inventory-search-response", { ...response, data }), false);
  assert.equal(current("inventory-search-response", { ...response, data: { ...data, limit: 20 } }), true);
});

test("rate-limited responses provide a machine-readable minimum delay in milliseconds", () => {
  const error = { type: "aap.error", error_id: "err-1", created_at: "2026-10-26T10:00:00Z", code: "RATE_LIMITED", message: "Try later.", retryable: true };
  const seconds = { ...error, details: { retry_after_seconds: 1 } };
  assert.equal(old("error", seconds), true);
  assert.equal(current("error", seconds), false);
  assert.equal(current("error", error), false);
  assert.equal(current("error", { ...error, details: { retry_after_ms: 1000 } }), true);
  assert.equal(current("error", { ...error, details: { retry_after_ms: -1 } }), false);
});
