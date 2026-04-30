---
sidebar_position: 7
title: Behavior rules
description: Normative MUST/SHOULD rules every AAP-compliant dealer agent and buyer agent must follow for inventory accuracy, lead consent, appointment booking, and FTC pricing compliance.
---

# Behavior rules

This page collects the normative MUST and SHOULD requirements that an AAP-compliant agent must follow. These rules are the bare minimum for interoperability and regulatory compliance; they are referenced from the per-skill pages and applied by the dealer-side test suite.

The keywords MUST, MUST NOT, SHOULD, SHOULD NOT, MAY, RECOMMENDED, and OPTIONAL are interpreted as in [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119.html).

## Inventory rules

### Inventory MUSTs

- **Sold vehicles MUST NOT be returned as available.** Dealer agents MUST NOT include known-sold vehicles in `inventory.search` results unless their `status` clearly communicates the sold state. Buyer agents that observe a `status` indicating a sold disposition MUST treat the vehicle as unavailable.
- **`last_verified_at` is MANDATORY for availability claims.** Every `Vehicle` returned by `inventory.search` and every `VehicleDetail` returned by `inventory.vehicle` MUST include `last_verified_at` whenever the agent is making availability claims about the listing. The field is an ISO 8601 datetime indicating when the dealer last reconciled this listing's availability, price, and status.
- **`vehicle.vin` or `vehicle.stock` SHOULD be present on detail responses.** `inventory.vehicle` responses SHOULD include `vin` or `stock`. When neither is present (e.g. a deeply pre-allocated unit), the response MUST include `vehicle_id` and SHOULD include free-text `notes` explaining the unit's identification.
- **`inventory.search` MUST support anonymous calls.** Unless the agent card and contract manifest explicitly state otherwise (`anonymous_allowed: false`), `inventory.search` MUST accept calls without authentication, without `customer` info, and without `consent`. AAP RECOMMENDS dealer agents publish their search surface anonymously by default.

### Inventory SHOULDs

- Dealer agents SHOULD update `last_verified_at` no less frequently than once per business day for each in-stock listing.
- Dealer agents SHOULD echo the request's `pagination.skip` and `pagination.limit` in the response `data.skip` and `data.limit` so buyer agents can paginate without ambiguity.
- Buyer agents SHOULD attach `privacy.anonymous: true` to every `inventory.search` call by default and only attach customer identity when actually submitting a lead.

## Lead rules

![Consent gate: anonymous inventory access vs consent-gated lead access](/img/consent-gate.png)

### Lead MUSTs

- **`consent_grant` is MANDATORY when `customer` is present.** Every `lead.general`, `lead.vehicle`, and `lead.appointment` request that includes a `customer` block MUST also include a `consent` (`ConsentGrant`) block. The schemas enforce this with `dependentRequired`. A request that violates this MUST be rejected with `CONTACT_CONSENT_REQUIRED`.
- **Channel must be permitted.** Dealer agents MUST reject the lead with `CONTACT_CONSENT_REQUIRED` if the requested follow-up channel (or the channel implied by `customer.preferred_contact`) is not in `consent.allowed_channels[]`. The dealer MUST NOT use a channel the user did not authorize.
- **Buyer agents MUST NOT include phone or email without explicit user authorization.** A buyer agent MUST capture an explicit consent action from the user — verbatim text shown, channels selected, scope confirmed — before populating `customer.email`, `customer.phone`, or `customer.address`. The verbatim text MUST be reproduced in `consent.consent_text`.
- **Scope must match the skill.** `consent.scope[]` MUST include `general_inquiry` for `lead.general`, `vehicle_inquiry` for `lead.vehicle`, and `appointment` for `lead.appointment`. A `ConsentGrant` whose `scope` does not cover the called skill MUST cause the dealer to reject with `INVALID_CONSENT`.

### Lead SHOULDs

- Dealer agents SHOULD return `status: "duplicate"` (instead of `received`) when the same `customer` submits an equivalent lead within a short window (dealer-defined; commonly 24 hours).
- Dealer agents SHOULD include a brief `message` on every successful lead response explaining the next step (e.g. "A sales rep will email Anna within 1 business day.").
- Dealer agents SHOULD persist the full `ConsentGrant` JSON as an audit record alongside the lead. ADF mapping does not specify a consent element; the `ConsentGrant` is the AAP-side record.
- Buyer agents SHOULD prefer `lead.vehicle` over `lead.general` whenever a specific vehicle is identified, because `lead.vehicle` is ADF-mappable and reaches the dealer's CRM as a structured lead.

