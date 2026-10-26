export type DiagramSpec = {
  eyebrow: string;
  title: string;
  description: string;
  takeaway: string;
};

export const imageSpecs = {
  "network-overview": {
    eyebrow: "THE AUTOMOTIVE LAYER",
    title: "Three protocols. One automotive language.",
    description: "MCP, A2A and PAP connect buyer agents to a shared AAP contract and dealership backends.",
    takeaway: "The interface changes. Vehicle facts, prices and consent keep the same meaning.",
  },
  "dealer-onboarding": {
    eyebrow: "IMPLEMENTATION PATH",
    title: "Make the dealership an agent destination.",
    description: "Publish dealer-domain discovery, connect the three interfaces, and verify their behavior against the same contract.",
    takeaway: "Advertise only the skills and search capabilities that actually work.",
  },
  "skills-overview": {
    eyebrow: "FIVE AUTOMOTIVE SKILLS",
    title: "From a dealership to a consented inquiry.",
    description: "Dealer information, facets, search, vehicle detail and lead submission cover the automotive read-and-lead journey.",
    takeaway: "Implement a declared subset. Expose that same subset through MCP, A2A and PAP.",
  },
  "architecture-stack": {
    eyebrow: "SHARED CONTRACT",
    title: "Automotive meaning above the interface.",
    description: "AAP defines automotive payloads and behavior. Native MCP tools, A2A messages and PAP APIs carry that same contract to a dealer backend.",
    takeaway: "A binding handles delivery and authorization. AAP defines what the data means.",
  },
  "interop-clients": {
    eyebrow: "INTEROPERABILITY",
    title: "Verify the bytes that clients actually send.",
    description: "Current and legacy MCP clients, A2A clients and PAP authenticated requests must reach the same typed automotive contract.",
    takeaway: "Valid schemas are one check. Deployed discovery, authentication and behavior need runtime checks.",
  },
  "why-before-after": {
    eyebrow: "WHY AAP",
    title: "Shared meaning replaces custom mappings.",
    description: "A mesh of custom buyer-agent and dealership integrations converges on one shared automotive contract.",
    takeaway: "Keep existing dealer systems. Standardize the boundary that agents use.",
  },
  "agent-card-passport": {
    eyebrow: "A2A DISCOVERY",
    title: "One card. Four useful layers.",
    description: "The Agent Card identifies the dealership, A2A interface, required AAP extension and actual implemented skills and capabilities.",
    takeaway: "MCP and PAP are linked from AAP extension params, never invented A2A bindings.",
  },
  "buyer-journey": {
    eyebrow: "BUYER JOURNEY",
    title: "Discover. Compare. Verify. Ask.",
    description: "A buyer agent discovers a dealer, searches inventory, verifies one vehicle and submits an inquiry only after customer consent.",
    takeaway: "Browsing needs no shopper contact details. Sending a lead needs explicit consent.",
  },
  "aap-sdk-toolbox": {
    eyebrow: "GENERATED FROM THE CONTRACT",
    title: "One source, three integration packages.",
    description: "Reviewed JSON Schemas produce the schemas, TypeScript types and runtime validator packages at the same release version.",
    takeaway: "Pin a release. Validate input and output. Preserve actionable error details.",
  },
  "datapart-anatomy": {
    eyebrow: "A2A PAYLOAD",
    title: "A typed payload inside an A2A message.",
    description: "An A2A Message has a messageId, role and parts. Its DataPart contains the typed AAP request in data.",
    takeaway: "Use A2A 1.0 ProtoJSON: ROLE_USER or ROLE_AGENT, with no invented kind field.",
  },
  "jsonrpc-envelope": {
    eyebrow: "A2A WIRE FORMAT",
    title: "One operation carries every automotive skill.",
    description: "JSON-RPC SendMessage wraps an A2A Message and a typed AAP DataPart. HTTP headers select A2A 1.0 and the exact AAP extension URI.",
    takeaway: "Activate the selected AAP extension on every call. Keep its URI exact.",
  },
  "discovery-flow": {
    eyebrow: "DEALER-DOMAIN DISCOVERY",
    title: "Find the dealer. Discover its interfaces.",
    description: "The dealer domain publishes agent-card.json, poppy.json and llms.txt, which cross-link the same MCP, A2A and PAP deployment.",
    takeaway: "A provider can host the service. The dealership domain remains the entry point.",
  },
  "poppy-discovery": {
    eyebrow: "PAP AND PUBLIC MCP",
    title: "A public link does not grant PAP access.",
    description: "The AAP extension can link public MCP. A native PAP MCP API additionally promises session-token support, resource metadata and scopes.",
    takeaway: "Never forward a PAP token merely because a public MCP URL appears in discovery.",
  },
  "poppy-session": {
    eyebrow: "PAP 0.3 GUEST SESSION",
    title: "One Session. One proof key.",
    description: "After verifying discovery, the personal agent creates a new Session Key, signs client and Session assertions, receives a DPoP token without a scope field and calls the automotive API. The key thumbprint identifies the Session.",
    takeaway: "Renew with the same key. A new key starts a new Session. Guest shopping needs no account.",
  },
  "poppy-mcp-tokens": {
    eyebrow: "PAP 0.3 AND MCP",
    title: "Choose the grant from resource metadata.",
    description: "A DPoP-capable MCP server accepts a normal resource-bound DPoP token. A server without DPoP requires RFC 8693 exchange of a current DPoP Session Token for an exact-resource Bearer token. Both token requests require DPoP.",
    takeaway: "Every token request needs a DPoP proof. Omitting the proof never selects Bearer.",
  },
  "poppy-browser-join": {
    eyebrow: "PAP 0.3 BROWSER SESSION",
    title: "Join the browser with its own one-time code.",
    description: "The agent's own browser loads a short-lived code and a protected join cookie. Trusted agent code signs a Session-key proof whose nonce is the code. The Company consumes the first submission, verifies the cookie, code, proof and active Session, then sets the Session cookie.",
    takeaway: "Never sign a code from a message. It must come from the agent's own browser endpoint page.",
  },
  "agent-etiquette": {
    eyebrow: "AGENT BEHAVIOR",
    title: "Useful actions, grounded in evidence.",
    description: "Read declared capabilities, use listing evidence, request consent for contact and report the actual lead or appointment outcome.",
    takeaway: "Unknown equipment stays unknown. A received inquiry is not a confirmed appointment.",
  },
  "consent-gate": {
    eyebrow: "CONTACT PERMISSION",
    title: "The shopper controls the handoff.",
    description: "Public information and inventory reads stay before the consent gate. An approved payload and contact channels allow one idempotent lead submission.",
    takeaway: "Agent authentication identifies the caller. It does not grant customer contact consent.",
  },
  "pricing-ladder": {
    eyebrow: "PRICE SEMANTICS",
    title: "One price, including mandatory dealer charges.",
    description: "The advertised vehicle price already includes mandatory dealer charges. Optional fee itemization explains that total. Government-required consumer charges remain separate.",
    takeaway: "Do not add included fees twice. Conditional rebates never reduce the advertised price.",
  },
  "dealer-rooftops": {
    eyebrow: "DEALER INFORMATION",
    title: "One dealer group, distinct local rooftops.",
    description: "Each rooftop has its own location, coordinates, hours, contacts and services. Listing results identify the relevant dealer and rooftop.",
    takeaway: "Use exact rooftop names within a dealer. Aggregate search uses dealer identity and geography.",
  },
  "facets-overview": {
    eyebrow: "SEARCH VOCABULARY",
    title: "Discover the values before applying the filters.",
    description: "Facets summarize matching inventory before pagination, with value counts, numeric ranges and stable feature codes with verified-present counts.",
    takeaway: "Feature codes come from the deployment's vocabulary. Counts describe the full matching set.",
  },
  "inventory-search-flow": {
    eyebrow: "INVENTORY SEARCH",
    title: "Turn constraints into verifiable results.",
    description: "An agent sends supported filters and sort order, the service applies them, and results expose applied filters, freshness, evidence and the next cursor.",
    takeaway: "An unsupported constraint is an explicit error. Never silently broaden the search.",
  },
  "vehicle-detail-lookup": {
    eyebrow: "VEHICLE DETAIL",
    title: "Identify one listing. Inspect its current facts.",
    description: "VIN, stock or vehicle ID selects one listing. The response includes status, updated time, price and source-backed equipment evidence.",
    takeaway: "When several identifiers are supplied, they must resolve to the same listing.",
  },
  "multi-class-inventory": {
    eyebrow: "AUTOMOTIVE VERTICAL",
    title: "Cars, motorcycles and electric powertrains.",
    description: "Cars and motorcycles share identity, availability, price and equipment evidence. Electric specifications describe the relevant powertrain.",
    takeaway: "One vehicle contract, with fields for the vehicle and powertrain that actually exist.",
  },
  "lead-lifecycle": {
    eyebrow: "LEAD SUBMISSION",
    title: "One inquiry. Explicit business outcomes.",
    description: "The dealer validates consent and an idempotency key, then reports the original received or rejected outcome. Retries preserve it with replayed: true. Appointment status is a separate outcome.",
    takeaway: "Retry with the same key. A confirmed appointment includes its confirmed time.",
  },
  "error-anatomy": {
    eyebrow: "ACTIONABLE ERRORS",
    title: "One error object, three delivery formats.",
    description: "The shared aap.error has a code, message, retryable flag and useful details. MCP, A2A and PAP place that object in their native response envelopes.",
    takeaway: "Fix a bad request. Wait when rate-limited. Retry a write with its original idempotency key.",
  },
  "adf-bridge": {
    eyebrow: "EXISTING DEALER SYSTEMS",
    title: "Map the inquiry. Retain the consent record.",
    description: "An approved AAP lead maps into a CRM's verified ADF/XML format. Consent, idempotency and fields without an XML equivalent stay in a separate durable record.",
    takeaway: "ADF receiver dialects differ. Verify the actual CRM mapping before enabling delivery.",
  },
  "mcp-wrapper": {
    eyebrow: "NATIVE MCP",
    title: "Native tools, structured automotive results.",
    description: "An MCP host discovers the implemented AAP tools, calls a named tool with an AAP request and receives a typed success or aap.error in structuredContent.",
    takeaway: "Publish a working Streamable HTTP endpoint. A static mcp.json catalog is not a server.",
  },
  "versioning-timeline": {
    eyebrow: "RELEASE LIFECYCLE",
    title: "Review. Freeze. Publish. Migrate.",
    description: "Editable sources pass schema, behavior and interoperability checks before a new immutable release is prepared and a deployment switches its discovery.",
    takeaway: "Published contracts stay byte-stable. AAP 3.0 is an explicit major-version migration.",
  },
  "feature-evidence": {
    eyebrow: "EQUIPMENT EVIDENCE",
    title: "Equipment facts need evidence.",
    description: "Feature filters require present equipment with supporting source and text. Unknown data cannot be treated as present or absent.",
    takeaway: "Return the evidence that made a listing match. Do not infer equipment from the trim name.",
  },
  "geo-search": {
    eyebrow: "DISTANCE FILTERING",
    title: "Distance from the shopper to the rooftop.",
    description: "A latitude, longitude and radius define great-circle distance to a vehicle's selling rooftop. Results return distance_mi and can sort by it.",
    takeaway: "A radius is not a ZIP-code guess or a driving-time estimate. Missing coordinates cannot match.",
  },
  "cursor-pagination": {
    eyebrow: "COMPLETE RESULT SETS",
    title: "Follow every page to complete the search.",
    description: "The service returns an opaque next_cursor for each page and null at completion. Filters, query, sort and page size stay fixed across the cursor sequence.",
    takeaway: "Do not combine cursor and skip. An expired or mismatched cursor is INVALID_CURSOR.",
  },
  "llms-discovery": {
    eyebrow: "READABLE DISCOVERY",
    title: "Give agents a short index with useful links.",
    description: "Dealer llms.txt links the exact MCP endpoint, Agent Card, Poppy discovery, API documentation and inventory. HTML advertises available Markdown representations.",
    takeaway: "llms.txt helps discovery. It does not register the dealer with every agent.",
  },
  "capability-parity": {
    eyebrow: "ONE DEPLOYMENT",
    title: "Three interfaces. Equivalent automotive behavior.",
    description: "MCP, A2A and PAP expose the same implemented skills, inventory visibility, search capabilities, pricing and consent behavior.",
    takeaway: "Different authentication and envelopes. Equivalent facts and business outcomes.",
  },
} satisfies Record<string, DiagramSpec>;

export type DiagramName = keyof typeof imageSpecs;
export const usedImageNames = Object.keys(imageSpecs) as DiagramName[];
