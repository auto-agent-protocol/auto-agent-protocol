import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { globSync } from "glob";
import { ROOT } from "../../tools/lib/releases.js";
import {
  PAP_PROTOCOL_VERSION, PAP_SPECIFICATION_REVISION, checkPoppyAssertion, checkPoppyClientIdentity, checkPoppyIdentity, checkPoppyMcpResource, checkPoppySessionClaims,
  checkPoppySupportedVersions, checkPoppyTokenResponse, checkPoppyVersionHeader, choosePoppyVersion, parsePoppyExtensions, poppyAlternativeReferences, poppyCompanyIdentifier,
  poppyExtensionEntry, poppyJwkThumbprint, poppyScopeChanges, poppySessionDestination, poppyVersionsCompatible,
} from "../../tools/lib/poppy.js";

const ajv = new Ajv2020({ strict: false, allErrors: true }); addFormats(ajv);
for (const file of globSync("spec/latest/schemas/**/*.json", { cwd: ROOT })) ajv.addSchema(JSON.parse(readFileSync(resolve(ROOT, file), "utf8")));
const validate = (name: string, value: unknown) => ajv.validate(`https://draft.autoagentprotocol.invalid/latest/schemas/${name}.schema.json`, value);
const read = (name: string) => JSON.parse(readFileSync(resolve(ROOT, `spec/latest/examples/${name}.example.json`), "utf8"));
const discovery = "https://demo-toyota.example.com/.well-known/poppy.json";
const issuer = read("poppy-oauth-metadata").issuer;
const resource = () => ({ status: 200 as const, document: read("poppy-protected-resource-metadata.existing-issuer") });
const context = () => ({ clientId: read("poppy-client-metadata").client_id, companyIdentifier: "https://demo-toyota.example.com", method: "POST", url: read("poppy-session-jwt").payload.htu, now: 1790899201, windowSeconds: 60 });
const compact = (delegation: any) => [delegation.header, delegation.payload].map(value => Buffer.from(JSON.stringify(value)).toString("base64url")).join(".") + ".illustrative_invalid_signature";
const identity = (document: any, metadata?: any, final = discovery, found: any = { status: 404 }) => checkPoppyIdentity(document, discovery, metadata, final, found);

test("the profile pins PAP 1.0 and its frozen upstream revision", () => {
  assert.equal(PAP_PROTOCOL_VERSION, "1.0");
  const pin = JSON.parse(readFileSync(resolve(ROOT, "tests/upstream/poppy/published-1.0/sha256.json"), "utf8"));
  assert.equal(pin.commit, PAP_SPECIFICATION_REVISION);
  for (const name of ["poppy", "poppy.existing-issuer", "poppy.native-mcp"]) {
    assert.equal(validate("poppy", read(name)), true, ajv.errorsText());
    assert.equal(read(name).protocol_version, "1.0");
  }
});

test("an issuerless dealer can advertise every optional signed-out surface in one valid document", () => {
  const document = read("poppy.optional-surfaces");
  assert.equal(validate("poppy", document), true, ajv.errorsText());
  assert.deepEqual(identity(document), []);
  assert.deepEqual(Object.keys(document.supported_versions), ["0.3"]);
  assert.equal(document.agent.protocols[0].description.length > 0, true);
  assert.equal(poppyExtensionEntry(document, "operations", "3")?.endpoint, undefined, "no website approvals, so no operations endpoint");
  assert.equal(poppySessionDestination(document, document.tasks.endpoint), "protocol");
  assert.equal(poppySessionDestination(document, "https://demo-toyota.example.com/poppy/feedback"), "website", "without the tasks response a feedback URL is not a known protocol endpoint");
  const website = { ...document, extensions: { ...document.extensions, operations: [{ version: "3", endpoint: "https://demo-toyota.example.com/poppy/operations" }] } };
  assert.equal(validate("poppy", website), true, ajv.errorsText()); assert.deepEqual(identity(website), []);
  const noJoin = { ...website, web: {} };
  assert.equal(validate("poppy", noJoin), false, "website approvals need browser join"); assert.ok(identity(noJoin).some(error => error.includes("operations endpoint")));
  assert.ok(identity({ ...document, agent: { protocols: [{ ...document.agent.protocols[0], access: "signed_in" }] } }).length, "signed_in needs an issuer");
});

