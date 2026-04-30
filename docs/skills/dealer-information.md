---
sidebar_position: 1
title: dealer.information
description: Return the dealership profile — identity, locations, brands, hours, contact channels, and high-level service capabilities.
---

# `dealer.information`

:::info A2A invocation
This skill is invoked through A2A's `SendMessage` operation (`SendMessage` JSON-RPC method or `POST /message:send` over HTTP+JSON), not a dedicated REST URL. The same payload travels on either A2A binding — see [JSON-RPC binding](../bindings/json-rpc.md) or [REST binding](../bindings/rest.md). AAP only defines what goes inside `Message.parts[].data`.
:::

The `dealer.information` skill returns a dealership's static profile. It is the simplest AAP call: the request carries no parameters, the response carries a [`DealerInformation`](https://autoagentprotocol.org/v0.1/schemas/dealer-information.schema.json) object describing identity, primary address, contact channels, business hours, and service capabilities.

| Property | Value |
|---|---|
| Skill id | `dealer.information` |
| Request type | `dealer.information.request` |
| Response type | `dealer.information.response` |
| Anonymous allowed | yes |
| Consent required | no |
| ADF compatible | no |

## Request shape

The request has a single field — the AAP type identifier. There are no parameters.

```json
{
  "type": "dealer.information.request"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | string const | yes | Always `dealer.information.request`. |

`additionalProperties: false`. The request is invalid if any other property is present.

## Response shape

The response wraps a `DealerInformation` object inside the standard AAP response envelope:

```json
{
  "type": "dealer.information.response",
  "data": {
    "dealer_id": "string",
    "legal_name": "string",
    "trade_name": "string",
    "brands": ["string"],
    "address": { "...Address..." },
    "geo":     { "latitude": 0, "longitude": 0 },
    "phones":  [{ "name": "string", "phone": "+1XXXXXXXXXX" }],
    "emails":  [{ "name": "string", "email": "string" }],
    "website": "https://...",
    "schedule": { "monday": { "open": "HH:MM", "close": "HH:MM" } },
    "timezone": "America/Los_Angeles",
    "notes": "string",
    "capabilities": {
      "test_drive": true,
      "financing": true,
      "trade_in": true,
      "service": true,
      "delivery": false,
      "remote_delivery": false
    }
  },
  "message": "Optional contextual note from the dealer."
}
```

`data` carries the full `DealerInformation` object. Required fields on that object are `dealer_id`, `legal_name`, `trade_name`, `brands`, and `address`.

| Field | Type | Required | Notes |
|---|---|---|---|
| `data.dealer_id` | string | yes | Stable dealer identifier (matches `dealer.dealer_id` in the contract manifest). |
| `data.legal_name` | string | yes | Legal/registered business name. |
| `data.trade_name` | string | yes | Public-facing trade name. |
| `data.brands[]` | string[] | yes | Brands the dealer is authorized to sell. |
| `data.address` | `Address` | yes | Primary physical address. |
| `data.geo.latitude` / `geo.longitude` | number | no | Coordinates of the primary location. |
| `data.phones[]` | `ContactPoint[]` | no | Each entry's `phone` is E.164 (e.g. `+14155550100`). |
| `data.emails[]` | `ContactPoint[]` | no | Email channels. |
| `data.website` | URI | no | Public website. |
| `data.schedule` | object | no | Weekly hours; each day is `{ open, close }` (24h `HH:MM`) or `null` when closed. |
| `data.timezone` | string | no | IANA timezone identifier (e.g. `America/Los_Angeles`). |
| `data.notes` | string | no | Free-text notes (e.g. "closed major holidays"). |
| `data.capabilities.*` | boolean | no | Flags for `test_drive`, `financing`, `trade_in`, `service`, `delivery`, `remote_delivery`. |

## Full example

A complete response from a public dealer:

```json
{
  "type": "dealer.information.response",
  "data": {
    "dealer_id": "dealer_demo_toyota",
    "legal_name": "Demo Toyota of San Francisco, LLC",
    "trade_name": "Demo Toyota",
    "brands": ["Toyota"],
    "address": {
      "line1": "100 Market St",
      "city": "San Francisco",
      "region_code": "CA",
      "postal_code": "94105",
      "country_code": "US"
    },
    "geo": { "latitude": 37.7935, "longitude": -122.3946 },
    "phones": [
      { "name": "Sales",   "phone": "+14155550100" },
      { "name": "Service", "phone": "+14155550101" }
    ],
    "emails": [
      { "name": "Sales",   "email": "sales@demo-toyota.example.com" }
    ],
    "website": "https://demo-toyota.example.com",
    "schedule": {
      "monday":    { "open": "09:00", "close": "20:00" },
      "tuesday":   { "open": "09:00", "close": "20:00" },
      "wednesday": { "open": "09:00", "close": "20:00" },
      "thursday":  { "open": "09:00", "close": "20:00" },
      "friday":    { "open": "09:00", "close": "20:00" },
      "saturday":  { "open": "09:00", "close": "18:00" },
      "sunday":    null
    },
    "timezone": "America/Los_Angeles",
    "notes": "Closed major US holidays.",
    "capabilities": {
      "test_drive": true,
      "financing": true,
      "trade_in": true,
      "service": true,
      "delivery": true,
      "remote_delivery": false
    }
  },
  "message": "Welcome — happy to help by phone or video call."
}
```

## When to use it

- The buyer agent needs the dealer's name, address, or hours to surface to the user.
- The buyer agent needs to confirm the dealer's brands before showing the dealer to a user looking for a specific make.
- The buyer agent needs the sales phone or email to display alongside a confirmed lead response.

`dealer.information` is anonymous and consent-free; LLM-driven buyer agents are encouraged to call it eagerly and cache the result.
