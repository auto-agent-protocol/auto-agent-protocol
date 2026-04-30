---
sidebar_position: 5
title: lead.general
description: Open-ended dealership inquiry not tied to a specific vehicle. Customer info is optional but recommended; when present, ConsentGrant is required.
---

# `lead.general`

:::info A2A invocation
This skill is invoked through A2A's `SendMessage` operation (`SendMessage` JSON-RPC method or `POST /message:send` over HTTP+JSON), not a dedicated REST URL. The same payload travels on either A2A binding — see [JSON-RPC binding](../bindings/json-rpc.md) or [REST binding](../bindings/rest.md). AAP only defines what goes inside `Message.parts[].data`.
:::

The `lead.general` skill submits an open-ended dealership inquiry — financing question, trade-in interest, callback request, generic question — that is not tied to a specific vehicle. Customer contact info is OPTIONAL but RECOMMENDED. When `customer` is present, a `ConsentGrant` MUST also be present and its `scope` MUST include `general_inquiry`.

| Property | Value |
|---|---|
| Skill id | `lead.general` |
| Request type | `lead.general.request` |
| Response type | `lead.general.response` |
| Anonymous allowed | no |
| Consent required | yes |
| ADF compatible | yes |

## Request shape

```json
{
  "type": "lead.general.request",
  "lead_intent": "financing_question | trade_in_interest | service_question | general_question | callback_request | other",
  "message": "Free-text message from the user (1-4000 chars).",
  "intent": {
    "body_type":  "string",
    "fuel":       "string",
    "budget_max": { "amount": 0, "currency": "USD" },
    "timeline":   "asap | 1_3_months | 3_6_months | flexible"
  },
  "customer": { "...Customer..." },
  "consent":  { "...ConsentGrant... (required when customer is present)" },
  "source_agent": "string (e.g. chatgpt-shopping-agent)",
  "submitted_at": "ISO-8601"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `type` | const | yes | `lead.general.request`. |
| `lead_intent` | enum | no | High-level reason: `financing_question`, `trade_in_interest`, `service_question`, `general_question`, `callback_request`, `other`. |
| `message` | string | yes | Free-text message from the user (1-4000 chars). |
| `intent` | object | no | Optional structured intent (`body_type`, `fuel`, `budget_max`, `timeline`). |
| `customer` | `Customer` | no | Optional customer contact info. When present, `consent` MUST also be present. |
| `consent` | `ConsentGrant` | conditional | Required when `customer` is present. `scope` MUST include `general_inquiry`. |
| `source_agent` | string | yes | Identifier of the buyer agent submitting the lead. |
| `submitted_at` | date-time | no | Buyer-agent timestamp at submission. |

`Customer` requires `first_name` and `last_name` and at least one of `email` or `phone` (E.164 format).

## Response shape

`lead.general` and `lead.vehicle` share the [`LeadResponse`](https://autoagentprotocol.org/v0.1/schemas/lead-response.schema.json) envelope. `lead.appointment` uses a different response (see [`lead.appointment`](./lead-appointment.md)).

```json
{
  "type": "lead.general.response",
  "data": {
    "lead_id": "string",
    "status":  "received | duplicate | rejected",
    "dealer":  { "name": "string", "phone": "+1XXXXXXXXXX" }
  },
  "message": "Optional contextual note (e.g. 'A sales rep will email Anna within 1 business day.')."
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `data.lead_id` | string | yes | Stable identifier the dealer assigned to this lead. |
| `data.status` | enum | yes | `received`, `duplicate`, or `rejected`. |
| `data.dealer.name` | string | no | Convenience contact summary the buyer agent can show the user. |
| `data.dealer.phone` | E.164 | no | Optional phone for follow-up. |
| `message` | string | no | Optional contextual note. |

A `duplicate` status SHOULD be returned when an equivalent lead already exists for this customer. A `rejected` status with a `CONTACT_CONSENT_REQUIRED` error is returned when the requested follow-up channel is not in `consent.allowed_channels`.

## Full example

A user with a financing question authorizes the agent to share name + email only (not phone) for a one-time email reply.

### Request

```json
{
  "type": "lead.general.request",
  "lead_intent": "financing_question",
  "message": "Do you offer 0% APR on certified used Civics? I have excellent credit.",
  "intent": {
    "budget_max": { "amount": 28000, "currency": "USD" },
    "timeline": "1_3_months"
  },
  "customer": {
    "first_name": "Anna",
    "last_name": "Lee",
    "email": "anna@example.com",
    "preferred_contact": "email"
  },
  "consent": {
    "granted_at": "2026-04-30T10:14:00Z",
    "allowed_channels": ["email"],
    "consent_text": "I agree to share my name and email with Demo Toyota to receive a financing answer.",
    "source_agent": "chatgpt-shopping",
    "scope": ["general_inquiry"]
  },
  "source_agent": "chatgpt-shopping",
  "submitted_at": "2026-04-30T10:14:30Z"
}
```

### Response

```json
{
  "type": "lead.general.response",
  "data": {
    "lead_id": "lead_2026_04_30_anna_001",
    "status": "received",
    "dealer": {
      "name": "Demo Toyota",
      "phone": "+14155550100"
    }
  },
  "message": "A finance manager will email Anna within one business day."
}
```

## Anonymous variant (no `customer`)

`customer` is optional. A user can send a generic question without sharing contact info. In that case `consent` MUST be omitted as well.

```json
{
  "type": "lead.general.request",
  "lead_intent": "general_question",
  "message": "Do you take trade-ins on weekends?",
  "source_agent": "chatgpt-shopping"
}
```

The dealer SHOULD reply with `status: "received"` and a `message` rather than asking for contact info, unless the question genuinely requires a callback.

## Consent and channel rules

- `consent.allowed_channels[]` lists the channels (`email`, `phone`, `sms`) the user authorized for this submission.
- `consent.scope[]` MUST include `general_inquiry`.
- The dealer MUST reject the lead with `CONTACT_CONSENT_REQUIRED` if it intends to follow up via a channel not in `allowed_channels`.
- The buyer agent MUST NOT include phone or email without explicit user authorization. See [Behavior rules](../behavior-rules.md).
