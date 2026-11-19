---
sidebar_position: 1
title: Introduction
description: AAP 4.0, the automotive contract for AI agents, with native MCP tools, A2A messages and PAP 1.0 signed-out APIs.
---

# Automotive, ready for agents


**Auto Agent Protocol gives AI agents a shared language for automotive retail.** Discover a dealer, search actual inventory, inspect evidence and pricing, then send a lead with the buyer's permission. Dealers that support them can also value a trade-in and receive a credit application.

![MCP, A2A and PAP connect buyer agents to one shared automotive contract](./img/network-overview.svg)

AAP 4.0 defines three native interfaces. Each carries the same typed request and response; none requires an extra hop through another protocol.

| Interface | How the agent calls | Baseline |
|---|---|---|
| [MCP](./bindings/mcp.md) | Discover and call automotive tools | Streamable HTTP, 2026-07-28 + 2025-11-25 compatibility |
| [A2A](./bindings/json-rpc.md) | `SendMessage` with an automotive DataPart | A2A 1.0, JSON-RPC 2.0 |
| [PAP](./personal-agent-protocol.md) | Native OpenAPI operation with delegated Session JWT and `Poppy-Version` | PAP 1.0 |

A full AAP 4.0 dealer deployment implements all three with the same skill subset and business behavior. A client needs only its chosen interface. A partial implementation can describe the binding it supports, but cannot claim the full deployment profile. [Conformance](./conformance.md) defines the exact boundary.

## Five core skills, two optional. One shopping journey.

![The five core automotive skills move from dealer discovery and inventory to evidence-backed detail and a consented lead](./img/skills-overview.svg)

| Skill | Answer |
|---|---|
| [`dealer_information`](./skills/dealer-information.md) | Who is this dealer, and where are its locations? |
| [`inventory_facets`](./skills/inventory-facets.md) | Which filters and feature codes are useful here? |
| [`inventory_search`](./skills/inventory-search.md) | Which vehicles meet every supported constraint? |
| [`inventory_vehicle`](./skills/inventory-vehicle.md) | What is known about this specific listing? |
| [`lead_submit`](./skills/lead-submit.md) | Can the dealer receive this explicitly authorized inquiry? |

Two optional skills extend the journey for dealers that offer them:

| Optional skill | Answer |
|---|---|
| [`trade_in_submit`](./skills/trade-in-submit.md) | What is this trade-in worth, as an estimate, a range or an offer? |
| [`credit_application_submit`](./skills/credit-application-submit.md) | Can the dealer receive this credit application, with each applicant's own credit consent? |

![Five core skills and two optional skills, each declared with its capabilities on every binding](./img/optional-skills.svg)

Declare one or more implemented skills, identically on every binding. An optional skill is declared only when implemented, with its `capabilities` in the Agent Card and the MCP tool metadata. Search with feature filters also requires facets for its feature vocabulary. For a complete shopping experience, implement all five core skills. The same vehicle model covers cars, EVs, motorcycles, RVs and trailers; an omitted `vehicle_type` means `car`.

## Automotive meaning, shared everywhere

![The AAP automotive layer sits above three independent protocol bindings and one dealer backend](./img/architecture-stack.svg)

- **Search:** explicit capabilities, verified features, radius/distance semantics and complete cursor pagination.
- **Truthful listings:** availability, freshness, identifiers and evidence; missing data remains unknown.
- **Clear pricing:** one authoritative advertised `price`; mandatory dealer charges are included, only government-required consumer charges are separate. New-vehicle `rebates` never change its meaning.
- **Explicit units:** native USD/CAD prices and mi/km odometers; single-currency searches and exact odometer comparisons. Omitted labels preserve USD/mi.
- **Controlled contact:** explicit channel consent, mandatory retry keys and truthful appointment outcomes. Trade-in contact and credit applications each need their own consent.

AAP covers discovery, research and dealer contact. Trade-in valuation and credit application submission are optional skills. Payments, checkout, reservations and binding purchase quotes remain out of scope.

## Start on the dealer's domain

![Publish dealer-domain discovery, connect the three interfaces, verify the shared behavior and expose the working service](./img/dealer-onboarding.svg)

Publish `/.well-known/agent-card.json`, `/.well-known/poppy.json` and `/llms.txt` on the dealer's HTTPS website. They link the actual MCP endpoint, A2A interface and deployment-specific PAP OpenAPI. Services can run on a provider's tenant infrastructure.

An agent follows an explicit endpoint and its access requirements. It does not have to guess a URL or scrape a search form. Discovery improves access; it does not guarantee every assistant will automatically use a protocol.

The selected automotive contract is identified by:

```text
https://autoagentprotocol.org/extensions/aap/v4.0
```

For a quick implementation path, read [discovery](./discovery.md), choose the [MCP](./bindings/mcp.md), [A2A](./bindings/json-rpc.md) or [PAP client](./pap-client-guide.md) guide, and validate against the [schemas](https://autoagentprotocol.org/v4.0/schemas/agent-card.schema.json). Existing operators should start with the [AAP 3.2 to 4.0 migration](./versioning.md#aap-32-to-40).
