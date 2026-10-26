import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { globSync } from "glob";
import { ROOT } from "../../tools/lib/releases.js";
import { checkPoppyAssertion, checkPoppyClientIdentity, checkPoppyIdentity, checkPoppyMcpResource, checkPoppyTokenResponse, poppyRedirectMatches, poppyScopeChanges, poppyAlternativeReferences, oauthMetadataUrl } from "../../tools/lib/poppy.js";

const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats(ajv);
for (const file of globSync("spec/latest/schemas/**/*.json", { cwd: ROOT })) ajv.addSchema(JSON.parse(readFileSync(resolve(ROOT, file), "utf8")));
const validate = (name: string, value: unknown) => ajv.validate(`https://draft.autoagentprotocol.invalid/latest/schemas/${name}.schema.json`, value);
const read = (name: string) => JSON.parse(readFileSync(resolve(ROOT, `spec/latest/examples/${name}.example.json`), "utf8"));
const discovery = "https://demo-toyota.example.com/.well-known/poppy.json";

test("Poppy guest API and extension examples conform without inventing a conversation protocol", () => {
  assert.equal(validate("poppy", read("poppy")), true, JSON.stringify(ajv.errors));
  assert.equal(validate("poppy-aap-extension", read("poppy-aap-extension")), true);
  assert.equal(read("poppy").agent, undefined);
  assert.deepEqual(checkPoppyIdentity(read("poppy"), discovery, read("poppy-oauth-metadata")), []);
});

test("website-only Poppy remains valid upstream discovery but does not claim full AAP 3.0", () => {
  const website = read("poppy-document");
  assert.equal(validate("poppy-document", website), true);
  assert.equal(validate("poppy", website), false);
  assert.deepEqual(checkPoppyIdentity(website, discovery), []);
  website.apis = [];
  website.auth = read("poppy").auth;
  assert.equal(validate("poppy-document", website), true, "a website may advertise no API entries");
  assert.equal(validate("poppy", website), false, "AAP publication still needs an OpenAPI entry");
});

test("Poppy 0.3 readers reject unsupported pre-1.0 minor versions", () => {
  assert.equal(validate("poppy-document", read("poppy")), true);
  for (const version of ["0.1", "0.2", "0.4", "0.12", "1.0", "0.0", "0.01", "0.3.0", "0.x", "0.3 "]) {
    assert.equal(validate("poppy-document", { ...read("poppy"), protocol_version: version }), false, version);
    assert.equal(validate("poppy", { ...read("poppy"), protocol_version: version }), false, version);
  }
});

test("Poppy native surfaces require auth, including empty advertised lists", () => {
  for (const patch of [
    { apis: [{ type: "openapi", url: "https://dealer.example/api.json", description: "Inventory" }] },
    { apis: [] }, { agent: { protocols: [{ type: "poppy", endpoint: "https://dealer.example/conversations" }] } },
    { web: { browser_session_endpoint: "https://dealer.example/browser-session" } },
    { feedback: { endpoint: "https://dealer.example/feedback" } },
  ]) assert.equal(validate("poppy-document", { ...read("poppy-document"), ...patch }), false);
});

test("AAP Poppy requires a standard OpenAPI surface and a versioned link to its A2A card", () => {
  for (const change of [
    (d: any) => delete d.extensions,
    (d: any) => delete d.extensions["autoagentprotocol.org/aap"].agent_card,
    (d: any) => d.extensions["autoagentprotocol.org/aap"].version = "2",
    (d: any) => d.apis[0].type = "a2a",
    (d: any) => d.apis = [],
  ]) {
    const document = read("poppy"); change(document);
    assert.equal(validate("poppy", document), false, JSON.stringify(document));
  }
});

test("Poppy discovery consumers tolerate unknown fields, extensions and interface types", () => {
  const document = read("poppy");
  document.future = true;
  document.organization.future = "allowed";
  document.extensions["example.com/feature"] = { version: "1", future: true };
  document.extensions["autoagentprotocol.org/aap"].future = true;
  assert.equal(validate("poppy", document), true, JSON.stringify(ajv.errors));
  document.apis.push({ type: "future-api", url: "https://example.com/api", description: "Skip if unsupported" });
  assert.equal(validate("poppy-document", document), true, JSON.stringify(ajv.errors));
  assert.equal(validate("poppy", document), false, "publishers advertise only defined PAP API types");
});

