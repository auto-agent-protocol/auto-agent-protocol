---
sidebar_position: 1
title: dealer.information
description: Return the dealership profile — identity, rooftop locations, hours, contact channels, and high-level service capabilities.
---

# `dealer.information`

![One dealer group with several rooftops, each carrying address, contacts, hours, and capabilities](/img/v1.1/dealer-rooftops.png)

:::info A2A invocation
This skill is invoked through A2A's `SendMessage` operation — the `SendMessage` JSON-RPC method on AAP's sole transport, the [JSON-RPC binding](../bindings/json-rpc.md) — not a dedicated REST URL. (The HTTP+JSON binding was [removed in v1.1](../bindings/rest.md).) AAP only defines what goes inside `Message.parts[].data`.
:::

The `dealer.information` skill returns a dealership's static profile. It is the simplest AAP call: the request carries no parameters, the response carries a [`DealerInformation`](https://autoagentprotocol.org/v1.1/schemas/dealer-information.schema.json) object describing the dealer group and its rooftops — each with identity, address, contact channels, business hours, and service capabilities.

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

The response wraps a `DealerInformation` object inside the standard AAP response envelope. A `DealerInformation` is a dealer group (`name` + optional `welcome_message`) plus one or more `rooftops`, where each rooftop is an individual dealership location:

```json
{
  "type": "dealer.information.response",
  "data": {
    "name": "string",
    "welcome_message": "string",
    "rooftops": [
      {
        "name": "string",
        "legal_name": "string",
        "website": "https://...",
        "geo": { "latitude": 0, "longitude": 0 },
        "emails": [{ "name": "string", "value": "string" }],
        "phones": [{ "name": "string", "value": "+1XXXXXXXXXX" }],
        "address": {
          "country": "US",
          "state": "CA",
          "city": "string",
          "address_line_1": "string",
          "address_line_2": "string",
          "zip": "94103"
        },
        "schedules": [
          {
            "name": "sales",
            "value": { "monday": { "open": "HH:MM", "close": "HH:MM" }, "sunday": null }
          }
        ],
        "timezone": "America/Los_Angeles",
        "notes": "string",
        "capabilities": ["sales", "service", "parts", "financing", "trade_in", "delivery"]
      }
    ]
  },
  "message": "Optional contextual note from the dealer."
}
```

`data` carries the full `DealerInformation` object. The only required top-level fields are `name` and `rooftops` (at least one). Within each rooftop, only `name` is required; everything else is optional.

