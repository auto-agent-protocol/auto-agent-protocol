import assert from "node:assert/strict";
import { once } from "node:events";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { resolve } from "node:path";
import test from "node:test";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { globSync } from "glob";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { Client as LegacyClient } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport as LegacyTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { ROOT } from "../../tools/lib/releases.js";
import { AAP_MCP_META, MCP_VERSIONS } from "../../tools/generate-mcp-manifest.js";

const examples = resolve(ROOT, "spec/latest/examples");
const read = (file: string) => JSON.parse(readFileSync(resolve(examples, file), "utf8"));
const catalog = read("mcp-manifest.example.json");
const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats(ajv);
const upstream = JSON.parse(readFileSync(resolve(ROOT, "tests/upstream/mcp/2026-07-28.schema.json"), "utf8"));
ajv.addSchema(upstream, "mcp-upstream");
const validateMcp = (name: string, value: unknown) => {
  const validate = ajv.getSchema(`mcp-upstream#/$defs/${name}`)!;
  assert.equal(validate(value), true, `${name}: ${JSON.stringify(validate.errors)}`);
};
const tools = catalog.tools.map((tool: any) => ({
  ...tool,
  input: ajv.compile(tool.inputSchema),
  output: ajv.compile(tool.outputSchema),
}));

function exampleFile(schema: string): string {
  return schema.split("/").at(-1)!.replace(".schema.json", ".example.json");
}

test("current MCP metadata requires version and capabilities but permits omitted clientInfo", () => {
  const metadata = {
    "io.modelcontextprotocol/protocolVersion": MCP_VERSIONS[0],
    "io.modelcontextprotocol/clientCapabilities": {},
  };
  const request = { jsonrpc: "2.0", id: "minimal", method: "tools/list", params: { _meta: metadata } };
  validateMcp("ListToolsRequest", request);
  const validate = ajv.getSchema("mcp-upstream#/$defs/ListToolsRequest")!;
  for (const key of Object.keys(metadata)) {
    const missing = structuredClone(request);
    delete (missing.params._meta as Record<string, unknown>)[key];
    assert.equal(validate(missing), false, `${key} remains required by MCP`);
  }
});

test("bundled MCP schemas validate every typed example without external schema registration", () => {
  for (const tool of tools) {
    validateMcp("Tool", tool);
    assert.equal(tool.inputSchema.type, "object");
    assert.equal(tool.outputSchema.type, "object");
    const meta = tool._meta[AAP_MCP_META];
    for (const [schema, validate] of [[meta.request_schema, tool.input], [meta.response_schema, tool.output]]) {
      const stem = exampleFile(schema).replace(".example.json", "");
      for (const file of globSync(`${stem}*.example.json`, { cwd: examples }).filter(f => !f.includes(".jsonrpc."))) {
        assert.equal(validate(read(file)), true, `${tool.name}: ${file}: ${JSON.stringify(validate.errors)}`);
      }
    }
    assert.equal(tool.output(read("error.example.json")), true);
    assert.equal(tool.input({}), false, "typed request discriminator is required");
    assert.equal(tool.output({ type: meta.response_type }), false);
    assert.equal(tool.output({ ...read("error.example.json"), code: "MADE_UP" }), false);
    assert.deepEqual(Object.keys(tool.annotations).sort(), ["destructiveHint", "idempotentHint", "openWorldHint", "readOnlyHint"]);
  }
  const lead = tools.find((tool: any) => tool.name === "aap_lead_submit");
  const request = read("lead-submit-request.example.json");
  delete request.idempotency_key;
  assert.equal(lead.input(request), false);
  assert.equal(lead.annotations.readOnlyHint, false);
  assert.equal(lead.annotations.idempotentHint, false);
});

