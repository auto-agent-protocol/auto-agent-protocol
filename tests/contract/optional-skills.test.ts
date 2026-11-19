import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { globSync } from "glob";
import { ROOT } from "../../tools/lib/releases.js";
import { checkConsentWindow, checkCreditApplicationAgainstCapabilities, checkRebates, checkValuation, rebateSavings } from "../../tools/lib/optional-skills.js";

const ajv = new Ajv2020({ strict: false, allErrors: true }); addFormats(ajv);
for (const file of globSync("spec/latest/schemas/**/*.json", { cwd: ROOT })) ajv.addSchema(JSON.parse(readFileSync(resolve(ROOT, file), "utf8")));
const validate = (name: string, value: unknown) => ajv.validate(`https://draft.autoagentprotocol.invalid/latest/schemas/${name}.schema.json`, value);
const read = (name: string) => JSON.parse(readFileSync(resolve(ROOT, `spec/latest/examples/${name}.example.json`), "utf8"));
const edit = <T>(value: T, change: (copy: any) => void): T => { const copy = structuredClone(value); change(copy); return copy; };
const tool = (name: string) => read("mcp-manifest").tools.find((entry: any) => entry.name === name);

test("rebates list new-vehicle programs with required identity and a whole-unit value", () => {
  const listing = read("vehicle-detail-response.rebates");
  assert.equal(validate("vehicle-detail-response", listing), true, ajv.errorsText());
  const [cash, military, graduate] = listing.data.rebates;
  assert.equal(cash.is_conditional, false); assert.equal(military.is_conditional, true);
  assert.equal(graduate.is_conditional, undefined, "an omitted flag means conditional");
  assert.equal(new Set(listing.data.rebates.map((rebate: any) => rebate.program_id)).size, listing.data.rebates.length, "program_id is unique within a listing");
  for (const field of ["program_id", "program_name", "program_value"]) assert.equal(validate("vehicle-detail-response", edit(listing, l => delete l.data.rebates[0][field])), false, `${field} is required`);
  for (const field of ["program_number", "expires_at", "is_conditional"]) assert.equal(validate("vehicle-detail-response", edit(listing, l => delete l.data.rebates[0][field])), true, `${field} is optional`);
  for (const change of [(r: any) => r.program_value = 499.5, (r: any) => r.program_value = -1, (r: any) => r.program_value = "500", (r: any) => r.program_id = " ", (r: any) => r.program_name = "",
    (r: any) => r.expires_at = "2026-11-30", (r: any) => r.is_conditional = "yes", (r: any) => r.programId = "camelCase", (r: any) => r.included_in_price = true]) {
    assert.equal(validate("vehicle-detail-response", edit(listing, l => change(l.data.rebates[0]))), false, change.toString());
  }
  assert.equal(validate("vehicle-detail-response", edit(listing, l => l.data.rebates = [])), true);
});

test("rebates are allowed only on new vehicles and never change the price contract", () => {
  const listing = read("vehicle-detail-response.rebates");
  for (const condition of ["used", "cpo"]) assert.equal(validate("vehicle-detail-response", edit(listing, l => l.data.condition = condition)), false, condition);
  assert.equal(validate("vehicle", edit(listing.data, v => delete v.condition)), false, "a rebate needs an explicit new condition");
  const used = read("vehicle-detail-response");
  assert.equal(validate("vehicle-detail-response", edit(used, l => l.data.rebates = listing.data.rebates)), false);
  const vehicle = listing.data, unconditional = vehicle.rebates.filter((rebate: any) => rebate.is_conditional === false).reduce((sum: number, rebate: any) => sum + rebate.program_value, 0);
  const fees = vehicle.fees.reduce((sum: number, fee: any) => sum + fee.amount, 0);
  assert.equal(vehicle.price, vehicle.list_price + fees - unconditional, "the example price already reflects fees and the unconditional rebate");
  assert.ok(vehicle.price > 0 && vehicle.price - 1000 !== vehicle.price, "conditional rebates are never subtracted from the advertised price");
  const search = edit(read("inventory-search-response"), s => Object.assign(s.data.vehicles[0], { condition: "new", rebates: [vehicle.rebates[0]] }));
  assert.equal(validate("inventory-search-response", search), true, ajv.errorsText());
  assert.equal(validate("trade-in-submit-request", edit(read("trade-in-submit-request"), r => r.vehicle.rebates = [])), false, "a trade-in is never a new-vehicle listing");
  assert.equal(validate("vehicle", { horsepower: 236 }), true); assert.equal(validate("vehicle", { horsepower: -1 }), false);
});

