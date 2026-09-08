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

function rejectsFor(
  candidate: unknown,
  expected: { keyword: string; instancePath: string; params?: Record<string, unknown> },
): void {
  assert.equal(card(candidate), false, "candidate must be rejected");
  assert.ok(card.errors?.some((error) =>
    error.keyword === expected.keyword &&
    error.instancePath === expected.instancePath &&
    Object.entries(expected.params ?? {}).every(([key, value]) => error.params[key] === value)),
  `expected ${JSON.stringify(expected)}, received ${JSON.stringify(card.errors)}`);
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
  const optional = structuredClone(example) as any;
  optional.capabilities.extensions[0].required = false;
  rejectsFor(optional, {
    keyword: "const", instancePath: "/capabilities/extensions/0/required", params: { allowedValue: true },
  });
  const missing = structuredClone(example) as any;
  delete missing.capabilities.extensions[0].required;
  rejectsFor(missing, {
    keyword: "required", instancePath: "/capabilities/extensions/0", params: { missingProperty: "required" },
  });
  const candidate = structuredClone(example) as any;
  candidate.capabilities.extensions = [extension, { uri: "https://example.com/extensions/optional", required: false }];
  assert.equal(card(candidate), true, JSON.stringify(card.errors));
});

test("the AAP extension declaration cannot be omitted or replaced by an unrelated extension", () => {
  rejectsFor(withCard({ capabilities: {} }), {
    keyword: "required", instancePath: "/capabilities", params: { missingProperty: "extensions" },
  });
  for (const extensions of [[], [{ uri: "https://example.com/extensions/optional", required: true }]]) {
    rejectsFor(withCard({ capabilities: { extensions } }), {
      keyword: "contains", instancePath: "/capabilities/extensions", params: { minContains: 1 },
    });
  }
});

test("a card declares exactly one AAP profile version", () => {
  for (const uri of [
    "https://draft.autoagentprotocol.invalid/extensions/aap/latest",
    "https://autoagentprotocol.org/extensions/aap/v1.3",
  ]) {
    for (const required of [true, false]) {
      const candidate = structuredClone(example) as any;
      candidate.capabilities.extensions.push({ uri, required });
      rejectsFor(candidate, {
        keyword: "contains", instancePath: "/capabilities/extensions", params: { minContains: 1, maxContains: 1 },
      });
    }
  }
});

test("a card without a JSONRPC interface is rejected", () => {
  const interfaces = [{ url: "https://demo.example.com/grpc", protocolBinding: "GRPC", protocolVersion: "1.0" }];
  rejectsFor(withCard({ supportedInterfaces: interfaces }), {
    keyword: "contains", instancePath: "/supportedInterfaces", params: { minContains: 1 },
  });
});

test("an interface may carry the A2A tenant routing value", () => {
  const interfaces = [{ url: "https://demo.example.com/a2a", protocolBinding: "JSONRPC", protocolVersion: "1.0", tenant: "rooftop-42" }];
  assert.equal(card(withCard({ supportedInterfaces: interfaces })), true, JSON.stringify(card.errors));
});

test("A2A-required arrays may not be empty", () => {
  for (const field of ["supportedInterfaces", "skills", "defaultInputModes", "defaultOutputModes"]) {
    rejectsFor(withCard({ [field]: [] }), {
      keyword: "minItems", instancePath: `/${field}`, params: { limit: 1 },
    });
  }
  const candidate = structuredClone(example) as any;
  candidate.skills[0].tags = [];
  rejectsFor(candidate, { keyword: "minItems", instancePath: "/skills/0/tags", params: { limit: 1 } });
});

test("securityRequirements takes the A2A v1.0 schemes shape", () => {
  assert.equal(card(withCard({ securityRequirements: [{ schemes: { bearer: { list: [] } } }] })), true, JSON.stringify(card.errors));
  rejectsFor(withCard({ securityRequirements: [{ bearer: [] }] }), {
    keyword: "anyOf", instancePath: "/securityRequirements/0",
  });
});

test("securityRequirements accepts ProtoJSON's omitted empty schemes map", () => {
  for (const requirement of [{}, { schemes: {} }]) {
    assert.equal(card(withCard({ securityRequirements: [requirement] })), true, JSON.stringify(card.errors));
    assert.equal(card(withCard({ securityRequirements: [
      { schemes: { bearer: { list: ["inventory.read"] } } }, requirement,
    ] })), true, JSON.stringify(card.errors));
  }
  rejectsFor(withCard({ securityRequirements: [{ schemes: { bearer: [] } }] }), {
    keyword: "type", instancePath: "/securityRequirements/0/schemes/bearer", params: { type: "object" },
  });
});

