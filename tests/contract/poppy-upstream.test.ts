import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import Ajv2020 from "ajv/dist/2020.js";
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
    const value = JSON.parse(readFileSync(resolve(ROOT, `spec/latest/examples/${example}.example.json`), "utf8"));
    assert.ok(ajv.validate(`${schema}.schema.json`, value), `${example}: ${ajv.errorsText(ajv.errors)}`);
  }
});