test("version compatibility is major-based from 1.0 and exact-minor before it (spec 3.4)", () => {
  for (const [a, b, expected] of [["1.0", "1.0", true], ["1.0", "1.4", true], ["1.3", "1.0", true], ["1.0", "2.0", false], ["0.3", "0.3", true], ["0.3", "0.4", false], ["0.4", "1.0", false], ["1", "1.0", false], ["1.0.0", "1.0", false]] as const) {
    assert.equal(poppyVersionsCompatible(a, b), expected, `${a} ~ ${b}`);
  }
  const document = { ...read("poppy"), supported_versions: { "0.3": "https://demo-toyota.example.com/poppy/0.3.json" } };
  assert.equal(validate("poppy", document), true, ajv.errorsText());
  assert.deepEqual(choosePoppyVersion(document, ["1.0"]), { version: "1.0" });
  assert.deepEqual(choosePoppyVersion(document, ["0.3"]), { version: "0.3", url: "https://demo-toyota.example.com/poppy/0.3.json" });
  assert.deepEqual(choosePoppyVersion(document, ["0.3", "1.0"]), { version: "1.0" }, "the newest compatible version wins");
  assert.equal(choosePoppyVersion({ ...document, protocol_version: "1.2" }, ["1.0"])!.version, "1.2", "a newer minor version stays usable");
  assert.equal(choosePoppyVersion(document, ["0.4", "2.0"]), undefined, "no shared version means no use");
  for (const version of ["0.3", "0.4", "2.0", "1.0.0", "1"]) assert.equal(validate("poppy-document", { ...read("poppy"), protocol_version: version }), false, version);
  assert.equal(validate("poppy-document", { ...read("poppy"), protocol_version: "1.1", future_field: true }), true, "readers accept later 1.x documents and unknown fields");
  assert.equal(validate("poppy", { ...read("poppy"), protocol_version: "1.1" }), false, "the AAP 4.0 publication profile is exactly 1.0");
});

test("supported_versions stays on the discovery host and keeps one Company identity", () => {
  const document = { ...read("poppy.existing-issuer"), supported_versions: { "0.3": "https://demo-toyota.example.com/poppy/0.3.json" } };
  const frozen = JSON.parse(readFileSync(resolve(ROOT, "spec/v3.2/examples/poppy.existing-issuer.example.json"), "utf8"));
  assert.deepEqual(checkPoppySupportedVersions(document, discovery, { "0.3": frozen }), [], "the frozen AAP 3.2 document can be served next to 1.0");
  for (const url of ["https://files.demo-toyota.example.com/poppy/0.3.json", "https://other.example/0.3.json", "https://demo-toyota.example.com:8443/0.3.json"]) {
    assert.ok(checkPoppySupportedVersions({ ...document, supported_versions: { "0.3": url } }, discovery).length, url);
  }
  assert.equal(validate("poppy-document", { ...document, supported_versions: { "0.3": "http://demo-toyota.example.com/0.3.json" } }), false);
  assert.equal(validate("poppy-document", { ...document, supported_versions: { latest: "https://demo-toyota.example.com/0.3.json" } }), false);
  assert.equal(validate("poppy", { ...document, supported_versions: { "1.0": "https://demo-toyota.example.com/1.0.json" } }), false, "the preferred version is not listed again");
  for (const change of [(other: any) => other.protocol_version = "0.2", (other: any) => other.supported_versions = {}, (other: any) => other.organization.domain = "other.example", (other: any) => other.auth.issuer = "https://other.example/issuer"]) {
    const other = structuredClone(frozen); change(other);
    assert.ok(checkPoppySupportedVersions(document, discovery, { "0.3": other }).length);
  }
  const implicit = structuredClone(frozen); delete implicit.auth.issuer;
  assert.deepEqual(checkPoppySupportedVersions(document, discovery, { "0.3": implicit }), [], "a version document may leave a single issuer implicit");
  assert.ok(checkPoppySupportedVersions({ ...document, supported_versions: { "0.3": "not a url" } }, discovery).length);
  const next = { protocol_version: "2.0", organization: document.organization, supported_versions: { "1.0": "https://demo-toyota.example.com/poppy/1.0.json" } };
  assert.deepEqual(choosePoppyVersion(next, ["1.0"]), { version: "1.0", url: "https://demo-toyota.example.com/poppy/1.0.json" }, "a 1.0 agent finds its version behind a later major");
  assert.equal(validate("poppy-document", next), false, "the reader schema applies to the chosen 1.x document, not to the 2.0 one");
});

test("Poppy-Version is required wherever the Session header is verified", () => {
  assert.equal(checkPoppyVersionHeader("1.0", ["1.0"]), undefined);
  assert.equal(checkPoppyVersionHeader("1.2", ["1.0"]), undefined, "a compatible minor version is served as 1.0 defines");
  for (const header of [undefined, "", "0.3", "2.0", "1", "v1.0", "1.0, 0.3"]) assert.equal(checkPoppyVersionHeader(header, ["1.0"]), "version_unsupported", String(header));
  assert.equal(checkPoppyVersionHeader("0.3", ["1.0", "0.3"]), undefined, "a Company may serve the older version too");
  const error = read("poppy-session-error.version-unsupported");
  assert.equal(validate("poppy-session-error", error), true); assert.equal(validate("poppy-error", error), true);
  assert.equal(validate("poppy-session-error", { error: "invalid_token" }), false);
});

