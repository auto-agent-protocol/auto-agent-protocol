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
): string[] {
  const errors: string[] = [];
  const requested = new URL(discoveryUrl);
  const host = (value: string) => value.toLowerCase().replace(/^www\./, "");
  if (requested.protocol !== "https:" || requested.username || requested.password ||
      requested.pathname !== "/.well-known/poppy.json" || requested.search || requested.hash) {
    errors.push("Discovery must start at the HTTPS well-known URL");
  }
  if (host(document.organization.domain) !== host(requested.hostname)) {
    errors.push("organization.domain must match the originally requested host, not a redirect host");
  }
  if (document.auth) {
    oauthMetadataUrl(document.auth.issuer);
    if (!metadata) errors.push("OAuth metadata is required when auth is advertised");
    else {
      if (metadata.issuer !== document.auth.issuer) errors.push("OAuth issuer must match auth.issuer exactly");
      if (!metadata.poppy_domains?.includes(document.organization.domain)) errors.push("OAuth poppy_domains must include organization.domain");
      if (document.auth.direct && !metadata.authorization_endpoint) errors.push("Direct Sign-In requires authorization_endpoint");
      if (document.auth.device && !metadata.device_authorization_endpoint) errors.push("Device Sign-In requires device_authorization_endpoint");
    }
  }
  return errors;
}
