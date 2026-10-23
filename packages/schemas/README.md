# @autoagentprotocol/schemas

The [Auto Agent Protocol](https://autoagentprotocol.org) (AAP) JSON Schemas (2020-12) as importable modules — the source of truth for every AAP request, response, and shared object.

## Install

```bash
npm install @autoagentprotocol/schemas
```

## Usage

```ts
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { allSchemas, inventorySearchRequestSchema } from "@autoagentprotocol/schemas";

const ajv = new Ajv2020({ strict: false });
addFormats(ajv);
ajv.addSchema(allSchemas);
const validate = ajv.compile(inventorySearchRequestSchema);

if (!validate(payload)) {
  console.error(validate.errors);
}
```

Each schema is exported by its camelCased name (`agentCardSchema`, `vehicleSchema`, `inventorySearchRequestSchema`, …) for AAP 2.1.0. The same schemas are hosted under `https://autoagentprotocol.org/v2.1/schemas/`, including the [Agent Card schema](https://autoagentprotocol.org/v2.1/schemas/agent-card.schema.json), and documented on the [spec site](https://autoagentprotocol.org). `allSchemas` includes the shared definitions needed to resolve references.

- Ready-made validator library: [`@autoagentprotocol/validator`](https://www.npmjs.com/package/@autoagentprotocol/validator)
- TypeScript types: [`@autoagentprotocol/types`](https://www.npmjs.com/package/@autoagentprotocol/types)

## License

Apache-2.0
