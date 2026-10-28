---
sidebar_position: 2
title: inventory.facets
description: Discover actual inventory values, ranges and feature vocabulary before constructing a search.
---

# `inventory.facets`

**Ask what can be searched before guessing a filter value.** Facets expose counts, numeric ranges and the deployment's supported feature codes.

![Facet buckets and feature codes summarize the full matching inventory before pagination](../img/facets-overview.svg)

| MCP tool | Shared request → response |
|---|---|
| `aap_inventory_facets` | `inventory.facets.request` → `inventory.facets.response` |

The same typed payload works through MCP, A2A and PAP. It needs no customer information or contact consent.

## Scope the inventory

```json
{
  "type": "inventory.facets.request",
  "filters": { "condition": ["used"], "status": ["available"] }
}
```

Omit `filters` for the entire visible inventory. Otherwise, apply the [search filter semantics](./inventory-search.md) before aggregating. Counts cover the **full matching set**, not one page or a capped sample.

When search is implemented, facets use its advertised filter capabilities and the same visibility. A facets-only endpoint accepts unfiltered requests and MUST reject supplied filters with `UNSUPPORTED_FILTER`; it cannot advertise search capabilities it does not implement.

## Currency and odometer context

Top-level `currency` and `mileage_unit` select the same [query contexts](./inventory-search.md#currency-and-odometer-context) as search. When `inventory.search` is implemented, facets MUST use its advertised supported currencies and defaults.

When `inventory.search` is **not** implemented, `inventory.facets` MUST accept both `USD` and `CAD`, and both `mi` and `km`. Omitted request fields mean `USD` and `mi`. This fallback needs no search capability declaration and does not imply that inventory exists in both currencies: a currency with no matching inventory returns empty facets. A Canadian facets-only service is queried explicitly as follows, without `filters`:

```json
{
  "type": "inventory.facets.request",
  "currency": "CAD",
  "mileage_unit": "km"
}
```

Apply this fallback consistently across A2A, MCP and PAP. It does not change the USD/mi meaning of existing unlabelled requests or permit unsupported filters.

## Read counts and ranges

```json
{
  "type": "inventory.facets.response",
  "data": {
    "makes": [{ "value": "Honda", "count": 8 }, { "value": "Toyota", "count": 12 }],
    "conditions": [{ "value": "used", "count": 20 }],
    "price_range": { "min": 18995, "max": 34995 },
    "features": [
      { "code": "heated_front_seats", "label": "Heated front seats", "count": 11 },
      { "code": "adaptive_cruise_control", "label": "Adaptive cruise control", "count": 0 }
    ]
  }
}
```

| Facet group | Examples |
|---|---|
| Identity and condition | makes, models, trims, years, conditions, statuses |
| Vehicle and location | vehicle_types, bodies, rooftops, exterior_colors, interior_colors |
| Powertrain | fuels, transmissions, drivelines, charge_ports, dc_fast_charge |
| Numeric ranges | price_range, mileage_range, year_range, displacement_cc_range, electric_range_mi_range |
| Equipment vocabulary | features: stable code, readable label and verified-present count |

Term entries use `{value, count}`; values are strings, integers or booleans as appropriate. Counts are nonnegative exact counts. `dc_fast_charge` uses actual booleans. Range fields use `{min, max}` with `min <= max` and the source field's units.

Only known authoritative prices in the effective query currency contribute to `price_range`; omit it when none are known. Missing facets mean unavailable data. Empty/zero buckets are allowed when meaningful; do not invent an observed value.

Return the effective labels in `data.currency` and `data.mileage_unit`; omission means USD/mi, never an inherited Canadian default. All counts and ranges come from the same currency-scoped matching set. `mileage_range` contains exact converted bounds in the query unit and may be fractional; do not aggregate raw mi and km numbers together. `electric_range_mi_range` remains miles. Facets embedded in a search response MUST use that search's effective contexts, including when empty. Vehicle odometers retain their own native units independently of the facet mileage range.

## Feature codes have stable meaning

A deployment supporting `features_all` or `features_any` MUST implement this skill and publish its full supported feature vocabulary in `features`. Include supported codes with zero matches so an empty result is distinguishable from an unsupported code. Filtering may change counts, but not a code's meaning.

Count only vehicle-specific evidence with `status: "present"`. Unknown or absent equipment does not contribute. Feature codes are unique within the vocabulary and use lowercase snake_case. A model's usual equipment or a trim label is not evidence for a particular vehicle.

Clients discover a code here, submit it to search, then inspect the returned evidence. An unadvertised code returns `UNSUPPORTED_FILTER`; it must not quietly become a keyword query.

See the [full facet example](https://draft.autoagentprotocol.invalid/latest/examples/inventory-facets-response.example.json), [motorcycle example](https://draft.autoagentprotocol.invalid/latest/examples/inventory-facets-response.motorcycle.example.json) and [schema](https://draft.autoagentprotocol.invalid/latest/schemas/facets.schema.json).
