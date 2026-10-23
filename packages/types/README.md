# @autoagentprotocol/types

TypeScript types for [Auto Agent Protocol](https://autoagentprotocol.org) (AAP), generated from the AAP JSON Schemas — one interface per request, response, and shared object.

## Install

```bash
npm install --save-dev @autoagentprotocol/types
```

## Usage

```ts
import type {
  InventorySearchRequest,
  InventorySearchResponse,
  Vehicle,
} from "@autoagentprotocol/types";

function handleSearch(req: InventorySearchRequest): InventorySearchResponse {
  // ...
}
```

The types are generated from the AAP 2.1.0 JSON Schema 2020-12 sources — see the [schemas](https://autoagentprotocol.org/v2.1/schemas/) and the [versioning policy](https://autoagentprotocol.org/docs/v2.1/versioning).

- Runtime validation: [`@autoagentprotocol/validator`](https://www.npmjs.com/package/@autoagentprotocol/validator)
- Raw JSON Schema modules: [`@autoagentprotocol/schemas`](https://www.npmjs.com/package/@autoagentprotocol/schemas)

## License

Apache-2.0
