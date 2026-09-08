import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import { globSync } from "glob";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { parse as parseYaml } from "yaml";
import { generateOpenapi } from "../../tools/generate-openapi.js";
import { DRAFT_VERSION, ROOT } from "../../tools/lib/releases.js";

const examplesDir = resolve(ROOT, "spec/latest/examples");

async function openapi(): Promise<Record<string, any>> {
  const out = mkdtempSync(resolve(tmpdir(), "aap-openapi-"));
  try {
    await generateOpenapi(resolve(ROOT, "spec/latest"), out, DRAFT_VERSION);
    return parseYaml(readFileSync(resolve(out, "openapi-jsonrpc.yaml"), "utf8"));
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
}

function documentedJson(): Array<{ file: string; value: Record<string, any> }> {
  return ["docs/errors.md", "docs/bindings/json-rpc.md", "docs/intro.md", "docs/a2a-profile.md"].flatMap(file =>
    [...readFileSync(resolve(ROOT, file), "utf8").matchAll(/```json\n([\s\S]*?)\n```/g)]
      .map(match => ({ file, value: JSON.parse(match[1]) }))
  );
}

function documentedErrors(): Array<{ file: string; value: Record<string, any> }> {
  return documentedJson().filter(({ value }) => value.jsonrpc && value.error);
}

function envelopes(): Array<{ file: string; value: Record<string, any> }> {
  return globSync("*.jsonrpc.example.json", { cwd: examplesDir })
    .sort()
    .map((file) => ({ file, value: JSON.parse(readFileSync(resolve(examplesDir, file), "utf8")) }));
}

function parts(envelope: Record<string, any>): Array<Record<string, any>> {
  const message = envelope.params?.message ?? envelope.result?.message;
  return message?.parts ?? [];
}

test("published JSON-RPC envelopes exist and are validated here, not by validate-examples", () => {
  assert.ok(envelopes().length > 0, "no *.jsonrpc.example.json found");
});

test("every envelope is JSON-RPC 2.0 carrying the single A2A operation AAP uses", () => {
  for (const { file, value } of envelopes()) {
    assert.equal(value.jsonrpc, "2.0", file);
    assert.ok(value.id !== undefined, `${file}: missing id`);
    if ("method" in value) assert.equal(value.method, "SendMessage", file);
    else assert.ok("result" in value || "error" in value, `${file}: neither result nor error`);
  }
});

test("messages use the A2A v1.0 ProtoJSON form: role enum names, no kind discriminator, required messageId", () => {
  for (const { file, value } of envelopes()) {
    if (value.error) continue;
    const message = value.params?.message ?? value.result?.message;
    assert.ok(message, `${file}: no message`);
    assert.match(message.role, /^ROLE_(USER|AGENT)$/, `${file}: role must be a ProtoJSON enum name`);
    assert.ok(typeof message.messageId === "string" && message.messageId.length > 0, `${file}: messageId required`);
    assert.ok(!("kind" in message), `${file}: A2A v1.0 Message has no kind discriminator`);
    for (const part of parts(value)) {
      assert.ok(!("kind" in part), `${file}: A2A v1.0 Part has no kind discriminator`);
      assert.ok("data" in part, `${file}: AAP uses DataParts only`);
      assert.match(part.mediaType, /^application\/vnd\.autoagent\./, `${file}: part must advertise its AAP media type`);
    }
  }
});

test("every documented or published server Message includes its context even without a Task", () => {
  const responses = [...envelopes(), ...documentedJson()].flatMap(({ file, value }) => {
    const message = value.result?.message ?? (value.role === "ROLE_AGENT" ? value : undefined);
    return message ? [{ file, message }] : [];
  });
  assert.ok(responses.length >= 9, "response examples are missing from the audit");
  for (const { file, message } of responses) {
    assert.equal(message.role, "ROLE_AGENT", file);
    assert.ok(typeof message.contextId === "string" && message.contextId.length > 0, `${file}: server contextId required`);
  }
});

test("both documented mapping tables preserve the reviewed numeric code for every AAP condition", () => {
  const mappings = {
    UNSUPPORTED_SKILL: -32004, SCHEMA_VALIDATION_FAILED: -32602, MISSING_REQUIRED_FIELD: -32602,
    INVALID_CONDITION: -32602, VEHICLE_NOT_FOUND: -32000, VEHICLE_UNAVAILABLE: -32000,
    CONTACT_CONSENT_REQUIRED: -32000, INVALID_CONSENT: -32000, APPOINTMENT_TIME_UNAVAILABLE: -32000,
    IDEMPOTENCY_CONFLICT: -32000, RATE_LIMITED: -32000, INTERNAL_ERROR: -32603,
  };
  for (const [file, column] of [["docs/errors.md", 3], ["docs/bindings/json-rpc.md", 2]] as const) {
    const rows = readFileSync(resolve(ROOT, file), "utf8").split("\n");
    for (const [code, numeric] of Object.entries(mappings)) {
      const row = rows.find(line => line.startsWith(`| \`${code}\` |`));
      assert.ok(row, `${file}: missing ${code}`);
      assert.equal(Number(row.split(/(?<!\\)\|/)[column].match(/-\d+/)?.[0]), numeric, `${file}: ${code}`);
    }
  }
  for (const { file, value } of envelopes().filter(({ value }) => value.error)) {
    const payload = value.error.data.find((detail: any) => detail.type === "aap.error");
    if (payload) assert.equal(value.error.code, mappings[payload.code as keyof typeof mappings], file);
  }
});

test("published and documented errors preserve A2A details and the AAP payload", () => {
  const errors = envelopes().filter(({ value }) => value.error);
  assert.ok(errors.some(({ value }) => value.error.code === -32602), "missing validation error envelope");
  assert.ok(errors.some(({ value }) => value.error.code === -32000), "missing application error envelope");
  assert.ok(errors.some(({ value }) => value.error.code === -32008), "missing activation error envelope");
  assert.ok(documentedErrors().length >= 3, "missing documented error envelopes");
  const ajv = new Ajv2020({ strict: false, allErrors: true });
  addFormats(ajv);
  const validate = ajv.compile(JSON.parse(readFileSync(resolve(ROOT, "spec/latest/schemas/error.schema.json"), "utf8")));
  for (const { file, value } of [...errors, ...documentedErrors()]) {
    assert.equal(typeof value.error.code, "number", `${file}: JSON-RPC code is numeric`);
    assert.equal(typeof value.error.message, "string", `${file}: missing error message`);
    assert.ok(Array.isArray(value.error.data), `${file}: A2A 9.5 requires error.data to be an array`);
    for (const detail of value.error.data) {
      assert.ok(typeof detail["@type"] === "string", `${file}: every error detail carries @type`);
    }
    const info = value.error.data[0];
    assert.equal(info["@type"], "type.googleapis.com/google.rpc.ErrorInfo", file);
    assert.ok(Object.values(info.metadata).every(item => typeof item === "string"), `${file}: ErrorInfo metadata must be strings`);
    if (value.error.code === -32008) {
      assert.equal(info.domain, "a2a-protocol.org", file);
      assert.equal(info.reason, "EXTENSION_SUPPORT_REQUIRED", file);
      assert.equal(info.metadata.requiredHeader, "A2A-Extensions", file);
      assert.ok(info.metadata.extensionUri, `${file}: activation error needs an extension URI`);
      assert.ok(value.error.message.includes(info.metadata.extensionUri), `${file}: message-only SDKs need the exact extension URI`);
      assert.ok(value.error.message.includes(info.metadata.requiredHeader), `${file}: message-only SDKs need the header name`);
      continue;
    }
    const payload = value.error.data.find((detail: Record<string, any>) => detail["@type"] === "https://autoagentprotocol.org/extensions/aap/error");
    assert.ok(validate(payload), `${file}: ${JSON.stringify(validate.errors)}`);
    assert.equal(info.domain, "autoagentprotocol.org", file);
    assert.equal(info.reason, payload.code, file);
    for (const key of ["code", "error_id", "retryable", "created_at"]) {
      assert.equal(info.metadata[key], String(payload[key]), `${file}: metadata.${key} must survive SDK extraction`);
    }
  }
});

test("generated OpenAPI accepts wire examples and rejects malformed error envelopes", async () => {
  const doc = await openapi();
  const ajv = new Ajv2020({ strict: false, allErrors: true });
  addFormats(ajv);
  ajv.addSchema(doc, "openapi");
  const response = ajv.getSchema("openapi#/components/schemas/JsonRpcResponse")!;
  for (const { file, value } of [...envelopes(), ...documentedJson().filter(({ value }) => value.jsonrpc)]) {
    if (value.method) continue;
    assert.ok(response(value), `${file}: ${JSON.stringify(response.errors)}`);
  }
  const error = { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Invalid JSON payload" } };
  assert.ok(response(error), JSON.stringify(response.errors));
  const result = envelopes().find(({ value }) => value.result)!.value.result;
  for (const invalid of [
    { jsonrpc: "2.0", id: "req" },
    { ...error, result },
    { jsonrpc: "2.0", id: "req", result: {} },
    { ...error, error: { code: "RATE_LIMITED", message: "Throttled" } },
    { ...error, error: { code: -32000 } },
    { ...error, error: { code: -32000, message: "Throttled", data: { type: "aap.error" } } },
    { ...error, error: { code: -32000, message: "Throttled", data: [{}] } },
  ]) assert.equal(response(invalid), false, JSON.stringify(invalid));
});

test("generated response schemas require contextId without requiring it on an initial request", async () => {
  const doc = await openapi();
  const ajv = new Ajv2020({ strict: false, allErrors: true });
  addFormats(ajv);
  ajv.addSchema(doc, "openapi");
  const response = ajv.getSchema("openapi#/components/schemas/JsonRpcResponse")!;
  const request = ajv.getSchema("openapi#/components/schemas/JsonRpcRequest")!;
  const requestValue = structuredClone(envelopes().find(({ value }) => value.method)!.value);
  delete requestValue.params.message.contextId;
  assert.ok(request(requestValue), JSON.stringify(request.errors));
  requestValue.params.message.contextId = "ctx_existing";
  assert.ok(request(requestValue), JSON.stringify(request.errors));
  requestValue.params.message.contextId = "";
  assert.ok(request(requestValue), "the response fix must not tighten client request context validation");
  const responseValue = envelopes().find(({ value }) => value.result)!.value;
  for (const contextId of [undefined, "", 123]) {
    const invalid = structuredClone(responseValue);
    if (contextId === undefined) delete invalid.result.message.contextId;
    else invalid.result.message.contextId = contextId;
    assert.equal(response(invalid), false);
    assert.ok(response.errors?.some(error => error.instancePath === "/result/message/contextId" || (error.keyword === "required" && error.params.missingProperty === "contextId")), JSON.stringify(response.errors));
  }
  const wrongRole = structuredClone(responseValue);
  wrongRole.result.message.role = "ROLE_USER";
  assert.equal(response(wrongRole), false);
  assert.ok(response.errors?.some(error => error.instancePath === "/result/message/role" && error.keyword === "const"));
});

test("generated error details validate the reachable AAP component without swallowing malformed known types", async () => {
  const doc = await openapi();
  const ajv = new Ajv2020({ strict: false, allErrors: true });
  addFormats(ajv);
  ajv.addSchema(doc, "openapi");
  const response = ajv.getSchema("openapi#/components/schemas/JsonRpcResponse")!;
  const envelope = structuredClone(envelopes().find(({ value }) => value.error?.code === -32602)!.value);
  const payload = envelope.error.data.find((detail: any) => detail.type === "aap.error");
  assert.ok(response(envelope), JSON.stringify(response.errors));
  payload.retryable = "false";
  assert.equal(response(envelope), false, "known AAP type must not fall through the generic detail branch");
  assert.ok(response.errors?.some(error => error.instancePath.endsWith("/retryable") && error.keyword === "type"));
  payload.retryable = false;
  delete payload.code;
  assert.equal(response(envelope), false);
  assert.ok(response.errors?.some(error => error.keyword === "required" && error.params.missingProperty === "code"));
  envelope.error.data = [{ "@type": "https://example.com/future/detail", opaque: { value: true } }];
  assert.ok(response(envelope), "unknown non-AAP error details stay forward compatible");
});

test("generated extension headers accept exact list members and reject lookalikes", async () => {
  const doc = await openapi();
  const uri = parseYaml(readFileSync(resolve(ROOT, "spec/latest/skills.yaml"), "utf8")).extension_uri as string;
  const schema = doc.paths["/"].post.parameters.find((p: any) => p.name === "A2A-Extensions").schema;
  const validate = new Ajv2020().compile(schema);
  for (const value of [uri, ` ${uri} `, `https://example.com/ext, ${uri}`, `${uri},https://example.com/ext`]) {
    assert.equal(validate(value), true, value);
  }
  for (const value of ["", `${uri}/extra`, `prefix${uri}`, uri.replace("autoagentprotocol.", "autoagentprotocolX"), "https://example.com/ext"]) {
    assert.equal(validate(value), false, value);
  }
});

test("the typed AAP error payload carries the ProtoJSON type tag its schema requires", () => {
  const error = JSON.parse(readFileSync(resolve(examplesDir, "error.example.json"), "utf8")) as Record<string, unknown>;
  assert.equal(error["@type"], "https://autoagentprotocol.org/extensions/aap/error");
  assert.equal(error.type, "aap.error");
  const ajv = new Ajv2020({ strict: false, allErrors: true });
  addFormats(ajv);
  const validate = ajv.compile(JSON.parse(readFileSync(resolve(ROOT, "spec/latest/schemas/error.schema.json"), "utf8")));
  for (const key of ["@type", "type", "error_id", "code", "message", "retryable", "created_at"]) {
    const missing = { ...error };
    delete missing[key];
    assert.equal(validate(missing), false, `${key} is required, not merely present in examples`);
    assert.ok(validate.errors?.some(issue => issue.keyword === "required" && issue.params.missingProperty === key));
  }
});

test("editable discovery and activation examples use the same draft contract rather than the frozen URI", () => {
  const example = JSON.parse(readFileSync(resolve(examplesDir, "agent-card.example.json"), "utf8"));
  const discovery = readFileSync(resolve(ROOT, "docs/discovery.md"), "utf8");
  const card = JSON.parse(discovery.match(/```json\n([\s\S]*?)\n```/)![1]);
  assert.deepEqual(card, example);
  for (const file of ["docs/intro.md", "docs/a2a-profile.md", "docs/bindings/json-rpc.md", "docs/discovery.md", "docs/errors.md", "docs/compatibility/mcp.md"]) {
    const text = readFileSync(resolve(ROOT, file), "utf8");
    assert.doesNotMatch(text, /A2A-Extensions:\s*https:\/\/autoagentprotocol\.org\/extensions\/aap\/v1\.3\b/, `${file}: new activation rules must not use the frozen URI`);
    assert.match(text, /(?:[Uu]nreleased|next.major|2\.0\.0)/, `${file}: missing release scope`);
  }
});

test("the published MCP manifest example matches what the generator produces", async () => {
  const { generateMcp } = await import("../../tools/generate-mcp-manifest.js");

  const out = mkdtempSync(resolve(tmpdir(), "aap-mcp-"));
  try {
    generateMcp(resolve(ROOT, "spec/latest"), out, DRAFT_VERSION);
    const generated = JSON.parse(readFileSync(resolve(out, "mcp.json"), "utf8"));
    const published = JSON.parse(readFileSync(resolve(examplesDir, "mcp-manifest.example.json"), "utf8"));
    assert.deepEqual(published, generated, "spec/latest/examples/mcp-manifest.example.json has drifted from tools/generate-mcp-manifest.ts");
    const docs = readFileSync(resolve(ROOT, "docs/compatibility/mcp.md"), "utf8");
    const documented = JSON.parse(docs.match(/```json\n([\s\S]*?)\n```/)![1]);
    assert.deepEqual(documented, generated, "the documented MCP manifest has drifted from the generator");
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});
