---
sidebar_position: 9
title: Versioning
description: SemVer policy. Released versions are immutable, "latest" aliases the highest released version, and each version has its own version-pinned schema URLs.
---

# Versioning

![Versioning timeline: v0.1 (current), v0.2 (future), v1.0 (unreleased), with the latest arrow pointing at the highest released version](/img/versioning-timeline.png)

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
| Changing the agent-card extension URI (e.g. `extensions/a2a-automotive-retail/v0.1` -> `.../v0.2`) | major |
| Documentation-only correction with no schema change | patch |

The AAP version lives in exactly one place on the wire: the agent-card extension URI (e.g. `https://autoagentprotocol.org/extensions/a2a-automotive-retail/v0.1`) and the schema `$id` URLs (`https://autoagentprotocol.org/v0.1/schemas/...`). Per-message `data.type` and `mediaType` are intentionally version-free; the dealer's agent-card pins the active version once per session.

## Released versions are immutable

Once an AAP version is published at a stable URL (e.g. `https://autoagentprotocol.org/v0.1/`), the schemas, examples, and OpenAPI artifacts at that URL are frozen forever. Dealers and buyer agents that pin to `v0.1` can rely on the schemas not changing under them.

Concretely:

- `https://autoagentprotocol.org/v0.1/schemas/<file>.schema.json` does not change after release.
- `https://autoagentprotocol.org/v0.1/openapi.yaml` does not change after release.
- The set of `data.type` identifiers defined in v0.1 (e.g. `inventory.search.request`, `lead.appointment.response`) does not grow or change.
- Documentation prose at `https://autoagentprotocol.org/docs/v0.1/` MAY receive editorial fixes, but cannot change normative content.

## The `latest` alias

The path `https://autoagentprotocol.org/latest/` always aliases the highest released version. It is intended for browsing convenience, not for production wire pinning. Production agents SHOULD pin to a specific version (e.g. `v0.1`).

How it is wired up today:

- **Documentation**: `https://autoagentprotocol.org/docs/latest/<page>` redirects (HTTP 200 client-side) to `/docs/v0.1/<page>` via the Docusaurus client-redirects plugin. Every page reachable under `/docs/v0.1/` is also reachable under `/docs/latest/`.
- **Schemas, examples, OpenAPI, MCP manifest**: also served at `https://autoagentprotocol.org/latest/...` because the build pipeline mirrors `static/v0.1/` into `static/latest/`. Both URLs return identical bytes today; on v0.2 release the mirror flips to v0.2.

| URL form | Stability | Use case |
|---|---|---|
| `https://autoagentprotocol.org/v0.1/...` | Frozen | Production pinning. |
| `https://autoagentprotocol.org/latest/...` | Tracks the highest released version | Documentation browsing, not wire pinning. |
| `https://autoagentprotocol.org/next/...` | Reserved | Will appear once v0.1 is cut as a real release and `current` becomes the next-version preview. Not live yet. |

## Schema URL convention

Every AAP JSON Schema lives at a version-pinned URL:

```
https://autoagentprotocol.org/v{version}/schemas/{filename}
```

Example for v0.1:

- `https://autoagentprotocol.org/v0.1/schemas/inventory-search-request.schema.json`
- `https://autoagentprotocol.org/v0.1/schemas/vehicle.schema.json`
- `https://autoagentprotocol.org/v0.1/schemas/_primitives/money.schema.json`

The `$id` inside each schema file matches its public URL. Schema cross-references (`$ref`) use relative paths within the same version directory.

## Contract URI

The contract manifest's `contract.uri` is also version-pinned:

```json
"contract": {
  "name": "Auto Agent Protocol A2A Automotive Retail Profile",
  "version": "0.1.0",
  "uri": "https://autoagentprotocol.org/v0.1/"
}
```

A buyer agent that successfully calls a dealer whose manifest declares `contract.uri: https://autoagentprotocol.org/v0.1/` can cache the schema URLs forever.

## Extension URI

The A2A extension URI is version-pinned per major.minor:

```
https://autoagentprotocol.org/extensions/a2a-automotive-retail/v0.1
```

A future minor version (v0.2) introduces a new extension URI. Dealer agents that support multiple AAP minor versions MAY declare multiple extension entries on their A2A agent card; buyer agents pick the highest version they understand.

## Side-by-side versioning

Dealer agents MAY run multiple AAP minor versions in parallel during a transition. Each version is exposed by a separate extension URI on the agent card, and each version corresponds to a separate contract manifest URL (e.g. `/.well-known/auto-agent-contract.json` for the canonical version, `/.well-known/auto-agent-contract.v0.2.json` for a parallel preview). AAP v0.1 does not standardize the parallel-version path; it is a dealer-side convention.

## Release process

Each AAP release goes through three stages:

1. **`next`** — in-flight pre-release work in `spec/next/` and `https://autoagentprotocol.org/next/`. Schemas and prose may change without warning.
2. **`v{version}` (release candidate)** — schemas are frozen, prose may receive editorial polish.
3. **`v{version}` (released)** — schemas, prose, examples, and OpenAPI are immutable. The `latest` alias is updated to point here.

The repository runs a `freeze-check` tool over released directories on every PR to prevent accidental modification.

## What this means for buyer agents

- Pin to a specific version (`https://autoagentprotocol.org/v0.1/`) in production.
- Read the contract manifest's `contract.version` and `contract.uri` to learn which AAP minor version the dealer agent speaks.
- Validate against the per-skill `request_schema` URL the manifest gives you — that URL is version-pinned.
- Treat AAP as forward-compatible: a v0.2 dealer SHOULD accept v0.1 requests because v0.1 schemas are a strict subset (only optional additions allowed in minor versions). Verify by reading the `contract.version`.

## What this means for dealer agents

- Once you publish, freeze. Do not edit released schemas in place.
- Add new optional fields in the `next` channel; release them as a minor bump.
- Bump the major version (and the agent-card extension URI's `v{major}.{minor}` suffix) for any breaking change.
- Maintain the `latest` alias on your documentation host so casual browsers always land on the most recent published version.
