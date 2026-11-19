import { createHash } from "node:crypto";
import { oauthMetadataUrl } from "./poppy-legacy.js";
export { oauthMetadataUrl, poppyRedirectMatches, poppyScopeChanges, poppyAlternativeReferences } from "./poppy-legacy.js";
export { checkPoppyClientIdentity, checkPoppyTokenResponse, checkPoppyMcpResource, poppyJwkThumbprint } from "./poppy-0.3.js";
import { poppyJwkThumbprint } from "./poppy-0.3.js";

/** PAP 1.0, published and frozen upstream on 2026-11-14. */
export const PAP_PROTOCOL_VERSION = "1.0";
export const PAP_SPECIFICATION_REVISION = "8c02b4282eda53468a7c09412558bc8b060d95f6";
export const AAP_BRIDGE_EXTENSION = "autoagentprotocol.org/aap";
export type PoppyResourceDiscovery = { status: 200; document: Record<string, any> } | { status: 404 } | { status: "error" };

const VERSION = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/;

/** Spec 3.4: the same major version and, before 1.0, the same minor version. */
export function poppyVersionsCompatible(a: string, b: string): boolean {
  const x = VERSION.exec(a), y = VERSION.exec(b);
  return !!x && !!y && x[1] === y[1] && (x[1] !== "0" || x[2] === y[2]);
}

/** Spec 3.4: the newest listed version compatible with one the Personal Agent implements, or undefined when there is none. */
export function choosePoppyVersion(document: Record<string, any>, implemented: string[]): { version: string; url?: string } | undefined {
  const listed: { version: string; url?: string }[] = [{ version: document.protocol_version }, ...Object.entries(document.supported_versions ?? {}).map(([version, url]) => ({ version, url: url as string }))];
  const rank = (version: string) => { const m = VERSION.exec(version)!; return Number(m[1]) * 1e6 + Number(m[2]); };
  return listed.filter(entry => VERSION.test(entry.version) && implemented.some(mine => poppyVersionsCompatible(mine, entry.version))).sort((a, b) => rank(b.version) - rank(a.version))[0];
}

/** Spec 3.4: each linked version document stays on the host that served poppy.json and speaks for the same Company. */
export function checkPoppySupportedVersions(document: Record<string, any>, finalDiscoveryUrl: string, linked: Record<string, Record<string, any>> = {}): string[] {
  const errors: string[] = [], host = new URL(finalDiscoveryUrl).host.toLowerCase();
  for (const [version, value] of Object.entries(document.supported_versions ?? {}) as [string, string][]) {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.host.toLowerCase() !== host || url.username || url.password) errors.push(`supported_versions ${version} must be an HTTPS URL on the host that served poppy.json`);
    if (version === document.protocol_version) errors.push("supported_versions lists only versions other than protocol_version");
    const other = linked[version];
    if (!other) continue;
    if (other.protocol_version !== version) errors.push(`The ${version} document must carry the protocol_version it is listed under`);
    if (other.supported_versions !== undefined) errors.push(`The ${version} document must not list supported_versions`);
    if (String(other.organization?.domain).toLowerCase() !== String(document.organization.domain).toLowerCase()) errors.push("Every served version keeps the same organization.domain");
    if (other.auth?.issuer !== document.auth?.issuer) errors.push("Every served version selects the same issuer");
  }
  return errors;
}

/** Spec 3.4: an endpoint that verifies the Session header rejects a missing or incompatible Poppy-Version. */
export function checkPoppyVersionHeader(header: string | undefined, served: string[]): "version_unsupported" | undefined {
  return header !== undefined && VERSION.test(header) && served.some(version => poppyVersionsCompatible(header, version)) ? undefined : "version_unsupported";
}

