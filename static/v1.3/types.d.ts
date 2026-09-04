// Auto-generated from JSON Schema — do not edit
// Auto Agent Protocol 1.3.0

/**
 * Abstract base shape for every typed Auto Agent Protocol payload that travels inside an A2A DataPart. Concrete request and response schemas restrict 'type' to a constant skill-id-shaped value (e.g. inventory.search.request, lead.submit.response). The AAP version is announced once via the agent-card extension URI ('https://autoagentprotocol.org/extensions/aap/v1.3') and reflected in schema $id URLs; it is NOT repeated on the wire. Responses additionally carry a 'data' object and an optional 'message' note. Errors use the Error schema instead.
 */
export interface AapMessage {
  /**
   * AAP message type identifier. For skill calls: '<scope>.<thing>.request' or '<scope>.<thing>.response' (e.g. 'inventory.search.request', 'lead.submit.response'). For envelopes: 'aap.event', 'aap.error'.
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
 * One mandatory, non-government charge or dealer-required add-on, expressed in whole US dollars. Examples include a documentation fee or a required pre-installed protection product. When used with Vehicle.price, the amount is already included in that authoritative price. When supplied without Vehicle.price, it is informational and MUST NOT be used to derive a payable price. Do not include sales tax, title, registration, other government charges, or optional products. Fee names SHOULD be specific enough for a buyer to understand what the charge represents and MUST be unique within one fees array.
 */
export interface DealerFee {
  /**
   * Buyer-facing name of the mandatory charge or dealer-required add-on.
   */
  name: string;
  /**
   * Amount in whole US dollars. When Vehicle.price is present, this amount is already included and MUST NOT be added again. Without Vehicle.price, the amount is informational only.
   */
  amount: number;
}

/**
 * A2A v1.0 AgentCard carrying the AAP automotive-retail extension. Published at /.well-known/agent-card.json on a dealer-controlled domain. A2A v1.0 declares every transport in 'supportedInterfaces[]' (it replaced the earlier top-level 'url'/'preferredTransport'/'additionalInterfaces' and top-level 'protocolVersion'). AAP v1.3 uses a single transport: JSON-RPC 2.0. A compliant AAP dealer agent advertises a JSONRPC interface in 'supportedInterfaces[]' and does not advertise any other transport for AAP. To be a compliant AAP dealer agent, 'capabilities.extensions' MUST include an entry whose 'uri' equals 'https://autoagentprotocol.org/extensions/aap/v1.3'.
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
   * The A2A v1.0 service interfaces (transport + endpoint). AAP v1.3 uses a single transport: a JSONRPC interface is REQUIRED and is the only transport an AAP agent advertises (every AAP client can rely on it). The HTTP+JSON (REST) binding was removed in v1.1; gRPC is out of scope. The protocolBinding enum still lists 'HTTP+JSON' for raw A2A compatibility, but AAP v1.3 advertises only 'JSONRPC'.
   *
   * @minItems 1
   */
  supportedInterfaces: [
    {
      /**
       * Endpoint URL for this interface.
       */
      url: string;
      /**
       * The A2A transport binding available at this URL.
       */
      protocolBinding: "JSONRPC" | "HTTP+JSON";
      /**
       * The A2A protocol version this interface exposes (Major.Minor), e.g. '1.0'.
       */
      protocolVersion: string;
      [k: string]: any;
    },
    ...{
      /**
       * Endpoint URL for this interface.
       */
      url: string;
      /**
       * The A2A transport binding available at this URL.
       */
      protocolBinding: "JSONRPC" | "HTTP+JSON";
      /**
       * The A2A protocol version this interface exposes (Major.Minor), e.g. '1.0'.
       */
      protocolVersion: string;
      [k: string]: any;
    }[]
  ];
  /**
   * Organization operating the agent.
   */
  provider?: {
    organization: string;
    url: string;
    [k: string]: any;
  };
  /**
   * Agent document version string (semver recommended).
   */
  version: string;
  /**
   * URL to human-readable documentation describing this agent's behavior.
   */
  documentationUrl?: string;
  /**
   * A2A capability flags and extensions.
   */
  capabilities: {
    streaming?: boolean;
    pushNotifications?: boolean;
    /**
     * Declared A2A extensions. MUST include the AAP automotive-retail v1.3 entry.
     */
    extensions: Extension[];
    [k: string]: any;
  };
  /**
   * Default media types accepted by this agent across all skills.
   */
  defaultInputModes: string[];
  /**
   * Default media types produced by this agent across all skills.
   */
  defaultOutputModes: string[];
  /**
   * Skills the agent exposes. AAP defines 5 standard skill IDs (`dealer.information`, `inventory.facets`, `inventory.search`, `inventory.vehicle`, `lead.submit`); a compliant agent declares the subset it implements. Buyer agents MUST inspect `skills[]` to discover what is supported.
   */
  skills: Skill[];
  /**
   * A2A security scheme definitions. AAP agents are public by default (no scheme).
   */
  securitySchemes?: {
    [k: string]: any;
  };
  /**
   * Required security schemes (alternatives, by name). Empty or absent means anonymous access is allowed.
   */
  security?: {
    [k: string]: any;
  }[];
  iconUrl?: string;
  [k: string]: any;
}
export interface Extension {
  uri: string;
  description?: string;
  required?: boolean;
  params?: {
    [k: string]: any;
  };
  [k: string]: any;
}
/**
 * An A2A AgentSkill. AAP v1.3 cards do NOT carry per-skill natural-language `examples` — AAP is JSON-only, with no NL prompt examples. AAP publishes each skill's request/response JSON Schema URLs in the AAP extension's `params.skills` map as `params.skills["<id>"].request_schema` / `response_schema` (see capabilities.extensions[].params) — NOT as fields on the skill — because strict A2A AgentCard parsers reject unknown skill fields.
 */