test("Poppy-Extensions is an RFC 9651 list of names with a version parameter", () => {
  assert.deepEqual([...parsePoppyExtensions('"operations";v="3", "links";v="1"')], [["operations", "3"], ["links", "1"]]);
  assert.deepEqual([...parsePoppyExtensions('"autoagentprotocol.org/aap";v="1"')], [["autoagentprotocol.org/aap", "1"]]);
  for (const header of [undefined, "", '"operations";v="3",,', '"operations";v="3", "links;v="1"', '"operations";v="3";x=@@', '"operations" v="3"']) {
    assert.equal(parsePoppyExtensions(header).size, 0, `${header} fails to parse and declares no extensions`);
  }
  for (const header of ["operations;v=3", '"operations"', '"operations";v=3', '"operations";v="3", "operations";v="2"']) {
    assert.equal(parsePoppyExtensions(header).size, 0, `${header} parses but declares no usable version`);
  }
  assert.deepEqual([...parsePoppyExtensions('"operations";v="3", "example.com/x";v=1')], [["operations", "3"]], "a member without a String version does not discard the others");
  assert.deepEqual([...parsePoppyExtensions('"operations";v="2";v="3"')], [["operations", "3"]], "RFC 9651 parameters are last-wins");
  assert.deepEqual([...parsePoppyExtensions('"a,b";v="1", "operations";v="3";future=?1')], [["a,b", "1"], ["operations", "3"]], "commas inside Strings and unknown parameters are fine");
  assert.deepEqual([...parsePoppyExtensions('"operations";v="3", "operations";v="3"')], [["operations", "3"]]);
  const required = read("poppy-error.extension-required");
  assert.equal(validate("poppy-error", required), true);
  assert.equal(validate("poppy-error", { error: "extension_required" }), false, "the error names the extension");
  assert.equal(validate("poppy-error", { error: "version_mismatch" }), false, "the error gives the conversation's protocol version");
  assert.equal(validate("poppy-error", { error: "version_mismatch", protocol_version: "1.0" }), true);
});

test("extensions are lists with one entry per major version; the AAP bridge stays version 1", () => {
  const document = read("poppy");
  assert.equal(Array.isArray(document.extensions["autoagentprotocol.org/aap"]), true);
  assert.equal(poppyExtensionEntry(document, "autoagentprotocol.org/aap", "1").agent_card, "https://demo-toyota.example.com/.well-known/agent-card.json");
  assert.equal(poppyExtensionEntry(document, "autoagentprotocol.org/aap", "2"), undefined);
  assert.equal(validate("poppy-aap-extension", document.extensions["autoagentprotocol.org/aap"][0]), true);
  const object = read("poppy"); object.extensions["autoagentprotocol.org/aap"] = object.extensions["autoagentprotocol.org/aap"][0];
  assert.equal(validate("poppy", object), false, "the 0.3 object form is not PAP 1.0"); assert.equal(validate("poppy-document", object), false);
  const future = read("poppy"); future.extensions["autoagentprotocol.org/aap"].push({ version: "2", anything: true }); future.extensions["example.com/gift-wrap"] = [{ version: "7", endpoint: "https://demo-toyota.example.com/gift" }];
  assert.equal(validate("poppy", future), true, "unknown extensions and later bridge versions are ignored");
  for (const change of [(d: any) => d.extensions["autoagentprotocol.org/aap"] = [], (d: any) => d.extensions["autoagentprotocol.org/aap"][0].version = "2", (d: any) => d.extensions["autoagentprotocol.org/aap"].push({ ...d.extensions["autoagentprotocol.org/aap"][0] }),
    (d: any) => delete d.extensions["autoagentprotocol.org/aap"][0].mcp, (d: any) => delete d.extensions["autoagentprotocol.org/aap"][0].llms_txt, (d: any) => d.extensions["autoagentprotocol.org/aap"][0].aap_version = "3.2.0", (d: any) => d.extensions["operations"] = { version: "3" }]) {
    const changed = read("poppy"); change(changed);
    assert.equal(validate("poppy", changed), false);
  }
});

