---
sidebar_position: 6
title: Conformance and verification
description: What AAP 2.1 validates automatically and what operators must verify for A2A and Poppy interoperability.
---

# Conformance and verification

AAP 2.1 targets A2A v1.0 and Personal Agent Protocol (Poppy) draft 0.2 at the [pinned upstream baseline](./personal-agent-protocol.md). Conformance means satisfying every mandatory rule and every conditional rule for features a deployment advertises. It does not mean implementing every optional feature of either upstream protocol.

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
python tools/validate-protojson-errors.py --spec-dir spec/v2.1
```

| Check | Evidence and scope |
|---|---|
| JSON Schema 2020-12 validation | Registers every schema and resolves references; validates all typed examples, including both discovery documents, OAuth metadata and token response |
| Poppy discovery contract cases | Required native auth, OpenAPI and AAP bridge; upstream-valid website-only migration example; unsupported pre-1.0 version rejection and unknown field/type tolerance; optional feedback and ES256 metadata; HTTPS, issuer URL and resource URI constraints |
| Cross-document identity | Final discovery host without www normalization, exact issuer equality, authorized domains, RFC 8414 path insertion including trailing-slash issuers, and advertised sign-in dependencies |
| Client handshake contract | Metadata and same-domain keys/redirects, distinct client/session subjects, exact issuer audiences, 300-second lifetime boundary, complete form fields and consistent decoded examples; no signature or replay-store verification |
| Generated OpenAPI parity | All five native Poppy operations reuse the A2A automotive schemas; validates real request/response examples through their generated component references; requires DPoP and error/challenge headers |
| Official A2A SDK wire test | Pinned `@a2a-js/sdk` 1.3.0 performs actual loopback HTTP discovery and exchanges every skill with a protocol fixture; checks service-parameter headers, tenant propagation, ProtoJSON serialization and preservation of standard Struct error details |
| A2A negative contract tests | Required extension flag and activation examples, one AAP version, HTTPS, modes, signatures, response context, valid generated examples, and standard Any error arrays with typed AAP payloads |
| Independent ProtoJSON decoding | Official Protobuf parser decodes and round-trips every error fixture's Any details; standard Struct payloads unpack without a custom message descriptor |
| Release checks | Snapshot integrity, pinned URLs, release rehearsal/rollback, stable packages, frozen historical versions and published site assembly |
| Image checks | Deterministic SVG generation, existing blue/teal palette, image references and frozen documentation copies |

The A2A test uses the SDK's `SendMessageRequest.fromJSON` / `Message.toJSON` codecs. Its in-memory protobuf objects differ from wire JSON: constructing them with untyped wire-shaped object literals can silently omit data. SDK interoperability must exercise serialized bytes, not just TypeScript assignments.

PAP's [upstream Company implementation kit](https://github.com/personal-agent-protocol/personal-agent-protocol/tree/39b35bdf240fc07f157d6ca4e29b5a41d4b36b5d/kit/company) includes schemas and runtime checks. This repository's schemas and checks are AAP-maintained and follow the pinned normative PAP 0.2 specification when supporting kit text differs. Neither structural validation nor the loopback A2A fixture certifies a deployed Company or personal-agent client. Operators run the kit's authenticated runtime checks separately against their deployments.

## Required deployment acceptance cases

Operators MUST run these against the implementation before advertising AAP 2.1. Testing read requests alone cannot establish lead, privacy or authorization correctness. Use isolated test inventory and a non-delivering lead sink for mutation cases.

| Area | Positive case | Negative / isolation cases |
|---|---|---|
| Paired discovery | Both well-known files return JSON; card and native API agree on version and skill subset | Wrong final domain, www mismatch, HTTPS downgrade redirect, unimplemented skill, stale card, placeholder server |
| Issuer binding | Exact issuer and final organization domain in `poppy_domains`; path-bearing RFC 8414 location works | Lookalike issuer, added slash, unauthorized alias, another dealer's issuer |
| Transport isolation | HTTPS discovery redirects with verified final identity; authenticated calls use the advertised endpoint | Token/API 3xx forwards credentials; peer-supplied URLs resolve to private, loopback or link-local addresses without explicit configuration |
| Client identity | HTTPS client metadata, matching client ID, same-domain public JWKS and two valid issuer-audience assertions | Forged signature, wrong client, endpoint/array audience, expired or over-300-second assertion, reused `jti`, rejected registration, internal-network metadata/JWKS URL |
| Guest sessions | Create, use, renew with same client/User ID and empty account scope | Missing session assertion, another client's or user's session, expired session, account scopes on guest tokens |
| DPoP | ES256 proof, per-User-ID key, correct resource, method/URL and token hash; nonce retry | Missing proof, copied token with a different key, replayed token-endpoint proof, stale proof, wrong `htm`/`htu`/`ath`, wrong dealer resource, required nonce absent |
| Token separation | DPoP at OpenAPI and DPoP-capable MCP; legacy MCP Bearer restricted to its exact URL | Bearer accepted at OpenAPI or DPoP-capable MCP, MCP token accepted at another path, account token accepted as API credential, token in URL, token leaked to a linked legacy endpoint |
| Skill parity | Same five documented request/response types, or the same declared subset | Wrong path/type combination, unsupported skill, invalid schema, hidden inventory exposed by one binding |
| Consent and leads | Explicit allowed contact channels, original payload and idempotency key preserved on retry | No consent, expired consent, unauthorized channel, spoofed `source_agent` used for auth, renewal creating a second lead, changed payload accepted under the same key |
| Errors | Correct HTTP status/challenge on Poppy; A2A numeric mapping and standard Struct error details on A2A | Auth errors treated as successful skill results, lost validation details, unbounded automatic retries, ignored `Retry-After` |
| Optional capabilities | Every advertised sign-in, MCP, browser, feedback or conversation feature works under its upstream rules | A2A mislabeled as Poppy conversations, anonymous MCP advertised as session-aware, missing sign-in endpoints, unauthorized conversation ownership |

Schema acceptance is necessary but not sufficient: it cannot verify live TLS, domain control, cryptographic proofs, replay stores, scope enforcement or CRM delivery. A release PR verifies this specification and its artifacts; each operator remains responsible for passing runtime acceptance before switching its discovery documents.

## Version and release boundaries

- AAP `2.1.0` is an automotive protocol release; Poppy remains draft `0.2` and the AAP Poppy discovery bridge remains version `1`.
- Old AAP contracts remain immutable. Publish the new specification before a runtime advertises its URI.
- Re-review the Poppy baseline when upstream changes. A moving `latest` URL is not evidence that a previously verified implementation still conforms.
- Optional features omitted from discovery do not reduce conformance to this guest API profile. Advertising a feature without implementing its requirements does.
