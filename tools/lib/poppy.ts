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
