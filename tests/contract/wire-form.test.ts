import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { globSync } from "glob";
import { ROOT } from "../../tools/lib/releases.js";

const examplesDir = resolve(ROOT, "spec/latest/examples");

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

test("messages use the A2A v1.0 ProtoJSON form: role enum names, no kind discriminator, unique messageId", () => {
  for (const { file, value } of envelopes()) {
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

test("an error envelope carries A2A's data array, never a bare object", () => {
  for (const { file, value } of envelopes()) {
    if (!value.error) continue;
    assert.equal(typeof value.error.code, "number", `${file}: JSON-RPC code is numeric`);
    if ("data" in value.error) {
      assert.ok(Array.isArray(value.error.data), `${file}: A2A 9.5 requires error.data to be an array`);
      for (const detail of value.error.data) {
        assert.ok(typeof detail["@type"] === "string", `${file}: every error detail carries @type`);
      }
    }
  }
});

test("the typed AAP error payload carries the ProtoJSON type tag its schema requires", () => {
  const error = JSON.parse(readFileSync(resolve(examplesDir, "error.example.json"), "utf8")) as Record<string, unknown>;
  assert.equal(error["@type"], "https://autoagentprotocol.org/extensions/aap/error");
  assert.equal(error.type, "aap.error");
});

test("the published MCP manifest example matches what the generator produces", async () => {
  const { mkdtempSync, readFileSync: read } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { generateMcp } = await import("../../tools/generate-mcp-manifest.js");
  const { DRAFT_VERSION } = await import("../../tools/lib/releases.js");

  const out = mkdtempSync(resolve(tmpdir(), "aap-mcp-"));
  generateMcp(resolve(ROOT, "spec/latest"), out, DRAFT_VERSION);

  const generated = JSON.parse(read(resolve(out, "mcp.json"), "utf8"));
  const published = JSON.parse(read(resolve(examplesDir, "mcp-manifest.example.json"), "utf8"));
  assert.deepEqual(published, generated, "spec/latest/examples/mcp-manifest.example.json has drifted from tools/generate-mcp-manifest.ts");
});
