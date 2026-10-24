---
title: Migrating MCP integrations
description: Move from the optional AAP wrapper catalog to the first-class AAP 3.0 MCP binding.
---

# Migrating MCP integrations

{/* aap-draft-only:start */}

This page describes the unreleased **3.0.0** contract.

{/* aap-draft-only:end */}

MCP is now a [first-class binding](../bindings/mcp.md). Implement it directly against shared automotive services, or adapt an existing A2A backend.

| Earlier reference catalog | AAP 3.0 |
|---|---|
| Remote `$ref` as the tool's entire input schema | Complete object schemas with bundled `$defs` |
| No output schema | Typed success/error union in `outputSchema` |
| Custom AAP keys in `annotations` | Standard behavior hints; namespaced AAP `_meta` |
| Wrapper assumed to call A2A | Direct implementation or adapter |
| One old MCP revision | Current 2026-07-28 and 2025-11-25 client compatibility |
| Optional lead retry key | Required idempotency key and shared duplicate suppression |

Keep the `aap_*` tool names. Arguments still carry the typed AAP request, including `type`; results carry the matching response in `structuredContent` and serialized JSON text. Publish the same actual skill subset and inventory capabilities through every binding.

Update dealer-domain discovery and `/llms.txt` to point to the deployed MCP endpoint. The downloadable catalog is not that endpoint. A PAP `apis` entry for MCP additionally requires native PAP session authorization; an ordinary public MCP endpoint belongs in the AAP discovery extension until that support exists.

See the [MCP binding](../bindings/mcp.md) for exact envelopes, headers, error handling and authorization, and [inventory search](../skills/inventory-search.md) for the new search contract.
