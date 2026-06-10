---
sidebar_position: 2
title: Why automotive needs AAP
description: The gap AAP fills against A2A, ACP, MCP, and ADF — and why it is the first automotive-specific A2A profile.
---

# Why automotive needs AAP

![Before AAP: every buyer agent and dealership pair needs a custom integration. After AAP: one open profile connects them all](/img/v1.0/why-before-after.png)

![Five AAP skills covering the read-and-lead lifecycle](/img/v1.0/skills-overview.png)

Automotive retail has unusual constraints that no general-purpose agent protocol addresses end-to-end:

- Inventory is **mixed** (new + used + certified + in-transit) and **mutates daily**. A car listed at 9am can be sold by 11am.
- Pricing is **regulated**. The FTC's CARS Rule and 2026 enforcement actions require advertised prices to reflect the final out-the-door amount, including all required fees and add-ons.
- Customer contact data is **regulated**. TCPA, CAN-SPAM, and state laws require explicit, scoped consent before a dealer can call, text, or email.
- Lead handoff is **legacy-bound**. Dealer CRMs ingest [ADF/XML](https://en.wikipedia.org/wiki/Auto-lead_Data_Format) (Auto-lead Data Format) leads that have been the de-facto standard for two decades.

A protocol for AI agents talking to dealerships has to handle all four. AAP does. Generic agent protocols do not.

## How AAP relates to neighboring protocols

| Protocol | What it standardizes | What it does NOT cover for automotive |
|---|---|---|
| [A2A](https://a2a-protocol.org) (Agent2Agent) | Generic agent discovery, message envelope, JSON-RPC + HTTP+JSON bindings, task model, push notifications | Automotive vocabulary (vehicles, VIN, pricing semantics, ADF compatibility, dealership consent rules) |
| [ACP](https://www.agenticcommerce.dev) (Agentic Commerce Protocol) | E-commerce checkout (cart, payment, fulfillment) between agents and merchants | Pre-purchase research, leads, appointments, dealership-specific data — vehicles are rarely bought through agentic checkout |
| [MCP](https://modelcontextprotocol.io) (Model Context Protocol) | Tool layer between an LLM client and one host application (filesystem, DB, API) | A peer-to-peer protocol between agents; MCP is host-to-tool, not agent-to-business |
| [ADF/XML](https://en.wikipedia.org/wiki/Auto-lead_Data_Format) | Legacy lead format dealer CRMs ingest today | A read API (no inventory queries), no agent discovery, no consent records, no appointment booking |

AAP does not replace any of these. It complements them.

- **AAP IS an A2A profile.** Every AAP message is an A2A `DataPart`. A buyer agent that already speaks A2A can call an AAP dealer agent without learning a new transport. AAP keeps the A2A surface minimal: a JSONRPC interface is required on every AAP agent card (HTTP+JSON may be added; gRPC is out of scope), and AAP uses exactly one A2A operation — `SendMessage`. The optional A2A surface (streaming, tasks, push notifications) is out of scope: dealer agents do not need to implement it, and buyer agents must not require it.
- **AAP COMPLEMENTS ACP.** ACP is built around payment + checkout. Vehicles are typically not transacted that way — the dealer's lead system, financing, F&I, and trade-in conversation happen out of band. AAP covers the lead step that precedes (or replaces) checkout.
- **AAP COMPLEMENTS MCP.** A buyer agent's host LLM can expose AAP skills as MCP tools. The [MCP compatibility page](./compatibility/mcp.md) shows the one-to-one mapping.
- **AAP MAPS TO ADF.** Every `lead.submit` request can be losslessly converted to an ADF/XML payload so a dealer's existing CRM accepts it without changes. See the [ADF mapping page](./compatibility/adf-mapping.md).

## What AAP adds that A2A alone does not

A2A standardizes how agents exchange messages, not what is in them. Two A2A-compliant dealer agents could each invent their own `inventory_search` skill with different field names, different filter semantics, different pricing fields, and a buyer agent would have to special-case each one.

AAP fixes the field names, types, and required behavior:

- **Five canonical skill IDs** form the AAP v1.0 vocabulary; dealer agents implement whichever subset matches their capabilities.
- **Strict typed `DataParts`** (`<scope>.<thing>.request`, `<scope>.<thing>.response`) so a buyer agent can validate before sending.
- **Four explicit pricing fields** (`msrp`, `list_price`, `offered_price`, `price`), each an integer in whole US dollars, where `price` is the FTC-final out-the-door amount — see [Pricing and FTC compliance](./pricing-and-ftc.md).
- **`ConsentGrant`** structure required when a lead carries customer contact info, with explicit `allowed_channels` and `scope`.
- **A controlled vehicle `status` enum** (`available`, `intransit`, `pending`) — these are the only statuses that appear in an inventory feed; a vehicle in any other state (sold, reserved, in service, etc.) is out of stock and is omitted by the dealer and ignored by the buyer — see [behavior rules](./behavior-rules.md).

## First automotive-specific A2A profile

AAP v1.0.0, the first stable release, is the first published A2A profile written specifically for the automotive retail vertical, riding on A2A v1.0. Its goal is narrow: a buyer agent should be able to talk to any compliant dealer agent — Toyota, Honda, an independent used-car lot, a CDK/Reynolds-backed group — through identical typed messages, with consent, pricing, and ADF compatibility built in from day one.
