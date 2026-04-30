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
 * Postal address using locale-neutral fields. ISO 3166-1 alpha-2 country code.
 */
export interface Address {
  /**
   * Primary street line.
   */
  line1: string;
  /**
   * Secondary street line (suite, apartment, building).
   */
  line2?: string;
  /**
   * City or locality.
   */
  city: string;
  /**
   * State, province, or region code (e.g. CA, NY, BC, MA).
   */
  region_code: string;
  /**
   * Postal or ZIP code.
   */
  postal_code: string;
  /**
   * ISO 3166-1 alpha-2 country code, e.g. US, CA, DE, PL.
   */
  country_code: string;
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
 * Minimal representation of a single vehicle as exposed by inventory.search results. The same shape is the base type for inventory.vehicle responses (VehicleDetail), which freely allows additional dealer-specific properties. Carried inside the typed AAP response payload (`inventory.search.response` and `inventory.vehicle.response`) which itself rides inside an A2A `Message.parts[].data` DataPart.
 */
export interface Vehicle {
  /**
   * Stable identifier of the dealer that owns this listing.
   */
  dealer_id: string;
  /**
   * Optional dealer-internal identifier when the vehicle is not yet VIN-decoded (e.g. an in-transit unit).
   */
  vehicle_id?: string;
  /**
   * Vehicle Identification Number (17 chars, ISO 3779).
   */
  vin?: string;
  /**
   * Dealer's stock number for this unit.
   */
  stock?: string;
  /**
   * Model year.
   */
  year: number;
  /**
   * Vehicle make / manufacturer brand (e.g. Honda, BMW, Ford).
   */
  make: string;
  /**
   * Vehicle model name (e.g. CR-V, 3 Series, F-150).
   */
  model: string;
  /**
   * Trim level (e.g. EX-L, M Sport, Lariat).
   */
  trim?: string;
  /**
   * Transmission type as text (e.g. 'automatic', 'manual', '8-speed automatic').
   */
  transmission?: string;
  /**
   * Free-text exterior color name.
   */
  exterior_color?: string;
  /**
   * Free-text interior color or upholstery name.
   */
  interior_color?: string;
  /**
   * Sale condition. 'certified' implies a manufacturer-backed certified pre-owned program.
   */
  condition: "new" | "used" | "certified";
  /**
   * Optional human-readable description / dealer notes for marketing copy.
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
  msrp?: Money;
  list_price?: Money1;
  offered_price?: Money2;
  price?: Money3;
  /**
   * Buyer ZIP/postal code used to compute regional pricing fields (offered_price). Optional; when absent, regional pricing fields MUST be omitted.
   */
  zip_code?: string;
  /**
   * Odometer reading in miles.
   */
  mileage?: number;
  /**
   * Public URLs of vehicle photos, ordered by relevance.
   */
  photos?: string[];
  /**
   * Public Vehicle Detail Page (VDP) URL on the dealer's website.
   */
  vdp_url?: string;
  /**
   * Free-text availability status (e.g. 'In Stock', 'In Transit', 'Pending', 'Sold', 'Reserved'). Spec recommends but does not enforce a controlled vocabulary.
   */
  status: string;
  /**
   * Dealer notes (e.g. 'recently arrived', 'service history available').
   */
  notes?: string;
  /**
   * Timestamp at which the dealer last verified availability/price/status of this listing. REQUIRED when the agent makes availability claims.
   */
  last_verified_at?: string;
  [k: string]: any;
}

/**
 * Typed AAP request for the `lead.vehicle` skill. Vehicle-specific inquiry; designed to be losslessly mappable to ADF/XML so that legacy dealer CRMs can ingest it directly. The `vehicles` array MUST contain at least one vehicle reference (vin / stock / vehicle_id, or year+make+model). When `customer` is present, `consent` is REQUIRED with scope including `vehicle_inquiry`. Carried inside an A2A `Message.parts[].data` DataPart via the `SendMessage` operation.
 */
export interface VehicleLeadRequest {
  type: "lead.vehicle.request";
  /**
   * Vehicles the user is interested in. At minimum one identifier (VIN, stock, vehicle_id) or year+make+model trio.
   *
   * @minItems 1
   */
  vehicles: [
    (
      | {
          [k: string]: any;
        }
      | {
          [k: string]: any;
        }
      | {
          [k: string]: any;
        }
      | {
          [k: string]: any;
        }
    ),
    ...(
      | {
          [k: string]: any;
        }
      | {
          [k: string]: any;
        }
      | {
          [k: string]: any;
        }
      | {
          [k: string]: any;
        }
    )[]
  ];
  /**
   * Purchase intent. Mapped to ADF '<vehicle interest>' attribute.
   */
  intent?: "buy" | "lease" | "trade_in" | "test_drive";
  /**
   * Optional financing preference. Mapped to ADF '<finance><method>'.
   */
  finance_type?: "cash" | "finance" | "lease";
  timeline?: "asap" | "1_3_months" | "3_6_months" | "flexible";
  /**
   * Optional trade-in vehicle details.
   */
  trade_in?: {
    year?: number;
    make?: string;
    model?: string;
    mileage?: number;
  };
  /**
   * Free-text message from the user.
   */
  message?: string;
  customer?: Customer;
  consent?: ConsentGrant;
  /**
   * Identifier of the buyer agent submitting the lead.
   */
  source_agent: string;
  /**
   * Buyer-agent timestamp at submission. Mapped to ADF '<requestdate>'.
   */
  submitted_at?: string;
}

/**
 * Extended vehicle representation returned by inventory.vehicle. Inherits all Vehicle fields and explicitly allows additional dealer-specific properties (e.g. equipment, history reports, certification details).
 */
export type VehicleDetail = Vehicle;

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
   * Optional buyer ZIP/postal code; when provided, the dealer MAY compute the regional offered_price field.
   */
  zip_code?: string;
};