test("legacy security remains an unknown field, not a v1.0 authentication declaration", () => {
  const candidate = withCard({ security: [{ bearer: [] }] });
  assert.equal(card(candidate), true, JSON.stringify(card.errors));
  assert.equal(Object.hasOwn(candidate, "securityRequirements"), false,
    "validation must not be mistaken for migrating the legacy security field; v1.0 clients read securityRequirements");
});

test("the AAP binding must be HTTPS, with loopback allowed for a dev harness", () => {
  const jsonrpc = (url: string) => [{ url, protocolBinding: "JSONRPC", protocolVersion: "1.0" }];
  for (const url of [
    "https://demo.example.com/a2a",
    "HTTPS://demo.example.com/a2a",
    "hTtPs://demo.example.com:443/a2a?tenant=example",
    "https://demo.example.com:/a2a",
    "https://[2001:db8::1]:443/a2a",
    "https://user:password@demo.example.com/a2a",
    "http://localhost:3000/a2a",
    "HTTP://LOCALHOST:3000/a2a",
    "http://127.0.0.1/a2a",
    "http://[::1]:3000/a2a",
  ]) {
    assert.equal(card(withCard({ supportedInterfaces: jsonrpc(url) })), true, `${url}: ${JSON.stringify(card.errors)}`);
  }
  for (const url of [
    "http://demo.example.com/a2a",
    "http://localhost.evil.com/a2a",
    "http://localhost@evil.example/a2a",
    "http://localhost:3000@evil.example/a2a",
    "http://127.0.0.1.evil.example/a2a",
    "http://[::1]@evil.example/a2a",
    "http://[::1].evil.example/a2a",
    "http://localhost:/a2a",
    "https:///a2a",
    "https://?endpoint=a2a",
    "https://:443/a2a",
    "https://@/a2a",
    "https://demo.example.com:notport/a2a",
    "ftp://demo.example.com/a2a",
  ]) {
    rejectsFor(withCard({ supportedInterfaces: jsonrpc(url) }), {
      keyword: "pattern", instancePath: "/supportedInterfaces/0/url",
    });
  }
  rejectsFor(withCard({ supportedInterfaces: jsonrpc("https://demo.example.com/invalid path") }), {
    keyword: "format", instancePath: "/supportedInterfaces/0/url", params: { format: "uri" },
  });
});

test("all advertised interfaces use A2A endpoint URLs, including GRPC", () => {
  const interfaces = [
    { url: "https://demo.example.com/a2a", protocolBinding: "JSONRPC", protocolVersion: "1.0" },
    { url: "https://demo.example.com:443", protocolBinding: "GRPC", protocolVersion: "1.0" },
  ];
  assert.equal(card(withCard({ supportedInterfaces: interfaces })), true, JSON.stringify(card.errors));
  for (const url of ["demo.example.com:443", "http://demo.example.com:443"]) {
    interfaces[1].url = url;
    rejectsFor(withCard({ supportedInterfaces: interfaces }), {
      keyword: "pattern", instancePath: "/supportedInterfaces/1/url",
    });
  }
});

test("AgentCardSignature has the A2A-required strings and optional unprotected header object", () => {
  const signature = { protected: "eyJhbGciOiJFZERTQSJ9", signature: "c2lnbmF0dXJl" };
  for (const entry of [signature, { ...signature, header: { kid: "example-key" }, futureField: true }]) {
    assert.equal(card(withCard({ signatures: [entry] })), true, JSON.stringify(card.errors));
  }
  for (const field of ["protected", "signature"] as const) {
    const entry: Record<string, unknown> = { ...signature };
    delete entry[field];
    rejectsFor(withCard({ signatures: [entry] }), {
      keyword: "required", instancePath: "/signatures/0", params: { missingProperty: field },
    });
    entry[field] = 42;
    rejectsFor(withCard({ signatures: [entry] }), {
      keyword: "type", instancePath: `/signatures/0/${field}`, params: { type: "string" },
    });
  }
  rejectsFor(withCard({ signatures: [{ ...signature, header: [] }] }), {
    keyword: "type", instancePath: "/signatures/0/header", params: { type: "object" },
  });
  rejectsFor(withCard({ signatures: ["not-a-signature-object"] }), {
    keyword: "type", instancePath: "/signatures/0", params: { type: "object" },
  });
});

test("valid A2A fields and unrelated extensions remain forward-compatible", () => {
  const candidate = structuredClone(example) as any;
  candidate.futureCardField = { enabled: true };
  candidate.supportedInterfaces[0].futureInterfaceField = "value";
  candidate.capabilities.extendedAgentCard = true;
  candidate.capabilities.futureCapability = true;
  candidate.capabilities.extensions[0].futureExtensionField = true;
  candidate.capabilities.extensions.push({ uri: "https://example.com/extensions/unrelated", params: { custom: true } });
  candidate.skills[0].futureSkillField = "value";
  assert.equal(card(candidate), true, JSON.stringify(card.errors));
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