test("MCP input schemas avoid the reported host root-keyword restriction without losing validation", () => {
  const canonical = new Ajv2020({ strict: false, allErrors: true });
  addFormats(canonical);
  for (const file of globSync("spec/latest/schemas/**/*.schema.json", { cwd: ROOT })) canonical.addSchema(JSON.parse(readFileSync(resolve(ROOT, file), "utf8")));
  let comparisons = 0;
  for (const tool of tools) {
    for (const keyword of ["allOf", "anyOf", "oneOf", "not", "if", "then", "else"]) {
      assert.equal(Object.hasOwn(tool.inputSchema, keyword), false, `${tool.name}: unsupported root ${keyword}`);
    }
    const validate = canonical.getSchema(tool._meta[AAP_MCP_META].request_schema)!;
    const stem = exampleFile(tool._meta[AAP_MCP_META].request_schema).replace(".example.json", "");
    const variants: unknown[] = [{}, null, [], { type: tool._meta[AAP_MCP_META].request_type }];
    for (const file of globSync(`${stem}*.example.json`, { cwd: examples }).filter(file => !file.includes(".jsonrpc."))) {
      const original = read(file);
      variants.push(original);
      function mutate(node: any, path: string[] = []): void {
        if (!node || typeof node !== "object" || Array.isArray(node)) return;
        for (const key of Object.keys(node)) {
          for (const replacement of [undefined, null, "", [], {}, false, 0, "unexpected"]) {
            const candidate = structuredClone(original);
            const parent = path.reduce((value, segment) => value[segment], candidate);
            if (replacement === undefined) delete parent[key];
            else parent[key] = replacement;
            variants.push(candidate);
          }
          mutate(node[key], [...path, key]);
        }
      }
      mutate(original);
    }
    if (tool.name === "aap_inventory_search") variants.push({ type: "inventory.search.request", sort: { field: "distance_mi", order: "asc" } });
    if (tool.name === "aap_inventory_vehicle") variants.push({ type: "inventory.vehicle.request", vehicle_id: "listing-42" });
    for (const value of variants) {
      assert.equal(tool.input(value), validate(value), `${tool.name}: validation differs for ${JSON.stringify(value)}`);
      comparisons++;
    }
  }
  assert.ok(comparisons > 500, "exercise missing, malformed and valid fields across every skill");
});

