// Auto-generated from JSON Schema — do not edit
// Auto Agent Protocol v0.1

/**
 * A monetary amount expressed as a decimal value plus an ISO 4217 currency code.
 */
export interface Money {
  /**
   * Decimal amount. Use the smallest natural unit of the currency (e.g. dollars, not cents).
   */
  amount: number;
  /**
   * ISO 4217 three-letter currency code, e.g. USD, EUR, CAD.
   */
  currency: string;
}

/**
 * Generic contact channel with optional name, email, phone (E.164), and URL.
 */
export interface ContactPoint {
  /**
   * Display name for this contact channel (e.g. 'Sales', 'Service').
   */
  name?: string;
  /**
   * RFC 5322 email address.
   */
  email?: string;
  /**
   * Phone number in E.164 format, e.g. +14155550123.
   */
  phone?: string;
  /**
   * Public website or contact URL.
   */
  url?: string;
}

/**
 * US postal address. v0.1 is intentionally US-only; international support (country code, alternate postal formats) is deferred to a later version.
 *
 * All fields are OPTIONAL by design — the buyer agent should pass through whatever pieces of the address the customer actually provided (e.g. just a ZIP for regional pricing, or just city+state, or the full street address). The dealer is responsible for handling partial addresses gracefully.
 */
export interface Address {
  /**
   * Primary street line (e.g. '1280 Howard Street').
   */
  address_line_1?: string;
  /**
   * Secondary street line (suite, apartment, building, floor).
   */
  address_line_2?: string;
  /**
   * City or locality (e.g. 'San Francisco').
   */
  city?: string;
  /**
   * US state code or full name (e.g. 'CA' or 'California').
   */
  state?: string;
  /**
   * US ZIP code, 5 digits or ZIP+4 (e.g. '94103' or '94103-1234').
   */
  zip?: string;
}

/**
 * Abstract base shape for every typed Auto Agent Protocol payload that travels inside an A2A DataPart. Concrete request and response schemas restrict 'type' to a constant skill-id-shaped value (e.g. inventory.search.request, lead.appointment.response). The AAP version is announced once via the agent-card extension URI ('https://autoagentprotocol.org/extensions/a2a-automotive-retail/v0.1') and reflected in schema $id URLs; it is NOT repeated on the wire. Responses additionally carry a 'data' object and an optional 'message' note. Errors use the Error schema instead.
 */
export interface AapMessage {
  /**
   * AAP message type identifier. For skill calls: '<scope>.<thing>.request' or '<scope>.<thing>.response' (e.g. 'inventory.search.request', 'lead.appointment.response'). For envelopes: 'aap.event', 'aap.error'.
   */
  type: string;
  /**
   * Response payload (responses only). Requests carry their fields at the top level next to 'type'.
   */
  data?: {
    [k: string]: any;
  };
  /**
   * Optional contextual note from the dealer or LLM, intended for the buyer agent or end user. MAY be absent or empty.
   */
  message?: string;
  [k: string]: any;
}

/**
 * Unified vehicle interface used everywhere a vehicle is referenced — inventory results, vehicle_of_interest, and trade_in. The same shape covers both 'a vehicle the buyer wants to purchase' and 'a vehicle the buyer wants to trade in' so buyer agents reuse one type.
 *
 * Field semantics differ by context:
 * - For vehicle_of_interest, `condition` MUST be one of `new`, `used`, `cpo`. Pricing fields (`msrp`, `list_price`, `offered_price`, `price`) describe the dealer's listing.
 * - For trade_in, `condition` MUST be one of `excellent`, `good`, `fair`, `poor`. Pricing fields are typically absent on the request side and may be populated by the dealer's appraisal response.
 *
 * Context-dependent constraints (which condition values are valid, which identification fields are required) are enforced at the using request schema (e.g. `lead.submit.request`).
 *
 * No fields are required at this base schema. `additionalProperties: true` allows inventory.vehicle responses to carry richer dealer-specific fields (drivetrain, fuel, photos, VDP URL, etc.) without schema changes.
 */
