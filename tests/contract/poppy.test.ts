import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { globSync } from "glob";
import { ROOT } from "../../tools/lib/releases.js";
import { checkPoppyIdentity, poppyCompanyIdentifier, checkPoppySessionClaims, checkPoppyTokenResponse, checkPoppyClientIdentity, checkPoppyAssertion, checkPoppyMcpResource, poppyJwkThumbprint, poppyScopeChanges } from "../../tools/lib/poppy.js";

const ajv = new Ajv2020({ strict: false, allErrors: true }); addFormats(ajv);
for (const file of globSync("spec/latest/schemas/**/*.json", { cwd: ROOT })) ajv.addSchema(JSON.parse(readFileSync(resolve(ROOT, file), "utf8")));
const validate = (name: string, value: unknown) => ajv.validate(`https://draft.autoagentprotocol.invalid/latest/schemas/${name}.schema.json`, value);
const read = (name: string) => JSON.parse(readFileSync(resolve(ROOT, `spec/latest/examples/${name}.example.json`), "utf8"));
const discovery = "https://demo-toyota.example.com/.well-known/poppy.json";
const issuer = read("poppy-oauth-metadata").issuer;
const resource = () => ({ status: 200 as const, document: read("poppy-protected-resource-metadata.existing-issuer") });
const context = () => ({ clientId: read("poppy-client-metadata").client_id, companyIdentifier: "https://demo-toyota.example.com", method: "POST", url: read("poppy-session-jwt").payload.htu, now: 1790899201, windowSeconds: 60 });
const compact = (delegation: any) => [delegation.header, delegation.payload].map(value => Buffer.from(JSON.stringify(value)).toString("base64url")).join(".") + ".illustrative_invalid_signature";

test("published 0.3 allows issuerless native APIs and preserves existing issuer identity with sign-in disabled", () => {
  for (const name of ["poppy", "poppy.existing-issuer", "poppy.native-mcp"]) assert.equal(validate("poppy", read(name)), true, ajv.errorsText());
  assert.deepEqual(checkPoppyIdentity(read("poppy"), discovery, undefined, discovery, {}, { status: 404 }), []);
  assert.deepEqual(checkPoppyIdentity(read("poppy.existing-issuer"), discovery, read("poppy-oauth-metadata"), discovery, {}, resource()), []);
  assert.equal(poppyCompanyIdentifier(read("poppy"), { status: 404 }).identifier, "https://demo-toyota.example.com");
  assert.equal(poppyCompanyIdentifier(read("poppy.existing-issuer"), resource()).identifier, issuer);
});

test("issuer selection is bidirectional and discovery failures never imply issuer removal", () => {
  assert.ok(poppyCompanyIdentifier(read("poppy"), { status: "error" }).errors.length);
  assert.ok(poppyCompanyIdentifier(read("poppy.existing-issuer"), { status: 404 }).errors.length);
  const multiple = resource(); multiple.document.authorization_servers.push("https://staff.example/issuer");
  assert.ok(poppyCompanyIdentifier(read("poppy"), multiple).errors.length);
  assert.equal(poppyCompanyIdentifier(read("poppy.existing-issuer"), multiple).identifier, issuer);
  multiple.document.authorization_servers = ["https://other.example/issuer"];
  assert.ok(poppyCompanyIdentifier(read("poppy.existing-issuer"), multiple).errors.length);
  const metadata = read("poppy-oauth-metadata"); metadata.protected_resources = ["https://demo-toyota.example.com/"];
  assert.ok(checkPoppyIdentity(read("poppy.existing-issuer"), discovery, metadata, discovery, {}, resource()).length);
  const wrong = resource(); wrong.document.resource += "/";
  assert.ok(poppyCompanyIdentifier(read("poppy"), wrong).errors.length);
  assert.equal(poppyCompanyIdentifier(read("poppy"), resource()).identifier, issuer, "a single server does not require auth.issuer");
});

test("final discovery identity, pre-1.0 version and safe publication URLs are enforced", () => {
  for (const url of [discovery.replace("https:", "http:"), discovery + "?query=1", discovery.replace("poppy.json", "other.json"), discovery.replace("demo-toyota", "www.demo-toyota")]) assert.ok(checkPoppyIdentity(read("poppy"), discovery, undefined, url, {}, { status: 404 }).length, url);
  for (const version of ["0.2", "0.4", "0.3.0", "1.0"]) assert.equal(validate("poppy-document", { ...read("poppy"), protocol_version: version }), false);
  for (const url of ["http://dealer.example/api", "https://user:secret@dealer.example/api", "https:///api", "https://dealer.example/has space"]) {
    const document = read("poppy"); document.apis[0].url = url;
    assert.equal(validate("poppy", document), false, url);
  }
});

