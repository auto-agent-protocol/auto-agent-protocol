import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import Ajv2020, { type ValidateFunction } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { globSync } from "glob";
import { parse as parseYaml } from "yaml";
import { ROOT } from "../../tools/lib/releases.js";

function validator(): ValidateFunction {
  const schemasDir = resolve(ROOT, "spec/latest/schemas");
  const ajv = new Ajv2020({ strict: false, allErrors: true });
  addFormats(ajv);

  for (const file of globSync("**/*.schema.json", { cwd: schemasDir }).sort()) {
    ajv.addSchema(JSON.parse(readFileSync(resolve(schemasDir, file), "utf8")));
  }

  const validate = ajv.getSchema("https://draft.autoagentprotocol.invalid/latest/schemas/agent-card.schema.json");
  assert.ok(validate, "missing validator for agent-card.schema.json");
  return validate;
}

const card = validator();
const example = JSON.parse(readFileSync(resolve(ROOT, "spec/latest/examples/agent-card.example.json"), "utf8")) as Record<string, unknown>;

function withCard(patch: Record<string, unknown>): Record<string, unknown> {
  return { ...structuredClone(example), ...patch };
}

test("the published example card validates", () => {
  assert.equal(card(example), true, JSON.stringify(card.errors));
});

test("protocolBinding is an open string, so a dealer may advertise equivalent bindings alongside JSONRPC", () => {
  const interfaces = [
    { url: "https://demo.example.com/a2a", protocolBinding: "JSONRPC", protocolVersion: "1.0" },
    { url: "https://demo.example.com/grpc", protocolBinding: "GRPC", protocolVersion: "1.0" },
    { url: "https://demo.example.com/x", protocolBinding: "https://example.com/bindings/custom/v1", protocolVersion: "1.0" },
  ];
  assert.equal(card(withCard({ supportedInterfaces: interfaces })), true, JSON.stringify(card.errors));
});

test("the AAP profile must be required, while unrelated extensions may remain optional", () => {
  const extension = (example.capabilities as any).extensions[0];
  for (const required of [false, undefined]) {
    const candidate = structuredClone(example) as any;
    candidate.capabilities.extensions[0].required = required;
    assert.equal(card(candidate), false, `required=${required} must be rejected`);
  }
  const candidate = structuredClone(example) as any;
  candidate.capabilities.extensions = [extension, { uri: "https://example.com/extensions/optional", required: false }];
  assert.equal(card(candidate), true, JSON.stringify(card.errors));
});

test("a card declares exactly one AAP profile version", () => {
  for (const uri of [
    "https://draft.autoagentprotocol.invalid/extensions/aap/latest",
    "https://autoagentprotocol.org/extensions/aap/v1.3",
  ]) {
    const candidate = structuredClone(example) as any;
    candidate.capabilities.extensions.push({ uri, required: true });
    assert.equal(card(candidate), false, `duplicate or alternative profile ${uri} must be rejected`);
  }
});

test("a card without a JSONRPC interface is rejected", () => {
  const interfaces = [{ url: "https://demo.example.com/grpc", protocolBinding: "GRPC", protocolVersion: "1.0" }];
  assert.equal(card(withCard({ supportedInterfaces: interfaces })), false);
});

test("an interface may carry the A2A tenant routing value", () => {
  const interfaces = [{ url: "https://demo.example.com/a2a", protocolBinding: "JSONRPC", protocolVersion: "1.0", tenant: "rooftop-42" }];
  assert.equal(card(withCard({ supportedInterfaces: interfaces })), true, JSON.stringify(card.errors));
});

test("A2A-required arrays may not be empty", () => {
  assert.equal(card(withCard({ skills: [] })), false);
  assert.equal(card(withCard({ defaultInputModes: [] })), false);
  assert.equal(card(withCard({ defaultOutputModes: [] })), false);
});

test("securityRequirements takes the A2A v1.0 schemes shape", () => {
  assert.equal(card(withCard({ securityRequirements: [{ schemes: { bearer: { list: [] } } }] })), true, JSON.stringify(card.errors));
  assert.equal(card(withCard({ securityRequirements: [{ bearer: [] }] })), false);
});

test("the AAP binding must be HTTPS, with loopback allowed for a dev harness", () => {
  const jsonrpc = (url: string) => [{ url, protocolBinding: "JSONRPC", protocolVersion: "1.0" }];
  assert.equal(card(withCard({ supportedInterfaces: jsonrpc("https://demo.example.com/a2a") })), true);
  assert.equal(card(withCard({ supportedInterfaces: jsonrpc("http://localhost:3000/a2a") })), true);
  assert.equal(card(withCard({ supportedInterfaces: jsonrpc("http://127.0.0.1/a2a") })), true);
  assert.equal(card(withCard({ supportedInterfaces: jsonrpc("http://[::1]:3000/a2a") })), true);
  assert.equal(card(withCard({ supportedInterfaces: jsonrpc("http://demo.example.com/a2a") })), false);
  assert.equal(card(withCard({ supportedInterfaces: jsonrpc("http://localhost.evil.com/a2a") })), false);
});

test("all advertised interfaces use A2A endpoint URLs, including GRPC", () => {
  const interfaces = [
    { url: "https://demo.example.com/a2a", protocolBinding: "JSONRPC", protocolVersion: "1.0" },
    { url: "https://demo.example.com:443", protocolBinding: "GRPC", protocolVersion: "1.0" },
  ];
  assert.equal(card(withCard({ supportedInterfaces: interfaces })), true, JSON.stringify(card.errors));
  for (const url of ["demo.example.com:443", "http://demo.example.com:443"]) {
    interfaces[1].url = url;
    assert.equal(card(withCard({ supportedInterfaces: interfaces })), false, url);
  }
});

test("declared media-type modes match what AAP actually exchanges", () => {
  const manifest = parseYaml(readFileSync(resolve(ROOT, "spec/latest/skills.yaml"), "utf8"));
  assert.deepEqual(new Set(example.defaultInputModes as string[]), new Set(manifest.skills.map((skill: any) => skill.media_type_request)));
  assert.deepEqual(new Set(example.defaultOutputModes as string[]), new Set(manifest.skills.map((skill: any) => skill.media_type_response)));
  for (const skill of example.skills as any[]) {
    const declared = manifest.skills.find((entry: any) => entry.id === skill.id);
    assert.ok(declared, `missing manifest skill ${skill.id}`);
    assert.deepEqual(skill.inputModes, [declared.media_type_request], skill.id);
    assert.deepEqual(skill.outputModes, [declared.media_type_response], skill.id);
  }
});