test("cross-field rules that JSON Schema cannot express are checked by the reference helpers", () => {
  const vehicle = read("vehicle-detail-response.rebates").data, at = (iso: string) => new Date(iso);
  assert.deepEqual(checkRebates(vehicle, at("2026-11-19T12:00:00Z")), []);
  assert.deepEqual(rebateSavings(vehicle), { includedInPrice: 1000, possibleExtra: 1000 });
  const duplicate = edit(vehicle, v => v.rebates[1].program_id = v.rebates[0].program_id);
  assert.equal(validate("vehicle", duplicate), true, "the schema alone accepts a duplicate program_id");
  assert.ok(checkRebates(duplicate).some(error => error.includes("unique")));
  assert.ok(checkRebates(vehicle, at("2026-12-01T12:00:00Z")).some(error => error.includes("toyota-2026-11-customer-cash")), "an expired program is not presented");
  assert.ok(checkRebates({ ...vehicle, condition: "used" }).length);
  const valuation = read("trade-in-submit-response").data.valuation;
  assert.deepEqual(checkValuation(valuation, at("2026-11-20T00:00:00Z")), []);
  for (const bad of [{ amount_min: 17600, amount_max: 15900 }, { amount: 20000, amount_min: 15900, amount_max: 17600 }]) {
    assert.equal(validate("trade-in-submit-response", { type: "trade_in.submit.response", data: { trade_in_id: "t", status: "valued", valuation: bad } }), true);
    assert.ok(checkValuation(bad).length, JSON.stringify(bad));
  }
  assert.ok(checkValuation(valuation, at("2026-12-01T00:00:00Z")).some(error => error.includes("expired")));
  const consent = read("credit-application-submit-request").applicant.consent;
  assert.deepEqual(checkConsentWindow(consent, at("2026-11-19T10:41:00Z")), []);
  assert.ok(checkConsentWindow({ ...consent, expires_at: "2026-11-18T10:40:00Z" }).length, "expiry before the grant");
  assert.ok(checkConsentWindow(consent, at("2027-01-01T00:00:00Z")).some(error => error === "consent expired"));
  for (const grant of [read("lead-submit-request").consent, read("trade-in-submit-request.contact").consent]) assert.deepEqual(checkConsentWindow(grant), []);
  const capabilities = read("credit-application-capabilities"), individual = read("credit-application-submit-request"), joint = read("credit-application-submit-request.joint");
  assert.deepEqual(checkCreditApplicationAgainstCapabilities(individual, capabilities), []); assert.deepEqual(checkCreditApplicationAgainstCapabilities(joint, capabilities), []);
  assert.ok(checkCreditApplicationAgainstCapabilities(joint, { ...capabilities, joint_applications: false }).length);
  assert.ok(checkCreditApplicationAgainstCapabilities(joint, { ...capabilities, inquiry_types: ["soft"] }).length, "a hard authorization where only soft inquiries run");
  assert.ok(checkCreditApplicationAgainstCapabilities(individual, { ...capabilities, national_id: "required" }).length);
  assert.ok(checkCreditApplicationAgainstCapabilities(joint, { ...capabilities, national_id: "not_accepted" }).length);
  assert.ok(checkCreditApplicationAgainstCapabilities({ ...individual, currency: "CAD" }, capabilities).length);
});

