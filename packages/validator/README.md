# @autoagentprotocol/validator

Node.js payload validation for [Auto Agent Protocol 3.0](https://autoagentprotocol.org/docs/v3.0/intro). Uses Ajv and the matching bundled AAP JSON Schemas for MCP, A2A and PAP automotive payloads.

## Install

```bash
npm install @autoagentprotocol/validator@3.0.0
```

## Validate a payload

```ts
import { AAPValidator } from "@autoagentprotocol/validator";

const validator = new AAPValidator();
validator.loadDefaults();

const result = validator.validate("inventory-search-request", {
  type: "inventory.search.request",
  filters: { body: ["suv"], price_max: 35000, status: ["available"] },
  pagination: { limit: 20 },
  sort: { field: "price", order: "asc" },
  privacy: { anonymous: true },
});

if (!result.valid) console.error(result.errors);
```

Use the schema filename without `.schema.json` as the validation name. `getSchemaNames()` lists loaded names. `loadSchemas(directory)` instead loads a local schema directory; use a separate validator instance for a different AAP version. Unknown names throw an error. Invalid payloads return `{ valid: false, errors }`.

Validation checks payload shape. The application remains responsible for discovery consistency, supported filters, authorization, consent, source evidence, idempotency and upstream protocol envelopes. See [conformance](https://autoagentprotocol.org/docs/v3.0/conformance) and the [3.0 migration guide](https://autoagentprotocol.org/docs/v3.0/versioning).

- [Raw JSON Schemas](https://www.npmjs.com/package/@autoagentprotocol/schemas)
- [TypeScript types](https://www.npmjs.com/package/@autoagentprotocol/types)

## License

Apache-2.0
