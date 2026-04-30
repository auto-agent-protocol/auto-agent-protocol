---
sidebar_position: 4
title: inventory.vehicle
description: Detail view of a single vehicle by VIN, stock, or vehicle_id, optionally with a buyer zip_code for regional offered_price.
---

# `inventory.vehicle`

:::info A2A invocation
This skill is invoked through A2A's `SendMessage` operation (`SendMessage` JSON-RPC method or `POST /message:send` over HTTP+JSON), not a dedicated REST URL. The same payload travels on either A2A binding — see [JSON-RPC binding](../bindings/json-rpc.md) or [REST binding](../bindings/rest.md). AAP only defines what goes inside `Message.parts[].data`.
:::

The `inventory.vehicle` skill returns the full detail of a single vehicle. The buyer agent identifies the vehicle by VIN, stock number, or dealer-internal `vehicle_id`. An optional `zip_code` enables regional pricing (`offered_price`) when the dealer supports desking.

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
  "vehicle_id": "string",
  "zip_code":   "string"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | const | yes | `inventory.vehicle.request`. |
| `vin` | string | conditional | 17-char VIN. Preferred when known. |
| `stock` | string | conditional | Dealer's stock number. Used when VIN is not yet assigned. |
| `vehicle_id` | string | conditional | Dealer-internal identifier (e.g. for in-transit units). |
| `zip_code` | string | no | Buyer ZIP/postal code; when supplied, the dealer MAY return a regional `offered_price`. |

The request MUST include **at least one** of `vin`, `stock`, or `vehicle_id` (`anyOf`). Sending more than one is allowed; the dealer agent uses the most specific match.

## Response shape

The response wraps a `VehicleDetail` object — a `Vehicle` plus arbitrary additional dealer-specific properties (`additionalProperties: true`).

```json
{
  "type": "inventory.vehicle.response",
  "data": {
    "...Vehicle (all fields)": "...",
    "...optional extra dealer-specific fields": "e.g. equipment[], history[], certification, warranty"
  },
  "message": "Optional contextual note."
}
```

`data` MUST include the required Vehicle fields: `dealer_id`, `year`, `make`, `model`, `condition`, `status`. `data` SHOULD include `vin` or `stock` (recommended for any availability claim). `data` MUST include `last_verified_at` whenever the agent is making availability claims about this listing — see [Behavior rules](../behavior-rules.md).

Pricing fields:

| Field | Always present? | Notes |
|---|---|---|
| `msrp` | optional | Sticker price set by the OEM. |
| `list_price` | optional | Base advertised price before incentives, taxes, fees. |
| `offered_price` | optional, conditional | Present only when `zip_code` is supplied AND the dealer supports desking. |
| `price` | RECOMMENDED | FTC-final out-the-door amount. See [Pricing and FTC compliance](../pricing-and-ftc.md). |

## Full example with `zip_code`

### Request

```json
{
  "type": "inventory.vehicle.request",
  "vin": "1HGCV1F30KA000001",
  "zip_code": "94105"
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
    "condition": "certified",
    "description": "One-owner CPO Civic EX with Honda Sensing.",
    "driveline": "fwd",
    "engine": "2.0L I4",
    "fuel": "gas",
    "mpg": { "city": 32, "highway": 42 },
    "msrp":          { "amount": 26500, "currency": "USD" },
    "list_price":    { "amount": 24990, "currency": "USD" },
    "offered_price": { "amount": 26615, "currency": "USD" },
    "price":         { "amount": 26780, "currency": "USD" },
    "zip_code": "94105",
    "mileage": 22150,
    "photos": [
      "https://demo-toyota.example.com/photos/T12345-1.jpg",
      "https://demo-toyota.example.com/photos/T12345-2.jpg"
    ],
    "vdp_url": "https://demo-toyota.example.com/inventory/T12345",
    "status": "In Stock",
    "notes": "Honda CPO eligible.",
    "last_verified_at": "2026-04-30T10:15:00Z",
    "equipment": [
      "Adaptive Cruise Control",
      "Lane Keeping Assist",
      "Apple CarPlay",
      "Heated Front Seats"
    ],
    "certification": {
      "program": "Honda True Certified+",
      "warranty_remaining_months": 60
    }
  }
}
```

The response includes two extra dealer-specific properties (`equipment`, `certification`) that are not part of the base Vehicle schema. AAP allows them via `VehicleDetail`'s `additionalProperties: true`.

## Without `zip_code`

If `zip_code` is omitted from the request, the response MUST omit `offered_price`. `price` is still expected (it is the FTC-final out-the-door amount and does not depend on a buyer location for its presence).

```json
{
  "type": "inventory.vehicle.request",
  "vin": "1HGCV1F30KA000001"
}
```

## Errors

- `VEHICLE_NOT_FOUND` — none of the supplied identifiers match a listing.
- `VEHICLE_UNAVAILABLE` — the listing exists but is no longer available (e.g. status set to "Sold").

See [Errors](../errors.md) for full semantics.
