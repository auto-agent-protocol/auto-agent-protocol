---
sidebar_position: 6
title: Pricing and fee disclosure
description: One authoritative advertised price, optional included-fee detail, and precise treatment of unknown prices.
---

# Pricing and fee disclosure

**Compare `price`. Never add its included fees again.** AAP uses one authoritative advertised vehicle amount across MCP, A2A and PAP.

![The authoritative vehicle price includes mandatory dealer charges; its fee breakdown is informational and government-required consumer charges are separate](./img/pricing-ladder.svg)

## Four fields, four meanings

Every amount is an integer in **whole US dollars**.

| Field | Meaning | Buyer-agent treatment |
|---|---|---|
| `price` | Advertised amount after universally available discounts, including all mandatory dealer charges and required add-ons | Use for comparisons, price filters and price sorting |
| `fees` | Optional complete itemization of mandatory charges already included in `price` | Show as an included breakdown; never add again |
| `list_price` | Informational base/list amount before relevant discounts and charges | Context only; never a substitute for `price` |
| `msrp` | Manufacturer's suggested retail amount | Reference only |

`price` excludes only charges a government requires the **consumer** to pay, such as applicable tax, title or registration. A tax or fee owed by the dealer and passed to the buyer remains included, as does a dealer fee merely permitted by government. Optional products are outside the mandatory fee breakdown.

A price cannot depend on an additional down payment, dealer financing, trade-in, military service, loyalty or another eligibility condition. Conditional incentives may be explained separately; they MUST NOT reduce `price`. Display authoritative price prominently and label reference amounts clearly.

## Missing is different from zero

| Representation | Meaning |
|---|---|
| `price` present, `fees` omitted | Authoritative amount known; no breakdown supplied |
| `fees: []` | No mandatory dealer charges or required add-ons |
| Nonempty `fees` | Complete effective breakdown for this vehicle |
| `price` omitted | Authoritative price unknown, even if list amount and fees are present |

A listing without a price remains valid. It does not match a price-bound filter and does not contribute to `price_range`. Do not estimate or reconstruct its price from other fields.

## Included charges are not a calculation recipe

```json
{
  "vehicle_id": "vehicle_example_001",
  "list_price": 24990,
  "price": 26280,
  "fees": [
    { "name": "Documentation fee", "amount": 500 },
    { "name": "Required protection product", "amount": 1000 }
  ],
  "status": "available",
  "updated_at": "2026-10-24T14:00:00Z"
}
```

This fictional dealer applied a $210 discount available to every buyer. Show **$26,280**, including the itemized $1,500. Do not show $27,780 or reconstruct $26,490 from the list amount. The protocol does not require `list_price + sum(fees) == price`.

Each fee has a specific nonempty `name` and a nonnegative integer `amount`. Names must be unique within the array. Fee items cannot encode discounts, optional products or excluded government-required consumer charges.

## Resolve rooftop defaults before publication

A rooftop may publish its default fee schedule through `dealer.information`. The inventory publisher resolves those defaults and any vehicle-specific changes before returning a listing.

When vehicle `fees` is supplied, it is a complete replacement snapshot. Buyers MUST NOT join, merge or infer fees from the rooftop, another listing or a cached configuration. Vehicle price remains authoritative even when the optional breakdown is unavailable.

| Source data | Publish |
|---|---|
| Complete advertised amount | `price`; add `fees` only when its complete breakdown is known |
| Base/list amount only | `list_price`, with `price` omitted |
| Base amount + known fees, no certified total | Informational `list_price` and `fees`; omit `price` |
| Amount reduced by an eligibility-dependent rebate | Use the non-conditional advertised amount, or omit `price` if unknown |
| Rooftop defaults + vehicle exceptions | One complete effective vehicle fee array, when supplied |

These semantics describe an advertised vehicle amount. Buyer-specific government charges and a final transaction quote are outside this inventory contract.

## Current enforcement context

Reviewed **2026-10-24**. The FTC's September 2026 staff FAQs explain mandatory-fee inclusion, prominent actual prices, conditional discounts and transparent in-transit listings. They distinguish government-required consumer charges from dealer obligations passed on to buyers. The document states that it represents staff views and is not binding on the public or Commission. [FTC automotive pricing FAQs](https://www.ftc.gov/business-guidance/resources/automobile-industry-pricing-transparency-faqs).

The separate CARS Rule was withdrawn effective February 12, 2026 after the court's vacatur. AAP does not present it as an active rule. [Federal Register withdrawal](https://www.govinfo.gov/content/pkg/FR-2026-02-12/pdf/2026-02866.pdf).

AAP's field meanings are protocol requirements. They do not certify an advertisement or replace an operator's obligations under applicable law.
