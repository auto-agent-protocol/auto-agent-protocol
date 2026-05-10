# Auto Agent Protocol (AAP)

![Auto Agent Protocol — the A2A v1.0 Automotive Retail Profile](static/img/aap-hero-banner.png)

**The A2A v1.0 Automotive Retail Profile.**

AAP is the open A2A profile that lets AI agents discover dealerships, browse inventory, and submit consented leads through typed automotive messages riding on top of [A2A v1.0](https://a2a-protocol.org). A compliant dealer agent is an A2A agent that publishes an `agent-card.json` with the AAP automotive extension URI (`https://autoagentprotocol.org/extensions/a2a-automotive-retail/v0.1`) and implements **one or more** of the five standard AAP automotive skills (a tiny used-car lot might only do `inventory.search` + `lead.submit`; a franchise dealership might do all five). Buyer agents can use either A2A binding — JSON-RPC 2.0 or HTTP+JSON — to invoke the same skills with identical payloads.

![agent-card.json — the contract every AAP dealership exposes, advertising A2A v1.0 compliance, the AAP automotive extension, the subset of AAP skills the agent implements, and supported bindings](static/img/agent-card-passport.png)

## v0.1 Scope

- **Discovery** via `/.well-known/agent-card.json` (A2A-compatible)
- **Inventory**: facets, search, vehicle detail
- **Dealership information**: name, address, contacts, schedule, capabilities
- **Leads**: a single unified `lead.submit` accepting a consented customer plus any combination of vehicle of interest, trade-in, and appointment
- **ADF/XML mapping** documented for legacy CRM compatibility

v0.1 does **not** cover: authentication beyond bearer, payments, financing, RFQ/quote flows, trade-in valuations, reservations, or international addresses (US-only).

![How an AI agent buys a car — discover via /.well-known/agent-card.json, browse with inventory.search, inspect with inventory.vehicle, and submit a unified lead.submit carrying customer + vehicle of interest + trade-in + appointment](static/img/buyer-journey.png)

## Quick links

- **Specification**: [autoagentprotocol.org](https://autoagentprotocol.org)
- **JSON Schemas**: [`spec/v0.1/schemas/`](spec/v0.1/schemas/)
- **Examples**: [`spec/v0.1/examples/`](spec/v0.1/examples/)
- **OpenAPI 3.1** (built at deploy time): `https://autoagentprotocol.org/v0.1/openapi-jsonrpc.yaml`, `https://autoagentprotocol.org/v0.1/openapi-rest.yaml`

## The five skills

| Skill | Purpose |
|---|---|
| `dealer.information` | Dealership profile, address, hours, capabilities |
| `inventory.facets` | Aggregated counts and ranges over the dealer's inventory |
| `inventory.search` | Filtered, paginated inventory queries |
| `inventory.vehicle` | Detail view of one specific vehicle (by VIN, stock, or vehicle_id) |
| `lead.submit` | Unified consented lead — customer + optional(vehicle of interest, trade-in, appointment) |

## Packages

![AAP SDK — three open-source TypeScript packages: @autoagentprotocol/types, @autoagentprotocol/schemas, and @autoagentprotocol/validator](static/img/aap-sdk-toolbox.png)

| Package | Description |
|---------|-------------|
| `@autoagentprotocol/types` | TypeScript types generated from JSON Schema |
| `@autoagentprotocol/schemas` | Raw JSON Schema files as importable modules |
| `@autoagentprotocol/validator` | Ajv-based validators for all AAP objects |

## Development

### Prerequisites

- Node.js 22+
- pnpm 10+

### Setup

```bash
pnpm install
```

### Commands

```bash
pnpm run validate          # Validate schemas and examples
pnpm run generate          # Generate types, OpenAPI, doc tables
pnpm run build             # Build the documentation site
pnpm start                 # Start local dev server
```

### Repository structure

```
spec/v0.1/schemas/         JSON Schema 2020-12 source of truth (committed)
spec/v0.1/examples/        Example payloads (committed)
spec/v0.1/skills.yaml      Skills manifest (committed)
docs/                      Hand-written documentation pages (committed)
docs/skills/, bindings/    A2A binding + skill reference (committed)
packages/                  npm packages: types, schemas, validator (committed)
tools/                     Generators and validators (committed)
src/components/            FieldCard React component (committed)

generated/v0.1/            Auto-generated: TS types, OpenAPI bundles, MCP manifest, contract manifest sample (NOT committed)
docs/schemas/_partials/    Auto-generated FieldCard MDX (NOT committed)
static/v0.1/, static/latest/  Spec assets mirrored for the docs site (NOT committed)
build/                     Docusaurus production output (NOT committed)
```

The auto-generated paths above are produced by `pnpm run generate && pnpm run copy-static` (which runs as part of `pnpm run build`). They live in [.gitignore](.gitignore) and are recreated fresh on every CI build, matching A2A's own convention of generating artifacts at build time rather than committing them.

## Versioning

Released versions are immutable. The `latest` URL always points to the highest released version. Each version has its own schema URLs at `https://autoagentprotocol.org/v{version}/schemas/`.

## How AAP relates to other protocols

| Layer | Protocol | Role for AAP |
|---|---|---|
| Transport / data model (BASE) | **[A2A v1.0](https://a2a-protocol.org)** | The base protocol AAP profiles. Every AAP message travels inside `Message.parts[].data` as a typed `DataPart`. AAP does not invent a wire format. |
| Adjacent / complementary | **ACP** (Agentic Commerce), **MCP** (Model Context Protocol) | ACP covers commerce checkout (out of scope for AAP). MCP can expose AAP skills as LLM tools — AAP ships an official MCP manifest in [`@autoagentprotocol/schemas`](packages/schemas). |
| Legacy / target system | **ADF/XML** | The 25-year-old dealer-CRM lead format. `lead.submit` is field-by-field mappable to ADF/XML so existing CRMs ingest AAP leads without code changes. |

## License

- Specification and schemas: [Apache-2.0](LICENSE)
- Documentation prose: [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/)

## Contributing

See [Contributing guide](https://autoagentprotocol.org/docs/v0.1/contributing) for details on proposing changes.
