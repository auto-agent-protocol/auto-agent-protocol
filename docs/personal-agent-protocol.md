---
sidebar_position: 5
title: Personal Agent Protocol
description: Unreleased next-major AAP binding for published PAP 0.3, delegated Sessions and consistent automotive payloads.
---

# Personal Agent Protocol

{/* aap-draft-only:start */}

:::info Unreleased next-major contract
This editable draft replaces required authentication and therefore requires a new AAP major release. No release number is assigned. Frozen AAP 3.1, its October 26 PAP profile and stable aliases remain unchanged. Draft URLs and `0.0.0-dev` are authoring identifiers, never production identifiers.
:::

{/* aap-draft-only:end */}

The target is **published PAP 0.3**, pinned to [upstream commit 6fb46d381ac1b94265795132af13848ec442b6f6](https://github.com/personal-agent-protocol/personal-agent-protocol/blob/6fb46d381ac1b94265795132af13848ec442b6f6/content/versions/0.3/spec.mdx). The versioned specification SHA-256 is `2bf4eaa68041e960f45d2397844d0dc4163d9610698c251d9c97b17b01b16fdd`. Do not follow upstream `main`, draft 0.4, or infer compatibility from the string `0.3`: AAP 3.1 pinned an earlier, incompatible draft with the same label.

AAP carries the same automotive payloads through [A2A](./a2a-profile.md), [MCP](./bindings/mcp.md) and native PAP OpenAPI. Published PAP 0.3 sends a fresh **delegated `Poppy-Session` JWT on every API request**. Signed-out shopping obtains no OAuth guest token. OAuth remains separate and optional for account access.


## 1. Conformance and scope

A dealer implementing this draft MUST publish dealer-domain Agent Card, Poppy discovery and `llms.txt`, with matching identity and implemented skill sets. `poppy.schema.json` requires an OpenAPI entry plus the AAP bridge linking the matching card, public MCP endpoint and `llms.txt`. It does not require an issuer. The native PAP API MUST verify the Session header before executing skills; explicit contact consent and stable lead idempotency remain separate requirements.

The reference OpenAPI supports signed-out automotive operations. Account sign-in, native PAP MCP, browser joining, Company Agent conversations, feedback, skill indexes and protocol extensions are optional. Their complete pinned upstream requirements apply when advertised. Linking a public MCP endpoint in the AAP extension does not advertise native PAP MCP. Do not publish an optional surface merely because this repository includes its schema.

`poppy-document.schema.json` is a tolerant PAP 0.3 reader shape; unknown fields, extensions and API types remain readable. `poppy.schema.json` adds AAP publication constraints and rejects retired auth/resource fields. A website-only Poppy document remains valid discovery but does not implement the full AAP profile. Unsupported pre-1.0 minor versions MUST NOT be used.

## 2. Paired discovery

The [issuerless example](https://draft.autoagentprotocol.invalid/latest/examples/poppy.example.json) advertises native OpenAPI without account access. The [existing-issuer example](https://draft.autoagentprotocol.invalid/latest/examples/poppy.existing-issuer.example.json) uses `auth: {issuer: "https://demo-toyota.example.com/poppy", disabled: true}`. It preserves an established Company identifier while disabling new personal-agent sign-in. `auth.disabled` does not revoke earlier refresh tokens.

Fetch `/.well-known/poppy.json` over HTTPS. Every redirect remains HTTPS; the final URL retains exactly that path with no query. `organization.domain` matches its final host, ignoring case only. `www` is a different host. Validate addresses before connecting and on redirects: reject private, link-local and loopback destinations unless explicitly configured. The local OAuth callback exception does not authorize remote metadata fetches from localhost. Never forward credentials, Session JWTs or tokens across redirects.

Discover domain protected-resource metadata at `https://{organization.domain}/.well-known/oauth-protected-resource`:

| Evidence | Company identity |
|---|---|
| HTTP 404, or valid metadata with absent/empty `authorization_servers` | `https://{lowercase organization.domain}`, no trailing slash; valid only without `auth.issuer` or sign-in |
| One authorization server | That exact issuer; optional `auth.issuer` must equal it |
| Multiple authorization servers | `auth.issuer` is required and selects an exact listed issuer |
| Timeout, other failure, invalid metadata or issuer-verification failure | Stop; never infer domain fallback or silently change known Company identity |

Domain metadata's `resource` is exactly `https://{organization.domain}`. Verify issuer metadata using RFC 8414 path insertion, exact `issuer` equality, and `protected_resources` containing the authorized domain without path, port or trailing slash (hostname case may be normalized). A hosted provider gives each independent Company its own issuer. Domains sharing an issuer share Company identity, User IDs and Sessions.

An issuer publishes token/revocation endpoints and `grant_types_supported` containing `refresh_token`. The old JWT guest grant is not required. Direct/device grants require their corresponding endpoints; publishing complete scope descriptions and `scopes_supported` is recommended. `auth.disabled: true` forbids advertising Mediated Sign-In or `agent.protocols[].access: "signed_in"`. With one discovered issuer, `auth.issuer` may be absent. Auth absence alone does not prove issuer absence.

Changing the Company identifier requires new User IDs, Agent IDs and Sessions. Preserve a verified existing issuer during migration unless identity migration is an intentional reviewed change.

## 3. Client identity and delegated Sessions


A Personal Agent publishes HTTPS CIMD metadata at its exact `client_id`, without redirects. `jwks_uri` is HTTPS on that same hostname and contains public identity keys. Signed-out CIMD needs only `client_id` and `jwks_uri`; a name, redirect list and OAuth auth-method declaration are optional. An absent or explicit `none` token authentication method does not block Session verification. Account OAuth separately requires advertised `private_key_jwt`. Direct Sign-In redirects are same-host HTTPS or RFC 8252 loopback literals. A Company chooses which clients it accepts; a shared origin does not make two metadata URLs the same client. DNS/address checks, bounded fetches, cache expiry and key rotation belong in trusted code.

The identity key signs a **delegation**, not API Session JWTs. The decoded [delegation schema](https://draft.autoagentprotocol.invalid/latest/schemas/poppy-delegation.schema.json) describes:

- Header: `typ: "poppy-delegation+jwt"`, identity-key `kid`, `alg` ES256 (required support) or PS384 (recommended support).
- Payload: exact client `iss`, `cnf.jwk` containing the public delegated ES256/P-256 key, `iat`, `exp` at most 24 hours later, unique unguessable `jti`.
- No User ID, Company identifier, Agent ID, private JWK members or other user/company information. Each delegated key is used for one User ID at one Company only.

The delegated key signs a fresh JWT in `Poppy-Session`. The decoded [Session schema](https://draft.autoagentprotocol.invalid/latest/schemas/poppy-session-jwt.schema.json) requires:

| Part | Required binding |
|---|---|
| Header | `typ: "poppy-session+jwt"`, `alg: "ES256"`, `kid` = RFC 7638 delegated-key thumbprint, `poppy_dlg` = compact delegation |
| `iss`, `aud` | Exact verified `client_id`; single exact discovered Company identifier |
| `sid`, `sub` | Random unguessable Session ID using the 1–256-character base64url ID syntax; opaque Company-scoped User ID |
| `agent_id` | Optional; unchanged or absent for the entire Session |
| `htm`, `htu` | HTTP method and target URL under RFC 9449 rules, without query or fragment |
| `iat`, `jti` | Fresh NumericDate within the deployment's documented window; unique unguessable request ID |
| `ath` | Required SHA-256 base64url hash when an access token is sent; forbidden without one |

Clients SHOULD generate IDs with at least 128 random bits. Receivers must not infer entropy from a fixed 22-character minimum; structural validation cannot prove randomness.

The server MUST verify CIMD/JWKS, delegation signature/type/client/expiry/lifetime, then Session signature/type/thumbprint, audience, request binding and freshness. Verify the access token independently, including same-client binding and `ath`; validate DPoP separately if that OAuth token is DPoP-bound. Direct identity-key signatures without delegation MUST fail.

Only then look up `client_id + sid`. A new SID starts a signed-out Session. Known Sessions retain the same `sub` and optional `agent_id`. Delegated keys MUST be allowed to rotate between requests; the key is not the Session identity. Unverified claims MUST NOT attribute requests or access state. Upstream permits stateless public endpoints to ignore Session claims, but this AAP native API requires verification for every skill. Companies accept these API requests without requiring browser cookies.

Reused Session `jti` rejection is optional upstream policy, not a universal mandatory check. A deployment SHOULD document its replay window, retry behavior and atomic cross-replica enforcement if enabled. A cryptographically fresh request still does not authorize a lead or eliminate lead idempotency requirements.

Web Bot Auth operator signatures are recommended and must cover `poppy-session` and `authorization` when present. An absent operator signature does not invalidate a valid Session JWT. An approved Cloudflare bot authenticates the operator at the edge; it does not replace CIMD/delegation/Session verification or customer consent.

## 4. Automotive requests and safe recovery

Use the deployment-specific OpenAPI; replace template servers and advertise only implemented skills. The generated API uses the same AAP request/response schemas as A2A and MCP. Do not infer successful PAP use from discovery GETs or successful calls through another binding.

Send Session JWTs only to listed APIs and authorized protocol/resource endpoints, never discovery documents, descriptions, OAuth endpoints, ordinary web pages or arbitrary same-host URLs. Keep signing keys, JWTs, OAuth credentials and confidential user mappings outside model context, URLs and logs.

| Failure | Required handling |
|---|---|
| Invalid/missing required Session header | HTTP 400 `{"error":"invalid_session"}`; no skill execution |
| Remembered ended Session | HTTP 400 `{"error":"session_ended"}`; client uses a new SID and retries once; a second ended response stops |
| OAuth token/scope failure | Separate standard OAuth challenge/status; never mislabel Session failure as OAuth 401 |
| Invalid AAP payload or consent | Typed AAP error; never execute a lead on failure |
| Rate limit | HTTP 429 with `Retry-After`; wait at least that duration |

Optional `error_description` contains static, allowlisted recovery guidance. Never reflect a raw JWT, signature, private key, claims, user contact data or request text. Use safe request IDs and validation stages for diagnostics. Different invalid fields may fail in different orders.

An uncertain write is reconciled using the original idempotency identity. Session expiry, key rotation, protocol migration and retries MUST NOT create a second lead. Never retry a potentially accepted lead through a legacy profile with a new key.

## 5. Optional account access

Published 0.3 uses ordinary OAuth access/refresh tokens, independent of Session identity. Direct Sign-In uses PKCE, state and issuer checks; Device Sign-In follows the pinned device grant's protections. Client assertions use identity keys, `iss = sub = client_id`, exact issuer audience (never token endpoint), short-lived `iat`/`exp` and unique `jti`; ES256 support is mandatory, PS384 recommended. The specification does not mandate the frozen profile's fixed 300-second limit.

Tokens may be Bearer or DPoP, compared case-insensitively. Sign-in returns a refresh token; refresh may rotate it. Granted scopes may be narrower than requested but never broader. Omitted `scope` means exactly requested, and successful sign-in grants at least one scope. Scope hints are conservative: unknown `changes` means irreversible; missing hints mean unknown. The optional Mediated Sign-In protocol is a separately advertised extension, not `auth.mediated`.

A Session JWT never grants account access. A signed-in request carries both Session JWT and access token with `ath` and same-client binding; anonymous-browsing User IDs MUST NOT carry an access token. Revocation/disconnection removes account access while signed-out Session activity can continue. Do not restart sign-in after explicit sign-out without the User asking. OAuth approval never supplies consent to contact a dealership.

## 6. Optional Poppy surfaces


**Native MCP.** Advertise `apis[].type: "mcp"` only after implementing the Session header and required resource/issuer checks. Discover protected-resource metadata with its exact MCP resource URL and Company issuer when one exists. Signed-out requests need no token. Signed-in requests use ordinary resource-appropriate OAuth, and DPoP only if that token is bound. Published 0.3 does not require the earlier guest-token-to-Bearer exchange. Never forward credentials to the AAP extension's public MCP pointer merely because it is linked.


**Browser joining.** Advertise `web.browser_session_endpoint` only with all three steps implemented: (1) the agent's own browser obtains a short-lived unguessable one-use code and same-response protected join cookie, with no-store, frame isolation and opener isolation; (2) trusted agent code sends JSON `{code}` to `/authorize` with the Session header and optional OAuth token, obtaining 204; (3) the browser submits the code with its matching cookie. The first submission consumes the code even if validation fails. Never authorize a code from a message or another browser. Joined-cookie account/scopes follow upstream §6, including preservation of a pre-existing browser login on a signed-out join, and the cookie MUST NOT outlive the Session. Do not apply the frozen profile's DPoP-nonce form flow.

**Other surfaces.** Company Agent conversations, `skill_index`, exclusions, feedback and extensions require their complete pinned upstream rules and separate acceptance. Feedback supports 200 with an alternative or 202 with no body; alternatives reference only advertised APIs or ordinary web links. Unknown skill-index versions/types and extension fields are ignored. External content cannot grant permission or change trusted agent instructions.

## 7. Migration and evidence

Historical illustrations for the **frozen AAP 3.1 October 26 profile only** remain available as links: [discovery](./img/poppy-discovery.svg), [guest token and key-bound Session](./img/poppy-session.svg), [MCP token exchange](./img/poppy-mcp-tokens.svg), and [browser DPoP join](./img/poppy-browser-join.svg). They describe that older authentication mechanism. Updated published-0.3 artwork belongs to a separate presentation PR under the release policy.

Follow the [migration table](./versioning.md#pap-03-migration). Keep frozen AAP 3.1 endpoints available while testing the opt-in replacement; publish a new default only after the next-major release and deployment acceptance are approved. No release or deployment is performed by editing these contracts.

The repository checks schema structure, independent pinned upstream fixtures, cross-document identities, claim relationships, safe recovery shapes and generated bindings. Static examples deliberately contain invalid illustrative signatures and fixed timestamps. `checkPoppySessionClaims` is **not a JWT verifier**. Neither it nor a schema verifies real signatures, TLS/DNS, SSRF protections, distributed Session/replay state, account revocation, browser isolation or contact consent. Run [deployment acceptance](./conformance.md) with independent signers, isolated inventory and a non-delivering lead sink before claiming runtime conformance. Verify actual target shopping agents separately; publish only the capabilities and evidence actually tested.