export interface Vehicle {
  /**
   * Vehicle Identification Number (17 chars, ISO 3779). Optional on trade-ins; recommended on inventory listings of used vehicles.
   */
  vin?: string;
  /**
   * Model year (e.g. 2024).
   */
  year?: number;
  /**
   * Vehicle make / manufacturer brand (e.g. 'Honda', 'BMW', 'Ford').
   */
  make?: string;
  /**
   * Vehicle model name (e.g. 'CR-V', '3 Series', 'F-150').
   */
  model?: string;
  /**
   * Trim level (e.g. 'EX-L', 'M Sport', 'Lariat').
   */
  trim?: string;
  /**
   * Combined condition enum spanning both sale-condition and trade-in-condition vocabularies. For vehicle_of_interest use one of `new` | `used` | `cpo` (Certified Pre-Owned). For trade_in use one of `excellent` | `good` | `fair` | `poor`. The using request schema enforces the correct subset by context.
   */
  condition?: "new" | "used" | "cpo" | "excellent" | "good" | "fair" | "poor";
  msrp?: Money;
  price?: Money1;
  list_price?: Money2;
  offered_price?: Money3;
  /**
   * Buyer ZIP code used to compute regional pricing fields (`offered_price`). Optional; when absent, regional pricing fields MUST be omitted.
   */
  zip?: string;
  /**
   * Dealer's stock number for this unit. Inventory and vehicle_of_interest contexts.
   */
  stock?: string;
  /**
   * Odometer reading in miles. Required for trade-ins; typical on used inventory.
   */
  mileage?: number;
  /**
   * Body style as text (e.g. 'sedan', 'suv', 'truck', 'coupe', 'hatchback', 'wagon', 'minivan', 'convertible').
   */
  body?: string;
  /**
   * Transmission type as text (e.g. 'automatic', 'manual', '8-speed automatic', 'cvt').
   */
  transmission?: string;
  [k: string]: any;
}

/**
 * Extended vehicle representation returned by `inventory.vehicle`. Inherits all base Vehicle fields and explicitly declares the rich, dealer-side properties that go beyond the unified Vehicle interface used in lead.submit. `additionalProperties: true` lets dealers carry further site-specific equipment, history-report links, or certification details without schema changes.
 */
export type VehicleDetail = Vehicle & {
  /**
   * Stable identifier of the dealer that owns this listing.
   */
  dealer_id?: string;
  /**
   * Dealer-internal identifier when the vehicle is not yet VIN-decoded (e.g. an in-transit unit).
   */
  vehicle_id?: string;
  /**
   * Human-readable description / dealer marketing copy.
   */
  description?: string;
  /**
   * Drivetrain layout (e.g. 'fwd', 'rwd', 'awd', '4wd').
   */
  driveline?: string;
  /**
   * Engine description (e.g. '2.0L Turbo I4', '3.5L V6 Hybrid').
   */
  engine?: string;
  /**
   * Fuel type (e.g. 'gas', 'diesel', 'hybrid', 'phev', 'bev').
   */
  fuel?: string;
  /**
   * Fuel economy estimates. Omit for fully electric vehicles or use 'electric_range_mi' instead.
   */
  mpg?: {
    city?: number;
    highway?: number;
  };
  /**
   * Estimated electric range in miles, for BEV and PHEV vehicles.
   */
  electric_range_mi?: number;
  /**
   * Free-text exterior color name.
   */
  exterior_color?: string;
  /**
   * Free-text interior color or upholstery name.
   */
  interior_color?: string;
  /**
   * Public URLs of vehicle photos, ordered by relevance.
   */
  photos?: string[];
  /**
   * Public Vehicle Detail Page (VDP) URL on the dealer's website.
   */
  vdp_url?: string;
  /**
   * Free-text availability status (e.g. 'In Stock', 'In Transit', 'Pending', 'Sold', 'Reserved'). Recommended but not enforced as a controlled vocabulary.
   */
  status?: string;
  /**
   * Dealer notes (e.g. 'recently arrived', 'service history available').
   */
  notes?: string;
  /**
   * ISO 8601 / RFC 3339 timestamp (with timezone offset) at which the dealer last verified availability/price/status of this listing. REQUIRED when the agent makes availability claims (e.g. '2026-04-30T08:42:00Z').
   */
  last_verified_at?: string;
  [k: string]: any;
};

/**
 * Typed AAP response for the `inventory.vehicle` skill. The `data` field is a VehicleDetail (Vehicle + arbitrary additional dealer-specific properties). Carried inside an A2A `Message.parts[].data` DataPart returned from the `SendMessage` operation.
 */
