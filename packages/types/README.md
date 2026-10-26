# @autoagentprotocol/types

TypeScript types for [Auto Agent Protocol 3.0](https://autoagentprotocol.org/docs/v3.0/intro): shared automotive payloads and discovery for MCP, A2A and PAP. Generated from the published JSON Schema 2020-12 contract.

PAP types target the pinned **0.3 draft**. `PoppyGuestTokenResponse` omits `scope`, `session_id` and `signed_in`; `PoppyTokenExchangeRequest`, `PoppyTokenExchangeResponse` and `PoppyBrowserSessionRequest` describe the new flows. Update client constructors using the [PAP migration](https://autoagentprotocol.org/docs/v3.0/versioning#pap-03-migration).

## Install

```bash
npm install --save-dev @autoagentprotocol/types@3.0.0
```

## Usage

```ts
import type { InventorySearchRequest } from "@autoagentprotocol/types";

const search: InventorySearchRequest = {
  type: "inventory.search.request",
  filters: { body: ["suv"], price_max: 35000, status: ["available"] },
  pagination: { limit: 20 },
  sort: { field: "price", order: "asc" },
  privacy: { anonymous: true },
};
```

The same payload travels inside an MCP tool call, A2A DataPart or PAP operation. `InventoryListing` describes complete search/detail listings; `Vehicle` also supports partial lead and trade-in descriptions. `AapSchemaTypes` maps schema titles to their generated types and is not a wire payload.

This package supplies compile-time types, not a protocol client or runtime validation. Schema constraints such as minimum values, formats and conditional fields still require validation at runtime.

AAP 3.0 adds required discovery and search-response fields. See the [Agent Card schema](https://autoagentprotocol.org/v3.0/schemas/agent-card.schema.json) and [migration guide](https://autoagentprotocol.org/docs/v3.0/versioning) before upgrading.

- Runtime validation: [`@autoagentprotocol/validator`](https://www.npmjs.com/package/@autoagentprotocol/validator)
- Raw JSON Schema modules: [`@autoagentprotocol/schemas`](https://www.npmjs.com/package/@autoagentprotocol/schemas)

## License

Apache-2.0
