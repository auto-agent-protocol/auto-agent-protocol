# Latest-first development and reviewed releases

This implements the agreed structure phase. Fees and platform pricing changes
remain separate follow-up work; this PR does not introduce a new protocol release.

## Agreed invariants

- Edit `spec/latest/` and `docs/` continuously. No second editable root `latest/`
  and no `next` folder, public URL, or package channel.
- Public `/latest/`, `/docs/latest/`, LLM documentation, and stable packages use
  the most recent approved immutable release, never working drafts.
- Release preparation copies **latest → versioned snapshot**. It never copies
  back over working files, commits, pushes, tags, or publishes automatically.
- Preserve existing schemas, examples, released documentation, and served
  artifacts. Freeze v1.2 before working on the fees addition.
- Use one explicit registry rather than treating the highest folder as released.
- Guard complete PRs and deployments; fail closed if the comparison baseline or
  release integrity information is missing.

## Implementation and acceptance

1. Capture the merged-main baseline and compare all existing generated release
   artifacts with their public URLs. Record hashes and provenance.
2. Add the permanent working source, v1.2 documentation snapshot, registry, and
   immutable artifact/integrity snapshots for every existing release.
3. Separate draft validation/generation/preview from stable site/package builds.
   Use correct JSON Schema 2020-12 validation and surface generation failures.
4. Implement `release:prepare VERSION --dry-run`, then explicit preparation:
   validation, conservative compatibility report, pinned identifiers, docs and
   sidebar snapshot, generated artifacts, integrity/provenance, registry and
   package metadata. Refuse overwrites, unsafe versions, and dirty-tree writes.
5. Test release rehearsal and rollback behavior, draft-to-stable isolation,
   unchanged published bytes, complete-PR freeze enforcement (including additions,
   deletions, renames, and missing baselines), and all generated references.
6. Verify production and local draft docs, packages, branding, and CI. Open
   `feat/restructure` for review without merging or publishing a release.

## Follow-up plan (not implemented here)

1. Add the approved `{ name, amount }` dealer-fee objects to the working contract,
   with rooftop defaults, complete vehicle overrides, and explicit unknown/empty
   semantics. Preserve negotiated versions and existing pricing names.
2. Address price precision, tax terminology, and legal documentation explicitly;
   do not silently change an existing published version's meaning.
3. In aap-platform, preserve provider prices, including SpaceAuto price/list-price
   mappings, and apply one audited publication policy across every output.
4. Rehearse and review the fees release before publishing. No branch name should
   contain the disallowed prefix.
