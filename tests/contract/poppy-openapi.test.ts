import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { globSync } from "glob";
import { parse } from "yaml";
import { generateOpenapi } from "../../tools/generate-openapi.js";
import { DRAFT_VERSION, ROOT } from "../../tools/lib/releases.js";

test("Poppy OpenAPI carries every AAP skill unchanged and requires delegated Poppy-Session", async () => {
  const out = mkdtempSync(resolve(tmpdir(), "aap-poppy-api-"));
  try {
    const spec = resolve(ROOT, "spec/latest");
    await generateOpenapi(spec, out, DRAFT_VERSION);
    const api = parse(readFileSync(resolve(out, "openapi-poppy.yaml"), "utf8"));
    const a2a = parse(readFileSync(resolve(out, "openapi-jsonrpc.yaml"), "utf8"));
    const manifest = parse(readFileSync(resolve(spec, "skills.yaml"), "utf8"));
    const ajv = new Ajv2020({ strict: false, allErrors: true }); addFormats(ajv);
    ajv.addSchema({ $id: "https://test.example/poppy", components: api.components });
    assert.equal(api.openapi, "3.1.0");
    assert.match(api.info.description, /^Unreleased AAP 0\.0\.0-dev payloads/);
    assert.equal(api["x-poppy-protocol-version"], "1.0");
    assert.equal(api["x-poppy-specification-revision"], "8c02b4282eda53468a7c09412558bc8b060d95f6");
    assert.equal(api.externalDocs.url, "https://personalagentprotocol.org/docs/1.0/spec");
    assert.equal(manifest.skills.length, 7);
    assert.deepEqual(api.components.parameters.PoppyVersion, { ...api.components.parameters.PoppyVersion, name: "Poppy-Version", in: "header", required: true, example: "1.0" });
    assert.equal(api.components.parameters.PoppyExtensions.required, false);
    assert.equal(api.components.parameters.PoppyApproval.required, false);
    assert.equal(api["x-aap-extension"], manifest.extension_uri);
    assert.equal(Object.keys(api.paths).length, manifest.skills.length);
    assert.equal(api.components.securitySchemes.poppySession.name, "Poppy-Session");
    assert.equal(api.components.securitySchemes.poppySession.in, "header");
    for (const skill of manifest.skills) {
      const op = api.paths[`/skills/${skill.id}`].post;
      assert.equal(op["x-aap-skill"], skill.id);
      assert.deepEqual(op.security, [{ poppySession: [] }]);
      const write = ["lead_submit", "trade_in_submit", "credit_application_submit"].includes(skill.id);
      assert.deepEqual(op.parameters.map((parameter: any) => parameter.$ref.split("/").pop()), ["PoppyVersion", "PoppyExtensions", ...(write ? ["PoppyApproval"] : [])], "PAP 1.0 headers only; no DPoP or A2A/MCP headers on signed-out PAP");
      assert.equal(op.responses["401"], undefined, "Session failures are HTTP 400");
      const failure = ajv.compile({ $id: "https://test.example/poppy-errors/" + skill.id, ...op.responses["400"].content["application/json"].schema, components: api.components });
      assert.equal(failure({ error: "invalid_session", error_description: "Send a fresh delegated JWT." }), true);
      assert.equal(failure({ error: "session_ended" }), true);
      assert.equal(failure({ error: "version_unsupported" }), true);
      const refused = ajv.compile({ $id: "https://test.example/poppy-refusals/" + skill.id, ...op.responses["403"].content["application/json"].schema, components: api.components });
      assert.equal(refused({ error: "extension_required", extension: "operations" }), true);
      const refusals = op.responses["403"].content["application/json"].schema.anyOf.map((entry: any) => entry.$ref.split("/").pop());
      assert.deepEqual(refusals, ["Error", "PoppyError", ...(write ? ["PoppyApprovalRequired", "PoppyApprovalDeclined"] : [])], "only write skills can ask for an Operations approval");
      if (write) for (const name of ["poppy-approval-required", "poppy-approval-declined"]) assert.equal(refused(JSON.parse(readFileSync(resolve(spec, `examples/${name}.example.json`), "utf8"))), true, name);
      assert.equal(failure({ error: "invalid_token" }), false);
      assert.ok(op.responses["429"].headers["Retry-After"]);
      for (const [schemaUrl, schema] of [
        [skill.request_schema, op.requestBody.content["application/json"].schema],
        [skill.response_schema, op.responses["200"].content["application/json"].schema],
      ]) {
        const component = schema.$ref.split("/").pop();
        assert.deepEqual(api.components.schemas[component], a2a.components.schemas[component], "bindings must use identical payload schemas");
        const validate = ajv.compile({ $ref: `https://test.example/poppy${schema.$ref}` });
        const stem = schemaUrl.split("/").pop().replace(".schema.json", "");
        for (const file of globSync(`${stem}*.example.json`, { cwd: resolve(spec, "examples") }).filter(file => !file.includes(".jsonrpc."))) {
          const example = JSON.parse(readFileSync(resolve(spec, "examples", file), "utf8"));
          assert.equal(validate(example), true, `${file}: ${JSON.stringify(validate.errors)}`);
        }
        assert.equal(validate({ type: "unrelated.request" }), false);
      }
      assert.equal(ajv.validate({ $ref: `https://test.example/poppy${op.requestBody.content["application/json"].schema.$ref}` }, op.requestBody.content["application/json"].example), true);
      assert.equal(ajv.validate({ $ref: `https://test.example/poppy${op.responses["200"].content["application/json"].schema.$ref}` }, op.responses["200"].content["application/json"].example), true);
    }
  } finally { rmSync(out, { recursive: true, force: true }); }
});
