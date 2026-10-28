# Demo Toyota

> Automotive inventory and consented dealer contact through Auto Agent Protocol 0.0.0-dev. Fictional deployment example; replace every URL before publication.

## Agent interfaces

- [MCP endpoint](https://api.provider.example/aap/0.0.0-dev/demo-toyota/mcp): Streamable HTTP; MCP 2026-07-28 and 2025-11-25. Public inventory reads. Run tools/list to discover implemented tools and search capabilities.
- [A2A Agent Card](https://demo-toyota.example.com/.well-known/agent-card.json): A2A 1.0 JSON-RPC, exact AAP extension, supported skills and search capabilities.
- [PAP discovery](https://demo-toyota.example.com/.well-known/poppy.json): Personal Agent Protocol draft 0.3, issuer and guest API. Native OpenAPI calls require a PAP Session Token and DPoP.
- [Dealer OpenAPI](https://demo-toyota.example.com/poppy/openapi.yaml): Deployment-specific automotive operations and authentication.
- [AAP contract](https://draft.autoagentprotocol.invalid/latest/schemas/agent-card.schema.json): Selected immutable automotive contract after release preparation.

## Shopping

Search defaults are USD prices and miles for odometer comparisons, as advertised in the Agent Card and MCP search capabilities. Listings retain their explicit native currency and odometer labels; omitted labels mean USD/mi. Geographic radius, distance and electric range fields ending in `_mi` always remain miles.

- [Inventory](https://demo-toyota.example.com/inventory): Browse current vehicles. Check availability and complete pricing before recommending a listing.
- [Contact](https://demo-toyota.example.com/contact): Dealer contact options. Submitting a lead requires explicit permission for the selected contact channels and an idempotency key.