export interface VehicleDetailResponse {
  type: "inventory.vehicle.response";
  data: VehicleDetail;
  /**
   * Optional contextual note. MAY be omitted.
   */
  message?: string;
}

/**
 * Typed AAP request for the `inventory.vehicle` skill. The request MUST identify a specific listing via at least one of `vin`, `stock`, or `vehicle_id`. Carried inside an A2A `Message.parts[].data` DataPart via the `SendMessage` operation.
 */
export type VehicleDetailRequest = {
  [k: string]: any;
} & {
  type: "inventory.vehicle.request";
  /**
   * Vehicle Identification Number. Preferred identifier when known.
   */
  vin?: string;
  /**
   * Dealer's stock number, used when VIN is not yet assigned (e.g. in-transit units).
   */
  stock?: string;
  /**
   * Dealer-internal vehicle identifier.
   */
  vehicle_id?: string;
  /**
   * Optional buyer ZIP code; when provided, the dealer MAY compute the regional offered_price field.
   */
  zip?: string;
};

/**
 * Dealer agent's response to a `lead.submit.request`. Carries the assigned `lead_id` and overall lead `status`, plus an optional appointment block when the request included an `appointment` (the dealer can confirm the requested window, propose alternatives, leave it as merely requested for human follow-up, or reject the appointment while still accepting the lead). Carried inside an A2A `Message.parts[].data` DataPart via `SendMessage`.
 */
export interface LeadSubmitResponse {
  /**
   * AAP message type discriminator.
   */
  type: "lead.submit.response";
  data: {
    /**
     * Dealer-assigned identifier for this lead.
     */
    lead_id: string;
    /**
     * Overall lead status. `duplicate` indicates the dealer recognized the same buyer/vehicle combination from a recent prior submission and merged it. `rejected` indicates the dealer did not accept the lead (e.g. consent invalid, vehicle no longer available, dealer not serving the buyer's region).
     */
    status: "received" | "duplicate" | "rejected";
    /**
     * Present iff the request included an `appointment` block AND the dealer is acknowledging it (whether confirming, proposing alternatives, leaving it as requested for staff follow-up, or rejecting).
     */
    appointment?: {
      /**
       * Dealer-assigned identifier for this appointment.
       */
      appointment_id: string;
      /**
       * Appointment status. `requested` = received but not yet scheduled (staff will follow up). `proposed` = dealer cannot honor any of the requested windows but is offering alternatives in `proposed_slots`. `confirmed` = dealer scheduled the appointment for `confirmed_window`. `rejected` = dealer cannot host this appointment (e.g. service unavailable).
       */
      status: "requested" | "proposed" | "confirmed" | "rejected";
      /**
       * Present iff `status` is `confirmed`. `start` and `end` are ISO 8601 / RFC 3339 timestamps with timezone offsets.
       */
      confirmed_window?: {
        /**
         * ISO 8601 / RFC 3339 confirmed-window start with timezone offset.
         */
        start: string;
        /**
         * ISO 8601 / RFC 3339 confirmed-window end with timezone offset.
         */
        end?: string;
      };
      /**
       * Present iff `status` is `proposed`. Time slots the dealer offers as alternatives. Each slot's `start` and `end` are ISO 8601 / RFC 3339 timestamps with timezone offsets.
       *
       * @minItems 1
       */
      proposed_slots?: [
        {
          /**
           * ISO 8601 / RFC 3339 proposed-slot start with timezone offset.
           */
          start: string;
          /**
           * ISO 8601 / RFC 3339 proposed-slot end with timezone offset.
           */
          end?: string;
        },
        ...{
          /**
           * ISO 8601 / RFC 3339 proposed-slot start with timezone offset.
           */
          start: string;
          /**
           * ISO 8601 / RFC 3339 proposed-slot end with timezone offset.
           */
          end?: string;
        }[]
      ];
    };
    /**
     * Convenience contact summary for the buyer agent to surface follow-up details to the user.
     */
    dealer?: {
      name?: string;
      /**
       * E.164 phone number for buyer follow-up.
       */
      phone?: string;
    };
  };
  /**
   * Contextual note from the dealer (e.g. 'A salesperson will call within 1 business hour.', 'We are unable to honor your requested time; please pick from the alternatives.').
   */
  message?: string;
}