test("Poppy HTTPS publication rejects credential-bearing and insecure URLs", () => {
  for (const url of ["http://dealer.example/api", "https://user:secret@dealer.example/api", "https:///api", "https://dealer.example/has space"]) {
    const document = read("poppy"); document.apis[0].url = url;
    assert.equal(validate("poppy", document), false, url);
  }
  for (const issuer of ["https://dealer.example/issuer?tenant=1", "https://dealer.example/issuer#fragment"]) {
    const document = read("poppy"); document.auth.issuer = issuer;
    assert.equal(validate("poppy", document), false);
    assert.throws(() => oauthMetadataUrl(issuer));
  }
  for (const resource of ["urn:example:dealer", "http://dealer.example/api", "https://dealer.example/api#fragment"]) {
    const document = read("poppy"); document.apis[0].resource = resource;
    assert.equal(validate("poppy", document), false, "PAP requires HTTPS resource URLs without fragments");
  }
});

test("OAuth discovery uses RFC 8414 insertion before a tenant path", () => {
  assert.equal(oauthMetadataUrl("https://provider.example/tenant/42"), "https://provider.example/.well-known/oauth-authorization-server/tenant/42");
  assert.equal(oauthMetadataUrl("https://provider.example/tenant/"), "https://provider.example/.well-known/oauth-authorization-server/tenant");
  assert.equal(oauthMetadataUrl("https://provider.example/tenant//"), "https://provider.example/.well-known/oauth-authorization-server/tenant");
  assert.equal(oauthMetadataUrl("https://provider.example"), "https://provider.example/.well-known/oauth-authorization-server");
  assert.equal(oauthMetadataUrl("https://provider.example/"), "https://provider.example/.well-known/oauth-authorization-server");
});

test("Poppy 0.3 identity binds the final well-known URL, exact issuer and authorized resource", () => {
  const www = discovery.replace("https://", "https://www.");
  assert.ok(checkPoppyIdentity(read("poppy"), www, read("poppy-oauth-metadata")).some(e => e.includes("final discovery host")));
  assert.deepEqual(checkPoppyIdentity(read("poppy"), www, read("poppy-oauth-metadata"), discovery), []);
  assert.ok(checkPoppyIdentity(read("poppy"), discovery, read("poppy-oauth-metadata"), www).some(e => e.includes("final discovery host")));
  assert.ok(checkPoppyIdentity(read("poppy"), discovery, read("poppy-oauth-metadata"), discovery.replace("https:", "http:")).some(e => e.includes("HTTPS")));
  assert.ok(checkPoppyIdentity(read("poppy"), discovery).some(e => e.includes("metadata")));
  const slashDocument = read("poppy"); slashDocument.auth.issuer += "/";
  const slashMetadata = read("poppy-oauth-metadata"); slashMetadata.issuer += "/";
  assert.deepEqual(checkPoppyIdentity(slashDocument, discovery, slashMetadata), [], "metadata URL normalization must not change exact issuer identity");
  const metadata = read("poppy-oauth-metadata"); metadata.issuer += "/";
  assert.ok(checkPoppyIdentity(read("poppy"), discovery, metadata).some(e => e.includes("exactly")));
  metadata.issuer = read("poppy").auth.issuer; metadata.protected_resources = ["https://different.example"];
  assert.ok(checkPoppyIdentity(read("poppy"), discovery, metadata).some(e => e.includes("protected_resources")));
  metadata.protected_resources = [`https://${read("poppy").organization.domain.toUpperCase()}`];
  assert.deepEqual(checkPoppyIdentity(read("poppy"), discovery, metadata), []);
  for (const suffix of ["/", ":443", "/api", "?query", "#fragment"]) {
    metadata.protected_resources = [`https://${read("poppy").organization.domain}${suffix}`];
    assert.ok(checkPoppyIdentity(read("poppy"), discovery, metadata).length, suffix);
  }
  for (const final of [discovery.replace("poppy.json", "other.json"), `${discovery}?v=3`, `${discovery}#fragment`]) {
    assert.ok(checkPoppyIdentity(read("poppy"), discovery, read("poppy-oauth-metadata"), final).length, final);
  }
  for (const version of ["v2.0", "v2.1"]) {
    const frozen = (name: string) => JSON.parse(readFileSync(resolve(ROOT, `spec/${version}/examples/${name}.example.json`), "utf8"));
    assert.deepEqual(checkPoppyIdentity(frozen("poppy"), version === "v2.0" ? www : discovery, frozen("poppy-oauth-metadata")), [], "published versions retain their identity rules");
  }
});