test("issuer selection is bidirectional and discovery failures never imply issuer removal", () => {
  assert.deepEqual(identity(read("poppy")), []);
  assert.deepEqual(identity(read("poppy.existing-issuer"), read("poppy-oauth-metadata"), discovery, resource()), []);
  assert.equal(poppyCompanyIdentifier(read("poppy"), { status: 404 }).identifier, "https://demo-toyota.example.com");
  assert.equal(poppyCompanyIdentifier(read("poppy.existing-issuer"), resource()).identifier, issuer);
  assert.ok(poppyCompanyIdentifier(read("poppy"), { status: "error" }).errors.length);
  assert.ok(poppyCompanyIdentifier(read("poppy.existing-issuer"), { status: 404 }).errors.length);
  const multiple = resource(); multiple.document.authorization_servers.push("https://staff.example/issuer");
  assert.ok(poppyCompanyIdentifier(read("poppy"), multiple).errors.length);
  assert.equal(poppyCompanyIdentifier(read("poppy.existing-issuer"), multiple).identifier, issuer);
  const metadata = read("poppy-oauth-metadata"); metadata.protected_resources = ["https://demo-toyota.example.com/"];
  assert.ok(identity(read("poppy.existing-issuer"), metadata, discovery, resource()).length);
  assert.ok(checkPoppyIdentity(read("poppy"), discovery, undefined, discovery, undefined).some(error => error.includes("explicit 404")));
});

test("organization.domain is the final discovery host, with its port when that is not 443", () => {
  for (const url of [discovery.replace("https:", "http:"), discovery + "?query=1", discovery.replace("poppy.json", "other.json"), discovery.replace("demo-toyota", "www.demo-toyota"), discovery.replace(".com/", ".com:8443/")]) assert.ok(identity(read("poppy"), undefined, url).length, url);
  const ported = read("poppy"); ported.organization.domain = "demo-toyota.example.com:8443";
  assert.equal(validate("poppy-document", ported), true, ajv.errorsText());
  assert.deepEqual(checkPoppyIdentity(ported, discovery.replace(".com/", ".com:8443/"), undefined, discovery.replace(".com/", ".com:8443/"), { status: 404 }), []);
  assert.equal(poppyCompanyIdentifier(ported, { status: 404 }).identifier, "https://demo-toyota.example.com:8443");
  assert.ok(identity(ported).length, "a document for another port does not speak for the default port");
  for (const domain of ["demo-toyota.example.com:443", "demo-toyota.example.com:0", "demo-toyota.example.com:", "https://demo-toyota.example.com", "demo-toyota.example.com/path"]) assert.equal(validate("poppy-document", { ...read("poppy"), organization: { name: "Demo", domain } }), false, domain);
  for (const url of ["http://dealer.example/api", "https://user:secret@dealer.example/api", "https:///api", "https://dealer.example/has space"]) {
    const document = read("poppy"); document.apis[0].url = url;
    assert.equal(validate("poppy", document), false, url);
  }
});

test("readers retain unknown data but publishers reject retired 0.3 fields", () => {
  const document = read("poppy"); document.future = true; document.apis.push({ type: "future", url: "https://dealer.example/api", description: "Ignore" });
  assert.equal(validate("poppy-document", document), true); assert.equal(validate("poppy", document), false);
  for (const [field, value] of [["excluded_tasks", { url: "https://demo-toyota.example.com/excluded.json" }], ["feedback", { endpoint: "https://demo-toyota.example.com/feedback" }], ["skill_index", { skills: [] }]] as const) {
    const old = read("poppy"); old[field] = value;
    assert.equal(validate("poppy-document", old), true, `${field} is ignored by a 1.0 reader`); assert.equal(validate("poppy", old), false, `${field} moved to the tasks response`);
  }
  for (const name of ["direct", "device", "custom_scopes", "mediated"]) {
    const old = read("poppy.existing-issuer"); old.auth[name] = {};
    assert.equal(validate("poppy", old), false);
  }
  const hint = read("poppy.existing-issuer"); hint.auth.scope_hints = { read: { changes: "future", personal_data: false } };
  assert.equal(validate("poppy-document", hint), true); assert.equal(validate("poppy", hint), false);
  assert.equal(validate("poppy-document", { ...read("poppy.existing-issuer"), auth: { scope_hints: { read: { changes: "none" } } } }), false, "both hint fields are required");
  assert.equal(poppyScopeChanges("future"), "irreversible"); assert.equal(poppyScopeChanges(undefined), undefined);
});

