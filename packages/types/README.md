# @autoagentprotocol/types

TypeScript types for [Auto Agent Protocol 4.0](https://autoagentprotocol.org/docs/v4.0/intro): shared automotive payloads and discovery for MCP, A2A and PAP. Generated from the published JSON Schema 2020-12 contract.

PAP types target **PAP 1.0**. `PoppySessionJWT` and `PoppyDelegation` describe decoded signed objects, `PoppyTasks` describes the optional tasks endpoint response, `PoppyAccessTokenResponse` covers optional sign-in, and `PoppyBrowserSessionAuthorize` describes the separate browser-code authorization request. Send `Poppy-Version: 1.0` with every Session header. The two optional skills add `TradeInSubmitRequest`, `CreditApplicationSubmitRequest` and their responses. Update client constructors using the [required PAP migration](https://autoagentprotocol.org/docs/v4.0/versioning).

## Install

```bash
npm install --save-dev @autoagentprotocol/types@4.0.0
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

AAP 4.0 retains the optional `currency` and `mileage_unit` labels and search contexts. Omitted vehicle labels retain USD/mi. Query defaults and native values are separate; see the [migration guide](https://autoagentprotocol.org/docs/v4.0/versioning#aap-30-to-31) before using Canadian values.

- Runtime validation: [`@autoagentprotocol/validator`](https://www.npmjs.com/package/@autoagentprotocol/validator)
- Raw JSON Schema modules: [`@autoagentprotocol/schemas`](https://www.npmjs.com/package/@autoagentprotocol/schemas)

## License

Apache-2.0
