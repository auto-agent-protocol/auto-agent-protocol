import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { globSync } from "glob";
import { ROOT } from "../../tools/lib/releases.js";

test("Frozen AAP 3.1 examples conform to the pinned independent Company-kit schemas", () => {
  const ajv = new Ajv2020({ strict: false, allErrors: true });
  for (const file of globSync("tests/upstream/poppy/*.schema.json", { cwd: ROOT })) {
    ajv.addSchema(JSON.parse(readFileSync(resolve(ROOT, file), "utf8")));
  }
  const pairs = [
    ["poppy", "poppy"], ["poppy-document", "poppy"],
    ["poppy-oauth-metadata", "authorization-server-metadata"],
    ["poppy-client-metadata", "client-metadata"], ["poppy-session-assertion", "session-assertion"],
    ["poppy-session-token", "token-response"], ["poppy-token-exchange-response", "token-response"],
    ["poppy-alternative", "alternative"], ["poppy-excluded-tasks", "excluded-tasks"],
    ["poppy-feedback-request", "feedback-report"],
    ["poppy.native-mcp", "poppy"], ["poppy-oauth-metadata.native-mcp", "authorization-server-metadata"],
    ["poppy-mcp-resource-metadata", "protected-resource-metadata"],
    ["poppy-mcp-resource-metadata.dpop", "protected-resource-metadata"],
  ];
  for (const [example, schema] of pairs) {
    const value = JSON.parse(readFileSync(resolve(ROOT, `spec/v3.1/examples/${example}.example.json`), "utf8"));
    assert.ok(ajv.validate(`${schema}.schema.json`, value), `${example}: ${ajv.errorsText(ajv.errors)}`);
  }
});

test("published PAP 0.3 draft examples conform to unmodified pinned Company-kit schemas", () => {
  const ajv = new Ajv2020({ strict: false, allErrors: true });
  const folder = resolve(ROOT, "tests/upstream/poppy/published-0.3");
  const checksums = JSON.parse(readFileSync(resolve(folder, "sha256.json"), "utf8"));
  for (const [file, digest] of Object.entries(checksums)) {
    const bytes = readFileSync(resolve(folder, file));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), digest, `${file}: upstream fixture changed`);
    ajv.addSchema(JSON.parse(bytes.toString()));
  }
  const pairs = [
    ["poppy", "poppy"], ["poppy-document", "poppy"], ["poppy.existing-issuer", "poppy"], ["poppy.native-mcp", "poppy"],
    ["poppy-oauth-metadata", "authorization-server-metadata"], ["poppy-client-metadata", "client-metadata"],
    ["poppy-session-jwt", "session-jwt"], ["poppy-delegation", "delegation"], ["poppy-access-token-response", "token-response"],
    ["poppy-protected-resource-metadata", "protected-resource-metadata"], ["poppy-protected-resource-metadata.existing-issuer", "protected-resource-metadata"], ["poppy-protected-resource-metadata.native-mcp", "protected-resource-metadata"],
    ["poppy-browser-session-authorize", "browser-session-authorize"], ["poppy-session-error", "error"],
    ["poppy-alternative", "alternative"], ["poppy-excluded-tasks", "excluded-tasks"], ["poppy-feedback-request", "feedback-report"],
  ];
  for (const [example, schema] of pairs) {
    const value = JSON.parse(readFileSync(resolve(ROOT, `spec/v3.2/examples/${example}.example.json`), "utf8"));
    assert.ok(ajv.validate(`${schema}.schema.json`, value), `${example}: ${ajv.errorsText(ajv.errors)}`);
  }
});

test("PAP 1.0 examples conform to all unmodified pinned Company-kit schemas", () => {
  const ajv = new Ajv2020({ strict: false, allErrors: true }); addFormats(ajv);
  const folder = resolve(ROOT, "tests/upstream/poppy/published-1.0");
  const checksums = JSON.parse(readFileSync(resolve(folder, "sha256.json"), "utf8"));
  assert.deepEqual(globSync("*.schema.json", { cwd: folder }).sort(), Object.keys(checksums.schemas).sort(), "every upstream kit schema is pinned");
  assert.equal(Object.keys(checksums.schemas).length, 31);
  for (const [file, digest] of Object.entries(checksums.schemas)) {
    const bytes = readFileSync(resolve(folder, file));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), digest, `${file}: upstream fixture changed`);
    ajv.addSchema(JSON.parse(bytes.toString()));
  }
  for (const file of Object.keys(checksums.schemas)) assert.doesNotThrow(() => ajv.getSchema(file), `${file} compiles with its references`);
  const pairs = [
    ["poppy", "poppy"], ["poppy-document", "poppy"], ["poppy.existing-issuer", "poppy"], ["poppy.native-mcp", "poppy"],
    ["poppy-oauth-metadata", "authorization-server-metadata"], ["poppy-oauth-metadata.native-mcp", "authorization-server-metadata"], ["poppy-client-metadata", "client-metadata"],
    ["poppy-session-jwt", "session-jwt"], ["poppy-delegation", "delegation"], ["poppy-access-token-response", "token-response"],
    ["poppy-protected-resource-metadata", "protected-resource-metadata"], ["poppy-protected-resource-metadata.existing-issuer", "protected-resource-metadata"], ["poppy-protected-resource-metadata.native-mcp", "protected-resource-metadata"],
    ["poppy-browser-session-authorize", "browser-session-authorize"], ["poppy-session-error", "error"], ["poppy-session-error.version-unsupported", "error"], ["poppy-error.extension-required", "error"],
    ["poppy-alternative", "alternative"], ["poppy-tasks", "tasks"], ["poppy-feedback-request", "feedback-report"],
    ["poppy-operation", "operation"], ["poppy-approval", "approval"], ["poppy-approval-declined", "approval-declined"],
  ];
  for (const [example, schema] of pairs) {
    const value = JSON.parse(readFileSync(resolve(ROOT, `spec/latest/examples/${example}.example.json`), "utf8"));
    assert.ok(ajv.validate(`${schema}.schema.json`, value), `${example}: ${ajv.errorsText(ajv.errors)}`);
  }
  const required = JSON.parse(readFileSync(resolve(ROOT, "spec/latest/examples/poppy-approval-required.example.json"), "utf8"));
  assert.equal(required.error, "approval_required");
  assert.ok(ajv.validate("operation.schema.json", required.operation), ajv.errorsText(ajv.errors));
  for (const stale of [
    { ...JSON.parse(readFileSync(resolve(ROOT, "spec/v3.2/examples/poppy.example.json"), "utf8")), protocol_version: "1.0" },
    { protocol_version: "1.0", organization: { name: "Demo", domain: "demo.example" }, agent: { protocols: [{ type: "poppy", endpoint: "https://demo.example/conversations" }] } },
  ]) assert.equal(ajv.validate("poppy.schema.json", stale), false, "0.3-shaped extensions and undescribed conversation entries are not PAP 1.0");
});
