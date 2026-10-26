import assert from "node:assert/strict";
import { once } from "node:events";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { resolve } from "node:path";
import test from "node:test";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { globSync } from "glob";
import { parse } from "yaml";
import { MCP_VERSIONS } from "../../tools/generate-mcp-manifest.js";
import { a2aRequestHeaders, mcpRequestHeaders } from "../../tools/lib/request-headers.js";
import { ROOT } from "../../tools/lib/releases.js";

const manifest = parse(readFileSync(resolve(ROOT, "spec/latest/skills.yaml"), "utf8"));
const read = (schema: string) => JSON.parse(readFileSync(resolve(ROOT, "spec/latest/examples", schema.replace(".schema.json", ".example.json")), "utf8"));
const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats(ajv);
for (const file of globSync("spec/latest/schemas/**/*.schema.json", { cwd: ROOT })) ajv.addSchema(JSON.parse(readFileSync(resolve(ROOT, file), "utf8")));

for (const binding of ["a2a", "mcp"] as const) {
  test(`${binding} compatibility ingress accepts all five skills with omitted redundant headers`, { timeout: 15000 }, async () => {
    const executed: Headers[] = [];
    // Local protocol fixture: validates real HTTP requests and shared payloads;
    // it does not represent a deployed dealer or deliver any leads.
    const server = createServer(async (req, res) => {
      let body = "";
      for await (const chunk of req) body += chunk;
      const request = JSON.parse(body);
      const headers = new Headers();
      for (const [name, value] of Object.entries(req.headers)) if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(", ") : value);
      const checked = binding === "a2a" ? a2aRequestHeaders(headers, manifest.extension_uri) : mcpRequestHeaders(headers, request);
      res.setHeader("Content-Type", "application/json");
      if (checked.error) { res.writeHead(400).end(JSON.stringify({ jsonrpc: "2.0", id: request.id, error: checked.error })); return; }
      const data = binding === "a2a" ? request.params.message.parts[0].data : request.params.arguments;
      const skill = manifest.skills.find((item: any) => item.request_type === data.type);
      if (!skill || !ajv.validate(`${manifest.schema_base_url}${skill.request_schema}`, data)) {
        res.writeHead(400).end(JSON.stringify({ jsonrpc: "2.0", id: request.id, error: { code: -32602, message: "Invalid AAP request" } })); return;
      }
      executed.push(checked.headers);
      const response = read(skill.response_schema);
      const result = binding === "a2a"
        ? { message: { messageId: `response-${request.id}`, contextId: "header-test", role: "ROLE_AGENT", parts: [{ data: response, mediaType: skill.media_type_response }] } }
        : { resultType: "complete", isError: false, structuredContent: response, content: [{ type: "text", text: JSON.stringify(response) }] };
      res.end(JSON.stringify({ jsonrpc: "2.0", id: request.id, result }));
    });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const endpoint = `http://127.0.0.1:${address.port}/${binding}`;
    const requestFor = (skill: any) => binding === "a2a"
      ? { jsonrpc: "2.0", id: skill.id, method: "SendMessage", params: { message: { messageId: `request-${skill.id}`, role: "ROLE_USER", parts: [{ data: read(skill.request_schema), mediaType: skill.media_type_request }] }, configuration: { acceptedOutputModes: [skill.media_type_response] } } }
      : { jsonrpc: "2.0", id: skill.id, method: "tools/call", params: { name: `aap_${skill.id.replaceAll(".", "_")}`, arguments: read(skill.request_schema), _meta: { "io.modelcontextprotocol/protocolVersion": MCP_VERSIONS[0], "io.modelcontextprotocol/clientCapabilities": {} } } };
    try {
      for (const skill of manifest.skills) {
        const optional: Array<[string, string]> = binding === "a2a"
          ? [["A2A-Version", "1.0"], ["A2A-Extensions", manifest.extension_uri]]
          : [["MCP-Protocol-Version", MCP_VERSIONS[0]], ["Mcp-Method", "tools/call"], ["Mcp-Name", `aap_${skill.id.replaceAll(".", "_")}`]];
        for (let mask = 0; mask < 2 ** optional.length; mask++) {
          const headers = new Headers({ "Content-Type": "application/json" });
          if (mask % 2) headers.set("Accept", "application/json");
          optional.forEach(([name, value], bit) => { if (mask & (1 << bit)) headers.set(name, value); });
          const response = await fetch(endpoint, { method: "POST", headers, body: JSON.stringify(requestFor(skill)), signal: AbortSignal.timeout(3000) });
          assert.equal(response.status, 200, `${skill.id} header mask ${mask}`);
          const envelope = await response.json();
          const value = binding === "a2a" ? envelope.result.message.parts[0].data : envelope.result.structuredContent;
          assert.deepEqual(value, read(skill.response_schema));
          for (const [name, expected] of optional) assert.equal(executed.at(-1)!.get(name), expected);
          for (const name of ["Authorization", "DPoP", "Origin", "Mcp-Session-Id"]) assert.equal(executed.at(-1)!.has(name), false, `${name} must not be invented`);
        }
      }
      const before = executed.length;
      const conflicts: Array<[string, string, number]> = binding === "a2a"
        ? [["A2A-Version", "", -32009], ["A2A-Version", "0.3", -32009], ["A2A-Version", "2.0", -32009], ["A2A-Extensions", "", -32008], ["A2A-Extensions", `${manifest.extension_uri}/extra`, -32008], ["A2A-Extensions", "https://autoagentprotocol.org/extensions/aap/v2.1", -32008]]
        : [["MCP-Protocol-Version", "", -32020], ["MCP-Protocol-Version", MCP_VERSIONS[1], -32020], ["Mcp-Method", "tools/list", -32020], ["Mcp-Method", "", -32020], ["Mcp-Name", "different_tool", -32020], ["Mcp-Name", "", -32020]];
      for (const [name, value, code] of conflicts) {
        const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json", [name]: value }, body: JSON.stringify(requestFor(manifest.skills[0])), signal: AbortSignal.timeout(3000) });
        assert.equal(response.status, 400, name);
        assert.equal((await response.json()).error.code, code, name);
      }
      assert.equal(executed.length, before, "conflicting metadata must never execute a skill");
    } finally {
      server.closeAllConnections();
      await new Promise<void>(resolve => server.close(() => resolve()));
    }
  });
}