test("Poppy 0.3 validates optional feedback and ES256 metadata", () => {
  const document = read("poppy");
  document.feedback = { endpoint: "https://dealer.example/feedback", future: true };
  assert.equal(validate("poppy", document), true);
  document.feedback.endpoint = "http://dealer.example/feedback";
  assert.equal(validate("poppy", document), false);
  delete document.feedback.endpoint;
  assert.equal(validate("poppy", document), false);
  const metadata = read("poppy-oauth-metadata");
  metadata.dpop_signing_alg_values_supported = ["RS256"];
  assert.equal(validate("poppy-oauth-metadata", metadata), false);
  delete metadata.dpop_signing_alg_values_supported;
  assert.equal(validate("poppy-oauth-metadata", metadata), true);
  for (const patch of [{ grant_types_supported: ["client_credentials"] }, { token_endpoint_auth_methods_supported: ["none"] }]) {
    assert.equal(validate("poppy-oauth-metadata", { ...metadata, ...patch }), false, "advertised metadata must support the PAP guest handshake");
  }
});

test("sign-in is discovered from grants and requires described company scopes", () => {
  const document = read("poppy");
  const metadata = read("poppy-oauth-metadata");
  metadata.grant_types_supported.push("authorization_code", "urn:ietf:params:oauth:grant-type:device_code");
  assert.equal(validate("poppy-oauth-metadata", metadata), false);
  assert.ok(checkPoppyIdentity(document, discovery, metadata).some(e => e.includes("scopes_supported")));
  metadata.authorization_endpoint = "https://dealer.example/authorize";
  metadata.device_authorization_endpoint = "https://dealer.example/device";
  metadata.scopes_supported = ["saved_searches:read"];
  assert.ok(checkPoppyIdentity(document, discovery, metadata).some(e => e.includes("description")));
  document.auth.scopes = { "saved_searches:read": "Read saved searches" };
  document.auth.scope_hints = { "saved_searches:read": { changes: "none", personal_data: true } };
  assert.deepEqual(checkPoppyIdentity(document, discovery, metadata), []);
  assert.equal(validate("poppy", document), true);
  document.auth.scope_hints["saved_searches:read"].changes = "future";
  assert.equal(validate("poppy-document", document), true, "readers must accept future hint values");
  assert.equal(validate("poppy", document), false, "publishers use defined hint values");
  assert.equal(poppyScopeChanges("future"), "irreversible");
  assert.equal(poppyScopeChanges(undefined), undefined, "missing hints are unknown, not read-only");
  assert.equal(poppyScopeChanges("none"), "none");
  delete document.auth.scope_hints;
  delete document.auth.scopes;
  assert.deepEqual(checkPoppyIdentity(document, discovery, metadata, discovery, { "saved_searches:read": "Read saved searches" }), [], "descriptions can come from a listed OpenAPI OAuth scheme");
  document.auth.mediated = { endpoint: "https://dealer.example/sign-in", fields: [{ name: "password", label: "Password", secret: true }], scopes: ["undeclared"] };
  assert.ok(checkPoppyIdentity(document, discovery, metadata).some(e => e.includes("Mediated")));
});

test("token validation uses grant context instead of removed signed_in fields", () => {
  const token = read("poppy-session-token");
  assert.equal(validate("poppy-session-token", token), true);
  assert.equal(validate("poppy-session-token", { ...token, expires_in: 0.5 }), true, "PAP requires a positive lifetime without restricting fractional seconds");
  assert.deepEqual(checkPoppyTokenResponse(token, { grant: "guest" }), []);
  for (const patch of [{ expires_in: 0 }, { expires_in: -1 }, { token_type: "JWT" }, { scope: "" }, { session_id: "old" }, { signed_in: false }]) {
    assert.equal(validate("poppy-session-token", { ...token, ...patch }), false);
  }
  for (const patch of [{ scope: "saved_searches:read" }, { refresh_token: "not-for-guests" }, { token_type: "Bearer" }]) {
    assert.ok(checkPoppyTokenResponse({ ...token, ...patch }, { grant: "guest" }).length);
  }
  const signedIn = { ...token, refresh_token: "example-account-token" };
  assert.equal(validate("poppy-session-token", signedIn), true);
  assert.deepEqual(checkPoppyTokenResponse(signedIn, { grant: "sign-in", requestedScopes: ["saved_searches:read"] }), [], "omitted scope means exactly the requested scopes for a successful sign-in");
  assert.ok(checkPoppyTokenResponse(signedIn, { grant: "sign-in", requestedScopes: [] }).length, "approving no scopes is a decline");
  assert.ok(checkPoppyTokenResponse({ ...signedIn, scope: "unrequested" }, { grant: "sign-in", requestedScopes: ["saved_searches:read"] }).length);
  assert.ok(checkPoppyTokenResponse(token, { grant: "sign-in", requestedScopes: ["saved_searches:read"] }).length, "sign-in returns an Account Token");
  assert.deepEqual(checkPoppyTokenResponse(token, { grant: "refresh", requestedScopes: ["saved_searches:read"] }), [], "refresh may leave the existing Account Token unchanged");
});

