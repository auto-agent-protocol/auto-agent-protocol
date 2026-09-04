export type DiagramItem = {
  label?: string;
  title: string;
  body: string;
  code?: string[];
  tone?: "primary" | "soft" | "navy" | "teal";
};

type BaseDiagram = {
  title: string;
  eyebrow: string;
  description: string;
  footer?: string;
  height?: number;
};

export type DiagramSpec = BaseDiagram & (
  | { kind: "flow"; items: DiagramItem[] }
  | { kind: "grid"; items: DiagramItem[]; columns?: number }
  | { kind: "compare"; before: DiagramItem[]; after: DiagramItem[] }
  | { kind: "stack"; items: DiagramItem[] }
  | { kind: "network"; left: DiagramItem[]; center: DiagramItem; right: DiagramItem[] }
  | { kind: "split"; left: DiagramItem; right: DiagramItem; bridge?: string }
  | { kind: "timeline"; items: DiagramItem[] }
  | { kind: "pricing"; items: DiagramItem[] }
);

export const imageSpecs: Record<string, DiagramSpec> = {
  "network-overview": {
    kind: "network",
    eyebrow: "OPEN NETWORK",
    title: "Buyer agents meet dealer storefronts",
    description: "One profile connects every compatible A2A client to every participating dealership.",
    left: [
      { title: "AI assistant", body: "Conversational shopping" },
      { title: "Shopping agent", body: "Search and comparison" },
      { title: "Voice agent", body: "Hands-free discovery" },
    ],
    center: {
      title: "AAP",
      body: "Typed automotive DataParts over A2A v1.0",
      code: ["Agent Card discovery", "JSON-RPC 2.0", "SendMessage"],
      tone: "primary",
    },
    right: [
      { title: "Dealership A", body: "Its domain, its inventory" },
      { title: "Dealership B", body: "Its supported skill subset" },
      { title: "Dealership C", body: "Its consented leads" },
    ],
    footer: "No custom integration for every buyer-agent and dealership pair.",
    height: 1050,
  },

  "dealer-onboarding": {
    kind: "flow",
    eyebrow: "DEALER ONBOARDING",
    title: "Go live in three deliberate steps",
    description: "The dealer keeps control of the domain, capabilities, inventory, and lead destination.",
    items: [
      {
        label: "01",
        title: "Publish the Agent Card",
        body: "Host one discovery document on the dealership domain.",
        code: ["/.well-known/agent-card.json"],
      },
      {
        label: "02",
        title: "Serve the skills you choose",
        body: "One JSON-RPC endpoint handles the supported AAP skill subset.",
        code: ["POST {base}/a2a", "SendMessage"],
      },
      {
        label: "03",
        title: "Receive consented leads",
        body: "Typed lead data can map field-by-field into existing dealer CRMs.",
        code: ["lead.submit", "ADF/XML"],
        tone: "teal",
      },
    ],
    footer: "No app store. No gatekeeper. The dealership domain is the storefront.",
  },

  "skills-overview": {
    kind: "grid",
    eyebrow: "AAP VOCABULARY",
    title: "Five skills cover the read-and-lead lifecycle",
    description: "A dealer agent implements one or more skills; none is individually mandatory.",
    columns: 5,
    items: [
      { label: "01", title: "dealer.information", body: "Group profile, rooftops, hours, contacts, capabilities and default fee schedules." },
      { label: "02", title: "inventory.facets", body: "Available buckets and ranges before a buyer composes a precise search." },
      { label: "03", title: "inventory.search", body: "Filtered, paginated inventory with authoritative pricing when available.", tone: "primary" },
      { label: "04", title: "inventory.vehicle", body: "One complete vehicle record by VIN, stock number or vehicle_id." },
      { label: "05", title: "lead.submit", body: "Customer, vehicle, trade-in and appointment behind explicit consent.", tone: "teal" },
    ],
    footer: "Recommended starting pair: inventory.search + lead.submit",
  },

  "architecture-stack": {
    kind: "stack",
    eyebrow: "LAYERED ARCHITECTURE",
    title: "AAP profiles A2A; it does not replace it",
    description: "The automotive contract stays separate from the agent protocol and transport beneath it.",
    items: [
      {
        label: "PAYLOAD PROFILE",
        title: "Auto Agent Protocol",
        body: "Five automotive skills and their typed request, response and error payloads.",
        code: ["dealer.information", "inventory.*", "lead.submit"],
        tone: "primary",
      },
      {
        label: "AGENT PROTOCOL",
        title: "A2A v1.0",
        body: "Agent Card, Message and DataPart data model; AAP uses the SendMessage operation.",
        code: ["JSON-RPC 2.0 · sole binding", "POST {base}/a2a"],
      },
      {
        label: "TRANSPORT",
        title: "HTTPS",
        body: "TLS-secured delivery between the buyer agent and dealer agent.",
        tone: "navy",
      },
    ],
    footer: "AAP defines the DataPart.data shape. A2A carries it on the wire.",
    height: 900,
  },

  "interop-clients": {
    kind: "network",
    eyebrow: "VERIFIED INTEROPERABILITY",
    title: "Standard A2A clients can invoke every AAP skill",
    description: "The profile has been exercised through the official JavaScript and Python A2A v1.0 SDKs.",
    left: [
      { title: "@a2a-js/sdk", body: "Official JavaScript SDK", code: ["VERIFIED"] },
      { title: "a2a-sdk", body: "Official Python SDK", code: ["VERIFIED"] },
      { title: "Any A2A v1.0 client", body: "No AAP-specific transport code" },
    ],
    center: { title: "A2A", body: "Parse Agent Card, then call SendMessage", code: ["Message → DataPart → AAP"], tone: "primary" },
    right: [
      { title: "Dealer information", body: "Profiles and rooftops" },
      { title: "Inventory", body: "Facets, search and detail" },
      { title: "Consented lead", body: "One unified submission" },
    ],
    footer: "Compatibility comes from the shared A2A wire contract—not a private integration.",
    height: 1050,
  },

  "why-before-after": {
    kind: "compare",
    eyebrow: "WHY AAP",
    title: "From an integration mesh to one open profile",
    description: "A common contract removes repeated pair-by-pair protocol work.",
    before: [
      { title: "Buyer agents", body: "Agent 1 · Agent 2 · Agent 3" },
      { title: "Custom APIs", body: "Every pair negotiates discovery, fields, errors and transport again.", tone: "navy" },
      { title: "Dealerships", body: "Dealer A · Dealer B · Dealer C" },
    ],
    after: [
      { title: "Any A2A client", body: "One discovery and message model" },
      { title: "AAP profile", body: "Five typed automotive skills", code: ["Agent Card", "SendMessage"], tone: "primary" },
      { title: "Any AAP dealer", body: "One public contract on its domain" },
    ],
    footer: "Open interoperability replaces N×M custom integration work.",
    height: 1100,
  },

  "agent-card-passport": {
    kind: "split",
    eyebrow: "DISCOVERY CONTRACT",
    title: "One Agent Card advertises the whole AAP surface",
    description: "A buyer agent learns the binding, extension and supported skill subset from one well-known file.",
    left: {
      label: "AGENT CARD",
      title: "/.well-known/agent-card.json",
      body: "Standard A2A v1.0 discovery document hosted on the dealer's own domain.",
      code: ["supportedInterfaces[]", "protocolBinding: JSONRPC", "capabilities.extensions[]"],
      tone: "primary",
    },
    right: {
      label: "AAP EXTENSION",
      title: "Skill schemas live in extension params",
      body: "The card lists only the skills this dealer implements and pins request and response schema URLs for each one.",
      code: ["dealer.information", "inventory.facets", "inventory.search", "inventory.vehicle", "lead.submit"],
    },
    bridge: "discovers",
    footer: "Discovery is the only plain GET; every skill invocation uses JSON-RPC SendMessage.",
  },

  "buyer-journey": {
    kind: "flow",
    eyebrow: "BUYER JOURNEY",
    title: "One conversation from discovery to a consented lead",
    description: "Each stage uses a typed AAP payload carried by A2A SendMessage.",
    items: [
      { label: "01", title: "Discover", body: "Read the dealer's Agent Card and supported skill subset.", code: ["/.well-known/agent-card.json"] },
      { label: "02", title: "Search", body: "Query real inventory with anonymous filters and pagination.", code: ["inventory.search"] },
      { label: "03", title: "Inspect", body: "Retrieve one complete vehicle with authoritative price and optional fee itemization.", code: ["inventory.vehicle"], tone: "primary" },
      { label: "04", title: "Lead", body: "Send customer details only with an explicit ConsentGrant.", code: ["lead.submit"], tone: "teal" },
    ],
    footer: "Five skills, one A2A conversation, zero invented transport layers.",
  },

  "aap-sdk-toolbox": {
    kind: "grid",
    eyebrow: "OPEN-SOURCE TOOLING",
    title: "Three packages keep integrations aligned with the contract",
    description: "Types, schemas and runtime validation come from the same reviewed source.",
    columns: 3,
    items: [
      { label: "TYPES", title: "@autoagentprotocol/types", body: "TypeScript declarations generated from the latest JSON Schema contract.", code: ["type Vehicle = { … }"] },
      { label: "SCHEMAS", title: "@autoagentprotocol/schemas", body: "Raw JSON Schema 2020-12 documents as importable modules.", code: ["{ $schema, $id, … }"] },
      { label: "VALIDATOR", title: "@autoagentprotocol/validator", body: "Ajv-based validation with every actionable error returned together.", code: ["validate(value) → errors[]"], tone: "teal" },
    ],
    footer: "pnpm add @autoagentprotocol/types @autoagentprotocol/schemas @autoagentprotocol/validator",
  },

  "datapart-anatomy": {
    kind: "split",
    eyebrow: "A2A MESSAGE ANATOMY",
    title: "The AAP payload is the DataPart.data value",
    description: "AAP uses the A2A v1.0 ProtoJSON Message shape; data.type identifies the automotive payload.",
    left: {
      label: "A2A ENVELOPE",
      title: "Message",
      body: "The standard message owns identity, role and parts.",
      code: ["messageId: 01HZ…", "role: ROLE_USER", "parts: [ DataPart ]"],
    },
    right: {
      label: "TYPED DATA PART",
      title: "parts[0].data",
      body: "The AAP request lives here. The media type describes the part; the type field selects the schema.",
      code: ["type: inventory.search.request", "filters: { make: [Toyota] }", "mediaType: application/vnd.…+json"],
      tone: "primary",
    },
    bridge: "contains",
    footer: "AAP adds typed automotive data—not a second message envelope.",
  },

  "error-anatomy": {
    kind: "split",
    eyebrow: "TYPED FAILURE",
    title: "Machines react to codes; people receive useful detail",
    description: "Protocol and domain errors stay distinct inside one JSON-RPC error response.",
    left: {
      label: "JSON-RPC LAYER",
      title: "error.code",
      body: "The binding reports the standard protocol failure category.",
      code: ["code: -32602", "message: Invalid params"],
      tone: "navy",
    },
    right: {
      label: "AAP LAYER",
      title: "error.data",
      body: "The typed aap.error gives the stable domain code, retry behavior and every validation problem.",
      code: ["code: SCHEMA_VALIDATION_FAILED", "retryable: false", "errors[]: location · keyword · error"],
      tone: "primary",
    },
    bridge: "explains",
    footer: "One response can report every schema failure; agents do not repair requests by guesswork.",
  },

  "discovery-flow": {
    kind: "flow",
    eyebrow: "DISCOVERY",
    title: "One GET returns the complete capability map",
    description: "Discovery is separate from invocation and stays on the dealership's own domain.",
    items: [
      { label: "01", title: "Buyer agent", body: "Begins with the dealership domain; no private registry is required." },
      { label: "02", title: "Fetch the Agent Card", body: "Read the standard A2A well-known location.", code: ["GET /.well-known/agent-card.json"], tone: "primary" },
      { label: "03", title: "Confirm the binding", body: "AAP requires a supported interface with the JSONRPC binding.", code: ["supportedInterfaces[]"] },
      { label: "04", title: "Read AAP skills", body: "Use the extension URI, supported skill IDs and their schema URLs.", code: ["capabilities.extensions[]"], tone: "teal" },
    ],
    footer: "After discovery, every skill call uses JSON-RPC 2.0 SendMessage.",
  },

  "jsonrpc-envelope": {
    kind: "split",
    eyebrow: "SOLE AAP BINDING",
    title: "JSON-RPC 2.0 carries one A2A operation",
    description: "The request Message goes in; the response Message comes back under the same JSON-RPC id.",
    left: {
      label: "REQUEST",
      title: "SendMessage",
      body: "The buyer sends an A2A Message with ROLE_USER and a typed request DataPart.",
      code: ["jsonrpc: 2.0", "id: 7", "method: SendMessage", "params.message.parts[].data"],
      tone: "primary",
    },
    right: {
      label: "RESPONSE",
      title: "result.message",
      body: "The dealer returns an A2A Message with ROLE_AGENT and the corresponding typed response.",
      code: ["jsonrpc: 2.0", "id: 7", "result.message.parts[].data"],
    },
    bridge: "same id",
    footer: "No REST binding, streaming, tasks or push-notification surface is required by AAP.",
  },

  "versioning-timeline": {
    kind: "timeline",
    eyebrow: "RELEASE MODEL",
    title: "Edit latest; freeze only reviewed releases",
    description: "The working contract stays readable in place while every published version remains immutable.",
    items: [
      { label: "WORK", title: "spec/latest + docs", body: "Review normal diffs in the editable contract and documentation.", tone: "primary" },
      { label: "VERIFY", title: "Release checks", body: "Validate schemas, examples, compatibility, artifacts and image sources." },
      { label: "SNAPSHOT", title: "vN.N.0", body: "Copy the reviewed spec, docs and diagrams into a frozen version." },
      { label: "PUBLISH", title: "Stable release", body: "Expose the frozen contract at its pinned URL and advance the artifact latest alias.", tone: "teal" },
    ],
    footer: "Docs/latest remains editable; historical schema URLs, documentation and artwork never change after release.",
  },

  "consent-gate": {
    kind: "compare",
    eyebrow: "PRIVACY BOUNDARY",
    title: "Browse anonymously; identify the buyer only with consent",
    description: "Inventory access and lead submission have intentionally different privacy rules.",
    before: [
      { label: "OPEN", title: "Anonymous browsing", body: "No personal data is needed to discover the dealer, facets, inventory or one vehicle." },
      { title: "Allowed skills", body: "dealer.information · inventory.facets · inventory.search · inventory.vehicle", tone: "primary" },
    ],
    after: [
      { label: "GATED", title: "Consented lead", body: "lead.submit carries customer information only with a valid ConsentGrant." },
      { title: "Grant proves", body: "granted_at · allowed_channels · consent_text · scope: lead_submission", tone: "teal" },
    ],
    footer: "Missing consent → CONTACT_CONSENT_REQUIRED · invalid grant → INVALID_CONSENT",
  },

  "dealer-rooftops": {
    kind: "grid",
    eyebrow: "DEALER INFORMATION",
    title: "One dealer group can publish many rooftops",
    description: "Each rooftop has its own location, operating details, capabilities and default fee schedule.",
    columns: 3,
    items: [
      { label: "ROOFTOP 01", title: "Premier Honda North", body: "Address · geo · phones · schedules · timezone · sales · service", code: ["fees: [{ name, amount }]"], tone: "primary" },
      { label: "ROOFTOP 02", title: "Premier Toyota Downtown", body: "Address · geo · phones · schedules · timezone · sales · financing", code: ["fees: []  · no defaults"] },
      { label: "ROOFTOP 03", title: "Premier EV Center", body: "Address · geo · phones · schedules · timezone · EV sales · service", code: ["fees omitted · unknown"] },
    ],
    footer: "Rooftop fees are publisher/discovery defaults. Vehicle itemization is optional and never assembled by a buyer-side join.",
  },

  "adf-bridge": {
    kind: "flow",
    eyebrow: "LEGACY CRM BRIDGE",
    title: "AAP leads map field-by-field into ADF/XML",
    description: "The protocol modernizes agent exchange without forcing dealerships to replace existing CRM ingestion.",
    items: [
      { label: "01", title: "AAP lead.submit", body: "Typed JSON with source agent, consent, customer and optional vehicle context.", code: ["lead.submit.request"], tone: "primary" },
      { label: "02", title: "Deterministic mapping", body: "Customer name, email, vehicle VIN, provider and vendor map to known ADF fields.", code: ["JSON → ADF/XML"] },
      { label: "03", title: "Dealer CRM", body: "The existing 25-year-old lead pipeline ingests the familiar ADF document.", code: ["<adf><prospect>…"], tone: "teal" },
    ],
    footer: "Consent remains an AAP requirement even when the destination format is legacy ADF/XML.",
  },

  "lead-lifecycle": {
    kind: "flow",
    eyebrow: "LEAD LIFECYCLE",
    title: "A consented lead, end to end",
    description: "The dealer validates both the grant and the payload before acknowledging receipt.",
    items: [
      { label: "01", title: "ConsentGrant", body: "The buyer authorizes lead submission and allowed contact channels.", code: ["scope: [lead_submission]"] },
      { label: "02", title: "lead.submit", body: "Source agent and consent are required; vehicle, trade-in and appointment are optional.", tone: "primary" },
      { label: "03", title: "Dealer validation", body: "Missing or invalid consent produces a typed error; no lead is created." },
      { label: "04", title: "Acknowledgement", body: "The response returns a lead_id and received status; ADF mapping may follow.", code: ["status: received"], tone: "teal" },
    ],
    footer: "No consent, no lead—the privacy gate is part of the protocol.",
  },

  "mcp-wrapper": {
    kind: "flow",
    eyebrow: "COMPATIBILITY",
    title: "MCP tools on the outside; standard AAP on the wire",
    description: "The official reference manifest maps tool arguments to typed AAP requests without inventing another dealer API.",
    items: [
      { label: "01", title: "MCP host", body: "An assistant invokes one of five aap_* tools.", code: ["aap_inventory_search"] },
      { label: "02", title: "AAP MCP adapter", body: "The generated manifest validates tool arguments against the request schema.", code: ["mcp.json"], tone: "primary" },
      { label: "03", title: "A2A dealer agent", body: "The adapter sends the typed request through JSON-RPC SendMessage.", code: ["POST {base}/a2a"], tone: "teal" },
    ],
    footer: "MCP is an adapter surface. A2A remains the dealer-facing wire protocol.",
  },

  "multi-class-inventory": {
    kind: "grid",
    eyebrow: "ONE INVENTORY CONTRACT",
    title: "Cars, motorcycles and electric powertrains share one vocabulary",
    description: "An optional vehicle_type selects class-specific details while common fields stay common.",
    columns: 3,
    items: [
      { label: "CAR", title: "Cars", body: "Sedan, SUV and other body values; driveline, MPG and shared identification fields.", code: ["vehicle_type: car", "body · driveline · fuel"] },
      { label: "ELECTRIC", title: "Electric units", body: "The same powertrain group works for electric cars and motorcycles.", code: ["electric_range_mi", "battery_kwh · charge_port"], tone: "primary" },
      { label: "MOTORCYCLE", title: "Motorcycles", body: "Segment in body, displacement for combustion units and niche specs in other_attributes.", code: ["vehicle_type: motorcycle", "displacement_cc"], tone: "teal" },
    ],
    footer: "Absent vehicle_type means car, preserving compatibility with existing listings.",
    height: 800,
  },

  "pricing-ladder": {
    kind: "pricing",
    eyebrow: "PRICE + FEE DISCLOSURE",
    title: "One authoritative vehicle price, with optional disclosure context",
    description: "Price is the all-in advertised amount. The other fields add context but never replace or reconstruct it.",
    items: [
      { label: "AUTHORITATIVE", title: "price", body: "Advertised vehicle price including mandatory dealer charges; government charges excluded.", code: ["$26,780"], tone: "teal" },
      { label: "OPTIONAL BREAKDOWN", title: "fees", body: "Complete itemization when supplied; already included in price.", code: ["Documentation · $500", "Theft protection · $1,290"], tone: "primary" },
      { label: "CONTEXT ONLY", title: "list_price", body: "Base/list amount; never presented or computed as the payable price.", code: ["$24,990"] },
      { label: "REFERENCE", title: "msrp", body: "Manufacturer's suggested retail price.", code: ["$27,500"] },
    ],
    footer: "Use price for comparison · Never compute price from list_price + fees · Conditional rebates never reduce price",
  },

  "inventory-search-flow": {
    kind: "flow",
    eyebrow: "INVENTORY SEARCH",
    title: "One typed request returns one paginated result set",
    description: "Flat filters and predictable paging keep anonymous inventory queries easy to implement.",
    items: [
      { label: "01", title: "Buyer request", body: "Send optional filters, pagination, sort and anonymous privacy preference.", code: ["inventory.search.request"] },
      { label: "02", title: "A2A SendMessage", body: "Carry the request in a typed DataPart over the sole JSON-RPC binding.", code: ["POST {base}/a2a"], tone: "primary" },
      { label: "03", title: "Dealer response", body: "Return total, page coordinates and the matching Vehicle records.", code: ["inventory.search.response"] },
      { label: "04", title: "Price safely", body: "Use price as authoritative; an optional fees array explains charges already included.", code: ["price · optional fees[]"], tone: "teal" },
    ],
    footer: "price filters use authoritative price; vehicles without price do not match a price range.",
  },

  "facets-overview": {
    kind: "grid",
    eyebrow: "INVENTORY FACETS",
    title: "Learn the shape of the lot before searching it",
    description: "A single response exposes only the buckets and ranges that exist in the matching inventory.",
    columns: 3,
    items: [
      { label: "IDENTITY", title: "What is available", body: "makes · models · trims · years · conditions · statuses" },
      { label: "VEHICLE CLASS", title: "What kind", body: "vehicle_types · bodies · fuels · drivelines · rooftops" },
      { label: "ELECTRIC", title: "How it is powered", body: "charge_ports · dc_fast_charge · electric_range_mi_range", tone: "primary" },
      { label: "RANGES", title: "Useful bounds", body: "year_range · mileage_range · displacement_cc_range" },
      { label: "PRICE", title: "Authoritative range", body: "price_range uses available price values; unpriced vehicles do not contribute.", code: ["whole USD"], tone: "teal" },
      { label: "SCOPING", title: "Optional filters", body: "Apply inventory.search-shaped filters before aggregating the matching subset." },
    ],
    footer: "Dealers omit facet keys for which they have no inventory.",
    height: 980,
  },

  "vehicle-detail-lookup": {
    kind: "split",
    eyebrow: "VEHICLE DETAIL",
    title: "Ask for one vehicle; receive one complete record",
    description: "The request accepts at least one stable identifier and the response carries the full typed Vehicle shape.",
    left: {
      label: "REQUEST · ANY ONE OR MORE",
      title: "Identify the listing",
      body: "VIN is preferred when known; stock and vehicle_id support in-transit and dealer-internal records.",
      code: ["vin: 1HG…", "stock: T12345", "vehicle_id: veh_8821"],
    },
    right: {
      label: "RESPONSE",
      title: "Complete vehicle",
      body: "Identity, availability, specifications, media and authoritative pricing when the dealer can make a complete disclosure.",
      code: ["status: available", "price: 26780", "fees: [{ name, amount }]", "updated_at: 2026-…"],
      tone: "primary",
    },
    bridge: "returns",
    footer: "Unknown identifier → VEHICLE_NOT_FOUND · unavailable listing → VEHICLE_UNAVAILABLE",
  },

  "agent-etiquette": {
    kind: "grid",
    eyebrow: "BUYER-AGENT BEHAVIOR",
    title: "Trust comes from a few enforceable rules",
    description: "The profile keeps discovery open while protecting identity, inventory systems and price accuracy.",
    columns: 4,
    items: [
      { label: "01", title: "Identify honestly", body: "Send a real source_agent on every lead; never spoof the caller." },
      { label: "02", title: "Browse anonymously", body: "Keep personal data behind an explicit and valid ConsentGrant." },
      { label: "03", title: "Respect the lot", body: "Cache facets, paginate searches and honor typed rate-limit errors." },
      { label: "04", title: "Quote safely", body: "Use authoritative price; never infer a total from list context or auto-apply rebates.", tone: "primary" },
    ],
    footer: "Dealer agents may reject requests that violate normative protocol behavior.",
  },
};

export const usedImageNames = Object.keys(imageSpecs).sort();
