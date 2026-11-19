# Demo Toyota

> Automotive inventory and consented dealer contact through Auto Agent Protocol 4.0.0. Fictional deployment example; replace every URL before publication.

## Agent interfaces

- [MCP endpoint](https://api.provider.example/aap/4.0.0/demo-toyota/mcp): Streamable HTTP; MCP 2026-07-28 and 2025-11-25. Public inventory reads. Run tools/list to discover implemented tools and their capabilities.
- [A2A Agent Card](https://demo-toyota.example.com/.well-known/agent-card.json): A2A 1.0 JSON-RPC, exact AAP extension, supported skills and their capabilities.
- [PAP discovery](https://demo-toyota.example.com/.well-known/poppy.json): Personal Agent Protocol 1.0 signed-out API. Native OpenAPI calls require a fresh delegated Poppy-Session JWT and Poppy-Version: 1.0; no OAuth token is needed for signed-out calls.
- [Dealer OpenAPI](https://demo-toyota.example.com/poppy/openapi.yaml): Deployment-specific automotive operations and authentication.
- [AAP contract](https://autoagentprotocol.org/v4.0/schemas/agent-card.schema.json): Selected immutable automotive contract after release preparation.

## Shopping

Search defaults are USD prices and miles for odometer comparisons, as advertised in the Agent Card and MCP search capabilities. Listings retain their explicit native currency and odometer labels; omitted labels mean USD/mi. Geographic radius, distance and electric range fields ending in `_mi` always remain miles.

- [Inventory](https://demo-toyota.example.com/inventory): Browse current vehicles. Check availability and complete pricing before recommending a listing.
- [Contact](https://demo-toyota.example.com/contact): Dealer contact options. Submitting a lead requires explicit permission for the selected contact channels and an idempotency key.
- [Trade-in valuation](https://demo-toyota.example.com/value-your-trade): Optional AAP skill trade_in_submit. A trade-in submission carries the owner's contact data and consent scoped to trade_in_submission, like a lead.
- [Credit application](https://demo-toyota.example.com/financing): Optional AAP skill credit_application_submit. Each applicant must grant their own credit consent naming a soft or hard inquiry; read the published capabilities before collecting any data.
