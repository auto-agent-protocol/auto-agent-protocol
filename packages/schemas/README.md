# @autoagentprotocol/schemas

JSON Schema 2020-12 modules for [Auto Agent Protocol 4.0](https://autoagentprotocol.org/docs/v4.0/intro): shared automotive payloads and discovery for MCP, A2A and PAP.

PAP targets **PAP 1.0**. Use `poppySessionJwtSchema` and `poppyDelegationSchema` for decoded Session JWTs and delegations, `poppyProtectedResourceMetadataSchema` for issuer discovery, `poppySessionErrorSchema` for HTTP 400 recovery (including `version_unsupported`) and `poppyTasksSchema` for the optional tasks endpoint. Every request with the delegated `Poppy-Session` header also sends `Poppy-Version: 1.0`. The PAP 0.3 `poppyExcludedTasksSchema` is no longer exported. The two optional skills add `tradeInSubmitRequestSchema`, `creditApplicationSubmitRequestSchema` and their responses. See the [required PAP migration](https://autoagentprotocol.org/docs/v4.0/versioning).

## Install

```bash
npm install @autoagentprotocol/schemas@4.0.0 ajv ajv-formats
```

## Usage

```ts
import { Ajv2020 } from "ajv/dist/2020.js";
import { fullFormats } from "ajv-formats/dist/formats.js";
import { allSchemas, inventorySearchRequestSchema } from "@autoagentprotocol/schemas";

const ajv = new Ajv2020({ strict: false, formats: fullFormats });
ajv.addSchema(allSchemas);
const validate = ajv.compile(inventorySearchRequestSchema);
const payload = {
  type: "inventory_search_request",
  filters: { body: ["suv"], price_max: 35000, status: ["available"] },
  pagination: { limit: 20 },
  sort: { field: "price", order: "asc" },
  privacy: { anonymous: true },
};

if (!validate(payload)) {
  console.error(validate.errors);
}
```

Each schema has a camelCase export: `agentCardSchema`, `mcpEndpointSchema`, `vehicleSchema`, `inventorySearchRequestSchema` and more. `allSchemas` includes every shared definition needed to resolve references. The identical published schemas live under [`/v4.0/schemas/`](https://autoagentprotocol.org/v4.0/schemas/agent-card.schema.json).

These schemas validate payload shape. They do not implement an MCP server, authenticate PAP assertions, verify consent or prove inventory accuracy. Follow the [binding and behavior rules](https://autoagentprotocol.org/docs/v4.0/conformance). AAP 4.0 retains the optional currency and odometer labels; applications must also enforce currency-scoped matching, exact mileage conversion and context consistency. Read the [migration guide](https://autoagentprotocol.org/docs/v4.0/versioning#aap-30-to-31) before using Canadian values.

- Ready-made validator library: [`@autoagentprotocol/validator`](https://www.npmjs.com/package/@autoagentprotocol/validator)
- TypeScript types: [`@autoagentprotocol/types`](https://www.npmjs.com/package/@autoagentprotocol/types)

## License

Apache-2.0