test("trade_in.submit requires year, make, model, wear condition and mileage; everything else is optional", () => {
  for (const name of ["trade-in-submit-request", "trade-in-submit-request.minimal", "trade-in-submit-request.contact", "trade-in-submit-request.canadian"]) assert.equal(validate("trade-in-submit-request", read(name)), true, `${name}: ${ajv.errorsText()}`);
  const request = read("trade-in-submit-request");
  for (const field of ["year", "make", "model", "condition", "mileage"]) assert.equal(validate("trade-in-submit-request", edit(request, r => delete r.vehicle[field])), false, `${field} is required`);
  for (const field of ["vin", "exterior_color", "driveline", "transmission", "displacement_cc", "fuel", "horsepower", "trim"]) assert.equal(validate("trade-in-submit-request", edit(request, r => delete r.vehicle[field])), true, `${field} is optional`);
  for (const condition of ["new", "used", "cpo", "mint"]) assert.equal(validate("trade-in-submit-request", edit(request, r => r.vehicle.condition = condition)), false, condition);
  for (const field of ["type", "vehicle", "source_agent", "idempotency_key"]) assert.equal(validate("trade-in-submit-request", edit(request, r => delete r[field])), false, field);
  assert.equal(validate("trade-in-submit-request", edit(request, r => r.vehicle.vin = "TOO-SHORT")), false);
  assert.equal(validate("trade-in-submit-request", edit(request, r => r.unexpected = true)), false);
});

test("trade-in contact data is optional but always needs its own consent", () => {
  const request = read("trade-in-submit-request.contact");
  assert.equal(validate("trade-in-submit-request", edit(request, r => delete r.consent)), false, "customer without consent");
  assert.equal(validate("trade-in-submit-request", edit(request, r => delete r.customer)), false, "consent without customer");
  assert.equal(validate("trade-in-submit-request", edit(request, r => r.consent.scope = ["lead_submission"])), false, "a lead grant does not cover a trade-in submission");
  assert.equal(validate("lead-submit-request", edit(read("lead-submit-request"), r => r.consent.scope = ["trade_in_submission"])), false, "a trade-in grant does not cover a lead");
  assert.equal(validate("lead-submit-request", read("lead-submit-request")), true);
  assert.equal(validate("trade-in-submit-request", edit(request, r => r.consent.allowed_channels = ["phone"])), false, "a permitted channel needs its contact data");
  assert.equal(validate("trade-in-submit-request", edit(request, r => r.customer.preferred_contact = "sms")), false, "the preferred channel must be permitted");
  assert.equal(validate("trade-in-submit-request", edit(request, r => r.vehicle_of_interest.condition = "good")), false);
});

