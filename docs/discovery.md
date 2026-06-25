---
sidebar_position: 4
title: Discovery
description: A2A agent-card.json with the AAP extension. How a buyer agent discovers a dealer agent and confirms AAP compliance.
---

# Discovery

![Buyer agent fetching /.well-known/agent-card.json from a dealer's domain](/img/v1.0/discovery-flow.png)

Every AAP-compliant dealer agent publishes an A2A v1.0 agent card at the well-known URL on its own domain:

```
GET https://{dealer-domain}/.well-known/agent-card.json
```

The card MUST declare the AAP extension and list the AAP skills the agent implements (one or more from the vocabulary of five). The buyer agent uses the card to confirm AAP compliance and discover which skills are actually available before calling any skill. AAP v1.1 uses a single transport — JSON-RPC 2.0.

## Required AAP additions to the A2A agent card

The AgentCard structure itself is defined by [A2A](https://a2a-protocol.org/latest/specification/) — AAP does not redefine it. AAP only narrows it: an AAP-compliant agent card MUST satisfy all of:

1. `capabilities.extensions[]` contains an entry whose `uri` equals:

   ```
   https://autoagentprotocol.org/extensions/a2a-automotive-retail/v1.1
   ```

2. `skills[]` contains one entry per AAP skill the agent implements (one or more). Buyer agents discover capability from `skills[]`, not from the AAP extension URI alone. AAP RECOMMENDS that an agent expose at least `inventory.search` + `lead.submit` for a meaningful shopping experience, but no single skill is individually required.

3. `supportedInterfaces[]` includes an entry whose `protocolBinding` is `JSONRPC` (REQUIRED on every AAP agent card). JSON-RPC 2.0 is the sole AAP binding; the HTTP+JSON (REST) binding was [removed in v1.1](./bindings/rest.md), and gRPC is out of scope for AAP v1.1.

A buyer agent that does not find a matching extension URI MUST treat the agent as a generic A2A agent, not as an AAP dealer agent.

## Authentication

AAP v1.1 agents are **public by default** — the simplest setup needs no authentication. AAP defines no auth of its own. A dealer that wants to protect its endpoint uses A2A's native `securitySchemes` / `securityRequirements` on the agent card (e.g. HTTP bearer), and buyer agents obtain credentials out of band, exactly as A2A specifies. Auth is therefore an A2A/transport concern, out of scope for the v1.1 profile beyond what A2A already provides.

## Full example agent card

This is the **smallest** card that satisfies the three requirements above — a public dealer agent on the JSON-RPC binding. Copy it, change the `name`, the `supportedInterfaces[].url`, and `params.id`, and keep only the `skills[]` you actually implement. A copy-pasteable copy is published at [`/v1.1/examples/agent-card.example.json`](https://autoagentprotocol.org/v1.1/examples/agent-card.example.json).

```json
{
  "name": "Demo Toyota",
  "description": "Auto Agent Protocol dealer agent for Demo Toyota — browse inventory and submit consented leads over A2A.",
  "version": "1.0.0",
  "provider": {
    "organization": "Lumika AI",
    "url": "https://lumika.ai"
  },
  "supportedInterfaces": [
    {
      "url": "https://demo-toyota.example.com/a2a",
      "protocolBinding": "JSONRPC",
      "protocolVersion": "1.0"
    }
  ],
  "capabilities": {
    "extensions": [
      {
        "uri": "https://autoagentprotocol.org/extensions/a2a-automotive-retail/v1.1",
        "description": "Auto Agent Protocol v1.1 — A2A Automotive Retail Profile.",
        "required": true,
        "params": {
          "id": "0192f3c0-1a2b-7c3d-8e4f-5a6b7c8d9e0f"
        }
      }
    ]
  },
  "defaultInputModes": ["application/json"],
  "defaultOutputModes": ["application/json"],
  "skills": [
    {
      "id": "dealer.information",
      "name": "Dealer Information",
      "description": "Return the dealership profile: group name, welcome message, and rooftops with address, hours, contacts, and capabilities.",
      "tags": ["dealer", "dealership", "profile", "hours", "contact", "locations", "automotive"]
    },
    {
      "id": "inventory.facets",
      "name": "Inventory Facets",
      "description": "Return aggregated facets (makes, models, years, conditions, price/mileage ranges, statuses) over the dealer's inventory.",
      "tags": ["inventory", "facets", "aggregation", "filters", "automotive"]
    },
    {
      "id": "inventory.search",
      "name": "Inventory Search",
      "description": "Search the dealer's vehicle inventory by make, model, year, condition, price, mileage, body, fuel, drivetrain, VIN, or stock.",
      "tags": ["inventory", "vehicles", "search", "cars", "automotive"]
    },
    {
      "id": "inventory.vehicle",
      "name": "Vehicle Detail",
      "description": "Return full detail for a specific vehicle by VIN, stock number, or vehicle_id.",
      "tags": ["inventory", "vehicle", "vin", "stock", "detail", "automotive"]
    },
    {
      "id": "lead.submit",
      "name": "Submit Lead",
      "description": "Submit a consented lead with optional vehicle of interest, trade-in, and appointment.",
      "tags": ["lead", "contact", "consent", "sales", "appointment", "automotive"]
    }
  ]
}
```

`provider` names who operates the agent. The AAP extension's `params.id` is a unique identifier (UUID v7 recommended) the dealer regenerates whenever the card changes — onboarding tools cache it to cheaply detect changes. The published per-skill request/response JSON Schemas also live inside the extension `params` — under `capabilities.extensions[].params.skills["<id>"].request_schema` / `response_schema` — not as fields on the A2A `skills[]` entries (strict A2A proto parsers reject unknown skill fields). Both `params` and any AAP-specific data live inside the extension entry, which is the only A2A-sanctioned place for it.

Each skill carries the A2A-required `tags` (keywords clients/LLMs use to categorize and rank skills). Everything else is **optional** A2A surface a dealer MAY add to the same card — `documentationUrl`, per-skill `inputModes`, or `securitySchemes` + `securityRequirements` for auth. Note that the optional A2A surface beyond `SendMessage` (streaming, tasks, push notification configs, extended agent card) is out of scope for AAP v1.1 — dealer agents do not need to implement it and buyer agents MUST NOT require it. The AgentCard shape is A2A's; see the [A2A spec](https://a2a-protocol.org/latest/specification/).

## What a buyer agent does next

Once the card is fetched and validated:

1. Read `skills[]` from the card to learn which AAP skills the agent implements. The request/response JSON Schema for each skill is defined by the AAP spec itself (this docs site), version-pinned by the extension URI, and the card publishes the schemas inline under `capabilities.extensions[].params.skills["<id>"].request_schema` / `response_schema`.
2. Invoke skills via standard A2A `SendMessage` over the [JSON-RPC binding](./bindings/json-rpc.md) — JSON-RPC 2.0 is the only AAP transport (the [REST binding was removed in v1.1](./bindings/rest.md)). `SendMessage` is the only A2A operation AAP uses: request `Message` in, response `Message` out. If the card declares A2A `securitySchemes`, obtain credentials out of band first.
