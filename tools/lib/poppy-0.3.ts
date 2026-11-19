import { createHash } from "node:crypto";
export { oauthMetadataUrl, poppyRedirectMatches, poppyScopeChanges, poppyAlternativeReferences } from "./poppy-legacy.js";
import { oauthMetadataUrl } from "./poppy-legacy.js";

export const PAP_SPECIFICATION_REVISION = "6fb46d381ac1b94265795132af13848ec442b6f6";
export type PoppyResourceDiscovery = { status: 200; document: Record<string, any> } | { status: 404 } | { status: "error" };

export function checkPoppyClientIdentity(metadata: { client_id: string; jwks_uri: string; redirect_uris?: string[]; token_endpoint_auth_method?: string; token_endpoint_auth_methods_supported?: string[] }, metadataUrl: string, forOAuth = false): string[] {
  const errors: string[] = [], client = new URL(metadataUrl), jwks = new URL(metadata.jwks_uri);
  if (client.protocol !== "https:" || client.username || client.password || client.hash || client.pathname === "/" || /\/(?:\.|%2e){1,2}(?:\/|[?#]|$)/i.test(metadataUrl)) errors.push("CIMD client_id requires HTTPS, a non-root path and no credentials, fragment or dot segments");
  if (metadata.client_id !== metadataUrl) errors.push("client_id must exactly match the fetched metadata URL");
  if (jwks.protocol !== "https:" || jwks.username || jwks.password || jwks.hash || jwks.hostname !== client.hostname) errors.push("jwks_uri must use HTTPS on the client_id domain without credentials or fragment");
  const methods = metadata.token_endpoint_auth_methods_supported ?? [metadata.token_endpoint_auth_method ?? "none"];
  if (metadata.token_endpoint_auth_methods_supported && metadata.token_endpoint_auth_method && !methods.includes(metadata.token_endpoint_auth_method)) errors.push("Singular OAuth authentication method must be included in the plural method list");
  if (forOAuth && !methods.includes("private_key_jwt")) errors.push("PAP account OAuth requires advertised private_key_jwt authentication");
  for (const redirect of metadata.redirect_uris ?? []) {
    const url = new URL(redirect);
    const loopback = /^http:\/\/(127\.0\.0\.1|\[::1\])(?::([0-9]+))?([/?][^#\s]*)?$/.test(redirect);
    if (!loopback && (url.protocol !== "https:" || url.username || url.password || url.hash || url.hostname !== client.hostname)) errors.push("redirect_uris must use same-domain HTTPS or RFC 8252 loopback literals without a fragment");
  }
  return errors;
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
  document: Record<string, any>, discoveryUrl: string, metadata?: Record<string, any>,
  finalDiscoveryUrl: string = discoveryUrl, _scopeDescriptions: Record<string, string> = {},
  resourceDiscovery?: PoppyResourceDiscovery,
): string[] {
  const errors: string[] = [];
  if (document.protocol_version !== "0.3") errors.push("Unsupported PAP major.minor version");
  for (const value of [discoveryUrl, finalDiscoveryUrl]) {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/.well-known/poppy.json" || url.search || url.hash) errors.push("Discovery must use the HTTPS well-known path without credentials, query or fragment at every hop");
  }
  if (document.organization.domain.toLowerCase() !== new URL(finalDiscoveryUrl).hostname.toLowerCase()) errors.push("organization.domain must match the final discovery host, ignoring case only");
  if (!resourceDiscovery) return [...errors, "Domain protected-resource discovery result is required, including an explicit 404"];
  const company = poppyCompanyIdentifier(document, resourceDiscovery); errors.push(...company.errors);
  const servers = resourceDiscovery.status === 200 ? resourceDiscovery.document.authorization_servers ?? [] : [];
  if (servers.length && company.identifier) {
    oauthMetadataUrl(company.identifier);
    if (!metadata) errors.push("Issuer metadata is required for the selected issuer");
    else {
      if (metadata.issuer !== company.identifier) errors.push("OAuth metadata issuer must exactly equal the selected issuer");
      const expected = `https://${document.organization.domain.toLowerCase()}`;
      if (!(metadata.protected_resources ?? []).some((resource: string) => /^https:\/\/[^/?#:@%\\\s]+$/.test(resource) && resource.toLowerCase() === expected)) errors.push("OAuth protected_resources must authorize the exact Company domain without port, path or slash");
      const grants: string[] = metadata.grant_types_supported ?? [];
      if (!grants.includes("refresh_token")) errors.push("Issuer grant_types_supported must include refresh_token");
      if (grants.includes("authorization_code") && !metadata.authorization_endpoint) errors.push("Direct Sign-In requires authorization_endpoint");
      if (grants.includes("urn:ietf:params:oauth:grant-type:device_code") && !metadata.device_authorization_endpoint) errors.push("Device Sign-In requires device_authorization_endpoint");
    }
  }
  const signedIn = document.agent?.protocols?.some((protocol: any) => protocol.type === "poppy" && protocol.access === "signed_in");
  const mediated = document.extensions?.["mediated-sign-in"];
  if ((!servers.length || document.auth?.disabled === true) && (signedIn || mediated)) errors.push("signed_in access and Mediated Sign-In require an issuer and must not be advertised when auth.disabled is true");
  return errors;
}

export function checkPoppyAssertion(claims: Record<string, any>, clientId: string, issuer: string): string[] {
  const errors: string[] = [];
  if (claims.iss !== clientId || claims.sub !== clientId) errors.push("Client assertion iss and sub must equal client_id");
  if (claims.aud !== issuer) errors.push("Client assertion aud must exactly equal the issuer as a single string");
  if (claims.exp <= claims.iat) errors.push("Client assertion expiry must be later than issue time; enforce a short lifetime at runtime");
  return errors;
}

/** Ordinary optional OAuth: never call this for a signed-out guest token grant. */
export function checkPoppyTokenResponse(token: Record<string, any>, context: { grant: "sign-in" | "refresh"; requestedScopes: string[] }): string[] {
  const errors: string[] = [], granted: string[] = token.scope === undefined ? context.requestedScopes : token.scope.split(" ");
  if (!["bearer", "dpop"].includes(String(token.token_type).toLowerCase())) errors.push("OAuth token_type must be Bearer or DPoP");
  if (granted.some(scope => !context.requestedScopes.includes(scope))) errors.push("Granted scopes must not exceed requested scopes");
  if (!granted.length) errors.push("Successful sign-in or refresh must grant at least one scope");
  if (context.grant === "sign-in" && !token.refresh_token) errors.push("Sign-in must return a refresh token");
  return errors;
}

export function checkPoppyMcpResource(document: Record<string, any>, issuer: string | undefined, url: string, resource: Record<string, any>): string[] {
  const errors: string[] = [];
  if (!document.apis?.some((api: any) => api.type === "mcp" && api.url === url)) errors.push("Native PAP MCP must be advertised in apis");
  if (resource.resource !== url) errors.push("MCP resource must exactly equal the advertised URL");
  if (issuer && !resource.authorization_servers?.includes(issuer)) errors.push("MCP authorization_servers must include the selected Company issuer");
  return errors;
}

export function poppyJwkThumbprint(jwk: Record<string, any>): string {
  return createHash("sha256").update(JSON.stringify({ crv: jwk.crv, kty: jwk.kty, x: jwk.x, y: jwk.y })).digest("base64url");
}

/** NOT a JWT verifier. These decoded-claim checks supplement schemas and independent signature verification. */
export function checkPoppySessionClaims(
  session: Record<string, any>, delegation: Record<string, any>,
  context: { clientId: string; companyIdentifier: string; method: string; url: string; now: number; windowSeconds: number; accessToken?: string; tokenClientId?: string; previous?: { sub: string; agent_id?: string; ended?: boolean } },
): string[] {
  const errors: string[] = [], s = session.payload, d = delegation.payload;
  if (s.iss !== context.clientId || d.iss !== s.iss) errors.push("Session and delegation iss must equal the verified client_id");
  if (s.aud !== context.companyIdentifier) errors.push("Session aud must exactly equal the discovered Company identifier");
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
  if (context.previous?.ended) errors.push("session_ended");
  if (context.previous && (context.previous.sub !== s.sub || context.previous.agent_id !== s.agent_id)) errors.push("Session sub and agent_id must stay unchanged for client_id + sid; delegated key rotation is allowed");
  return errors;
}
