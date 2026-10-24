---
title: PAP client walkthrough
description: Discover a PAP 0.2 dealer, authenticate a guest session and search inventory with verifiable protocol evidence.
---

# PAP client walkthrough

This walkthrough implements the [AAP PAP 0.2 profile](./personal-agent-protocol.md). The domains and credentials below are illustrative. Sign and send requests in client code; do not ask a language model to manufacture JWTs or expose credentials in its context.

## Before the first request

A guest shopper needs no dealer account. The **personal agent still needs its own identity**: an HTTPS metadata URL and a private signing key whose public key is published in its JWKS. For example, `https://buyer-agent.example/client.json` returns:

```json
{
  "client_id": "https://buyer-agent.example/client.json",
  "client_name": "Example Buyer Agent",
  "jwks_uri": "https://buyer-agent.example/jwks.json",
  "redirect_uris": [],
  "token_endpoint_auth_method": "private_key_jwt"
}
```

An empty redirect list is sufficient for this guest-only flow. The JWKS contains only public identity keys. Keep the private identity key in a secret store; use a separate DPoP key pair for each issuer-specific User ID. Both assertions below use the identity key, while proofs use the DPoP key. A Company may additionally require client registration, but registration is not customer sign-in.

If an assistant only has a browser or an ordinary HTTP tool, verify that its host can publish this identity, sign requests, protect secrets and handle nonces before claiming native PAP support. Reading protocol documentation or sending an unsigned token request does not establish that capability.

## 1. Discover and verify

1. Fetch `https://demo-toyota.example.com/.well-known/poppy.json`. Follow HTTPS redirects only and retain the final URL. Support PAP `0.2` explicitly.
2. Match `organization.domain` to the final URL's host, ignoring case only. Do not remove `www` or bind the document to the host before a redirect.
3. Read `auth.issuer`. For `https://demo-toyota.example.com/poppy`, fetch `https://demo-toyota.example.com/.well-known/oauth-authorization-server/poppy`.
4. Require metadata `issuer` to equal `auth.issuer` character for character. Require `poppy_domains` to include the final organization domain, ignoring case. Only then use its OAuth endpoints.
5. Select a supported `apis` entry, fetch its OpenAPI document, and use its real server and operation paths. Retain the API's exact `resource` if present. Do not use the protocol website's reference server as a dealership.

## 2. Sign two assertions and one proof

These values have different purposes:

| Value | Where it is used | Example |
|---|---|---|
| Company issuer | Both assertion `aud` values; per-Company User ID namespace | `https://demo-toyota.example.com/poppy` |
| Token endpoint | Token request URL and its proof `htu` | `https://demo-toyota.example.com/poppy/oauth/token` |
| API resource | Token request `resource`, if advertised | `https://demo-toyota.example.com/poppy` |
| Skill endpoint | API request URL and its proof `htu` | `https://demo-toyota.example.com/poppy/skills/inventory.search` |

Create separate signed JWTs with these claims. Each assertion uses `iat` = current Unix time, `exp` later than `iat` and no more than 300 seconds later, and a distinct fresh `jti` with at least 128 random bits. For example, encode 16 cryptographically random bytes as base64url. A UUIDv4 has only 122 random bits and does not meet that assertion requirement by itself.

| JWT | Signing key | Required payload |
|---|---|---|
| Client assertion | Published identity key | `iss` and `sub` = client metadata URL; `aud` = exact issuer; `iat`, `exp`, `jti` |
| Session assertion | Published identity key | `iss` = client metadata URL; `sub` = opaque User ID for this issuer; `aud` = exact issuer; `iat`, `exp`, `jti` |
| Token-request DPoP proof | Separate per-User-ID key | `htm: "POST"`, `htu` = token endpoint without query/fragment, fresh `iat`, `jti`, and `nonce` if challenged; no `ath` |

An assertion audience must be a **single string**, not an array. The token endpoint is never an accepted audience in PAP 0.2. The client and session assertions cannot be the same JWT: their subjects differ and their IDs must be distinct. Neither assertion replaces DPoP.

For an ES256 identity key, use a JWT header such as `{"alg":"ES256","typ":"JWT","kid":"example-identity-key"}`, with `kid` identifying the published public key. The DPoP header instead uses `{"typ":"dpop+jwt","alg":"ES256","jwk":{...}}`, with the proof's **public** JWK. Never include a private JWK member. Companies must support ES256 for DPoP.