test("conversation entries need a description; web flags and disabled sign-in are consistent", () => {
  const entry = { type: "poppy", endpoint: "https://demo-toyota.example.com/poppy/conversations" };
  assert.equal(validate("poppy", { ...read("poppy"), agent: { protocols: [entry] } }), false, "description is required in 1.0");
  assert.equal(validate("poppy", { ...read("poppy"), agent: { protocols: [{ ...entry, description: "Questions about inventory, pricing and visits." }] } }), true, ajv.errorsText());
  assert.equal(validate("poppy", { ...read("poppy"), agent: { protocols: [{ type: "ucp", endpoint: "https://demo-toyota.example.com/ucp/ask", description: "Product questions" }] } }), true, "other conversation protocol types may be listed");
  assert.equal(validate("poppy", { ...read("poppy"), agent: { protocols: [{ ...entry, description: "Help", access: "future" }] } }), false, "a published poppy entry uses a known access hint");
  assert.equal(validate("poppy-document", { ...read("poppy"), agent: { protocols: [{ ...entry, description: "Help", access: "future" }] } }), true, "readers treat an unknown hint as absent");
  for (const patch of [{ agent: { protocols: [{ ...entry, description: "Account help", access: "signed_in" }] } }, { extensions: { ...read("poppy").extensions, "mediated-sign-in": [{ version: "1", fields: [{ name: "email", label: "Email", secret: false }], scopes: ["read"] }] } }]) {
    const document = { ...read("poppy.existing-issuer"), ...patch };
    assert.equal(validate("poppy", document), false);
    assert.ok(identity(document, read("poppy-oauth-metadata"), discovery, resource()).length);
  }
  const join = "https://demo-toyota.example.com/poppy/browser-session";
  for (const [web, valid] of [[{ disabled: true }, true], [{ disabled: true, browser_session_endpoint: join }, false], [{ unscoped: true }, false], [{ unscoped: true, browser_session_endpoint: join }, true], [{ browser_session_endpoint: join }, true]] as const) {
    const document = { ...read("poppy"), web };
    assert.equal(validate("poppy", document), valid, JSON.stringify(web));
    assert.equal(identity(document).length === 0, valid, JSON.stringify(web));
  }
});

test("issuer metadata accepts ES256 and PS384, supports PAR, and offers the browser sign-in scope with browser join", () => {
  const metadata = read("poppy-oauth-metadata");
  assert.equal(validate("poppy-oauth-metadata", metadata), true);
  assert.deepEqual(metadata.token_endpoint_auth_signing_alg_values_supported, ["ES256", "PS384"]);
  const offering = { ...metadata, grant_types_supported: ["refresh_token", "authorization_code"], authorization_endpoint: `${issuer}/oauth/authorize` };
  const enabled = { ...read("poppy.existing-issuer"), auth: { issuer } };
  assert.deepEqual(identity(enabled, offering, discovery, resource()), []);
  for (const algorithms of [["ES256"], ["PS384"], ["RS256"]]) {
    const listed = { token_endpoint_auth_signing_alg_values_supported: algorithms };
    assert.ok(identity(enabled, { ...offering, ...listed }, discovery, resource()).some(error => error.includes("ES256 and with PS384")), `${algorithms} with sign-in offered`);
    assert.equal(validate("poppy-oauth-metadata", { ...metadata, ...listed }), true, "the list describes every client of the issuer");
    assert.deepEqual(identity(read("poppy.existing-issuer"), { ...metadata, ...listed }, discovery, resource()), [], "an issuer with Personal Agent sign-in disabled may list other algorithms");
  }
  for (const grants of [[], ["authorization_code"], ["refresh_token", "authorization_code"], ["refresh_token", "urn:ietf:params:oauth:grant-type:device_code"]]) assert.equal(validate("poppy-oauth-metadata", { ...metadata, grant_types_supported: grants }), false);
  assert.equal(validate("poppy-oauth-metadata", { ...metadata, require_pushed_authorization_requests: true }), false);
  const par = { ...metadata, require_pushed_authorization_requests: true, pushed_authorization_request_endpoint: `${issuer}/oauth/par`, dpop_signing_alg_values_supported: ["ES256"] };
  assert.equal(validate("poppy-oauth-metadata", par), true, ajv.errorsText());
  const signIn = { ...metadata, grant_types_supported: ["refresh_token", "authorization_code"], authorization_endpoint: `${issuer}/oauth/authorize`, scopes_supported: ["saved_searches:read"] };
  const document = { ...read("poppy.existing-issuer"), auth: { issuer }, web: { browser_session_endpoint: "https://demo-toyota.example.com/poppy/browser-session" } };
  assert.ok(identity(document, signIn, discovery, resource()).some(error => error.includes("poppy:browser-sign-in")));
  assert.deepEqual(identity(document, { ...signIn, scopes_supported: ["saved_searches:read", "poppy:browser-sign-in"] }, discovery, resource()), []);
});

