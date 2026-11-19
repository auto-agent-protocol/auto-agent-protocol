---
sidebar_position: 2
title: Why automotive needs AAP
description: General agent protocols connect systems. AAP gives them a consistent automotive vocabulary and behavior.
---

# Why automotive needs AAP

**A connected tool still needs to explain what its data means.** Does a price include required fees? Does a feature exist on this vehicle? Is a test drive booked, or merely requested?

![Separate custom integrations converge on one automotive contract that works through MCP, A2A and PAP](./img/why-before-after.svg)

AAP makes those answers consistent across dealerships and protocols.

| Automotive question | AAP contract |
|---|---|
| Is this listing still eligible? | Controlled availability and a source update timestamp |
| Does it meet the buyer's constraints? | Declared filters, evidence, radius/distance and complete pagination |
| Which price can I compare? | Authoritative advertised price with mandatory dealer charges included |
| May I contact this dealer for the buyer? | An explicit consent grant for this payload and these channels |
| Does a rebate lower the price I can quote? | Unconditional rebates are already in `price`; conditional ones stay separate |
| What is the trade-in worth, and may a lender check credit? | Optional skills: a labelled estimate or offer, and each applicant's own credit consent |
| What happened after submission? | A lead ID, deduplicated retries and an explicit appointment outcome |

## Built on the protocols agents use

![MCP tools, A2A DataParts and PAP OpenAPI reuse the same automotive operations](./img/architecture-stack.svg)

| Standard | Its role in AAP 4.0 |
|---|---|
| [MCP](https://modelcontextprotocol.io/) | Native, self-describing tools with complete schemas and structured results |
| [A2A](https://a2a-protocol.org/) | Agent Card discovery and typed automotive messages |
| [Personal Agent Protocol 1.0](https://personalagentprotocol.org/docs/1.0/spec) | Company identity, delegated per-request Sessions, optional OAuth and native APIs |
| [ADF/XML](./compatibility/adf-mapping.md) | A practical delivery bridge to existing dealer lead systems |

AAP supplies automotive semantics and uses each protocol's own transport and authentication rules. An operator can route all three interfaces to the same inventory, pricing and lead services.

## A vertical contract with a clear boundary

Cars, electric vehicles, motorcycles, RVs and trailers share the same five core skills and two optional skills. Vehicle-specific fields carry range, charging, engine displacement and other known attributes without changing the call flow.

![Cars, electric powertrains and motorcycles share identity, pricing, evidence and availability](./img/multi-class-inventory.svg)

The release covers research and consented dealer contact, plus optional trade-in valuation and credit application submission. It does not define checkout, payments, reservations or binding purchase quotes. An accepted lead is a conversation starter; a confirmed appointment is an explicit, separate outcome. A trade-in estimate is not an offer, and a `declined` credit outcome in a response is not the creditor's adverse-action notice.

Use [conformance](./conformance.md) to distinguish a validated contract from a verified deployment. Publishing discovery alone does not implement the service, prove a client's support, or establish universal agent adoption.
