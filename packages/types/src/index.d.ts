// Auto-generated from JSON Schema — do not edit
// Auto Agent Protocol v0.2

/**
 * Postal address. All fields are OPTIONAL by design — the buyer agent should pass through whatever pieces of the address are available (e.g. just a ZIP for regional pricing, or just city+state, or the full street address). The dealer is responsible for handling partial addresses gracefully.
 */
export interface Address {
  /**
   * Country code or name (e.g. 'US'). Optional; defaults to 'US' when omitted.
   */
  country?: string;
  /**
   * State / region code or full name (e.g. 'CA' or 'California').
   */
  state?: string;
  /**
   * City or locality (e.g. 'San Francisco').
   */
  city?: string;
  /**
   * Primary street line (e.g. '1280 Howard Street').
   */
  address_line_1?: string;
  /**
   * Secondary street line (suite, apartment, building, floor).
   */
  address_line_2?: string;
  /**
   * Postal / ZIP code (e.g. '94103' or '94103-1234').
   */
  zip?: string;
}

/**
 * Abstract base shape for every typed Auto Agent Protocol payload that travels inside an A2A DataPart. Concrete request and response schemas restrict 'type' to a constant skill-id-shaped value (e.g. inventory.search.request, lead.appointment.response). The AAP version is announced once via the agent-card extension URI ('https://autoagentprotocol.org/extensions/a2a-automotive-retail/v0.2') and reflected in schema $id URLs; it is NOT repeated on the wire. Responses additionally carry a 'data' object and an optional 'message' note. Errors use the Error schema instead.
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
 * The single vehicle interface used everywhere a vehicle is referenced — inventory.search results, inventory.vehicle detail, vehicle_of_interest, and trade_in. v0.2 merges the former Vehicle + VehicleDetail split into one shape: there is now exactly one vehicle type.
 *
 * Field semantics differ by context:
 * - For inventory listings (inventory.search / inventory.vehicle) `condition` MUST be one of `new`, `used`, `cpo` and `status` MUST be one of `available`, `intransit`, `pending`. Pricing fields describe the dealer's listing.
 * - For vehicle_of_interest, `condition` MUST be one of `new`, `used`, `cpo`.
 * - For trade_in, `condition` MUST be one of `excellent`, `good`, `fair`, `poor`. Pricing fields are typically absent on the request side and may be populated by the dealer's appraisal response.
 *
 * All prices are plain integers in whole US dollars (v0.2 dropped the nested {amount, currency} Money object). Context-dependent constraints are enforced at the using request/response schema. No fields are required at this base schema; `additionalProperties: true` lets inventory responses carry richer dealer-specific fields without schema changes.
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
   * Combined condition enum spanning both sale-condition and trade-in-condition vocabularies. For inventory listings and vehicle_of_interest use one of `new` | `used` | `cpo` (Certified Pre-Owned). For trade_in use one of `excellent` | `good` | `fair` | `poor`. The using schema enforces the correct subset by context.
   */
  condition?: "new" | "used" | "cpo" | "excellent" | "good" | "fair" | "poor";
  /**
   * Inventory availability. v0.2 supports exactly three values: `available` (in stock now), `intransit` (allocated / en route to the dealership), `pending` (deal in progress). A vehicle in any other state is OUT OF STOCK and MUST NOT appear in inventory feeds — dealers omit it and buyer agents ignore any item missing or carrying an unknown status. Required on inventory listings; omitted on vehicle_of_interest and trade_in.
   */
  status?: "available" | "intransit" | "pending";
  /**
   * Which dealership location/rooftop holds this vehicle, identified by the rooftop's `name` from dealer.information. Nullable; single-rooftop dealers MAY leave it null.
   */
  rooftop?: string | null;
  /**
   * Manufacturer's Suggested Retail Price (sticker price), whole US dollars. Inventory context.
   */
  msrp?: number;
  /**
   * FTC-emphasized FINAL out-the-door price after all incentives, mandatory fees, and required add-ons, in whole US dollars. Per FTC enforcement (CARS Rule), this field MUST reflect the total amount the buyer would pay; advertising a 'price' that excludes required fees or omits required add-ons is a violation. Inventory context.
   */
  price?: number;
  /**
   * Dealer's advertised list price; the base price BEFORE incentives, taxes, or fees, in whole US dollars. Inventory context.
   */
  list_price?: number;
  /**
   * Regional price equal to list_price plus applicable taxes for the buyer's `zip`, in whole US dollars, when the dealer enables desking. Present only if a `zip` is supplied AND the dealer supports regional pricing. Inventory context.
   */
  offered_price?: number;
  /**
   * Buyer ZIP code used to compute regional pricing fields (`offered_price`). US ZIP, 5 digits or ZIP+4. Optional; when absent, regional pricing fields MUST be omitted.
   */
  zip?: string;
  /**
   * Dealer's stock number for this unit. Inventory and vehicle_of_interest contexts.
   */
  stock?: string;
  /**
   * Stable identifier of the dealer that owns this listing. Inventory context.
   */
  dealer_id?: string;
  /**
   * Dealer-internal identifier when the vehicle is not yet VIN-decoded (e.g. an in-transit unit).
   */
  vehicle_id?: string;
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
   * EPA city fuel-economy estimate in miles per gallon. Omit for fully electric vehicles (use `electric_range_mi`).
   */
  city_mpg?: number;
  /**
   * EPA highway fuel-economy estimate in miles per gallon. Omit for fully electric vehicles (use `electric_range_mi`).
   */
  highway_mpg?: number;
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
   * Notable equipment and options as free-text strings (e.g. 'Adaptive Cruise Control', 'Apple CarPlay', 'Heated Front Seats'). v0.2 uses one flat list and does not separate option packages, factory equipment, or installed accessories.
   */
  features?: string[];
  /**
   * Public URLs of vehicle photos, ordered by relevance.
   */
  photos?: string[];
  /**
   * Public Vehicle Detail Page (VDP) URL on the dealer's website.
   */
  vdp_url?: string;
  /**
   * Human-readable description / dealer marketing copy.
   */
  description?: string;
  /**
   * Dealer notes (e.g. 'recently arrived', 'service history available').
   */
  notes?: string;
  /**
   * Date (RFC 3339 full-date, e.g. '2026-04-21') the vehicle first appeared in the dealership's inventory.
   */
  inventory_date?: string;
  /**
   * ISO 8601 / RFC 3339 timestamp (with timezone offset) of the last update to this vehicle's availability, price, or status (e.g. '2026-04-30T08:42:00Z'). Buyer agents treat this as the freshness signal for availability claims.
   */
  updated_at?: string;
  [k: string]: any;
}

