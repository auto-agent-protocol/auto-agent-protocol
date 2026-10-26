# Changelog

All notable changes to the Auto Agent Protocol specification are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); the
versioning policy is described in the
[versioning docs](https://autoagentprotocol.org/docs/latest/versioning).

## [Unreleased]

## [3.0.0] — release candidate

AAP becomes a shared automotive contract with native MCP, A2A and PAP interfaces. This major release requires an explicit deployment migration; previous releases remain immutable.

- Upgrade PAP to draft **0.3**, pinned to upstream `86f0c8d8db3c95cf06d7e05370ec4bddf7d25bc7`. Replace custom Session IDs with per-Session DPoP keys, old domain metadata with protected resources, and built-in scopes with company scopes. Add explicit MCP token exchange, browser-code joins, alternatives and excluded tasks; migrate sign-in, callbacks, token responses and conversation authors.
- Require a working MCP Streamable HTTP endpoint, with current `2026-07-28` and legacy `2025-11-25` interoperability, complete bundled tool schemas, standard annotations and typed success/error results.
- Cross-link dealer-domain Agent Cards, PAP discovery and `llms.txt`; declare the actual skill subset and search capabilities consistently across all three interfaces.
- Add feature filters with source-backed equipment evidence, rooftop-radius search and distance sorting, explicit applied filters, exact-or-unknown totals and complete cursor continuation.
- Reduce the search `pagination.limit` schema maximum from 1000 to 100. Clients requesting larger pages must use at most the deployment's advertised `max_limit` (never above 100) and follow `next_cursor`.
- Change `aap.error.details` from unrestricted JSON to an object when present. Every `details.errors[]` item now requires `instanceLocation`, `keyword` and `error`; migrate custom validation diagnostics to this shape. Additional detail fields remain allowed.
- Standardize coordinates as `filters.near.latitude` and `filters.near.longitude`. Deployed `lat`/`lng` extensions and the validation errors teaching those names require a breaking client/server migration; the short keys are not 3.0 aliases.
- Require listing identity, availability and source update timestamps. Reject unsupported filters and sorts rather than silently broadening a request.
- Require lead idempotency keys and contact details for every permitted channel. Make appointment confirmation times and alternative times explicit, with consistent partial-success behavior.
- Resolve aggregate seller IDs through `dealer.information` before consent; return `DEALER_NOT_FOUND` for an inaccessible or unknown seller.
- Document separate `parts` department schedules alongside `sales` and `service`, with a complete sample. Department names remain free text and schedules remain optional.
- Replace the ambiguous `duplicate` lead status with `replayed: true` alongside the complete original outcome, including booking details.
- Require the effective search page size and millisecond retry hints; document stricter arrays/queries and preserve the public `DayHours` export. General first-page examples omit optional offsets.
- Nest MCP input constraints below the root without changing validation, document affected-host limitations, and validate every canonical schema URL in the native catalog metadata.
- Clarify fee-inclusive price semantics and ADF receiver mappings with separate retained consent and idempotency records.
- Verify official current and legacy MCP clients, official A2A wire exchanges, pinned upstream MCP schemas, PAP discovery and authentication contracts, and copyable documentation examples.
- Generate complete TypeScript declarations in one shared naming scope; preserve nested result fields and required inventory listing identifiers, availability and timestamps.
- Rebuild the website, README and all 34 current explanatory diagrams, including five discovery/search visuals and two PAP 0.3 token/browser flows. Add readable Markdown representations and keep frozen artwork unchanged.

See the [migration matrix](docs/versioning.md#for-implementers) and [deployment acceptance cases](docs/conformance.md#required-deployment-acceptance-cases). Contract fixtures do not certify a live dealership implementation.

## [2.1.0] — 2026-10-23

This release upgrades the PAP profile to draft 0.2, pinned to upstream commit `39b35bdf240fc07f157d6ca4e29b5a41d4b36b5d`. It changes discovery and authentication semantics; deployments must migrate before advertising the new contract. A2A v1.0 behavior, automotive payloads and bridge version `1` are unchanged. The 2.1.0 label is an explicit exception to the major-release policy for this PAP transition; it does not imply PAP 0.1 compatibility. The compatibility report retains every detected breaking change.

- Bind discovery to the final HTTPS host with case-only domain comparison, isolate independent Companies by issuer, and reject unsupported pre-1.0 PAP versions.
- Require exact issuer audiences for both client and session assertions, a maximum five-minute lifetime, mandatory ES256 support and separate DPoP keys per User ID.
- Add client metadata, decoded assertion, guest token-request and feedback schemas with consistent examples and cross-document validation.
- Describe DPoP-aware MCP token selection, optional feedback, nonce handling, extension errors and safe integration diagnostics.
- Generate version-aware OpenAPI with complete skill examples and nonce/challenge headers; retain identical automotive schemas across bindings.
- Add the PAP client walkthrough and the AAP 2.0 → 2.1 migration matrix. Contract validation does not certify live dealer or personal-agent interoperability.

## [2.0.0] — 2026-10-14

This major release adds Personal Agent Protocol (Poppy draft 0.1) support and the A2A conformance corrections below. It requires a runtime migration; publishing discovery alone is insufficient. Earlier releases remain immutable.

### Personal Agent Protocol

- Require paired `agent-card.json` and `poppy.json` discovery, with the existing version-1 `autoagentprotocol.org/aap` bridge.
- Define a native OpenAPI guest API for the same automotive skill subset, with verified OAuth discovery, signed assertions, Poppy Sessions and DPoP.
- Specify identity, hosted domains, consent, idempotency, error mapping and all obligations for optional sign-in, browser, MCP and conversation surfaces.
- Add forward-compatible discovery schemas, an AAP profile schema, OAuth/token schemas, examples, generated OpenAPI, types and validator exports.
- Add negative discovery/identity tests, binding parity checks and official A2A JavaScript SDK wire tests; document runtime verification boundaries.
- Regenerate affected blue/teal SVG diagrams and add paired-discovery and guest-session diagrams.
- Handle trailing-slash OAuth issuers and compatible future Poppy minor versions in reader validation, while retaining the pinned publication target.
- Generate valid A2A OpenAPI examples from skill fixtures and verify errors through the pinned SDK.
- Correct the validator package to use Ajv's JSON Schema 2020-12 engine, matching the published schemas.

### Breaking migration scope

The [old/new/action checklist](./docs/versioning.md#breaking-migration-checklist)
covers every affected path: server `Message.contextId`, the `error.data` array,
standard Protobuf Any detail wrappers, both changed numeric error mappings, the
`security` → `securityRequirements` rename and wrapper shape, schema-mandatory
`required: true`, exactly one AAP profile per card, request headers and activation
enforcement, non-empty card arrays, advertised AAP media types, HTTPS
interface URLs, and constraints on optional signatures and tenant values.
These are breaking contract changes even when they correct A2A conformance.
The frozen v1.3 release is unchanged; a direct upgrade from an older
release also includes all intervening release obligations.

Publish the approved versioned specification and artifacts before advertising
the new runtime contract. Operators must explicitly choose coordinated cutover
or coexistence; neither a mandatory transition window nor an automatic client
fallback is implied. Coexistence uses separate cards/interface URLs, with
non-default cards discovered through direct configuration, a registry, or
separate origins, not multiple AAP versions on one card.

### Added

- Documented the A2A service-parameter headers every request on the A2A interface carries:
  `A2A-Version: 1.0`, required by A2A on every request, and `A2A-Extensions`
  naming the AAP extension URI, which activates the profile the agent card
  declares `required: true`. Request examples, the generated JSON-RPC OpenAPI
  operation, and the canonical agent-card example now carry them.
- Documented `ExtensionSupportRequiredError` (-32008) and
  `VersionNotSupportedError` (-32009) as A2A protocol-level errors, distinct
  from the typed `aap.error` vocabulary, in A2A's own `error.data` shape.
- A dealer agent returning `-32008` MUST name the exact extension URI and the
  literal `A2A-Extensions` header in the human-readable error message as well
  as its `google.rpc.ErrorInfo` detail. `extensionUri` and `requiredHeader`
  are AAP-defined metadata keys under the A2A error domain, not A2A-standard
  keys. Recovery requires an application that already supports that contract;
  stock SDKs do not automatically activate or retry it.
- SDK handling is documented for pinned Python and JavaScript versions.
  JavaScript SDK 1.3.0 preserves the numeric envelope code and structured
  details; tests verify the AAP Struct payload survives. The reviewed Python
  revision exposes only `ErrorInfo.metadata` for recognized errors and loses
  data for -32000, so that integration requires raw-envelope handling.
  The reviewed Python v1 server also needs an explicit required-extension check.

### Changed

- The client-side obligation to activate the extension is now cited to
  `a2a.proto` `AgentExtension.required` ("if true, the client must understand
  and comply with the extension's requirements"), which is A2A's normative
  source per A2A 1.4. A2A 3.3.4 continues to carry the dealer-side MUST.
- `A2A-Version` is required as a header on the JSON-RPC binding, following
  A2A 9.2. Although A2A 3.6.1 mentions a request parameter, the REST binding
  also mandates headers; no other-binding exception is claimed. The A2A rule
  for an explicitly empty value (`0.3`) is distinguished from AAP's own new
  policy to reject an absent header with `-32009`.
- AAP requires exactly one AAP extension URI per card, marked `required: true`,
  enforced by the card schema. A dealer migrating between AAP versions serves
  each from its own card and interface URL. This is AAP's choice for selecting
  a contract; multiple required A2A extensions would require all of them,
  rather than negotiating an alternative.
- The generated OpenAPI accepts `A2A-Extensions` as a member of a
  comma-separated list rather than as the entire header value, per A2A 9.2.
- The generated MCP manifest names the A2A headers the wrapper must send.

### Fixed — A2A v1.0 conformance

- `error.data` is an array of `@type`-tagged detail objects, per A2A 9.5 and
  3.3.2, and leads with a `google.rpc.ErrorInfo`. The typed AAP error is carried
  in the `value` of a standard `google.protobuf.Struct` Any, which strict
  ProtoJSON decoders can unpack without a custom protobuf definition. The
  standalone Poppy error body has no Any wrapper. AAP previously put a bare
  object there; the reference `a2a-python` JSON-RPC transport reads details
  only from a list and only from an `ErrorInfo`, so it silently discarded
  AAP details. `ErrorInfo.metadata.code` now preserves the AAP code when a
  client exposes metadata alone. The reviewed Python SDK still discards
  structured details for -32000, so AAP adapters must preserve the raw error
  to recover complete validation and retry details. BREAKING WIRE CHANGE;
  `docs/versioning.md` describes coexistence with the earlier contract.
- Every server `Message` response includes `contextId`, as the normative
  `Message.context_id` description requires. Its optional shared-field label
  permits client omission; it does not waive the server obligation. Response
  examples and response validation now include it. The claim that a TCK check
  requiring a server context is a bug is withdrawn. This change does not
  require a Task or Artifact for AAP's direct-message interaction. BREAKING.
- `RATE_LIMITED` moves from -32002 to -32000. A2A 5.4 assigns -32002 to
  `TaskNotCancelableError`, and both reference SDKs decode it that way, so a
  throttled client received a terminal task-lifecycle error. BREAKING.
- `UNSUPPORTED_SKILL` moves from -32601 to -32602 `Invalid params`.
  The `SendMessage` operation exists; the AAP skill parameter is unsupported.
  Reserved -32004 remains an A2A protocol error with its own required
  `UNSUPPORTED_OPERATION` reason and `a2a-protocol.org` domain. BREAKING.
- The agent card's `security` is renamed `securityRequirements` with A2A's
  `SecurityRequirement{schemes}` shape. `security` is the v0.3 name, not the
  A2A v1.0 authentication field, so a v1.0 reader can interpret a protected
  dealer's old declaration as anonymous.
  Empty security alternatives accept the `{}` form emitted by ProtoJSON
  when it omits an empty `schemes` map. BREAKING: rename and reshape protected
  cards and verify authorization; unknown-field tolerance means schema
  acceptance alone cannot prove the old declaration is understood.
- `protocolBinding` is an open string, as A2A defines it. The closed enum
  rejected `GRPC` and custom-binding URIs while still blessing `HTTP+JSON`,
  removed from AAP in v1.1.0. Additional interfaces on the same card must
  expose equivalent functionality under A2A 5.1; unrelated services belong
  on separate cards.
- `defaultInputModes`, `defaultOutputModes` and `skills` require at least one
  entry; all three are REQUIRED in the canonical proto. BREAKING schema
  tightening: previously accepted empty arrays no longer validate.
- Both mode lists name the `application/vnd.autoagent.*` media types the
  agent actually exchanges instead of a bare `application/json`, and each
  skill pins its own pair. BREAKING discovery change: align card modes,
  request/response parts, and clients' accepted output modes.
- Documents the errors A2A 3.3.4 obliges an agent to return for capabilities
  an AAP card does not declare, plus `ContentTypeNotSupportedError` (-32005).
- Transport security: every AAP endpoint MUST be served over HTTPS, which A2A
  makes a MUST in 7.1 and 13.4 and AAP had never stated.
- Adds optional `signatures` and the interface `tenant` field, documents A2A's
  interface preference order, and corrects three claims that do not survive
  the primary source: the removed v0.x `file` Part member, "strict A2A parsers
  reject unknown skill fields", and a citation to the removed REST binding.
  Signature entries, when present, now require the A2A `protected` and
  `signature` fields; their previous unconstrained acceptance is tightened.
- Contract tests now cover the agent-card accept set in both directions and
  the ProtoJSON wire form of the published JSON-RPC envelopes, which
  `validate-examples` skips.
- Explains the direct Message response permitted by A2A 3.1.1. AAP's
  message-only interaction does not create a Task or require an Artifact.
- Carries A2A 3.6.2's agent-side version obligations, and defines how a dealer
  matches `A2A-Extensions` when a client activates several extensions.
- `docs/compatibility/adf-mapping.md` no longer ships a pre-v1.1.0 lead: it
  used the removed `consent.source_agent` and the string form of
  `source_agent`, two minor versions after both were replaced.
- The inline agent card in `docs/discovery.md` is synced to the published
  copy-pasteable example; the two had drifted on every skill description and
  tag list.
- Every advertised interface URL MUST use HTTPS in production, including
  GRPC, as the normative A2A AgentInterface definition requires. The schema
  permits loopback HTTP for local development; bare gRPC channel targets
  are not AgentInterface URLs. BREAKING schema tightening for previously
  accepted non-HTTPS production URLs.
- `event.schema.json` is marked RESERVED and names no delivery mechanism. It
  described delivery over push notifications and task status events, both out
  of scope for the profile.
- States that a dealer MUST NOT declare a capability it cannot serve. The
  reference `a2a-python` client branches on `capabilities.streaming` in its
  ordinary send path, so an untruthful flag turns a default client's normal
  call into `SendStreamingMessage` against an agent that cannot serve it.
- The inline MCP manifest in `docs/compatibility/mcp.md` is synced to the
  generated artifact it claims to reproduce.
- `spec/latest/examples/mcp-manifest.example.json` is resynced with the
  generator, and a contract test now regenerates the manifest and compares it,
  so the two cannot drift into a frozen release again. `validate-examples`
  skips this file by pattern, which is why the drift went unnoticed.
- The wire tests include validation, activation and rate-limit error
  fixtures and validate the documentation's error envelopes. Generated
  OpenAPI accepts null ids for parse errors, requires exactly one of result
  or error, and exposes the interface's optional tenant routing field.
- Release tests explicitly reject a breaking minor and verify the generated
  extension-header pattern after release identifiers are substituted.
- Draft-only notices are removed only from prepared release documentation;
  editable notices and explicitly version-pinned historical links remain
  unchanged. Release tests cover the transformation and reject malformed markers.
- Regression tests now assert the mapping tables, required error tags, server
  contexts, typed OpenAPI error validation, precise negative card errors, and
  agreement between inline examples and generated manifests. SDK integration
  guidance no longer claims unverified next-major live interoperability.

## [1.3.0] — 2026-09-04

Additive, backward-compatible release focused on transparent vehicle pricing,
dealer-fee interoperability, and a clearer community presence. Existing v1.2
payloads remain valid.

### Added

- Strict `{ name, amount }` `DealerFee` objects in whole US dollars.
- Optional rooftop `fees` as a complete default schedule for publisher-side
  resolution and discovery metadata.
- Optional vehicle `fees` as a complete effective itemization: omitted means no
  breakdown was supplied, `[]` affirmatively means no mandatory dealer charges,
  and a non-empty array itemizes the vehicle's mandatory charges.
- Contract tests covering fee shape, all fee states, authoritative standalone
  prices, and informational `list_price` plus `fees` payloads.
- A public partners register with evidence-based listings, validation, and a
  contribution template for implementers and ecosystem participants.

### Changed

- `price` is defined as the authoritative advertised vehicle price: it includes
  mandatory non-government dealer charges and required add-ons, excludes
  government charges, and may reflect only discounts available to every buyer.
- `fees` is an optional breakdown and does not gate an otherwise authoritative
  `price`. When both are present, the fee amounts are already included in
  `price`; consumers never add them again.
- `list_price` remains optional context. `list_price` and `fees` may be supplied
  without `price`, but consumers must not present either value—or their sum—as
  the purchasable price.
- Buyer agents never join rooftop defaults into vehicle pricing. When vehicle
  `fees` is present, it is a complete snapshot rather than a delta.
- Pricing guidance now reflects the current FTC Act enforcement position and
  correctly notes that the separate CARS Rule was vacated and withdrawn. The
  protocol supports truthful all-in advertising without claiming that federal
  law universally requires an itemized fee breakdown.

### Documentation and community

- Introduced the AAP visual identity and transparent symbol/wordmark asset set,
  with a consistent light-blue documentation palette and responsive artwork.
- Modernized the documentation navigation, version selector, homepage, and
  generated diagrams while preserving immutable historical releases.
- Formalized the editable `latest` workflow and immutable release snapshots,
  including provenance, integrity manifests, compatibility reports, and stable
  aliases for generated TypeScript, OpenAPI, and MCP artifacts.
- Expanded machine-readable discovery for developers and agents, including the
  partners register, generated LLM documentation, and validated public assets.

## [1.2.0] — 2026-07-13

Additive, backward-compatible release that extends the profile to multi-class
inventory (motorcycle / powersports and beyond) and adds a generic
electric-powertrain field group. The transport model is unchanged from v1.1:
JSON-RPC 2.0 remains AAP's single transport, REQUIRED on every agent card
(gRPC and HTTP+JSON remain out of scope). Existing car integrations are
unaffected — every new field is optional and a missing `vehicle_type` is
treated as `car`.

### Added
- **Multi-class inventory support** (backward-compatible, additive): the unified
  `Vehicle` gains an optional `vehicle_type` discriminator
  (`car` | `motorcycle` | `trailer` | `rv` | `other`), plus the class-agnostic
  `body` field (now carrying motorcycle segments such as `cruiser`/`touring`
  alongside car body styles), the generic `displacement_cc` field (combustion
  displacement for cars and motorcycles alike), and a free-form
  `other_attributes` map for niche or dealer-specific specs. When `vehicle_type`
  is absent it MUST be treated as `car`, so existing car integrations are
  unaffected.
- **`inventory.search` filters**: `vehicle_type`, `body` (class-agnostic), and
  `displacement_cc_min` / `displacement_cc_max`.
- **`inventory.facets` facets**: `vehicle_types`, `bodies` (now covering
  motorcycle segments), and `displacement_cc_range`.
- **Discovery**: rooftop `capabilities` MAY advertise `motorcycle_sales` /
  `powersports`; `test_drive` appointments cover motorcycle demo rides. ADF
  mapping folds the motorcycle `body`/segment into `<bodystyle>`.
- **Generic electric-powertrain fields** on `Vehicle` (any `vehicle_type`,
  for `fuel` `bev`/`phev`): `battery_kwh`, `motor_power_hp`, `dc_fast_charge`,
  and `charge_port`, alongside the existing `electric_range_mi`. These cover
  electric cars and electric motorcycles with the same fields.
- **`inventory.search` electric filters**: `electric_range_mi_min` /
  `electric_range_mi_max`, `dc_fast_charge`, and `charge_port`.
- **`inventory.facets` electric facets**: `electric_range_mi_range`,
  `dc_fast_charge`, and `charge_ports`.
- **`other_attributes` escape hatch**: niche, previously-typed specs such as a
  motorcycle's `final_drive`, `engine_stroke`, `wheel_count`, and `abs` are not
  first-class fields; they travel in the free-form `other_attributes` map so the
  public contract stays lean.
- New motorcycle and electric-motorcycle example payloads under
  `spec/v1.2/examples/`.
- **Extension URI**: `https://autoagentprotocol.org/extensions/aap/v1.2`
  (the only on-the-wire version signal; dealers flip this URI on their agent
  card to advertise v1.2).

## [1.1.0] — 2026-06-25

Rebases the profile onto the **A2A v1.0.x** line (compliant with A2A v1.0.1)
and tightens the transport surface to a single binding. No payload/schema shape
changes from v1.0.

### Changed
- **Single transport**: the optional HTTP+JSON (REST) binding is **removed**.
  Every AAP agent advertises exactly one transport — JSON-RPC 2.0 — and a
  JSONRPC interface is REQUIRED on every agent card. gRPC remains out of scope.
- **Extension URI**: `https://autoagentprotocol.org/extensions/aap/v1.1`
  (the only on-the-wire version signal).

### Frozen
- v1.0 is now a released, immutable version: `spec/v1.0/` and `/docs/v1.0/`
  remain published for consumers pinned to it.

## [1.0.0] — 2026-06-10

First stable release. The payload shape introduced in v0.2 is carried over
**unchanged**; v1.0.0 re-bases the profile on the released **A2A v1.0** wire and
freezes the contract under the full SemVer policy (breaking changes now require
a major bump).

### Changed
- **A2A v1.0 wire**: the single A2A operation is `SendMessage` (was
  `message/send`), roles are the ProtoJSON enum names `ROLE_USER` /
  `ROLE_AGENT`, the `kind` discriminators are gone (a `Part` is typed by the
  member it carries), and a success response is the `SendMessageResponse`
  envelope — `{ "message": <Message> }` — on both bindings.
- **A2A v1.0 agent card**: transports are declared exclusively in
  `supportedInterfaces[]` (`{url, protocolBinding, protocolVersion}`); the
  pre-1.0 `url` / `preferredTransport` / `additionalInterfaces` / top-level
  `protocolVersion` card fields are gone. Every skill carries the required
  `tags`.
- **Extension URI**: `https://autoagentprotocol.org/extensions/a2a-automotive-retail/v1.0`
  (the only on-the-wire version signal; v0.2 cards keep the v0.2 URI).
- **Minimal transport surface**: the JSON-RPC 2.0 binding is **required** on
  every AAP agent card; HTTP+JSON is **optional**; gRPC is out of scope. The
  optional A2A surface (streaming, tasks, push-notification configs, extended
  agent card) is out of scope — dealer agents need not implement it and buyer
  agents must not require it.

### Unchanged (from v0.2)
- The five skills (`dealer.information`, `inventory.facets`,
  `inventory.search`, `inventory.vehicle`, `lead.submit`) and every typed
  request/response payload schema, including pricing semantics (FTC-final
  `price`), consent rules, vehicle/dealer shapes, and the ADF/XML lead mapping.

### Frozen
- v0.2 is now a released, immutable version: `spec/v0.2/` and
  `/docs/v0.2/` remain published for consumers pinned to it.

## [0.2.0] — 2026-06-03

Simplification of v0.1 (pre-1.0 minor with breaking changes, per SemVer 0.x):
single `agent-card.json` (no separate contract manifest), integer prices, flat
vehicle/dealer shapes, controlled `status` enum, unified `lead.submit`.

## [0.1.0] — 2026-04-30

Initial published draft: five-skill vocabulary, typed DataPart pattern,
contract manifest + agent card discovery, ADF/XML lead mapping.
