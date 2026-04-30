---
sidebar_position: 6
title: Pricing and FTC compliance
description: The four pricing fields (msrp, list_price, offered_price, price), what each one means, and why price MUST be the FTC-final out-the-door amount.
---

# Pricing and FTC compliance

![Vehicle pricing ladder from msrp to the FTC-final price](/img/pricing-ladder.png)

AAP v0.1 standardizes four explicit pricing fields on every vehicle. The single most important rule:

> **`price` is the FTC-final out-the-door amount.** It is the total amount the buyer would pay for this specific vehicle, including all required fees, mandatory add-ons, and any conditions on dealer financing. Anything less is a violation of FTC enforcement policy.

This rule is non-negotiable. Dealers MUST keep `price` accurate; buyer agents and aggregators rely on it to compare offers honestly across dealers.

## Why the FTC rule exists

In March 2026 the FTC sent warning letters to 97 auto dealership groups about deceptive pricing practices. The letters specifically called out the practice of advertising a price that excludes mandatory fees, conditions on dealer-arranged financing, or required dealer add-ons.

- **FTC press release (March 2026):** [FTC warns 97 auto dealership groups about deceptive pricing](https://www.ftc.gov/news-events/news/press-releases/2026/03/ftc-warns-97-auto-dealership-groups-about-deceptive-pricing)
- **FTC CARS Rule:** the underlying federal rule that requires "offering price" to reflect the full price minus only required government charges and optional add-ons.

AAP's `price` field is the protocol-level expression of that rule. Buyer agents — including LLM-driven shopping assistants — sort, filter, and compare dealers on `price`. If a dealer publishes a `price` that is not the final amount, the buyer agent will surface that vehicle as artificially cheap and the dealer will be advertising a deceptive price across every agent that touches the API.

## The four pricing fields

Every `Vehicle` object in AAP MAY carry four `Money` values. Each has a precise meaning.

| Field | Required? | Meaning | Includes regional taxes? | Includes mandatory fees / add-ons? | Notes |
|---|---|---|---|---|---|
| `msrp` | optional | Manufacturer's Suggested Retail Price (sticker price). | no | no | Set by the OEM, not the dealer. |
| `list_price` | optional | Dealer's advertised base list price BEFORE incentives, taxes, and fees. | no | no | The number the dealer would put on a window sticker as their asking price, separate from required fees. |
| `offered_price` | optional, conditional | Regional price equal to `list_price` plus applicable taxes for the buyer's `zip_code`. | yes (for the supplied `zip_code`) | no | Present only if `zip_code` is supplied AND the dealer enables desking. |
| `price` | RECOMMENDED | **FTC-final out-the-door price** after all incentives, mandatory fees, and required add-ons. | yes | yes | The single number a buyer agent uses for comparison and the only one used by `inventory.search` `price_min` / `price_max` filters and `sort.field: "price"`. |

All four are `Money` objects:

```json
{ "amount": 26780, "currency": "USD" }
```

### How the fields relate

```mermaid
flowchart LR
  msrp["msrp<br/>(sticker)"] --> list["list_price<br/>(base advertised)"]
  list --> offered["offered_price<br/>(list + regional tax,<br/>requires zip_code)"]
  offered --> price["price<br/>(FTC-final<br/>out-the-door)"]
  list --> price
```

`msrp` is informational only. `list_price` is the base advertised number. `offered_price` is the regional intermediate (what the dealer would offer in a region with given tax rate). `price` is the final number — the only one a buyer agent should use to make comparisons or run `price_min` / `price_max` filters.

## Concrete worked example

A 2022 Honda Civic listed by a California dealer:

```json
{
  "vehicle_id": "vehicle_demo_civic",
  "vin": "1HGCV1F30KA000001",
  "year": 2022,
  "make": "Honda",
  "model": "Civic",
  "condition": "certified",
  "msrp":          { "amount": 26500, "currency": "USD" },
  "list_price":    { "amount": 24990, "currency": "USD" },
  "offered_price": { "amount": 26615, "currency": "USD" },
  "price":         { "amount": 26780, "currency": "USD" },
  "zip_code": "94105",
  "status": "In Stock",
  "last_verified_at": "2026-04-30T10:15:00Z"
}
```

What the buyer is actually being asked to pay: **$26,780**. That is the FTC-final out-the-door figure. The other three fields are descriptive context. A buyer agent shopping for a Civic at "under $27,000" should match this listing on `price`, not `list_price`.

If the same dealer lists the same VIN with `price: { amount: 24990 }` while charging the customer $26,780 at the dealership, that is the exact pattern the FTC's 2026 warnings target.

## How `zip_code` and desking work

`offered_price` is regional. It is `list_price` plus applicable taxes for a specific buyer location. AAP exposes the buyer location in two ways:

- **In `inventory.vehicle`**, the request carries an OPTIONAL `zip_code`. When supplied AND the dealer supports desking, the response MAY include `offered_price`. When `zip_code` is absent, the dealer MUST omit `offered_price`.
- **In `inventory.search`**, the response vehicles do NOT carry `offered_price` for arbitrary buyer locations. Buyers should follow up with `inventory.vehicle` + `zip_code` to receive the regional price.

`price` (the FTC-final out-the-door amount) does NOT depend on `zip_code` for its presence — the dealer SHOULD always compute and publish it for advertised inventory.

## What dealers MUST and MUST NOT do

These are normative; they are also restated in the [Behavior rules](./behavior-rules.md) page.

- Dealers MUST publish `price` as the final out-the-door amount including all mandatory fees, conditions on financing, and required add-ons.
- Dealers MUST NOT advertise a `price` that omits required fees, conditions on dealer financing, or required add-ons.
- Dealers SHOULD publish `list_price` and `msrp` for transparency, but the buyer agent will compare on `price`.
- Dealers MAY publish `offered_price` only when `zip_code` is supplied and the dealer supports desking.
- Buyer agents MUST use `price` (not `list_price`) for filters and sort by default. AAP defines `inventory.search`'s `price_min` / `price_max` filters and `sort.field: "price"` against the `price` field for exactly this reason.

## How `price` is used elsewhere in AAP

- `inventory.search` — `filters.price_min` and `filters.price_max` apply to `price`. `sort.field` accepts `"price"` (default sort comparator) and also `"list_price"`, `"offered_price"`, `"msrp"` for those who want to sort on a specific field.
- `inventory.vehicle` — the response always carries `price`; `offered_price` is included only with a supplied `zip_code`.
- `inventory.facets` — `price_range` aggregates min/max `price` values across the matching set.

For full request/response shapes see the [skills reference](./skills/inventory-search.md).
