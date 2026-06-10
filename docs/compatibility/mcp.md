---
sidebar_position: 2
title: MCP compatibility
description: How AAP skills map to Model Context Protocol tools so an LLM client can call a dealer agent through MCP.
---

# MCP compatibility

![MCP server wrapping all 5 AAP skills as MCP tools, sitting between an LLM client and the dealer agent](/img/v1.0/mcp-wrapper.png)

[Model Context Protocol](https://modelcontextprotocol.io) (MCP) is a tool layer between an LLM client and a host application. AAP exposes its five skills as MCP tools so any MCP-compatible LLM client (Claude Desktop, an MCP-aware IDE, or a custom orchestrator) can call a dealer agent without learning the A2A wire format directly.

The MCP server acts as a thin adapter: it accepts an MCP `tools/call` request whose `arguments` is exactly an AAP request payload, wraps it as a typed `DataPart` inside an A2A `Message`, and forwards it to the dealer agent's A2A endpoint with a single `SendMessage` call — the only A2A operation AAP uses (request `Message` in, response `Message` out; streaming, tasks, and push notifications are out of scope for AAP v1.0). The MCP tool's `inputSchema` is the AAP request schema by URL — no extra wrapping, no field renaming.

## Tool naming

Each AAP skill maps to one MCP tool. The tool name pattern is:

```
aap_<skill_id_with_underscores>
```

Dots become underscores. The mapping is fixed for v1.0:

| AAP skill id | MCP tool name |
|---|---|
| `dealer.information` | `aap_dealer_information` |
| `inventory.facets` | `aap_inventory_facets` |
| `inventory.search` | `aap_inventory_search` |
| `inventory.vehicle` | `aap_inventory_vehicle` |
| `lead.submit` | `aap_lead_submit` |

## Tool input is the AAP request payload

The MCP tool's `inputSchema` is the AAP request schema (referenced by URL). The MCP server passes `arguments` directly through as the AAP request — no envelope, no extra wrapping. The MCP server is responsible for:

1. Validating `arguments` against the request schema (best practice but optional).
2. Wrapping `arguments` as `Message.parts[].data` (a Part carrying the `data` member).
3. Sending it to the dealer's A2A endpoint as a `SendMessage` call over the configured binding ([JSON-RPC](../bindings/json-rpc.md), which every AAP agent is required to expose, or [HTTP+JSON](../bindings/rest.md) where the dealer optionally offers it).
4. Unwrapping the dealer's A2A `Message` response and returning the AAP `data` payload as the MCP tool result.

The MCP tool result is the AAP response payload (the same thing the dealer returned in `parts[0].data`).

## MCP manifest structure

A complete MCP server descriptor that exposes all five AAP skills as tools:

```json
{
  "name": "auto-agent-protocol",
  "version": "1.0.0",
  "description": "MCP server descriptor that exposes Auto Agent Protocol automotive skills as MCP tools. Each tool's input matches the corresponding AAP request schema; the wrapper invokes the dealer's A2A endpoint with the same payload as a typed DataPart.",
  "protocolVersion": "2025-06-18",
  "tools": [
    {
      "name": "aap_dealer_information",
      "description": "Return dealership profile, rooftops, business hours, contact policies, and supported capabilities.",
      "inputSchema": {
        "$ref": "https://autoagentprotocol.org/v1.0/schemas/dealer-information-request.schema.json"
      },
      "annotations": {
        "aap_skill_id": "dealer.information",
        "aap_request_type": "dealer.information.request",
        "aap_response_type": "dealer.information.response",
        "aap_response_schema": "https://autoagentprotocol.org/v1.0/schemas/dealer-information-response.schema.json"
      }
    },
    {
      "name": "aap_inventory_facets",
      "description": "Return aggregated facets (makes, models, years, conditions, body styles, price ranges, mileage ranges, drivetrain, fuel type) over the dealer's inventory.",
      "inputSchema": {
        "$ref": "https://autoagentprotocol.org/v1.0/schemas/inventory-facets-request.schema.json"
      },
      "annotations": {
        "aap_skill_id": "inventory.facets",
        "aap_request_type": "inventory.facets.request",
        "aap_response_type": "inventory.facets.response",
        "aap_response_schema": "https://autoagentprotocol.org/v1.0/schemas/inventory-facets-response.schema.json"
      }
    },
    {
      "name": "aap_inventory_search",
      "description": "Search vehicle inventory by query, make, model, trim, year, condition, price, mileage, body, VIN, stock, features, and availability.",
      "inputSchema": {
        "$ref": "https://autoagentprotocol.org/v1.0/schemas/inventory-search-request.schema.json"
      },
      "annotations": {
        "aap_skill_id": "inventory.search",
        "aap_request_type": "inventory.search.request",
        "aap_response_type": "inventory.search.response",
        "aap_response_schema": "https://autoagentprotocol.org/v1.0/schemas/inventory-search-response.schema.json"
      }
    },
    {
      "name": "aap_inventory_vehicle",
      "description": "Return details for a specific vehicle by VIN, stock number, or vehicle_id, including availability, pricing disclosure, media, mileage, trim, features, and dealer page URL.",
      "inputSchema": {
        "$ref": "https://autoagentprotocol.org/v1.0/schemas/vehicle-detail-request.schema.json"
      },
      "annotations": {
        "aap_skill_id": "inventory.vehicle",
        "aap_request_type": "inventory.vehicle.request",
        "aap_response_type": "inventory.vehicle.response",
        "aap_response_schema": "https://autoagentprotocol.org/v1.0/schemas/vehicle-detail-response.schema.json"
      }
    },
    {
      "name": "aap_lead_submit",
      "description": "Submit a consented lead carrying customer info plus any combination of vehicle of interest, trade-in, and appointment request.",
      "inputSchema": {
        "$ref": "https://autoagentprotocol.org/v1.0/schemas/lead-submit-request.schema.json"
      },
      "annotations": {
        "aap_skill_id": "lead.submit",
        "aap_request_type": "lead.submit.request",
        "aap_response_type": "lead.submit.response",
        "aap_response_schema": "https://autoagentprotocol.org/v1.0/schemas/lead-submit-response.schema.json"
      }
    }
  ]
}
```

A reference manifest is generated from `spec/v1.0/skills.yaml` at build time and published as `generated/v1.0/mcp.json`.

## Calling a tool

An MCP client invokes `tools/call` with the AAP request as `arguments`:

```json
{
  "jsonrpc": "2.0",
  "id": "mcp-1",
  "method": "tools/call",
  "params": {
    "name": "aap_inventory_search",
    "arguments": {
      "type": "inventory.search.request",
      "filters": {
        "make": ["Honda"],
        "condition": ["used", "cpo"],
        "year_min": 2020,
        "price_max": 30000
      },
      "pagination": { "skip": 0, "limit": 20 },
      "sort": { "field": "price", "order": "asc" },
      "privacy": { "anonymous": true }
    }
  }
}
```

The MCP server forwards `arguments` as the AAP `DataPart.data` to the dealer's A2A endpoint and returns the dealer's AAP response payload (the contents of the response `data` block) as the MCP tool result.

## Why this matters

- LLM clients that already speak MCP gain instant access to every AAP-compliant dealer agent through a one-line server registration.
- The MCP `inputSchema` `$ref` points at the AAP schema by URL, so an LLM with schema-following tool use can plan calls against the same source of truth as a hand-written A2A client.
- The MCP server is stateless adapter glue; all business logic — auth, consent enforcement, inventory accuracy — stays in the dealer agent behind A2A.

For more on MCP itself, see the [MCP specification](https://modelcontextprotocol.io). For the A2A bindings the MCP server forwards into, see the [JSON-RPC binding](../bindings/json-rpc.md) (required on every AAP agent) and the [REST binding](../bindings/rest.md) (optional).
