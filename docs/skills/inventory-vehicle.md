---
sidebar_position: 4
title: inventory.vehicle
description: Detail view of a single vehicle by VIN, stock, or vehicle_id, returning the full typed vehicle card.
---

# `inventory.vehicle`

![inventory.vehicle: look up one vehicle by VIN, stock number, or vehicle_id and get the full typed detail card](/img/v1.1/vehicle-detail-lookup.png)

:::info A2A invocation
This skill is invoked through A2A's `SendMessage` operation — the single A2A operation AAP v1.1 uses — not a dedicated REST URL. It travels as the `SendMessage` JSON-RPC method on AAP's sole transport, the [JSON-RPC binding](../bindings/json-rpc.md). (The HTTP+JSON binding was [removed in v1.1](../bindings/rest.md).) AAP only defines what goes inside `Message.parts[].data`.
:::

The `inventory.vehicle` skill returns the full detail of a single vehicle. The buyer agent identifies the vehicle by VIN, stock number, or dealer-internal `vehicle_id`.

| Property | Value |
|---|---|
| Skill id | `inventory.vehicle` |
| Request type | `inventory.vehicle.request` |
| Response type | `inventory.vehicle.response` |
| Anonymous allowed | yes |
| Consent required | no |
| ADF compatible | no |

## Request shape

```json
{
  "type": "inventory.vehicle.request",
  "vin":        "string (17 chars, ISO 3779)",
  "stock":      "string",
  "vehicle_id": "string"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | const | yes | `inventory.vehicle.request`. |
| `vin` | string | conditional | 17-char VIN. Preferred when known. |
| `stock` | string | conditional | Dealer's stock number. Used when VIN is not yet assigned. |
| `vehicle_id` | string | conditional | Dealer-internal identifier (e.g. for in-transit units). |

The request MUST include **at least one** of `vin`, `stock`, or `vehicle_id` (`anyOf`). Sending more than one is allowed; the dealer agent uses the most specific match.

## Response shape

The response wraps a `Vehicle` object — a `Vehicle` plus arbitrary additional dealer-specific properties (`additionalProperties: true`).

```json
{
  "type": "inventory.vehicle.response",
  "data": {
    "...Vehicle (all fields)": "...",
    "...optional extra dealer-specific fields": "e.g. carfax_url, warranty, title_status"
  },
  "message": "Optional contextual note."
}
```

`data` SHOULD include `vin` or `stock` (recommended for any availability claim) and the identification fields `year`, `make`, `model` to be useful. `condition` (when present) MUST be one of `new` | `used` | `cpo`. `data` MUST include `updated_at` whenever the agent is making availability claims about this listing — see [Behavior rules](../behavior-rules.md).

Pricing fields:

| Field | Always present? | Notes |
|---|---|---|
| `msrp` | optional | Sticker price set by the OEM. |
| `list_price` | optional | Base advertised price before incentives and fees. |
| `price` | RECOMMENDED | FTC-final out-the-door amount. See [Pricing and FTC compliance](../pricing-and-ftc.md). |

## Full example

### Request

```json
{
  "type": "inventory.vehicle.request",
  "vin": "1HGCV1F30KA000001"
}
```

### Response

```json
{
  "type": "inventory.vehicle.response",
  "data": {
    "dealer_id": "dealer_demo_toyota",
    "vin": "1HGCV1F30KA000001",
    "stock": "T12345",
    "year": 2022,
    "make": "Honda",
    "model": "Civic",
    "trim": "EX",
    "transmission": "automatic",
    "exterior_color": "Crystal Black Pearl",
    "interior_color": "Black",
    "condition": "cpo",
    "description": "One-owner CPO Civic EX with Honda Sensing.",
    "driveline": "fwd",
    "engine": "2.0L I4",
    "fuel": "gas",
    "city_mpg": 32,
    "highway_mpg": 42,
    "msrp": 26500,
    "list_price": 24990,
    "price": 26780,
    "mileage": 22150,
    "rooftop": "Demo Toyota San Francisco",
    "photos": [
      "https://demo-toyota.example.com/photos/T12345-1.jpg",
      "https://demo-toyota.example.com/photos/T12345-2.jpg"
    ],
    "vdp_url": "https://demo-toyota.example.com/inventory/T12345",
    "status": "available",
    "notes": "Honda CPO eligible.",
    "inventory_date": "2026-04-12",
    "updated_at": "2026-04-30T10:15:00Z",
    "features": [
      "Adaptive Cruise Control",
      "Lane Keeping Assist",
      "Apple CarPlay",
      "Heated Front Seats"
    ],
    "carfax_url": "https://demo-toyota.example.com/carfax/T12345",
    "warranty": "Honda True Certified+, 60 months remaining"
  }
}
```

`features` is a declared field on the unified `Vehicle`. The response above also includes extra dealer-specific properties (`carfax_url`, `warranty`) that are not part of the base Vehicle schema; AAP allows them via the Vehicle's `additionalProperties: true` (other common extras include `title_status`).

## Errors

- `VEHICLE_NOT_FOUND` — none of the supplied identifiers match a listing.
- `VEHICLE_UNAVAILABLE` — the listing exists but is no longer available (e.g. its status is no longer one of `available` | `intransit` | `pending`).

See [Errors](../errors.md) for full semantics.
