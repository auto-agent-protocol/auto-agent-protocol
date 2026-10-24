import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { globSync } from "glob";
import { ROOT } from "../../tools/lib/releases.js";

const spec = resolve(ROOT, "spec/latest");
const read = (path: string) => JSON.parse(readFileSync(resolve(spec, path), "utf8"));
const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats(ajv);
for (const path of globSync("schemas/**/*.schema.json", { cwd: spec })) ajv.addSchema(read(path));
const validate = (name: string, value: unknown) => ajv.getSchema(read(`schemas/${name}.schema.json`).$id)!(value);

test("feature and radius search requires evidence, distance, freshness and an identifier", () => {
  const request = read("examples/inventory-search-request.features-near.example.json");
  const response = read("examples/inventory-search-response.features-near.example.json");
  assert.equal(validate("inventory-search-request", request), true);
  assert.equal(validate("inventory-search-response", response), true);
  for (const field of ["feature_evidence", "distance_mi", "updated_at"]) {
    const missing = structuredClone(response);
    delete missing.data.vehicles[0][field];
    assert.equal(validate("inventory-search-response", missing), false, field);
  }
  const unidentified = structuredClone(response);
  for (const field of ["vin", "vehicle_id", "stock"]) delete unidentified.data.vehicles[0][field];
  assert.equal(validate("inventory-search-response", unidentified), false);
  const unsupportedClaim = { code: "heated_front_seats", label: "Heated front seats", status: "present" };
  assert.equal(validate("vehicle-feature", unsupportedClaim), false);
  assert.equal(validate("vehicle-feature", { ...unsupportedClaim, status: "unknown" }), true);
});

test("search rejects ambiguous pagination, unlocated distance sorts and empty constraints", () => {
  const request = { type: "inventory.search.request" };
  for (const extra of [
    { pagination: { cursor: "cursor", skip: 0 } },
    { pagination: { cursor: "" } },
    { pagination: { limit: 101 } },
    { sort: { field: "distance_mi", order: "asc" } },
    { filters: { near: { latitude: 91, longitude: 0, radius_mi: 50 } } },
    { filters: { make: [] } },
    { filters: { features_all: ["Heated Seats"] } },
    { filters: { query: "   " } },
    { filters: { made_up: true } },
  ]) assert.equal(validate("inventory-search-request", { ...request, ...extra }), false, JSON.stringify(extra));
  assert.equal(validate("inventory-search-request", { ...request, pagination: { cursor: "cursor", limit: 20 } }), true);
});

test("discovery cannot advertise ambiguous aggregate rooftops or distance without geography", () => {
  const capabilities = read("examples/inventory-capabilities.example.json");
  assert.equal(validate("inventory-capabilities", capabilities), true);
  assert.equal(validate("inventory-capabilities", { ...capabilities, scope: "aggregate" }), false);
  assert.equal(validate("inventory-capabilities", { ...capabilities, filters: capabilities.filters.filter((f: string) => f !== "near") }), false);
  assert.equal(validate("inventory-capabilities", { ...capabilities, default_sort: { field: "distance_mi", order: "asc" } }), false);
  const response = read("examples/inventory-search-response.example.json");
  response.data.applied_filters.query = "Honda CR-V";
  assert.equal(validate("inventory-search-response", response), false);
  response.data.query_terms = ["Honda", "CR-V"];
  assert.equal(validate("inventory-search-response", response), true);
});

test("published search examples agree with their constraints and price ordering", () => {
  for (const suffix of ["", ".motorcycle"]) {
    const request = read(`examples/inventory-search-request${suffix}.example.json`);
    const response = read(`examples/inventory-search-response${suffix}.example.json`);
    assert.deepEqual(response.data.applied_filters, request.filters);
    assert.deepEqual(response.data.sort, request.sort);
    assert.equal(response.data.next_cursor, null);
    assert.equal(response.data.total, response.data.vehicles.length);
    const vehicles = response.data.vehicles;
    assert.deepEqual(vehicles.map((v: any) => v.price), vehicles.map((v: any) => v.price).sort((a: number, b: number) => a - b));
    for (const vehicle of vehicles) {
      for (const key of ["make", "model", "condition", "body", "vehicle_type"])
        if (request.filters[key]) assert.ok(request.filters[key].includes(vehicle[key] ?? (key === "vehicle_type" ? "car" : undefined)), `${suffix}: ${key}`);
      assert.ok(vehicle.price <= request.filters.price_max);
    }
  }
});
