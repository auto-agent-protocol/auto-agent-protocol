---
sidebar_position: 3
title: inventory.search
description: Search vehicle inventory with a flat filter block, pagination, sort, and privacy hints. The primary skill for discovery and comparison.
---

# `inventory.search`

:::info A2A invocation
This skill is invoked through A2A's `SendMessage` operation (`SendMessage` JSON-RPC method or `POST /message:send` over HTTP+JSON), not a dedicated REST URL. The same payload travels on either A2A binding — see [JSON-RPC binding](../bindings/json-rpc.md) or [REST binding](../bindings/rest.md). AAP only defines what goes inside `Message.parts[].data`.
:::

![Inventory search flow: filters block flowing into a paginated vehicles list with facets](/img/inventory-search-flow.png)

The `inventory.search` skill is the primary inventory discovery surface. A buyer agent submits a flat filter block, optional pagination, optional sort, and optional privacy hints; the dealer agent returns matching `Vehicle` listings together with a total count and OPTIONAL aggregated facets.

| Property | Value |
|---|---|
| Skill id | `inventory.search` |
| Request type | `inventory.search.request` |
| Response type | `inventory.search.response` |
| Anonymous allowed | yes |
| Consent required | no |
| ADF compatible | no |

## Filter design

AAP keeps filters flat: there is no nested `make → model → trim` tree. Multi-value filters are arrays. Range filters use `*_min` / `*_max` pairs. All fields are optional; absence means "no constraint."

| Filter | Type | Multi-value? | Range? | Description |
|---|---|---|---|---|
| `make` | string[] | yes | — | Vehicle makes (e.g. `["Honda", "BMW"]`). |
| `model` | string[] | yes | — | Vehicle models. |
| `trim` | string[] | yes | — | Trim levels. |
| `condition` | enum[] | yes | — | Subset of `["new", "used", "certified"]`. |
| `transmission` | string[] | yes | — | Free-text transmission types. |
| `fuel` | string[] | yes | — | Free-text fuel types. |
| `driveline` | string[] | yes | — | Drivetrain layouts. |
| `body_type` | string[] | yes | — | Body types (e.g. sedan, suv). |
| `exterior_color` | string[] | yes | — | Free-text colors. |
| `interior_color` | string[] | yes | — | Free-text colors. |
| `year_min` / `year_max` | integer | — | yes | Inclusive year range. |
| `price_min` / `price_max` | number | — | yes | Inclusive price range. **Applied against the FTC-final `price` field.** See [Pricing and FTC compliance](../pricing-and-ftc.md). |
| `mileage_max` | integer | — | — | Maximum odometer reading. |
| `vin` | string | — | — | Exact VIN match (17 chars, ISO 3779). |
| `stock` | string | — | — | Exact dealer stock number. |
| `query` | string | — | — | Optional free-text query (max 200 chars). |

`additionalProperties: false` on `filters`. A request with an unknown filter key is invalid.

## Pagination, sort, privacy

```json
{
  "pagination": { "skip": 0, "limit": 20 },
  "sort":       { "field": "price", "order": "asc" },
  "privacy":    { "anonymous": true }
}
```

- `pagination.skip` and `pagination.limit` are integers. AAP recommends defaults of `skip=0`, `limit=20`, and a hard cap of `100`.
- `sort.field` accepts: `price`, `list_price`, `offered_price`, `msrp`, `mileage`, `year`, `make`, `model`, `stock`, `last_verified_at`. `sort.order` is `asc` or `desc`. **Sorting by `price` uses the FTC-final `price` field** that dealers MUST keep accurate.
- `privacy.anonymous: true` indicates the buyer agent is not attaching user identity to this search. AAP RECOMMENDS anonymous searches by default; user identity is attached only when a lead is submitted.

## Request shape

```json
{
  "type": "inventory.search.request",
  "filters":    { "...": "see filter table" },
  "pagination": { "skip": 0, "limit": 20 },
  "sort":       { "field": "price", "order": "asc" },
  "privacy":    { "anonymous": true }
}
```

| Field | Type | Required |
|---|---|---|
| `type` | const | yes |
| `filters` | object | no |
| `pagination` | object | no |
| `sort` | object | no |
| `privacy` | object | no |

## Response shape