| Field | Type | Required | Notes |
|---|---|---|---|
| `data.name` | string | yes | Dealer group name. |
| `data.welcome_message` | string | no | Optional greeting surfaced to the buyer. |
| `data.rooftops[]` | `Rooftop[]` | yes | One entry per dealership location; at least one. |
| `rooftop.name` | string | yes | Public-facing name of the location (also used by a vehicle's `rooftop` field). |
| `rooftop.legal_name` | string | no | Legal/registered business name. |
| `rooftop.website` | URI | no | Public website for this location. |
| `rooftop.geo.latitude` / `geo.longitude` | number | no | Coordinates of the location. |
| `rooftop.emails[]` | `{ name, value }[]` | no | `value` holds the email address; `name` is an optional label (e.g. "Sales"). |
| `rooftop.phones[]` | `{ name, value }[]` | no | `value` holds the phone number (e.g. `+14155550100`); `name` is an optional label. |
| `rooftop.address` | `Address` | no | Physical address. `country` is optional and defaults to `US`. |
| `rooftop.schedules[]` | object[] | no | Named weekly hours; each entry is `{ name, value }` where `value` maps each weekday to `{ open, close }` (24h `HH:MM`) or `null` when closed. |
| `rooftop.timezone` | string | no | IANA timezone identifier (e.g. `America/Los_Angeles`). |
| `rooftop.notes` | string | no | Free-text notes (e.g. "closed major holidays"). |
| `rooftop.capabilities[]` | string[] | no | Service capabilities, e.g. `sales`, `service`, `parts`, `financing`, `trade_in`, `delivery`. |

## Full example

A complete response from a dealer group with two rooftops:

```json
{
  "type": "dealer.information.response",
  "data": {
    "name": "Demo Auto Group",
    "welcome_message": "Welcome — happy to help by phone or video call.",
    "rooftops": [
      {
        "name": "Demo Toyota San Francisco",
        "legal_name": "Demo Toyota of San Francisco, LLC",
        "website": "https://sf.demo-toyota.example.com",
        "geo": { "latitude": 37.7935, "longitude": -122.3946 },
        "emails": [
          { "name": "Sales", "value": "sales@sf.demo-toyota.example.com" }
        ],
        "phones": [
          { "name": "Sales",   "value": "+14155550100" },
          { "name": "Service", "value": "+14155550101" }
        ],
        "address": {
          "country": "US",
          "state": "CA",
          "city": "San Francisco",
          "address_line_1": "1450 Howard Street",
          "zip": "94103"
        },
        "schedules": [
          {
            "name": "sales",
            "value": {
              "monday":    { "open": "09:00", "close": "20:00" },
              "tuesday":   { "open": "09:00", "close": "20:00" },
              "wednesday": { "open": "09:00", "close": "20:00" },
              "thursday":  { "open": "09:00", "close": "20:00" },
              "friday":    { "open": "09:00", "close": "20:00" },
              "saturday":  { "open": "09:00", "close": "18:00" },
              "sunday":    null
            }
          },
          {
            "name": "service",
            "value": {
              "monday":    { "open": "07:00", "close": "18:00" },
              "tuesday":   { "open": "07:00", "close": "18:00" },
              "wednesday": { "open": "07:00", "close": "18:00" },
              "thursday":  { "open": "07:00", "close": "18:00" },
              "friday":    { "open": "07:00", "close": "18:00" },
              "saturday":  { "open": "08:00", "close": "14:00" },
              "sunday":    null
            }
          }
        ],
        "timezone": "America/Los_Angeles",
        "notes": "Closed major US holidays.",
        "capabilities": ["sales", "service", "parts", "financing", "trade_in", "delivery"]
      },
      {
        "name": "Demo Toyota Oakland",
        "legal_name": "Demo Toyota of Oakland, LLC",
        "website": "https://oak.demo-toyota.example.com",
        "geo": { "latitude": 37.8044, "longitude": -122.2712 },
        "emails": [
          { "name": "Sales", "value": "sales@oak.demo-toyota.example.com" }
        ],
        "phones": [
          { "name": "Sales", "value": "+15105550100" }
        ],
        "address": {
          "country": "US",
          "state": "CA",
          "city": "Oakland",
          "address_line_1": "200 Broadway",
          "zip": "94607"
        },
        "schedules": [
          {
            "name": "sales",
            "value": {
              "monday":    { "open": "09:00", "close": "19:00" },
              "tuesday":   { "open": "09:00", "close": "19:00" },
              "wednesday": { "open": "09:00", "close": "19:00" },
              "thursday":  { "open": "09:00", "close": "19:00" },
              "friday":    { "open": "09:00", "close": "19:00" },
              "saturday":  { "open": "10:00", "close": "17:00" },
              "sunday":    null
            }
          }
        ],
        "timezone": "America/Los_Angeles",
        "capabilities": ["sales", "trade_in"]
      }
    ]
  },
  "message": "Welcome — happy to help by phone or video call."
}
```

## When to use it

- The buyer agent needs a rooftop's name, address, or hours to surface to the user.
- The buyer agent needs to confirm a rooftop's `capabilities` (e.g. `service` or `trade_in`) before routing the user to that location.
- The buyer agent needs the sales phone or email to display alongside a confirmed lead response.

`dealer.information` is anonymous and consent-free; LLM-driven buyer agents are encouraged to call it eagerly and cache the result.