test("client metadata and assertions follow 1.0: no extensions member, five-minute assertions", () => {
  const metadata = read("poppy-client-metadata");
  assert.equal(validate("poppy-client-metadata", metadata), true);
  assert.deepEqual(checkPoppyClientIdentity(metadata, metadata.client_id, true), []);
  assert.ok(checkPoppyClientIdentity({ ...metadata, jwks_uri: "https://keys.other.example/jwks.json" }, metadata.client_id).length);
  const claims = read("poppy-client-assertion");
  assert.equal(validate("poppy-client-assertion", claims), true);
  assert.deepEqual(checkPoppyAssertion(claims, metadata.client_id, issuer), []);
  assert.deepEqual(checkPoppyAssertion({ ...claims, exp: claims.iat + 300 }, metadata.client_id, issuer), [], "exactly five minutes is accepted");
  for (const change of [{ exp: claims.iat + 301 }, { exp: claims.iat }, { aud: `${issuer}/oauth/token` }, { aud: [issuer] }, { sub: "https://other.example/client.json" }, { jti: "" }]) {
    assert.ok(checkPoppyAssertion({ ...claims, ...change }, metadata.client_id, issuer).length, JSON.stringify(change));
  }
  assert.deepEqual(checkPoppyTokenResponse(read("poppy-access-token-response"), { grant: "sign-in", requestedScopes: ["saved_searches:read"] }), []);
  assert.ok(checkPoppyTokenResponse({ ...read("poppy-access-token-response"), scope: "saved_searches:read leads:write" }, { grant: "sign-in", requestedScopes: ["saved_searches:read"] }).length);
});

test("delegated Session JWTs verify by client_id, sid and User ID; delegations may be ES256 or PS384", () => {
  const session = read("poppy-session-jwt"), delegation = read("poppy-delegation");
  assert.equal(validate("poppy-session-jwt", session), true); assert.equal(validate("poppy-delegation", delegation), true);
  assert.deepEqual(checkPoppySessionClaims(session, delegation, context()), []);
  const blind = structuredClone(delegation); blind.header.alg = "PS384";
  const viaBlind = structuredClone(session); viaBlind.header.poppy_dlg = compact(blind);
  assert.equal(validate("poppy-delegation", blind), true, "blind-signed PS384 delegations are accepted");
  assert.deepEqual(checkPoppySessionClaims(viaBlind, blind, context()), []);
  for (const alg of ["RS256", "ES384", "none"]) assert.equal(validate("poppy-delegation", { ...delegation, header: { ...delegation.header, alg } }), false, alg);
  assert.equal(validate("poppy-session-jwt", { ...session, header: { ...session.header, alg: "PS384" } }), false, "Session JWTs are always ES256");
  const { clientId } = context(), { sid, sub } = session.payload;
  assert.deepEqual(checkPoppySessionClaims(session, delegation, { ...context(), sessions: [{ clientId, sid, sub }] }), [], "a known combination continues its Session");
  assert.deepEqual(checkPoppySessionClaims(session, delegation, { ...context(), sessions: [{ clientId, sid, sub: "usr_someone_else" }, { clientId: "https://other.example/client.json", sid, sub }] }), [], "an unknown combination starts a new signed-out Session");
  assert.deepEqual(checkPoppySessionClaims(session, delegation, { ...context(), sessions: [{ clientId, sid, sub, ended: true }] }), ["session_ended"]);
  assert.ok(checkPoppySessionClaims(session, delegation, { ...context(), sessions: [{ clientId, sid, sub, agent_id: "agt_travel" }] }).length, "agent_id stays the same within a Session");
  const rotated = structuredClone(delegation); rotated.payload.cnf.jwk.x = rotated.payload.cnf.jwk.y; rotated.payload.jti = "rotated-delegation";
  const next = structuredClone(session); next.header.kid = poppyJwkThumbprint(rotated.payload.cnf.jwk); next.header.poppy_dlg = compact(rotated);
  assert.deepEqual(checkPoppySessionClaims(next, rotated, { ...context(), sessions: [{ clientId, sid, sub }] }), [], "delegated keys rotate without changing the Session");
  for (const change of [(s: any) => s.payload.aud = `${s.payload.aud}/`, (s: any) => s.payload.htm = "GET", (s: any) => s.payload.htu += "/other", (s: any) => s.payload.iat += 120, (s: any) => s.header.kid = "wrong", (s: any) => s.payload.ath = "unexpected"]) {
    const changed = structuredClone(session); change(changed);
    assert.ok(checkPoppySessionClaims(changed, delegation, context()).length);
  }
  const ahead = structuredClone(delegation); ahead.payload.iat = context().now + 5;
  assert.deepEqual(checkPoppySessionClaims({ ...session, header: { ...session.header, poppy_dlg: compact(ahead) } }, ahead, context()), [], "a few seconds of clock skew do not invalidate a delegation");
  assert.ok(checkPoppySessionClaims({ ...session, payload: { ...session.payload, htu: "not a url" } }, delegation, context()).length);
  const long = structuredClone(delegation); long.payload.exp = long.payload.iat + 86401;
  assert.ok(checkPoppySessionClaims({ ...session, header: { ...session.header, poppy_dlg: compact(long) } }, long, context()).length, "delegations last at most 24 hours");
  const token = "example-access-token", signedIn = structuredClone(session); signedIn.payload.ath = createHash("sha256").update(token).digest("base64url");
  assert.deepEqual(checkPoppySessionClaims(signedIn, delegation, { ...context(), accessToken: token, tokenClientId: clientId }), []);
  assert.ok(checkPoppySessionClaims(signedIn, delegation, { ...context(), accessToken: token, tokenClientId: "https://other.example/client.json" }).length);
  for (const forbidden of ["sub", "aud", "agent_id"]) assert.equal(validate("poppy-delegation", { ...delegation, payload: { ...delegation.payload, [forbidden]: "x" } }), false, `a delegation never carries ${forbidden}`);
});