test("a trade-in valuation carries an amount, a range or both; kind and every other detail are optional", () => {
  for (const name of ["trade-in-submit-response", "trade-in-submit-response.offer", "trade-in-submit-response.range", "trade-in-submit-response.received", "trade-in-submit-response.replayed"]) assert.equal(validate("trade-in-submit-response", read(name)), true, `${name}: ${ajv.errorsText()}`);
  const valued = read("trade-in-submit-response");
  const response = (data: object) => ({ type: "trade_in.submit.response", data: { trade_in_id: "t-1", ...data } });
  assert.equal(validate("trade-in-submit-response", response({ status: "valued", valuation: { amount: 16800 } })), true, "amount alone");
  assert.equal(validate("trade-in-submit-response", response({ status: "valued", valuation: { amount_min: 15900, amount_max: 17600 } })), true, "range alone");
  assert.equal(validate("trade-in-submit-response", response({ status: "valued", valuation: { amount: 16800, kind: "estimate" } })), true);
  assert.equal(validate("trade-in-submit-response", response({ status: "valued", valuation: {} })), false, "a valuation says something");
  assert.equal(validate("trade-in-submit-response", response({ status: "valued", valuation: { kind: "estimate" } })), false);
  assert.equal(validate("trade-in-submit-response", response({ status: "valued", valuation: { amount_min: 15900 } })), false, "a range has both ends");
  assert.equal(validate("trade-in-submit-response", response({ status: "valued" })), false, "valued requires the valuation");
  for (const status of ["received", "rejected"]) {
    assert.equal(validate("trade-in-submit-response", response({ status })), true);
    assert.equal(validate("trade-in-submit-response", response({ status, valuation: { amount: 1 } })), false, `${status} carries no valuation`);
  }
  assert.equal(validate("trade-in-submit-response", response({ status: "valued", valuation: { amount: 16500, kind: "offer" } })), false, "an offer has an expiry");
  assert.equal(validate("trade-in-submit-response", response({ status: "valued", valuation: { amount: 16500, kind: "binding" } })), false);
  assert.equal(validate("trade-in-submit-response", response({ status: "valued", valuation: { amount: 16500.5 } })), false, "whole currency units");
  assert.equal(validate("trade-in-submit-response", response({ status: "appraised" })), false);
  const replay = read("trade-in-submit-response.replayed"); delete replay.data.replayed;
  assert.deepEqual(replay, valued, "a replay repeats the complete original valuation");
});

test("credit_application.submit requires each applicant's identity, residence, income and own consent", () => {
  for (const name of ["credit-application-submit-request", "credit-application-submit-request.joint", "credit-application-submit-request.minimal"]) assert.equal(validate("credit-application-submit-request", read(name)), true, `${name}: ${ajv.errorsText()}`);
  const request = read("credit-application-submit-request");
  for (const field of ["first_name", "last_name", "date_of_birth", "address", "housing_status", "monthly_housing_payment", "months_at_address", "employment_status", "gross_monthly_income", "consent"]) {
    assert.equal(validate("credit-application-submit-request", edit(request, r => delete r.applicant[field])), false, `applicant.${field} is required`);
  }
  for (const field of ["middle_name", "employer_phone", "occupation", "months_at_employer", "phone"]) assert.equal(validate("credit-application-submit-request", edit(request, r => delete r.applicant[field])), true, `applicant.${field} is optional`);
  for (const field of ["address_line_1", "city", "state", "zip"]) {
    assert.equal(validate("credit-application-submit-request", edit(request, r => delete r.applicant.address[field])), false, `address.${field} is required`);
    assert.equal(validate("credit-application-submit-request", edit(request, r => r.applicant.address[field] = " ")), false, `address.${field} is not blank`);
  }
  for (const field of ["type", "application_type", "applicant", "source_agent", "idempotency_key"]) assert.equal(validate("credit-application-submit-request", edit(request, r => delete r[field])), false, field);
  for (const field of ["financing", "vehicle_of_interest", "submitted_at"]) assert.equal(validate("credit-application-submit-request", edit(request, r => delete r[field])), true, `${field} is optional`);
  assert.equal(validate("credit-application-submit-request", edit(request, r => { delete r.applicant.email; delete r.applicant.phone; })), false, "one contact point is required");
  assert.equal(validate("credit-application-submit-request", edit(request, r => delete r.applicant.employer_name)), false, "an employed applicant names the employer");
  assert.equal(validate("credit-application-submit-request", edit(request, r => r.applicant.other_monthly_income = 500)), false, "other income names its source");
  for (const change of [(a: any) => a.date_of_birth = "12/10/1988", (a: any) => a.housing_status = "condo", (a: any) => a.gross_monthly_income = 9800.5, (a: any) => a.months_at_address = -1,
    (a: any) => a.employment_status = "contractor", (a: any) => a.phone = "415-555-0123", (a: any) => a.marital_status = "single", (a: any) => a.ssn = "000000000", (a: any) => a.relationship = "spouse"]) {
    assert.equal(validate("credit-application-submit-request", edit(request, r => change(r.applicant))), false, change.toString());
  }
  assert.equal(validate("credit-application-submit-request", edit(request, r => r.continue_url = "https://demo-toyota.example.com/finish")), false);
  assert.equal(validate("credit-application-submit-request", edit(request, r => r.currency = "EUR")), false);
});

