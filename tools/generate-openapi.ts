import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { glob } from "glob";
import { DRAFT_VERSION, ROOT, isMain } from "./lib/releases.js";

interface Skill {
  id: string;
  name: string;
  description: string;
  request_schema: string;
  response_schema: string;
  request_type: string;
  response_type: string;
  media_type_request: string;
  media_type_response: string;
}

interface SkillsManifest {
  version: string;
  extension_uri: string;
  schema_base_url: string;
  skills: Skill[];
}

function toComponentName(schemaFile: string): string {
  return schemaFile
    .replace(".schema.json", "")
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");
}

// Rewrite a single JSON Schema `$ref` so it resolves INSIDE the OpenAPI document.
// The source schemas use two ref styles that are both invalid once inlined under
// `components/schemas`:
//   - cross-file:  "./vehicle.schema.json", "./_primitives/address.schema.json",
//                  or with a fragment "./inventory-search-request.schema.json#/$defs/filters"
//                  → "#/components/schemas/<ComponentName>[/$defs/...]"
//   - intra-file:  "#/$defs/term_facet" — once `$id` is stripped the JSON-Pointer
//                  root becomes the whole OpenAPI doc, so it must be rebased under
//                  the component this schema is inlined as.
function rewriteRef(ref: string, selfComponent: string): string {
  if (ref.startsWith("#")) {
    return `#/components/schemas/${selfComponent}${ref.slice(1)}`;
  }
  const [filePart, fragment] = ref.split("#");
  const base = filePart.split("/").pop()!;
  let out = `#/components/schemas/${toComponentName(base)}`;
  if (fragment) out += `/${fragment.replace(/^\//, "")}`;
  return out;
}

// Deep-clone a schema, rewriting every `$ref` so the inlined copy is
// self-contained within the generated OpenAPI document.
function rewriteRefs(node: any, selfComponent: string): any {
  if (Array.isArray(node)) {
    return node.map((n) => rewriteRefs(n, selfComponent));
  }
  if (node && typeof node === "object") {
    const out: Record<string, any> = {};
    for (const [key, value] of Object.entries(node)) {
      out[key] =
        key === "$ref" && typeof value === "string"
          ? rewriteRef(value, selfComponent)
          : rewriteRefs(value, selfComponent);
    }
    return out;
  }
  return node;
}

// Stable, illustrative ULID-style identifiers per skill so OpenAPI examples are
// deterministic across regenerations. The buyer agent generates a fresh
// `messageId` per call in production; these are only example values.
const REQUEST_MESSAGE_IDS: Record<string, string> = {
  "dealer.information": "01HZ9G5N8D1Y4M6SP9C4XKVW3Q",
  "inventory.facets": "01HZ9H6P9E2Z5N7TQ0D5YMWX4R",
  "inventory.search": "01HZ9F4M7C0X3K5RN8B3WJTW2P",
  "inventory.vehicle": "01HZ9J7Q0F3A6P8VR1E6ZNXY5S",
  "lead.submit": "01HZ9K8R1G4B7Q9WS2F7APYZ6T",
};