test("Session JWTs go only to listed APIs, protocol endpoints and pages on exactly organization.domain", () => {
  const document = { ...read("poppy.native-mcp"), tasks: { endpoint: "https://api.provider.example/poppy/tasks" }, web: { browser_session_endpoint: "https://demo-toyota.example.com/poppy/browser-session" },
    agent: { protocols: [{ type: "poppy", endpoint: "https://chat.provider.example/poppy/conversations", description: "Inventory questions" }] }, extensions: { ...read("poppy").extensions, operations: [{ version: "3", endpoint: "https://demo-toyota.example.com/poppy/operations" }] } };
  const servers = { apiServers: ["https://demo-toyota.example.com/poppy"], feedbackEndpoint: "https://api.provider.example/poppy/feedback", oauthEndpoints: ["https://demo-toyota.example.com/poppy/oauth/token"] };
  document.supported_versions = { "0.3": "https://demo-toyota.example.com/poppy/0.3.json" };
  for (const [url, expected] of [
    ["https://demo-toyota.example.com/poppy/skills/inventory.search", "api"], ["https://api.provider.example/aap/0.0.0-dev/demo-toyota/mcp", "api"],
    ["https://api.provider.example/poppy/tasks", "protocol"], ["https://chat.provider.example/poppy/conversations/cnv_1/messages", "protocol"],
    ["https://demo-toyota.example.com/poppy/browser-session/authorize", "protocol"], ["https://demo-toyota.example.com/poppy/operations", "protocol"],
    ["https://demo-toyota.example.com/inventory/dt-3107", "website"], ["https://api.provider.example/poppy/feedback", "protocol"],
    ["https://demo-toyota.example.com/.well-known/poppy.json", undefined], ["https://demo-toyota.example.com/.well-known/oauth-protected-resource", undefined], ["https://demo-toyota.example.com/.well-known/agent-card.json", undefined],
    ["https://demo-toyota.example.com/poppy/openapi.yaml", undefined], ["https://demo-toyota.example.com/poppy/0.3.json", undefined], ["https://demo-toyota.example.com/poppy/oauth/token", undefined],
    ["https://demo-toyota.example.com/poppy/browser-session/authorize/x", "api"], ["https://api.provider.example/aap/0.0.0-dev/demo-toyota/mcp/other", undefined], ["https://user:secret@demo-toyota.example.com/inventory", undefined], ["not a url", undefined],
    ["https://www.demo-toyota.example.com/inventory", undefined], ["https://api.provider.example/other-tenant/mcp", undefined], ["http://demo-toyota.example.com/inventory", undefined], ["https://chat.provider.example/poppy/conversations-admin", undefined], ["https://chat.provider.example/poppy/conversations/cnv_1/export", undefined], ["https://api.provider.example/poppy/tasks/other", undefined],
    ["https://chat.provider.example/poppy/conversations", "protocol"], ["https://chat.provider.example/poppy/conversations/cnv_1/handoff/cancel", "protocol"],
  ] as const) assert.equal(poppySessionDestination(document, url, servers), expected, url);
});

test("native PAP MCP uses the advertised URL as its protected resource and names the Company issuer", () => {
  const native = read("poppy.native-mcp"), metadata = read("poppy-protected-resource-metadata.native-mcp");
  assert.deepEqual(checkPoppyMcpResource(native, native.auth.issuer, metadata.resource, metadata), []);
  assert.ok(checkPoppyMcpResource(native, native.auth.issuer, metadata.resource, { ...metadata, resource: `${metadata.resource}/` }).length);
  assert.ok(checkPoppyMcpResource(native, native.auth.issuer, metadata.resource, { ...metadata, authorization_servers: ["https://other.example/issuer"] }).length);
  assert.ok(checkPoppyMcpResource(read("poppy"), undefined, metadata.resource, metadata).length, "a public MCP link in the AAP bridge is not a native PAP API");
});

