# @autoagentprotocol/schemas

JSON Schema 2020-12 modules for [Auto Agent Protocol 3.2](https://autoagentprotocol.org/docs/v3.2/intro): shared automotive payloads and discovery for MCP, A2A and PAP.

PAP targets **published 0.3**. Use `poppySessionJwtSchema` and `poppyDelegationSchema` for decoded Session JWTs and delegations, `poppyProtectedResourceMetadataSchema` for issuer discovery, and `poppySessionErrorSchema` for HTTP 400 recovery. Signed-out calls use a delegated `Poppy-Session` header without a guest OAuth grant. The former guest-token and token-exchange schemas are no longer exported. See the [required PAP migration](https://autoagentprotocol.org/docs/v3.2/versioning#pap-03-migration).

## Install

```bash
npm install @autoagentprotocol/schemas@3.2.0 ajv ajv-formats
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

Each schema has a camelCase export: `agentCardSchema`, `mcpEndpointSchema`, `vehicleSchema`, `inventorySearchRequestSchema` and more. `allSchemas` includes every shared definition needed to resolve references. The identical published schemas live under [`/v3.2/schemas/`](https://autoagentprotocol.org/v3.2/schemas/agent-card.schema.json).

These schemas validate payload shape. They do not implement an MCP server, authenticate PAP assertions, verify consent or prove inventory accuracy. Follow the [binding and behavior rules](https://autoagentprotocol.org/docs/v3.2/conformance). AAP 3.2 retains the optional currency and odometer labels; applications must also enforce currency-scoped matching, exact mileage conversion and context consistency. Read the [migration guide](https://autoagentprotocol.org/docs/v3.2/versioning#aap-30-to-31) before using Canadian values.

- Ready-made validator library: [`@autoagentprotocol/validator`](https://www.npmjs.com/package/@autoagentprotocol/validator)
- TypeScript types: [`@autoagentprotocol/types`](https://www.npmjs.com/package/@autoagentprotocol/types)

## License

Apache-2.0
