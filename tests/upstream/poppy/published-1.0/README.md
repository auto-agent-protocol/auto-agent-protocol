# PAP 1.0 fixtures

All 31 unmodified Company-kit schemas at [commit 8c02b4282eda53468a7c09412558bc8b060d95f6](https://github.com/personal-agent-protocol/personal-agent-protocol/tree/8c02b4282eda53468a7c09412558bc8b060d95f6/kit/company/schemas), the upstream commit that published and froze version 1.0 on 2026-11-14. Apache-2.0 (license in the parent directory). `sha256.json` pins each file and the normative [versioned specification](https://github.com/personal-agent-protocol/personal-agent-protocol/blob/8c02b4282eda53468a7c09412558bc8b060d95f6/content/versions/1.0/spec.mdx).

`poppy-upstream.test.ts` checks that every upstream schema is pinned and compiles, then validates the AAP 4.0 examples in `spec/latest/examples` independently against these files. `poppy.test.ts` covers the AAP publication profile, reader tolerance and the cross-document rules a schema cannot express.

AAP differs from the kit only where the normative text allows more or AAP requires more:

- Reader schemas accept every `1.x` document and unknown scope-hint values; the publication profile is exactly `1.0` with enumerated hints.
- Signed-out client metadata needs only `client_id` and `jwks_uri`; account OAuth separately needs `private_key_jwt`.
- AAP follows the normative 1–256-character ID syntax and accepts fractional JWT NumericDates.
- AAP additionally requires the native OpenAPI entry, one version-1 AAP bridge entry, and consistent `web.disabled` / `web.unscoped` declarations.

The kit also ships conversation, Mediated Sign-In, Links and Disclosures schemas. AAP defines no automotive payloads for those surfaces: when a dealer advertises one, the complete upstream rules apply. The `published-0.3` fixtures and the parent-directory October 26 fixtures remain for frozen AAP 3.2 and 3.1 regression tests.

Schema success never proves a signature, freshness, random identifiers, replay policy, safe fetching, browser isolation or deployment acceptance.
