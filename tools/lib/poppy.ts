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
): string[] {
  const errors: string[] = [];
  const requested = new URL(discoveryUrl);
  const final = new URL(finalDiscoveryUrl);
  const legacy = document.protocol_version === "0.1";
  if (!legacy && document.protocol_version !== "0.2") errors.push("Unsupported PAP major.minor version");
  const host = (value: string) => legacy ? value.toLowerCase().replace(/^www\./, "") : value.toLowerCase();
  if (requested.protocol !== "https:" || requested.username || requested.password ||
      requested.pathname !== "/.well-known/poppy.json" || requested.search || requested.hash) {
    errors.push("Discovery must start at the HTTPS well-known URL");
  }
  if (final.protocol !== "https:" || final.username || final.password) {
    errors.push("Discovery redirects must use HTTPS without credentials");
  }
  if (host(document.organization.domain) !== host(legacy ? requested.hostname : final.hostname)) {
    errors.push(legacy
      ? "PAP 0.1 organization.domain must match the originally requested host"
      : "PAP 0.2 organization.domain must match the final discovery host, ignoring case only");
  }
  if (document.auth) {
    oauthMetadataUrl(document.auth.issuer);
    if (!metadata) errors.push("OAuth metadata is required when auth is advertised");
    else {
      if (metadata.issuer !== document.auth.issuer) errors.push("OAuth issuer must match auth.issuer exactly");
      const domains: string[] = metadata.poppy_domains ?? [];
      if (!domains.some(domain => legacy ? domain === document.organization.domain : domain.toLowerCase() === document.organization.domain.toLowerCase())) {
        errors.push("OAuth poppy_domains must include organization.domain");
      }
      if (document.auth.direct && !metadata.authorization_endpoint) errors.push("Direct Sign-In requires authorization_endpoint");
      if (document.auth.device && !metadata.device_authorization_endpoint) errors.push("Device Sign-In requires device_authorization_endpoint");
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
  for (const endpoint of [metadata.jwks_uri, ...metadata.redirect_uris]) {
    const url = new URL(endpoint);
    if (url.protocol !== "https:" || url.username || url.password || url.hostname !== client.hostname) {
      errors.push("jwks_uri and redirect_uris must use HTTPS on the client_id domain");
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
  if (claims.aud !== issuer) errors.push("PAP 0.2 assertion aud must exactly equal auth.issuer as a single string");
  if (claims.exp <= claims.iat || claims.exp - claims.iat > 300) errors.push("Assertion lifetime must be positive and at most 300 seconds");
  return errors;
}
