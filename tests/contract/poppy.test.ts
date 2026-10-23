import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { globSync } from "glob";
import { ROOT } from "../../tools/lib/releases.js";
import { checkPoppyIdentity, oauthMetadataUrl } from "../../tools/lib/poppy.js";

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
});

test("Poppy 0.2 readers reject unsupported pre-1.0 minor versions", () => {
  assert.equal(validate("poppy-document", read("poppy")), true);
  for (const version of ["0.1", "0.3", "0.12", "1.0", "0.0", "0.01", "0.2.0", "0.x", "0.2 "]) {
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
    assert.equal(validate("poppy", document), false, "PAP 0.2 requires HTTPS resource URLs without fragments");
  }
});

test("OAuth discovery uses RFC 8414 insertion before a tenant path", () => {
  assert.equal(oauthMetadataUrl("https://provider.example/tenant/42"), "https://provider.example/.well-known/oauth-authorization-server/tenant/42");
  assert.equal(oauthMetadataUrl("https://provider.example/tenant/"), "https://provider.example/.well-known/oauth-authorization-server/tenant");
  assert.equal(oauthMetadataUrl("https://provider.example/tenant//"), "https://provider.example/.well-known/oauth-authorization-server/tenant");
  assert.equal(oauthMetadataUrl("https://provider.example"), "https://provider.example/.well-known/oauth-authorization-server");
  assert.equal(oauthMetadataUrl("https://provider.example/"), "https://provider.example/.well-known/oauth-authorization-server");
});

test("Poppy 0.2 identity binds the final host, exact issuer and case-insensitive authorized domains", () => {
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
  metadata.issuer = read("poppy").auth.issuer; metadata.poppy_domains = ["different.example"];
  assert.ok(checkPoppyIdentity(read("poppy"), discovery, metadata).some(e => e.includes("poppy_domains")));
  metadata.poppy_domains = [read("poppy").organization.domain.toUpperCase()];
  assert.deepEqual(checkPoppyIdentity(read("poppy"), discovery, metadata), []);
  const legacy = JSON.parse(readFileSync(resolve(ROOT, "spec/v2.0/examples/poppy.example.json"), "utf8"));
  assert.deepEqual(checkPoppyIdentity(legacy, www, read("poppy-oauth-metadata")), [], "frozen PAP 0.1 retains its original identity rules");
});

test("Poppy 0.2 validates optional feedback and ES256 metadata", () => {
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
});

test("advertised sign-in methods need matching metadata endpoints", () => {
  const document = read("poppy");
  document.auth.direct = { scopes: ["poppy:read"] };
  document.auth.device = { scopes: ["poppy:read"] };
  assert.equal(validate("poppy", document), true);
  assert.equal(checkPoppyIdentity(document, discovery, read("poppy-oauth-metadata")).length, 2);
});

test("guest session responses cannot grant account scopes or account credentials", () => {
  const token = read("poppy-session-token");
  assert.equal(validate("poppy-session-token", token), true);
  for (const patch of [{ expires_in: 0 }, { expires_in: -1 }, { token_type: "JWT" }, { scope: "poppy:write" }, { refresh_token: "not-for-guests" }]) {
    assert.equal(validate("poppy-session-token", { ...token, ...patch }), false);
  }
  assert.equal(validate("poppy-session-token", { ...token, signed_in: true, scope: "poppy:read", refresh_token: "example-account-token" }), true);
});
