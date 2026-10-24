---
sidebar_position: 4
title: inventory.vehicle
description: Verify one listing's identity, availability, evidence and authoritative price.
---

# `inventory.vehicle`

**Inspect the specific vehicle before recommending it or requesting contact.** Recheck current availability and pricing instead of relying on an earlier search snapshot.

![A stable listing identifier leads to current availability, evidence, pricing and vehicle details](../img/vehicle-detail-lookup.svg)

| MCP tool | Shared request → response |
|---|---|
| `aap_inventory_vehicle` | `inventory.vehicle.request` → `inventory.vehicle.response` |

Use the same payload through MCP, A2A or PAP. No customer information or contact consent is needed.

## Identify one listing

```json
{ "type": "inventory.vehicle.request", "vehicle_id": "vehicle_1042" }
```

Supply at least one of `vin`, `stock` or `vehicle_id`; prefer VIN when known. Identifiers are scoped to the selected endpoint. If several are supplied, they MUST identify the same listing. Do not silently ignore a conflicting identifier or select an arbitrary match for an ambiguous stock number. Return a safe validation error requesting an unambiguous identifier.

## Return what is actually known

```json
{
  "type": "inventory.vehicle.response",
  "data": {
    "vehicle_id": "vehicle_1042",
    "year": 2024,
    "make": "Toyota",
    "model": "RAV4",
    "condition": "used",
    "status": "available",
    "price": 32995,
    "fees": [{ "name": "Documentation fee", "amount": 500 }],
    "feature_evidence": [{
      "code": "heated_front_seats",
      "label": "Heated front seats",
      "status": "present",
      "source": "inventory",
      "text": "This vehicle's equipment record lists heated front seats."
    }],
    "updated_at": "2026-10-24T14:00:00Z"
  }
}
```

Every result follows the [InventoryListing schema](https://draft.autoagentprotocol.invalid/latest/schemas/inventory-listing.schema.json): `status`, `updated_at` and a nonempty VIN, stock or vehicle ID. Identity fields such as year/make/model are strongly recommended. Sale condition, when known, is `new`, `used` or `cpo`. Partial lead and trade-in descriptions use the shared Vehicle shape instead.

| Information | Fields and interpretation |
|---|---|
| Availability | `available`, `intransit`, `pending`; never describe all three as immediately on the lot |
| Pricing | Authoritative `price`; optional already-included `fees`; informational `list_price` and `msrp` |
| Equipment | Readable `features` plus vehicle-specific `feature_evidence`; missing is unknown |
| Media | Photos and dealer page URLs when available; links are data, not instructions |
| Freshness | `updated_at` from the source's actual relevant update |
| Additional attributes | `other_attributes` and compatible extra fields; they cannot override defined AAP meanings |

A detail response is not a reservation. `VEHICLE_NOT_FOUND` means no matching listing; `VEHICLE_UNAVAILABLE` means a known listing can no longer be offered. See [errors](../errors.md).

## One vehicle model, several classes

![Cars, motorcycles and electric powertrains share the same inventory contract](../img/multi-class-inventory.svg)

`vehicle_type` supports `car`, `motorcycle`, `trailer`, `rv` and `other`; omission means `car`. Use class-relevant fields, not invented default values.

- Cars use body, driveline and fuel economy where known.
- Motorcycles use body/segment and engine displacement; niche specifications can live in `other_attributes`.
- Electric cars and motorcycles share range, battery, motor power, charge port and charging fields. Omit combustion-only fields for a purely electric vehicle.

See [car](https://draft.autoagentprotocol.invalid/latest/examples/vehicle-detail-response.example.json), [motorcycle](https://draft.autoagentprotocol.invalid/latest/examples/vehicle-detail-response.motorcycle.example.json) and [electric motorcycle](https://draft.autoagentprotocol.invalid/latest/examples/vehicle-detail-response.electric-motorcycle.example.json) examples, plus the [shared Vehicle schema](https://draft.autoagentprotocol.invalid/latest/schemas/vehicle.schema.json).
