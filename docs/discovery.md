---
sidebar_position: 4
title: Discovery
description: A2A agent-card.json with the AAP extension. How a buyer agent discovers a dealer agent, confirms AAP compliance, and selects a binding.
---

# Discovery

![Buyer agent fetching /.well-known/agent-card.json from a dealer's domain](/img/discovery-flow.png)

Every AAP-compliant dealer agent publishes an A2A v1.0 agent card at the well-known URL on its own domain:

```
GET https://{dealer-domain}/.well-known/agent-card.json
```

The card MUST declare the AAP extension and list the AAP skills the agent implements (one or more from the vocabulary of five). The buyer agent uses the card to confirm AAP compliance, discover which skills are actually available, select a protocol binding, and (if bearer auth is required) negotiate credentials before calling any skill.

## Required AAP additions to the A2A agent card

A2A leaves discovery flexible; AAP narrows it. An AAP-compliant agent card MUST satisfy all of:

1. `capabilities.extensions[]` contains an entry whose `uri` equals:

   ```
   https://autoagentprotocol.org/extensions/a2a-automotive-retail/v0.2
   ```

2. `skills[]` contains one entry per AAP skill the agent implements (one or more). Buyer agents discover capability from `skills[]`, not from the AAP extension URI alone. AAP RECOMMENDS that an agent expose at least `inventory.search` + `lead.submit` for a meaningful shopping experience, but no single skill is individually required.

3. `supported_interfaces[]` lists at least one entry whose `protocol_binding` is `JSONRPC` or `HTTP+JSON`.

A buyer agent that does not find a matching extension URI MUST treat the agent as a generic A2A agent, not as an AAP dealer agent.

## Authentication declaration

Two modes are supported in v0.2:

| `security_requirements` | `security_schemes.bearer` | Meaning |
|---|---|---|
| absent or empty | absent | Public agent. Anyone may call the agent over the listed bindings. |
| present and references `bearer` | present | Bearer token required. Clients MUST send `Authorization: Bearer <token>` with every call. |

Authentication is declared only on the agent card, via `security_schemes` and `security_requirements`. There is no separate place to restate it.

## Full example agent card

This is a complete, valid AAP v0.2 agent card for a public dealer agent that exposes both bindings.

```json
{
  "name": "Demo Toyota Dealer Agent",
  "description": "Dealer agent for Demo Toyota of San Francisco. Implements the Auto Agent Protocol v0.2 (A2A Automotive Retail Profile).",
  "version": "1.0.0",
  "provider": {
    "organization": "Demo Toyota of San Francisco, LLC",
    "url": "https://demo-toyota.example.com"
  },
  "documentation_url": "https://autoagentprotocol.org/docs/v0.2/intro",
  "supported_interfaces": [
    {
      "url": "https://demo-toyota.example.com/a2a/jsonrpc",
      "protocol_binding": "JSONRPC",
      "protocol_version": "1.0"
    },
    {
      "url": "https://demo-toyota.example.com/a2a",
      "protocol_binding": "HTTP+JSON",
      "protocol_version": "1.0"
    }
  ],
  "capabilities": {
    "streaming": false,
    "push_notifications": false,
    "extended_agent_card": false,
    "extensions": [
      {
        "uri": "https://autoagentprotocol.org/extensions/a2a-automotive-retail/v0.2",
        "description": "Auto Agent Protocol v0.2 — A2A Automotive Retail Profile.",
        "required": true
      }
    ]
  },
  "default_input_modes": ["application/json"],
  "default_output_modes": ["application/json"],
  "skills": [
    {
      "id": "dealer.information",
      "name": "Dealer Information",
      "description": "Return the dealership profile — group name, welcome message, and rooftops with address, hours, contacts, and capabilities.",
      "tags": ["dealer", "profile"],
      "input_modes": ["application/json"],
      "output_modes": ["application/json"]
    },
    {
      "id": "inventory.facets",
      "name": "Inventory Facets",
      "description": "Return aggregated facets (makes, models, years, conditions, price/mileage ranges) over the dealer's inventory.",
      "tags": ["inventory", "facets"]
    },
    {
      "id": "inventory.search",
      "name": "Inventory Search",
      "description": "Search vehicle inventory by make, model, trim, year, condition, price, mileage, and other filters.",
      "tags": ["inventory", "search"]
    },
    {
      "id": "inventory.vehicle",
      "name": "Vehicle Detail",
      "description": "Return the detail view for a specific vehicle by VIN, stock, or vehicle_id.",
      "tags": ["inventory", "vehicle"]
    },
    {
      "id": "lead.submit",
      "name": "Submit Lead",
      "description": "Submit a consented lead carrying customer info plus any combination of vehicle of interest, trade-in, and appointment request.",
      "tags": ["lead", "submit", "vehicle", "trade-in", "appointment", "consent", "adf"]
    }
  ],
  "security_schemes": {},
  "security_requirements": []
}
```

## Bearer-protected example (auth declaration only)

For a dealer agent that requires a bearer token, the security blocks change as follows. Skills, extensions, and `supported_interfaces` look identical.

```json
{
  "security_schemes": {
    "bearer": {
      "type": "http",
      "scheme": "bearer",
      "bearer_format": "JWT"
    }
  },
  "security_requirements": [
    { "bearer": [] }
  ]
}
```

Because `security_requirements` references `bearer`, clients MUST send `Authorization: Bearer <token>` with every call.

## What a buyer agent does next

Once the card is fetched and validated:

1. Read `skills[]` from the card to learn which AAP skills the agent implements. The request/response JSON Schema for each skill is defined by the AAP spec itself (this docs site), version-pinned by the extension URI.
2. Pick a binding from `supported_interfaces[]`. Both `JSONRPC` and `HTTP+JSON` accept the same AAP `DataParts`; choose whichever the buyer agent already speaks.
3. If `security_requirements` is non-empty, obtain a bearer token out of band before calling any skill.
4. Invoke skills via standard A2A `SendMessage` ([JSON-RPC binding](./bindings/json-rpc.md) or [REST binding](./bindings/rest.md)).
