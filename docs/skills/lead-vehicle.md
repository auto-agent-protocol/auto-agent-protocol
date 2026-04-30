---
sidebar_position: 6
title: lead.vehicle
description: ADF-mappable vehicle-specific lead. Vehicle reference required; customer and ConsentGrant required when contact info is shared.
---

# `lead.vehicle`

:::info A2A invocation
This skill is invoked through A2A's `SendMessage` operation (`SendMessage` JSON-RPC method or `POST /message:send` over HTTP+JSON), not a dedicated REST URL. The same payload travels on either A2A binding — see [JSON-RPC binding](../bindings/json-rpc.md) or [REST binding](../bindings/rest.md). AAP only defines what goes inside `Message.parts[].data`.
:::

![Consent gate: anonymous browsing on the left, ConsentGrant in the middle, consented lead on the right](/img/consent-gate.png)

The `lead.vehicle` skill submits a vehicle-specific inquiry. Its payload is designed to map losslessly onto [ADF/XML](../compatibility/adf-mapping.md) so a dealer's existing CRM can ingest the lead without changes. The request MUST include at least one vehicle reference; when `customer` is present, `consent` MUST also be present and `scope` MUST include `vehicle_inquiry`.

| Property | Value |
|---|---|
| Skill id | `lead.vehicle` |
| Request type | `lead.vehicle.request` |
| Response type | `lead.vehicle.response` |
| Anonymous allowed | no |
| Consent required | yes |
| ADF compatible | **yes** |

For the field-by-field ADF/XML mapping, see [ADF mapping](../compatibility/adf-mapping.md).

## Request shape

```json
{
  "type": "lead.vehicle.request",
  "vehicles": [
    {
      "vin":        "string (17 chars)",
      "stock":      "string",
      "vehicle_id": "string",
      "year":  0, "make": "string", "model": "string", "trim": "string",
      "condition":  "new | used | certified"
    }
  ],
  "intent":       "buy | lease | trade_in | test_drive",
  "finance_type": "cash | finance | lease",
  "timeline":     "asap | 1_3_months | 3_6_months | flexible",
  "trade_in":     { "year": 0, "make": "string", "model": "string", "mileage": 0 },
  "message":      "Free-text message from the user (max 4000 chars).",
  "customer":     { "...Customer..." },
  "consent":      { "...ConsentGrant... (required when customer is present)" },
  "source_agent": "string",
  "submitted_at": "ISO-8601"
}
```

Each `vehicles[]` entry MUST include at least one identifier (`vin`, `stock`, `vehicle_id`) or the year + make + model trio. `additionalProperties: false` on each vehicle entry.

| Field | Type | Required | Notes |
|---|---|---|---|
| `type` | const | yes | `lead.vehicle.request`. |
| `vehicles[]` | array | yes (`minItems: 1`) | At least one vehicle reference. |
| `intent` | enum | no | `buy`, `lease`, `trade_in`, or `test_drive`. Maps to ADF `<vehicle interest>` attribute. |
| `finance_type` | enum | no | `cash`, `finance`, or `lease`. Maps to ADF `<finance><method>`. |
| `timeline` | enum | no | `asap`, `1_3_months`, `3_6_months`, `flexible`. |
| `trade_in` | object | no | Optional trade-in vehicle details. |
| `message` | string | no | Free-text message from the user. |
| `customer` | `Customer` | no | When present, `consent` MUST also be present. |
| `consent` | `ConsentGrant` | conditional | Required when `customer` is present. `scope` MUST include `vehicle_inquiry`. |
| `source_agent` | string | yes | Buyer agent identifier. |
| `submitted_at` | date-time | no | Maps to ADF `<requestdate>`. |

## Response shape

`lead.vehicle` shares the [`LeadResponse`](./lead-general.md#response-shape) envelope with `lead.general`.

```json
{
  "type": "lead.vehicle.response",
  "data": {
    "lead_id": "string",
    "status":  "received | duplicate | rejected",
    "dealer":  { "name": "string", "phone": "+1XXXXXXXXXX" }
  },
  "message": "Optional contextual note."
}
```

`status` semantics are the same as `lead.general`. Repeated leads for the same `customer` + `vehicle` SHOULD return `duplicate`.

## Full example

A user submits a lead on a specific Civic by VIN, intends to buy, prefers financing, and authorizes email + phone follow-up.

### Request

```json
{
  "type": "lead.vehicle.request",
  "vehicles": [
    {
      "vin": "1HGCV1F30KA000001",
      "year": 2022,
      "make": "Honda",
      "model": "Civic",
      "trim": "EX",
      "condition": "certified"
    }
  ],
  "intent": "buy",
  "finance_type": "finance",
  "timeline": "1_3_months",
  "trade_in": {
    "year": 2014,
    "make": "Toyota",
    "model": "Corolla",
    "mileage": 96000
  },
  "message": "Interested in this Civic; can you confirm availability and best price with my trade?",
  "customer": {
    "first_name": "Anna",
    "last_name": "Lee",
    "email": "anna@example.com",
    "phone": "+14155550123",
    "preferred_contact": "email",
    "address": {
      "line1": "200 Folsom St",
      "city": "San Francisco",
      "region_code": "CA",
      "postal_code": "94105",
      "country_code": "US"
    }
  },
  "consent": {
    "granted_at": "2026-04-30T10:15:00Z",
    "allowed_channels": ["email", "phone"],
    "consent_text": "I agree to share my contact info with Demo Toyota about this 2022 Honda Civic.",
    "source_agent": "chatgpt-shopping",
    "scope": ["vehicle_inquiry"]
  },
  "source_agent": "chatgpt-shopping",
  "submitted_at": "2026-04-30T10:15:10Z"
}
```

### Response

```json
{
  "type": "lead.vehicle.response",
  "data": {
    "lead_id": "lead_2026_04_30_anna_002",
    "status": "received",
    "dealer": {
      "name": "Demo Toyota",
      "phone": "+14155550100"
    }
  },
  "message": "A sales associate will reach out to Anna within 30 minutes."
}
```

## Vehicle-by-trio variant (no VIN/stock/vehicle_id)

When the user is interested in a model the dealer does not yet have in stock, the buyer agent MAY submit by year + make + model (no individual identifier):

```json
{
  "type": "lead.vehicle.request",
  "vehicles": [
    { "year": 2024, "make": "Toyota", "model": "RAV4", "trim": "Hybrid XLE" }
  ],
  "intent": "buy",
  "source_agent": "chatgpt-shopping"
}
```

## ADF mapping

Every `lead.vehicle` request maps to an ADF/XML payload. The buyer agent does not generate the XML — the dealer agent or the dealer's CRM does. AAP guarantees the data is sufficient. See [ADF mapping](../compatibility/adf-mapping.md) for the full field-by-field translation table.
