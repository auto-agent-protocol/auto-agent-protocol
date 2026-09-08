# Changelog

All notable changes to the Auto Agent Protocol specification are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); the
versioning policy is described in the
[versioning docs](https://autoagentprotocol.org/docs/latest/versioning).

## [Unreleased]

> **This set requires a MAJOR release.** `pnpm release:prepare` refuses it as a
> minor: the compatibility report lists seven breaking schema changes, all of
> them corrections that bring AAP in line with A2A v1.0. `pnpm test:release`
> fails for the same reason, because its cases derive the next *minor*. Both
> are the release gate working as designed, not a regression.

### Added

- Documented the A2A service-parameter headers every AAP request carries:
  `A2A-Version: 1.0`, required by A2A on every request, and `A2A-Extensions`
  naming the AAP extension URI, which activates the profile the agent card
  declares `required: true`. Request examples, the generated JSON-RPC OpenAPI
  operation, and the canonical agent-card example now carry them.
- Documented `ExtensionSupportRequiredError` (-32008) and
  `VersionNotSupportedError` (-32009) as A2A protocol-level errors, distinct
  from the typed `aap.error` vocabulary, in A2A's own `error.data` shape.
- A dealer agent returning `-32008` MUST carry a `google.rpc.ErrorInfo` detail
  naming the extension URI and the `A2A-Extensions` header, so a buyer agent
  that omitted activation recovers in a single retry.

### Changed

- The client-side obligation to activate the extension is now cited to
  `a2a.proto` `AgentExtension.required` ("if true, the client must understand
  and comply with the extension's requirements"), which is A2A's normative
  source per A2A 1.4. A2A 3.3.4 continues to carry the dealer-side MUST.
- `A2A-Version` is documented as header-only on the JSON-RPC binding on the
  authority of A2A 9.2, which forecloses the `?A2A-Version=1.0`
  request-parameter form A2A 3.6.1 permits on other bindings.
- An agent card declares exactly one AAP extension URI, and a dealer migrating
  between AAP versions serves each from its own card and interface URL: A2A
  4.6.3 forbids automatic fallback to an earlier extension version.
- The generated OpenAPI accepts `A2A-Extensions` as a member of a
  comma-separated list rather than as the entire header value, per A2A 9.2.
- The generated MCP manifest names the A2A headers the wrapper must send.

### Fixed — A2A v1.0 conformance

- `error.data` is an array of `@type`-tagged detail objects, per A2A 9.5 and
  3.3.2, and leads with a `google.rpc.ErrorInfo`. AAP previously put a bare
  object there; the reference `a2a-python` JSON-RPC transport reads details
  only from a list and only from an `ErrorInfo`, so it silently discarded
  every AAP error payload — including on -32602, AAP's highest-volume code —
  leaving a buyer agent to retry with no code and no `retryable` signal.
  BREAKING WIRE CHANGE; `docs/versioning.md` carries a dual-accept note.
- `RATE_LIMITED` moves from -32002 to -32000. A2A 5.4 assigns -32002 to
  `TaskNotCancelableError`, and both reference SDKs decode it that way, so a
  throttled client received a terminal task-lifecycle error. BREAKING.
- `UNSUPPORTED_SKILL` moves from -32601 to -32004 `UnsupportedOperationError`.
  The JSON-RPC method is always `SendMessage` and always exists, so -32601
  told a generic A2A client the endpoint does not speak A2A. BREAKING.
- The agent card's `security` is renamed `securityRequirements` with A2A's
  `SecurityRequirement{schemes}` shape. `security` is the v0.3 name; no A2A
  v1.0 parser reads it, so a protected dealer's card parsed as anonymous.
- `protocolBinding` is an open string, as A2A defines it. The closed enum
  rejected `GRPC` and custom-binding URIs while still blessing `HTTP+JSON`,
  removed from AAP in v1.1.0.
- `defaultInputModes`, `defaultOutputModes` and `skills` require at least one
  entry; all three are REQUIRED in the canonical proto.
- Both mode lists name the `application/vnd.autoagent.*` media types the
  agent actually exchanges instead of a bare `application/json`, and each
  skill pins its own pair.
- Documents the errors A2A 3.3.4 obliges an agent to return for capabilities
  an AAP card does not declare, plus `ContentTypeNotSupportedError` (-32005).
- Transport security: every AAP endpoint MUST be served over HTTPS, which A2A
  makes a MUST in 7.1 and 13.4 and AAP had never stated.
- Adds optional `signatures` and the interface `tenant` field, documents A2A's
  interface preference order, and corrects three claims that do not survive
  the primary source: the removed v0.x `file` Part member, "strict A2A parsers
  reject unknown skill fields", and a citation to the removed REST binding.
- Contract tests now cover the agent-card accept set in both directions and
  the ProtoJSON wire form of the published JSON-RPC envelopes, which
  `validate-examples` skips.

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
