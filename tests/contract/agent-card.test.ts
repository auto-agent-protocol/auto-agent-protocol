import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import Ajv2020, { type ValidateFunction } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { globSync } from "glob";
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

test("protocolBinding is an open string, so a dealer may advertise non-AAP bindings alongside JSONRPC", () => {
  const interfaces = [
    { url: "https://demo.example.com/a2a", protocolBinding: "JSONRPC", protocolVersion: "1.0" },
    { url: "https://demo.example.com/grpc", protocolBinding: "GRPC", protocolVersion: "1.0" },
    { url: "https://demo.example.com/x", protocolBinding: "https://example.com/bindings/custom/v1", protocolVersion: "1.0" },
  ];
  assert.equal(card(withCard({ supportedInterfaces: interfaces })), true, JSON.stringify(card.errors));
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
  assert.equal(card(withCard({ supportedInterfaces: jsonrpc("http://demo.example.com/a2a") })), false);
  assert.equal(card(withCard({ supportedInterfaces: jsonrpc("http://localhost.evil.com/a2a") })), false);
});

test("the HTTPS rule constrains AAP's own binding, not other bindings a dealer advertises", () => {
  const interfaces = [
    { url: "https://demo.example.com/a2a", protocolBinding: "JSONRPC", protocolVersion: "1.0" },
    { url: "demo.example.com:443", protocolBinding: "GRPC", protocolVersion: "1.0" },
  ];
  assert.equal(card(withCard({ supportedInterfaces: interfaces })), true, JSON.stringify(card.errors));
});

test("declared media-type modes match what AAP actually exchanges", () => {
  const modes = [...(example.defaultInputModes as string[]), ...(example.defaultOutputModes as string[])];
  assert.ok(modes.length > 0);
  for (const mode of modes) {
    assert.match(mode, /^application\/vnd\.autoagent\.[a-z-]+-(request|response)\+json$/);
  }
});