/**
 * Unified lead submission for the `lead.submit` AAP skill. Replaces the v0.1-draft trio of `lead.general`, `lead.vehicle`, and `lead.appointment`. A single request carries the consented customer plus any combination of `vehicle_of_interest`, `trade_in`, and `appointment` — matching how dealerships actually take leads (e.g. test-drive a new car while getting a trade-in appraised in the same visit).
 *
 * Design principle: capture whatever the customer actually provided. `vehicle_of_interest`, `trade_in`, and `appointment` are entirely optional, and within them no individual field is required at the schema level — the buyer agent should pass through whatever pieces of information the user shared (a VIN, a make+model, just a year, mileage only — anything is welcome). The dealer is responsible for handling partial input gracefully.
 *
 * Validation rules:
 * - `customer` and `consent` are always required (lead is never anonymous; consent is always required).
 * - If `vehicle_of_interest.condition` is set, it MUST be one of `new`, `used`, `cpo`.
 * - If `trade_in.condition` is set, it MUST be one of `excellent`, `good`, `fair`, `poor`.
 * - `consent.scope` MUST be `["lead_submission"]`.
 *
 * Carried inside an A2A `Message.parts[].data` DataPart via `SendMessage` (JSON-RPC 2.0 or HTTP+JSON binding).
 */
export type LeadSubmitRequest = {
  [k: string]: any;
} & {
  /**
   * AAP message type discriminator.
   */
  type: "lead.submit.request";
  customer: Customer;
  consent: ConsentGrant;
  vehicle_of_interest?: Vehicle;
  trade_in?: Vehicle1;
  appointment?: Appointment;
  /**
   * Optional free-text message from the buyer to the dealer.
   */
  message?: string;
  /**
   * Identifier of the buyer agent that originated this lead (e.g. 'chatgpt-shopping', 'gemini-assistant', 'lumika-bdc'). Used for analytics and consent attribution.
   */
  source_agent: string;
  /**
   * ISO 8601 / RFC 3339 timestamp at which the buyer agent finalized this submission (e.g. '2026-04-30T11:05:08Z').
   */
  submitted_at?: string;
  /**
   * Optional client-generated key (UUID recommended) the dealer agent uses to dedupe retried submissions. Two requests carrying the same `idempotency_key` MUST produce the same response (the dealer returns the original `lead_id` and status). Strongly RECOMMENDED for production buyer agents that retry on network failure.
   */
  idempotency_key?: string;
};

/**
 * Typed AAP response for the `inventory.search` skill. The `data` block contains pagination metadata, the matched vehicles, and OPTIONALLY an embedded Facets aggregation. Carried inside an A2A `Message.parts[].data` DataPart returned from the `SendMessage` operation.
 */
export interface InventorySearchResponse {
  type: "inventory.search.response";
  data: {
    /**
     * Total number of vehicles matching the request (across all pages).
     */
    total: number;
    /**
     * Echo of the request's pagination.skip.
     */
    skip?: number;
    /**
     * Echo of the request's effective pagination.limit.
     */
    limit?: number;
    /**
     * Vehicles in this page, in the requested order.
     */
    vehicles: Vehicle[];
    facets?: Facets;
  };
  /**
   * Optional contextual note. MAY be omitted.
   */
  message?: string;
}

/**
 * Typed AAP request for the `inventory.search` skill. Filters are FLAT (no nested make/model trees) and multi-value filters are arrays. Pagination uses skip/limit; sort is field+order. `privacy.anonymous` declares whether the buyer agent is sharing user identity. Carried inside an A2A `Message.parts[].data` DataPart via the `SendMessage` operation.
 */
export interface InventorySearchRequest {
  type: "inventory.search.request";
  filters?: Filters;
  /**
   * Result paging. Default values are dealer-defined; spec recommends limit defaults <= 50 and limit cap of 100.
   */
  pagination?: {
    /**
     * Number of results to skip from the start of the matching set.
     */
    skip?: number;
    /**
     * Maximum number of results to return on this page.
     */
    limit?: number;
  };
  /**
   * Result ordering. Default ordering is dealer-defined.
   */
  sort?: {
    /**
     * Field to sort by. Sorting by 'price' uses the FTC-final 'price' field (which dealers MUST keep accurate).
     */
    field:
      | "price"
      | "list_price"
      | "offered_price"
      | "msrp"
      | "mileage"
      | "year"
      | "make"
      | "model"
      | "stock"
      | "last_verified_at";
    order: "asc" | "desc";
  };
  /**
   * Privacy hints from the buyer agent. AAP RECOMMENDS anonymous searches by default; user identity is only attached when a lead is submitted.
   */
  privacy?: {
    /**
     * True when no user-identifying information is included with the request.
     */
    anonymous?: boolean;
  };
}

