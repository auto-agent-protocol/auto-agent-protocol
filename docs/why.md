---
sidebar_position: 2
title: Why automotive needs AAP
description: The gap AAP fills against A2A, ACP, MCP, and ADF — and why it is the first automotive-specific A2A profile.
---

# Why automotive needs AAP

![Seven AAP skills covering the read-and-lead lifecycle](/img/skills-overview.png)

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

- **AAP IS an A2A profile.** Every AAP message is an A2A `DataPart`. A buyer agent that already speaks A2A can call an AAP dealer agent without learning a new transport.
- **AAP COMPLEMENTS ACP.** ACP is built around payment + checkout. Vehicles are typically not transacted that way — the dealer's lead system, financing, F&I, and trade-in conversation happen out of band. AAP covers the lead step that precedes (or replaces) checkout.
- **AAP COMPLEMENTS MCP.** A buyer agent's host LLM can expose AAP skills as MCP tools. The [MCP compatibility page](./compatibility/mcp.md) shows the one-to-one mapping.
- **AAP MAPS TO ADF.** Every `lead.vehicle` request can be losslessly converted to an ADF/XML payload so a dealer's existing CRM accepts it without changes. See the [ADF mapping page](./compatibility/adf-mapping.md).

## What AAP adds that A2A alone does not

A2A standardizes how agents exchange messages, not what is in them. Two A2A-compliant dealer agents could each invent their own `inventory_search` skill with different field names, different filter semantics, different pricing fields, and a buyer agent would have to special-case each one.

AAP fixes the field names, types, and required behavior:

- **Seven canonical skills** every dealer agent MUST implement.
- **Strict typed `DataParts`** (`<scope>.<thing>.request`, `<scope>.<thing>.response`) so a buyer agent can validate before sending.
- **Four explicit pricing fields** (`msrp`, `list_price`, `offered_price`, `price`) where `price` is the FTC-final out-the-door amount — see [Pricing and FTC compliance](./pricing-and-ftc.md).
- **`ConsentGrant`** structure required when a lead carries customer contact info, with explicit `allowed_channels` and `scope`.
- **Free-text vehicle `status`** (so each dealer keeps its own inventory vocabulary like "In Stock", "In Transit", "Pending", "Sold") combined with a hard MUST that known-sold vehicles are not returned as available — see [behavior rules](./behavior-rules.md).
- **A machine-readable contract manifest** at `/.well-known/auto-agent-contract.json` so an LLM-driven buyer agent can plan calls deterministically — see the [contract manifest](./contract-manifest.md).

## First automotive-specific A2A profile

AAP v0.1 is the first published A2A profile written specifically for the automotive retail vertical. Its goal is narrow: a buyer agent should be able to talk to any compliant dealer agent — Toyota, Honda, an independent used-car lot, a CDK/Reynolds-backed group — through identical typed messages, with consent, pricing, and ADF compatibility built in from day one.
