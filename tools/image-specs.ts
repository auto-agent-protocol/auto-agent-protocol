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
    eyebrow: "FIVE CORE AUTOMOTIVE SKILLS",
    title: "From a dealership to a consented inquiry.",
    description: "Dealer information, facets, search, vehicle detail and lead submission are the five core skills of the automotive read-and-lead journey. Optional trade-in and credit application skills extend it.",
    takeaway: "Implement a declared subset of core and optional skills. Expose that same subset through MCP, A2A and PAP.",
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
    description: "Current and legacy MCP clients, A2A clients and PAP 1.0 requests with a delegated Session and Poppy-Version must reach the same typed automotive contract.",
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
    description: "JSON-RPC SendMessage wraps an A2A Message and a typed AAP DataPart. Optional HTTP headers confirm the protocol and contract selected by a pinned AAP endpoint.",
    takeaway: "Pinned AAP endpoints infer omitted headers. Supplied values must match the exact contract.",
  },
  "discovery-flow": {
    eyebrow: "DEALER-DOMAIN DISCOVERY",
    title: "Find the dealer. Discover its interfaces.",
    description: "The dealer domain publishes agent-card.json, poppy.json and llms.txt, which cross-link the same MCP, A2A and PAP deployment.",
    takeaway: "A provider can host the service. The dealership domain remains the entry point.",
  },
  "poppy-discovery": {
    eyebrow: "PAP 1.0 AND PUBLIC MCP",
    title: "A public link does not grant PAP access.",
    description: "The version 1 entry in the AAP extension list can link public MCP. A native PAP MCP API additionally accepts delegated Session JWTs with Poppy-Version and applies resource and account authorization when needed. An optional tasks endpoint covers excluded tasks, the skill index and feedback.",
    takeaway: "Send Session JWTs only to the advertised native API; a public pointer is not authorization.",
  },
  "poppy-session": {
    eyebrow: "PAP 1.0 SESSION",
    title: "Stable Sessions. Rotating delegated keys.",
    description: "An identity key signs an ES256 or PS384 delegation for an ES256 key. The personal agent signs each API request with that delegated key and sends Poppy-Version beside Poppy-Session. The Company verifies the delegation, request and version and finds the Session by client_id, sid and User ID.",
    takeaway: "Delegated keys rotate freely. An unknown client_id, sid and User ID starts a new signed-out Session.",
  },
  "poppy-mcp-tokens": {
    eyebrow: "PAP 1.0 AND MCP",
    title: "Verify the Session. Add OAuth when needed.",
    description: "Native PAP MCP carries a delegated Session JWT and Poppy-Version. Signed-out access needs no token. Account access adds an OAuth token requested with resource set to the MCP url; DPoP remains separate when that token is bound.",
    takeaway: "The MCP server's protected-resource metadata names that url and the Company issuer. Advertise only implemented access.",
  },
  "poppy-browser-join": {
    eyebrow: "PAP 1.0 BROWSER SESSION",
    title: "Join the browser with its own one-time code.",
    description: "The agent's own browser loads a code and protected cookie. Trusted code authorizes it with Poppy-Session and Poppy-Version headers at /authorize. The browser then redeems the code with its cookie; the first redemption consumes it. A signed-in join needs the poppy:browser-sign-in scope.",
    takeaway: "Authorize only a code read from the agent's own browser endpoint page, outside model context. Without the scope, a signed-in join gets insufficient_scope.",
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
    takeaway: "Do not add included fees twice. Unconditional rebates are already in it. Conditional rebates never reduce it.",
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
    description: "The shared aap_error has a code, message, retryable flag and useful details. MCP, A2A and PAP place that object in their native response envelopes.",
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
    description: "An MCP host discovers the implemented AAP tools, calls a named tool with an AAP request and receives a typed success or aap_error in structuredContent.",
    takeaway: "Publish a working Streamable HTTP endpoint. A static mcp.json catalog is not a server.",
  },
  "versioning-timeline": {
    eyebrow: "RELEASE LIFECYCLE",
    title: "Review. Freeze. Publish. Migrate.",
    description: "Editable sources pass schema, behavior and interoperability checks before a new immutable release is prepared and a deployment switches its discovery.",
    takeaway: "Published contracts stay byte-stable. Additions preserve the meaning of existing payloads.",
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
    description: "MCP, A2A and PAP expose the same implemented core and optional skills, skill capabilities, inventory visibility, search capabilities, pricing and consent behavior.",
    takeaway: "Different authentication and envelopes. Equivalent facts and business outcomes.",
  },
  "naming-snake-case": {
    eyebrow: "ONE SPELLING IN AAP 4.0",
    title: "snake_case for every skill, type and tool.",
    description: "AAP 4.0 renames dotted identifiers to snake_case: skill id lead.submit becomes lead_submit, message type lead.submit.request becomes lead_submit_request, the error envelope aap.error becomes aap_error and the PAP path becomes /skills/lead_submit. The MCP tool name aap_lead_submit is unchanged and now matches the skill id.",
    takeaway: "Field names, error codes and MCP tool names were already consistent. Payload fields keep their meaning.",
  },
  "pap-migration": {
    eyebrow: "PAP 0.3 TO PAP 1.0",
    title: "Five changes when a dealer moves to PAP 1.0.",
    description: "AAP 4.0 targets PAP 1.0. Every Session request adds Poppy-Version, extensions become lists with one entry per major version, one tasks endpoint replaces three fields, Companies accept ES256 and PS384, and a Session is found by client_id, sid and User ID.",
    takeaway: "A domain publishes one poppy.json. PAP 0.3 agents need explicit AAP 3.2 configuration until they migrate.",
  },
  "poppy-versions": {
    eyebrow: "PAP 1.0 VERSIONS",
    title: "Choose one version. Declare it on every request.",
    description: "A personal agent reads poppy.json 1.0 and its optional supported_versions, chooses the newest compatible version and sends it in Poppy-Version on every request with the Session header. version_unsupported (HTTP 400) means refetch poppy.json and choose again.",
    takeaway: "Keep one Poppy-Version per Session. A missing or incompatible version is never handled under another.",
  },
  "poppy-request-headers": {
    eyebrow: "PAP 1.0 REQUEST",
    title: "Two required headers. Three when they apply.",
    description: "A PAP 1.0 API request carries Poppy-Session and Poppy-Version. Poppy-Extensions is added when it uses extensions, Authorization only when signed in, and Poppy-Approval only when it approves an Operation.",
    takeaway: "Keep the version headers fixed for a Session. Discovery and OAuth requests omit them.",
  },
  "poppy-tasks": {
    eyebrow: "PAP 1.0 TASK COVERAGE",
    title: "One tasks endpoint, answered per Session.",
    description: "GET tasks.endpoint with the Session header and no access token returns excluded tasks, the skill index and the feedback endpoint for that Session.",
    takeaway: "Reuse the response only within its Session. PAP skill_index lists Agent Skills artifacts, not AAP skills.",
  },
  "poppy-compliance-map": {
    eyebrow: "PAP 1.0 IN AAP 4.0",
    title: "What a dealer implements from PAP 1.0.",
    description: "Discovery, versions, Sessions and APIs are required. Sign-in, browser join, conversations, task coverage and Operations are required only when advertised. Keys, secrets and destinations are client obligations, not dealer requirements.",
    takeaway: "Advertise an optional PAP feature only when it follows the complete upstream rules.",
  },
  "poppy-operations": {
    eyebrow: "OPTIONAL PAP OPERATIONS",
    title: "Approve the exact terms. Perform at most once.",
    description: "A write skill request that declares Operations can receive 403 approval_required with exact terms. The user, or the agent on the user's instruction, approves; the identical request is resent with Poppy-Approval and performed at most once.",
    takeaway: "An approval never replaces the AAP consent grant in the body. Resend with the same idempotency key.",
  },
  "optional-skills": {
    eyebrow: "CORE AND OPTIONAL SKILLS",
    title: "Five core skills. Two optional skills.",
    description: "Dealer information, facets, search, vehicle detail and lead submission are core. trade_in_submit and credit_application_submit are optional, each declared with a capabilities object on MCP, A2A and PAP.",
    takeaway: "Declare an optional skill only when it works, identically on all three bindings with the same capabilities object.",
  },
  "optional-skill-bindings": {
    eyebrow: "OPTIONAL SKILLS ON EVERY BINDING",
    title: "One request body. Three native calls.",
    description: "trade_in_submit and credit_application_submit are called as the MCP tools aap_trade_in_submit and aap_credit_application_submit, as typed A2A DataParts for those skill ids in SendMessage, and as PAP POST requests to /skills/trade_in_submit and /skills/credit_application_submit with Poppy-Version.",
    takeaway: "Same payload, consent rules and idempotency key everywhere. Offer a skill on all three bindings or on none.",
  },
  "optional-skill-delivery": {
    eyebrow: "HOW A DEALER DELIVERS THE OPTIONAL SKILLS",
    title: "Trade-in: ADF or API. Credit: API only.",
    description: "A dealer can deliver trade_in_submit to its CRM as an ADF/XML lead and reply received, or call a valuation API and reply valued. credit_application_submit goes only through a secure API to the dealer or lender credit system and is never relayed through ADF/XML or email.",
    takeaway: "Either trade-in path is the same tool. Applicant identifiers never travel through ADF/XML, email or CRM notes.",
  },
  "rebates-price": {
    eyebrow: "NEW-VEHICLE REBATES",
    title: "Unconditional rebates are already in the price.",
    description: "List price plus mandatory fees minus an unconditional customer cash rebate gives the advertised price. Conditional military and college rebates stay separate as possible extra savings and are never subtracted.",
    takeaway: "Never subtract a rebate from price again. Never advertise price minus conditional rebates.",
  },
  "trade-in-valuation": {
    eyebrow: "TRADE-IN VALUATION",
    title: "One trade-in submission. A value or a follow-up.",
    description: "Year, make, model, condition and mileage describe the vehicle. Customer and consent are required, as for a lead, so the dealership receives a first-time trade-in like a regular lead. The dealer answers valued with an amount or a range, or received and follows up.",
    takeaway: "Same customer and consent blocks as a lead. Only this tool returns a valuation; a lead never does.",
  },
  "trade-in-outcomes": {
    eyebrow: "TRADE-IN OUTCOMES",
    title: "Three outcomes. Only valued carries a value.",
    description: "valued carries an amount, a range or both, as an estimate or an offer with an expiry. received means the dealer follows up later. rejected means nothing was recorded.",
    takeaway: "An estimate is non-binding. Even an offer depends on the vehicle matching its description at inspection.",
  },
  "credit-application-flow": {
    eyebrow: "CREDIT APPLICATION",
    title: "Check capabilities. Get consent. Submit once.",
    description: "An agent reads the dealer's capabilities, collects only accepted data, records each applicant's consent and submits once with an idempotency key. The status reports the submission; a decision is reported separately.",
    takeaway: "Rejected means no application and no inquiry. A declined decision is not the creditor's adverse-action notice.",
  },
  "credit-application-data": {
    eyebrow: "CREDIT APPLICATION DATA",
    title: "Six data groups. Three fields never echoed.",
    description: "Identity, contact, residence, employment and income, financing and vehicles make up a credit application. national_id, date_of_birth and drivers_license are sensitive and never echoed.",
    takeaway: "Read capabilities before collecting an identifier. Never echo the sensitive fields anywhere.",
  },
  "credit-consent": {
    eyebrow: "CREDIT CONSENT",
    title: "Each applicant grants their own credit consent.",
    description: "The applicant and any co-applicant each grant verbatim consent text, a soft or hard inquiry, contact channels and an optional expiry. Credit consent is not lead consent.",
    takeaway: "A hard inquiry is never made on a soft authorization. An invalid or expired grant returns INVALID_CONSENT.",
  },
} satisfies Record<string, DiagramSpec>;

export type DiagramName = keyof typeof imageSpecs;
export const usedImageNames = Object.keys(imageSpecs) as DiagramName[];