/**
 * Typed AAP response for the `inventory.facets` skill. The `data` object is a Facets aggregation. Carried inside an A2A `Message.parts[].data` DataPart returned from the `SendMessage` operation.
 */
export interface InventoryFacetsResponse {
  type: "inventory.facets.response";
  data: Facets;
  /**
   * Optional contextual note. MAY be omitted.
   */
  message?: string;
}

/**
 * Typed AAP request for the `inventory.facets` skill. An optional `filters` block scopes the facets to a subset of inventory (e.g. `condition: ['used']`). Carried inside an A2A `Message.parts[].data` DataPart via the `SendMessage` operation.
 */
export interface InventoryFacetsRequest {
  type: "inventory.facets.request";
  filters?: Filters;
}

/**
 * Aggregated facet counts and ranges over a dealer's inventory. Returned by the `inventory.facets` AAP skill (wrapped in `inventory.facets.response`) and OPTIONALLY embedded in `inventory.search` responses. Both responses travel inside an A2A `Message.parts[].data` DataPart via the `SendMessage` operation.
 */
export interface Facets {
  makes?: TermFacet;
  models?: TermFacet;
  trims?: TermFacet;
  years?: TermFacet;
  conditions?: TermFacet;
  transmissions?: TermFacet;
  fuels?: TermFacet;
  drivelines?: TermFacet;
  bodies?: TermFacet1;
  exterior_colors?: TermFacet;
  interior_colors?: TermFacet;
  statuses?: TermFacet;
  price_range?: RangeFacet;
  mileage_range?: RangeFacet;
  year_range?: RangeFacet;
}

/**
 * Minimal AAP v0.1 event envelope. Used for asynchronous status updates (e.g. lead status changes, appointment confirmations) delivered via A2A push notifications or task status update events.
 */
export interface Event {
  type: "aap.event";
  /**
   * Concrete event kind. v0.1 defines two kinds; future versions may add more.
   */
  event_kind: "lead.status_changed" | "appointment.status_changed";
  /**
   * Identifier of the affected entity (lead_id or appointment_id).
   */
  entity_id: string;
  /**
   * New status value for the entity. For 'lead.status_changed', one of: received | duplicate | rejected | working | sold_to | lost. For 'appointment.status_changed', one of: requested | proposed | confirmed | rejected | completed | no_show.
   */
  status: string;
  /**
   * ISO 8601 / RFC 3339 timestamp at which the event occurred (e.g. '2026-04-30T10:15:30Z'). MUST include a timezone offset (Z or ±HH:MM).
   */
  occurred_at: string;
  /**
   * Optional event-specific payload. Schema is event-kind-dependent and dealer-defined for v0.1.
   */
  payload?: {
    [k: string]: any;
  };
}

/**
 * Typed AAP error payload. Returned inside an A2A error envelope (JSON-RPC 'error' member or HTTP 'application/json' error body, per A2A spec sections 9.5 and 11.6). Buyer agents use 'code' and 'retryable' to drive client behavior; humans see 'message'.
 */
export interface Error {
  type: "aap.error";
  /**
   * Unique identifier for this error instance, suitable for support correlation (e.g. UUID).
   */
  error_id: string;
  /**
   * Machine-readable error code from the AAP error vocabulary.
   */
  code:
    | "UNSUPPORTED_SKILL"
    | "SCHEMA_VALIDATION_FAILED"
    | "MISSING_REQUIRED_FIELD"
    | "INVALID_CONDITION"
    | "VEHICLE_NOT_FOUND"
    | "VEHICLE_UNAVAILABLE"
    | "CONTACT_CONSENT_REQUIRED"
    | "INVALID_CONSENT"
    | "APPOINTMENT_TIME_UNAVAILABLE"
    | "AUTH_REQUIRED"
    | "RATE_LIMITED"
    | "INTERNAL_ERROR";
  /**
   * Human-readable error message suitable for end-user display.
   */
  message: string;
  /**
   * Whether the buyer agent SHOULD retry the same request after a backoff.
   */
  retryable: boolean;
  /**
   * Optional, code-specific details (e.g. validation failure paths). Free shape.
   */
  details?: {
    [k: string]: any;
  };
  /**
   * ISO 8601 / RFC 3339 timestamp at which the dealer agent generated this error (e.g. '2026-04-30T10:15:30Z'). MUST include a timezone offset (Z or ±HH:MM).
   */
  created_at: string;
}

