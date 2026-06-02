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
- **When implemented, `inventory.search` MUST support anonymous calls.** A dealer agent is not required to expose `inventory.search`, but if it does and the agent card / contract manifest does not explicitly state otherwise (`anonymous_allowed: false`), `inventory.search` MUST accept calls without authentication, without `customer` info, and without `consent`. AAP RECOMMENDS dealer agents publish their search surface anonymously by default when they expose one.

### Inventory SHOULDs

- Dealer agents SHOULD update `last_verified_at` no less frequently than once per business day for each in-stock listing.
- Dealer agents SHOULD echo the request's `pagination.skip` and `pagination.limit` in the response `data.skip` and `data.limit` so buyer agents can paginate without ambiguity.
- Buyer agents SHOULD attach `privacy.anonymous: true` to every `inventory.search` call by default and only attach customer identity when actually submitting a lead.

## Lead rules

![Consent gate: anonymous inventory access vs consent-gated lead access](/img/consent-gate.png)

### Lead MUSTs

- **`customer` is REQUIRED on every `lead.submit` request.** The unified lead is never anonymous. Every `lead.submit.request` MUST include a `customer` block; the schema enforces this in `required`.
- **`consent` is MANDATORY whenever `customer` is present (which is always for `lead.submit`).** Every `lead.submit.request` MUST include a `consent` (`ConsentGrant`) block. A request that violates this MUST be rejected with `CONTACT_CONSENT_REQUIRED`.
- **Channel must be permitted.** Dealer agents MUST reject the lead with `CONTACT_CONSENT_REQUIRED` if the requested follow-up channel (or the channel implied by `customer.preferred_contact`) is not in `consent.allowed_channels[]`. The dealer MUST NOT use a channel the user did not authorize.
- **Buyer agents MUST NOT include phone or email without explicit user authorization.** A buyer agent MUST capture an explicit consent action from the user — verbatim text shown, channels selected, scope confirmed — before populating `customer.email`, `customer.phone`, or `customer.address`. The verbatim text MUST be reproduced in `consent.consent_text`.
- **Scope is fixed.** `consent.scope[]` MUST be `["lead_submission"]`. A `ConsentGrant` whose `scope` is anything else MUST cause the dealer to reject with `INVALID_CONSENT`.
- **Condition vocabularies MUST NOT be mixed.** `vehicle_of_interest.condition` (when set) MUST be one of `new` | `used` | `cpo`. `trade_in.condition` (when set) MUST be one of `excellent` | `good` | `fair` | `poor`. Mixing these MUST be rejected with `SCHEMA_VALIDATION_FAILED` (the conditional schema enforces it) or `INVALID_CONDITION`.

### Lead SHOULDs

- Dealer agents SHOULD return `status: "duplicate"` (instead of `received`) when the same `customer` submits an equivalent lead within a short window (dealer-defined; commonly 24 hours).
- Dealer agents SHOULD include a brief `message` on every successful lead response explaining the next step (e.g. "A sales rep will email Anna within 1 business day.").
- Dealer agents SHOULD persist the full `ConsentGrant` JSON as an audit record alongside the lead. ADF mapping does not specify a consent element; the `ConsentGrant` is the AAP-side record.
- Buyer agents SHOULD bundle `vehicle_of_interest`, `trade_in`, and `appointment` into a SINGLE `lead.submit.request` when they belong to the same shopping intent, rather than making multiple consecutive submissions. This keeps the dealer CRM transactional and avoids re-stitching one customer intent.

## Appointment rules

### Appointment MUSTs

- **Booking is not implied.** A successful `lead.submit` response does NOT guarantee an appointment booking unless the `data.appointment.status` is `confirmed`. `requested` and `proposed` mean the customer has expressed interest but has not been booked.
- **Non-confirmable requests SHOULD return `requested` or `proposed`.** When the dealer agent cannot auto-confirm a request (manual review required, none of the user's windows fit, etc.), it SHOULD respond with `data.appointment.status: "requested"` or `data.appointment.status: "proposed"` rather than rejecting the appointment.
- **At least one window is required when `requested_windows` is provided.** Each entry in `requested_windows[]` MUST include `start`. The whole `requested_windows[]` array MAY be omitted if the dealer's policy explicitly allows open-ended scheduling; that policy MUST be communicated out of band.
- **`vehicle_of_interest` SHOULD be present for `test_drive` and `handover`.** When `appointment.appointment_type` is `test_drive` or `handover`, the lead SHOULD also include `vehicle_of_interest` so the dealer knows which unit. A submission without `vehicle_of_interest` MAY be rejected with `MISSING_REQUIRED_FIELD` per dealer policy.

### Appointment SHOULDs

- The dealer agent SHOULD include the dealer's primary phone (`data.dealer.phone`, E.164) on every lead-with-appointment response so the buyer agent can surface it to the user.
- The dealer agent SHOULD include `data.appointment.confirmed_window` on every `confirmed` appointment status and `data.appointment.proposed_slots` on every `proposed` status.
- Buyer agents that receive `data.appointment.status: "proposed"` SHOULD present the alternative slots to the user and re-submit a fresh `lead.submit` with the chosen slot in `appointment.requested_windows[]`.

## Defaults and locale rules

When optional context fields are omitted, AAP defines deterministic fallbacks so buyer agents and dealer agents agree without out-of-band coordination.

- **Currency default.** When a `Money` value is sent without an explicit context, the assumed currency is `USD`. v0.1 is US-only by scope; non-USD currencies SHOULD still be sent with `currency` set explicitly.
- **Address default country.** v0.1 `Address` has no `country` field; the assumed country is `US`. International support is deferred to a later version.
- **Appointment timezone default.** When `Appointment.timezone` is omitted, the dealer SHOULD interpret `requested_windows[]` in the dealer's own local timezone (the IANA zone published in `dealer.information.timezone`). Buyer agents SHOULD set `Appointment.timezone` explicitly whenever the buyer's locale differs from the dealer's.
- **Idempotency.** Buyer agents that retry `lead.submit` after a network failure SHOULD pass an `idempotency_key` (UUID recommended). Dealer agents SHOULD dedupe on this key for at least 24 hours and return the original `lead_id` and status on retries.
- **Consent expiration.** When `ConsentGrant.expires_at` is omitted, the dealer MAY apply its own default expiration window per local regulation; an explicit `expires_at` always wins. The dealer MUST reject the lead with `INVALID_CONSENT` if the grant has already expired.

## Pricing rules

### Pricing MUSTs

- **`price` MUST reflect the FINAL out-the-door amount.** `Vehicle.price` is the FTC-final price the buyer would actually pay, including all incentives applied, all mandatory fees added, all required dealer add-ons added. Dealers MUST NOT advertise a `price` that omits required fees, conditions on dealer financing, or required add-ons. See [Pricing and FTC compliance](./pricing-and-ftc.md) for the underlying FTC enforcement context (March 2026 warnings + CARS Rule).
- **`price_min` / `price_max` and `sort.field: "price"` apply to `price`.** `inventory.search` `filters.price_min`, `filters.price_max`, and `sort.field: "price"` are evaluated against the `price` field, not `list_price` or `msrp`. Dealers MUST keep `price` accurate for the same reason.
- **`offered_price` is conditional on `zip`.** `Vehicle.offered_price` MUST be omitted when no `zip` was supplied or when the dealer does not support desking. It MUST NOT be a substitute for `price`.

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
