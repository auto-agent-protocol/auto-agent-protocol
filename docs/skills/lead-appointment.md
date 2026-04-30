---
sidebar_position: 7
title: lead.appointment
description: Test drive, showroom visit, handover, phone/video call, or trade-in appraisal appointment requests with requested time windows and confirmation status.
---

# `lead.appointment`

:::info A2A invocation
This skill is invoked through A2A's `SendMessage` operation (`SendMessage` JSON-RPC method or `POST /message:send` over HTTP+JSON), not a dedicated REST URL. The same payload travels on either A2A binding — see [JSON-RPC binding](../bindings/json-rpc.md) or [REST binding](../bindings/rest.md). AAP only defines what goes inside `Message.parts[].data`.
:::

The `lead.appointment` skill submits an appointment request. Six appointment types are supported. The dealer agent responds with a status that indicates whether the appointment is `confirmed`, awaiting manual review (`requested`), countered with alternative slots (`proposed`), or `rejected`.

| Property | Value |
|---|---|
| Skill id | `lead.appointment` |
| Request type | `lead.appointment.request` |
| Response type | `lead.appointment.response` |
| Anonymous allowed | no |
| Consent required | yes |
| ADF compatible | yes |

## Request shape

```json
{
  "type": "lead.appointment.request",
  "appointment_type": "test_drive | showroom_visit | handover | phone_call | video_call | trade_in_appraisal",
  "vehicles": [
    { "vin": "string", "stock": "string", "vehicle_id": "string" }
  ],
  "requested_windows": [
    { "start": "ISO-8601", "end": "ISO-8601" }
  ],
  "timezone":         "IANA tz (e.g. America/Los_Angeles)",
  "duration_minutes": 60,
  "message":          "Free-text note (max 4000 chars).",
  "customer":         { "...Customer..." },
  "consent":          { "...ConsentGrant... (required when customer is present)" },
  "source_agent":     "string",
  "submitted_at":     "ISO-8601"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `type` | const | yes | `lead.appointment.request`. |
| `appointment_type` | enum | yes | One of the six types in the table below. |
| `vehicles[]` | array | conditional | REQUIRED when `appointment_type` is `test_drive` or `handover`. Each entry needs at least one of `vin`, `stock`, `vehicle_id`. |
| `requested_windows[]` | array | usually yes | One or more datetime windows. The schema requires at least one (`minItems: 1`) unless the dealer's policy explicitly allows open-ended scheduling. |
| `timezone` | string | no | IANA timezone interpreting the windows. |
| `duration_minutes` | integer (>=15) | no | Expected duration. |
| `message` | string | no | Free-text note from the user. |
| `customer` | `Customer` | no | When present, `consent` MUST also be present. |
| `consent` | `ConsentGrant` | conditional | Required when `customer` is present. `scope` MUST include `appointment`. |
| `source_agent` | string | yes | Buyer agent identifier. |
| `submitted_at` | date-time | no | Buyer-agent timestamp. |

### Appointment types

| `appointment_type` | Vehicles required? | Typical use |
|---|---|---|
| `test_drive` | yes | Schedule a vehicle test drive. |
| `showroom_visit` | no | Walk-in visit, often unrelated to a specific VIN. |
| `handover` | yes | Customer picks up a previously purchased vehicle. |
| `phone_call` | no | Sales rep callback. |
| `video_call` | no | Video walkthrough or remote consultation. |
| `trade_in_appraisal` | no | Appraisal of the customer's current vehicle. |

`vehicles` is REQUIRED for `test_drive` and `handover`; OPTIONAL otherwise.

### Requested windows

`requested_windows[]` is an array of `{ start, end? }` objects. `start` is REQUIRED on each entry; `end` is optional but RECOMMENDED. The dealer SHOULD honor at least one of the windows or respond with `proposed` alternatives. AAP requires at least one window unless the dealer's policy allows open-ended scheduling and that policy is communicated out of band.

## Response shape

```json
{
  "type": "lead.appointment.response",
  "data": {
    "appointment_id": "string",
    "status": "requested | proposed | confirmed | rejected",
    "confirmed_window": { "start": "ISO-8601", "end": "ISO-8601" },
    "proposed_slots":   [{ "start": "ISO-8601", "end": "ISO-8601" }],
    "dealer":           { "name": "string", "phone": "+1XXXXXXXXXX" }
  },
  "message": "Optional contextual note."
}
```

| `status` | Meaning |
|---|---|
| `requested` | Submitted; manual review pending. The user is not yet booked. |
| `proposed` | Dealer cannot honor the user's windows but offers `proposed_slots`. The user has not committed. |
| `confirmed` | Auto-booked. `confirmed_window` is populated. |
| `rejected` | Cannot fulfill (e.g. consent issue or no matching availability). Details in `message` or as an Error response. |

`confirmed_window` is present iff `status` is `confirmed`. `proposed_slots` is present iff `status` is `proposed`.

## Full example: confirmed test drive

### Request

```json
{
  "type": "lead.appointment.request",
  "appointment_type": "test_drive",
  "vehicles": [
    { "vin": "1HGCV1F30KA000001" }
  ],
  "requested_windows": [
    { "start": "2026-05-02T17:00:00Z", "end": "2026-05-02T18:00:00Z" },
    { "start": "2026-05-03T16:00:00Z", "end": "2026-05-03T17:00:00Z" }
  ],
  "timezone": "America/Los_Angeles",
  "duration_minutes": 60,
  "message": "Test drive in the afternoon, prefer Saturday.",
  "customer": {
    "first_name": "Anna",
    "last_name": "Lee",
    "email": "anna@example.com",
    "phone": "+14155550123",
    "preferred_contact": "phone"
  },
  "consent": {
    "granted_at": "2026-04-30T10:16:00Z",
    "allowed_channels": ["phone", "email"],
    "consent_text": "I agree to share my contact info with Demo Toyota to schedule a test drive.",
    "source_agent": "chatgpt-shopping",
    "scope": ["appointment"]
  },
  "source_agent": "chatgpt-shopping",
  "submitted_at": "2026-04-30T10:16:05Z"
}
```

### Response (auto-confirmed)

```json
{
  "type": "lead.appointment.response",
  "data": {
    "appointment_id": "appt_2026_04_30_anna_001",
    "status": "confirmed",
    "confirmed_window": {
      "start": "2026-05-02T17:00:00Z",
      "end":   "2026-05-02T18:00:00Z"
    },
    "dealer": {
      "name": "Demo Toyota",
      "phone": "+14155550100"
    }
  },
  "message": "Confirmed for Saturday at 10am Pacific. Please bring a valid driver's license."
}
```

## Example: proposed alternatives

When the dealer cannot honor any user-supplied window, it returns `status: "proposed"` with alternative slots:

```json
{
  "type": "lead.appointment.response",
  "data": {
    "appointment_id": "appt_2026_04_30_anna_002",
    "status": "proposed",
    "proposed_slots": [
      { "start": "2026-05-04T16:00:00Z", "end": "2026-05-04T17:00:00Z" },
      { "start": "2026-05-04T18:00:00Z", "end": "2026-05-04T19:00:00Z" }
    ],
    "dealer": {
      "name": "Demo Toyota",
      "phone": "+14155550100"
    }
  },
  "message": "We are fully booked Saturday and Sunday. Would Monday work?"
}
```

The buyer agent SHOULD present the alternatives to the user and re-submit a fresh request with one of the proposed slots in `requested_windows[]`.

## Example: requested (manual review)

If the dealer's process requires a human to confirm:

```json
{
  "type": "lead.appointment.response",
  "data": {
    "appointment_id": "appt_2026_04_30_anna_003",
    "status": "requested",
    "dealer": {
      "name": "Demo Toyota",
      "phone": "+14155550100"
    }
  },
  "message": "We will confirm by phone within the hour."
}
```

## Errors

- `APPOINTMENT_TIME_UNAVAILABLE` — none of the requested windows can be honored AND the dealer has no proposals to make.
- `CONTACT_CONSENT_REQUIRED` — `consent` missing or its `scope` does not include `appointment`, or the requested follow-up channel is not in `allowed_channels`.
- `VEHICLE_NOT_FOUND` / `VEHICLE_UNAVAILABLE` — the vehicle reference for `test_drive` or `handover` cannot be located or is no longer available.

See [Errors](../errors.md) for the full vocabulary.

## What `lead.appointment` does NOT guarantee

A successful `lead.appointment` response does not guarantee booking unless `status` is `confirmed`. `requested` and `proposed` mean the customer has expressed interest but has not been booked. Buyer agents MUST communicate this to the user clearly. See [Behavior rules](../behavior-rules.md).