test("readers retain unknown data but publishers reject retired auth/resource shapes", () => {
  const document = read("poppy"); document.future = true; document.apis.push({ type: "future", url: "https://dealer.example/api", description: "Ignore" });
  assert.equal(validate("poppy-document", document), true); assert.equal(validate("poppy", document), false);
  for (const name of ["direct", "device", "custom_scopes", "mediated"]) {
    const old = read("poppy.existing-issuer"); old.auth[name] = {};
    assert.equal(validate("poppy-document", old), true); assert.equal(validate("poppy", old), false);
  }
  const old = read("poppy"); old.apis[0].resource = "https://dealer.example/api";
  assert.equal(validate("poppy-document", old), true); assert.equal(validate("poppy", old), false);
  const hint = read("poppy.existing-issuer"); hint.auth.scope_hints = { read: { changes: "future", personal_data: false } };
  assert.equal(validate("poppy-document", hint), true); assert.equal(validate("poppy", hint), false);
  assert.equal(poppyScopeChanges("future"), "irreversible"); assert.equal(poppyScopeChanges(undefined), undefined);
});

test("disabled sign-in forbids signed_in conversations and mediated extension", () => {
  for (const patch of [ { agent: { protocols: [{ type: "poppy", endpoint: "https://dealer.example/conversations", access: "signed_in" }] } }, { extensions: { ...read("poppy").extensions, "mediated-sign-in": { version: "1", fields: [{ name: "email", label: "Email", secret: false }], scopes: ["read"] } } } ]) {
    const document = { ...read("poppy.existing-issuer"), ...patch };
    assert.equal(validate("poppy", document), false);
    assert.ok(checkPoppyIdentity(document, discovery, read("poppy-oauth-metadata"), discovery, {}, resource()).length);
  }
});

test("issuer OAuth requires refresh only, correct conditional endpoints and optional scope descriptions", () => {
  const metadata = read("poppy-oauth-metadata");
  assert.equal(validate("poppy-oauth-metadata", metadata), true);
  assert.deepEqual(metadata.grant_types_supported, ["refresh_token"]);
  for (const grants of [[], ["authorization_code"], ["refresh_token", "authorization_code"], ["refresh_token", "urn:ietf:params:oauth:grant-type:device_code"]]) assert.equal(validate("poppy-oauth-metadata", { ...metadata, grant_types_supported: grants }), false);
  assert.equal(validate("poppy-oauth-metadata", { ...metadata, token_endpoint_auth_signing_alg_values_supported: ["PS384"] }), false);
});

test("CIMD and OAuth client assertions remain distinct from delegated Session JWTs", () => {
  const client = read("poppy-client-metadata");
  assert.deepEqual(checkPoppyClientIdentity(client, client.client_id), []);
  assert.ok(checkPoppyClientIdentity({ ...client, jwks_uri: "https://other.example/jwks" }, client.client_id).length);
  assert.deepEqual(checkPoppyAssertion(read("poppy-client-assertion"), client.client_id, issuer), []);
  assert.ok(checkPoppyAssertion({ ...read("poppy-client-assertion"), aud: read("poppy-oauth-metadata").token_endpoint }, client.client_id, issuer).length);
  assert.equal(validate("poppy-session-jwt", read("poppy-client-assertion")), false);
});

