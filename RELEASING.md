# Releasing Auto Agent Protocol

This repository has one editable source and immutable release snapshots.

- Edit `spec/latest/` and `docs/` during normal development.
- Treat every path registered in `releases.json` as read-only.
- Treat public contract artifacts under `/latest/` as an alias of the registry's approved stable release; `/docs/latest/` remains the editable documentation channel.
- Do not create a `next` directory, URL, tag, or package channel.

## Before preparing a release

1. Merge and pull all approved contract, example, and documentation changes.
2. Confirm the working tree is clean.
3. Run:

   ```bash
   pnpm install --frozen-lockfile
   pnpm validate
   pnpm typecheck
   pnpm check:releases
   pnpm test:release
   pnpm build
   ```

4. Choose the next `MAJOR.MINOR.0` version. Use a minor release only for additive changes; use a major release for validation-affecting or semantic breaks.

Patch releases are not cut because public contract URLs identify major/minor only. Existing public URLs are never replaced.

## Rehearse first

```bash
pnpm release:prepare 1.3.0 --dry-run
```

Dry-run validation creates candidates in an operating-system temporary directory, prints the structural compatibility report, and leaves the repository byte-for-byte unchanged. Review every reported change. The report intentionally does not certify normative behavior, security, privacy, legal compliance, or interoperability.

## Prepare the reviewable snapshot

Commit the approved editable source, confirm the tree is clean, then run:

```bash
pnpm release:prepare 1.3.0
```

The command:

- copies `spec/latest/` and `docs/` into new version-pinned snapshots;
- replaces non-routable draft identifiers with public release identifiers;
- validates JSON Schema 2020-12 registration, references, and examples;
- creates TypeScript, JSON-RPC OpenAPI, and MCP artifact snapshots;
- records the source commit, input hashes, compatibility report, and integrity manifest;
- updates `releases.json`, `versions.json`, stable package versions, and stable generated types;
- verifies that `spec/latest/` did not change.

It refuses dirty input, an existing target, a skipped version, a patch contract, and a breaking minor candidate. If applying the snapshot fails, it restores every mutable metadata and package file and removes only the newly created target directories.

The command never commits, tags, pushes, publishes npm packages, changes GitHub releases, or deploys the website.

## Review and publish explicitly

1. Review the complete diff, especially pinned identifiers and the compatibility report.
2. Run the full validation and production build again.
3. Open and merge a dedicated release pull request.
4. After merge, create the signed tag and GitHub release through the normal maintainer process.
5. Publish packages explicitly and verify their version and contents.
6. Let the reviewed `main` deployment update the website.
7. Verify the pinned version and `/latest/` serve identical stable bytes and that no `autoagentprotocol.invalid` identifier is public.

## Recovery

Never edit a release snapshot to repair a failed release. If preparation fails, confirm `git status` and rerun after fixing the editable source or tooling. If a prepared but uncommitted snapshot is rejected during review, remove only that new version's generated paths and restore the metadata changes with normal Git operations. Once a release is merged or published, corrections require a new contract version.
