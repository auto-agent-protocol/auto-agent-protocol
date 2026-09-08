---
sidebar_position: 9
title: Versioning
description: How editable latest work becomes an immutable, version-pinned AAP release.
---

# Versioning

![Versioning workflow: edit latest, verify, snapshot a frozen release, then advance the stable contract-artifact alias](./img/versioning-timeline.svg)

Auto Agent Protocol uses [Semantic Versioning](https://semver.org/) for approved releases. The repository deliberately separates editable work from public releases:

- `spec/latest/` is the only editable specification source.
- `spec/v{major}.{minor}/` is an immutable release snapshot.
- `https://autoagentprotocol.org/latest/` aliases the latest **approved contract release**, not `spec/latest/`.
- `https://autoagentprotocol.org/docs/latest/` serves the editable documentation and links to the newest frozen documentation release.
- There is no `next` directory, URL, or package channel.

The word “latest” therefore has scoped meanings: `spec/latest/` and `/docs/latest/` expose current work, while the public contract-artifact `/latest/` URL means the latest stable release. Draft schema identifiers use the non-routable `https://draft.autoagentprotocol.invalid` namespace so they cannot be mistaken for a public contract.

## SemVer policy

Every release is represented by a full SemVer such as `1.3.0` and a public major/minor contract path such as `v1.3`. Human-facing release labels always use all three SemVer components (`1.2.0`); wire identifiers, folders, and URLs use the corresponding major/minor contract label (`v1.2`). Because the URL cannot distinguish patch snapshots, the release tool only creates `MAJOR.MINOR.0` contracts. Editorial corrections can be made in the editable docs and included in a later release; published snapshots are not rewritten.

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
https://autoagentprotocol.org/v1.3/schemas/vehicle.schema.json
https://autoagentprotocol.org/extensions/aap/v1.3
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

## Public latest and released versions

`releases.json` is the explicit registry of approved releases and names exactly one stable release. The production build copies that frozen contract to both its pinned artifact URL and `/latest/`. Documentation keeps the editable latest pages and every frozen version separately visible.

| URL | Meaning |
|---|---|
| `/v1.3/...` | Immutable production contract |
| `/latest/...` | Alias of the registry's stable release |
| `/docs/latest/...` | Editable latest documentation, with an unreleased banner |
| `/docs/v1.3/...` | Immutable documentation for release 1.3.0 |

Production agents should pin `/v1.3/` (or another advertised contract), because `/latest/` advances when maintainers approve a new release.

## Release process

All normal changes edit `spec/latest/` and `docs/`. A maintainer then rehearses a release:

```bash
pnpm release:prepare 2.0.0 --dry-run
```

After reviewing the compatibility report and committing the approved draft, the maintainer runs the command without `--dry-run`. It copies the working source into new pinned directories, transforms draft identifiers, validates schemas and examples, generates artifacts, records provenance and hashes, updates the stable registry, and leaves `spec/latest/` unchanged.

The command refuses an existing destination, a dirty working tree, a skipped version, a patch contract, or a breaking minor candidate. It does not commit, tag, push, publish packages, or deploy the site. Those remain explicit review steps. See [RELEASING.md](https://github.com/auto-agent-protocol/auto-agent-protocol/blob/main/RELEASING.md) for the maintainer checklist.

## A2A protocol version

AAP's own SemVer above governs the AAP contract. The A2A protocol version is separate and is negotiated per request. A dealer agent's obligations under A2A §3.6.2:

- It MUST process a request using the semantics of the `A2A-Version` the client sent, matching on `Major.Minor`.
- It MUST interpret an empty value as `0.3` — not as the newest version it serves.
- It MUST return `VersionNotSupportedError` (-32009) when the interface does not serve the requested version.
- It MAY expose several interfaces for the same transport at different A2A versions, under the same or different URLs.

An **absent** header is distinct from an explicitly empty value in the wording above. In the AAP 2.0.0 contract, AAP additionally requires a dealer to reject an absent `A2A-Version` with `VersionNotSupportedError` (-32009), not infer a default. That absence rule is an AAP policy. An empty value is interpreted as `0.3` under A2A and rejected when that version is unsupported. Neither rule specifies which error wins when version and extension activation are both invalid.

AAP requires `A2A-Version` and `A2A-Extensions` as HTTP headers on JSON-RPC requests, following A2A §9.2. A2A §3.6.1 mentions a version request parameter, but both its JSON-RPC §9.2 and REST §11.2 binding sections require HTTP headers; this is not a documented REST exception. A query parameter alone does not satisfy AAP's header requirement.

## For implementers

This migration targets **2.0.0**. It changes the accepted card/schema set, response envelopes, and request processing, even where the changes correct A2A conformance rather than introduce a new AAP feature. The frozen v1.3.0 contract, documentation, and versioned packages remain unchanged. New wire behavior MUST NOT be deployed behind the existing v1.3 extension URI.

### Breaking migration checklist

This matrix covers the 2.0.0 changes relative to v1.3.0. Schema validation alone cannot prove behavior such as authorization or extension enforcement; test the wire paths as well.

| Surface | Earlier contract / accepted form | 2.0.0 form | Required migration action |
|---|---|---|---|
| Server response `Message.contextId` | Published response examples omitted it. | Every server `Message` includes a non-empty `contextId`, as the normative A2A `Message.context_id` description requires. | Include it in every successful response; preserve a valid request context when continuing it, otherwise create a context. Update response validators and tests. No Task or Artifact is required by this message-only pattern. |
| JSON-RPC `error.data` | A bare `aap.error` object. | An array of `@type`-tagged detail objects, leading with `google.rpc.ErrorInfo` and including the typed AAP payload. | Change server serialization and parse the form for the advertised contract; retain the raw envelope before a lossy SDK converts it. |
| AAP error `@type` | Absent from the standalone payload schema. | A required constant: `https://autoagentprotocol.org/extensions/aap/error`. | Add the tag to every typed AAP error, including standalone fixtures. Find the payload by this tag, not array position, and ignore unrecognized detail types. |
| `RATE_LIMITED` mapping | JSON-RPC `-32002`. | JSON-RPC `-32000`; A2A reserves `-32002` for task cancellation failure. | Update emitters and mapping tests. Read AAP `code`, `retryable`, and retry hints from the payload; the Python reference SDK loses this unknown-code data without an adapter. |
| `UNSUPPORTED_SKILL` mapping | JSON-RPC `-32601`. | JSON-RPC `-32004`; the existing `SendMessage` method is not missing. | Update emitters and dispatch on payload `code` to distinguish this error from A2A unsupported operations/capabilities sharing `-32004`. |
| Card authentication declaration | `security` with the earlier map shape. | `securityRequirements` containing A2A `SecurityRequirement` objects, with non-empty requirements using `schemes` and scope `list` wrappers. | Rename and reshape the field; retain matching `securitySchemes`. Test that the intended authentication is requested and enforced. Unknown-field tolerance can let an old `security` property pass schema validation while an A2A v1.0 reader interprets the card as anonymous. |
| Required AAP extension flag | The AAP extension could omit `required` or set it to `false`. | The exact contract entry MUST contain `required: true`; presence and value are schema-enforced. | Update every new-contract card and every buyer's explicit activation. A declaration signals claimed understanding/compliance, not proof that a buyer obeys every profile rule. |
| Exactly one AAP version per card | The schema allowed multiple AAP profile URIs. | Exactly one AAP profile URI per card (`maxContains: 1`); unrelated extensions remain allowed. | Give simultaneous AAP versions separate cards and interface URLs, with explicit discovery as described below. Do not put alternative AAP versions into one required-extension list. |
| Request version and extension activation | Earlier AAP examples did not send the A2A headers or prescribe this rejection flow. | Require `A2A-Version: 1.0` and an `A2A-Extensions` list containing the exact advertised URI; reject missing activation with `-32008` and missing/unsupported version with `-32009`. | Update buyers and wrappers before enabling the new contract. Implement server checks before skill execution, and include the exact URI/header in both the activation-error message and AAP-defined metadata. Test missing, empty, incorrect, and valid values without assuming validation order. |
| Non-empty card arrays | `defaultInputModes`, `defaultOutputModes`, and `skills` could be empty under the schema. | Each requires at least one entry. | Populate truthful supported modes and at least one implemented skill; add negative tests for each empty array. |
| Advertised media types | Examples advertised only `application/json`. | Card mode lists name the `application/vnd.autoagent.*` types actually exchanged; skills identify their request/response pair. | Align card defaults, skill modes, `Part.mediaType`, and `acceptedOutputModes`. Treat output modes as alternatives; one unsupported alternative does not invalidate a supported choice. |
| Interface URL transport security | The schema accepted any absolute URI. | HTTPS for every published interface, including additional bindings; loopback HTTP is only for unpublished local development. | Replace non-HTTPS endpoints and bare channel targets with valid URLs, then test the advertised endpoint and certificate. Do not publish the development exception. |
| Optional card signatures | `signatures` had no declared schema constraints. | If present, it is an array of A2A signature objects requiring string `protected` and `signature` members; optional `header` is an object. | Omit signatures when not signing. When signing, emit valid JWS values and validate/verify them; an arbitrary signature object no longer passes the card schema. |
| Optional interface tenant | `tenant` had no declared schema constraints. | If present, it is a string routing value that clients echo in requests to that interface. | Omit it when unused; otherwise provide a string, propagate it through clients/wrappers, and test routing. A prior custom non-string value no longer validates. |

The open `protocolBinding` string is a schema relaxation, but a JSONRPC interface remains required and other advertised bindings must expose equivalent functionality. Declared capabilities must actually work. See [discovery](./discovery.md) and the [JSON-RPC binding](./bindings/json-rpc.md).

An implementation upgrading directly from v1.2 or earlier must also apply the intervening released migrations, including v1.3's authoritative `price`, optional complete `fees` breakdown, and informational `list_price` semantics. It need not deploy each intermediate release, but it must implement the final advertised contract in full. See the [changelog](https://github.com/auto-agent-protocol/auto-agent-protocol/blob/main/CHANGELOG.md); do not assume a direct upgrade skips those obligations.

### Release order and version discovery

Publish the approved, version-pinned specification and artifacts **before** any runtime advertises that new contract. Then update and test buyers, wrappers, and server implementations against it. Only switch discovery to a new card when the corresponding endpoint actually serves the complete new contract. Preparing or merging this draft is not itself a release or runtime cutover.

AAP requires exactly one AAP extension URI per card to select an unambiguous contract. Multiple required extension entries mean all must be activated; they do not negotiate alternative versions. A2A §4.6.3 separately forbids automatic fallback to an earlier extension version.

Operators may choose either a coordinated hard cutover or coexistence; this specification mandates neither a transition duration nor a universal hard cutover. The choice needs an explicit deployment/discovery plan:

- **Hard cutover:** publish the new contract first, communicate the replacement card and interface URL to consumers, and coordinate the switch. Retiring the old endpoint means old clients stop working; a new URI does not make that retirement backward-compatible.
- **Coexistence:** keep each supported contract at its own card and interface URL. The origin's `/.well-known/agent-card.json` can identify one default card; distribute the other card URLs explicitly to clients or through a registry, or serve each version under a separate origin with its own well-known card. A2A's [discovery mechanisms](https://a2a-protocol.org/latest/specification/#82-discovery-mechanisms) include direct configuration and registries, not just the well-known path. State which card is the default and how consumers discover the older one before changing the default.

Buyer-side dual parsing is useful during coexistence, but it does not keep an old server contract alive. Buyers select the exact contract from the discovered card and parse its version-specific envelope. For the legacy object form, verify `type === "aap.error"`; for the new array form, locate the AAP detail by `@type`. Handle A2A protocol errors separately because they need not contain an AAP detail. See [SDK error handling](./errors.md#sdk-error-handling).

Pin the advertised extension and versioned schema URLs. Do not deploy repository draft identifiers, infer compatibility from a similar URI, or depend on `/latest/` remaining on one release.
