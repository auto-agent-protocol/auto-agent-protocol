# @autoagentprotocol/schemas

The [Auto Agent Protocol](https://autoagentprotocol.org) (AAP) JSON Schemas (2020-12) as importable modules — the source of truth for every AAP request, response, and shared object.

## Install

```bash
npm install @autoagentprotocol/schemas
```

## Usage

```ts
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { inventorySearchRequestSchema } from "@autoagentprotocol/schemas";

const ajv = new Ajv({ strict: false });
addFormats(ajv);
const validate = ajv.compile(inventorySearchRequestSchema);

if (!validate(payload)) {
  console.error(validate.errors);
}
```

Each schema is exported by its camelCased name (`agentCardSchema`, `vehicleSchema`, `inventorySearchRequestSchema`, …) for the current AAP version. The same schemas are hosted at [autoagentprotocol.org/v1.1/schemas/](https://autoagentprotocol.org/v1.1/schemas/) and documented on the [spec site](https://autoagentprotocol.org).

- Ready-made validator (library + `aap-validate` CLI): [`@autoagentprotocol/validator`](https://www.npmjs.com/package/@autoagentprotocol/validator)
- TypeScript types: [`@autoagentprotocol/types`](https://www.npmjs.com/package/@autoagentprotocol/types)

## License

Apache-2.0