/**
 * Public dealership profile: identity, location(s), brands carried, hours, contact channels, and high-level service capabilities. Returned by the `dealer.information` AAP skill, wrapped in `dealer.information.response` and carried inside an A2A `Message.parts[].data` DataPart via the `SendMessage` operation.
 */
export interface DealerInformation {
  /**
   * Stable dealer identifier.
   */
  dealer_id: string;
  /**
   * Legal/registered business name.
   */
  legal_name: string;
  /**
   * Public-facing trade name (e.g. 'Metro Honda San Francisco').
   */
  trade_name: string;
  /**
   * Vehicle brands the dealer is authorized to sell.
   */
  brands: string[];
  address: Address;
  /**
   * Geographic coordinates of the primary location.
   */
  geo?: {
    latitude: number;
    longitude: number;
  };
  /**
   * Phone contact channels (sales, service, parts), each with an E.164 phone number.
   */
  phones?: ContactPoint[];
  /**
   * Email contact channels.
   */
  emails?: ContactPoint[];
  /**
   * Dealer's primary public website.
   */
  website?: string;
  /**
   * Weekly business hours, keyed by day. Each day is either an object {open, close} (HH:MM 24h, dealer's local time) or null when closed.
   */
  schedule?: {
    monday?: DayHours;
    tuesday?: DayHours;
    wednesday?: DayHours;
    thursday?: DayHours;
    friday?: DayHours;
    saturday?: DayHours;
    sunday?: DayHours;
  };
  /**
   * IANA timezone identifier for the schedule, e.g. 'America/Los_Angeles'.
   */
  timezone?: string;
  /**
   * Free-text dealer notes (e.g. 'closed major holidays').
   */
  notes?: string;
  /**
   * Boolean flags for service capabilities offered by the dealer.
   */
  capabilities?: {
    test_drive?: boolean;
    financing?: boolean;
    trade_in?: boolean;
    service?: boolean;
    delivery?: boolean;
    remote_delivery?: boolean;
  };
}

/**
 * Typed AAP response for the `dealer.information` skill. Wraps a DealerInformation object inside the standard AAP response envelope (`{ type, data, message? }`). Carried inside an A2A `Message.parts[].data` DataPart returned from the `SendMessage` operation.
 */
export interface DealerInformationResponse {
  type: "dealer.information.response";
  data: DealerInformation;
  /**
   * Optional contextual note from the dealer or LLM. MAY be omitted.
   */
  message?: string;
}

/**
 * Typed AAP request for the `dealer.information` skill. The request carries no parameters; it asks for the dealer's static profile. Carried inside an A2A `Message.parts[].data` DataPart via the `SendMessage` operation.
 */
export interface DealerInformationRequest {
  /**
   * AAP message type. Skill ID plus role.
   */
  type: "dealer.information.request";
}

/**
 * Buyer/customer contact info attached to a `lead.submit.request` (which travels inside an A2A `Message.parts[].data` DataPart). At least one of email or phone MUST be present. When customer is present a ConsentGrant MUST also be present.
 */
export type Customer = {
  [k: string]: any;
} & {
  /**
   * Customer's first name.
   */
  first_name: string;
  /**
   * Customer's last name.
   */
  last_name: string;
  /**
   * Customer email (RFC 5322).
   */
  email?: string;
  /**
   * Customer phone in E.164 format, e.g. +14155550123.
   */
  phone?: string;
  /**
   * Channel preferred for follow-up. 'sms' is treated as text-message via 'phone'.
   */
  preferred_contact?: "email" | "phone" | "sms" | "any";
  address?: Address;
};

/**
 * Machine-readable AAP contract manifest published at /.well-known/auto-agent-contract.json. The agent card points to this manifest via the AAP extension's 'manifest_url' parameter. The manifest enumerates skills, their request/response schemas, and per-skill consent and anonymity rules so buyer agents (including LLM-driven ones) can plan calls deterministically.
 */