test("MCP version inference requires current body metadata or this client's negotiated legacy context", () => {
  const request = { method: "tools/list" };
  assert.equal(mcpRequestHeaders(new Headers(), request).error?.code, -32022);
  const legacy = mcpRequestHeaders(new Headers(), request, MCP_VERSIONS[1]);
  assert.equal(legacy.error, undefined);
  assert.equal(legacy.headers.get("MCP-Protocol-Version"), MCP_VERSIONS[1]);
  assert.equal(legacy.headers.has("Mcp-Method"), false, "legacy requests do not acquire modern requirements");
  assert.equal(mcpRequestHeaders(new Headers({ "MCP-Protocol-Version": MCP_VERSIONS[0] }), request).error?.code, -32600, "a header cannot replace required current body metadata");
  for (const version of ["2099-01-01", "", 42]) {
    assert.equal(mcpRequestHeaders(new Headers(), { ...request, params: { _meta: { "io.modelcontextprotocol/protocolVersion": version } } }).error?.code, -32022);
  }
});

test("header normalization preserves supplied credentials and validates encoded MCP tool names", () => {
  const headers = new Headers({ Authorization: "DPoP illustrative-token", DPoP: "illustrative-proof", Origin: "https://buyer.example" });
  const request = { method: "tools/call", params: { name: "aap_inventory_search", _meta: { "io.modelcontextprotocol/protocolVersion": MCP_VERSIONS[0] } } };
  headers.set("Mcp-Name", `=?base64?${Buffer.from(request.params.name).toString("base64")}?=`);
  const normalized = mcpRequestHeaders(headers, request);
  assert.equal(normalized.error, undefined);
  for (const name of ["Authorization", "DPoP", "Origin", "Mcp-Name"]) assert.equal(normalized.headers.get(name), headers.get(name));
  assert.equal(headers.has("Mcp-Method"), false, "normalization must not mutate caller-owned headers");
  for (const value of ["=?base64?%%%%?=", "=?base64?ZGlmZmVyZW50?=", "Aap_inventory_search"]) {
    headers.set("Mcp-Name", value);
    assert.equal(mcpRequestHeaders(headers, request).error?.code, -32020);
  }
  for (const name of ["検索", " padded ", "line\nbreak", "=?base64?literal?="]) {
    const named = { ...request, params: { ...request.params, name } };
    const inferred = mcpRequestHeaders(new Headers(), named);
    assert.equal(inferred.error, undefined);
    assert.equal(inferred.headers.get("Mcp-Name"), `=?base64?${Buffer.from(name).toString("base64")}?=`);
    assert.equal(mcpRequestHeaders(inferred.headers, named).error, undefined, "inferred headers must pass the same validation when supplied");
  }
  assert.equal(mcpRequestHeaders(new Headers(), { ...request, method: "tools/call\ninjected" }).error?.code, -32020);
});
