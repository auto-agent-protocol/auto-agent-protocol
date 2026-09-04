import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import Ajv2020, { type ValidateFunction } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { globSync } from "glob";
import { ROOT } from "../../tools/lib/releases.js";

function validators(): { vehicle: ValidateFunction; dealer: ValidateFunction; fee: ValidateFunction } {
  const schemasDir = resolve(ROOT, "spec/latest/schemas");
  const ajv = new Ajv2020({ strict: false, allErrors: true });
  addFormats(ajv);

  for (const file of globSync("**/*.schema.json", { cwd: schemasDir }).sort()) {
    ajv.addSchema(JSON.parse(readFileSync(resolve(schemasDir, file), "utf8")));
  }

  const get = (id: string): ValidateFunction => {
    const validator = ajv.getSchema(`https://draft.autoagentprotocol.invalid/latest/schemas/${id}`);
    assert.ok(validator, `missing validator for ${id}`);
    return validator;
  };

  return {
    vehicle: get("vehicle.schema.json"),
    dealer: get("dealer-information.schema.json"),
    fee: get("_primitives/dealer-fee.schema.json"),
  };
}

const { vehicle, dealer, fee } = validators();

test("an authoritative price is valid with or without an itemized fee breakdown", () => {
  assert.equal(vehicle({ price: 25_000 }), true);
  assert.equal(vehicle({ price: 25_000, fees: [] }), true);
  assert.equal(vehicle({
    price: 25_500,
    fees: [{ name: "Documentation fee", amount: 500 }],
  }), true);
});

test("list-only inventory and informational list-plus-fee components remain valid", () => {
  assert.equal(vehicle({ list_price: 25_000 }), true);
  assert.equal(vehicle({ list_price: 25_000, fees: [{ name: "Documentation fee", amount: 500 }] }), true);
});

test("fee objects reject ambiguous or unsafe amounts", () => {
  assert.equal(fee({ name: "Documentation fee", amount: 500 }), true);
  assert.equal(fee({ name: "", amount: 500 }), false);
  assert.equal(fee({ name: "   ", amount: 500 }), false);
  assert.equal(fee({ name: "Documentation fee", amount: -1 }), false);
  assert.equal(fee({ name: "Documentation fee", amount: 5.99 }), false);
  assert.equal(fee({ name: "Documentation fee", amount: 500, currency: "USD" }), false);
});

test("rooftop fee defaults are optional and use the same strict fee shape", () => {
  assert.equal(dealer({ name: "Example Dealer", rooftops: [{ name: "Downtown" }] }), true);
  assert.equal(dealer({ name: "Example Dealer", rooftops: [{ name: "Downtown", fees: [] }] }), true);
  assert.equal(dealer({
    name: "Example Dealer",
    rooftops: [{ name: "Downtown", fees: [{ name: "Documentation fee", amount: 500 }] }],
  }), true);
  assert.equal(dealer({
    name: "Example Dealer",
    rooftops: [{ name: "Downtown", fees: [{ name: "Documentation fee", amount: -1 }] }],
  }), false);
});
