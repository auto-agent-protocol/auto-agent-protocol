---
sidebar_position: 2
title: HTTP+JSON (REST) binding — removed in v1.1
description: The HTTP+JSON (REST) binding was removed in AAP v1.1. AAP is JSON-RPC only; use the JSON-RPC 2.0 binding instead.
---

# HTTP+JSON (REST) binding — removed in v1.1

:::danger Removed in v1.1 — AAP is JSON-RPC only
The HTTP+JSON (REST) binding is **no longer part of AAP** as of v1.1. AAP rides on a single transport: the **[JSON-RPC 2.0 binding](json-rpc.md)** (A2A Section 9). There is no `POST /message:send` REST surface in AAP; `SendMessage` is invoked exclusively over JSON-RPC.

This page is kept only so existing links do not 404. For the current, normative transport, see the **[JSON-RPC 2.0 binding](json-rpc.md)**.
:::

In AAP v1.0, a dealer agent MAY have additionally exposed an optional HTTP+JSON interface alongside its required JSON-RPC interface. AAP v1.1 drops that option: every AAP agent speaks JSON-RPC 2.0, and only JSON-RPC 2.0. Buyer agents and dealer agents MUST use the [JSON-RPC binding](json-rpc.md).
