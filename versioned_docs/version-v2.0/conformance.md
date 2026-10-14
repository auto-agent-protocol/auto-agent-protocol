---
sidebar_position: 6
title: Conformance and verification
description: What AAP 2.0 validates automatically and what operators must verify for A2A and Poppy interoperability.
---

# Conformance and verification

AAP 2.0 targets A2A v1.0 and Personal Agent Protocol (Poppy) draft 0.1 at the [pinned upstream baseline](./personal-agent-protocol.md). Conformance means satisfying every mandatory rule and every conditional rule for features a deployment advertises. It does not mean implementing every optional feature of either upstream protocol.

## Specification checks in this repository

Run with Node.js 22+ and pnpm 10 (the same major as CI):

```bash
pnpm install --frozen-lockfile
pnpm validate
pnpm test:contract
pnpm typecheck
pnpm check:images
pnpm check:releases
pnpm test:release
pnpm --filter @autoagentprotocol/schemas build
pnpm --filter @autoagentprotocol/validator build
pnpm check:packages
pnpm build
pnpm check:branding --build
pnpm freeze-check --base origin/main
```

The CI interoperability check also uses the official Python Protobuf decoder, independently of the AAP schemas and JavaScript SDK. With Python 3.10+ and an activated virtual environment:

```bash
python -m pip install -r tools/protojson-requirements.txt
python tools/validate-protojson-errors.py
python tools/validate-protojson-errors.py --spec-dir spec/v2.0
```

| Check | Evidence and scope |
|---|---|
| JSON Schema 2020-12 validation | Registers every schema and resolves references; validates all typed examples, including both discovery documents, OAuth metadata and token response |
| Poppy discovery contract cases | Required native auth, OpenAPI and AAP bridge; upstream-valid website-only migration example; compatible minor-version and unknown field/type tolerance; HTTPS, issuer URL and resource URI constraints |
| Cross-document identity | Original domain versus redirect host, exact issuer equality, authorized domains, RFC 8414 path insertion including trailing-slash issuers, and advertised sign-in dependencies |
| Generated OpenAPI parity | All five native Poppy operations reuse the A2A automotive schemas; validates real request/response examples through their generated component references; requires DPoP and error/challenge headers |
| Official A2A SDK wire test | Pinned `@a2a-js/sdk` 1.3.0 performs actual loopback HTTP discovery and exchanges every skill with a protocol fixture; checks service-parameter headers, tenant propagation, ProtoJSON serialization and preservation of standard Struct error details |
| A2A negative contract tests | Required extension flag and activation examples, one AAP version, HTTPS, modes, signatures, response context, valid generated examples, and standard Any error arrays with typed AAP payloads |
| Independent ProtoJSON decoding | Official Protobuf parser decodes and round-trips every error fixture's Any details; standard Struct payloads unpack without a custom message descriptor |
| Release checks | Snapshot integrity, pinned URLs, release rehearsal/rollback, stable packages, frozen historical versions and published site assembly |
| Image checks | Deterministic SVG generation, existing blue/teal palette, image references and frozen documentation copies |

The A2A test uses the SDK's `SendMessageRequest.fromJSON` / `Message.toJSON` codecs. Its in-memory protobuf objects differ from wire JSON: constructing them with untyped wire-shaped object literals can silently omit data. SDK interoperability must exercise serialized bytes, not just TypeScript assignments.

Poppy's upstream repository publishes prose and examples, not an official conformance SDK or JSON Schema suite at this baseline. The Poppy schemas and tests here are **AAP-maintained interpretations** of that pinned specification. They do not represent an upstream certification. The loopback A2A fixture and generated Poppy API are protocol evidence, not a production dealer implementation.

## Required deployment acceptance cases

Operators MUST run these against the implementation before advertising AAP 2.0. Testing read requests alone cannot establish lead, privacy or authorization correctness. Use isolated test inventory and a non-delivering lead sink for mutation cases.

| Area | Positive case | Negative / isolation cases |
|---|---|---|
| Paired discovery | Both well-known files return JSON; card and native API agree on version and skill subset | Wrong original domain, HTTPS downgrade redirect, unimplemented skill, stale card, placeholder server |
| Issuer binding | Exact issuer and original organization domain in `poppy_domains`; path-bearing RFC 8414 location works | Lookalike issuer, added slash, unauthorized alias, another dealer's issuer |
| Client identity | HTTPS client metadata, matching client ID, same-domain public JWKS and valid private-key assertion | Forged signature, wrong client/audience, expired assertion, reused `jti`, rejected registration, internal-network metadata/JWKS URL |
| Guest sessions | Create, use, renew with same client/User ID and empty account scope | Missing session assertion, another client's or user's session, expired session, account scopes on guest tokens |
| DPoP | Fresh proof, correct key, resource, method/URL and token hash | Missing proof, copied token with a different key, replayed proof, stale proof, wrong `htm`/`htu`/`ath`, wrong dealer resource, required nonce absent |
| Token separation | DPoP accepted at native OpenAPI; optional MCP Bearer restricted to its resource | Bearer accepted at OpenAPI, account token accepted as API credential, token in URL, token leaked to a linked legacy endpoint |
| Skill parity | Same five documented request/response types, or the same declared subset | Wrong path/type combination, unsupported skill, invalid schema, hidden inventory exposed by one binding |
| Consent and leads | Explicit allowed contact channels, original payload and idempotency key preserved on retry | No consent, expired consent, unauthorized channel, spoofed `source_agent` used for auth, renewal creating a second lead, changed payload accepted under the same key |
| Errors | Correct HTTP status/challenge on Poppy; A2A numeric mapping and standard Struct error details on A2A | Auth errors treated as successful skill results, lost validation details, unbounded automatic retries, ignored `Retry-After` |
| Optional capabilities | Every advertised sign-in, MCP, browser or conversation feature works under its upstream rules | A2A mislabeled as Poppy conversations, anonymous MCP advertised as session-aware, missing sign-in endpoints, unauthorized conversation ownership |

Schema acceptance is necessary but not sufficient: it cannot verify live TLS, domain control, cryptographic proofs, replay stores, scope enforcement or CRM delivery. A release PR verifies this specification and its artifacts; each operator remains responsible for passing runtime acceptance before switching its discovery documents.

## Version and release boundaries

- AAP `2.0.0` is an automotive protocol release; Poppy remains draft `0.1` and the AAP Poppy discovery bridge remains version `1`.
- Old AAP contracts remain immutable. Publish the new specification before a runtime advertises its URI.
- Re-review the Poppy baseline when upstream changes. A moving `latest` URL is not evidence that a previously verified implementation still conforms.
- Optional features omitted from discovery do not reduce conformance to this guest API profile. Advertising a feature without implementing its requirements does.
