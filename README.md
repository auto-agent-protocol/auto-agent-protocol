[![Auto Agent Protocol 4.0 — automotive skills through MCP, A2A and PAP](static/img/brand/aap-social-card.png)](https://autoagentprotocol.org)

# Auto Agent Protocol 4.0

[![Specification](https://img.shields.io/badge/AAP-4.0.0-2874d7)](https://autoagentprotocol.org/docs/v4.0/intro)
[![Validate](https://github.com/auto-agent-protocol/auto-agent-protocol/actions/workflows/validate.yml/badge.svg)](https://github.com/auto-agent-protocol/auto-agent-protocol/actions/workflows/validate.yml)
[![License](https://img.shields.io/badge/license-Apache--2.0-52627a)](LICENSE)

**One open automotive contract for MCP, A2A and Personal Agent Protocol.** Discover dealerships, search real inventory, verify vehicle facts and prices with rebates, and send customer-approved inquiries. Dealers can also offer trade-in valuation and credit applications.

[Website](https://autoagentprotocol.org) · [Specification](https://autoagentprotocol.org/docs/v4.0/intro) · [FAQ](https://autoagentprotocol.org/faq) · [Migration](docs/versioning.md) · [Full spec for agents](https://autoagentprotocol.org/llms-full.txt)

![MCP, A2A and PAP connect buyer agents to one automotive contract and dealership backends](docs/img/network-overview.svg)

## Native in all three interfaces

| Interface | Native operation | Automotive contract |
|---|---|---|
| **[MCP](docs/bindings/mcp.md)** | Streamable HTTP tools; current `2026-07-28` and `2025-11-25` compatibility | Typed arguments, complete schemas and structured results |
| **[A2A 1.0](docs/bindings/json-rpc.md)** | `SendMessage` with the required AAP extension | The same payload in `DataPart.data` |
| **[PAP 1.0](docs/personal-agent-protocol.md)** | Delegated `Poppy-Session` JWT plus `Poppy-Version: 1.0` on every request; native OpenAPI | The same request and response bodies |

A full AAP 4.0 dealer deployment serves its implemented skill subset through all three. A buyer client needs only its chosen binding. AAP does not require a dealer-side language model or a new CRM.

A working MCP endpoint is required. The generated [`mcp.json` catalog](https://autoagentprotocol.org/v4.0/mcp.json) describes tools; it is not a server. See [conformance and runtime acceptance](docs/conformance.md).

## Discovery starts at the dealership

![The dealer domain publishes an Agent Card, Poppy document and llms.txt linking its working MCP, A2A and PAP endpoints](docs/img/discovery-flow.svg)

| Dealer-domain resource | What it tells an agent |
|---|---|
| `/.well-known/agent-card.json` | A2A endpoint, selected AAP contract, skills, search capabilities and MCP/PAP links |
| `/.well-known/poppy.json` | PAP 1.0 identity, optional issuer, native API and the AAP extension entry linking the other discovery documents |
| `/llms.txt` | Exact service URLs, access requirements, documentation and inventory links |

The service may run on a provider’s infrastructure. Every entry point identifies the same dealership and actual capabilities. Discovery helps compatible agents find a service; it does not guarantee that every assistant will choose it.

Start from the [Agent Card](spec/v4.0/examples/agent-card.example.json), [Poppy document](spec/v4.0/examples/poppy.example.json) and [dealer llms.txt](spec/v4.0/examples/llms.txt.example.md). These release-pinned templates use fictional dealers: replace their identity, URLs and capabilities before deployment. [Discovery requirements →](docs/discovery.md)

## Five core skills, two optional, one automotive journey

![A buyer agent discovers a dealer, searches inventory, verifies one vehicle and submits a consented inquiry](docs/img/buyer-journey.svg)

**Core:** [Dealer information](docs/skills/dealer-information.md) · [Facets](docs/skills/inventory-facets.md) · [Search](docs/skills/inventory-search.md) · [Vehicle detail](docs/skills/inventory-vehicle.md) · [Lead submission](docs/skills/lead-submit.md)

**Optional:** [Trade-in valuation](docs/skills/trade-in-submit.md) (`trade_in.submit`) · [Credit application](docs/skills/credit-application-submit.md) (`credit_application.submit`)

![Five core skills and two optional skills, each declared with its capabilities on every binding](docs/img/optional-skills.svg)

Browse without shopper contact details. Submit a lead only with explicit consent, permitted channels and an idempotency key. A received inquiry and a confirmed appointment are separate outcomes. A dealer declares an optional skill only when it implements it, with the same `capabilities` on every binding.

## What is new in 4.0

- **PAP 1.0:** every request with the delegated `Poppy-Session` JWT also sends `Poppy-Version: 1.0`; a missing or incompatible version returns HTTP 400 `version_unsupported`. Extensions are per-version lists, one optional `tasks.endpoint` replaces the separate task links, Companies accept ES256 and PS384, and Sessions are looked up by client, SID and User ID.
- **Rebates:** new vehicles can list `rebates[]`. Unconditional rebates are already in `price`; conditional rebates stay separate as possible savings.
- **Optional `trade_in.submit`:** an anonymous estimate or a consented submission, valued as an amount or range, as an estimate or an offer.
- **Optional `credit_application.submit`:** one application with credit consent from each applicant, a soft or hard inquiry, and sensitive data that is never echoed.
- **Preserved automotive behavior:** the five core skills, currency, odometer units, pricing, equipment evidence, lead consent, MCP, A2A 1.0 and bridge version `1` retain their meanings.

![Unconditional rebates are already inside the advertised price; conditional rebates stay separate](docs/img/rebates-price.svg)

![A credit application: read capabilities, collect data, record each applicant's consent, submit once, read status and decision](docs/img/credit-application-flow.svg)

This is a **major release with required PAP client migration**. Frozen AAP 3.2 keeps published PAP 0.3; its endpoints and artifacts remain unchanged, and a dealer can link that document from `supported_versions` during migration. [Migration guide →](docs/versioning.md)

## Automotive detail, shared across vehicle types

![Cars, motorcycles and electric powertrains share listing identity, availability, price and equipment evidence](docs/img/multi-class-inventory.svg)

![Equipment is present, absent or unknown; positive and negative claims need source evidence](docs/img/feature-evidence.svg)

Known prices include mandatory dealer charges and unconditional rebates; only government-required consumer charges are excluded. Optional fee itemization explains the existing total, and conditional rebates are never subtracted from it. Unknown equipment and prices stay unknown.

[Vehicle shape](docs/skills/inventory-vehicle.md) · [Pricing](docs/pricing-and-ftc.md) · [Consent and behavior](docs/behavior-rules.md) · [CRM / ADF mapping](docs/compatibility/adf-mapping.md)

Trade-in valuation and credit application submission are optional skills. Payments, checkout, reservations and binding purchase quotes are outside AAP’s scope.

## Use the packages

![Reviewed JSON Schemas produce matching schemas, TypeScript types and runtime validators](docs/img/aap-sdk-toolbox.svg)

```bash
npm install @autoagentprotocol/schemas@4.0.0 @autoagentprotocol/types@4.0.0 @autoagentprotocol/validator@4.0.0
```

| Artifact | Reference |
|---|---|
| JSON Schema 2020-12 | [`spec/v4.0/schemas/`](spec/v4.0/schemas/) |
| Typed and wire examples | [`spec/v4.0/examples/`](spec/v4.0/examples/) |
| MCP tool catalog | [`/v4.0/mcp.json`](https://autoagentprotocol.org/v4.0/mcp.json) |
| A2A JSON-RPC OpenAPI | [`/v4.0/openapi-jsonrpc.yaml`](https://autoagentprotocol.org/v4.0/openapi-jsonrpc.yaml) |
| PAP OpenAPI | [`/v4.0/openapi-poppy.yaml`](https://autoagentprotocol.org/v4.0/openapi-poppy.yaml) |
| Immutable release registry | [`releases.json`](releases.json) |

## Build and verify

Use Node.js 22+ and the pnpm 10 version pinned in `package.json`. Corepack and recent pnpm launchers select that version automatically; both CI workflows use the same pin. Run heavy checks one at a time.

```bash
pnpm install --frozen-lockfile
pnpm validate
pnpm test:contract
pnpm typecheck
pnpm build
```

Official MCP and A2A clients exercise real HTTP contract fixtures. PAP checks cover discovery, identity, session schemas and generated OpenAPI. These validate the specification; each production deployment must also verify live authentication, inventory, consent and CRM behavior.

See [all verification commands](docs/conformance.md#run-the-repository-checks), [release preparation](RELEASING.md) and [visual generation](tools/branding/README.md).

<details>
<summary>Repository map</summary>

| Path | Purpose |
|---|---|
| `spec/latest/`, `docs/` | Editable contract and documentation |
| `docs/img/` | Reproducible SVG diagrams; `pnpm generate:images` |
| `spec/v*/`, `versioned_docs/` | Immutable release snapshots |
| `releases/v*/` | Generated artifacts, provenance and integrity |
| `packages/` | Schemas, types and validator packages |
| `src/` | Website and interactive explanations |
| `tools/` | Generators, validation and release checks |

`/latest` machine artifacts follow the stable registry. `/docs/latest` is editable documentation and may describe a future release. Pin the advertised version for an integration.

</details>

## Contribute

[Contribution guide](docs/contributing.md) · [Security reports](SECURITY.md) · [Code of conduct](CODE_OF_CONDUCT.md) · [Brand assets](tools/branding/README.md)

Specification, schemas and code: [Apache-2.0](LICENSE). Documentation prose: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
