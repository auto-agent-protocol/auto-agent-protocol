# MCP normative schema baseline

The unmodified JSON Schema is from [MCP revision 2026-07-28](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/dae694f61a31f7a3ec2af3aff709e11f70f61e48/schema/2026-07-28/schema.json), pinned to upstream commit `dae694f61a31f7a3ec2af3aff709e11f70f61e48`. Its SHA-256 is `ef70b61f99b6d2e5e3b46863822eab08dff6a45bedc7a08914e0e5b133f40203`. The complete upstream licensing notice is reproduced alongside it.

Contract checks validate the actual HTTP requests and results exchanged with the official MCP client SDK against this schema. This catches requirements that a permissive SDK decoder may overlook. Refresh this baseline only after reviewing upstream protocol changes; do not edit the vendored schema.
