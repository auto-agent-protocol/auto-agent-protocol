---
sidebar_position: 5
title: lead.submit
description: Unified consented lead. Carries customer info plus any combination of vehicle of interest, trade-in, and appointment in a single request.
---

# `lead.submit`

:::info A2A invocation
This skill is invoked through A2A's `SendMessage` operation — the only A2A operation AAP uses — not a dedicated REST URL. Every AAP agent card MUST expose a JSON-RPC interface (`SendMessage` method); JSON-RPC 2.0 is AAP's sole binding — see [JSON-RPC binding](../bindings/json-rpc.md). AAP only defines what goes inside `Message.parts[].data`, carried as a typed JSON `DataPart`.
:::

![A consented lead end to end: ConsentGrant, lead.submit request, dealer validation, lead_id response, ADF/XML to the dealer CRM](/img/v1.0/lead-lifecycle.png)

![Consent gate: anonymous browsing on the left, ConsentGrant in the middle, consented lead on the right](/img/v1.0/consent-gate.png)

The `lead.submit` skill is the **single, unified** lead-capture entry point in AAP v1.1.0. A buyer agent submits one request containing the consented `customer` plus any combination of `vehicle_of_interest`, `trade_in`, and `appointment`. This matches how dealerships actually take leads: a shopper test-driving a new car often wants their old car appraised in the same visit.

`lead.submit` replaced the early-draft trio of `lead.general`, `lead.vehicle`, and `lead.appointment` with a single contract, which AAP v1.1.0 carries forward unchanged.

| Property | Value |
|---|---|
| Skill id | `lead.submit` |
| Request type | `lead.submit.request` |
| Response type | `lead.submit.response` |
| Anonymous allowed | no |
| Consent required | yes |
| ADF compatible | **yes** |

For the field-by-field ADF/XML mapping, see [ADF mapping](../compatibility/adf-mapping.md).

## Request shape

```json
{
  "type": "lead.submit.request",
  "customer":  { "...Customer..." },
  "consent":   { "...ConsentGrant... (scope MUST be ['lead_submission'])" },
  "vehicle_of_interest": { "...Vehicle (condition: new|used|cpo)..." },
  "trade_in":            { "...Vehicle (condition: excellent|good|fair|poor)..." },
  "appointment":         { "...Appointment..." },
  "message":      "Free-text message from the user (max 4000 chars).",
  "source_agent": {
    "name": "chatgpt-shopping",
    "url": "https://chatgpt.com",
    "agent_card_url": "https://chatgpt.com/.well-known/agent-card.json"
  },
  "submitted_at": "ISO-8601"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `type` | const | yes | `lead.submit.request`. |
| `customer` | `Customer` | **yes** | Buyer contact info. Always required. |
| `consent` | `ConsentGrant` | **yes** | Always required. `scope` MUST be `["lead_submission"]`. As of v1.1, `consent` no longer carries `source_agent`; the buyer agent is identified once by the top-level `source_agent` object below. |
| `vehicle_of_interest` | `Vehicle` | no | Optional. When present, `condition` (if set) MUST be `new` \| `used` \| `cpo`; vehicle MUST be identifiable via `vin`, `stock`, or `year`+`make`+`model`. |
| `trade_in` | `Vehicle` | no | Optional. When present, `condition` (if set) MUST be `excellent` \| `good` \| `fair` \| `poor`; MUST carry at least `year`+`make`+`model`. `mileage` is strongly recommended. |
| `appointment` | `Appointment` | no | Optional. `appointment_type` is one of `sales` \| `service` \| `test_drive` \| `trade_in`; `appointment_at` is the requested start time (ISO 8601). The vehicle is implicit: `vehicle_of_interest` for a test drive, `trade_in` for a trade-in appraisal. |
| `message` | string | no | Free-text user note (max 4000 chars). |
| `source_agent` | object | yes | The single buyer-agent identity for this lead. `name` is REQUIRED (e.g. `chatgpt-shopping`, `gemini-assistant`); `url` and `agent_card_url` are OPTIONAL. This is the one and only `source_agent` in v1.1 — it was removed from `consent`. |
| `source_agent.name` | string | **yes** | Buyer agent identifier. |
| `source_agent.url` | string (uri) | no | Buyer agent's site or product URL. |
| `source_agent.agent_card_url` | string (uri) | no | URL of the buyer agent's A2A agent card. |
| `submitted_at` | date-time | no | Buyer-agent timestamp at submission. |

The unified `Vehicle` interface is the same shape used by `inventory.search` results — see the [Vehicle schema source](https://autoagentprotocol.org/v1.1/schemas/vehicle.schema.json). Both `vehicle_of_interest` and `trade_in` use this shape; only the valid `condition` enum subset differs.

:::note Self-discovery
A buyer agent does not have to hard-code or guess this shape. The dealer's [agent card](../discovery.md) publishes each skill's request/response JSON Schema URLs in the **AAP extension params** — `capabilities.extensions[].params.skills["lead.submit"].request_schema` points at the canonical schema (e.g. `https://autoagentprotocol.org/v1.1/schemas/lead-submit-request.schema.json`). The URLs live in the extension params, not as fields on the A2A `skill` object, so strict A2A AgentCard parsers still accept the card. Buyer agents SHOULD fetch that schema and validate against it, rather than relying on the prose here. The top-level `source_agent` object — and the removal of `consent.source_agent` in v1.1 — are both reflected in that published schema.
:::