## Appointment rules

### Appointment MUSTs

- **Booking is not implied.** A successful `lead.appointment` response does NOT guarantee a booking unless the `data.status` is `confirmed`. `requested` and `proposed` mean the customer has expressed interest but has not been booked.
- **Non-confirmable requests SHOULD return `requested` or `proposed`.** When the dealer agent cannot auto-confirm a request (manual review required, none of the user's windows fit, etc.), it SHOULD respond with `status: "requested"` or `status: "proposed"` rather than rejecting.
- **At least one window is required.** `requested_windows[]` MUST contain at least one entry (`minItems: 1`) unless the dealer's policy explicitly allows open-ended scheduling. Open-ended scheduling MUST be communicated out of band — AAP v0.1 does not standardize a flag for it on the agent card.
- **`vehicles[]` is REQUIRED for `test_drive` and `handover`.** The schema enforces this with a conditional `if/then` block. A request for `test_drive` without `vehicles[]` MUST be rejected with `MISSING_REQUIRED_FIELD`.

### Appointment SHOULDs

- The dealer agent SHOULD include the dealer's primary phone (`data.dealer.phone`, E.164) on every appointment response so the buyer agent can surface it to the user.
- The dealer agent SHOULD include `confirmed_window` on every `confirmed` response and `proposed_slots` on every `proposed` response.
- Buyer agents that receive `proposed` SHOULD present the alternative slots to the user and re-submit a fresh `lead.appointment` with the chosen slot in `requested_windows[]`.

## Pricing rules

### Pricing MUSTs

- **`price` MUST reflect the FINAL out-the-door amount.** `Vehicle.price` is the FTC-final price the buyer would actually pay, including all incentives applied, all mandatory fees added, all required dealer add-ons added. Dealers MUST NOT advertise a `price` that omits required fees, conditions on dealer financing, or required add-ons. See [Pricing and FTC compliance](./pricing-and-ftc.md) for the underlying FTC enforcement context (March 2026 warnings + CARS Rule).
- **`price_min` / `price_max` and `sort.field: "price"` apply to `price`.** `inventory.search` `filters.price_min`, `filters.price_max`, and `sort.field: "price"` are evaluated against the `price` field, not `list_price` or `msrp`. Dealers MUST keep `price` accurate for the same reason.
- **`offered_price` is conditional on `zip_code`.** `Vehicle.offered_price` MUST be omitted when no `zip_code` was supplied or when the dealer does not support desking. It MUST NOT be a substitute for `price`.

### Pricing SHOULDs

- Dealer agents SHOULD publish `list_price`, `msrp`, and `price` together for transparency. `list_price` is the base advertised number; `price` is the final out-the-door number; the difference is the sum of mandatory fees and required add-ons.
- Buyer agents SHOULD compare offers across dealers on `price` (not `list_price`). Comparing on `list_price` deceives the user about the actual cost.

## Authentication and rate limits

### Auth MUSTs

- **`auth_type` agreement.** The agent card's `security_requirements` and the contract manifest's `auth_type` MUST agree. If `security_requirements` requires `bearer`, `auth_type` MUST be `"bearer"`; if `security_requirements` is empty/absent, `auth_type` MUST be `null`.
- **Bearer tokens MUST be passed in the `Authorization` header.** `Authorization: Bearer <token>` is the only auth scheme AAP v0.1 documents. Other schemes (mTLS, OAuth client credentials with downstream JWT, signed requests) are out of scope.

### Rate-limit SHOULDs

- Dealer agents SHOULD return `RATE_LIMITED` (HTTP 429 / JSON-RPC code -32002) with `retryable: true` and a hint in `details.retry_after_ms` when the buyer agent exceeds a per-key quota.

## Ordering of rules

When two rules appear to conflict, the more restrictive one wins. For example: a `Vehicle.status` of "Sold" indicates the listing must not be returned as available even if the dealer's own internal cache says otherwise. The buyer agent's choice of `privacy.anonymous: true` does NOT override the consent rules — those apply only to lead.* skills, where customer info changes the call.