/**
 * Typed AAP response for the `inventory.vehicle` skill. The `data` field is a Vehicle (v0.2 unified the former Vehicle + VehicleDetail into one type). Because it is always an inventory listing, `condition` is constrained to `new` | `used` | `cpo` and `status` (one of `available` | `intransit` | `pending`) is required. Carried inside an A2A `Message.parts[].data` DataPart returned from the `SendMessage` operation.
 */
export interface VehicleDetailResponse {
  type: "inventory.vehicle.response";
  data: Vehicle & {
    condition?: "new" | "used" | "cpo";
    [k: string]: any;
  };
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
 * Dealer agent's response to a `lead.submit.request`. Carries the assigned `lead_id` and overall lead `status`, plus an optional appointment block when the request included an `appointment` (the dealer can confirm the requested time, propose alternatives, leave it as merely requested for human follow-up, or reject the appointment while still accepting the lead). Carried inside an A2A `Message.parts[].data` DataPart via `SendMessage`.
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
       * Appointment status. `requested` = received but not yet scheduled (staff will follow up). `proposed` = dealer cannot honor the requested time but is offering alternatives in `proposed_times`. `confirmed` = dealer scheduled the appointment for `confirmed_at`. `rejected` = dealer cannot host this appointment (e.g. service unavailable).
       */
      status: "requested" | "proposed" | "confirmed" | "rejected";
      /**
       * Present iff `status` is `confirmed`. The scheduled start time as an ISO 8601 / RFC 3339 timestamp with timezone offset.
       */
      confirmed_at?: string;
      /**
       * Present iff `status` is `proposed`. Alternative start times the dealer offers, each an ISO 8601 / RFC 3339 timestamp with timezone offset.
       *
       * @minItems 1
       */
      proposed_times?: [string, ...string[]];
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
 * Unified lead submission for the `lead.submit` AAP skill. A single request carries the consented customer plus any combination of `vehicle_of_interest`, `trade_in`, and `appointment` — matching how dealerships actually take leads (e.g. test-drive a new car while getting a trade-in appraised in the same visit).
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
     * Vehicles in this page, in the requested order. Each item is a Vehicle constrained to the sale-condition vocabulary (`new`|`used`|`cpo`) — inventory listings never carry trade-in wear values — and MUST carry a `status` of `available`, `intransit`, or `pending`. Out-of-stock vehicles are never returned.
     */
    vehicles: (Vehicle & {
      condition?: "new" | "used" | "cpo";
      [k: string]: any;
    })[];
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
     * Field to sort by. Sorting by 'price' uses the FTC-final 'price' field (which dealers MUST keep accurate); 'updated_at' sorts by listing freshness.
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
      | "updated_at";
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
 * Minimal AAP event envelope. Used for asynchronous status updates (e.g. lead status changes, appointment confirmations) delivered via A2A push notifications or task status update events.
 */
export type Event = {
  [k: string]: any;
} & {
  type: "aap.event";
  /**
   * Concrete event kind. v0.2 defines two kinds; future versions may add more.
   */
  event_kind: "lead.status_changed" | "appointment.status_changed";
  /**
   * Identifier of the affected entity (lead_id or appointment_id).
   */
  entity_id: string;
  /**
   * New status value for the entity. For 'lead.status_changed', one of: received | duplicate | rejected | working | sold_to | lost. For 'appointment.status_changed', one of: requested | proposed | confirmed | rejected | completed | no_show. Conditional `if/then` clauses below enforce the right subset for each `event_kind`.
   */
  status: string;
  /**
   * ISO 8601 / RFC 3339 timestamp at which the event occurred (e.g. '2026-04-30T10:15:30Z'). MUST include a timezone offset (Z or ±HH:MM).
   */
  occurred_at: string;
  /**
   * Optional event-specific payload. Schema is event-kind-dependent and dealer-defined.
   */
  payload?: {
    [k: string]: any;
  };
};

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
    | "IDEMPOTENCY_CONFLICT"
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
 * Public dealership profile. v0.2 reduces this to the minimum: a dealer group `name`, an optional `welcome_message`, and one or more `rooftops` (physical locations). Per-location identity, address, geo, contacts, hours, and service capabilities live on each rooftop. Vehicles reference the rooftop that holds them via `Vehicle.rooftop` = the rooftop's `name`. Returned by the `dealer.information` AAP skill, wrapped in `dealer.information.response` and carried inside an A2A `Message.parts[].data` DataPart via the `SendMessage` operation.
 */
export interface DealerInformation {
  /**
   * Dealer group / business name shown to buyers (e.g. 'Demo Auto Group').
   */
  name: string;
  /**
   * Optional greeting a buyer agent MAY surface to the user (e.g. 'Welcome to Demo Auto Group — happy to help by phone, video, or in person.').
   */
  welcome_message?: string;
  /**
   * One or more dealership locations (rooftops). A single-location dealer has one entry; a multi-rooftop group lists each store.
   *
   * @minItems 1
   */
  rooftops: [Rooftop, ...Rooftop[]];
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
 * Explicit consent record for a single `lead.submit` submission. Required whenever a `lead.submit.request` includes customer contact info (which is always — `customer` is required on the unified lead). Provides an auditable record of what the user authorized, when, through which channels, and via which buyer agent.
 *
 * Error-code mapping: a dealer agent MUST reject lead submissions with `CONTACT_CONSENT_REQUIRED` if `consent` is missing entirely; with `INVALID_CONSENT` if the grant is malformed, `expires_at` has passed at the time the dealer would use the contact data, or the dealer intends to use a contact channel not present in `allowed_channels`.
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
   * Verbatim text the user agreed to (e.g. the disclosure shown by the buyer agent). MUST be non-empty — this is the audit trail of what the user actually saw.
   */
  consent_text: string;
  /**
   * Identifier of the buyer agent that captured the consent (e.g. 'chatgpt-shopping', 'gemini-assistant', 'lumika-bdc').
   */
  source_agent: string;
  /**
   * Scope of the consent. AAP defines a single value `lead_submission` covering the unified `lead.submit` skill (which spans general inquiries, vehicle interest, trade-in, and appointments). The request body itself shows what was actually submitted; the meaningful audit granularity is `allowed_channels`.
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
 * An appointment request piggybacked on a `lead.submit.request`. The vehicle reference for the appointment is IMPLICIT — it is whatever is in the parent `vehicle_of_interest` (or `trade_in` for a trade-in appraisal). A standalone sales or service visit can omit any vehicle.
 */
export interface Appointment {
  /**
   * Kind of appointment the buyer is requesting.
   */
  appointment_type: "sales" | "service" | "test_drive" | "trade_in";
  /**
   * Requested start time of the appointment as an ISO 8601 / RFC 3339 timestamp that MUST include a timezone offset (Z or ±HH:MM), e.g. '2026-05-03T11:00:00-07:00'. Optional — when omitted, the dealer follows up to schedule a time.
   */
  appointment_at?: string;
  /**
   * Expected appointment duration in minutes. If omitted, the dealer applies its default for `appointment_type`.
   */
  duration_minutes?: number;
  /**
   * Free-text note from the buyer (e.g. 'I'd like to bring my partner', 'parking instructions please').
   */
  notes?: string;
}

