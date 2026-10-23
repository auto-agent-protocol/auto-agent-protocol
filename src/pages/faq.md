---
title: Auto Agent Protocol FAQ
description: Understand AAP, who it is for, how compatible AI assistants use it, and how to start an automotive integration.
---

# Auto Agent Protocol FAQ

Auto Agent Protocol (AAP) is an open contract for dealership discovery, inventory information, and consented customer contact. It gives dealerships and buyer applications a shared automotive vocabulary, built on A2A.

Read the [released specification](/docs/v2.1/intro), explore the [public repository](https://github.com/auto-agent-protocol/auto-agent-protocol), or find [implementations and ecosystem participants](/partners).

## Who is AAP for?

AAP is for developers building buyer agents, dealerships making inventory available to compatible applications, and automotive software providers connecting those systems. A dealership can implement the contract itself or work with an implementation provider.

Shoppers use an application or assistant connected to an implementation. They do not need to read the specification to benefit from that connection.

## What problem does AAP solve?

Different applications need consistent meanings for dealership information, vehicle searches, vehicle details, and contact requests. AAP defines those meanings so compatible clients and dealer services can exchange structured information through a shared contract.

The specification provides schemas, examples, and behavior rules. An integration still needs a working service, accurate inventory, and a client that supports the advertised contract. See the [introduction](/docs/v2.1/intro).

## What can a compatible integration do?

AAP defines five skills. A service advertises the subset it implements, and clients check those capabilities before making requests.

| Skill | Purpose |
|---|---|
| `dealer.information` | Retrieve dealership information and locations |
| `inventory.facets` | Explore available inventory categories and ranges |
| `inventory.search` | Search inventory using structured filters |
| `inventory.vehicle` | Retrieve details for an identified vehicle |
| `lead.submit` | Submit a contact request with the required customer consent |

The contract covers a browsing and contact journey. Payments, financing approval, reservations, and trade-in valuations are outside the v2.1 scope. A submitted visit request is not a confirmed appointment. See the [skill documentation](/docs/v2.1/skills/dealer-information) and [lead submission contract](/docs/v2.1/skills/lead-submit).

## Does publishing an Agent Card make every assistant use AAP?

No. An Agent Card describes a service's capabilities and how a compatible client can reach it. The client still needs to discover the service and support its contract.

Publishing a card does not automatically install a connector, enroll a dealership in an assistant directory, or guarantee that an assistant will select the service. A mention in a search answer is also different from a client making a protocol request. See [discovery](/docs/v2.1/discovery).

## How does AAP relate to A2A and MCP?

AAP defines automotive data and behavior as a profile of A2A. A2A supplies the communication model. An MCP adapter can expose an AAP-backed service as tools to a compatible assistant host.

These roles are complementary. An MCP manifest describes a tool mapping; it is not a running service or evidence that a particular assistant has connected successfully. See the [AAP profile](/docs/v2.1/a2a-profile) and [MCP compatibility documentation](/docs/v2.1/compatibility/mcp).

## How does AAP support Personal Agent Protocol?

AAP 2.1.0 publishes both `/.well-known/agent-card.json` and `/.well-known/poppy.json`. Poppy-aware personal agents verify the dealer's OAuth issuer, start a signed-out Session and use a native OpenAPI API for the same automotive skills. The shopper does not need a dealer account, and contact still requires explicit consent.

This targets Poppy draft 0.2. A website-only discovery file is a valid migration stage but does not provide the native API. A2A is not relabeled as a Poppy conversation protocol. PAP 0.1 clients must migrate before using this interface; see the [client walkthrough](/docs/v2.1/pap-client-guide). See the [full Poppy specification](/docs/v2.1/personal-agent-protocol) and [verification scope](/docs/v2.1/conformance).

## Are plugins or connectors required?

They are optional integration and distribution mechanisms. A compatible buyer client can communicate with an AAP service directly. An assistant that uses MCP tools can instead connect through an adapter.

A public directory listing may help people find an implementation, but AAP does not require a separate listing for every dealership. Each assistant platform controls its own setup, eligibility, permissions, and review process. Compatibility should be established for the particular service and client, rather than inferred from the existence of the standard.

## Does a dealer service need to run an AI model?

No. Structured inventory queries, validation, and record lookup can be implemented with ordinary application code. A buyer assistant may use a model to interpret natural language, while the dealer service handles structured requests.

AAP specifies the public contract rather than the service's internal implementation. Adopting AAP does not itself require an account with a particular model provider. See the [AAP introduction](/docs/v2.1/intro) and [A2A core concepts](https://a2a-protocol.org/latest/topics/key-concepts/).

## Does adopting AAP require publishing private code or data?

No. The specification is open; an implementation can keep its source code and internal systems private. It exposes the interface and information that callers are authorized to access.

An Agent Card is capability metadata, not permission to disclose internal implementation details. Authentication and access requirements remain responsibilities of the implementation using the protocol's applicable security mechanisms. See the [discovery contract](/docs/v2.1/discovery).

## How does AAP handle customer contact?

Browsing inventory and submitting a contact request are separate operations. `lead.submit` requires the consent information defined by the contract. Finding a vehicle or discussing a possible visit does not by itself authorize sending a person's details.

The response must be interpreted according to the implemented contract. A request to a dealership does not establish a completed sale or a confirmed appointment. See [lead submission](/docs/v2.1/skills/lead-submit) and the [behavior rules](/docs/v2.1/behavior-rules).

## Does AAP replace dealer websites or CRMs?

AAP defines how compatible applications exchange automotive information. It does not prescribe a dealership's website or internal software. The specification documents how its lead data maps to ADF/XML for integrations with existing automotive workflows; each implementation must verify its own delivery behavior. See [ADF mapping](/docs/v2.1/compatibility/adf-mapping).

## Which version should an integration support?

Use the exact version advertised by the service and validate against its corresponding schemas and behavior. Released contracts and their documentation are frozen.

The [release registry](https://github.com/auto-agent-protocol/auto-agent-protocol/blob/main/releases.json) identifies the approved stable version. `/docs/latest/` contains editable documentation and may describe unreleased changes; it is not interchangeable with a version-pinned release. Consult the [versioning and migration guidance](/docs/latest/versioning) before changing an integration.

## How can I get started or contribute?

Start with the [released introduction](/docs/v2.1/intro), then review [discovery](/docs/v2.1/discovery) and the skills relevant to your application. Compare those requirements with the capabilities your service can support, and test the complete interaction with a compatible client.

For changes to the standard, open an issue describing the interoperability problem and a concrete example. Follow the [contribution guide](/docs/latest/contributing). The [public repository](https://github.com/auto-agent-protocol/auto-agent-protocol) contains the specification, schemas, and examples; star it if you find it useful and want to help others discover the project.
