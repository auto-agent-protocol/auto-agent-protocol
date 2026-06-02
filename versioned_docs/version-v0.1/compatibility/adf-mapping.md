---
sidebar_position: 1
title: ADF/XML mapping
description: Field-by-field mapping from a lead.submit request to ADF/XML so dealer CRMs can ingest AAP leads without changes.
---

# ADF/XML mapping

![ADF bridge: AAP lead.submit JSON on the left, ADF/XML on the right, dealer CRM ingesting at the end](/img/adf-bridge.png)

The Auto-lead Data Format (ADF/XML) has been the de-facto standard for delivering leads to dealer CRMs for over two decades. AAP's [`lead.submit`](../skills/lead-submit.md) request is designed to translate losslessly to ADF/XML so a dealer's existing pipeline accepts the lead unchanged.

This page documents the field-by-field translation. The dealer agent (or the dealer's CRM adapter) generates the XML; the buyer agent only sends AAP JSON.

## Mapping table

| AAP field (`lead.submit.request`) | ADF element / attribute | Notes |
|---|---|---|
| `customer.first_name` + `customer.last_name` | `<customer><contact><name part="full">{first} {last}</name></contact></customer>` | ADF expects a full-name node; AAP keeps first/last separate. The mapper concatenates with a single space. |
| `customer.email` | `<customer><contact><email>...</email></contact></customer>` | RFC 5322 email. |
| `customer.phone` | `<customer><contact><phone>...</phone></contact></customer>` | E.164 phone (e.g. `+14155550123`). ADF allows free-form phones; AAP normalizes to E.164. |
| `customer.address.address_line_1` / `_2` | `<customer><contact><address><street line="1">...</street><street line="2">...</street></address></contact></customer>` | Optional. |
| `customer.address.city` | `<customer><contact><address><city>...</city></address></contact></customer>` | Optional. |
| `customer.address.state` | `<customer><contact><address><regioncode>...</regioncode></address></contact></customer>` | Optional. ADF uses `<regioncode>`; AAP uses `state`. |
| `customer.address.zip` | `<customer><contact><address><postalcode>...</postalcode></address></contact></customer>` | Optional. ADF uses `<postalcode>`; AAP uses `zip`. AAP v0.1 is US-only; the ADF mapper writes `<country>US</country>` automatically. |
| `vehicle_of_interest.year` / `make` / `model` | `<vehicle interest="buy"><year>...</year><make>...</make><model>...</model></vehicle>` | The required ADF trio. Provided either directly on `vehicle_of_interest` or by VIN-decoding the dealer-side listing. |
| `vehicle_of_interest.trim` | `<vehicle interest="buy"><trim>...</trim></vehicle>` | Optional. |
| `vehicle_of_interest.vin` | `<vehicle interest="buy"><vin>...</vin></vehicle>` | Optional but recommended. |
| `vehicle_of_interest.stock` | `<vehicle interest="buy"><stock>...</stock></vehicle>` | Optional. |
| `vehicle_of_interest.condition` | `<vehicle interest="buy" status="...">` (one of `new`, `used`) | ADF accepts only `new` or `used`. AAP `cpo` MAPS TO `status="used"` AND a free-text `<comments>certified pre-owned</comments>` on the vehicle. |
| `vehicle_of_interest.body` | `<vehicle interest="buy"><bodystyle>...</bodystyle></vehicle>` | Optional. |
| `vehicle_of_interest.transmission` | `<vehicle interest="buy"><transmission>...</transmission></vehicle>` | Optional. ADF expects `A` or `M`; the mapper folds `automatic`/`manual` (and variants like `8-speed automatic`) accordingly. |
| `vehicle_of_interest.mileage` | `<vehicle interest="buy"><odometer units="mi">...</odometer></vehicle>` | Optional; typical for used. |
| `vehicle_of_interest.price` | `<vehicle interest="buy"><price type="quote" currency="USD">...</price></vehicle>` | Mapped from the AAP `Money` shape. |
| `appointment.appointment_type` | Implicit on the parent vehicle's `interest`: `test_drive` → `<vehicle interest="test-drive">`; `handover` → no native ADF value, mapped as `<vehicle interest="buy">` with `<comments>handover scheduled</comments>`; otherwise (showroom_visit, phone_call, video_call, trade_in_appraisal) the appointment lives in `<comments>` of the customer block. | ADF predates structured appointments. |
| `appointment.requested_windows[]` + `appointment.timezone` | `<customer><comments>Requested time windows: 2026-05-03 11:00–12:00 PT</comments></customer>` | Free-text in `<comments>`; CRMs route to the appointment desk. |
| `submitted_at` | `<requestdate>...</requestdate>` | ISO 8601 (e.g. `2026-04-30T10:15:10Z`). |
| `message` | `<customer><comments>...</comments></customer>` | Free-text user message. |
| `source_agent` | `<provider><name part="full">{source_agent}</name></provider>` | Identifies the buyer-agent provider (e.g. `chatgpt-shopping`). |
| Dealer name (from `dealer.information` `trade_name`, or `contract.dealer.name`) | `<vendor><vendorname>...</vendorname></vendor>` | Dealer agent fills this from its own profile, not from the buyer agent. |
| `trade_in.year` / `make` / `model` / `trim` | A second `<vehicle interest="trade-in">...</vehicle>` block with `<year>`, `<make>`, `<model>`, `<trim>` | Trade-in vehicle goes in its own ADF `<vehicle>` block. |
| `trade_in.mileage` | `<vehicle interest="trade-in"><odometer units="mi">...</odometer></vehicle>` | Strongly recommended; ADF `<odometer>`. |
| `trade_in.condition` | `<vehicle interest="trade-in"><condition>...</condition></vehicle>` | `excellent`, `good`, `fair`, `poor` map directly to ADF's `<condition>` enum. |
| `trade_in.vin` | `<vehicle interest="trade-in"><vin>...</vin></vehicle>` | Optional; recommended for accurate appraisal. |

Nothing in `consent` is part of ADF (the format predates structured agent consent). AAP's `ConsentGrant` is preserved alongside the lead in the dealer CRM as an audit record. AAP-specific fields without an ADF equivalent (`customer.preferred_contact`, `vehicle_of_interest.vehicle_id`, `vehicle_of_interest.msrp`/`list_price`/`offered_price`/`zip`) MAY be persisted as CRM extension fields or in `<comments>`.

## Concrete worked example

Given a [`lead.submit`](../skills/lead-submit.md) request bundling a vehicle of interest, a trade-in, and a test-drive appointment:

```json
{
  "type": "lead.submit.request",
  "customer": {
    "first_name": "Anna",
    "last_name": "Lee",
    "email": "anna@example.com",
    "phone": "+14155550123",
    "preferred_contact": "email",
    "address": {
      "address_line_1": "200 Folsom St",
      "city": "San Francisco",
      "state": "CA",
      "zip": "94105"
    }
  },
  "consent": {
    "granted_at": "2026-04-30T10:15:00Z",
    "allowed_channels": ["email", "phone"],
    "consent_text": "I agree to share my contact info with Demo Toyota about this 2022 Honda Civic, my Sunday test drive, and my Toyota Corolla trade-in.",
    "source_agent": "chatgpt-shopping",
    "scope": ["lead_submission"]
  },
  "vehicle_of_interest": {
    "vin": "1HGCV1F30KA000001",
    "year": 2022, "make": "Honda", "model": "Civic", "trim": "EX",
    "condition": "cpo",
    "body": "sedan",
    "transmission": "automatic"
  },
  "trade_in": {
    "year": 2014, "make": "Toyota", "model": "Corolla",
    "condition": "good",
    "mileage": 96000
  },
  "appointment": {
    "appointment_type": "test_drive",
    "requested_windows": [
      { "start": "2026-05-03T18:00:00Z", "end": "2026-05-03T19:00:00Z" }
    ],
    "timezone": "America/Los_Angeles"
  },
  "message": "Interested in this Civic; can you confirm availability and best price with my trade?",
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

    <vehicle interest="test-drive" status="used">
      <year>2022</year>
      <make>Honda</make>
      <model>Civic</model>
      <trim>EX</trim>
      <vin>1HGCV1F30KA000001</vin>
      <bodystyle>sedan</bodystyle>
      <transmission>A</transmission>
      <comments>certified pre-owned</comments>
    </vehicle>

    <vehicle interest="trade-in">
      <year>2014</year>
      <make>Toyota</make>
      <model>Corolla</model>
      <condition>good</condition>
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
      <comments>Interested in this Civic; can you confirm availability and best price with my trade? Requested test-drive window: 2026-05-03 11:00–12:00 PT.</comments>
    </customer>

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

- `condition: "cpo"` becomes `<vehicle status="used">` PLUS `<comments>certified pre-owned</comments>`. Plain ADF has no certified value.
- `appointment.appointment_type: "test_drive"` becomes `interest="test-drive"` on the `vehicle_of_interest` block. AAP `trade_in` maps to a second `<vehicle interest="trade-in">`.
- `appointment.requested_windows[]` are folded into the customer `<comments>` since ADF has no native time-window element.
- The dealer name `Demo Toyota` is filled from the dealer agent's own profile, not from the buyer agent's request.
- The user `message` and the appointment window land in customer `<comments>`.

## What does NOT map to ADF

The ADF format predates structured agent consent. AAP's `consent` (`ConsentGrant`) is preserved alongside the lead in the dealer CRM as an audit record but does not have an ADF equivalent. Dealers typically:

- Persist the full `ConsentGrant` JSON in a separate consent table or audit log.
- Surface `consent.allowed_channels` to the dealer's BDC or CRM rules engine to decide which channels to actually use for follow-up (and to refuse unauthorized channels).

`consent` MUST NOT be silently dropped on the dealer side; it is a regulatory requirement that the buyer agent passes through.

## ADF compatibility flag

The contract manifest sets `adf_compatible: true` for `lead.submit`. When the request includes `vehicle_of_interest`, the lead carries enough context to populate ADF's required `<vehicle>` trio cleanly. When the request is customer-only (no `vehicle_of_interest`), it is forwarded into the dealer CRM as an ADF lead with a synthetic placeholder vehicle (e.g. omitted or left as a generic inquiry record), per the dealer's CRM conventions.

For implementation guidance on the receiving side, see your CRM vendor's ADF documentation; AAP does not specify wire-level ADF transport (FTP, SMTP, HTTP POST), only the field-level translation.
