import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import Ajv2020 from "ajv/dist/2020.js";
import { globSync } from "glob";
import { ROOT } from "../../tools/lib/releases.js";

test("PAP 0.3 examples conform to the pinned independent Company-kit schemas", () => {
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
    const value = JSON.parse(readFileSync(resolve(ROOT, `spec/latest/examples/${example}.example.json`), "utf8"));
    assert.ok(ajv.validate(`${schema}.schema.json`, value), `${example}: ${ajv.errorsText(ajv.errors)}`);
  }
});