for (const modern of [true, false]) {
  test(`official MCP ${modern ? "2.4.0 current" : "1.32.2 legacy"} client discovers and calls all five tools`, { timeout: 15000 }, async () => {
    const calls: Array<{ request: any; headers: Record<string, unknown>; result?: any }> = [];
    const servedTools = structuredClone(catalog.tools);
    servedTools.find((tool: any) => tool.name === "aap_inventory_search")._meta[AAP_MCP_META].capabilities = read("inventory-capabilities.example.json");
    const server = createServer(async (req, res) => {
      if (req.method !== "POST") { res.writeHead(405).end(); return; }
      let body = "";
      for await (const chunk of req) body += chunk;
      const request = JSON.parse(body);
      const call = { request, headers: req.headers, result: undefined as any };
      calls.push(call);
      if (request.method === "notifications/initialized") { res.writeHead(202).end(); return; }
      res.setHeader("Content-Type", "application/json");
      const current = request.params?._meta?.["io.modelcontextprotocol/protocolVersion"] === MCP_VERSIONS[0];
      if (current) {
        validateMcp("RequestMetaObject", request.params._meta);
        assert.equal(req.headers["mcp-protocol-version"], MCP_VERSIONS[0]);
        assert.equal(req.headers["mcp-method"], request.method);
        if (request.method === "tools/call") assert.equal(req.headers["mcp-name"], request.params.name);
      }
      let result: any;
      if (request.method === "server/discover") {
        result = { resultType: "complete", ttlMs: 300000, cacheScope: "public", supportedVersions: MCP_VERSIONS, capabilities: { tools: {} }, _meta: { "io.modelcontextprotocol/serverInfo": { name: "aap-contract-fixture", version: "1.0.0" } } };
      } else if (request.method === "initialize") {
        result = { protocolVersion: MCP_VERSIONS[1], capabilities: { tools: {} }, serverInfo: { name: "aap-contract-fixture", version: "1.0.0" } };
      } else if (request.method === "tools/list") {
        result = { ...(current ? { resultType: "complete", ttlMs: 300000, cacheScope: "public" } : {}), tools: servedTools };
      } else if (request.method === "tools/call") {
        const tool = tools.find((entry: any) => entry.name === request.params.name);
        if (!tool) { res.end(JSON.stringify({ jsonrpc: "2.0", id: request.id, error: { code: -32602, message: "Unknown tool" } })); return; }
        const valid = tool.input(request.params.arguments);
        const payload = valid ? read(exampleFile(tool._meta[AAP_MCP_META].response_schema)) : read("error.example.json");
        result = { ...(current ? { resultType: "complete" } : {}), isError: !valid, structuredContent: payload, content: [{ type: "text", text: JSON.stringify(payload) }] };
      } else { res.writeHead(404).end(); return; }
      call.result = result;
      res.end(JSON.stringify({ jsonrpc: "2.0", id: request.id, result }));
    });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const endpoint = new URL(`http://127.0.0.1:${address.port}/mcp`);
    const client = modern
      ? new Client({ name: "aap-buyer-fixture", version: "1.0.0" }, { versionNegotiation: { mode: "auto" } })
      : new LegacyClient({ name: "aap-buyer-fixture", version: "1.0.0" });
    try {
      await client.connect(modern ? new StreamableHTTPClientTransport(endpoint) : new LegacyTransport(endpoint));
      const listed = await client.listTools();
      assert.deepEqual(listed.tools, servedTools);
      for (const tool of tools) {
        const meta = tool._meta[AAP_MCP_META];
        const result = await client.callTool({ name: tool.name, arguments: read(exampleFile(meta.request_schema)) });
        assert.equal(result.isError, false);
        assert.deepEqual(result.structuredContent, read(exampleFile(meta.response_schema)));
        assert.equal(tool.output(result.structuredContent), true, JSON.stringify(tool.output.errors));
      }
      const failure = await client.callTool({ name: "aap_inventory_search", arguments: { type: "inventory.search.request", filters: { unknown: true } } });
      assert.equal(failure.isError, true);
      assert.deepEqual(failure.structuredContent, read("error.example.json"));
      if (modern) {
        for (const call of calls) {
          const schema = ({ "server/discover": "Discover", "tools/list": "ListTools", "tools/call": "CallTool" } as Record<string, string>)[call.request.method];
          validateMcp("JSONRPCRequest", call.request);
          validateMcp(`${schema}Request`, call.request);
          validateMcp(`${schema}Result`, call.result);
        }
      }
      assert.equal(calls[0].request.method, modern ? "server/discover" : "initialize");
      assert.equal(calls.some(call => call.request.method === "notifications/initialized"), !modern);
      for (const { request, headers, result } of calls.filter(call => ["tools/list", "tools/call"].includes(call.request.method))) {
        assert.equal(headers["mcp-protocol-version"], modern ? MCP_VERSIONS[0] : MCP_VERSIONS[1]);
        if (modern) {
          assert.equal(headers["mcp-method"], request.method);
          if (request.method === "tools/call") assert.equal(headers["mcp-name"], request.params.name);
          assert.equal(request.params._meta["io.modelcontextprotocol/protocolVersion"], MCP_VERSIONS[0]);
          assert.equal(result.resultType, "complete");
        } else assert.equal(result.resultType, undefined);
        for (const name of ["authorization", "dpop", "a2a-version", "a2a-extensions", "mcp-session-id", "origin"]) {
          assert.equal(headers[name], undefined, `public MCP needs no ${name} header`);
        }
        if (result.content) assert.deepEqual(JSON.parse(result.content[0].text), result.structuredContent);
      }
      if (modern) {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream", "MCP-Protocol-Version": MCP_VERSIONS[0], "Mcp-Method": "tools/list" },
          body: JSON.stringify({ jsonrpc: "2.0", id: "without-client-info", method: "tools/list", params: { _meta: {
            "io.modelcontextprotocol/protocolVersion": MCP_VERSIONS[0],
            "io.modelcontextprotocol/clientCapabilities": {},
          } } }),
        });
        assert.equal(response.status, 200);
        const body = await response.json() as any;
        validateMcp("ListToolsResult", body.result);
        assert.deepEqual(body.result.tools, servedTools);
        assert.equal(calls.at(-1)!.headers["mcp-name"], undefined, "tool name is unnecessary when listing tools");
      }
    } finally {
      await client.close();
      server.closeAllConnections();
      await new Promise<void>(resolve => server.close(() => resolve()));
    }
  });
}