## Response shape

```json
{
  "type": "lead.submit.response",
  "data": {
    "lead_id": "string",
    "status":  "received | duplicate | rejected",
    "appointment": {
      "appointment_id": "string",
      "status":         "requested | proposed | confirmed | rejected",
      "confirmed_at":   "ISO-8601",
      "proposed_times": ["ISO-8601"]
    },
    "dealer": { "name": "string", "phone": "+1XXXXXXXXXX" }
  },
  "message": "Optional contextual note."
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `data.lead_id` | string | yes | Dealer-assigned lead identifier. |
| `data.status` | enum | yes | `received`, `duplicate`, or `rejected`. `duplicate` indicates the dealer recognized the same buyer/vehicle from a recent submission. |
| `data.appointment` | object | conditional | Present iff request had `appointment` AND the dealer is acknowledging it. |
| `data.appointment.status` | enum | (when present) | `requested` (manual review), `proposed` (alternatives in `proposed_times`), `confirmed` (booked at `confirmed_at`), or `rejected`. |
| `data.dealer` | object | no | Convenience contact summary the buyer agent can show the user. |
| `message` | string | no | Optional dealer note. |

## Full example: vehicle + trade-in + test-drive in one lead

A user wants to test-drive a 2024 Honda CR-V, trade in their 2020 Passat, and book Sunday afternoon. One request.

### Request

```json
{
  "type": "lead.submit.request",
  "customer": {
    "first_name": "Piotr",
    "last_name": "Nowak",
    "email": "piotr.nowak@example.com",
    "phone": "+14155555678",
    "preferred_contact": "phone",
    "address": {
      "address_line_1": "320 Brannan Street",
      "address_line_2": "Apt 412",
      "city": "San Francisco",
      "state": "CA",
      "zip": "94107"
    }
  },
  "consent": {
    "granted_at": "2026-04-30T11:05:00Z",
    "allowed_channels": ["email", "phone"],
    "consent_text": "I authorize Demo Toyota to contact me by phone or email about VIN 1HGCY2F57RA000001, my requested test drive on May 3, and a possible trade-in of my 2020 Volkswagen Passat. I understand I can withdraw consent at any time.",
    "scope": ["lead_submission"]
  },
  "vehicle_of_interest": {
    "vin": "1HGCY2F57RA000001",
    "year": 2024, "make": "Honda", "model": "CR-V", "trim": "EX-L",
    "condition": "used",
    "stock": "DT-2611",
    "body": "suv",
    "transmission": "automatic",
    "mileage": 14820,
    "price": 32995,
    "zip": "94107"
  },
  "trade_in": {
    "year": 2020, "make": "Volkswagen", "model": "Passat", "trim": "SE",
    "condition": "good",
    "mileage": 62000,
    "body": "sedan",
    "transmission": "automatic"
  },
  "appointment": {
    "appointment_type": "test_drive",
    "appointment_at": "2026-05-03T18:00:00Z",
    "duration_minutes": 60,
    "notes": "I'd like to test the CR-V and have my Passat appraised in the same visit."
  },
  "message": "I'm interested in the 2024 Honda CR-V EX-L (VIN 1HGCY2F57RA000001). I plan to pay cash and would like to trade in my 2020 Volkswagen Passat with 62,000 miles.",
  "source_agent": {
    "name": "gemini-assistant",
    "url": "https://gemini.google.com",
    "agent_card_url": "https://gemini.google.com/.well-known/agent-card.json"
  },
  "submitted_at": "2026-04-30T11:05:08Z"
}
```

### Response (lead received, appointment confirmed)

```json
{
  "type": "lead.submit.response",
  "data": {
    "lead_id": "lead_2026_04_30_00842",
    "status": "received",
    "appointment": {
      "appointment_id": "appt_2026_04_30_00128",
      "status": "confirmed",
      "confirmed_at": "2026-05-03T18:00:00Z"
    },
    "dealer": {
      "name": "Demo Toyota",
      "phone": "+14155550100"
    }
  },
  "message": "Thanks, Piotr. Test drive confirmed for Sunday May 3 at 11:00 AM Pacific. We've queued your 2020 Passat for an in-person appraisal at the same visit."
}
```

## Variant: customer-only general inquiry (no vehicle, no appointment)

```json
{
  "type": "lead.submit.request",
  "customer": {
    "first_name": "Anna",
    "last_name": "Kowalska",
    "email": "anna.kowalska@example.com",
    "phone": "+14155551234",
    "preferred_contact": "email"
  },
  "consent": {
    "granted_at": "2026-04-30T10:42:00Z",
    "allowed_channels": ["email"],
    "consent_text": "I agree to share my name, email, and phone number with Demo Toyota so a sales representative can answer my financing question by email.",
    "scope": ["lead_submission"]
  },
  "message": "What APR is Demo Toyota offering this month for buyers with 740+ credit?",
  "source_agent": {
    "name": "chatgpt-shopping-agent",
    "url": "https://chatgpt.com",
    "agent_card_url": "https://chatgpt.com/.well-known/agent-card.json"
  },
  "submitted_at": "2026-04-30T10:42:05Z"
}
```

## Variant: appointment with proposed alternatives

When the dealer cannot honor the requested time:

```json
{
  "type": "lead.submit.response",
  "data": {
    "lead_id": "lead_2026_04_30_00843",
    "status": "received",
    "appointment": {
      "appointment_id": "appt_2026_04_30_00129",
      "status": "proposed",
      "proposed_times": [
        "2026-05-03T20:00:00Z",
        "2026-05-04T16:00:00Z"
      ]
    },
    "dealer": { "name": "Demo Toyota", "phone": "+14155550100" }
  },
  "message": "We're booked solid Sunday afternoon. The times above are open Sunday evening and Monday afternoon (Pacific). Reply with the time you prefer or call to confirm."
}
```

The buyer agent SHOULD present the alternatives to the user and re-submit a fresh `lead.submit.request` with one of the proposed times in `appointment.appointment_at`.

## Why one skill instead of three?

Real shopping flows naturally bundle the inquiry, the trade-in, and the appointment. Forcing buyer agents to make 3 separate calls (with 3 separate consent records) creates:

- **Brittle correlation** — dealer CRMs have to re-stitch what was always one customer intent.
- **Consent friction** — users sign off 3 disclosures for one decision.
- **Race conditions** — the appointment may be booked before the lead arrives, or vice-versa.

A single `lead.submit` lets the dealer transactionally accept the lead, queue the trade-in for appraisal, and confirm or propose the appointment in one round trip. v1.1 keeps the contract tight by NOT supporting multi-vehicle leads (one `vehicle_of_interest` per submission); send N requests for N vehicles.

## Consent and channel rules

- `consent.allowed_channels[]` lists the channels (`email`, `phone`, `sms`) the user authorized for THIS submission.
- `consent.scope[]` MUST be `["lead_submission"]`.
- The dealer MUST reject the lead with `CONTACT_CONSENT_REQUIRED` if it intends to follow up via a channel not in `allowed_channels`.
- The buyer agent MUST NOT include phone or email without explicit user authorization. See [Behavior rules](../behavior-rules.md).

## Errors

- `CONTACT_CONSENT_REQUIRED` — `consent` missing, `scope` not `['lead_submission']`, or follow-up channel not in `allowed_channels`.
- `VEHICLE_NOT_FOUND` / `VEHICLE_UNAVAILABLE` — `vehicle_of_interest` reference cannot be located, or no longer available, when a `test_drive` appointment is requested.
- `APPOINTMENT_TIME_UNAVAILABLE` — the requested `appointment_at` cannot be honored AND the dealer has no proposals to make. The lead may still be `received` even when the appointment portion fails.
- `INVALID_CONDITION` — `vehicle_of_interest.condition` is in the trade-in vocabulary, or `trade_in.condition` is in the sale-condition vocabulary.

See [Errors](../errors.md) for the full vocabulary.

## What `lead.submit` does NOT guarantee

A successful `lead.submit.response` does not guarantee booking unless `data.appointment.status` is `confirmed`. `requested` and `proposed` mean the customer has expressed interest but has not been booked. Buyer agents MUST communicate this to the user clearly. See [Behavior rules](../behavior-rules.md).