export interface ContractManifest {
  contract: {
    name: string;
    version: string;
    /**
     * Stable URI for this contract version.
     */
    uri: string;
  };
  dealer: {
    dealer_id: string;
    name: string;
    /**
     * Operator/integrator running this dealer agent on behalf of the dealership.
     */
    managed_by?: string;
    [k: string]: any;
  };
  /**
   * A2A binding configuration shared across all skills.
   */
  a2a: {
    endpoint: string;
    protocol_binding: "JSONRPC" | "HTTP+JSON";
    /**
     * @minItems 1
     */
    skills: [SkillBinding, ...SkillBinding[]];
  };
  /**
   * Authentication mode for invoking skills. 'null' means the agent is publicly callable; 'bearer' means clients MUST send 'Authorization: Bearer <token>'. LLM clients MUST treat 'bearer' as non-public and obtain credentials before invoking skills.
   */
  auth_type: null | "bearer";
  /**
   * Optional LLM guidance: a free-form rule list and a guide URL the dealer recommends LLM clients follow.
   */
  llm?: {
    guide_url?: string;
    rules?: string[];
  };
}

/**
 * Explicit consent record for a single `lead.submit` submission. Required whenever a `lead.submit.request` includes customer contact info (which is always — `customer` is required on the unified lead). Provides an auditable record of what the user authorized, when, through which channels, and via which buyer agent. A dealer agent MUST reject lead submissions with `CONTACT_CONSENT_REQUIRED` if a contact channel it intends to use is not present in `allowed_channels`.
 */
export interface ConsentGrant {
  /**
   * ISO 8601 / RFC 3339 timestamp at which the user authorized this share (e.g. '2026-04-30T11:05:00Z'). MUST include a timezone offset (Z or ±HH:MM).
   */
  granted_at: string;
  /**
   * Channels the user has authorized the dealer to use for follow-up.
   *
   * @minItems 1
   */
  allowed_channels: ["email" | "phone" | "sms", ...("email" | "phone" | "sms")[]];
  /**
   * Verbatim text the user agreed to (e.g. the disclosure shown by the buyer agent).
   */
  consent_text: string;
  /**
   * Identifier of the buyer agent that captured the consent (e.g. 'chatgpt-shopping', 'gemini-assistant', 'lumika-bdc').
   */
  source_agent: string;
  /**
   * Scope of the consent. v0.1 has a single value `lead_submission` covering the unified `lead.submit` skill (which spans general inquiries, vehicle interest, trade-in, and appointments). The request body itself shows what was actually submitted; the meaningful audit granularity is `allowed_channels`.
   *
   * @minItems 1
   * @maxItems 1
   */
  scope: ["lead_submission"];
  /**
   * Optional ISO 8601 / RFC 3339 timestamp after which this consent grant is no longer valid (e.g. '2027-04-30T11:05:00Z'). Useful for jurisdictions with mandatory re-consent windows (some US state TCPA-style rules cap consent at ~12 months for SMS). The dealer MUST reject `lead.submit` with `INVALID_CONSENT` if `expires_at` is in the past at the time the dealer would use the contact data.
   */
  expires_at?: string;
}

/**
 * An appointment request piggybacked on a `lead.submit.request`. The vehicle reference for the appointment is IMPLICIT — it is whatever is in the parent `vehicle_of_interest`. A standalone showroom visit can omit any vehicle. For a trade-in appraisal, the parent's `trade_in` is the vehicle being appraised.
 */