```json
{
  "type": "inventory.search.response",
  "data": {
    "total":    0,
    "skip":     0,
    "limit":    0,
    "vehicles": [{ "...Vehicle..." }],
    "facets":   { "...Facets... (optional)" }
  },
  "message": "Optional contextual note."
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `data.total` | integer | yes | Total number of matching vehicles across all pages. |
| `data.skip` | integer | no | Echo of request `pagination.skip`. |
| `data.limit` | integer | no | Echo of effective `pagination.limit`. |
| `data.vehicles[]` | `Vehicle[]` | yes | Listings in the requested order. |
| `data.facets` | `Facets` | no | OPTIONAL embedded aggregation over the matching set. |

Each `Vehicle` MUST include `dealer_id`, `year`, `make`, `model`, `condition`, and `status`. `vin`, `stock`, and `vehicle_id` SHOULD be present (and a vehicle detail response SHOULD include `vin` or `stock`). `last_verified_at` MUST be present whenever the dealer is making availability claims — see [Behavior rules](../behavior-rules.md). Vehicle `status` is **free-text** (e.g. "In Stock", "In Transit", "Pending", "Sold", "Reserved"); known-sold vehicles MUST NOT be returned by `inventory.search`.

## Full example

A buyer agent searches for certified or used Hondas from 2020 onward, under $30,000 final price, sorted ascending by price.

### Request

```json
{
  "type": "inventory.search.request",
  "filters": {
    "make": ["Honda"],
    "condition": ["used", "certified"],
    "year_min": 2020,
    "price_max": 30000
  },
  "pagination": { "skip": 0, "limit": 20 },
  "sort": { "field": "price", "order": "asc" },
  "privacy": { "anonymous": true }
}
```

### Response

```json
{
  "type": "inventory.search.response",
  "data": {
    "total": 2,
    "skip": 0,
    "limit": 20,
    "vehicles": [
      {
        "dealer_id": "dealer_demo_toyota",
        "vin": "1HGCV1F30KA000001",
        "stock": "T12345",
        "year": 2022,
        "make": "Honda",
        "model": "Civic",
        "trim": "EX",
        "condition": "certified",
        "transmission": "automatic",
        "fuel": "gas",
        "driveline": "fwd",
        "body_type": "sedan",
        "exterior_color": "Crystal Black Pearl",
        "mileage": 22150,
        "list_price": { "amount": 24990, "currency": "USD" },
        "price":      { "amount": 26780, "currency": "USD" },
        "photos": [
          "https://demo-toyota.example.com/photos/T12345-1.jpg"
        ],
        "vdp_url": "https://demo-toyota.example.com/inventory/T12345",
        "status": "In Stock",
        "last_verified_at": "2026-04-30T10:15:00Z"
      },
      {
        "dealer_id": "dealer_demo_toyota",
        "stock": "T12399",
        "vehicle_id": "veh_inbound_civic_2024_001",
        "year": 2024,
        "make": "Honda",
        "model": "Civic",
        "trim": "Touring",
        "condition": "new",
        "transmission": "automatic",
        "fuel": "hybrid",
        "driveline": "fwd",
        "body_type": "sedan",
        "list_price": { "amount": 27990, "currency": "USD" },
        "price":      { "amount": 29990, "currency": "USD" },
        "status": "In Transit",
        "last_verified_at": "2026-04-30T08:00:00Z"
      }
    ]
  }
}
```

Note that vehicle 2 has only `stock` and `vehicle_id` (no VIN yet, since it is in transit), and its `status` is the free-text "In Transit". Both listings include `last_verified_at`.

## Sort considerations

- Sorting by `price` (default for price-comparison flows) sorts on the FTC-final out-the-door amount. This is what buyer agents SHOULD use to honestly compare offers.
- Sorting by `list_price`, `offered_price`, or `msrp` is allowed for users who want a different perspective; the dealer SHOULD still publish accurate `price` for FTC compliance.
- Sorting by `last_verified_at desc` is the recommended freshness ordering when buyers care about which listings the dealer has most recently re-confirmed.

## Anonymous search by default

AAP RECOMMENDS that buyer agents send `privacy.anonymous: true` on every `inventory.search` call. User identity is reserved for the moment a lead is actually submitted (see [`lead.vehicle`](./lead-vehicle.md)). Dealers MUST support anonymous `inventory.search` unless their agent card and contract manifest explicitly state otherwise.
