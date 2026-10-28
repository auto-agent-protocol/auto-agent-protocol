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
const schema = (name: string) => read(`schemas/${name}.schema.json`);
const example = (name: string) => read(`examples/${name}.example.json`);
const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats(ajv);
for (const file of globSync("schemas/**/*.schema.json", { cwd: spec })) ajv.addSchema(read(file));
const validate = (name: string, value: unknown) => ajv.getSchema(schema(name).$id)!(value);

test("3.0 automotive examples remain valid and omitted labels retain their original defaults", () => {
  for (const name of ["inventory-search-request", "inventory-search-response", "inventory-facets-request", "inventory-facets-response", "vehicle-detail-response", "dealer-information-response", "lead-submit-request"]) {
    const value = JSON.parse(readFileSync(resolve(ROOT, `spec/v3.0/examples/${name}.example.json`), "utf8"));
    const before = structuredClone(value);
    assert.equal(validate(name, value), true, name);
    assert.deepEqual(value, before, "validation does not infer or rewrite currency or odometer units");
  }
  for (const properties of [schema("vehicle").properties, schema("inventory-search-response").properties.data.properties, schema("facets").properties]) {
    assert.equal(properties.currency.default, "USD");
    assert.equal(properties.mileage_unit.default, "mi");
  }
  assert.equal(schema("dealer-information").$defs.rooftop.properties.currency.default, "USD");
  assert.deepEqual(schema("inventory-capabilities").properties.currencies.default, ["USD"]);
  assert.equal(schema("inventory-capabilities").properties.default_currency.default, "USD");
  assert.equal(schema("inventory-capabilities").properties.default_mileage_unit.default, "mi");
});

test("native currency and odometer labels are independent of country and one another", () => {
  for (const country of ["CA", "US"]) for (const currency of ["USD", "CAD"]) for (const mileage_unit of ["mi", "km"]) {
    assert.equal(validate("vehicle", { country, currency, mileage_unit, price: 35500, mileage: 72000 }), true);
  }
  const canadian = example("vehicle-detail-response.canadian");
  assert.equal(validate("vehicle-detail-response", canadian), true);
  for (const [field, invalid] of [["currency", "cad"], ["currency", "EUR"], ["currency", null], ["mileage_unit", "KM"], ["mileage_unit", "miles"], ["mileage_unit", null]]) {
    assert.equal(validate("vehicle", { [field as string]: invalid }), false, `${field}: ${invalid}`);
  }
  assert.equal(validate("vehicle", { currency: "CAD", mileage_unit: "km", price: 35500.5 }), false, "prices remain whole currency units");
  assert.equal(validate("vehicle", { currency: "CAD", mileage_unit: "km", mileage: -1 }), false);
});

test("search and facets accept unit context only at the request root", () => {
  for (const name of ["inventory-search-request", "inventory-facets-request"]) {
    const request = example(`${name}.canadian`);
    assert.equal(validate(name, request), true);
    for (const extra of [
      { currency: "EUR" }, { currency: "cad" }, { currency: null },
      { mileage_unit: "KM" }, { mileage_unit: "miles" }, { mileage_unit: null },
      { filters: { currency: "CAD" } }, { filters: { mileage_unit: "km" } },
      { filters: { near: { latitude: 43.6532, longitude: -79.3832, radius_km: 50 } } },
    ]) assert.equal(validate(name, { ...request, ...extra }), false, `${name}: ${JSON.stringify(extra)}`);
    assert.equal(validate(name, { ...request, currency: "USD", mileage_unit: "mi" }), true);
  }
  const capabilities = example("inventory-capabilities.canadian");
  assert.equal(validate("inventory-capabilities", capabilities), true);
  for (const currencies of [[], ["CAD", "CAD"], ["EUR"], ["cad"]]) {
    assert.equal(validate("inventory-capabilities", { ...capabilities, currencies }), false);
  }
});

test("Canadian typed examples and A2A payloads use the same native values and contexts", () => {
  for (const direction of ["request", "response"]) {
    const name = `inventory-search-${direction}.canadian`;
    const envelope = example(`${name}.jsonrpc`);
    const payload = direction === "request" ? envelope.params.message.parts[0].data : envelope.result.message.parts[0].data;
    assert.deepEqual(payload, example(name));
  }
  const request = example("inventory-search-request.canadian");
  const response = example("inventory-search-response.canadian").data;
  const facets = example("inventory-facets-response.canadian").data;
  const rooftop = example("dealer-information-response.canadian").data.rooftops[0];
  assert.deepEqual(response.applied_filters, request.filters);
  assert.deepEqual(response.sort, request.sort);
  assert.deepEqual(response.facets, facets);
  assert.equal(response.currency, request.currency);
  assert.equal(response.mileage_unit, request.mileage_unit);
  assert.equal(response.total, response.vehicles.length);
  for (const vehicle of response.vehicles) {
    assert.equal(vehicle.currency, response.currency);
    assert.equal(vehicle.mileage_unit, "km");
    assert.ok(vehicle.price <= request.filters.price_max);
    assert.ok(vehicle.mileage <= request.filters.mileage_max);
    assert.equal(vehicle.distance_mi, 0, "the example rooftop is at the query origin");
    assert.equal(vehicle.currency, rooftop.currency);
    assert.deepEqual(vehicle.fees, rooftop.fees);
  }
});