test("PAP 0.3 handshake binds both assertions to the verified client and issuer", () => {
  const client = read("poppy-client-metadata");
  const { issuer, token_endpoint } = read("poppy-oauth-metadata");
  assert.deepEqual(checkPoppyClientIdentity(client, client.client_id), []);
  assert.ok(checkPoppyClientIdentity({ ...client, jwks_uri: "https://other.example/jwks.json" }, client.client_id).length);
  assert.ok(checkPoppyClientIdentity(client, `${client.client_id}?different`).length);
  for (const kind of ["client", "session"] as const) {
    const claims = read(`poppy-${kind}-assertion`);
    assert.equal(validate(`poppy-${kind}-assertion`, claims), true);
    assert.equal(validate(`poppy-${kind}-assertion`, { ...claims, iat: claims.iat + 0.25, exp: claims.exp + 0.25 }), true, "JWT NumericDates may be fractional");
    assert.deepEqual(checkPoppyAssertion(claims, client.client_id, issuer, kind), []);
    assert.deepEqual(checkPoppyAssertion({ ...claims, exp: claims.iat + 300 }, client.client_id, issuer, kind), []);
    for (const patch of [{ aud: token_endpoint }, { aud: [issuer] }, { iss: "https://other.example/client.json" }, { exp: claims.iat }, { exp: claims.iat + 301 }]) {
      assert.ok(checkPoppyAssertion({ ...claims, ...patch }, client.client_id, issuer, kind).length, JSON.stringify(patch));
    }
    assert.equal(validate(`poppy-${kind}-assertion`, { ...claims, aud: [issuer] }), false);
  }
  assert.ok(checkPoppyAssertion(read("poppy-session-assertion"), client.client_id, issuer, "client").length);
  const request = read("poppy-session-request");
  assert.equal(validate("poppy-session-request", request), true);
  delete request.client_assertion;
  assert.equal(validate("poppy-session-request", request), false);
});

test("PAP 0.3 removes legacy discovery fields and reserves poppy scope names", () => {
  for (const name of ["direct", "device", "custom_scopes"]) {
    const document = read("poppy"); document.auth[name] = {};
    assert.equal(validate("poppy", document), false, name);
    assert.equal(validate("poppy-document", document), true, "readers ignore old unknown fields");
  }
  const metadata = read("poppy-oauth-metadata");
  for (const field of ["grant_types_supported", "protected_resources"]) {
    const broken = { ...metadata }; delete broken[field];
    assert.equal(validate("poppy-oauth-metadata", broken), false, field);
  }
  metadata.grant_types_supported = ["urn:ietf:params:oauth:grant-type:jwt-bearer"];
  assert.equal(validate("poppy-oauth-metadata", metadata), false, "refresh_token is advertised even for guest-only issuers");
  assert.equal(validate("poppy-oauth-metadata", { ...read("poppy-oauth-metadata"), scopes_supported: ["poppy:read"] }), false);
  assert.equal(validate("poppy-session-request", { ...read("poppy-session-request"), session_id: "old" }), false);
  assert.equal(validate("poppy-session-request", { ...read("poppy-session-request"), scope: "" }), false);
  assert.equal(validate("poppy-session-assertion", { ...read("poppy-session-assertion"), agent_id: "agent_pairwise_opaque" }), true);
  assert.equal(validate("poppy-session-assertion", { ...read("poppy-session-assertion"), agent_id: "" }), false);
});

test("loopback redirects allow a variable port, never a different callback or identity host", () => {
  const client = read("poppy-client-metadata");
  for (const redirect of ["http://127.0.0.1:49152/callback", "http://[::1]:49152/callback"]) {
    const metadata = { ...client, redirect_uris: [redirect] };
    assert.equal(validate("poppy-client-metadata", metadata), true);
    assert.deepEqual(checkPoppyClientIdentity(metadata, client.client_id), []);
    assert.equal(poppyRedirectMatches(redirect, redirect.replace("49152", "62400")), true);
    assert.equal(poppyRedirectMatches(redirect, redirect.replace("callback", "elsewhere")), false);
    assert.equal(poppyRedirectMatches(redirect, `${redirect}?different`), false);
    assert.ok(checkPoppyClientIdentity({ ...metadata, jwks_uri: redirect }, client.client_id).length);
  }
  for (const redirect of ["http://localhost:49152/callback", "http://127.0.0.2/callback", "http://2130706433/callback", "http://127.1/callback", "http://127.0.0.1.evil.example/callback", "https://other.example/callback", "https://buyer-agent.example/callback#fragment"]) {
    assert.ok(checkPoppyClientIdentity({ ...client, redirect_uris: [redirect] }, client.client_id).length, redirect);
  }
  assert.equal(poppyRedirectMatches("https://buyer-agent.example/callback", "https://buyer-agent.example:443/callback"), false, "HTTPS redirects match exactly");
});

