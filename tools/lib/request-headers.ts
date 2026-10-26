import { MCP_VERSIONS } from "../generate-mcp-manifest.js";

interface HeaderResult {
  headers: Headers;
  error?: { code: number; message: string };
}

// Reference ingress behavior for a validated envelope on one contract-pinned
// AAP endpoint. Authentication, Origin, payload and tenant checks are separate.
export function a2aRequestHeaders(input: Headers, extensionUri: string): HeaderResult {
  const headers = new Headers(input);
  const version = headers.get("A2A-Version");
  if (version !== null && version !== "1.0") {
    return { headers, error: { code: -32009, message: "This endpoint supports A2A-Version: 1.0" } };
  }
  const extensions = headers.get("A2A-Extensions");
  if (extensions !== null && !extensions.split(",").some(uri => uri.trim() === extensionUri)) {
    return { headers, error: { code: -32008, message: `Select this endpoint's contract with A2A-Extensions: ${extensionUri}` } };
  }
  if (version === null) headers.set("A2A-Version", "1.0");
  if (extensions === null) headers.set("A2A-Extensions", extensionUri);
  return { headers };
}

interface McpRequest {
  method: string;
  params?: { name?: string; _meta?: Record<string, unknown> };
}

// negotiatedVersion belongs to this client's validated legacy session, never a
// process-wide last-used version. Initialization negotiates before this step.
export function mcpRequestHeaders(input: Headers, request: McpRequest, negotiatedVersion?: string): HeaderResult {
  const headers = new Headers(input);
  const declared = request.params?._meta?.["io.modelcontextprotocol/protocolVersion"];
  const supplied = headers.get("MCP-Protocol-Version");
  const version = declared ?? negotiatedVersion ?? supplied;
  if (typeof version !== "string" || !(MCP_VERSIONS as readonly string[]).includes(version)) {
    return { headers, error: { code: -32022, message: `Select a supported MCP protocol version: ${MCP_VERSIONS.join(", ")}` } };
  }
  if (supplied !== null && supplied !== version) {
    return { headers, error: { code: -32020, message: "MCP-Protocol-Version conflicts with the request or negotiated session" } };
  }
  const current = version === MCP_VERSIONS[0];
  if (current && declared !== version) {
    return { headers, error: { code: -32600, message: "Current MCP requests require protocolVersion in params._meta" } };
  }
  headers.set("MCP-Protocol-Version", version);
  const mirrored = [["Mcp-Method", request.method]];
  if (request.method === "tools/call" && typeof request.params?.name === "string") mirrored.push(["Mcp-Name", request.params.name]);
  for (const [name, expected] of mirrored) {
    const actual = headers.get(name);
    let decoded = actual;
    if (name === "Mcp-Name" && actual?.startsWith("=?base64?") && actual.endsWith("?=")) {
      const encoded = actual.slice(9, -2);
      decoded = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)
        ? Buffer.from(encoded, "base64").toString("utf8") : null;
    }
    if (actual !== null && decoded !== expected) {
      return { headers, error: { code: -32020, message: `${name} conflicts with the request body` } };
    }
    if (current && actual === null) {
      const needsEncoding = /[^\x20-\x7e]/.test(expected) || expected.trim() !== expected || (expected.startsWith("=?base64?") && expected.endsWith("?="));
      if (needsEncoding && name === "Mcp-Method") {
        return { headers, error: { code: -32020, message: "Mcp-Method cannot be represented as an HTTP header" } };
      }
      headers.set(name, needsEncoding ? `=?base64?${Buffer.from(expected).toString("base64")}?=` : expected);
    }
  }
  return { headers };
}
