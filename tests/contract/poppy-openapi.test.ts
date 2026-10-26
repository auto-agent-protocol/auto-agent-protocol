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

test("Poppy OpenAPI carries every AAP skill unchanged and requires DPoP", async () => {
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
    assert.equal(api["x-poppy-protocol-version"], "0.3");
    assert.equal(api["x-poppy-specification-revision"], "86f0c8d8db3c95cf06d7e05370ec4bddf7d25bc7");
    assert.equal(api["x-aap-extension"], manifest.extension_uri);
    assert.equal(Object.keys(api.paths).length, manifest.skills.length);
    assert.equal(api.components.securitySchemes.poppySession.scheme, "DPoP");
    for (const skill of manifest.skills) {
      const op = api.paths[`/skills/${skill.id}`].post;
      assert.equal(op["x-aap-skill"], skill.id);
      assert.deepEqual(op.security, [{ poppySession: [] }]);
      assert.ok(op.parameters.some((p: any) => p.name === "DPoP" && p.required));
      assert.deepEqual(op.parameters.filter((p: any) => p.in === "header").map((p: any) => p.name), ["DPoP"], "native PAP must not inherit A2A or MCP headers");
      assert.ok(op.responses["401"].headers["WWW-Authenticate"]);
      assert.ok(op.responses["200"].headers["DPoP-Nonce"]);
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
