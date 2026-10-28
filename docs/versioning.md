---
sidebar_position: 9
title: Versions and migration
description: AAP 3.1 currency and odometer migration, independent upstream versions, and immutable release artifacts.
---

# Versions and migration

**AAP 3.1 adds explicit currency and odometer units.** Existing omitted labels retain USD/mi meanings. Native Canadian amounts require the new fields and a 3.1 endpoint; do not relabel CAD/km numbers on an unchanged 3.0 endpoint. The frozen 3.0 contract remains unchanged.

![Edit and verify the draft, freeze a new release, then publish and switch a verified deployment](./img/versioning-timeline.svg)

## Four independent version numbers

| Identifier | Meaning in AAP 3.1 |
|---|---|
| AAP `3.1.0` / contract `v3.1` | Automotive schemas, bindings and behavior |
| MCP `2026-07-28` + `2025-11-25` | Current wire protocol and explicit compatibility path |
| A2A `1.0` | Agent Card, Message and JSON-RPC protocol |
| PAP `0.3` | Pinned in-progress Poppy draft; discovery bridge remains `version: "1"` |

A server's software version is separate. A PAP 0.2 client must migrate its authentication flow; a PAP 0.3 client is not automatically an AAP 3.1 client, and MCP version negotiation does not choose an automotive schema version.

## AAP 3.0 to 3.1

| Area | Existing 3.0 meaning | Additive 3.1 behavior |
|---|---|---|
| Vehicle amounts | Whole USD | Optional `currency` labels USD or CAD; omission still means USD. It covers `price`, `list_price`, `msrp` and vehicle fees |
| Vehicle odometer | Miles | Optional `mileage_unit` labels mi or km; omission still means mi. Returned numbers remain native |
| Rooftop fee defaults | Whole USD | Optional rooftop `currency`; omission still means USD. Never infer vehicle currency from it |
| Search and facets | USD prices, mi odometer comparisons | Optional top-level `currency` and `mileage_unit`; use declared capability defaults, falling back to USD/mi. One currency scopes every matching set; mileage comparisons convert exactly |
| Facets without search | USD/mi requests without search capabilities | Accept explicit USD/CAD and mi/km contexts; omitted contexts remain USD/mi. No search capability declaration is needed |
| Capabilities | No monetary or odometer context | Optional `currencies`, `default_currency`, `default_mileage_unit`; declarations must agree across bindings |
| Results and cursors | USD/mi implicit | Label effective nondefault contexts explicitly on search/facet data; bind both contexts into cursor identity. Per-vehicle labels never inherit query context |
| Geographic and electric range | Explicit `_mi` fields | Unchanged: miles for every country and odometer unit |
| Leads and trade-ins | USD/mi if numeric values are present | Preserve explicit currency and odometer labels with each partial vehicle description |

