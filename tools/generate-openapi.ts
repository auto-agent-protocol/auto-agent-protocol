import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { glob } from "glob";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

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
  anonymous_allowed: boolean;
  consent_required: boolean;
  adf_compatible: boolean;
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

// Stable, illustrative ULID-style identifiers per skill so OpenAPI examples are
// deterministic across regenerations. The buyer agent generates a fresh
// `messageId` per call in production; these are only example values.
const REQUEST_MESSAGE_IDS: Record<string, string> = {
  "dealer.information": "01HZ9G5N8D1Y4M6SP9C4XKVW3Q",
  "inventory.facets": "01HZ9H6P9E2Z5N7TQ0D5YMWX4R",
  "inventory.search": "01HZ9F4M7C0X3K5RN8B3WJTW2P",
  "inventory.vehicle": "01HZ9J7Q0F3A6P8VR1E6ZNXY5S",
  "lead.general": "01HZ9K8R1G4B7Q9WS2F7APYZ6T",
  "lead.vehicle": "01HZ9M9S2H5C8R0XT3G8BQZA7V",
  "lead.appointment": "01HZ9N0T3J6D9S1YV4H9CRABCDV",
};

async function main() {
  const versions = ["v0.1"];

  for (const version of versions) {
    const specDir = resolve(ROOT, "spec", version);
    const skillsFile = resolve(specDir, "skills.yaml");
    const schemasDir = resolve(specDir, "schemas");
    const outDir = resolve(ROOT, "generated", version);
    mkdirSync(outDir, { recursive: true });

    const manifest = parseYaml(readFileSync(skillsFile, "utf-8")) as SkillsManifest;

    // Collect schemas → OpenAPI components
    const schemaFiles = await glob("**/*.schema.json", { cwd: schemasDir });
    const components: Record<string, any> = {};

    for (const sf of schemaFiles) {
      const schema = JSON.parse(readFileSync(resolve(schemasDir, sf), "utf-8"));
      const baseName = sf.split("/").pop()!;
      const name = toComponentName(baseName);
      const { $schema, $id, ...rest } = schema;
      components[name] = rest;
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
          "Auto Agent Protocol v0.1 documented over the A2A JSON-RPC 2.0 binding (A2A spec, Section 9). Every skill is invoked as an A2A `SendMessage` JSON-RPC call carrying a typed AAP DataPart. Reflects the A2A v1.0 wire format (no `kind` discriminator, ROLE_USER/ROLE_AGENT enum strings, required `messageId`, `mediaType` per part).",
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
                                  data: { type: skill.request_type },
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
                  "Successful JSON-RPC response. The result wraps an A2A Message whose DataPart carries an AAP response payload.",
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
              id: { type: ["string", "number"] },
              result: {
                type: "object",
                properties: {
                  message: { $ref: "#/components/schemas/A2aMessage" },
                },
              },
              error: { $ref: "#/components/schemas/Error" },
            },
            required: ["jsonrpc", "id"],
          },
          A2aMessage: {
            type: "object",
            description:
              "A2A v1.0 Message envelope. `messageId` is required on every Message; `role` is the protobuf enum string `ROLE_USER` (buyer agent) or `ROLE_AGENT` (dealer agent). Parts identify their kind by the member they carry — `data` for DataParts (no `kind` discriminator).",
            properties: {
              messageId: {
                type: "string",
                description: "Unique identifier for this message (e.g. ULID or UUID).",
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

    // Build the REST binding doc (A2A v1.0 HTTP+JSON binding, Section 11)
    const rest = {
      openapi: "3.1.0",
      info: {
        title: "Auto Agent Protocol — A2A HTTP+JSON binding",
        description:
          "Auto Agent Protocol v0.1 documented over the A2A HTTP+JSON binding (A2A spec, Section 11). All AAP skills are invoked via `POST /message:send`; the skill is dispatched by the typed DataPart payload. Reflects the A2A v1.0 body shape (no `kind` discriminator, ROLE_USER/ROLE_AGENT enum strings, required `messageId`, `mediaType` per part).",
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
          description: "Dealer agent A2A HTTP+JSON endpoint",
        },
      ],
      paths: {
        "/message:send": {
          post: {
            operationId: "sendMessage",
            summary: "A2A SendMessage (carries any AAP skill request)",
            description:
              "POST an A2A Message whose DataPart carries the AAP request payload. Dispatch is by `type` inside the DataPart.",
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/A2aMessageRequest" },
                  examples: Object.fromEntries(
                    manifest.skills.map((skill) => [
                      skill.id,
                      {
                        summary: skill.name,
                        value: {
                          message: {
                            messageId: exampleMessageId(skill.id),
                            role: "ROLE_USER",
                            parts: [
                              {
                                data: { type: skill.request_type },
                                mediaType: skill.media_type_request,
                              },
                            ],
                          },
                          configuration: {
                            acceptedOutputModes: [skill.media_type_response],
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
                  "Successful response. Body wraps an A2A Message whose DataPart carries an AAP response payload.",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/A2aMessageResponse" },
                  },
                },
              },
              "400": { description: "Bad request (schema validation failed)" },
              "401": { description: "Authentication required" },
              "404": { description: "Resource not found" },
              "429": { description: "Rate limited" },
              "500": { description: "Internal server error" },
            },
          },
        },
      },
      components: {
        schemas: {
          ...components,
          A2aMessage: {
            type: "object",
            description:
              "A2A v1.0 Message envelope. `messageId` is required on every Message; `role` is the protobuf enum string `ROLE_USER` (buyer agent) or `ROLE_AGENT` (dealer agent). Parts identify their kind by the member they carry — `data` for DataParts (no `kind` discriminator).",
            properties: {
              messageId: {
                type: "string",
                description: "Unique identifier for this message (e.g. ULID or UUID).",
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
          A2aMessageRequest: {
            type: "object",
            properties: {
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
          A2aMessageResponse: {
            type: "object",
            properties: {
              message: { $ref: "#/components/schemas/A2aMessage" },
            },
            required: ["message"],
          },
        },
      },
    };

    const jsonRpcOut = resolve(outDir, "openapi-jsonrpc.yaml");
    const restOut = resolve(outDir, "openapi-rest.yaml");
    writeFileSync(jsonRpcOut, stringifyYaml(jsonRpc, { lineWidth: 120 }));
    writeFileSync(restOut, stringifyYaml(rest, { lineWidth: 120 }));
    console.log(`Generated ${jsonRpcOut}`);
    console.log(`Generated ${restOut}`);
  }
}

main();