export interface Appointment {
  /**
   * Kind of appointment the buyer is requesting.
   */
  appointment_type: "test_drive" | "showroom_visit" | "handover" | "phone_call" | "video_call" | "trade_in_appraisal";
  /**
   * One or more time windows the buyer is available. Dealer agent MAY choose any (returning a `confirmed` appointment) or propose alternatives (returning a `proposed` appointment with `proposed_slots`). Each window's `start` and `end` are ISO 8601 / RFC 3339 timestamps and MUST include a timezone offset (Z or ±HH:MM).
   *
   * @minItems 1
   */
  requested_windows?: [
    {
      /**
       * ISO 8601 / RFC 3339 window start with timezone offset (e.g. '2026-05-03T18:00:00Z' or '2026-05-03T11:00:00-07:00').
       */
      start: string;
      /**
       * Optional ISO 8601 / RFC 3339 window end. When omitted, the dealer infers the end from `duration_minutes` or its own default.
       */
      end?: string;
    },
    ...{
      /**
       * ISO 8601 / RFC 3339 window start with timezone offset (e.g. '2026-05-03T18:00:00Z' or '2026-05-03T11:00:00-07:00').
       */
      start: string;
      /**
       * Optional ISO 8601 / RFC 3339 window end. When omitted, the dealer infers the end from `duration_minutes` or its own default.
       */
      end?: string;
    }[]
  ];
  /**
   * IANA timezone identifier (e.g. 'America/Los_Angeles') for interpreting `requested_windows`. Recommended when the buyer agent's locale differs from the dealer's.
   */
  timezone?: string;
  /**
   * Expected appointment duration in minutes. If omitted, the dealer applies its default for `appointment_type`.
   */
  duration_minutes?: number;
  /**
   * Free-text note from the buyer (e.g. 'I'd like to bring my partner', 'parking instructions please').
   */
  notes?: string;
}

/**
 * A2A v1.0-compatible agent card with the AAP automotive retail extension. Published at /.well-known/agent-card.json on a dealer-controlled domain. The 'capabilities.extensions' array MUST include an entry whose 'uri' equals 'https://autoagentprotocol.org/extensions/a2a-automotive-retail/v0.1' for the agent to be a compliant AAP dealer agent.
 */
export interface AgentCard {
  /**
   * Human-readable agent name.
   */
  name: string;
  /**
   * Short description of what this agent does.
   */
  description: string;
  /**
   * Agent version string (semver recommended).
   */
  version: string;
  /**
   * Organization operating the agent.
   */
  provider?: {
    organization: string;
    url?: string;
    [k: string]: any;
  };
  /**
   * URL to human-readable documentation describing this agent's behavior.
   */
  documentation_url?: string;
  /**
   * Network endpoints exposed by this agent. Each entry declares one A2A protocol binding. AAP v0.1 supports 'JSONRPC' and 'HTTP+JSON'; gRPC is out of scope.
   *
   * @minItems 1
   */
  supported_interfaces: [
    {
      url: string;
      /**
       * A2A protocol binding identifier. AAP v0.1 only documents JSONRPC and HTTP+JSON.
       */
      protocol_binding: "JSONRPC" | "HTTP+JSON";
      protocol_version?: string;
    },
    ...{
      url: string;
      /**
       * A2A protocol binding identifier. AAP v0.1 only documents JSONRPC and HTTP+JSON.
       */
      protocol_binding: "JSONRPC" | "HTTP+JSON";
      protocol_version?: string;
    }[]
  ];
  /**
   * A2A capability flags and extensions.
   */
  capabilities: {
    streaming?: boolean;
    push_notifications?: boolean;
    extended_agent_card?: boolean;
    /**
     * List of declared A2A extensions. MUST include an AAP automotive retail entry.
     */
    extensions: Extension[];
    [k: string]: any;
  };
  /**
   * Default content types accepted by this agent.
   */
  default_input_modes?: string[];
  /**
   * Default content types produced by this agent.
   */
  default_output_modes?: string[];
  /**
   * Skills the agent actually exposes. AAP defines 5 standard skill IDs (`dealer.information`, `inventory.facets`, `inventory.search`, `inventory.vehicle`, `lead.submit`); a compliant agent declares the subset it implements — anything from a single skill (e.g. just `inventory.search`) up to all five. AAP RECOMMENDS at least `inventory.search` plus `lead.submit` to deliver an end-to-end shopping flow, but neither is mandatory. Buyer agents MUST inspect `skills[]` to discover what is supported and MUST NOT assume any particular skill is implemented based solely on the AAP extension URI being present.
   */
  skills: Skill[];
  /**
   * A2A-style security scheme definitions. AAP v0.1 supports either no scheme (public agent) or a 'bearer' scheme.
   */
  security_schemes?: {
    [k: string]: any;
  };
  /**
   * Required security schemes (alternatives, by name). Empty or absent means anonymous access is allowed.
   */
  security_requirements?: {
    [k: string]: any;
  }[];
  [k: string]: any;
}