test("Session and delegation decoded schemas reject wrong types, keys and identity leaks", () => {
  assert.equal(validate("poppy-session-jwt", read("poppy-session-jwt")), true);
  assert.equal(validate("poppy-delegation", read("poppy-delegation")), true);
  for (const patch of [{ typ: "JWT" }, { alg: "PS384" }, { kid: "not-thumbprint" }, { poppy_dlg: "" }]) assert.equal(validate("poppy-session-jwt", { ...read("poppy-session-jwt"), header: { ...read("poppy-session-jwt").header, ...patch } }), false);
  for (const patch of [{ aud: ["https://demo-toyota.example.com"] }, { sid: "" }, { htu: "https://dealer.example/api?query=1" }, { htu: "https://user:pass@dealer.example/api" }, { htu: "https://dealer.example/has space" }, { jti: "" }, { ath: "bad" }]) assert.equal(validate("poppy-session-jwt", { ...read("poppy-session-jwt"), payload: { ...read("poppy-session-jwt").payload, ...patch } }), false);
  for (const name of ["sub", "aud", "agent_id"]) { const d = read("poppy-delegation"); d.payload[name] = "identity"; assert.equal(validate("poppy-delegation", d), false); }
  for (const name of ["d", "p", "q", "dp", "dq", "qi", "oth", "k"]) { const d = read("poppy-delegation"); d.payload.cnf.jwk[name] = "private"; assert.equal(validate("poppy-delegation", d), false); }
  const wrong = read("poppy-delegation"); wrong.payload.cnf.jwk.crv = "P-384";
  assert.equal(validate("poppy-delegation", wrong), false);
  const ps384 = read("poppy-delegation"); ps384.header.alg = "PS384";
  assert.equal(validate("poppy-delegation", ps384), true, "PS384 identity signature may delegate an ES256 key");
});

test("claim validation binds request, client, Company, lifetime and optional access token", () => {
  assert.deepEqual(checkPoppySessionClaims(read("poppy-session-jwt"), read("poppy-delegation"), context()), []);
  for (const patch of [{ clientId: "https://other.example/client" }, { companyIdentifier: issuer }, { method: "GET" }, { url: "https://dealer.example/other" }, { now: context().now + 61 }, { accessToken: "token", tokenClientId: context().clientId }]) assert.ok(checkPoppySessionClaims(read("poppy-session-jwt"), read("poppy-delegation"), { ...context(), ...patch }).length);
  for (const patch of [{ exp: 1790899200 }, { exp: 1790899200 + 86401 }, { iat: 1790899300 }]) { const d = read("poppy-delegation"); Object.assign(d.payload, patch); assert.ok(checkPoppySessionClaims(read("poppy-session-jwt"), d, context()).length); }
  const s = read("poppy-session-jwt"); s.payload.ath = createHash("sha256").update("token").digest("base64url");
  assert.ok(checkPoppySessionClaims(s, read("poppy-delegation"), context()).length);
  assert.deepEqual(checkPoppySessionClaims(s, read("poppy-delegation"), { ...context(), accessToken: "token", tokenClientId: context().clientId }), []);
  assert.ok(checkPoppySessionClaims(s, read("poppy-delegation"), { ...context(), accessToken: "token", tokenClientId: "other" }).length);
});

test("client_id + sid continuity preserves sub/agent_id and permits delegation rotation", () => {
  const s = read("poppy-session-jwt"), d = read("poppy-delegation");
  const previous = { sub: s.payload.sub };
  assert.deepEqual(checkPoppySessionClaims(s, d, { ...context(), previous }), []);
  assert.ok(checkPoppySessionClaims(s, d, { ...context(), previous: { sub: "other" } }).length);
  assert.ok(checkPoppySessionClaims(s, d, { ...context(), previous: { ...previous, agent_id: "old" } }).length);
  assert.ok(checkPoppySessionClaims(s, d, { ...context(), previous: { ...previous, ended: true } }).includes("session_ended"));
  // These are structural fixtures only. Cryptographic curve membership/signatures require runtime tests.
  d.payload.cnf.jwk.x = "A".repeat(43); d.payload.jti = "illustrative_rotated_delegation_0002";
  s.header.kid = poppyJwkThumbprint(d.payload.cnf.jwk); s.header.poppy_dlg = compact(d);
  assert.deepEqual(checkPoppySessionClaims(s, d, { ...context(), previous }), []);
});

test("ordinary OAuth accepts reduced scopes and Bearer or DPoP without inventing guest/exchange grants", () => {
  for (const token_type of ["Bearer", "bearer", "DPoP"]) {
    const token = { ...read("poppy-access-token-response"), token_type };
    assert.equal(validate("poppy-access-token-response", token), true);
    assert.deepEqual(checkPoppyTokenResponse(token, { grant: "sign-in", requestedScopes: ["saved_searches:read", "saved_searches:write"] }), []);
  }
  const token = read("poppy-access-token-response");
  assert.ok(checkPoppyTokenResponse(token, { grant: "sign-in", requestedScopes: [] }).length);
  delete token.refresh_token;
  assert.ok(checkPoppyTokenResponse(token, { grant: "sign-in", requestedScopes: ["saved_searches:read"] }).length);
  assert.deepEqual(checkPoppyTokenResponse(token, { grant: "refresh", requestedScopes: ["saved_searches:read"] }), []);
});

