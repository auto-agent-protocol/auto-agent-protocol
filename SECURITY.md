# Security Policy

## Reporting a vulnerability

If you find a security issue in the AAP specification, its JSON Schemas, the
published packages (`@autoagentprotocol/*`), or the autoagentprotocol.org site,
please report it privately:

- Email **security@autoagentprotocol.org** with a description, reproduction
  steps, and impact assessment.
- Do **not** open a public GitHub issue for security reports.

You will receive an acknowledgement within 72 hours. We ask for up to 90 days
of coordinated disclosure before publishing details.

## Scope notes for implementers

- Public inventory reads should work without shopper contact details. Access
  follows the selected binding: [MCP](docs/bindings/mcp.md) declares public reads
  or standard OAuth protection; [A2A](docs/a2a-profile.md) uses the Agent Card's
  `securitySchemes` / `securityRequirements`; [PAP](docs/personal-agent-protocol.md)
  requires verified Sessions and DPoP even for signed-out OpenAPI access.
- `lead.submit` requires explicit customer contact consent, permitted channels,
  matching contact details and an idempotency key. Authentication or tool
  selection does not grant contact consent. Follow the shared
  [consent, retry and monitoring rules](docs/behavior-rules.md) on every binding.