test("national identifiers are optional, typed and never required by the shared schema", () => {
  const joint = read("credit-application-submit-request.joint");
  assert.deepEqual(joint.applicant.national_id, { type: "ssn", value: "000000000" }, "examples use an obviously invalid identifier");
  assert.equal(read("credit-application-submit-request").applicant.national_id, undefined);
  for (const type of ["ssn", "itin", "sin"]) assert.equal(validate("credit-application-submit-request", edit(joint, r => r.applicant.national_id.type = type)), true, type);
  for (const change of [(n: any) => n.type = "passport", (n: any) => n.value = "000-00-0000", (n: any) => n.value = "12345678", (n: any) => delete n.type, (n: any) => n.last4 = "0000"]) {
    assert.equal(validate("credit-application-submit-request", edit(joint, r => change(r.applicant.national_id))), false, change.toString());
  }
  for (const policy of ["required", "optional", "not_accepted"]) assert.equal(validate("credit-application-capabilities", { ...read("credit-application-capabilities"), national_id: policy }), true, policy);
  assert.equal(validate("credit-application-capabilities", { ...read("credit-application-capabilities"), national_id: "masked" }), false);
  for (const field of ["inquiry_types", "joint_applications", "national_id"]) assert.equal(validate("credit-application-capabilities", edit(read("credit-application-capabilities"), c => delete c[field])), false, field);
  assert.equal(validate("credit-application-capabilities", { ...read("credit-application-capabilities"), inquiry_types: [] }), false);
});

test("credit consent is per applicant, names the authorized inquiry and is not lead consent", () => {
  const request = read("credit-application-submit-request"), joint = read("credit-application-submit-request.joint");
  for (const field of ["granted_at", "consent_text", "authorized_inquiry", "allowed_channels"]) assert.equal(validate("credit-application-submit-request", edit(request, r => delete r.applicant.consent[field])), false, `consent.${field} is required`);
  assert.equal(validate("credit-application-submit-request", edit(request, r => delete r.applicant.consent.expires_at)), true);
  for (const change of [(c: any) => c.authorized_inquiry = "any", (c: any) => c.consent_text = "  ", (c: any) => c.allowed_channels = [], (c: any) => c.allowed_channels = ["fax"], (c: any) => c.scope = ["lead_submission"]]) {
    assert.equal(validate("credit-application-submit-request", edit(request, r => change(r.applicant.consent))), false, change.toString());
  }
  assert.equal(validate("credit-application-submit-request", edit(request, r => r.applicant.consent = read("lead-submit-request").consent)), false, "a lead grant is not credit consent");
  assert.equal(validate("credit-application-submit-request", edit(request, r => r.applicant.consent.allowed_channels = ["email", "sms"])), true, "the example applicant has a phone number");
  assert.equal(validate("credit-application-submit-request", edit(request, r => { delete r.applicant.phone; r.applicant.consent.allowed_channels = ["sms"]; })), false, "a permitted channel needs its contact data");
  assert.equal(validate("credit-application-submit-request", edit(joint, r => delete r.co_applicant.consent)), false, "the co-applicant consents separately");
  assert.notEqual(joint.applicant.consent.consent_text, joint.co_applicant.consent.consent_text);
  assert.equal(validate("credit-application-submit-request", edit(joint, r => delete r.co_applicant)), false, "joint requires a co-applicant");
  assert.equal(validate("credit-application-submit-request", edit(joint, r => delete r.co_applicant.relationship)), false);
  assert.equal(validate("credit-application-submit-request", edit(joint, r => r.application_type = "individual")), false, "an individual application has no co-applicant");
  assert.equal(validate("credit-application-submit-request", edit(joint, r => r.trade_in.condition = "used")), false);
  assert.equal(validate("credit-application-submit-request", edit(joint, r => r.vehicle_of_interest.condition = "good")), false);
});

