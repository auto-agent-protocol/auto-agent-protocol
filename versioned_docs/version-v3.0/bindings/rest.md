---
title: Legacy REST binding
description: The historical A2A HTTP+JSON option was removed in AAP 1.1. Use the current MCP, A2A JSON-RPC or PAP binding.
---

# Legacy REST binding

The optional A2A HTTP+JSON interface was removed in **AAP 1.1**. This URL remains for historical links. AAP does not define a `POST /message:send` endpoint.

Current interfaces:

| Interface | Automotive calls |
|---|---|
| [MCP](./mcp.md) | Native tools over Streamable HTTP |
| [A2A](./json-rpc.md) | `SendMessage` over JSON-RPC |
| [PAP](../personal-agent-protocol.md) | Native OpenAPI operations with PAP Sessions and DPoP |

PAP's automotive API is separate from the retired A2A HTTP+JSON option.
