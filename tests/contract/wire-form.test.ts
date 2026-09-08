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

function documentedErrors(): Array<{ file: string; value: Record<string, any> }> {
  return ["docs/errors.md", "docs/bindings/json-rpc.md"].flatMap(file =>
    [...readFileSync(resolve(ROOT, file), "utf8").matchAll(/```json\n([\s\S]*?)\n```/g)]
      .map(match => ({ file, value: JSON.parse(match[1]) }))
      .filter(({ value }) => value.jsonrpc && value.error)
  );
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
  for (const { file, value } of [...envelopes(), ...documentedErrors()]) {
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
});

test("the published MCP manifest example matches what the generator produces", async () => {
  const { generateMcp } = await import("../../tools/generate-mcp-manifest.js");

  const out = mkdtempSync(resolve(tmpdir(), "aap-mcp-"));
  try {
    generateMcp(resolve(ROOT, "spec/latest"), out, DRAFT_VERSION);
    const generated = JSON.parse(readFileSync(resolve(out, "mcp.json"), "utf8"));
    const published = JSON.parse(readFileSync(resolve(examplesDir, "mcp-manifest.example.json"), "utf8"));
    assert.deepEqual(published, generated, "spec/latest/examples/mcp-manifest.example.json has drifted from tools/generate-mcp-manifest.ts");
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});