export interface Skill {
  /**
   * Skill identifier. AAP standard skill IDs: `dealer.information`, `inventory.facets`, `inventory.search`, `inventory.vehicle`, `lead.submit`. Agents MAY declare any subset, plus additional non-AAP skill IDs.
   */
  id: string;
  name: string;
  description: string;
  /**
   * Keywords describing the skill. REQUIRED by A2A so clients/LLMs can categorize and rank skills.
   *
   * @minItems 1
   */
  tags: [string, ...string[]];
  inputModes?: string[];
  outputModes?: string[];
  [k: string]: any;
}

/**
 * An appointment request piggybacked on a `lead.submit.request`. The vehicle reference for the appointment is IMPLICIT — it is whatever is in the parent `vehicle_of_interest` (or `trade_in` for a trade-in appraisal). A standalone sales or service visit can omit any vehicle.
 */
export interface Appointment {
  /**
   * Kind of appointment the buyer is requesting. `sales` = general sales consultation, `service` = service/maintenance visit, `test_drive` = test drive of the `vehicle_of_interest` (also covers a motorcycle demo ride when `vehicle_type = motorcycle`), `trade_in` = in-person trade-in appraisal of the `trade_in` vehicle.
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
 * Buyer/customer contact info attached to a `lead.submit.request` (which travels inside an A2A `Message.parts[].data` DataPart). At least one of email or phone MUST be present. When customer is present a ConsentGrant MUST also be present.
 */
export type Customer = {
  [k: string]: any;
} & {
  /**
   * Customer's given (first) name.
   */
  first_name: string;
  /**
   * Customer's family (last) name.
   */
  last_name: string;
  /**
   * Customer email address (RFC 5322). At least one of `email` or `phone` MUST be present.
   */
  email?: string;
  /**
   * Customer phone number in E.164 format (leading '+' and country code, digits only). At least one of `email` or `phone` MUST be present.
   */
  phone?: string;
  /**
   * Channel preferred for follow-up. 'sms' is treated as text-message via 'phone'.
   */
  preferred_contact?: "email" | "phone" | "sms" | "any";
  address?: Address;
};

/**
 * Typed AAP request for the `dealer.information` skill. The request carries no parameters; it asks for the dealer's static profile. Carried inside an A2A `Message.parts[].data` DataPart via the A2A `SendMessage` operation.
 */
export interface DealerInformationRequest {
  /**
   * AAP message type. Skill ID plus role.
   */
  type: "dealer.information.request";
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
 * Public dealership profile. A dealer group has a `name`, an optional `welcome_message`, and one or more `rooftops` (physical locations). Per-location identity, address, geo, contacts, hours, default dealer fees, and service capabilities live on each rooftop. Vehicles reference the rooftop that holds them via `Vehicle.rooftop` = the rooftop's `name`. Rooftop fees are publisher defaults and discovery metadata only: if an inventory publisher emits Vehicle.fees, it materializes the complete effective vehicle itemization, and consumers never join or merge fee arrays. Returned by the `dealer.information` AAP skill, wrapped in `dealer.information.response` and carried inside an A2A `Message.parts[].data` DataPart via the A2A `SendMessage` operation.
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
 * A single dealership location.
 */
export interface Rooftop {
  /**
   * Rooftop name shown to buyers and referenced by `Vehicle.rooftop` (e.g. 'Demo Toyota San Francisco').
   */
  name: string;
  /**
   * Legal / registered business name for this location.
   */
  legal_name?: string;
  /**
   * Public website for this rooftop.
   */
  website?: string;
  /**
   * Geographic coordinates of this rooftop.
   */
  geo?: {
    latitude: number;
    longitude: number;
  };
  /**
   * Email contact channels for this rooftop.
   */
  emails?: NamedValue[];
  /**
   * Phone contact channels for this rooftop.
   */
  phones?: NamedValue[];
  address?: Address;
  /**
   * Named weekly schedules for this rooftop (e.g. a 'sales' schedule and a 'service' schedule).
   */
  schedules?: Schedule[];
  /**
   * IANA timezone identifier for this rooftop's schedules (e.g. 'America/Los_Angeles').
   */
  timezone?: string;
  /**
   * Free-text notes (e.g. 'closed major holidays').
   */
  notes?: string;
  /**
   * Complete default schedule of mandatory, non-government dealer charges and required add-ons for vehicles at this rooftop. Omitted means the rooftop has not disclosed its default fee schedule; an empty array means it affirmatively reports no such charges. These are publisher defaults and discovery metadata only. An inventory publisher MAY use them when constructing listings. Vehicle-level `fees` remains optional even when `price` is present; when supplied, it is the complete effective vehicle itemization. Consumers MUST NOT join or merge rooftop and vehicle fee arrays. If a vehicle differs from these defaults, its `fees` array replaces this array in full.
   */
  fees?: DealerFee[];
  /**
   * Services this rooftop offers, as free-text tags (e.g. 'sales', 'service', 'parts', 'financing', 'trade_in', 'delivery'). Rooftops MAY also advertise which vehicle types they sell with tags such as 'motorcycle_sales' or 'powersports', so buyer agents know the vehicle_type mix before searching.
   */
  capabilities?: string[];
}
/**
 * A labeled contact value (e.g. name 'Sales', value '+14155550100' or 'sales@dealer.example').
 */
export interface NamedValue {
  /**
   * Channel label (e.g. 'Sales', 'Service', 'Parts').
   */
  name?: string;
  /**
   * The contact value itself — the email address or phone number.
   */
  value: string;
}
/**
 * A named weekly schedule (e.g. name 'sales' or 'service' with its own weekly hours).
 */
export interface Schedule {
  /**
   * Schedule label (e.g. 'sales', 'service').
   */
  name?: string;
  value: WeeklyHours;
}
/**
 * Hours keyed by day. Each day is {open, close} or null when closed.
 */
export interface WeeklyHours {
  /**
   * A single day's hours — {open, close} in 24h HH:MM (rooftop local time) or null when closed.
   */
  monday?: {
    open: string;
    close: string;
  } | null;
  /**
   * A single day's hours — {open, close} in 24h HH:MM (rooftop local time) or null when closed.
   */
  tuesday?: {
    open: string;
    close: string;
  } | null;
  /**
   * A single day's hours — {open, close} in 24h HH:MM (rooftop local time) or null when closed.
   */
  wednesday?: {
    open: string;
    close: string;
  } | null;
  /**
   * A single day's hours — {open, close} in 24h HH:MM (rooftop local time) or null when closed.
   */
  thursday?: {
    open: string;
    close: string;
  } | null;
  /**
   * A single day's hours — {open, close} in 24h HH:MM (rooftop local time) or null when closed.
   */
  friday?: {
    open: string;
    close: string;
  } | null;
  /**
   * A single day's hours — {open, close} in 24h HH:MM (rooftop local time) or null when closed.
   */
  saturday?: {
    open: string;
    close: string;
  } | null;
  /**
   * A single day's hours — {open, close} in 24h HH:MM (rooftop local time) or null when closed.
   */
  sunday?: {
    open: string;
    close: string;
  } | null;
}
/**
 * A single day's hours — {open, close} in 24h HH:MM (rooftop local time) or null when closed.
 */
export type DayHours = {
  open: string;
  close: string;
} | null;

/**
 * Hours keyed by day. Each day is {open, close} or null when closed.
 */
export interface WeeklyHours {
  monday?: DayHours;
  tuesday?: DayHours;
  wednesday?: DayHours;
  thursday?: DayHours;
  friday?: DayHours;
  saturday?: DayHours;
  sunday?: DayHours;
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
 * Minimal AAP event envelope. Used for asynchronous status updates (e.g. lead status changes, appointment confirmations) delivered via A2A push notifications or task status update events.
 */
export type Event = {
  [k: string]: any;
} & {
  type: "aap.event";
  /**
   * Concrete event kind. v1.0 defines two kinds; future versions may add more.
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
 * A term facet: each entry pairs a distinct field value with the count of matching vehicles.
 */
export type TermFacet = {
  /**
   * A distinct value observed for this field across the matching set (e.g. a make, model, or year).
   */
  value: string | number;
  /**
   * Number of matching vehicles carrying this value.
   */
  count: number;
}[];
/**
 * A term facet: each entry pairs a distinct field value with the count of matching vehicles.
 */
export type TermFacet1 = {
  /**
   * A distinct value observed for this field across the matching set (e.g. a make, model, or year).
   */
  value: string | number;
  /**
   * Number of matching vehicles carrying this value.
   */
  count: number;
}[];
/**
 * A term facet: each entry pairs a distinct field value with the count of matching vehicles.
 */
export type TermFacet2 = {
  /**
   * A distinct value observed for this field across the matching set (e.g. a make, model, or year).
   */
  value: string | number;
  /**
   * Number of matching vehicles carrying this value.
   */
  count: number;
}[];
/**
 * A term facet: each entry pairs a distinct field value with the count of matching vehicles.
 */
export type TermFacet3 = {
  /**
   * A distinct value observed for this field across the matching set (e.g. a make, model, or year).
   */
  value: string | number;
  /**
   * Number of matching vehicles carrying this value.
   */
  count: number;
}[];
/**
 * A term facet: each entry pairs a distinct field value with the count of matching vehicles.
 */
export type TermFacet4 = {
  /**
   * A distinct value observed for this field across the matching set (e.g. a make, model, or year).
   */
  value: string | number;
  /**
   * Number of matching vehicles carrying this value.
   */
  count: number;
}[];
/**
 * A term facet: each entry pairs a distinct field value with the count of matching vehicles.
 */
export type TermFacet5 = {
  /**
   * A distinct value observed for this field across the matching set (e.g. a make, model, or year).
   */
  value: string | number;
  /**
   * Number of matching vehicles carrying this value.
   */
  count: number;
}[];
/**
 * A term facet: each entry pairs a distinct field value with the count of matching vehicles.
 */
export type TermFacet6 = {
  /**
   * A distinct value observed for this field across the matching set (e.g. a make, model, or year).
   */
  value: string | number;
  /**
   * Number of matching vehicles carrying this value.
   */
  count: number;
}[];

/**
 * Aggregated facet counts and ranges over a dealer's inventory. Returned by the `inventory.facets` AAP skill (wrapped in `inventory.facets.response`) and OPTIONALLY embedded in `inventory.search` responses. Both responses travel inside an A2A `Message.parts[].data` DataPart via the A2A `SendMessage` operation.
 */
export interface Facets {
  makes?: TermFacet;
  models?: TermFacet;
  trims?: TermFacet;
  years?: TermFacet;
  conditions?: TermFacet;
  transmissions?: TermFacet;
  fuels?: TermFacet;
  dc_fast_charge?: TermFacet1;
  charge_ports?: TermFacet2;
  drivelines?: TermFacet3;
  bodies?: TermFacet4;
  vehicle_types?: TermFacet5;
  exterior_colors?: TermFacet;
  interior_colors?: TermFacet;
  rooftops?: TermFacet6;
  statuses?: TermFacet;
  price_range?: RangeFacet;
  mileage_range?: RangeFacet1;
  year_range?: RangeFacet1;
  displacement_cc_range?: RangeFacet2;
  electric_range_mi_range?: RangeFacet3;
}
/**
 * Observed minimum and maximum of authoritative Vehicle.price values. Vehicles without `price` do not contribute; omit `price_range` when no matching vehicle has `price`.
 */
export interface RangeFacet {
  /**
   * Lowest observed value for this field across the matching set.
   */
  min: number;
  /**
   * Highest observed value for this field across the matching set.
   */
  max: number;
}
/**
 * A numeric range facet: the observed min and max for a field across the matching set.
 */
export interface RangeFacet1 {
  /**
   * Lowest observed value for this field across the matching set.
   */
  min: number;
  /**
   * Highest observed value for this field across the matching set.
   */
  max: number;
}
/**
 * A numeric range facet: the observed min and max for a field across the matching set.
 */
export interface RangeFacet2 {
  /**
   * Lowest observed value for this field across the matching set.
   */
  min: number;
  /**
   * Highest observed value for this field across the matching set.
   */
  max: number;
}
/**
 * A numeric range facet: the observed min and max for a field across the matching set.
 */
export interface RangeFacet3 {
  /**
   * Lowest observed value for this field across the matching set.
   */
  min: number;
  /**
   * Highest observed value for this field across the matching set.
   */
  max: number;
}

/**
 * Typed AAP request for the `inventory.facets` skill. An optional `filters` block scopes the facets to a subset of inventory (e.g. `condition: ['used']`). Carried inside an A2A `Message.parts[].data` DataPart via the A2A `SendMessage` operation.
 */
export interface InventoryFacetsRequest {
  type: "inventory.facets.request";
  filters?: Filters;
}
/**
 * Optional filters to scope facet aggregation. Same shape as inventory.search filters; all fields are optional.
 */
export interface Filters {
  /**
   * Vehicle makes to include (e.g. ['Honda','BMW']).
   */
  make?: string[];
  /**
   * Vehicle models to include.
   */
  model?: string[];
  /**
   * Trim levels to include.
   */
  trim?: string[];
  /**
   * Sale conditions to include. Inventory uses the sale-condition vocabulary (`new` | `used` | `cpo`).
   */
  condition?: ("new" | "used" | "cpo")[];
  /**
   * Vehicle types to include (e.g. ['motorcycle']). Omit to search all types; a value absent on a listing is treated as 'car'.
   */
  vehicle_type?: ("car" | "motorcycle" | "trailer" | "rv" | "other")[];
  transmission?: string[];
  fuel?: string[];
  /**
   * Minimum electric range in miles, applied against `electric_range_mi`. Generic electric filter (EV cars and electric motorcycles).
   */
  electric_range_mi_min?: number;
  /**
   * Maximum electric range in miles, applied against `electric_range_mi`. Generic electric filter.
   */
  electric_range_mi_max?: number;
  /**
   * When true, include only units that support DC fast charging (matches `Vehicle.dc_fast_charge`). Generic electric filter.
   */
  dc_fast_charge?: boolean;
  /**
   * EV charge/plug connectors to include (e.g. ['nacs','ccs']), matching `Vehicle.charge_port`.
   */
  charge_port?: string[];
  /**
   * Drivetrain layouts to include (e.g. ['awd']). Car context.
   */
  driveline?: string[];
  /**
   * Body styles / segments to include, applicable to any vehicle_type (e.g. ['sedan','suv','truck'] for cars, ['cruiser','touring'] for motorcycles).
   */
  body?: string[];
  /**
   * Minimum engine displacement in cc, applied against `displacement_cc`.
   */
  displacement_cc_min?: number;
  /**
   * Maximum engine displacement in cc, applied against `displacement_cc`.
   */
  displacement_cc_max?: number;
  exterior_color?: string[];
  interior_color?: string[];
  /**
   * Rooftop names to include, matching `Vehicle.rooftop` and the rooftop `name` from `dealer.information`. For multi-rooftop dealerships; omit to search across all rooftops.
   */
  rooftops?: string[];
  year_min?: number;
  year_max?: number;
  /**
   * Minimum price in whole US dollars, applied against the authoritative advertised `price` field. Vehicles without `price` do not match this filter.
   */
  price_min?: number;
  /**
   * Maximum price in whole US dollars, applied against the authoritative advertised `price` field. Vehicles without `price` do not match this filter.
   */
  price_max?: number;
  mileage_max?: number;
  vin?: string;
  stock?: string;
  /**
   * Optional free-text query.
   */
  query?: string;
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
 * Typed AAP request for the `inventory.search` skill. Filters are FLAT (no nested make/model trees) and multi-value filters are arrays. Pagination uses skip/limit; sort is field+order. `privacy.anonymous` declares whether the buyer agent is sharing user identity. Carried inside an A2A `Message.parts[].data` DataPart via the A2A `SendMessage` operation.
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
     * Field to sort by. Sorting by 'price' uses the authoritative advertised vehicle price, including mandatory dealer charges but excluding government charges. Vehicles without `price` sort after priced vehicles regardless of ascending or descending order. `updated_at` sorts by listing freshness.
     */
    field: "price" | "list_price" | "msrp" | "mileage" | "year" | "make" | "model" | "stock" | "updated_at";
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
     * Vehicles in this page, in the requested order. Items MAY span multiple vehicle types (`car`, `motorcycle`, `trailer`, `rv`, `other`); each carries its own `vehicle_type` (absent = car). Each item is a Vehicle constrained to the sale-condition vocabulary (`new`|`used`|`cpo`) — inventory listings never carry trade-in wear values — and MUST carry a `status` of `available`, `intransit`, or `pending`. Out-of-stock vehicles are never returned.
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
 * The single vehicle interface used everywhere a vehicle is referenced — inventory.search results, inventory.vehicle detail, vehicle_of_interest, and trade_in. v1.0 merges the former Vehicle + VehicleDetail split into one shape: there is now exactly one vehicle type.
 *
 * Field semantics differ by context:
 * - For inventory listings (inventory.search / inventory.vehicle) `condition` MUST be one of `new`, `used`, `cpo` and `status` MUST be one of `available`, `intransit`, `pending`. Pricing fields describe the dealer's listing.
 * - For vehicle_of_interest, `condition` MUST be one of `new`, `used`, `cpo`.
 * - For trade_in, `condition` MUST be one of `excellent`, `good`, `fair`, `poor`. Pricing fields are typically absent on the request side and may be populated by the dealer's appraisal response.
 *
 * All prices are plain integers in whole US dollars (v1.0 dropped the nested {amount, currency} Money object). Context-dependent constraints are enforced at the using request/response schema. No fields are required at this base schema; `additionalProperties: true` lets inventory responses carry richer dealer-specific fields without schema changes.
 *
 * The optional `vehicle_type` discriminator (`car` | `motorcycle` | `trailer` | `rv` | `other`) scopes which fields apply. Most detail fields (`body`, `driveline`, `interior_color`, `city_mpg`, `highway_mpg`, `displacement_cc`, the electric-powertrain fields) are optional; a listing carries only the set relevant to its type. When `vehicle_type` is absent it MUST be treated as `car`, so existing car integrations remain valid unchanged; buyer agents SHOULD treat a missing `vehicle_type` as `car`. Niche or dealer-specific attributes that do not warrant a first-class field (e.g. a motorcycle's `final_drive`, `engine_stroke`, `wheel_count`, or `abs`) travel in the free-form `other_attributes` map.
 *
 * The electric-powertrain fields (`electric_range_mi`, `battery_kwh`, `motor_power_hp`, `dc_fast_charge`, `charge_port`) are GENERIC across vehicle types — they describe any BEV/PHEV unit whether it is an electric car or an electric motorcycle. They are all optional and populated when `fuel` is `bev` or `phev`.
 */
export interface Vehicle {
  /**
   * The kind of unit this listing represents. `car` = a car/truck/SUV; `motorcycle` = a two- or three-wheeled motorcycle, scooter, or moped; `trailer` = a towable trailer; `rv` = a recreational vehicle / motorhome; `other` = anything else the rooftop sells. This is the discriminator that scopes which of the remaining fields are meaningful. OPTIONAL and defaults to `car` when absent, so existing car integrations remain valid without change. Buyer agents SHOULD treat a missing `vehicle_type` as `car`.
   */
  vehicle_type?: "car" | "motorcycle" | "trailer" | "rv" | "other";
  /**
   * Vehicle Identification Number (17 chars, ISO 3779). Applies to both cars and on-road motorcycles. Optional on trade-ins; recommended on inventory listings of used vehicles.
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
   * Inventory availability. v1.0 supports exactly three values: `available` (in stock now), `intransit` (allocated / en route to the dealership), `pending` (deal in progress). A vehicle in any other state is OUT OF STOCK and MUST NOT appear in inventory feeds — dealers omit it and buyer agents ignore any item missing or carrying an unknown status. Required on inventory listings; omitted on vehicle_of_interest and trade_in.
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
   * Authoritative advertised vehicle price in whole US dollars. It includes every mandatory, non-government dealer charge and dealer-required add-on, may reflect only discounts or rebates available to every consumer, and MUST NOT be reduced by an additional required down payment or conditioned on dealer financing. It excludes sales tax, title, registration, and other required government charges, so it is not an out-the-door quote. An optional `fees` array can itemize mandatory charges already included in this number; consumers MUST NOT add them again. Inventory context.
   */
  price?: number;
  /**
   * Dealer's base list price before discounts, rebates, mandatory dealer charges, and required add-ons, in whole US dollars. This is comparison context, not an amount a consumer can necessarily buy the vehicle for. A provider that knows only a base or list amount publishes `list_price` and omits `price`. Inventory context.
   */
  list_price?: number;
  /**
   * Optional itemized snapshot of mandatory, non-government dealer charges and dealer-required add-ons for this vehicle. When `price` is present, every listed amount is already included in `price`; consumers MUST NOT add these amounts again. Omitted means the itemized breakdown was not provided and does not invalidate an otherwise authoritative `price`. An empty array means the publisher affirmatively reports no mandatory dealer charges. When present, a non-empty array is the complete vehicle-specific list. This array never represents a delta from rooftop fees: consumers MUST NOT join or merge it with `dealer.information`; when vehicle fees differ from rooftop defaults, this array replaces the rooftop array in full. If `list_price` and `fees` are present without `price`, they are informational components only; consumers MUST NOT derive or advertise a replacement price from them.
   */
  fees?: DealerFee[];
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
   * Body style / segment as free text, applicable to any `vehicle_type`. Cars use e.g. 'sedan', 'suv', 'truck', 'coupe', 'hatchback', 'wagon', 'minivan', 'convertible'; motorcycles use e.g. 'cruiser', 'sport', 'touring', 'sport_touring', 'adventure', 'standard', 'scooter'.
   */
  body?: string;
  /**
   * Transmission type as text. Cars use e.g. 'automatic', 'manual', '8-speed automatic', 'cvt'; motorcycles use e.g. 'manual', 'automatic', 'dct', 'semi-automatic'.
   */
  transmission?: string;
  /**
   * Drivetrain layout (e.g. 'fwd', 'rwd', 'awd', '4wd'). Car context.
   */
  driveline?: string;
  /**
   * Free-text engine description. Cars use e.g. '2.0L Turbo I4', '3.5L V6 Hybrid'; motorcycles MAY use e.g. '1868cc V-twin'. The numeric displacement SHOULD also be provided in `displacement_cc`.
   */
  engine?: string;
  /**
   * Engine displacement in cubic centimeters (cc). Applies to any combustion vehicle_type (cars and motorcycles alike) — the primary combustion powertrain spec buyers filter on (e.g. 883, 1250, 1868, 1998). Omit for fully electric units (use `electric_range_mi`).
   */
  displacement_cc?: number;
  /**
   * Fuel type (e.g. 'gas', 'diesel', 'hybrid', 'phev', 'bev').
   */
  fuel?: string;
  /**
   * EPA city fuel-economy estimate in miles per gallon. Primarily a car field; for motorcycles displacement in `displacement_cc` is the primary spec. Omit for fully electric units (use `electric_range_mi`).
   */
  city_mpg?: number;
  /**
   * EPA highway fuel-economy estimate in miles per gallon. Primarily a car field; for motorcycles displacement in `displacement_cc` is the primary spec. Omit for fully electric units (use `electric_range_mi`).
   */
  highway_mpg?: number;
  /**
   * Estimated electric range in miles. The primary range spec for BEV/PHEV units across any vehicle_type — electric cars and electric motorcycles alike (e.g. 113 for an electric standard motorcycle, 300 for an EV car).
   */
  electric_range_mi?: number;
  /**
   * Usable battery energy capacity in kilowatt-hours (kWh). Generic electric field (any vehicle_type) for BEV/PHEV units. E.g. 10.5 (compact electric motorcycle), 15.4 (larger electric motorcycle).
   */
  battery_kwh?: number;
  /**
   * Peak electric motor output in horsepower (hp). Generic electric field for BEV/PHEV units (1 hp ≈ 0.746 kW). Reported in hp to stay consistent with AAP's US-market units.
   */
  motor_power_hp?: number;
  /**
   * Whether the unit supports DC fast charging. Generic electric field for BEV/PHEV units.
   */
  dc_fast_charge?: boolean;
  /**
   * EV charge/plug connector standard the unit uses (e.g. 'nacs', 'ccs', 'j1772', 'chademo', 'tesla'). Generic electric field for BEV/PHEV units across any vehicle_type; the concrete thing EV shoppers filter on. Nullable/omitted for non-electric units.
   */
  charge_port?: string | null;
  /**
   * Free-text exterior color name.
   */
  exterior_color?: string;
  /**
   * Free-text interior color or upholstery name. Car context; typically omitted for motorcycles.
   */
  interior_color?: string;
  /**
   * Notable equipment and options as free-text strings (e.g. 'Adaptive Cruise Control', 'Apple CarPlay', 'Heated Front Seats'). v1.0 uses one flat list and does not separate option packages, factory equipment, or installed accessories.
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
   * Optional free-form map of niche or dealer-specific attributes that do not warrant a first-class field in the public contract (e.g. motorcycle `final_drive`, `engine_stroke`, `wheel_count`, `abs`, or dealer-defined specs). Keys are dealer-defined and values are scalars or scalar arrays; buyer agents SHOULD treat unknown keys leniently.
   */
  other_attributes?: {
    [k: string]: string | number | boolean | string[] | number[];
  };
  /**
   * Date (RFC 3339 full-date, e.g. '2026-04-21') the vehicle first appeared in the dealership's inventory.
   */
  inventory_date?: string;
  /**
   * ISO 8601 / RFC 3339 timestamp (with timezone offset) of the last update to this vehicle's availability, price, fees, or status (e.g. '2026-04-30T08:42:00Z'). Buyer agents treat this as the freshness signal for availability and pricing claims.
   */
  updated_at?: string;
  [k: string]: any;
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
   * The buyer agent that originated this lead — a structured identity for analytics and the TCPA/consent audit trail (who submitted it, and where their public agent card lives). In v1.1 this replaces the v1.0 string form AND the duplicate `consent.source_agent`: there is now exactly ONE source_agent, here at the top level.
   */
  source_agent: {
    /**
     * Stable identifier of the buyer agent.
     */
    name: string;
    /**
     * Optional homepage / operator URL for the buyer agent.
     */
    url?: string;
    /**
     * Optional URL of the buyer agent's own A2A agent card, so the dealer can re-fetch and verify who submitted the lead (recommended for compliance).
     */
    agent_card_url?: string;
  };
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
 * The vehicle the buyer wants to trade in. Optional. Pass through whatever the customer provided (just a make+model and a mileage is a perfectly valid trade-in lead). When `condition` is set it MUST be one of `excellent` | `good` | `fair` | `poor`. Pricing fields are typically absent on the request side and are populated by the dealer's appraisal response.
 */
export interface Vehicle1 {
  /**
   * The kind of unit this listing represents. `car` = a car/truck/SUV; `motorcycle` = a two- or three-wheeled motorcycle, scooter, or moped; `trailer` = a towable trailer; `rv` = a recreational vehicle / motorhome; `other` = anything else the rooftop sells. This is the discriminator that scopes which of the remaining fields are meaningful. OPTIONAL and defaults to `car` when absent, so existing car integrations remain valid without change. Buyer agents SHOULD treat a missing `vehicle_type` as `car`.
   */
  vehicle_type?: "car" | "motorcycle" | "trailer" | "rv" | "other";
  /**
   * Vehicle Identification Number (17 chars, ISO 3779). Applies to both cars and on-road motorcycles. Optional on trade-ins; recommended on inventory listings of used vehicles.
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
   * Inventory availability. v1.0 supports exactly three values: `available` (in stock now), `intransit` (allocated / en route to the dealership), `pending` (deal in progress). A vehicle in any other state is OUT OF STOCK and MUST NOT appear in inventory feeds — dealers omit it and buyer agents ignore any item missing or carrying an unknown status. Required on inventory listings; omitted on vehicle_of_interest and trade_in.
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
   * Authoritative advertised vehicle price in whole US dollars. It includes every mandatory, non-government dealer charge and dealer-required add-on, may reflect only discounts or rebates available to every consumer, and MUST NOT be reduced by an additional required down payment or conditioned on dealer financing. It excludes sales tax, title, registration, and other required government charges, so it is not an out-the-door quote. An optional `fees` array can itemize mandatory charges already included in this number; consumers MUST NOT add them again. Inventory context.
   */
  price?: number;
  /**
   * Dealer's base list price before discounts, rebates, mandatory dealer charges, and required add-ons, in whole US dollars. This is comparison context, not an amount a consumer can necessarily buy the vehicle for. A provider that knows only a base or list amount publishes `list_price` and omits `price`. Inventory context.
   */
  list_price?: number;
  /**
   * Optional itemized snapshot of mandatory, non-government dealer charges and dealer-required add-ons for this vehicle. When `price` is present, every listed amount is already included in `price`; consumers MUST NOT add these amounts again. Omitted means the itemized breakdown was not provided and does not invalidate an otherwise authoritative `price`. An empty array means the publisher affirmatively reports no mandatory dealer charges. When present, a non-empty array is the complete vehicle-specific list. This array never represents a delta from rooftop fees: consumers MUST NOT join or merge it with `dealer.information`; when vehicle fees differ from rooftop defaults, this array replaces the rooftop array in full. If `list_price` and `fees` are present without `price`, they are informational components only; consumers MUST NOT derive or advertise a replacement price from them.
   */
  fees?: DealerFee[];
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
   * Body style / segment as free text, applicable to any `vehicle_type`. Cars use e.g. 'sedan', 'suv', 'truck', 'coupe', 'hatchback', 'wagon', 'minivan', 'convertible'; motorcycles use e.g. 'cruiser', 'sport', 'touring', 'sport_touring', 'adventure', 'standard', 'scooter'.
   */
  body?: string;
  /**
   * Transmission type as text. Cars use e.g. 'automatic', 'manual', '8-speed automatic', 'cvt'; motorcycles use e.g. 'manual', 'automatic', 'dct', 'semi-automatic'.
   */
  transmission?: string;
  /**
   * Drivetrain layout (e.g. 'fwd', 'rwd', 'awd', '4wd'). Car context.
   */
  driveline?: string;
  /**
   * Free-text engine description. Cars use e.g. '2.0L Turbo I4', '3.5L V6 Hybrid'; motorcycles MAY use e.g. '1868cc V-twin'. The numeric displacement SHOULD also be provided in `displacement_cc`.
   */
  engine?: string;
  /**
   * Engine displacement in cubic centimeters (cc). Applies to any combustion vehicle_type (cars and motorcycles alike) — the primary combustion powertrain spec buyers filter on (e.g. 883, 1250, 1868, 1998). Omit for fully electric units (use `electric_range_mi`).
   */
  displacement_cc?: number;
  /**
   * Fuel type (e.g. 'gas', 'diesel', 'hybrid', 'phev', 'bev').
   */
  fuel?: string;
  /**
   * EPA city fuel-economy estimate in miles per gallon. Primarily a car field; for motorcycles displacement in `displacement_cc` is the primary spec. Omit for fully electric units (use `electric_range_mi`).
   */
  city_mpg?: number;
  /**
   * EPA highway fuel-economy estimate in miles per gallon. Primarily a car field; for motorcycles displacement in `displacement_cc` is the primary spec. Omit for fully electric units (use `electric_range_mi`).
   */
  highway_mpg?: number;
  /**
   * Estimated electric range in miles. The primary range spec for BEV/PHEV units across any vehicle_type — electric cars and electric motorcycles alike (e.g. 113 for an electric standard motorcycle, 300 for an EV car).
   */
  electric_range_mi?: number;
  /**
   * Usable battery energy capacity in kilowatt-hours (kWh). Generic electric field (any vehicle_type) for BEV/PHEV units. E.g. 10.5 (compact electric motorcycle), 15.4 (larger electric motorcycle).
   */
  battery_kwh?: number;
  /**
   * Peak electric motor output in horsepower (hp). Generic electric field for BEV/PHEV units (1 hp ≈ 0.746 kW). Reported in hp to stay consistent with AAP's US-market units.
   */
  motor_power_hp?: number;
  /**
   * Whether the unit supports DC fast charging. Generic electric field for BEV/PHEV units.
   */
  dc_fast_charge?: boolean;
  /**
   * EV charge/plug connector standard the unit uses (e.g. 'nacs', 'ccs', 'j1772', 'chademo', 'tesla'). Generic electric field for BEV/PHEV units across any vehicle_type; the concrete thing EV shoppers filter on. Nullable/omitted for non-electric units.
   */
  charge_port?: string | null;
  /**
   * Free-text exterior color name.
   */
  exterior_color?: string;
  /**
   * Free-text interior color or upholstery name. Car context; typically omitted for motorcycles.
   */
  interior_color?: string;
  /**
   * Notable equipment and options as free-text strings (e.g. 'Adaptive Cruise Control', 'Apple CarPlay', 'Heated Front Seats'). v1.0 uses one flat list and does not separate option packages, factory equipment, or installed accessories.
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
   * Optional free-form map of niche or dealer-specific attributes that do not warrant a first-class field in the public contract (e.g. motorcycle `final_drive`, `engine_stroke`, `wheel_count`, `abs`, or dealer-defined specs). Keys are dealer-defined and values are scalars or scalar arrays; buyer agents SHOULD treat unknown keys leniently.
   */
  other_attributes?: {
    [k: string]: string | number | boolean | string[] | number[];
  };
  /**
   * Date (RFC 3339 full-date, e.g. '2026-04-21') the vehicle first appeared in the dealership's inventory.
   */
  inventory_date?: string;
  /**
   * ISO 8601 / RFC 3339 timestamp (with timezone offset) of the last update to this vehicle's availability, price, fees, or status (e.g. '2026-04-30T08:42:00Z'). Buyer agents treat this as the freshness signal for availability and pricing claims.
   */
  updated_at?: string;
  [k: string]: any;
}
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
 * Typed AAP request for the `inventory.vehicle` skill. The request MUST identify a specific listing via at least one of `vin`, `stock`, or `vehicle_id`. Carried inside an A2A `Message.parts[].data` DataPart via the A2A `SendMessage` operation.
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
};

/**
 * Typed AAP response for the `inventory.vehicle` skill. The `data` field is a Vehicle (v1.0 unified the former Vehicle + VehicleDetail into one type) and MAY be any vehicle type (`car`, `motorcycle`, `trailer`, `rv`, `other`), carrying the type-relevant fields (absent `vehicle_type` = car). Because it is always an inventory listing, `condition` is constrained to `new` | `used` | `cpo` and `status` (one of `available` | `intransit` | `pending`) is required. Carried inside an A2A `Message.parts[].data` DataPart returned from the `SendMessage` operation.
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
