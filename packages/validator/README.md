# @autoagentprotocol/validator

Node.js payload validation for [Auto Agent Protocol 3.2](https://autoagentprotocol.org/docs/v3.2/intro). Uses Ajv and the matching bundled AAP JSON Schemas for MCP, A2A and PAP automotive payloads.

The bundled PAP schemas target **published 0.3**. Validate decoded signed objects with `poppy-session-jwt` and `poppy-delegation`, and Session recovery bodies with `poppy-session-error`. These checks validate structure; they do not verify JWT signatures, freshness, identity or consent. Guest-token and token-exchange schemas from the earlier profile are no longer exported. See the [required PAP migration](https://autoagentprotocol.org/docs/v3.2/versioning#pap-03-migration).

## Install

```bash
npm install @autoagentprotocol/validator@3.2.0
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

Validation checks payload shape. The application remains responsible for discovery consistency, supported filters, currency-scoped matching, exact mileage conversion, matching result contexts, authorization, consent, source evidence, idempotency and upstream protocol envelopes. See [conformance](https://autoagentprotocol.org/docs/v3.2/conformance) and the [3.1 migration guide](https://autoagentprotocol.org/docs/v3.2/versioning#aap-30-to-31).

- [Raw JSON Schemas](https://www.npmjs.com/package/@autoagentprotocol/schemas)
- [TypeScript types](https://www.npmjs.com/package/@autoagentprotocol/types)

## License

Apache-2.0