test("task coverage comes from one tasks response per Session", () => {
  const tasks = read("poppy-tasks");
  assert.equal(validate("poppy-tasks", tasks), true, ajv.errorsText());
  assert.equal(validate("poppy-tasks", {}), true, "every member is optional");
  assert.equal(validate("poppy-tasks", { excluded_tasks: [{ alternative: { instructions: "x" } }] }), false);
  assert.equal(validate("poppy-tasks", { feedback: { endpoint: "http://demo-toyota.example.com/feedback" } }), false);
  assert.equal(validate("poppy-tasks", { excluded_tasks: [{ task: "x", alternative: {} }] }), false, "an alternative has instructions or references");
  const document = read("poppy");
  for (const task of tasks.excluded_tasks.filter((entry: any) => entry.alternative)) assert.equal(poppyAlternativeReferences(document, task.alternative).length, task.alternative.references.length);
  const unlisted = { references: [{ type: "mcp", url: "https://unlisted.example/mcp", tool: "aap_lead_submit" }, { type: "future", url: "https://demo-toyota.example.com/x" }] };
  assert.equal(poppyAlternativeReferences(document, unlisted).length, 0, "references to unlisted APIs and unknown types are ignored");
  const report = read("poppy-feedback-request");
  assert.equal(validate("poppy-feedback-request", report), true);
  assert.equal(validate("poppy-feedback-request", { ...report, task: "x".repeat(201) }), false); assert.equal(validate("poppy-feedback-request", { ...report, description: "x".repeat(2001) }), false);
  const withTasks = { ...document, tasks: { endpoint: "https://demo-toyota.example.com/poppy/tasks" } };
  assert.equal(validate("poppy", withTasks), true, ajv.errorsText());
  assert.equal(validate("poppy", { ...document, tasks: {} }), false);
});

test("optional Operations approvals carry exact terms and never replace AAP consent", () => {
  const required = read("poppy-approval-required"), approval = read("poppy-approval"), declined = read("poppy-approval-declined");
  for (const [name, value] of [["poppy-approval-required", required], ["poppy-operation", read("poppy-operation")], ["poppy-approval", approval], ["poppy-approval-declined", declined]] as const) assert.equal(validate(name, value), true, `${name}: ${ajv.errorsText()}`);
  assert.equal(approval.operation_id, required.operation.operation_id); assert.equal(approval.revision, required.operation.revision);
  assert.equal(required.operation.terms.idempotency_key.length > 0, true, "the terms identify the AAP submission they approve");
  for (const missing of ["operation_id", "revision", "terms", "expires_at"]) { const operation = { ...required.operation }; delete operation[missing]; assert.equal(validate("poppy-operation", operation), false, missing); }
  assert.equal(validate("poppy-approval", { ...approval, approver: undefined }), false, "approver is required");
  assert.equal(validate("poppy-approval", { ...approval, approver: "company" }), false);
  assert.equal(validate("poppy-approval", { ...approval, approver: "agent" }), false, "input_type comes only with a user approval");
  assert.equal(validate("poppy-approval", { operation_id: approval.operation_id, revision: approval.revision, approver: "agent", approved_at: 1792742455 }), true);
  assert.equal(validate("poppy-approval-declined", { ...declined, operation_id: "not valid!" }), false);
  const result = read("poppy-operation-result");
  assert.equal(validate("poppy-operation-result", result), true, ajv.errorsText());
  assert.deepEqual(result.operation, required.operation, "the MCP result carries the same operation as the HTTP body");
  assert.equal(validate("poppy-operation-result", { error: "approval_required" }), false);
  const mcp = read("mcp-manifest").tools;
  for (const tool of mcp) {
    const write = ["aap_lead_submit", "aap_trade_in_submit", "aap_credit_application_submit"].includes(tool.name);
    const output = new Ajv2020({ strict: false, allErrors: true }); addFormats(output);
    const check = output.compile(tool.outputSchema);
    assert.equal(check(result), write, `${tool.name}: only write tools can return an operation`);
    assert.equal(check(declined), write, `${tool.name}: only write tools can decline an approval`);
  }
  const document = { ...read("poppy"), extensions: { ...read("poppy").extensions, operations: [{ version: "3" }] } };
  assert.equal(validate("poppy", document), true, "operations without website approvals lists no endpoint");
  assert.equal(poppyExtensionEntry(document, "operations", "3")?.version, "3");
  assert.equal(parsePoppyExtensions('"operations";v="2"').get("operations") === "3", false, "another major version is not support for version 3");
});
