# Changelog

All notable changes to the Auto Agent Protocol specification are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); the
versioning policy is described in the
[versioning docs](https://autoagentprotocol.org/docs/latest/versioning).

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
