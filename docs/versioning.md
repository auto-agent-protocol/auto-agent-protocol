---
sidebar_position: 9
title: Versioning
description: SemVer policy. Released versions are immutable, "latest" aliases the highest released version, and each version has its own version-pinned schema URLs.
---

# Versioning

![Versioning timeline: v0.1 (frozen), v0.2 (frozen), v1.0.0 (current), with the latest arrow pointing at the highest released version](/img/v1.0/versioning-timeline.png)

![One URI pins everything: the agent-card extension URI determines schemas, skill contracts, error vocabulary, and pricing/consent rules](/img/v1.0/discovery-versioning-pair.png)

Auto Agent Protocol uses [Semantic Versioning](https://semver.org/) (SemVer) for the published specification, schemas, and contract identifiers. The rules below are normative.

## SemVer policy

Each released version of AAP has a major.minor version number (v0.1, v0.2, v1.0, v1.1, ...). The patch level is reserved for documentation-only fixes that do not change schemas, examples, or required behavior.

| Change | Version bump |
|---|---|
| Adding a new optional field to an existing request or response schema | minor |
| Adding a new skill | minor |
| Adding a new optional behavior rule (SHOULD, MAY) | minor |
| Adding a new error code | minor |
| Removing a field, renaming a field, tightening a type, narrowing an enum | major |
| Changing a required field's semantics | major |
| Changing the agent-card extension URI (e.g. `extensions/a2a-automotive-retail/v0.2` -> `.../v1.0`) | major |
| Documentation-only correction with no schema change | patch |

The table above is the policy in force now that AAP has reached 1.0.0. **During the pre-1.0 (`0.x`) series, a minor bump was allowed to carry breaking changes** — per SemVer's 0.x allowance. v0.2 was exactly such a bump: it removed and renamed fields, flattened prices to integers, narrowed `status` to an enum, and dropped the separate contract manifest, all relative to v0.1. AAP v1.0.0 is the first stable release: its payload shape is the one introduced in v0.2, unchanged, now riding A2A v1.0. Pin to the exact version a dealer advertises.

The AAP version lives in exactly one place on the wire: the agent-card extension URI (e.g. `https://autoagentprotocol.org/extensions/a2a-automotive-retail/v1.0`) and the schema `$id` URLs (`https://autoagentprotocol.org/v1.0/schemas/...`). Per-message `data.type` and `mediaType` are intentionally version-free; the dealer's agent-card pins the active version once per session.

## Released versions are immutable

Once an AAP version is published at a stable URL (e.g. `https://autoagentprotocol.org/v0.1/`), the schemas, examples, and OpenAPI artifacts at that URL are frozen forever. Dealers and buyer agents that pin to `v0.1` can rely on the schemas not changing under them.

Concretely:

- `https://autoagentprotocol.org/v0.1/schemas/<file>.schema.json` does not change after release.
- `https://autoagentprotocol.org/v0.1/openapi.yaml` does not change after release.
- The set of `data.type` identifiers defined in v0.1 (e.g. `inventory.search.request`, `lead.submit.response`) does not grow or change.
- Documentation prose at `https://autoagentprotocol.org/docs/v0.1/` MAY receive editorial fixes, but cannot change normative content.

## The `latest` alias

The path `https://autoagentprotocol.org/latest/` always aliases the highest released version. It is intended for browsing convenience, not for production wire pinning. Production agents SHOULD pin to a specific version (e.g. `v1.0`).

How it is wired up today:

- **Documentation**: `https://autoagentprotocol.org/docs/latest/<page>` redirects (HTTP 200 client-side) to `/docs/v1.0/<page>` via the Docusaurus client-redirects plugin. Every page reachable under `/docs/v1.0/` is also reachable under `/docs/latest/`. The frozen v0.1 and v0.2 docs remain served at `/docs/v0.1/<page>` and `/docs/v0.2/<page>`.
- **Schemas, examples, OpenAPI, MCP manifest**: also served at `https://autoagentprotocol.org/latest/...` because the build pipeline mirrors `static/v1.0/` into `static/latest/`. The frozen v0.1 and v0.2 artifacts remain served at `https://autoagentprotocol.org/v0.1/...` and `https://autoagentprotocol.org/v0.2/...`.

| URL form | Stability | Use case |
|---|---|---|
| `https://autoagentprotocol.org/v1.0/...` | Frozen | Production pinning. |
| `https://autoagentprotocol.org/v0.2/...` | Frozen (historical) | Production pinning for agents still on v0.2; still served. |
| `https://autoagentprotocol.org/v0.1/...` | Frozen (historical) | Production pinning for agents still on v0.1; still served. |
| `https://autoagentprotocol.org/latest/...` | Tracks the highest released version (now v1.0) | Documentation browsing, not wire pinning. |
| `https://autoagentprotocol.org/next/...` | Reserved | The current `docs/` is now v1.0; `next` will hold the preview of the next version once work on it begins. |

## Schema URL convention

Every AAP JSON Schema lives at a version-pinned URL:

```
https://autoagentprotocol.org/v{version}/schemas/{filename}
```

Example for v1.0:

- `https://autoagentprotocol.org/v1.0/schemas/inventory-search-request.schema.json`
- `https://autoagentprotocol.org/v1.0/schemas/vehicle.schema.json`

The `$id` inside each schema file matches its public URL. Schema cross-references (`$ref`) use relative paths within the same version directory.

The AAP version is announced only via the agent-card extension URI and the schema `$id` URLs. There is no separate contract document; a buyer agent reads the extension URI to learn the version and then validates against the version-pinned schema URLs published by AAP.

## Extension URI

The A2A extension URI is version-pinned per major.minor:

```
https://autoagentprotocol.org/extensions/a2a-automotive-retail/v1.0
```

A future minor version introduces a new extension URI. Dealer agents that support multiple AAP minor versions MAY declare multiple extension entries on their A2A agent card; buyer agents pick the highest version they understand.

## Side-by-side versioning

Dealer agents MAY run multiple AAP versions in parallel during a transition. Each version is exposed by a separate extension URI on the agent card; a dealer that speaks both v0.2 and v1.0 declares both extension URIs on its single agent card, and buyer agents pick the highest version they understand.

## Release process

Each AAP release goes through three stages:

1. **Current (working)** — in-flight work lives in the current version directory (`spec/v1.0/`) and the Docusaurus `current` docs (`docs/`, served at `/docs/v1.0/`). Schemas and prose may change while the version is unreleased.
2. **`v{version}` (release candidate)** — schemas are frozen, prose may receive editorial polish.
3. **`v{version}` (released)** — schemas, prose, examples, and OpenAPI are immutable. The `latest` alias is updated to point here, and the docs are snapshotted into `versioned_docs/version-v{version}/`.

The repository runs a `freeze-check` tool over released directories (`spec/v0.1/`, `spec/v0.2/`, `versioned_docs/version-v0.1/`, `versioned_docs/version-v0.2/`) on every PR to prevent accidental modification.

## What this means for buyer agents

- Pin to a specific version (`https://autoagentprotocol.org/v1.0/`) in production.
- Read the agent-card extension URI to learn the AAP version the dealer agent speaks.
- Validate against the version-pinned schema URLs published by AAP — those URLs are version-pinned.
- Do NOT assume cross-version compatibility. During the pre-1.0 series a minor bump could change shapes (v0.2 removed fields, flattened prices, and narrowed `status` relative to v0.1); v1.0.0 keeps the v0.2 payload shape unchanged but rides A2A v1.0. Speak the exact version a dealer advertises via its extension URI; a dealer that supports multiple versions declares each extension URI.

## What this means for dealer agents

- Once you publish, freeze. Do not edit released schemas in place.
- Develop changes against the current version directory (`spec/v1.0/`); cut them into a new version directory when you release.
- Bump the version (and the agent-card extension URI's `v{major}.{minor}` suffix) for any breaking change.
- Maintain the `latest` alias on your documentation host so casual browsers always land on the most recent published version.
