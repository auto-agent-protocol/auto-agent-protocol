---
sidebar_position: 1
title: Introduction
description: What the Auto Agent Protocol is, what it standardizes, and how to call your first dealer agent in a few minutes.
---

# Introduction

![Buyer agent and dealership digital storefront connected by typed AAP messages](/img/v1.1/network-overview.png)

**The Auto Agent Protocol (AAP) lets AI assistants shop at car dealerships.** People increasingly ask an AI assistant to find their next car. AAP is the free, open standard that lets any of those assistants find a dealership, browse its real inventory, and — with the customer's clear permission — send the dealership a sales lead. For a dealership, joining in means publishing **one small file on your own website** and answering a few well-defined questions; no app store, no middleman, no per-partner integration work.

![Dealers go live in three steps: publish the agent card, serve the skills, receive consented leads](/img/v1.1/dealer-onboarding.png)

In technical terms: AAP is a strict [A2A v1.0](https://a2a-protocol.org) (Agent2Agent) profile that defines the typed automotive data shapes AI agents and dealer agents exchange when they discover, browse, and submit leads. AAP does not invent a new wire protocol — every AAP message travels inside an A2A `Message.parts[].data` value as a typed `DataPart`. JSON-RPC 2.0 is the sole binding: a JSON-RPC 2.0 interface is REQUIRED on every AAP agent card. The HTTP+JSON (REST) binding was removed in v1.1, and gRPC is out of scope.

The extension is identified by a single URI:

```
https://autoagentprotocol.org/extensions/aap/v1.1
```

A dealer agent declares itself AAP-compliant by listing this URI in `capabilities.extensions[]` of its A2A agent card and by implementing **one or more** of the five standard AAP automotive skills. Agents pick the subset they support; AAP RECOMMENDS at least `inventory.search` + `lead.submit` for an end-to-end shopping flow, but neither is mandatory.

## What AAP standardizes

![Honeycomb of five AAP skills: dealer.information, inventory.facets, inventory.search, inventory.vehicle, lead.submit](/img/v1.1/skills-overview.png)

AAP v1.1 defines a **vocabulary** of five standard skill IDs that cover the read-and-lead lifecycle of automotive retail. A dealer agent picks whichever subset matches its capabilities — none of the five is individually mandatory.

| Skill | Purpose |
|---|---|
| `dealer.information` | Dealership profile, rooftops, hours, contact channels, capabilities |
| `inventory.facets` | Aggregated counts and ranges over the dealer's inventory |
| `inventory.search` | Filtered, paginated inventory queries |
| `inventory.vehicle` | Detail view of one specific vehicle (by VIN, stock, or vehicle_id) |
| `lead.submit` | Unified consented lead carrying customer info plus optional vehicle of interest, trade-in, and appointment |

It does NOT define authentication (v1.1 agents are public by default; auth is left to A2A), payments, financing approval, RFQ/quote workflows, trade-in valuations, or reservations. Future versions MAY extend this surface; v1.1 is intentionally minimal.

## Layered architecture

![Three-layer stack: HTTP at the bottom, A2A v1.0 in the middle, AAP automotive profile on top](/img/v1.1/architecture-stack.png)

AAP sits as a profile on top of A2A, which itself sits on top of HTTP. AAP never touches the wire format directly — it defines the shape of typed `DataParts` that A2A bindings carry.

```mermaid
flowchart TB
  subgraph Buyer["Buyer agent (LLM, assistant, app)"]
    BA["AAP DataPart<br/>&lt;scope&gt;.&lt;thing&gt;.request"]
  end

  subgraph A2A["A2A v1.0"]
    direction LR
    JR["JSON-RPC 2.0 binding (sole binding)"]
  end

  subgraph Dealer["Dealer agent"]
    DA["AAP DataPart<br/>&lt;scope&gt;.&lt;thing&gt;.response"]
  end

  Buyer -->|A2A Message.parts| A2A
  A2A -->|HTTP POST| Dealer
  Dealer -->|A2A Message.parts| A2A
  A2A -->|HTTP response| Buyer
```

AAP uses exactly **one** A2A operation: `SendMessage` — a request `Message` goes in, a response `Message` comes out. The optional A2A surface (`SendStreamingMessage`, the `tasks` operations Get/List/Cancel/Subscribe, push notification configs, `GetExtendedAgentCard`) is out of scope for AAP: dealer agents do not need to implement it, and buyer agents MUST NOT require it. AAP only specifies the typed payloads inside `DataPart.data`.

## Quick start

A buyer agent talks to a compliant dealer agent in three steps.

### 1. Discover the agent

Fetch the A2A agent card at the dealer's well-known URL:

```bash
curl https://demo-toyota.example.com/.well-known/agent-card.json
```

Confirm the card lists the AAP extension URI under `capabilities.extensions[].uri` and includes a `supportedInterfaces[]` entry whose `protocolBinding` is `JSONRPC` (REQUIRED on every AAP agent card; it is the sole AAP binding).

### 2. The binding

Every AAP agent exposes the JSON-RPC 2.0 binding — AAP's sole transport. gRPC is out of scope, and the HTTP+JSON (REST) binding was removed in v1.1.

| Binding | Status | A2A spec | AAP page |
|---|---|---|---|
| JSON-RPC 2.0 | REQUIRED (sole binding) | A2A Section 9 | [JSON-RPC binding](./bindings/json-rpc.md) |

### 3. Send a typed AAP message

Wrap an AAP request inside an A2A `Message` and send it with `SendMessage` — the single A2A operation AAP uses. Below is the simplest call — `dealer.information` over the JSON-RPC binding, using the A2A v1.0 ProtoJSON wire format (`ROLE_USER`/`ROLE_AGENT` enum names, no `kind` discriminators) that A2A v1.0 clients send and parse:

```bash
curl -X POST https://demo-toyota.example.com/a2a \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "SendMessage",
    "params": {
      "message": {
        "messageId": "01HZ9G5N8D1Y4M6SP9C4XKVW3Q",
        "role": "ROLE_USER",
        "parts": [
          {
            "data": { "type": "dealer.information.request" },
            "mediaType": "application/vnd.autoagent.dealer-information-request+json"
          }
        ]
      },
      "configuration": {
        "acceptedOutputModes": ["application/vnd.autoagent.dealer-information-response+json"]
      }
    }
  }'
```

The dealer agent replies with a `SendMessageResponse` in the JSON-RPC `result` — `{ "message": <Message> }` — where the `message` is an A2A `Message` whose first `DataPart.data` is an AAP response:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "message": {
      "messageId": "01HZ9G5P2KA8RT9WMS3B4C5D6E",
      "role": "ROLE_AGENT",
      "parts": [
        {
          "data": {
            "type": "dealer.information.response",
            "data": {
              "name": "Demo Auto Group",
              "welcome_message": "Welcome to Demo Auto Group.",
              "rooftops": [
                {
                  "name": "Demo Toyota San Francisco",
                  "legal_name": "Demo Toyota of San Francisco, LLC",
                  "website": "https://demo-toyota.example.com",
                  "phones": [
                    {
                      "name": "Sales",
                      "value": "+14155550100"
                    }
                  ],
                  "address": {
                    "country": "US",
                    "state": "CA",
                    "city": "San Francisco",
                    "address_line_1": "100 Market St",
                    "zip": "94105"
                  },
                  "timezone": "America/Los_Angeles",
                  "capabilities": [
                    "sales",
                    "service",
                    "financing"
                  ]
                }
              ]
            }
          },
          "mediaType": "application/vnd.autoagent.dealer-information-response+json"
        }
      ]
    }
  }
}
```

## Verified interoperability

![Works with every A2A v1.0 client: the official JS and Python SDKs and any A2A-capable assistant, all invoking one AAP dealer agent](/img/v1.1/interop-clients.png)

All five skills have been exercised live through the official A2A v1.0 SDKs (`@a2a-js/sdk` and `a2a-sdk` for Python): inventory search, facets, vehicle detail, dealer information, and a consented `lead.submit` — with no AAP-specific client code.

## Where to read next

- [Why automotive needs AAP](./why.md) — the gap AAP fills against A2A, ACP, MCP, and ADF.
- [A2A profile](./a2a-profile.md) — how AAP slots into A2A's three-layer architecture.
- [Discovery](./discovery.md) — full agent card example.
- [Pricing and FTC compliance](./pricing-and-ftc.md) — the three pricing fields and why `price` is the FTC-final out-the-door amount.
- [Skills reference](./skills/dealer-information.md) — one page per skill with full request/response examples.