test("facets permit exact fractional odometer bounds and explicit empty result contexts", () => {
  assert.equal(validate("facets", { currency: "CAD", mileage_unit: "km", mileage_range: { min: 72000, max: 80467.2 } }), true);
  const response = example("inventory-search-response.canadian");
  Object.assign(response.data, { vehicles: [], total: 0, facets: { currency: "CAD", mileage_unit: "km" } });
  assert.equal(validate("inventory-search-response", response), true);
  for (const name of ["inventory-search-response", "inventory-facets-response"]) {
    const value = example(`${name}.canadian`);
    value.data.currency = "EUR";
    assert.equal(validate(name, value), false);
  }
});

test("explicit search contexts require matching vehicle currencies and facet labels, not native odometer units", () => {
  const original = example("inventory-search-response.canadian");
  for (const currency of [undefined, "USD", "CAD"]) {
    for (const mileageUnit of [undefined, "mi", "km"]) {
      if (currency === undefined && mileageUnit === undefined) continue;
      for (const vehicleCurrency of [undefined, "USD", "CAD"]) {
        for (const vehicleUnit of [undefined, "mi", "km"]) {
          for (const facetCurrency of [undefined, "USD", "CAD"]) {
            for (const facetUnit of [undefined, "mi", "km"]) {
              const response = structuredClone(original);
              delete response.data.currency;
              delete response.data.mileage_unit;
              if (currency !== undefined) response.data.currency = currency;
              if (mileageUnit !== undefined) response.data.mileage_unit = mileageUnit;
              for (const vehicle of response.data.vehicles) {
                delete vehicle.currency;
                delete vehicle.mileage_unit;
                if (vehicleCurrency !== undefined) vehicle.currency = vehicleCurrency;
                if (vehicleUnit !== undefined) vehicle.mileage_unit = vehicleUnit;
              }
              const facets = response.data.facets;
              delete facets.currency;
              delete facets.mileage_unit;
              if (facetCurrency !== undefined) facets.currency = facetCurrency;
              if (facetUnit !== undefined) facets.mileage_unit = facetUnit;
              const valid = (vehicleCurrency ?? "USD") === (currency ?? "USD")
                && (facetCurrency ?? "USD") === (currency ?? "USD")
                && (facetUnit ?? "mi") === (mileageUnit ?? "mi");
              assert.equal(validate("inventory-search-response", response), valid,
                JSON.stringify({ currency, mileageUnit, vehicleCurrency, vehicleUnit, facetCurrency, facetUnit }));
            }
          }
        }
      }
    }
  }
});

test("currency consistency covers unpriced listings, mixed pages and empty pages without requiring facets", () => {
  const response = example("inventory-search-response.canadian");
  delete response.data.facets;
  assert.equal(validate("inventory-search-response", response), true);
  delete response.data.vehicles[0].price;
  delete response.data.vehicles[0].currency;
  assert.equal(validate("inventory-search-response", response), false, "unpriced vehicles still belong to the selected currency");
  response.data.vehicles[0].currency = "USD";
  assert.equal(validate("inventory-search-response", response), false, "a page cannot mix CAD and USD vehicles");
  response.data.vehicles = [];
  response.data.total = 0;
  assert.equal(validate("inventory-search-response", response), true, "an empty CAD/km page can omit facets");
  response.data.facets = {};
  assert.equal(validate("inventory-search-response", response), false, "empty embedded facets still need CAD/km labels");
  response.data.facets = { currency: "CAD", mileage_unit: "km" };
  assert.equal(validate("inventory-search-response", response), true);
});

test("rooftop fees and partial lead vehicles carry their own native labels", () => {
  const dealer = example("dealer-information-response.canadian");
  assert.equal(validate("dealer-information-response", dealer), true);
  dealer.data.rooftops[0].currency = "EUR";
  assert.equal(validate("dealer-information-response", dealer), false);
  const lead = example("lead-submit-request.canadian");
  assert.equal(validate("lead-submit-request", lead), true);
  lead.vehicle_of_interest = { currency: "CAD", mileage_unit: "mi", mileage: 12000 };
  lead.trade_in = { currency: "USD", mileage_unit: "km", mileage: 96000 };
  assert.equal(validate("lead-submit-request", lead), true, "partial vehicles need not share a currency or odometer unit");
  lead.trade_in.mileage_unit = "kilometres";
  assert.equal(validate("lead-submit-request", lead), false);
});
