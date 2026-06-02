---
sidebar_position: 10
title: Contributing
description: How to propose changes to AAP — open an issue first, follow up with a PR. Released versions are frozen; new work lands in the next channel.
---

# Contributing

Auto Agent Protocol is developed in the open. The specification, schemas, examples, generated artifacts, and documentation live in a single GitHub repository:

> [github.com/auto-agent-protocol/auto-agent-protocol](https://github.com/auto-agent-protocol/auto-agent-protocol)

The specification and schemas are licensed under [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0). Documentation prose is licensed under [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/).

## How to propose a change

1. **Open an issue first.** Describe the problem you are solving — what is missing, ambiguous, or wrong in the current spec — and the change you want to make. This avoids investing in a PR that the working group does not want to merge as-is.
2. **Wait for triage.** Maintainers label the issue (`spec`, `schema`, `docs`, `tooling`) and confirm the direction. For schema changes, the issue gets a target version (e.g. `v0.3-candidate`).
3. **Open a PR against `main`.** Implement the change. Update schemas, examples, and documentation together so the spec stays internally consistent.
4. **Run validation locally.** From the repo root: `pnpm install && pnpm run validate && pnpm run typecheck`. The CI runs the same checks on every PR.

## What goes where

| Path | Purpose |
|---|---|
| `spec/v0.2/schemas/` | Current (v0.2) JSON Schemas — the source of truth. Edit here. |
| `spec/v0.2/examples/` | Current (v0.2) example payloads. Edit here. |
| `spec/v0.2/skills.yaml` | Current (v0.2) skill manifest. Edit here. |
| `spec/v0.1/` | Frozen v0.1 schemas, examples, and skills. **Do not edit — released versions are immutable.** |
| `docs/` | Docusaurus prose pages for the current version (v0.2). |
| `versioned_docs/`, `versioned_sidebars/`, `versions.json` | Frozen v0.1 docs snapshot, managed by `docusaurus docs:version`. **Do not hand-edit.** |
| `tools/` | Build, validation, and code-generation scripts. |
| `packages/` | Published npm packages (`@autoagentprotocol/types`, `@autoagentprotocol/schemas`, `@autoagentprotocol/validator`). |
| `generated/` | **Auto-generated, NOT committed.** Per-version TS types, both OpenAPI bundles, and MCP manifest. Produced by `pnpm run generate` on every build. |
| `static/v0.1/`, `static/v0.2/`, `static/latest/` | **Auto-generated, NOT committed.** Spec assets mirrored for the docs site by `pnpm run copy-static`. |
| `docs/schemas/_partials/` | **Auto-generated, NOT committed.** FieldCard MDX rendered from JSON Schema by `pnpm run generate:field-cards`. |

## Released versions are frozen

Once a major.minor version is released, its schemas, examples, and `skills.yaml` become immutable. A `freeze-check` tool runs on every PR to enforce this against released paths (`spec/v0.1/`, `versioned_docs/version-v0.1/`). New schema work lands in the current version directory (`spec/v0.2/`); a future breaking change is cut into a fresh `spec/v0.3/` (or `spec/v1.0/`). See [Versioning](./versioning.md) for the SemVer policy.

A PR that modifies a released schema or example will fail CI. If the change is genuinely needed, the working group will discuss whether it warrants a minor or major bump.

## Editorial fixes

Documentation prose under `docs/` may receive editorial fixes (typos, clarifications, broken links) for any released version. These are released as patch-level updates and do not require a SemVer bump.

## What we are looking for

- **Schema rough edges.** Field names that should be more consistent, descriptions that need tightening, missing optional fields the spec genuinely needs.
- **New optional fields** for the next minor version, when they have a real-world dealer or buyer-agent driver.
- **Real-world conformance issues.** If you have built a dealer agent or a buyer agent and hit something the spec does not cover, file an issue.
- **Documentation clarity.** Examples that are wrong, walkthroughs that omit steps, ambiguous normative language.

## What is out of scope for v0.2

The following are intentionally out of scope for v0.2; pull requests adding them to v0.2 will not be accepted:

- Authentication beyond no-scheme (public) and `bearer`. (mTLS, OAuth flows, signed requests.)
- Payments / checkout / financing approval. (See ACP for commerce checkout.)
- RFQ / quote / desking flows beyond `offered_price`.
- Trade-in valuation pricing logic.
- Reservations / inventory holds.
- gRPC binding. (A2A's gRPC binding is not adopted by AAP v0.2.)

These may be considered for future major versions.

## Code of conduct

Be civil, be specific, cite sources. Issues and PRs are public; behave accordingly.

## Contact

- Issues and discussions: [github.com/auto-agent-protocol/auto-agent-protocol/issues](https://github.com/auto-agent-protocol/auto-agent-protocol/issues)
- PRs: [github.com/auto-agent-protocol/auto-agent-protocol/pulls](https://github.com/auto-agent-protocol/auto-agent-protocol/pulls)