/** Spec 3.4: an RFC 9651 List of Strings, each with its version in the String parameter v. A header that fails to parse declares no extensions. */
export function parsePoppyExtensions(header: string | undefined): Map<string, string> {
  const declared = new Map<string, string>();
  if (header === undefined || header.trim() === "") return declared;
  const string = '"((?:[\\x20-\\x21\\x23-\\x5B\\x5D-\\x7E]|\\\\["\\\\])*)"';
  const member = new RegExp(`^${string}((?:;[ ]*[a-z*][a-z0-9_.*-]*(?:=(?:${string}|[^;,\\s]+))?)*)$`);
  for (const raw of header.split(/[ \t]*,[ \t]*/)) {
    const match = member.exec(raw.trim());
    if (!match) return new Map();
    const version = new RegExp(`;[ ]*v=${string}`).exec(match[2]);
    if (!version || declared.has(match[1])) return new Map();
    declared.set(match[1].replace(/\\(["\\])/g, "$1"), version[1].replace(/\\(["\\])/g, "$1"));
  }
  return declared;
}

/** Spec 3.3: the entry of one extension major version. Earlier AAP releases published a single object. */
export function poppyExtensionEntry(document: Record<string, any>, name: string, version: string): Record<string, any> | undefined {
  const value = document.extensions?.[name];
  return Array.isArray(value) ? value.find(entry => entry?.version === version) : value?.version === version ? value : undefined;
}

/** Structural/cross-document checks only. Callers must fetch safely and validate schemas first. */
export function poppyCompanyIdentifier(document: Record<string, any>, discovery: PoppyResourceDiscovery): { identifier?: string; errors: string[] } {
  const errors: string[] = [], domain = `https://${document.organization.domain.toLowerCase()}`;
  if (discovery.status === "error") return { errors: ["Failed resource discovery must not fall back to domain identity"] };
  const resource = discovery.status === 200 ? discovery.document : undefined;
  if (resource && resource.resource !== domain) errors.push("Domain resource must exactly equal https://{organization.domain} without a trailing slash");
  const servers: string[] = resource?.authorization_servers ?? [];
  const selected: string | undefined = document.auth?.issuer;
  if (!servers.length) {
    if (selected) errors.push("auth.issuer requires domain resource authorization_servers");
    return { identifier: errors.length ? undefined : domain, errors };
  }
  if (servers.length > 1 && !selected) errors.push("Multiple authorization_servers require auth.issuer selection");
  if (selected && !servers.includes(selected)) errors.push("auth.issuer must exactly match an authorization_servers entry");
  return { identifier: errors.length ? undefined : selected ?? servers[0], errors };
}