test("native MCP selection does not impose obsolete token exchange", () => {
  const native = read("poppy.native-mcp"), metadata = read("poppy-protected-resource-metadata.native-mcp"), url = native.apis[1].url;
  assert.deepEqual(checkPoppyMcpResource(native, issuer, url, metadata), []);
  assert.ok(checkPoppyMcpResource(read("poppy"), issuer, url, metadata).length);
  assert.ok(checkPoppyMcpResource(native, "https://other.example", url, metadata).length);
  assert.ok(checkPoppyMcpResource(native, issuer, url + "/wrong", metadata).length);
});

test("Session recovery errors are separate from OAuth and AAP business errors", () => {
  for (const error of ["invalid_session", "session_ended"]) assert.equal(validate("poppy-session-error", { error, error_description: "Use a fresh Session." }), true);
  for (const error of ["invalid_token", "invalid_grant", "use_dpop_nonce", "insufficient_scope"]) assert.equal(validate("poppy-session-error", { error }), false);
  assert.equal(validate("poppy-browser-session-authorize", { code: "browser_issued_code" }), true);
  assert.equal(validate("poppy-browser-session-authorize", { assertion: "old" }), false);
});


test("normative ID and NumericDate readers do not inherit stricter kit publication assumptions", () => {
  const s = read("poppy-session-jwt"), d = read("poppy-delegation");
  s.payload.sid = "a"; s.payload.jti = "j"; s.payload.iat += 0.5;
  d.payload.jti = "j"; d.payload.iat += 0.5; d.payload.exp += 0.5;
  assert.equal(validate("poppy-session-jwt", s), true, "a schema cannot infer randomness from minimum string length");
  assert.equal(validate("poppy-delegation", d), true);
  for (const sid of ["has space", "has/slash", "a".repeat(257)]) assert.equal(validate("poppy-session-jwt", { ...s, payload: { ...s.payload, sid } }), false);
  assert.equal(validate("poppy-access-token-response", { ...read("poppy-access-token-response"), expires_in: 0.5 }), true);
});


test("signed-out CIMD does not require account sign-in metadata", () => {
  const full = read("poppy-client-metadata");
  const minimal = { client_id: full.client_id, jwks_uri: full.jwks_uri };
  assert.equal(validate("poppy-client-metadata", minimal), true);
  assert.deepEqual(checkPoppyClientIdentity(minimal, minimal.client_id), []);
  assert.equal(validate("poppy-client-metadata", { ...minimal, redirect_uris: "invalid" }), false);
  assert.equal(validate("poppy-client-metadata", { ...minimal, client_secret: "not-public" }), false);
  for (const client_id of ["https://buyer-agent.example/", "https://buyer-agent.example/a/../client.json", full.client_id + "#fragment"]) assert.ok(checkPoppyClientIdentity({ ...minimal, client_id }, client_id).length);
});


test("signed-out CIMD permits explicit none; account OAuth separately needs private_key_jwt", () => {
  const full = read("poppy-client-metadata"), minimal = { client_id: full.client_id, jwks_uri: full.jwks_uri };
  for (const value of [minimal, { ...minimal, token_endpoint_auth_method: "none" }, full]) {
    assert.equal(validate("poppy-client-metadata", value), true);
    assert.deepEqual(checkPoppyClientIdentity(value, value.client_id), []);
  }
  assert.ok(checkPoppyClientIdentity(minimal, minimal.client_id, true).length);
  assert.deepEqual(checkPoppyClientIdentity(full, full.client_id, true), []);
  const plural = { ...minimal, token_endpoint_auth_methods_supported: ["none", "private_key_jwt"] };
  assert.equal(validate("poppy-client-metadata", plural), true);
  assert.deepEqual(checkPoppyClientIdentity(plural, plural.client_id, true), []);
  assert.ok(checkPoppyClientIdentity({ ...full, token_endpoint_auth_methods_supported: ["none"] }, full.client_id).length);
  assert.equal(validate("poppy-client-metadata", { ...minimal, token_endpoint_auth_methods_supported: ["client_secret_basic"] }), false);
});