export async function generateOpenapi(specDir: string, outDir: string, version: string): Promise<void> {
  const skillsFile = resolve(specDir, "skills.yaml");
  const schemasDir = resolve(specDir, "schemas");
  mkdirSync(outDir, { recursive: true });

    const manifest = parseYaml(readFileSync(skillsFile, "utf-8")) as SkillsManifest;
    if (manifest.version !== version) throw new Error(`Manifest version ${manifest.version} does not match requested output ${version}`);

    // Collect schemas → OpenAPI components
    const schemaFiles = await glob("**/*.schema.json", { cwd: schemasDir });
    const components: Record<string, any> = {};

    for (const sf of schemaFiles) {
      const schema = JSON.parse(readFileSync(resolve(schemasDir, sf), "utf-8"));
      const baseName = sf.split("/").pop()!;
      const name = toComponentName(baseName);
      const { $schema, $id, ...rest } = schema;
      components[name] = rewriteRefs(rest, name);
    }

    function exampleMessageId(skillId: string): string {
      return REQUEST_MESSAGE_IDS[skillId] ?? "01HZ9F4M7C0X3K5RN8B3WJTW2P";
    }

    // Build the JSON-RPC binding doc (A2A v1.0)
    const jsonRpc = {
      openapi: "3.1.0",
      info: {
        title: "Auto Agent Protocol — A2A JSON-RPC binding",
        description:
          `Auto Agent Protocol ${version} documented over the A2A JSON-RPC 2.0 binding (A2A spec, Section 9). Every skill is invoked as an A2A \`SendMessage\` JSON-RPC call carrying a typed AAP DataPart. Reflects the A2A v1.0 wire format (no \`kind\` discriminator, ROLE_USER/ROLE_AGENT enum strings, required \`messageId\`, \`mediaType\` per part).`,
        version,
        license: {
          name: "Apache-2.0",
          url: "https://www.apache.org/licenses/LICENSE-2.0",
        },
        contact: {
          name: "Auto Agent Protocol",
          url: "https://autoagentprotocol.org",
        },
      },
      servers: [
        {
          url: "https://dealer.example/a2a",
          description: "Dealer agent JSON-RPC endpoint",
        },
      ],
      paths: {
        "/": {
          post: {
            operationId: "sendMessage",
            summary: "A2A SendMessage (carries any AAP skill request)",
            description:
              "All AAP skills are invoked through the A2A `SendMessage` JSON-RPC method. The skill is dispatched by the typed DataPart payload (`type: <scope>.<thing>.request`, e.g. `inventory.search.request`).",
            parameters: [
              {
                name: "A2A-Version",
                in: "header",
                required: true,
                description:
                  "A2A protocol version the client speaks, `Major.Minor` (A2A Sections 3.2.6 and 9.2). A2A Section 3.6.2 interprets an empty value as `0.3`; this does not select `1.0`. AAP additionally requires rejection of a missing version header with `VersionNotSupportedError` (-32009). An unsupported version is also rejected with -32009. When multiple checks fail, no error precedence is prescribed.",
                schema: { type: "string", const: "1.0" },
              },
              {
                name: "A2A-Extensions",
                in: "header",
                required: true,
                description:
                  "Comma-separated extension URIs the client activates. The AAP profile extension is declared `required: true` on the agent card, so a request that does not activate it is answered with `ExtensionSupportRequiredError` (JSON-RPC -32008), per A2A Section 3.3.4.",
                schema: { type: "string", pattern: `(^|,)\\s*${manifest.extension_uri.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*(,|$)` },
              },
            ],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/JsonRpcRequest" },
                  examples: Object.fromEntries(
                    manifest.skills.map((skill) => [
                      skill.id,
                      {
                        summary: skill.name,
                        value: {
                          jsonrpc: "2.0",
                          id: "req_001",
                          method: "SendMessage",
                          params: {
                            message: {
                              messageId: exampleMessageId(skill.id),
                              role: "ROLE_USER",
                              parts: [
                                {
                                  data: JSON.parse(readFileSync(resolve(specDir, "examples", skill.request_schema.replace(".schema.json", ".example.json")), "utf8")),
                                  mediaType: skill.media_type_request,
                                },
                              ],
                            },
                            configuration: {
                              acceptedOutputModes: [skill.media_type_response],
                            },
                          },
                        },
                      },
                    ])
                  ),
                },
              },
            },
            responses: {
              "200": {
                description:
                  "JSON-RPC response containing either a result or an error. A successful result wraps an A2A Message whose DataPart carries an AAP response payload.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/JsonRpcResponse" },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          ...components,
          JsonRpcRequest: {
            type: "object",
            properties: {
              jsonrpc: { const: "2.0" },
              id: { type: ["string", "number"] },
              method: { const: "SendMessage" },
              params: {
                type: "object",
                properties: {
                  tenant: { type: "string", description: "Echo the tenant routing value when the selected AgentInterface declares one." },
                  message: { $ref: "#/components/schemas/A2aMessage" },
                  configuration: {
                    type: "object",
                    properties: {
                      acceptedOutputModes: {
                        type: "array",
                        items: { type: "string" },
                      },
                    },
                  },
                },
                required: ["message"],
              },
            },
            required: ["jsonrpc", "id", "method", "params"],
          },
          JsonRpcResponse: {
            type: "object",
            properties: {
              jsonrpc: { const: "2.0" },
              id: { type: ["string", "number", "null"], description: "Echoes the request id; null when it could not be determined, such as a parse error." },
              result: {
                type: "object",
                properties: {
                  message: {
                    allOf: [
                      { $ref: "#/components/schemas/A2aMessage" },
                      {
                        properties: { role: { const: "ROLE_AGENT" }, contextId: { minLength: 1 } },
                        required: ["contextId"],
                      },
                    ],
                  },
                },
                required: ["message"],
              },
              error: { $ref: "#/components/schemas/JsonRpcError" },
            },
            required: ["jsonrpc", "id"],
            oneOf: [
              { required: ["result"], not: { required: ["error"] } },
              { required: ["error"], not: { required: ["result"] } },
            ],
          },
          JsonRpcError: {
            type: "object",
            description:
              "JSON-RPC 2.0 error object. When present, `data` is an array of details tagged with `@type` (A2A section 9.5). AAP skill errors lead with google.rpc.ErrorInfo and include the typed AAP payload. Core protocol errors need not include AAP details.",
            properties: {
              code: { type: "integer", description: "JSON-RPC error code. Numeric, not the AAP string code." },
              message: { type: "string" },
              data: {
                type: "array",
                description: "A2A ProtoJSON Any details. Locate the AAP payload in a google.protobuf.Struct detail whose value.type is aap.error.",
                items: {
                  type: "object",
                  properties: {
                    "@type": { type: "string", not: { const: "https://autoagentprotocol.org/extensions/aap/error" } },
                  },
                  required: ["@type"],
                  allOf: [
                    {
                      if: { properties: { "@type": { const: "type.googleapis.com/google.protobuf.Struct" } }, required: ["@type"] },
                      then: {
                        properties: {
                          "@type": { const: "type.googleapis.com/google.protobuf.Struct" },
                          value: { type: "object" },
                        },
                        required: ["value"],
                        additionalProperties: false,
                      },
                    },
                    {
                      if: {
                        properties: {
                          "@type": { const: "type.googleapis.com/google.protobuf.Struct" },
                          value: { type: "object", properties: { type: { const: "aap.error" } }, required: ["type"] },
                        },
                        required: ["@type", "value"],
                      },
                      then: { properties: { value: { $ref: "#/components/schemas/Error" } } },
                    },
                  ],
                  additionalProperties: true,
                },
              },
            },
            required: ["code", "message"],
          },
          A2aMessage: {
            type: "object",
            description:
              "A2A v1.0 Message envelope. `messageId` is required on every Message. `contextId` is optional on a client request but required on a server response (A2A Message definition). `role` is `ROLE_USER` (buyer) or `ROLE_AGENT` (dealer). Parts identify their kind by the member they carry — `data` for DataParts (no `kind` discriminator).",
            properties: {
              messageId: {
                type: "string",
                description: "Unique identifier for this message (e.g. ULID or UUID).",
              },
              contextId: {
                type: "string",
                description: "Context identifier. Preserve a supplied context for the same interaction; generate one when starting a context. Server response Messages must include it even when no Task is created.",
              },
              role: { enum: ["ROLE_USER", "ROLE_AGENT"] },
              parts: {
                type: "array",
                items: { $ref: "#/components/schemas/A2aDataPart" },
              },
            },
            required: ["messageId", "role", "parts"],
          },
          A2aDataPart: {
            type: "object",
            description:
              "A2A v1.0 DataPart. The presence of the `data` member identifies this as a DataPart; there is no `kind` field. `mediaType` advertises the AAP media type so generic A2A middleware can route or filter without parsing `data`.",
            properties: {
              data: { type: "object" },
              mediaType: {
                type: "string",
                description: "AAP media type (e.g. `application/vnd.autoagent.<skill>-request+json`). Version-free; the AAP version is announced once via the agent-card extension URI.",
              },
            },
            required: ["data"],
          },
        },
      },
    };

  const jsonRpcOut = resolve(outDir, "openapi-jsonrpc.yaml");
  writeFileSync(jsonRpcOut, stringifyYaml(jsonRpc, { lineWidth: 120 }));
  console.log(`Generated ${jsonRpcOut}`);

  // Historical releases predate Poppy; regenerating a draft must not invent
  // this binding for a spec that does not declare the new discovery contract.
  if (components.Poppy) {
    const protocolVersion: string = components.Poppy.allOf[1].properties.protocol_version.const;
    const assertionAudience = protocolVersion === "0.1" ? "token_endpoint" : "auth.issuer";
    const nonce = { schema: { type: "string" }, description: "Use the latest server nonce in a fresh DPoP proof on the next request to this server." };
    const paths = Object.fromEntries(manifest.skills.map(skill => {
      const example = (schema: string) => JSON.parse(readFileSync(resolve(specDir, "examples", schema.replace(".schema.json", ".example.json")), "utf8"));
      const response = (description: string, schema: string, value?: unknown) => ({
        description, headers: { "DPoP-Nonce": nonce },
        content: { "application/json": { schema: { $ref: `#/components/schemas/${schema}` }, ...(value === undefined ? {} : { example: value }) } },
      });
      const challenge = { schema: { type: "string" }, description: "PAP/RFC 9449 DPoP challenge. Read error, scope or extension attributes before interpreting a skill error body." };
      return [`/skills/${skill.id}`, { post: {
        operationId: skill.id.replaceAll(".", "_"),
        "x-aap-skill": skill.id,
        summary: skill.name,
        description: `${skill.description} Uses the unchanged AAP payload with a Poppy signed-out session; no customer account sign-in is required. lead.submit still requires explicit contact consent.`,
        security: [{ poppySession: [] }],
        parameters: [{ name: "DPoP", in: "header", required: true, description: "Fresh RFC 9449 proof bound to the access token, request method and URL; never a static API key.", schema: { type: "string", minLength: 1 } }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: `#/components/schemas/${toComponentName(skill.request_schema.split("/").pop()!)}` }, example: example(skill.request_schema) } } },
        responses: {
          "200": response("Typed AAP response; a lead acknowledgment is not a confirmed appointment or sale.", toComponentName(skill.response_schema.split("/").pop()!), example(skill.response_schema)),
          "400": response("Malformed JSON or a request that cannot be processed.", "Error"),
          "401": { description: "Missing, expired or invalid token/proof. For use_dpop_nonce, retry with the DPoP-Nonce value and a fresh proof. No skill execution.", headers: { "WWW-Authenticate": challenge, "DPoP-Nonce": nonce } },
          "403": { description: "PAP authorization or extension_required challenge, or an AAP consent error. Authentication errors need no AAP body. No skill execution.", headers: { "WWW-Authenticate": challenge, "DPoP-Nonce": nonce }, content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "404": response("Dealer, vehicle or implemented skill not found.", "Error"),
          "409": response("Vehicle/appointment unavailable or idempotency conflict.", "Error"),
          "422": response("Invalid AAP payload or request type, unsupported filter or sort, or an invalid/expired cursor. Read the typed error code, request path and recovery hint.", "Error"),
          "429": { ...response("Rate limited. Honor Retry-After before retrying.", "Error"), headers: { "Retry-After": { schema: { type: "string" } }, "DPoP-Nonce": nonce } },
          "500": response("Internal skill failure.", "Error"),
        },
      } }];
    }));
    const poppy = {
      openapi: "3.1.0",
      info: { ...jsonRpc.info, title: "Auto Agent Protocol — Poppy guest API", description: `AAP ${version} automotive payloads over Personal Agent Protocol draft ${protocolVersion} OpenAPI APIs. Operators MUST publish a deployment-specific copy with real servers and only implemented skills. Verify poppy.json and RFC 8414 issuer metadata, then obtain a guest Session Token using two signed assertions and a DPoP proof. Both assertion audiences must exactly equal ${assertionAudience}; the proof htu is the token endpoint. Client identity keys are required; customer sign-in is not. OAuth endpoints are discovered from the issuer, not inferred from this reference server.` },
      "x-aap-extension": manifest.extension_uri,
      "x-poppy-protocol-version": protocolVersion,
      externalDocs: { url: `https://personalagentprotocol.org/docs/${protocolVersion}/spec`, description: "Normative PAP discovery, client identity and session authorization" },
      servers: [{ url: "https://demo-toyota.example.com/poppy", description: "Illustrative dealer API base; replace before publication" }],
      paths,
      components: {
        securitySchemes: { poppySession: { type: "http", scheme: "DPoP", description: `PAP Session Token from the verified OAuth issuer. Authenticate with private_key_jwt and a separate JWT bearer session assertion, both with aud=${assertionAudience}, plus a token-endpoint DPoP proof. API requests require Authorization: DPoP and a fresh proof with ath bound to the token. Bearer and account tokens are not accepted by this OpenAPI interface.` } },
        schemas: components,
      },
    };
    const poppyOut = resolve(outDir, "openapi-poppy.yaml");
    writeFileSync(poppyOut, stringifyYaml(poppy, { lineWidth: 120 }));
    console.log(`Generated ${poppyOut}`);
  }
}

if (isMain(import.meta.url)) {
  generateOpenapi(resolve(ROOT, "spec/latest"), resolve(ROOT, "generated/latest"), DRAFT_VERSION)
    .catch(error => { console.error(error); process.exitCode = 1; });
}