The [client metadata](https://autoagentprotocol.org/v3.0/schemas/poppy-client-metadata.schema.json), [client assertion](https://autoagentprotocol.org/v3.0/schemas/poppy-client-assertion.schema.json), [session assertion](https://autoagentprotocol.org/v3.0/schemas/poppy-session-assertion.schema.json) and [token request](https://autoagentprotocol.org/v3.0/schemas/poppy-session-request.schema.json) schemas describe these shapes. Their static examples contain illustrative, invalid signatures and fixed timestamps; regenerate and sign them in code. Schema validation cannot authenticate a JWT or prove randomness, freshness or replay protection.

## 3. Obtain a signed-out Session Token

Disable automatic redirects for authenticated requests (for example, `redirect: "error"` with `fetch`). A redirect outside discovery must never receive the original tokens, proofs, assertions or credentials. Reject peer-supplied private, loopback or link-local destinations unless intentionally configured for that environment.

POST to the discovered token endpoint with `Content-Type: application/x-www-form-urlencoded`, exactly one `DPoP` header containing the proof, and all five required form fields. Use a form encoder such as `URLSearchParams`; the values below are placeholders, not reusable credentials:

```text
grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer
client_id=https://buyer-agent.example/client.json
client_assertion_type=urn:ietf:params:oauth:client-assertion-type:jwt-bearer
client_assertion=<signed-client-assertion>
assertion=<signed-session-assertion>
resource=https://demo-toyota.example.com/poppy
```

The `resource` above comes from the discovered OpenAPI entry. Omit `session_id` when creating a Session. Require HTTP 200 with an opaque `access_token`, `token_type: "DPoP"`, positive `expires_in`, `scope: ""`, a `session_id`, and `signed_in: false`. Keep the token out of logs and model context. The response uses `Cache-Control: no-store`.

On `use_dpop_nonce`, retain `DPoP-Nonce` and retry with fresh assertions and a fresh proof containing that nonce. Fresh assertions avoid depending on the server's validation order or replay-cache behavior. Keep authorization-server and resource-server nonce state separate. Honor `Retry-After` on 429; do not retry permanent identity/audience errors unchanged.

## 4. Search inventory

Send a fresh proof with `htm: "POST"`, `htu` equal to the selected skill URL without query/fragment, and `ath` = base64url(SHA-256(access token)). Use the same DPoP key that obtained this token and the resource server's nonce if required.

```http
POST https://demo-toyota.example.com/poppy/skills/inventory.search
Authorization: DPoP <session-token>
DPoP: <fresh-api-proof-with-ath>
Content-Type: application/json

{
  "type": "inventory.search.request",
  "filters": {
    "condition": ["used"],
    "body": ["suv"],
    "price_max": 25000,
    "features_all": ["apple_carplay", "leather_seats"]
  },
  "pagination": { "limit": 5 },
  "sort": { "field": "price", "order": "asc" },
  "privacy": { "anonymous": true }
}
```

Read the deployment's advertised [search capabilities](./skills/inventory-search.md#know-what-this-endpoint-supports) before composing filters. This example assumes its `inventory.facets` response advertises `apple_carplay` and `leather_seats`. Require matching source evidence; these are exact feature filters, not a natural-language query. When supported, use `near` with resolved coordinates and `radius_mi`; dealer-scoped searches may use exact rooftop names. Do not invent ZIP or natural-language filter fields. Report unsupported constraints and unknown equipment instead of guessing. To continue, send the returned `next_cursor` with the same filters, sort and limit; a null cursor ends the result set.

HTTP 200 with a valid `inventory.search.response` from this authenticated operation is evidence of a PAP search. The A2A endpoint is a separate interface and requires its own headers and security; do not forward this token to it or silently present its results as PAP results. AAP lead submission still requires explicit contact consent.

## 5. Renew the Session

Repeat the guest grant with the same issuer-specific User ID, `session_id`, resource, fresh assertions and a fresh proof. Use the newest token for subsequent calls. A different client or User ID cannot take over the Session. `invalid_session` means start a new Session; a signed-in Session, if supported, instead uses the Account Token flow. An expired guest token does not imply customer sign-in is required.

## Diagnosing an integration

Preserve the failing HTTP status and OAuth error or `WWW-Authenticate` attributes before interpreting a skill response. When several fields are invalid, PAP does not prescribe which validation fails first.

| Evidence | Meaning and next action |
|---|---|
| Only GETs of `poppy.json`, metadata or documentation | Discovery happened; no evidence of an authenticated search |
| 400 `invalid_request` at token endpoint | Check encoding and all required form fields |
| 401 `invalid_client` | Check client metadata/JWKS, client assertion identity, issuer audience, signature, time/replay and any registration policy |
| 400 `invalid_grant` | Check the separate session assertion, issuer audience, subject, signature, time/replay |
| 400 `invalid_dpop_proof` | Check the token-request proof, ES256 key, public JWK, method/URL and replay |
| 400/401 `use_dpop_nonce` | Use `DPoP-Nonce` in a fresh proof for the server that issued it |
| 401 at a skill endpoint | Read the DPoP challenge; verify token, binding key, resource, `htu` and `ath` |
| 403 `extension_required` | Read the named extension; do not claim support merely to get past the error |
| A2A `SendMessage` or ordinary website results | Successful alternate interface, not evidence of PAP token or API success |

Operators SHOULD record a request ID, timestamp, protocol/interface, route, status, safe error code, validation stage and presence of required fields/DPoP. A correlated discovery/token/API trace separates client failure from an empty inventory result. Do not log token bodies, assertion JWTs, proofs, private keys, account credentials or the confidential User-ID mapping. A client report should include the request ID and safe error evidence, not credentials.

Updating this contract supplies the implementation rules and artifacts. A dealer still needs to deploy its PAP 0.2 runtime, and a personal agent still needs working identity and signing support. Verify both sides end to end before announcing interoperability.
