---
sidebar_position: 1
title: ADF/XML mapping
description: Field-by-field mapping from a lead.vehicle request to ADF/XML so dealer CRMs can ingest AAP leads without changes.
---

# ADF/XML mapping

![ADF bridge: AAP lead.vehicle JSON on the left, ADF/XML on the right, dealer CRM ingesting at the end](/img/adf-bridge.png)

The Auto-lead Data Format (ADF/XML) has been the de-facto standard for delivering leads to dealer CRMs for two decades. AAP's [`lead.vehicle`](../skills/lead-vehicle.md) request is designed to translate losslessly to ADF/XML so a dealer's existing pipeline accepts the lead unchanged.

This page documents the field-by-field translation. The dealer agent (or the dealer's CRM adapter) generates the XML; the buyer agent only sends AAP JSON.

## Mapping table

| AAP field (`vehicle_lead_request`) | ADF element / attribute | Notes |
|---|---|---|
| `customer.first_name` + `customer.last_name` | `<contact><name part="full">{first} {last}</name></contact>` | ADF expects a full-name node; AAP keeps first/last separate. The mapper concatenates with a single space. |
| `customer.email` | `<contact><email>...</email></contact>` | RFC 5322 email. |
| `customer.phone` | `<contact><phone>...</phone></contact>` | E.164 phone (e.g. `+14155550123`). ADF allows free-form phones; AAP normalizes to E.164. |
| `customer.address.line1` / `line2` | `<contact><address><street line="1">...</street><street line="2">...</street></address></contact>` | Optional. |
| `customer.address.city` | `<contact><address><city>...</city></address></contact>` | Optional. |
| `customer.address.region_code` | `<contact><address><regioncode>...</regioncode></address></contact>` | Optional. |
| `customer.address.postal_code` | `<contact><address><postalcode>...</postalcode></address></contact>` | Optional. |
| `customer.address.country_code` | `<contact><address><country>...</country></address></contact>` | ISO 3166-1 alpha-2 (e.g. `US`). |
| `vehicles[0].year` / `make` / `model` | `<vehicle><year>...</year><make>...</make><model>...</model></vehicle>` | The required ADF trio. Provided either directly on `vehicles[0]` or by VIN-decoding the dealer-side listing. |
| `vehicles[0].trim` | `<vehicle><trim>...</trim></vehicle>` | Optional. |
| `vehicles[0].vin` | `<vehicle><vin>...</vin></vehicle>` | Optional but recommended. |
| `vehicles[0].stock` | `<vehicle><stock>...</stock></vehicle>` | Optional. |
| `intent` | `<vehicle interest="...">` (one of `buy`, `lease`, `sell`, `trade-in`, `test-drive`) | Maps to ADF's `interest` attribute. AAP `buy`/`lease`/`trade_in`/`test_drive` map to ADF `buy`/`lease`/`trade-in`/`test-drive`; AAP has no `sell`. |
| `vehicles[0].condition` | `<vehicle status="...">` (one of `new`, `used`) | ADF accepts only `new` or `used`. AAP `certified` MAPS TO `status="used"` AND a free-text comment such as `<comments>certified pre-owned</comments>` indicating CPO status. |
| `finance_type` | `<finance><method>...</method></finance>` (one of `cash`, `finance`, `lease`) | Direct mapping. |
| `submitted_at` | `<requestdate>...</requestdate>` | ISO 8601 (e.g. `2026-04-30T10:15:10Z`). |
| `message` | `<comments>...</comments>` | Free-text user message. ADF aggregates here; CPO/condition note may be appended. |
| `source_agent` | `<provider><name part="full">{source_agent}</name></provider>` | Identifies the buyer-agent provider (e.g. `chatgpt-shopping`). |
| Dealer name (from `dealer.information` `trade_name`, or `contract.dealer.name`) | `<vendor><vendorname>...</vendorname></vendor>` | Dealer agent fills this from its own profile, not from the buyer agent. |
| `trade_in.year` / `make` / `model` / `mileage` | A second `<vehicle interest="trade-in">...</vehicle>` block with `<year>`, `<make>`, `<model>`, `<odometer>` | Trade-in vehicle goes in its own ADF `<vehicle>` block. |

Nothing in `consent`, `consent_grant`, `lead_intent` (general lead), `intent.body_type`, `intent.fuel`, `intent.budget_max`, `intent.timeline`, `vehicles[0].vehicle_id`, or AAP's `Customer.preferred_contact` is part of ADF. Dealers can keep that AAP context in their CRM as an extension or in `<comments>`.

## Concrete worked example

Given the [`lead.vehicle`](../skills/lead-vehicle.md) example request:

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
    "year": 2014, "make": "Toyota", "model": "Corolla", "mileage": 96000
  },
  "message": "Interested in this Civic; can you confirm availability and best price with my trade?",
  "customer": {
    "first_name": "Anna", "last_name": "Lee",
    "email": "anna@example.com", "phone": "+14155550123",
    "preferred_contact": "email",
    "address": {
      "line1": "200 Folsom St", "city": "San Francisco",
      "region_code": "CA", "postal_code": "94105", "country_code": "US"
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

The dealer-side ADF/XML payload is:

```xml
<?adf version="1.0"?>
<adf>
  <prospect>
    <requestdate>2026-04-30T10:15:10Z</requestdate>

    <vehicle interest="buy" status="used">
      <year>2022</year>
      <make>Honda</make>
      <model>Civic</model>
      <trim>EX</trim>
      <vin>1HGCV1F30KA000001</vin>
      <comments>certified pre-owned</comments>
    </vehicle>

    <vehicle interest="trade-in">
      <year>2014</year>
      <make>Toyota</make>
      <model>Corolla</model>
      <odometer units="mi">96000</odometer>
    </vehicle>

    <customer>
      <contact>
        <name part="full">Anna Lee</name>
        <email>anna@example.com</email>
        <phone>+14155550123</phone>
        <address>
          <street line="1">200 Folsom St</street>
          <city>San Francisco</city>
          <regioncode>CA</regioncode>
          <postalcode>94105</postalcode>
          <country>US</country>
        </address>
      </contact>
      <comments>Interested in this Civic; can you confirm availability and best price with my trade?</comments>
    </customer>

    <finance>
      <method>finance</method>
    </finance>

    <provider>
      <name part="full">chatgpt-shopping</name>
    </provider>

    <vendor>
      <vendorname>Demo Toyota</vendorname>
    </vendor>
  </prospect>
</adf>
```

Note:

- `condition: "certified"` becomes `<vehicle status="used">` PLUS a `<comments>certified pre-owned</comments>` line. Plain ADF has no certified value.
- `intent: "buy"` becomes `interest="buy"`. AAP `trade_in` maps to ADF `interest="trade-in"`; AAP `test_drive` maps to `interest="test-drive"`.
- The dealer name `Demo Toyota` is filled from the dealer agent's own profile, not from the buyer agent's request.
- The user `message` and the trade-in details land in ADF `<comments>` and a second `<vehicle>` block respectively.

## What does NOT map to ADF

The ADF format predates structured agent consent. AAP's `consent` (`ConsentGrant`) is preserved alongside the lead in the dealer CRM as an audit record but does not have an ADF equivalent. Dealers typically:

- Persist the full `ConsentGrant` JSON in a separate consent table or audit log.
- Surface `consent.allowed_channels` to the dealer's BDC or CRM rules engine to decide which channels to actually use for follow-up (and to refuse unauthorized channels).

`consent` MUST NOT be silently dropped on the dealer side; it is a regulatory requirement that the buyer agent passes through.

## ADF compatibility flag

The contract manifest sets `adf_compatible: true` for `lead.general`, `lead.vehicle`, and `lead.appointment`. Among them, only `lead.vehicle` carries enough vehicle context to populate ADF's required `<vehicle>` trio cleanly; `lead.general` and `lead.appointment` are typically forwarded into the dealer CRM as ADF leads with synthetic placeholder vehicles (e.g. omitted or left as a generic inquiry record), per the dealer's CRM conventions.

For implementation guidance on the receiving side, see your CRM vendor's ADF documentation; AAP does not specify wire-level ADF transport (FTP, SMTP, HTTP POST), only the field-level translation.