/**
 * Typed AAP response for `lead.general` and `lead.vehicle`. Use AppointmentLeadResponse for `lead.appointment`. Carried inside an A2A `Message.parts[].data` DataPart returned from the `SendMessage` operation.
 */
export interface LeadResponse {
  /**
   * Concrete response type (general or vehicle).
   */
  type: "lead.general.response" | "lead.vehicle.response";
  data: {
    /**
     * Stable identifier assigned by the dealer for this lead.
     */
    lead_id: string;
    /**
     * Lead disposition. 'duplicate' means an equivalent lead already exists for this customer/vehicle. 'rejected' means the lead was not accepted (e.g. consent missing, channel not allowed); details in 'message' or returned via Error.
     */
    status: "received" | "duplicate" | "rejected";
    /**
     * Convenience contact summary the buyer agent can show the user.
     */
    dealer?: {
      name?: string;
      phone?: string;
    };
  };
  /**
   * Optional contextual note from the dealer (e.g. 'A sales rep will email Anna within 1 business day.').
   */
  message?: string;
}

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
 * Typed AAP request for the `lead.general` skill. Open-ended dealership inquiry not tied to a specific vehicle (e.g. financing question, trade-in interest, request for a callback). Customer info is optional but RECOMMENDED; when included, a ConsentGrant is REQUIRED with scope including `general_inquiry`. Carried inside an A2A `Message.parts[].data` DataPart via the `SendMessage` operation.
 */
