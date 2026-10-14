---
sidebar_position: 2
title: HTTP+JSON (REST) binding — removed in v1.1.0
description: The HTTP+JSON (REST) binding was removed in AAP v1.1.0. AAP's A2A interface uses JSON-RPC; Poppy has a separate native API.
---

# HTTP+JSON (REST) binding — removed in v1.1.0

:::danger A2A HTTP+JSON removed in v1.1.0
The HTTP+JSON (REST) binding is **no longer part of AAP** as of v1.1.0. AAP's A2A interface uses the **[JSON-RPC 2.0 binding](json-rpc.md)** (A2A Section 9). There is no `POST /message:send` REST surface in AAP; `SendMessage` is invoked exclusively over JSON-RPC.

This page is kept only so existing links do not 404. For the current A2A transport, see the **[JSON-RPC 2.0 binding](json-rpc.md)**.
:::

In AAP v1.0.0, a dealer agent MAY have additionally exposed an optional HTTP+JSON interface alongside its required JSON-RPC interface. AAP v1.1.0 removed that option from its A2A profile. AAP's A2A clients and dealer interfaces MUST use the [JSON-RPC binding](json-rpc.md).


AAP 2.0 adds a separate [native Poppy OpenAPI interface](../personal-agent-protocol.md). It uses Poppy sessions and automotive skill routes; it does not restore A2A HTTP+JSON or `/message:send`.