export function checkPoppyIdentity(
  document: Record<string, any>, discoveryUrl: string, metadata: Record<string, any> | undefined,
  finalDiscoveryUrl: string, resourceDiscovery: PoppyResourceDiscovery | undefined, implemented: string[] = [PAP_PROTOCOL_VERSION],
): string[] {
  const errors: string[] = [];
  if (!implemented.some(version => poppyVersionsCompatible(version, String(document.protocol_version)))) errors.push("Unsupported PAP version: no compatible major version");
  for (const value of [discoveryUrl, finalDiscoveryUrl]) {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/.well-known/poppy.json" || url.search || url.hash) errors.push("Discovery must use the HTTPS well-known path without credentials, query or fragment at every hop");
  }
  if (document.organization.domain.toLowerCase() !== new URL(finalDiscoveryUrl).host.toLowerCase()) errors.push("organization.domain must match the final discovery host, with its port when that is not 443, ignoring case only");
  errors.push(...checkPoppySupportedVersions(document, finalDiscoveryUrl));
  if (document.web?.disabled === true && document.web.browser_session_endpoint) errors.push("web.disabled must not list browser_session_endpoint");
  if (document.web?.disabled === true && !document.agent && !document.apis?.length) errors.push("web.disabled requires agent or apis");
  if (document.web?.unscoped === true && !document.web.browser_session_endpoint) errors.push("web.unscoped requires browser_session_endpoint");
  if (!resourceDiscovery) return [...errors, "Domain protected-resource discovery result is required, including an explicit 404"];
  const company = poppyCompanyIdentifier(document, resourceDiscovery); errors.push(...company.errors);
  const servers = resourceDiscovery.status === 200 ? resourceDiscovery.document.authorization_servers ?? [] : [];
  if (servers.length && company.identifier) {
    oauthMetadataUrl(company.identifier);
    if (!metadata) errors.push("Issuer metadata is required for the selected issuer");
    else {
      if (metadata.issuer !== company.identifier) errors.push("OAuth metadata issuer must exactly equal the selected issuer");
      const expected = `https://${document.organization.domain.toLowerCase()}`;
      if (!(metadata.protected_resources ?? []).some((resource: string) => /^https:\/\/[^/?#@%\\\s]+$/i.test(resource) && resource.toLowerCase() === expected)) errors.push("OAuth protected_resources must authorize exactly https://{organization.domain}, without path or trailing slash");
      const grants: string[] = metadata.grant_types_supported ?? [];
      if (!grants.includes("refresh_token")) errors.push("Issuer grant_types_supported must include refresh_token");
      if (grants.includes("authorization_code") && !metadata.authorization_endpoint) errors.push("Direct Sign-In requires authorization_endpoint");
      if (grants.includes("urn:ietf:params:oauth:grant-type:device_code") && !metadata.device_authorization_endpoint) errors.push("Device Sign-In requires device_authorization_endpoint");
      if (metadata.require_pushed_authorization_requests === true && !metadata.pushed_authorization_request_endpoint) errors.push("Required Pushed Authorization Requests need pushed_authorization_request_endpoint");
      const algorithms: string[] | undefined = metadata.token_endpoint_auth_signing_alg_values_supported;
      if (algorithms && !(algorithms.includes("ES256") && algorithms.includes("PS384"))) errors.push("Client assertions signed with ES256 and with PS384 must both be accepted");
      const offersSignIn = document.auth?.disabled !== true && (grants.includes("authorization_code") || grants.includes("urn:ietf:params:oauth:grant-type:device_code"));
      const scopes: string[] = [...(metadata.scopes_supported ?? []), ...(resourceDiscovery.status === 200 ? resourceDiscovery.document.scopes_supported ?? [] : [])];
      if (offersSignIn && document.web?.browser_session_endpoint && scopes.length && !scopes.includes("poppy:browser-sign-in")) errors.push("A Company with browser join and sign-in supports the poppy:browser-sign-in scope");
    }
  }
  const signedIn = document.agent?.protocols?.some((protocol: any) => protocol.type === "poppy" && protocol.access === "signed_in");
  const mediated = document.extensions?.["mediated-sign-in"];
  if ((!servers.length || document.auth?.disabled === true) && (signedIn || mediated)) errors.push("signed_in access and Mediated Sign-In require an issuer and must not be advertised when auth.disabled is true");
  return errors;
}

/** Spec 4.1: iss and sub name the client, aud is the issuer as one string, and exp is at most 5 minutes after iat. */
export function checkPoppyAssertion(claims: Record<string, any>, clientId: string, issuer: string): string[] {
  const errors: string[] = [];
  if (claims.iss !== clientId || claims.sub !== clientId) errors.push("Client assertion iss and sub must equal client_id");
  if (claims.aud !== issuer) errors.push("Client assertion aud must exactly equal the issuer as a single string");
  if (!(claims.exp > claims.iat) || claims.exp - claims.iat > 300) errors.push("Client assertion exp must be later than iat and at most 5 minutes after it");
  if (typeof claims.jti !== "string" || !claims.jti) errors.push("Client assertion requires a unique, unguessable jti");
  return errors;
}

export type PoppySessionRecord = { clientId: string; sid: string; sub: string; agent_id?: string; ended?: boolean };

/** NOT a JWT verifier. These decoded-claim checks supplement schemas and independent signature verification. Spec 5.2 and 5.3. */
export function checkPoppySessionClaims(
  session: Record<string, any>, delegation: Record<string, any>,
  context: { clientId: string; companyIdentifier: string; method: string; url: string; now: number; windowSeconds: number; accessToken?: string; tokenClientId?: string; sessions?: PoppySessionRecord[] },
): string[] {
  const errors: string[] = [], s = session.payload, d = delegation.payload;
  if (s.iss !== context.clientId || d.iss !== s.iss) errors.push("Session and delegation iss must equal the verified client_id");
  if (s.aud !== context.companyIdentifier) errors.push("Session aud must exactly equal the discovered Company identifier");
  if (!["ES256", "PS384"].includes(delegation.header.alg) || delegation.header.typ !== "poppy-delegation+jwt") errors.push("Delegation must be a poppy-delegation+jwt signed with ES256 or PS384");
  if (session.header.alg !== "ES256" || session.header.typ !== "poppy-session+jwt") errors.push("Session JWT must be a poppy-session+jwt signed with ES256");
  if (d.exp <= d.iat || d.exp - d.iat > 86400 || d.exp <= context.now || d.iat > context.now) errors.push("Delegation must be current with a positive lifetime of at most 24 hours");
  if (s.iat > d.exp || Math.abs(context.now - s.iat) > context.windowSeconds) errors.push("Session iat must be fresh and no later than delegation expiry");
  const url = new URL(context.url); url.search = ""; url.hash = "";
  if (s.htm !== context.method || new URL(s.htu).href !== url.href) errors.push("Session htm and htu must bind this request, excluding query and fragment");
  if (session.header.kid !== poppyJwkThumbprint(d.cnf.jwk)) errors.push("Session kid must equal the delegated public-key thumbprint");
  try {
    const [header, payload] = session.header.poppy_dlg.split(".").slice(0, 2).map((part: string) => JSON.parse(Buffer.from(part, "base64url").toString()));
    if (JSON.stringify(header) !== JSON.stringify(delegation.header) || JSON.stringify(payload) !== JSON.stringify(d)) errors.push("poppy_dlg must contain the supplied delegation");
  } catch { errors.push("poppy_dlg must contain a compact delegation JWT"); }
  if (context.accessToken !== undefined) {
    if (s.ath !== createHash("sha256").update(context.accessToken).digest("base64url")) errors.push("Session ath must match the access token");
    if (context.tokenClientId !== s.iss) errors.push("Access token must belong to the same client_id");
  } else if (s.ath !== undefined) errors.push("Session ath must be absent without an access token");
  // Spec 5.3 step 4: the Session is found by client_id, sid and User ID. An unknown combination starts a new signed-out Session.
  const known = context.sessions?.find(record => record.clientId === s.iss && record.sid === s.sid && record.sub === s.sub);
  if (known?.ended) errors.push("session_ended");
  if (known && known.agent_id !== s.agent_id) errors.push("Session agent_id must stay unchanged, or absent, for every Session JWT of a Session");
  return errors;
}

/** Spec 5.2: Session JWTs go only to listed APIs, protocol endpoints, and website pages on exactly organization.domain. */
export function poppySessionDestination(document: Record<string, any>, target: string, apiServers: string[] = []): "api" | "protocol" | "website" | undefined {
  const url = new URL(target);
  if (url.protocol !== "https:") return undefined;
  const under = (base: string) => { const b = new URL(base); return b.origin === url.origin && (url.pathname === b.pathname || url.pathname.startsWith(b.pathname.endsWith("/") ? b.pathname : `${b.pathname}/`)); };
  const protocol = [...(document.agent?.protocols ?? []).map((entry: any) => entry.endpoint), document.tasks?.endpoint, document.web?.browser_session_endpoint && `${document.web.browser_session_endpoint}/authorize`,
    ...Object.values(document.extensions ?? {}).flatMap((entries: any) => Array.isArray(entries) ? entries.map(entry => entry.endpoint) : [])].filter(Boolean);
  if (protocol.some(under)) return "protocol";
  if ([...apiServers, ...(document.apis ?? []).filter((api: any) => api.type === "mcp").map((api: any) => api.url)].some(under)) return "api";
  return url.host.toLowerCase() === String(document.organization.domain).toLowerCase() ? "website" : undefined;
}
