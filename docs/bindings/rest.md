---
sidebar_position: 2
title: HTTP+JSON (REST) binding
description: How to invoke each AAP skill over A2A's HTTP+JSON binding (Section 11 of the A2A spec) using a single POST /message:send endpoint.
---

# HTTP+JSON (REST) binding

![Same AAP payload feeding two transports: JSON-RPC 2.0 on the left, HTTP+JSON on the right](/img/bindings-comparison.png)

A2A defines an HTTP+JSON binding in [Section 11](https://a2a-protocol.org/specification#section-11) of its specification. Every A2A operation maps to a single HTTP route. AAP rides on this binding without modification: every skill is invoked via `POST /message:send` with the AAP request packaged as a typed `DataPart` inside `message.parts[]`.

:::info What changed in A2A v1.0
A2A v1.0 reshaped the body of `POST /message:send`. The URL path stays the same; the inner `Message` shape changed. AAP examples on this page reflect the new shape; see [A2A spec §A.2.1 — Breaking Change: Kind Discriminator Removed](https://a2a-protocol.org/latest/specification/#a21-breaking-change-kind-discriminator-removed) for the source of truth.

| Aspect | Legacy (v0.3.x) | Current (v1.0) |
|---|---|---|
| Method name (JSON-RPC) | `message/send` | `SendMessage` |
| URL (HTTP+JSON) | `POST /message:send` | `POST /message:send` (unchanged) |
| Role | `user` / `agent` | `ROLE_USER` / `ROLE_AGENT` |
| Part discriminator | per-part `kind: "data"` field | member-name discriminator (no `kind`) |
| `messageId` | optional | required on every `Message` |
| `mediaType` on DataPart | absent | `application/vnd.autoagent.<skill>-request+json` |
:::

## Endpoint

A dealer agent advertises one or more HTTP+JSON endpoints under `supported_interfaces[]` of its [agent card](../discovery.md). Each entry has `protocol_binding: "HTTP+JSON"` and a `url` for the base.

```
POST {base_url}/message:send
Content-Type: application/json
```

If the agent declares `auth_type: "bearer"`, every request MUST also send:

```
Authorization: Bearer <token>
```

The body has two top-level keys: `message` (an A2A `Message`) and `configuration` (the buyer's accepted output modes):

```json
{
  "message": {
    "messageId": "01HZ9F4M7C0X3K5RN8B3WJTW2P",
    "role": "ROLE_USER",
    "parts": [
      {
        "data": {
          "type": "<scope>.<thing>.request",
          "...": "skill-specific fields"
        },
        "mediaType": "application/vnd.autoagent.<skill>-request+json"
      }
    ]
  },
  "configuration": {
    "acceptedOutputModes": ["application/vnd.autoagent.<skill>-response+json"]
  }
}
```

The response is an A2A `Message` wrapped in a top-level `message` key:

```json
{
  "message": {
    "messageId": "01HZ9F4N1JZ7QS8VKR2A3B4C5D",
    "role": "ROLE_AGENT",
    "parts": [
      {
        "data": {
          "type": "<scope>.<thing>.response",
          "data": { "...": "skill-specific response data" }
        },
        "mediaType": "application/vnd.autoagent.<skill>-response+json"
      }
    ]
  }
}
```

The remainder of this page shows a `curl` invocation for each of the five skills.

## `dealer.information`

```bash
curl -X POST https://demo-toyota.example.com/a2a/message:send \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "messageId": "01HZ9G5N8D1Y4M6SP9C4XKVW3Q",
      "role": "ROLE_USER",
      "parts": [
        {
          "data": {
            "type": "dealer.information.request"
          },
          "mediaType": "application/vnd.autoagent.dealer-information-request+json"
        }
      ]
    },
    "configuration": {
      "acceptedOutputModes": ["application/vnd.autoagent.dealer-information-response+json"]
    }
  }'
```

## `inventory.facets`

```bash
curl -X POST https://demo-toyota.example.com/a2a/message:send \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "messageId": "01HZ9H6P9E2Z5N7TQ0D5YMWX4R",
      "role": "ROLE_USER",
      "parts": [
        {
          "data": {
            "type": "inventory.facets.request",
            "filters": { "condition": ["used"] }
          },
          "mediaType": "application/vnd.autoagent.inventory-facets-request+json"
        }
      ]
    },
    "configuration": {
      "acceptedOutputModes": ["application/vnd.autoagent.inventory-facets-response+json"]
    }
  }'
```

## `inventory.search`

```bash
curl -X POST https://demo-toyota.example.com/a2a/message:send \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "messageId": "01HZ9F4M7C0X3K5RN8B3WJTW2P",
      "role": "ROLE_USER",
      "parts": [
        {
          "data": {
            "type": "inventory.search.request",
            "filters": {
              "make": ["Honda"],
              "condition": ["used", "cpo"],
              "year_min": 2020,
              "price_max": 30000
            },
            "pagination": { "skip": 0, "limit": 20 },
            "sort": { "field": "price", "order": "asc" },
            "privacy": { "anonymous": true }
          },
          "mediaType": "application/vnd.autoagent.inventory-search-request+json"
        }
      ]
    },
    "configuration": {
      "acceptedOutputModes": ["application/vnd.autoagent.inventory-search-response+json"]
    }
  }'
```

## `inventory.vehicle`

```bash
curl -X POST https://demo-toyota.example.com/a2a/message:send \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "messageId": "01HZ9J7Q0F3A6P8VR1E6ZNXY5S",
      "role": "ROLE_USER",
      "parts": [
        {
          "data": {
            "type": "inventory.vehicle.request",
            "vin": "1HGCY2F57RA000001",
            "zip": "94105"
          },
          "mediaType": "application/vnd.autoagent.vehicle-detail-request+json"
        }
      ]
    },
    "configuration": {
      "acceptedOutputModes": ["application/vnd.autoagent.vehicle-detail-response+json"]
    }
  }'
```

## `lead.submit` (bearer auth example)

The unified lead carries customer info plus any combination of `vehicle_of_interest`, `trade_in`, and `appointment`. Below: a single test-drive lead that also queues the buyer's trade-in for in-person appraisal.

```bash
curl -X POST https://demo-toyota.example.com/a2a/message:send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "message": {
      "messageId": "01HZ9K8R1G4B7Q9WS2F7APYZ6T",
      "role": "ROLE_USER",
      "parts": [
        {
          "data": {
            "type": "lead.submit.request",
            "customer": {
              "first_name": "Anna",
              "last_name": "Lee",
              "email": "anna@example.com",
              "phone": "+14155550123",
              "preferred_contact": "phone",
              "address": {
                "address_line_1": "200 Folsom St",
                "city": "San Francisco",
                "state": "CA",
                "zip": "94105"
              }
            },
            "consent": {
              "granted_at": "2026-04-30T10:16:00Z",
              "allowed_channels": ["email", "phone"],
              "consent_text": "I agree to share my contact info with Demo Toyota about VIN 1HGCY2F57RA000001, my Saturday test drive, and the trade-in of my 2014 Toyota Corolla.",
              "source_agent": "chatgpt-shopping",
              "scope": ["lead_submission"]
            },
            "vehicle_of_interest": {
              "vin": "1HGCY2F57RA000001",
              "year": 2022, "make": "Honda", "model": "Civic", "trim": "EX",
              "condition": "cpo"
            },
            "trade_in": {
              "year": 2014, "make": "Toyota", "model": "Corolla",
              "condition": "good",
              "mileage": 96000
            },
            "appointment": {
              "appointment_type": "test_drive",
              "requested_windows": [
                { "start": "2026-05-02T17:00:00Z", "end": "2026-05-02T18:00:00Z" }
              ],
              "timezone": "America/Los_Angeles",
              "duration_minutes": 60
            },
            "message": "Interested in this Civic; please appraise my Corolla at the same visit.",
            "source_agent": "chatgpt-shopping",
            "submitted_at": "2026-04-30T10:16:05Z"
          },
          "mediaType": "application/vnd.autoagent.lead-submit-request+json"
        }
      ]
    },
    "configuration": {
      "acceptedOutputModes": ["application/vnd.autoagent.lead-submit-response+json"]
    }
  }'
```

## Successful response shape

A successful HTTP+JSON response uses HTTP status `200 OK` and returns a top-level `message` object whose value is an A2A `Message`:

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "message": {
    "messageId": "01HZ9F4N1JZ7QS8VKR2A3B4C5D",
    "role": "ROLE_AGENT",
    "parts": [
      {
        "data": {
          "type": "inventory.search.response",
          "data": {
            "total": 1,
            "skip": 0,
            "limit": 20,
            "vehicles": [/* ... */]
          }
        },
        "mediaType": "application/vnd.autoagent.inventory-search-response+json"
      }
    ]
  }
}
```

The dealer agent's `messageId` MUST differ from the buyer agent's request `messageId`.

## Error mapping (A2A Section 11.6)

When a skill cannot be fulfilled, the dealer agent MUST return a non-2xx HTTP status with a body matching A2A's [Section 11.6](https://a2a-protocol.org/specification#section-11-6) error envelope: a top-level `error` object with `code`, `message`, and `details[]`. AAP places its typed error payload (`aap.error`) into `details[]` alongside the standard `google.rpc.ErrorInfo` entry.

```http
HTTP/1.1 422 Unprocessable Entity
Content-Type: application/json

{
  "error": {
    "code": 422,
    "message": "filters.year_min must be an integer",
    "details": [
      {
        "@type": "type.googleapis.com/google.rpc.ErrorInfo",
        "reason": "SCHEMA_VALIDATION_FAILED",
        "domain": "autoagentprotocol.org",
        "metadata": {
          "instancePath": "/filters/year_min",
          "received": "twenty-twenty"
        }
      },
      {
        "@type": "type.googleapis.com/aap.error",
        "type": "aap.error",
        "error_id": "err_01HZ9EXAMPLE",
        "code": "SCHEMA_VALIDATION_FAILED",
        "message": "filters.year_min must be an integer",
        "retryable": false,
        "details": {
          "instancePath": "/filters/year_min",
          "received": "twenty-twenty"
        },
        "created_at": "2026-04-30T10:15:30Z"
      }
    ]
  }
}
```

The `error.code` field is the HTTP status code. The first detail entry uses Google's standard `ErrorInfo` shape with `reason` set to the AAP error code; the second entry carries the full AAP error payload for clients that prefer to consume it directly.

Recommended HTTP status mapping:

| AAP `code` | HTTP status | Notes |
|---|---|---|
| `SCHEMA_VALIDATION_FAILED` | 422 | Body fails schema validation. |
| `MISSING_REQUIRED_FIELD` | 422 | A required field is absent. |
| `UNSUPPORTED_SKILL` | 404 | Skill id is unknown to this agent. |
| `VEHICLE_NOT_FOUND` | 404 | VIN/stock/vehicle_id does not match a listing. |
| `VEHICLE_UNAVAILABLE` | 409 | Vehicle exists but is no longer available (e.g. sold). |
| `CONTACT_CONSENT_REQUIRED` | 403 | Customer info present without consent or with insufficient scope. |
| `INVALID_CONSENT` | 403 | Consent grant present but malformed or expired. |
| `APPOINTMENT_TIME_UNAVAILABLE` | 409 | None of the requested windows can be honored and no proposals offered. |
| `AUTH_REQUIRED` | 401 | Bearer token missing or invalid. |
| `RATE_LIMITED` | 429 | Client has exceeded the dealer's rate limits. |
| `INTERNAL_ERROR` | 500 | Unhandled dealer-side error. |

See [Errors](../errors.md) for the full vocabulary and per-code semantics.
