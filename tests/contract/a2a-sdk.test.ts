import assert from "node:assert/strict";
import { once } from "node:events";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { resolve } from "node:path";
import test from "node:test";
import { Message, SendMessageRequest } from "@a2a-js/sdk";
import { ClientFactory, ServiceParameters, withA2AExtensions } from "@a2a-js/sdk/client";
import { parse } from "yaml";
import { ROOT } from "../../tools/lib/releases.js";

// A protocol fixture, not a production dealer or a claim of deployed conformance.
// The upstream SDK performs real discovery and serializes/parses real HTTP bytes.
test("official A2A JS SDK discovers the card and round-trips all five typed skills", { timeout: 10000 }, async () => {
  const read = (file: string) => JSON.parse(readFileSync(resolve(ROOT, "spec/latest/examples", file), "utf8"));
  const card = read("agent-card.example.json");
  const manifest = parse(readFileSync(resolve(ROOT, "spec/latest/skills.yaml"), "utf8"));
  const calls: any[] = [];
  const server = createServer(async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    if (req.url === "/.well-known/agent-card.json") { res.end(JSON.stringify(card)); return; }
    let body = "";
    for await (const chunk of req) body += chunk;
    const request = JSON.parse(body);
    calls.push({ request, headers: req.headers });
    const type = request.params?.message?.parts?.[0]?.data?.type;
    const skill = manifest.skills.find((s: any) => s.request_type === type);
    if (!skill) { res.statusCode = 400; res.end("{}"); return; }
    const data = read(skill.response_schema.split("/").pop().replace(".schema.json", ".example.json"));
    res.end(JSON.stringify({ jsonrpc: "2.0", id: request.id, result: { message: {
      messageId: `response-${calls.length}`, contextId: "context-test", role: "ROLE_AGENT",
      parts: [{ data, mediaType: skill.media_type_response }],
    } } }));
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}`;
  card.supportedInterfaces[0].url = `${base}/a2a`;
  card.supportedInterfaces[0].tenant = "fixture-dealer";
  try {
    const client = await new ClientFactory().createFromUrl(base);
    for (const skill of manifest.skills) {
      const data = read(skill.request_schema.split("/").pop().replace(".schema.json", ".example.json"));
      const result = await client.sendMessage(SendMessageRequest.fromJSON({
        message: { messageId: `request-${skill.id}`, role: "ROLE_USER", parts: [{ data, mediaType: skill.media_type_request }] },
        configuration: { acceptedOutputModes: [skill.media_type_response] },
      }), { signal: AbortSignal.timeout(5000), serviceParameters: ServiceParameters.create(withA2AExtensions(manifest.extension_uri)) });
      assert.ok("parts" in result);
      const message = Message.toJSON(result) as any;
      assert.equal(message.contextId, "context-test");
      assert.deepEqual(message.parts[0].data, read(skill.response_schema.split("/").pop().replace(".schema.json", ".example.json")));
    }
    assert.equal(calls.length, 5);
    for (const { request, headers } of calls) {
      assert.equal(request.method, "SendMessage");
      assert.equal(request.jsonrpc, "2.0");
      assert.equal(request.params.tenant, "fixture-dealer");
      assert.equal(request.params.message.role, "ROLE_USER");
      assert.equal(request.params.message.parts[0].kind, undefined);
      assert.equal(headers["a2a-version"], "1.0");
      assert.equal(headers["a2a-extensions"], manifest.extension_uri);
    }
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
});
