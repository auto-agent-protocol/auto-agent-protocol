---
sidebar_position: 10
title: Contributing
description: How to propose and validate changes to the editable AAP specification.
---

# Contributing

Auto Agent Protocol is developed in public at [github.com/auto-agent-protocol/auto-agent-protocol](https://github.com/auto-agent-protocol/auto-agent-protocol). The specification and schemas use Apache-2.0; documentation prose uses CC-BY-4.0.

## Propose a change

1. Open an issue describing the real-world interoperability problem and the proposed contract behavior.
2. Let maintainers confirm the direction and expected SemVer impact.
3. Open a focused pull request against `main`.
4. Update schemas, examples, normative documentation, and tests together where relevant.
5. Run the complete validation suite before requesting review.

```bash
pnpm install
pnpm validate
pnpm typecheck
pnpm check:releases
pnpm test:release
pnpm build
```

## Repository paths

| Path | Purpose |
|---|---|
| `spec/latest/` | Editable schemas, examples, and skill manifest. Contract changes go here. |
| `docs/` | Editable documentation shown by the local draft server. |
| `spec/v*/` | Frozen specification releases. Never edit. |
| `versioned_docs/`, `versioned_sidebars/` | Frozen release documentation. Never edit. |
| `releases/v*/` | Reviewed generated artifacts, provenance, reports, and integrity manifests. Never edit. |
| `releases.json` | Explicit release registry and stable-release pointer. |
| `generated/latest/` | Uncommitted draft generation output. |
| `packages/` | Packages built from the registry's stable release. |
| `tools/` | Validators, generators, release preparation, and integrity checks. |

There is no `next` channel. Local `pnpm start` serves the editable documentation with an unreleased banner at `/docs/latest/`. Production builds exclude that draft and make `/docs/latest/` an alias of the frozen stable release.

## Released versions are frozen

Do not edit, delete, rename, or add files within any existing release directory. This applies to old docs and examples as well as schemas. The whole-PR freeze check and SHA-256 manifests enforce that rule. If a released contract needs a correction, propose the correction in `spec/latest/` and release a new minor or major contract as required.

The single compatibility branding alias documented in the brand guide is managed separately; it must not contain protocol content.

## Generated files

`pnpm generate` writes draft artifacts only to `generated/latest/`. It never updates a stable package or release snapshot. `pnpm copy-static` assembles the site from immutable release data and mirrors the registry's stable release to public `/latest/`.

Only the explicit release command creates a version directory:

```bash
pnpm release:prepare 1.3.0 --dry-run
```

Release preparation is a maintainer operation, not a normal contribution step. It requires a clean tree, refuses overwrites, and performs no commit, tag, push, publication, or deployment.

## Review expectations

- Explain the observed dealer or buyer-agent need.
- Keep fields optional unless interoperability requires otherwise.
- State privacy, consent, security, and compatibility consequences.
- Include positive and negative examples where validation behavior changes.
- Avoid provider-specific semantics in the open contract.
- Treat a green structural compatibility report as evidence, not final approval.

## Community

Be civil, be specific, and cite sources. Use [issues](https://github.com/auto-agent-protocol/auto-agent-protocol/issues) for proposals and [pull requests](https://github.com/auto-agent-protocol/auto-agent-protocol/pulls) for reviewed changes.
