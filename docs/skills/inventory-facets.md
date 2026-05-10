---
sidebar_position: 2
title: inventory.facets
description: Aggregated counts and ranges (makes, models, years, conditions, price/mileage ranges) over a dealer's inventory, optionally scoped by filters.
---

# `inventory.facets`

:::info A2A invocation
This skill is invoked through A2A's `SendMessage` operation (`SendMessage` JSON-RPC method or `POST /message:send` over HTTP+JSON), not a dedicated REST URL. The same payload travels on either A2A binding — see [JSON-RPC binding](../bindings/json-rpc.md) or [REST binding](../bindings/rest.md). AAP only defines what goes inside `Message.parts[].data`.
:::

The `inventory.facets` skill returns aggregated facet counts and ranges over a dealer's inventory. A buyer agent uses it to discover what a dealer actually carries before composing a search — for example, to learn the set of available makes and models, the year range, or the price ceiling.

| Property | Value |
|---|---|
| Skill id | `inventory.facets` |
| Request type | `inventory.facets.request` |
| Response type | `inventory.facets.response` |
| Anonymous allowed | yes |
| Consent required | no |
| ADF compatible | no |

## Request shape

```json
{
  "type": "inventory.facets.request",
  "filters": {
    "...": "(same shape as inventory.search filters; all optional)"
  }
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | const | yes | `inventory.facets.request`. |
| `filters` | object | no | Optional scoping filters. Same shape as the [`inventory.search`](./inventory-search.md) filter block; all fields are optional. |

When `filters` is absent, facets are aggregated over the dealer's entire inventory. When it is present, facets are aggregated over only the matching subset (e.g. all `condition: ["used"]` listings).

## Response shape

```json
{
  "type": "inventory.facets.response",
  "data": {
    "makes":           [{ "value": "string", "count": 0 }],
    "models":          [{ "value": "string", "count": 0 }],
    "trims":           [{ "value": "string", "count": 0 }],
    "years":           [{ "value": 0,        "count": 0 }],
    "conditions":      [{ "value": "string", "count": 0 }],
    "transmissions":   [{ "value": "string", "count": 0 }],
    "fuels":           [{ "value": "string", "count": 0 }],
    "drivelines":      [{ "value": "string", "count": 0 }],
    "bodies":          [{ "value": "string", "count": 0 }],
    "exterior_colors": [{ "value": "string", "count": 0 }],
    "interior_colors": [{ "value": "string", "count": 0 }],
    "statuses":        [{ "value": "string", "count": 0 }],
    "price_range":   { "min": 0, "max": 0 },
    "mileage_range": { "min": 0, "max": 0 },
    "year_range":    { "min": 0, "max": 0 }
  }
}
```

Each `*_facet` array entry is `{ value, count }` where `value` is the facet term (string or integer) and `count` is the number of matching listings. The three `*_range` fields are `{ min, max }` numeric ranges.

`price_range` aggregates the FTC-final `price` field (see [Pricing and FTC compliance](../pricing-and-ftc.md)).

## Scoped facets example

Used-only facets:

### Request

```json
{
  "type": "inventory.facets.request",
  "filters": { "condition": ["used"] }
}
```

### Response

```json
{
  "type": "inventory.facets.response",
  "data": {
    "makes": [
      { "value": "Honda",  "count": 12 },
      { "value": "Toyota", "count": 27 }
    ],
    "models": [
      { "value": "Civic",   "count": 5 },
      { "value": "Accord",  "count": 4 },
      { "value": "Camry",   "count": 9 },
      { "value": "Corolla", "count": 8 }
    ],
    "conditions": [
      { "value": "used", "count": 39 }
    ],
    "year_range":    { "min": 2015, "max": 2024 },
    "price_range":   { "min": 9990, "max": 38990 },
    "mileage_range": { "min": 8400, "max": 142000 }
  }
}
```

## When to use it

- The buyer agent wants to enumerate the dealer's makes/models before constructing a search.
- The buyer agent needs to surface a price slider or year filter to the user.
- The buyer agent wants a count of the dealer's used inventory before recommending a deeper conversation.

`inventory.facets` is anonymous and consent-free. The dealer agent SHOULD return the same set of facet keys regardless of filter, omitting only those for which it has no inventory.
