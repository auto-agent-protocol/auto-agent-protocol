---
sidebar_position: 9
title: Versioning
description: How editable latest work becomes an immutable, version-pinned AAP release.
---

# Versioning

![Versioning timeline: frozen releases lead to the stable latest alias](/img/v1.2/versioning-timeline.png)

Auto Agent Protocol uses [Semantic Versioning](https://semver.org/) for approved releases. The repository deliberately separates editable work from public releases:

- `spec/latest/` is the only editable specification source.
- `spec/v{major}.{minor}/` is an immutable release snapshot.
- `https://autoagentprotocol.org/latest/` aliases the latest **approved release**, not `spec/latest/`.
- There is no `next` directory, URL, or package channel.

The word “latest” therefore has two scoped meanings: `spec/latest/` means the latest work under review inside the repository, while the public `/latest/` URL means the latest stable release. Draft identifiers use the non-routable `https://draft.autoagentprotocol.invalid` namespace so they cannot be mistaken for a public contract.

## SemVer policy

Every release is represented by a full SemVer such as `1.3.0` and a public major/minor contract path such as `v1.3`. Because the URL cannot distinguish patch snapshots, the release tool only creates `MAJOR.MINOR.0` contracts. Editorial corrections can be made in the editable docs and included in a later release; published snapshots are not rewritten.

| Change | Required release |
|---|---|
| New optional field, schema, skill, or behavior | Minor |
| Removed or renamed field; tighter type or enum | Major |
| Changed required-field meaning | Major |
| Documentation or example changes included in a snapshot | Next minor or major snapshot |

The automated compatibility report is conservative and structural. A minor candidate is refused when it detects a validation-affecting change. Passing that check does not replace maintainer review of semantics, security, legal text, or interoperability.

## Stable identifiers

Released schemas and extensions are version-pinned:

```text
https://autoagentprotocol.org/v1.2/schemas/vehicle.schema.json
https://autoagentprotocol.org/extensions/aap/v1.2
```

The schema `$id` matches its public URL. Relative `$ref` values stay within the same release. A dealer advertises the supported AAP version through the A2A extension URI; buyer agents should use the exact version the dealer advertises.

## Immutability

A release freezes all material needed to reproduce and review it:

- schemas, examples, and `skills.yaml`;
- documentation and sidebar snapshots;
- generated TypeScript, JSON-RPC OpenAPI, and MCP artifacts;
- release provenance, compatibility report, and SHA-256 integrity manifest;
- version-specific documentation images referenced by the snapshot.

CI compares the entire pull request with its base commit and rejects additions, edits, deletions, copies, or renames within an already released path. Integrity manifests also detect local or post-merge drift. Release artifacts are copied from their reviewed snapshots; old releases are never regenerated with newer tooling.

## The public `latest` alias

`releases.json` is the explicit registry of approved releases and names exactly one stable release. The production build copies that frozen release to both its pinned URL and `/latest/`.

| URL | Meaning |
|---|---|
| `/v1.2/...` | Immutable production contract |
| `/latest/...` | Alias of the registry's stable release |
| `/docs/latest/...` | Stable documentation alias |

Production agents should pin `/v1.2/` (or another advertised contract), because `/latest/` advances when maintainers approve a new release.

## Release process

All normal changes edit `spec/latest/` and `docs/`. A maintainer then rehearses a release:

```bash
pnpm release:prepare 1.3.0 --dry-run
```

After reviewing the compatibility report and committing the approved draft, the maintainer runs the command without `--dry-run`. It copies the working source into new pinned directories, transforms draft identifiers, validates schemas and examples, generates artifacts, records provenance and hashes, updates the stable registry, and leaves `spec/latest/` unchanged.

The command refuses an existing destination, a dirty working tree, a skipped version, a patch contract, or a breaking minor candidate. It does not commit, tag, push, publish packages, or deploy the site. Those remain explicit review steps. See [RELEASING.md](https://github.com/auto-agent-protocol/auto-agent-protocol/blob/main/RELEASING.md) for the maintainer checklist.

## For implementers

- Pin the version advertised by the dealer; do not infer compatibility.
- Validate against version-pinned schema URLs.
- A dealer may advertise multiple extension versions during migration.
- Do not use repository draft identifiers on the wire.
- Do not depend on `/latest/` remaining on the same release.
