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

- AAP agents are **public by default**; `lead.submit` carries customer PII
  behind an explicit consent grant. Implementations MUST validate consent
  exactly as specified (`granted_at`, `allowed_channels`, `scope`) and SHOULD
  rate-limit and monitor lead endpoints.
- Authentication is delegated to A2A's native `securitySchemes` /
  `securityRequirements` on the agent card; report weaknesses in that guidance
  here as well.