test("credit responses separate the submission from the decision and never repeat applicant data", () => {
  for (const name of ["credit-application-submit-response", "credit-application-submit-response.received", "credit-application-submit-response.rejected", "credit-application-submit-response.replayed"]) assert.equal(validate("credit-application-submit-response", read(name)), true, `${name}: ${ajv.errorsText()}`);
  const response = (data: object) => ({ type: "credit_application.submit.response", data: { application_id: "a-1", ...data } });
  for (const status of ["received", "rejected"]) assert.equal(validate("credit-application-submit-response", response({ status })), true);
  for (const status of ["action_required", "approved", "duplicate"]) assert.equal(validate("credit-application-submit-response", response({ status })), false, status);
  for (const outcome of ["pending", "prequalified", "approved", "conditionally_approved", "declined"]) assert.equal(validate("credit-application-submit-response", response({ status: "received", decision: { outcome } })), true, outcome);
  assert.equal(validate("credit-application-submit-response", response({ status: "received", decision: {} })), false, "a decision states its outcome");
  assert.equal(validate("credit-application-submit-response", response({ status: "rejected", decision: { outcome: "declined" } })), false, "a rejected submission was never decided");
  for (const leak of [{ continue_url: "https://demo-toyota.example.com/finish" }, { applicant: {} }, { national_id: { type: "ssn", value: "000000000" } }, { date_of_birth: "1988-12-10" }]) {
    assert.equal(validate("credit-application-submit-response", response({ status: "received", ...leak })), false, Object.keys(leak)[0]);
  }
  const serialized = JSON.stringify([read("credit-application-submit-response"), read("credit-application-submit-response.replayed")]);
  for (const sensitive of ["000000000", "1988-12-10", "D0000000", "Lovelace"]) assert.equal(serialized.includes(sensitive), false, `responses never repeat ${sensitive}`);
  const replay = read("credit-application-submit-response.replayed"); delete replay.data.replayed;
  assert.deepEqual(replay, read("credit-application-submit-response"));
});

test("both optional skills are write tools on MCP with capability schemas and their own media types", () => {
  const manifest = read("mcp-manifest");
  assert.equal(manifest.tools.length, 7);
  for (const [name, skill, capabilities] of [["aap_trade_in_submit", "trade_in.submit", "trade-in-capabilities"], ["aap_credit_application_submit", "credit_application.submit", "credit-application-capabilities"]]) {
    const entry = tool(name), meta = entry._meta["autoagentprotocol.org/aap"];
    assert.deepEqual(entry.annotations, { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true }, name);
    assert.equal(meta.skill, skill); assert.equal(meta.capabilities_schema.endsWith(`${capabilities}.schema.json`), true);
    assert.equal(entry.inputSchema.type, "object"); assert.equal(entry.inputSchema.properties.type.const, `${skill}.request`);
    for (const keyword of ["allOf", "anyOf", "oneOf", "if", "not"]) assert.equal(entry.inputSchema[keyword], undefined, `${name}: no ${keyword} at the input schema root`);
    assert.equal(validate(capabilities, read(capabilities)), true);
  }
  const card = read("agent-card"), ids = card.skills.map((skill: any) => skill.id);
  assert.deepEqual(ids.slice(-2), ["trade_in.submit", "credit_application.submit"]);
  assert.ok(card.defaultInputModes.includes("application/vnd.autoagent.credit-application-submit-request+json"));
  assert.equal(validate("trade-in-capabilities", { instant_valuation: false, contact_required: true }), true);
  assert.equal(validate("trade-in-capabilities", { instant_valuation: false, contact_required: false }), false);
});
