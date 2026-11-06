# Releasing Auto Agent Protocol

This repository has one editable source and immutable release snapshots.

- Edit `spec/latest/` and `docs/` during normal development.
- Treat every path registered in `releases.json` as read-only.
- Treat public contract artifacts under `/latest/` as an alias of the registry's approved stable release; `/docs/latest/` remains the editable documentation channel.
- Do not create a `next` directory, URL, tag, or package channel.

## Before preparing a release

Use Node.js from `.nvmrc` and the exact pnpm version in `package.json`'s `packageManager` field, as both CI workflows do. Keep dependency overrides in `pnpm-workspace.yaml` so newer pnpm launchers can read the workspace before selecting the pinned version.

For future major releases, use three separate pull requests, in review order:

1. Specification, schemas, examples and binding behavior.
2. Website, README and visual assets.
3. Generated release snapshots, artifacts and package versions.

Use stacked pull requests when one depends on another. Coordinate merging and
publication so the live website does not advertise an unavailable contract.

1. Merge and pull all approved contract, example, and documentation changes.
2. Confirm the working tree is clean.
3. Run:

   ```bash
   pnpm install --frozen-lockfile
   pnpm validate
   pnpm typecheck
   pnpm test:contract
   pnpm check:releases
   pnpm test:release
   pnpm build
   ```

The independent Protobuf error check also runs in CI. Install the pinned Python dependencies and run it as described in [Conformance](docs/conformance.md#run-the-repository-checks).

4. Choose the next `MAJOR.MINOR.0` version. Additive changes use a minor release; validation-affecting or semantic breaks normally require a major release. The approved exceptions are the 2.0.0 → 2.1.0 PAP 0.2 transition and the 3.1.0 → 3.2.0 published PAP 0.3 transition described below. The maintainer has reserved the next AAP major release for PAP 1.0; this does not authorize unrelated breaking minor changes.

Patch releases are not cut because public contract URLs identify major/minor only. Existing public URLs are never replaced.

## Rehearse first

The examples below prepare the approved 3.2.0 transition from stable 3.1.0. Select the next eligible version from the current registry; never reuse an existing release label.

```bash
pnpm release:prepare 3.2.0 --dry-run
```

Dry-run validation creates candidates in an operating-system temporary directory, prints the structural compatibility report, and leaves the repository byte-for-byte unchanged. Review every reported change. The report intentionally does not certify normative behavior, security, privacy, legal compliance, or interoperability.

The comparison normalizes release URL prefixes and the two generated AAP version constants in Agent Card and Poppy identity schemas. It does not normalize business constants or waive validation changes. An additive minor still requires unchanged meanings for existing payloads and a review of the documented defaults.

A new `dependentSchemas` map is additive only when every triggering property is newly declared on an object that previously rejected additional properties and had no pattern properties. Such constraints cannot run for a previously valid payload. Dependencies on existing fields, changes to existing dependencies, and newly required fields remain validation changes.

## Prepare the reviewable snapshot

Commit the approved editable source, confirm the tree is clean, then run:

```bash
pnpm release:prepare 3.2.0
```

The command:

- copies `spec/latest/` and `docs/` into new version-pinned snapshots;
- replaces non-routable draft identifiers with public release identifiers, preserving explicitly version-pinned historical URLs;
- removes documentation sections enclosed by standalone `{/* aap-draft-only:start */}` and `{/* aap-draft-only:end */}` lines from the release copy only; use these markers for draft-only notices, never contract requirements;
- validates JSON Schema 2020-12 registration, references, and examples;
- creates TypeScript, A2A and Poppy OpenAPI descriptions, and MCP artifact snapshots;
- records the source commit, input hashes, compatibility report, and integrity manifest;
- updates `releases.json`, `versions.json`, stable package versions, and stable generated types;
- leaves the editable `spec/latest/` and `docs/` sources unchanged.

It refuses dirty input, an existing target, a skipped version, a patch contract, and a breaking minor candidate outside the approved PAP transitions. If applying the snapshot fails, it restores every mutable metadata and package file and removes only the newly created target directories.

The command never commits, tags, pushes, publishes npm packages, changes GitHub releases, or deploys the website.

## Approved PAP 0.2 transition

AAP 2.1.0 retains the AAP 2.0 automotive payloads, A2A v1.0 behavior and bridge version `1`, while upgrading the PAP profile from 0.1 to 0.2. The maintainer selected 2.1.0 as an explicit exception to the normal major-release policy. This does not make PAP 0.1 clients compatible: discovery and authentication require the [frozen migration](https://autoagentprotocol.org/docs/v2.1/versioning#pap-02-migration).

`tools/release-prepare.ts` pins this exception to the exact reviewed specification SHA-256 and the 2.0.0 → 2.1.0 version pair. It cannot permit other specification changes or future breaking minor releases. The generated compatibility report records the exception and retains every detected breaking change. Rehearse with `pnpm release:prepare 2.1.0 --dry-run`, then prepare the committed source with `pnpm release:prepare 2.1.0`.

## Approved published PAP 0.3 transition

AAP 3.2.0 replaces the earlier October 26 PAP 0.3 authentication profile with the published PAP 0.3 contract pinned in [Versions and migration](docs/versioning.md#pap-03-migration). Automotive payloads, MCP, A2A and bridge version `1` retain their meanings. The required authentication and discovery changes still require client migration, even though the maintainer selected a minor release and reserved the next AAP major for PAP 1.0.

`tools/release-prepare.ts` permits this exception only for 3.1.0 → 3.2.0 and the exact reviewed `spec/latest` SHA-256 `b8da2aed1b1059e776060f9d83091326803d006085855e53775505c8eb70569b`. Any additional specification change invalidates the exception and needs explicit review. The compatibility report retains every detected breaking change and records the exception; it does not declare older PAP clients compatible. Preserve frozen AAP 3.1 endpoints during migration and complete deployment acceptance before changing default discovery.

## Review and publish explicitly

1. Review the complete diff, especially pinned identifiers and the compatibility report.
2. Run the full validation and production build again.
   Review current diagrams and responsive pages visually, verify Markdown alternates and `llms.txt`, and build all three npm packages. Preserve every previously published snapshot and image.
3. Open and merge a dedicated release pull request.
4. After merge, create the signed tag and GitHub release through the normal maintainer process.
5. Publish packages explicitly and verify their version and contents.
6. Let the reviewed `main` deployment update the website.
7. Verify the pinned version and `/latest/` serve identical stable bytes and that no `autoagentprotocol.invalid` identifier is public.

## Recovery

Never edit a release snapshot to repair a failed release. If preparation fails, confirm `git status` and rerun after fixing the editable source or tooling. If a prepared snapshot is rejected before merge or publication, remove only that new version's generated paths and restore the metadata changes with normal Git operations. Once a release is merged or published, corrections require a new contract version.
