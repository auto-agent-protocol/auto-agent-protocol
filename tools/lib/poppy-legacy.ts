/** Cross-document checks supplement JSON Schema; they do not certify a runtime. */
export function oauthMetadataUrl(issuer: string): string {
  const url = new URL(issuer);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
    throw new Error("OAuth issuer must be HTTPS without credentials, query or fragment");
  }
  // RFC 8414 section 3 removes a terminating slash before inserting the well-known suffix.
  const issuerPath = url.pathname.replace(/\/+$/, "");
  return `${url.origin}/.well-known/oauth-authorization-server${issuerPath}`;
}

export function checkPoppyIdentity(
  document: Record<string, any>,
  discoveryUrl: string,
  metadata?: Record<string, any>,
  finalDiscoveryUrl: string = discoveryUrl,
  openapiScopeDescriptions: Record<string, string> = {},
): string[] {
  const errors: string[] = [];
  const requested = new URL(discoveryUrl);
  const final = new URL(finalDiscoveryUrl);
  const legacy = document.protocol_version === "0.1";
  const current = document.protocol_version === "0.3";
  if (!legacy && !current && document.protocol_version !== "0.2") errors.push("Unsupported PAP major.minor version");
  const host = (value: string) => legacy ? value.toLowerCase().replace(/^www\./, "") : value.toLowerCase();
  if (requested.protocol !== "https:" || requested.username || requested.password ||
      requested.pathname !== "/.well-known/poppy.json" || requested.search || requested.hash) {
    errors.push("Discovery must start at the HTTPS well-known URL");
  }
  if (final.protocol !== "https:" || final.username || final.password) {
    errors.push("Discovery redirects must use HTTPS without credentials");
  }
  if (current && (final.pathname !== "/.well-known/poppy.json" || final.search || final.hash)) {
    errors.push("PAP 0.3 final discovery URL must retain the well-known path without query or fragment");
  }
  if (host(document.organization.domain) !== host(legacy ? requested.hostname : final.hostname)) {
    errors.push(legacy
      ? "PAP 0.1 organization.domain must match the originally requested host"
      : "PAP organization.domain must match the final discovery host, ignoring case only");
  }
  if (document.auth) {
    oauthMetadataUrl(document.auth.issuer);
    if (!metadata) errors.push("OAuth metadata is required when auth is advertised");
    else {
      if (metadata.issuer !== document.auth.issuer) errors.push("OAuth issuer must match auth.issuer exactly");
      if (current) {
        const resources: string[] = metadata.protected_resources ?? [];
        const expected = `https://${document.organization.domain.toLowerCase()}`;
        if (!resources.some(resource => /^https:\/\/[^/?#:@%\\\s]+$/.test(resource) && resource.toLowerCase() === expected)) {
          errors.push("OAuth protected_resources must include https://{organization.domain}, ignoring hostname case only, without a port or trailing slash");
        }
        const grants: string[] = metadata.grant_types_supported ?? [];
        for (const grant of ["urn:ietf:params:oauth:grant-type:jwt-bearer", "refresh_token"]) {
          if (!grants.includes(grant)) errors.push(`grant_types_supported must include ${grant}`);
        }
        const direct = grants.includes("authorization_code"), device = grants.includes("urn:ietf:params:oauth:grant-type:device_code");
        if (direct && !metadata.authorization_endpoint) errors.push("Direct Sign-In requires authorization_endpoint");
        if (device && !metadata.device_authorization_endpoint) errors.push("Device Sign-In requires device_authorization_endpoint");
        if ((direct || device || document.auth.mediated) && !metadata.scopes_supported) errors.push("Sign-in requires scopes_supported");
        const scopes: string[] = metadata.scopes_supported ?? [];
        const descriptions = { ...openapiScopeDescriptions, ...document.auth.scopes };
        for (const scope of scopes) {
          if (scope.startsWith("poppy:")) errors.push("Company scopes must not use the reserved poppy: prefix");
          if (!descriptions[scope]?.trim()) errors.push(`Scope ${scope} needs a description in auth.scopes or a listed OpenAPI OAuth scheme`);
        }
        for (const scope of document.auth.mediated?.scopes ?? []) {
          if (!scopes.includes(scope)) errors.push(`Mediated scope ${scope} must be listed in scopes_supported`);
        }
      } else {
        const domains: string[] = metadata.poppy_domains ?? [];
        if (!domains.some(domain => legacy ? domain === document.organization.domain : domain.toLowerCase() === document.organization.domain.toLowerCase())) {
          errors.push("OAuth poppy_domains must include organization.domain");
        }
        if (document.auth.direct && !metadata.authorization_endpoint) errors.push("Direct Sign-In requires authorization_endpoint");
        if (document.auth.device && !metadata.device_authorization_endpoint) errors.push("Device Sign-In requires device_authorization_endpoint");
      }
    }
  }
  return errors;
}

export function checkPoppyClientIdentity(
  metadata: { client_id: string; jwks_uri: string; redirect_uris: string[] },
  metadataUrl: string,
): string[] {
  const errors: string[] = [];
  const client = new URL(metadataUrl);
  if (client.protocol !== "https:" || client.username || client.password) errors.push("Client metadata URL must use HTTPS without credentials");
  if (metadata.client_id !== metadataUrl) errors.push("client_id must exactly match the fetched metadata URL");
  const jwks = new URL(metadata.jwks_uri);
  if (jwks.protocol !== "https:" || jwks.username || jwks.password || jwks.hostname !== client.hostname) {
    errors.push("jwks_uri must use HTTPS on the client_id domain");
  }
  for (const redirect of metadata.redirect_uris) {
    const url = new URL(redirect);
    if (!loopbackRedirect(redirect) && (url.protocol !== "https:" || url.username || url.password || url.hash || url.hostname !== client.hostname)) {
      errors.push("redirect_uris must use HTTPS on the client_id domain or an RFC 8252 loopback literal without a fragment");
    }
  }
  return errors;
}

export function checkPoppyAssertion(
  claims: { iss: string; sub: string; aud: string; iat: number; exp: number },
  clientId: string,
  issuer: string,
  kind: "client" | "session",
): string[] {
  const errors: string[] = [];
  if (claims.iss !== clientId) errors.push("Assertion iss must equal the authenticated client_id");
  if (kind === "client" && claims.sub !== clientId) errors.push("Client assertion sub must equal client_id");
  if (claims.aud !== issuer) errors.push("PAP assertion aud must exactly equal auth.issuer as a single string");
  if (claims.exp <= claims.iat || claims.exp - claims.iat > 300) errors.push("Assertion lifetime must be positive and at most 300 seconds");
  return errors;
}

function loopbackRedirect(uri: string): RegExpMatchArray | null {
  const match = uri.match(/^http:\/\/(127\.0\.0\.1|\[::1\])(?::([0-9]+))?([/?][^#\s]*)?$/);
  return match && (!match[2] || Number(match[2]) <= 65535) ? match : null;
}

export function poppyRedirectMatches(registered: string, requested: string): boolean {
  const left = loopbackRedirect(registered), right = loopbackRedirect(requested);
  return left && right ? left[1] === right[1] && left[3] === right[3] : registered === requested;
}

export function poppyScopeChanges(value: string | undefined): "none" | "reversible" | "irreversible" | undefined {
  if (value === undefined || value === "none" || value === "reversible") return value;
  return "irreversible";
}

/** Inputs must already pass their structural schemas; these checks do not authenticate tokens. */
export function checkPoppyTokenResponse(
  token: Record<string, any>,
  context: { grant: "guest" } | { grant: "sign-in" | "refresh"; requestedScopes: string[] } |
    { grant: "exchange"; subjectScopes: string[]; requestedScopes?: string[] },
): string[] {
  const errors: string[] = [];
  const exchange = context.grant === "exchange";
  if (token.token_type !== (exchange ? "Bearer" : "DPoP")) errors.push("Only token exchange for non-DPoP MCP returns Bearer tokens");
  const allowed = context.grant === "guest" ? [] : context.grant === "exchange" ? context.subjectScopes : context.requestedScopes;
  const requested = "requestedScopes" in context ? context.requestedScopes ?? allowed : allowed;
  const granted: string[] = token.scope === undefined ? requested : token.scope.split(" ");
  if (requested.some(scope => !allowed.includes(scope)) || granted.some(scope => !allowed.includes(scope) || !requested.includes(scope))) {
    errors.push("Granted scopes must not exceed requested or subject-token scopes");
  }
  if (!allowed.length && token.scope !== undefined) errors.push("Signed-out token responses must omit scope");
  if (!exchange && context.grant !== "guest" && !granted.length) errors.push("Successful sign-in or refresh must grant at least one scope");
  if ((context.grant === "guest" || exchange) && (token.refresh_token !== undefined || token.refresh_token_expires_in !== undefined)) errors.push("Guest grants and token exchange do not issue Account Tokens");
  if (context.grant === "sign-in" && !token.refresh_token) errors.push("Sign-in must return an Account Token");
  return errors;
}

export function checkPoppyMcpResource(document: Record<string, any>, metadata: Record<string, any>, url: string, resource: Record<string, any>): string[] {
  const errors: string[] = [];
  if (!document.apis?.some((api: any) => api.type === "mcp" && api.url === url)) errors.push("Native PAP MCP must be advertised in apis");
  if (resource.resource !== url) errors.push("MCP resource must exactly equal the advertised URL");
  if (!resource.authorization_servers?.includes(document.auth?.issuer)) errors.push("MCP authorization_servers must include the exact auth.issuer");
  if (resource.dpop_signing_alg_values_supported !== undefined) {
    if (!resource.dpop_signing_alg_values_supported.includes("ES256")) errors.push("DPoP-capable MCP must advertise ES256");
  } else if (!metadata.grant_types_supported?.includes("urn:ietf:params:oauth:grant-type:token-exchange")) {
    errors.push("Non-DPoP MCP requires the token-exchange grant");
  }
  return errors;
}

export function poppyAlternativeReferences(document: Record<string, any>, alternative: Record<string, any>): Record<string, any>[] {
  return (alternative.references ?? []).filter((reference: any) => reference.type === "web" ||
    (["openapi", "mcp"].includes(reference.type) && document.apis?.some((api: any) => api.type === reference.type && api.url === reference.url)));
}
