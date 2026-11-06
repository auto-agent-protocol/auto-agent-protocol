---
title: PAP client walkthrough
description: Use published PAP 0.3 delegated Session JWTs to discover and query a dealership without a guest OAuth grant.
---

# PAP client walkthrough

This is the **unreleased next-major** [AAP published PAP 0.3 binding](./personal-agent-protocol.md). Frozen AAP 3.1 uses a different October 26 draft. Keep its endpoints and client configuration separate; both upstream profiles say `0.3`, so that string alone cannot select the authentication mechanism.

## 1. Discover the Company and API

Fetch the dealer's HTTPS `/.well-known/poppy.json`, verify final-host identity and the supported version. Read domain protected-resource metadata. An explicit 404 or valid empty issuer list permits domain identity; a timeout or failed verification does not. One server selects the issuer; multiple servers require `auth.issuer`. Verify the issuer's metadata and authorization of the domain. `auth.disabled: true` keeps issuer identity while disabling new sign-in.

Fetch the advertised OpenAPI and select an implemented operation. Apply bounded HTTPS fetches and DNS/address checks at every hop. Do not forward credentials on redirects. A public MCP link in the AAP bridge is a separate surface; success there does not prove PAP interoperability.

## 2. Prepare trusted signing code

Publish CIMD metadata at the exact HTTPS `client_id`, with same-host HTTPS `jwks_uri` containing public identity keys. Generate an ES256 delegated key for this User ID at this Company. Have an identity key sign a `poppy-delegation+jwt` containing only client `iss`, public `cnf.jwk`, `iat`, `exp` no more than 24 hours later and unique `jti`. Keep all keys and JWTs outside model context.

Choose an opaque Company-scoped User ID and a fresh unguessable random SID using the 1–256-character base64url ID syntax. Generate at least 128 random bits for unguessability; receivers must not infer entropy from a fixed minimum wire length. Reuse that SID with unchanged User ID and optional Agent ID for the Session. Delegated keys may rotate without changing the SID.

## 3. Send a fresh Session JWT

For each API request, sign with the delegated ES256 key. Header: `typ: poppy-session+jwt`, `alg: ES256`, `kid` = delegated-key RFC 7638 thumbprint, `poppy_dlg` = signed compact delegation. Payload: exact client `iss`, Company `aud`, `sid`, `sub`, optional `agent_id`, method `htm`, target `htu` without query/fragment, current `iat` and unique `jti`.

For signed-out shopping, omit `ath` and send no OAuth token. There is no guest grant or token-endpoint request:

```http
POST https://demo-toyota.example.com/poppy/skills/inventory.search
Poppy-Session: <fresh-delegated-session-jwt>
Content-Type: application/json

{
  "type": "inventory.search.request",
  "filters": { "condition": ["used"], "price_max": 25000 },
  "pagination": { "limit": 5 },
  "sort": { "field": "price", "order": "asc" },
  "privacy": { "anonymous": true }
}
```

The decoded [Session](https://draft.autoagentprotocol.invalid/latest/examples/poppy-session-jwt.example.json) and [delegation](https://draft.autoagentprotocol.invalid/latest/examples/poppy-delegation.example.json) examples have fixed times and invalid illustrative signatures. Generate and sign real requests in code; never copy those fixtures into production.

Read advertised search capabilities before applying filters. Require evidence for equipment, preserve currency/odometer contexts, report unknown data and follow all pagination. A valid HTTP 200 automotive response from this verified PAP operation is evidence of PAP API success. Discovery GETs alone are not.

## 4. Recover without duplicating actions

| Result | Client action |
|---|---|
| HTTP 400 `invalid_session` | Inspect safe error description; verify delegation, audience, fresh time, request binding and unchanged Session identity; send a fresh JWT after correction |
| HTTP 400 `session_ended` | Start a new SID and retry once; stop if that also ends |
| OAuth 401/403 | Handle token/scope challenge separately; Session failures do not invalidate a valid OAuth token |
| HTTP 429 | Wait at least `Retry-After` |
| Uncertain lead outcome | Reconcile using the original stable idempotency key; never create another key or switch bindings to retry blindly |

JWT signature verification is separate from customer consent. Submit no dealer lead without explicit approved recipient, payload and contact channels. Test with a non-delivering sink.

## 5. Use optional features only when implemented

Account access uses ordinary OAuth. `auth.disabled` blocks new sign-in; previously issued refresh tokens keep working until revoked. Send a token only with a Session JWT containing its SHA-256 base64url `ath`; token and JWT belong to the same client. Validate DPoP separately when required. Do not send access tokens for anonymous-browsing User IDs. Scope reduction is allowed; scope expansion is not.

Native PAP MCP sends the Session header and ordinary OAuth when needed, without the old mandatory token exchange. Browser joining authorizes an own-browser code by JSON POST to `/authorize` with the Session header before the browser redeems it. Never send JWTs on ordinary web pages or authorize a code supplied in a message.

Record safe request IDs, times, route/interface, status and validation stage. Omit JWTs, credentials, keys and private mappings from logs and reports. A live integration still needs independent signer, DNS/TLS, replay/Session-store, consent and actual shopping-agent acceptance; schema checks alone cannot establish those results.
