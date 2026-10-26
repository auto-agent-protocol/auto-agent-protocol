# @autoagentprotocol/schemas

JSON Schema 2020-12 modules for [Auto Agent Protocol 3.0](https://autoagentprotocol.org/docs/v3.0/intro): shared automotive payloads and discovery for MCP, A2A and PAP.

PAP targets the pinned **0.3 draft**. Discovery, issuer metadata, guest tokens, MCP token exchange, browser joins and unavailable-task alternatives have named schemas. Use `poppyGuestTokenResponseSchema` for a JWT-bearer guest response; the general token schema requires the caller to interpret its grant and requested scopes. See the [PAP migration](https://autoagentprotocol.org/docs/v3.0/versioning#pap-03-migration).

## Install

```bash
npm install @autoagentprotocol/schemas@3.0.0 ajv ajv-formats
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
  type: "inventory.search.request",
  filters: { body: ["suv"], price_max: 35000, status: ["available"] },
  pagination: { limit: 20 },
  sort: { field: "price", order: "asc" },
  privacy: { anonymous: true },
};

if (!validate(payload)) {
  console.error(validate.errors);
}
```

Each schema has a camelCase export: `agentCardSchema`, `mcpEndpointSchema`, `vehicleSchema`, `inventorySearchRequestSchema` and more. `allSchemas` includes every shared definition needed to resolve references. The identical published schemas live under [`/v3.0/schemas/`](https://autoagentprotocol.org/v3.0/schemas/agent-card.schema.json).

These schemas validate payload shape. They do not implement an MCP server, authenticate PAP assertions, verify consent or prove inventory accuracy. Follow the [binding and behavior rules](https://autoagentprotocol.org/docs/v3.0/conformance). AAP 3.0 adds required discovery and search-response fields; read the [migration guide](https://autoagentprotocol.org/docs/v3.0/versioning) before upgrading.

- Ready-made validator library: [`@autoagentprotocol/validator`](https://www.npmjs.com/package/@autoagentprotocol/validator)
- TypeScript types: [`@autoagentprotocol/types`](https://www.npmjs.com/package/@autoagentprotocol/types)

## License

Apache-2.0