export interface GeneralLeadRequest {
  type: "lead.general.request";
  /**
   * High-level reason the user is reaching out.
   */
  lead_intent?:
    | "financing_question"
    | "trade_in_interest"
    | "service_question"
    | "general_question"
    | "callback_request"
    | "other";
  /**
   * Free-text message from the user.
   */
  message: string;
  /**
   * Optional structured intent details.
   */
  intent?: {
    body_type?: string;
    fuel?: string;
    budget_max?: Money;
    timeline?: "asap" | "1_3_months" | "3_6_months" | "flexible";
  };
  customer?: Customer;
  consent?: ConsentGrant;
  /**
   * Identifier of the buyer agent submitting the lead (e.g. 'chatgpt-shopping-agent').
   */
  source_agent: string;
  /**
   * Buyer-agent timestamp at the moment of submission.
   */
  submitted_at?: string;
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
  body_types?: TermFacet;
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
 * Buyer/customer contact info attached to lead.* AAP request payloads (which travel inside an A2A DataPart). ADF-compatible: at least one of email or phone MUST be present when the customer block is included. When customer is present a ConsentGrant MUST also be present.
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
 * Explicit consent record for a single lead submission. Required whenever a `lead.*` AAP request payload (carried inside an A2A DataPart) includes customer contact info. Provides an auditable record of what the user authorized, when, and through which channels. A dealer agent MUST reject lead submissions with `CONTACT_CONSENT_REQUIRED` if a requested contact channel is not permitted by this grant.
 */
export interface ConsentGrant {
  /**
   * Timestamp at which the user authorized this share.
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
   * Scope of the consent. 'vehicle_inquiry' covers lead.vehicle, 'appointment' covers lead.appointment, 'general_inquiry' covers lead.general.
   *
   * @minItems 1
   */
  scope: [
    "general_inquiry" | "vehicle_inquiry" | "appointment",
    ...("general_inquiry" | "vehicle_inquiry" | "appointment")[]
  ];
}

/**
 * Typed AAP response for the `lead.appointment` skill. `requested` / `proposed` indicate non-confirmed states; `confirmed` indicates an auto-booked appointment. When the dealer cannot honor any of the user's windows, `proposed_slots` MAY be populated with alternatives. Carried inside an A2A `Message.parts[].data` DataPart returned from the `SendMessage` operation.
 */
export interface AppointmentLeadResponse {
  type: "lead.appointment.response";
  data: {
    appointment_id: string;
    status: "requested" | "proposed" | "confirmed" | "rejected";
    /**
     * Present when status is 'confirmed'.
     */
    confirmed_window?: {
      start: string;
      end?: string;
    };
    /**
     * Alternative dealer-proposed slots when status is 'proposed'.
     */
    proposed_slots?: {
      start: string;
      end?: string;
    }[];
    dealer?: {
      name?: string;
      phone?: string;
    };
  };
  /**
   * Optional contextual note from the dealer.
   */
  message?: string;
}

/**
 * Typed AAP request for the `lead.appointment` skill. Submits an appointment request (test drive, showroom visit, vehicle handover, phone call, video call, or trade-in appraisal). The dealer SHOULD respond with status `requested` / `proposed` if confirmation requires manual review, or `confirmed` if the slot is auto-booked. At least one requested time window MUST be provided unless the dealer policy explicitly allows open-ended scheduling. Carried inside an A2A `Message.parts[].data` DataPart via the `SendMessage` operation.
 */
export type AppointmentLeadRequest = {
  [k: string]: any;
} & {
  type: "lead.appointment.request";
  appointment_type: "test_drive" | "showroom_visit" | "handover" | "phone_call" | "video_call" | "trade_in_appraisal";
  /**
   * Vehicles attached to this appointment. REQUIRED when appointment_type is 'test_drive' or 'handover'.
   */
  vehicles?: {
    [k: string]: any;
  }[];
  /**
   * One or more datetime windows the user prefers. The dealer agent MUST honor at least one or respond with 'proposed' alternatives.
   *
   * @minItems 1
   */
  requested_windows?: [
    {
      start: string;
      end?: string;
    },
    ...{
      start: string;
      end?: string;
    }[]
  ];
  /**
   * IANA timezone (e.g. 'America/Los_Angeles') interpreting the requested windows.
   */
  timezone?: string;
  /**
   * Expected duration of the appointment.
   */
  duration_minutes?: number;
  /**
   * Free-text note from the user.
   */
  message?: string;
  customer?: Customer;
  consent?: ConsentGrant;
  /**
   * Identifier of the buyer agent submitting the request.
   */
  source_agent: string;
  submitted_at?: string;
};

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
   * Skills exposed by this agent. AAP-compliant agents MUST declare all 7 required skills (dealer.information, inventory.facets, inventory.search, inventory.vehicle, lead.general, lead.vehicle, lead.appointment).
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

