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

test("lead contact channels require matching customer data and permission", () => {
  const request = read("examples/lead-submit-request.example.json");
  assert.equal(validate("lead-submit-request", request), true);
  for (const change of [
    (lead: any) => delete lead.idempotency_key,
    (lead: any) => delete lead.customer.email,
    (lead: any) => delete lead.customer.phone,
    (lead: any) => lead.consent.allowed_channels = ["email"],
    (lead: any) => lead.consent.consent_text = "   ",
  ]) {
    const lead = structuredClone(request);
    change(lead);
    assert.equal(validate("lead-submit-request", lead), false, change.toString());
  }
  request.vehicle_of_interest = { model: "RAV4" };
  request.trade_in = { mileage: 50000 };
  assert.equal(validate("lead-submit-request", request), true, "partial vehicle information remains valid");
});

test("appointment outcomes cannot claim a booking or alternatives without their times", () => {
  const response = (appointment: unknown, status = "received") => ({ type: "lead.submit.response", data: { lead_id: "lead_1", status, appointment } });
  const appointment = { appointment_id: "appt_1", status: "confirmed", confirmed_at: "2026-11-01T14:00:00Z" };
  assert.equal(validate("lead-submit-response", response(appointment)), true);
  for (const value of [
    { appointment_id: "appt_1", status: "confirmed" },
    { ...appointment, status: "requested" },
    { appointment_id: "appt_1", status: "proposed", proposed_times: [] },
    { ...appointment, proposed_times: [appointment.confirmed_at] },
  ]) assert.equal(validate("lead-submit-response", response(value)), false);
  assert.equal(validate("lead-submit-response", response(appointment, "rejected")), false);
  assert.equal(validate("lead-submit-response", response({ appointment_id: "appt_1", status: "proposed", proposed_times: [appointment.confirmed_at] })), true);
});