This requires schema, generated tool/OpenAPI metadata and runtime changes together. Documentation alone cannot establish the new fields or comparison behavior. Keep existing 3.0 and approved connector endpoints operating under their original contracts while publishing separate 3.1 discovery and endpoints. See [currency and odometer context](./skills/inventory-search.md#currency-and-odometer-context) for exact defaults and comparison rules.

## For implementers

For implementations coming from 2.1, the 3.0 major migration below is also required. It made MCP native, added dealer-domain discovery links and search capabilities, and tightened automotive results and lead outcomes. Migrate the implementation and its clients before switching discovery. Keep each supported automotive contract at its own card and endpoint identity.

| Area | AAP 2.1 | AAP 3.0 action |
|---|---|---|
| MCP | Reference manifest/optional adapter | Implement native Streamable HTTP for both required revisions, actual tools/list and typed success/error results |
| Request headers | A2A version and extension headers mandatory | Accept omitted A2A headers on contract-pinned endpoints and omitted MCP mirror headers when the body or this client's negotiated session supplies the value. Keep supplied-value conflict checks and all authentication requirements; see the binding pages for this AAP compatibility extension |
| PAP | Draft 0.2 authentication and discovery | Migrate to draft 0.3 as detailed [below](#pap-03-migration); changing the version label is insufficient |
| Discovery | A2A + PAP pair | Add complete AAP params, exact MCP URL, search capabilities, release metadata and dealer `/llms.txt` |
| Search filters | Empty arrays, repeated values and empty queries can validate | Advertise supported keys/sorts; deduplicate arrays and omit empty optional filters. Reject `make: []`, `make: ["Honda", "Honda"]`, empty/whitespace-only `query`, unknown keys and unsupported constraints; implement explicit query token rules |
| Features | Free-text attributes | Add `features_all` (AND), `features_any` (OR), advertised feature vocabulary and source-backed `feature_evidence`; unknown is not absent |
| Geography | Location context without a radius contract | If advertised, implement `near`, haversine miles, radius filtering and `distance_mi` ordering |
| Coordinate names — breaking for deployed clients | Some deployment extensions accept `near.lat` / `near.lng`, including in validation-error hints; these were not AAP 2.1 schema fields | Use `near.latitude` / `near.longitude`. Update handlers, client/tool schemas, examples and error hints together; AAP 3.0 rejects the short keys |
| Pagination | Offset/limit; schema permits `pagination.limit` up to 1000 | Maximum falls to 100. Update clients requesting 101–1000 to use at most the advertised `max_limit` (never above 100) and follow `next_cursor`; `total` is exact or null; no silent result caps |
| Search response | `data.limit` is optional | Always return the effective `data.limit`, even when the client omitted it, plus `next_cursor`, `applied_filters` and effective `sort`; include query terms and distance/evidence when applicable |
| Aggregate seller | Opaque `dealer_id` without a lookup | Expose `dealer.information` with a `dealer_id` selector; echo the same ID and actual seller profile before consent. Parameterless dealer-scoped requests remain valid |
| Inventory listings | Some guarantees only in prose | Require eligible `status`, `updated_at` and a stable identifier in search/detail responses |
| Lead retries | Optional key; `duplicate` is a lead status | Require `idempotency_key`; retain atomic deduplication for at least 24 hours. Replay the complete original result with `data.replayed: true`, preserving `received`/`rejected`, appointment details and message. `status: "duplicate"` is removed |
| Contact channels | Consent declaration | Require matching contact data and an authorized preferred channel; reject unusable grants before delivery |
| Appointment outcome | Some conditions only described | Enforce time on `confirmed` and alternatives on `proposed`. Any appointment included on a rejected lead must also be `rejected` |
| Errors | Existing automotive vocabulary; retry timing optional and may use seconds | Add `DEALER_NOT_FOUND`, `UNSUPPORTED_FILTER`, `UNSUPPORTED_SORT`, `INVALID_CURSOR`. `RATE_LIMITED` requires `details.retry_after_ms`; multiply seconds by 1,000. `retry_after_seconds` alone is insufficient. HTTP 429 also requires `Retry-After` |
| Error details | `aap.error.details` accepts unrestricted JSON, including strings, arrays and null | When present, `details` must be an object. Convert custom diagnostics to `details.errors[]`, where each item requires a JSON Pointer `instanceLocation`, a nonempty `keyword` and a nonempty `error`; additional detail fields remain allowed |

The public `DayHours` and `WeeklyHours` TypeScript exports are retained. `DayHours` remains `{open, close} | null`; consumers keep their existing imports.

Pricing semantics, five canonical skill IDs, A2A 1.0 wire form and discovery bridge `1` remain. PAP upgrades to 0.3, including its breaking Session, metadata and optional-flow changes. Do not weaken authentication to make a client with missing credentials appear compatible.

### Release order and version discovery

1. Publish the approved version-pinned specification, schemas and artifacts.
2. Upgrade clients and server handlers, then pass [runtime acceptance](./conformance.md#required-deployment-acceptance-cases).
3. Publish consistent Agent Card, Poppy and `llms.txt` links to the implemented endpoints.
4. Switch the default discovery only when that complete contract works.

One A2A card declares exactly one required AAP extension. Several required versions do not express an either/or choice. A2A forbids automatic fallback to an earlier extension version.

For coexistence, retain separate version-specific cards and endpoints. One origin has one default well-known card; distribute other card URLs through explicit configuration or a registry, or use separate origins. For a coordinated cutover, communicate which clients must migrate and when the old endpoint retires. A new URI alone does not make retirement backward compatible.

Do not retry an uncertain lead through an older contract with a new key. Preserve its identity and reconcile the earlier outcome.

### PAP 0.3 migration

The target is the [0.3 draft at upstream commit `86f0c8d`](https://github.com/personal-agent-protocol/personal-agent-protocol/blob/86f0c8d8db3c95cf06d7e05370ec4bddf7d25bc7/content/versions/0.3/spec.mdx), reviewed 2026-10-26. This is not an upstream final release. Re-review later draft changes explicitly; do not silently follow a moving `main`.

| Surface | PAP 0.2 | PAP 0.3 action |
|---|---|---|
| Discovery | `protocol_version: "0.2"` | Advertise `"0.3"` only after implementing it; unsupported pre-1.0 minors are incompatible |
| Redirected discovery | Final-host identity | Also retain exact final `/.well-known/poppy.json` path without query |
| Issuer authorization | `poppy_domains: ["dealer.example"]` | Replace with `protected_resources: ["https://dealer.example"]`; no domain-entry port, path or slash; ignore hostname case only |
| Grant metadata | JWT grant advertisement optional | Require `grant_types_supported`, including JWT bearer **and `refresh_token`**, even for guest-only issuers |
| Sign-in discovery | `auth.direct` and `auth.device` | Remove both; use authorization-code/device grants and their required metadata endpoints; any sign-in requires `scopes_supported` |
| Scopes | Built-in `poppy:read` / `poppy:write`, plus `auth.custom_scopes` | Define company scopes; reserve all `poppy:` names. Replace with `auth.scopes` or listed OpenAPI OAuth descriptions; mediated scopes must be a supported subset |
| Scope hints | No standard hints | Optional `auth.scope_hints` includes both `changes` and `personal_data`; unknown changes means irreversible, absent hints means unknown |
| Session identity | Custom `session_id` in requests/responses; DPoP key could span Sessions for one User | Remove `session_id`. Create a new DPoP key per Session; key thumbprint identifies it. Renew with the same key, client, User and optional Agent ID |
| Session errors | `invalid_session` | Use `invalid_grant`; keep ended-key tombstones when possible; clients discard rejected ended keys and tolerate forgotten-key renewal creating a new Session |
| Token state | `signed_in`, guest `scope: ""` | Remove both. Guest JWT grant always returns DPoP with scope omitted. Sign-in/Account Token grants are signed in; omitted scope means exactly as requested. Never infer state from scope presence |
| Agent identity within a User | No Agent ID | Optional pairwise opaque `agent_id` in Session assertion; unchanged or absent on renewal, no separate account/conversation ownership |
| Native MCP without DPoP | Token issuance could return Bearer without a token-endpoint proof | Require RFC 8693 **token exchange** from a current DPoP Session Token; fresh token-endpoint DPoP still mandatory; return exact-resource Bearer and `issued_token_type`; never widen scopes |
| Native MCP with DPoP | Resource-bound DPoP | Continue normal grants with DPoP and exact MCP resource. Wrong grant/token target gets `invalid_target`; never exchange to a DPoP-capable server |
| Direct Sign-In | PKCE and Session ID | Bind code to Session Key via mandatory `dpop_jkt` support or proof on PAR; keep PKCE, state and response-issuer checks. Exchange with the same key |
| Native client redirects | Same-domain HTTPS only | Also permit RFC 8252 HTTP loopback IP literals, matching exactly except for port; remote identity fetches stay HTTPS |
| Device Sign-In | Device flow | Apply RFC 10027 protections; bind device code on first token poll, reject key changes |
| Browser join | Signed browser assertion and return URL | Replace with browser-issued ≤60-second code, `__Host-` join cookie, Session-key DPoP `nonce=code`, one-use verification and required browser isolation headers |
| Account access error | `sign_in_required` | Use `insufficient_scope`, including for signed-out requests; name required scopes and honor explicit sign-out |
| Token lifetime / revocation | Account Token expiry implicit | Optional positive `refresh_token_expires_in`; revocation SHOULD invalidate issued Session Tokens; otherwise enforce state/short lifetime |
| Conversation messages | `sender` | Use `author: {type: "agent" or "human"}`; Company authors may include id/name/image; authorization events require scope |
| Unavailable tasks | Feedback only, 202 | Optional public `excluded_tasks.url` and alternatives; feedback clients accept **200 + alternative or 202 + no body**; ignore references to unadvertised APIs |
| Secrets | Credential protection | Keep tokens, private keys, authorization codes, PKCE verifiers and device codes outside model context; use trusted signing/sending code |

Regenerate client/tool schemas and update TypeScript constructors with the new Poppy metadata and token shapes; the old fields are intentionally incompatible. The automotive request/response bodies and bridge `1` are independent of this change. Do not reset a lead's idempotency key during protocol migration or scope deduplication to a changing Session Key. Keep a stable verified caller/User identity and reconcile uncertain writes before changing authentication context.

### PAP 0.2 migration

This heading remains as a historical link. AAP 2.1 used PAP 0.2; its [frozen migration record](https://autoagentprotocol.org/docs/v2.1/versioning#pap-02-migration) documents the earlier 0.1 → 0.2 transition. New AAP 3.1 implementations target **0.3 directly** and apply all final identity, issuer-audience and proof requirements. They do not need an intermediate 0.2 deployment. The historical 2.0 → 2.1 minor-release exception was approved for one specification hash and does not relax the major-version policy.

### Breaking migration checklist

An upgrade from AAP 1.x must also apply the [frozen 2.0 migration](https://autoagentprotocol.org/docs/v2.1/versioning#breaking-migration-checklist): paired PAP discovery and native API, required response contexts, standard A2A error detail arrays, securityRequirements shape, exact extension activation and truthful media types. Direct upgrades must implement the final contract in full; they need not deploy every intermediate version.

## Editable work and stable releases

| Source or URL | Meaning |
|---|---|
| `spec/latest/`, `docs/` | Editable specification and documentation |
| `/docs/latest/` | Editable documentation with an unreleased banner |
| `spec/v3.1/`, `/v3.1/`, `/docs/v3.1/` | Frozen contract, artifacts and documentation after approval |
| `/latest/` | Artifact alias of the stable release named by `releases.json` |

Draft schema/extension URLs use `https://draft.autoagentprotocol.invalid`. Release preparation replaces them with immutable production identifiers. Agents pin the selected release rather than relying on a moving `/latest/` alias.

## SemVer and immutability

AAP follows Semantic Versioning. Optional additive behavior can be minor; removed fields, tighter validation, changed required meanings or new mandatory interfaces require a major release. The structural compatibility report is conservative and does not replace semantic review.

Contract paths contain major/minor only, so the release tool creates `MAJOR.MINOR.0` snapshots. Published snapshots are never edited, including their diagrams. Editorial corrections enter the editable source for a later release.

A release freezes schemas, examples, skills, docs/sidebar/images, generated TypeScript/OpenAPI/MCP artifacts, provenance, a compatibility report and SHA-256 integrity. CI and local checks reject changes under previously released paths. Historical artifacts are copied from their snapshots, never regenerated using newer tooling.

## Preparing a release

Commit reviewed edits to the working sources, then rehearse:

```bash
pnpm release:prepare 3.1.0 --dry-run
```

After reviewing the compatibility report, run without `--dry-run` from a clean tree. The command validates and freezes the new contract, generates artifacts, records the source commit/hashes and updates registry/package versions. It does not commit, tag, push, publish npm packages or deploy the site. See [RELEASING.md](https://github.com/auto-agent-protocol/auto-agent-protocol/blob/main/RELEASING.md).

## A2A version handling

Portable A2A clients send `A2A-Version: 1.0` and the exact `A2A-Extensions` URI. AAP 3.0 additionally accepts their omission on a contract-pinned endpoint, using its configured A2A 1.0 interface and AAP contract. Supplied values still take effect: unsupported versions return -32009, and an explicitly empty version means `0.3`, not a request for a default. This compatibility extension does not change strict upstream client requirements or permit automatic contract fallback. See [request headers](./bindings/json-rpc.md#request-headers).