test("native PAP MCP requires explicit DPoP resource support or a bound token exchange", () => {
  const document = read("poppy"), metadata = read("poppy-oauth-metadata");
  const url = document.extensions["autoagentprotocol.org/aap"].mcp;
  document.apis.push({ type: "mcp", url, resource: url, description: "Native PAP MCP" });
  const resource = { resource: url, authorization_servers: [document.auth.issuer] };
  assert.ok(checkPoppyMcpResource(document, metadata, url, resource).some(e => e.includes("token-exchange")));
  metadata.grant_types_supported.push("urn:ietf:params:oauth:grant-type:token-exchange");
  assert.deepEqual(checkPoppyMcpResource(document, metadata, url, resource), []);
  assert.deepEqual(checkPoppyMcpResource(document, read("poppy-oauth-metadata"), url, { ...resource, dpop_signing_alg_values_supported: ["ES256"] }), []);
  for (const patch of [{ resource: `${url}/` }, { authorization_servers: [`${document.auth.issuer}/`] }, { dpop_signing_alg_values_supported: ["RS256"] }]) {
    assert.ok(checkPoppyMcpResource(document, metadata, url, { ...resource, ...patch }).length);
  }
  assert.ok(checkPoppyMcpResource(read("poppy"), metadata, url, resource).length, "an AAP public link alone never authorizes PAP tokens");
  const exchange = read("poppy-token-exchange-request");
  assert.equal(validate("poppy-token-exchange-request", exchange), true);
  for (const field of ["resource", "subject_token", "subject_token_type", "client_assertion"]) {
    const broken = { ...exchange }; delete broken[field];
    assert.equal(validate("poppy-token-exchange-request", broken), false, field);
  }
  const token = read("poppy-token-exchange-response");
  assert.equal(validate("poppy-token-exchange-response", token), true);
  assert.deepEqual(checkPoppyTokenResponse(token, { grant: "exchange", subjectScopes: [] }), []);
  assert.ok(checkPoppyTokenResponse({ ...token, scope: "saved_searches:read" }, { grant: "exchange", subjectScopes: [] }).length);
  assert.ok(checkPoppyTokenResponse({ ...token, scope: "write" }, { grant: "exchange", subjectScopes: ["read", "write"], requestedScopes: ["read"] }).length);
  for (const patch of [{ token_type: "DPoP" }, { issued_token_type: "unknown" }, { refresh_token: "unexpected" }]) {
    assert.equal(validate("poppy-token-exchange-response", { ...token, ...patch }), false);
  }
});

test("browser joins use a code and proof, and alternatives stay on advertised APIs", () => {
  assert.equal(validate("poppy-browser-session-request", read("poppy-browser-session-request")), true);
  assert.equal(validate("poppy-browser-session-request", { assertion: "old", return_to: "https://dealer.example" }), false);
  const excluded = read("poppy-excluded-tasks");
  assert.equal(validate("poppy-excluded-tasks", excluded), true);
  excluded.tasks[0].task = "x".repeat(201);
  assert.equal(validate("poppy-excluded-tasks", excluded), false);
  const alternative = read("poppy-alternative"), document = read("poppy");
  assert.equal(validate("poppy-alternative", alternative), true);
  assert.equal(validate("poppy-alternative", {}), false);
  assert.equal(validate("poppy-alternative", { references: [{ type: "openapi", url: document.apis[0].url }] }), false);
  alternative.references.push({ type: "mcp", url: "https://other.example/mcp", tool: "unknown" }, { type: "future", future: true });
  assert.equal(validate("poppy-alternative", alternative), true, "readers skip future reference types");
  assert.deepEqual(poppyAlternativeReferences(document, alternative), [alternative.references[0]], "ignore unsupported types and APIs not advertised by this company");
});

test("feedback receivers accept future kinds and enforce PAP report limits", () => {
  const report = read("poppy-feedback-request");
  assert.equal(validate("poppy-feedback-request", { ...report, kind: "future" }), true);
  assert.equal(validate("poppy-feedback-request", { ...report, task: "x".repeat(201) }), false);
  assert.equal(validate("poppy-feedback-request", { ...report, description: "x".repeat(2001) }), false);
});
