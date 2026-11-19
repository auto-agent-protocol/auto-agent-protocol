import type { JSX } from "react";
import Link from "@docusaurus/Link";
import Layout from "@theme/Layout";
import releases from "../../releases.json";
import styles from "./faq.module.css";

const release = releases.releases.find(
  (item) => item.contract === releases.stable,
)!;
const docs = `/docs/${release.contract}`;
// Content that exists only in the editable 4.0 documentation, not in frozen v3.2.
const latestDocs = "/docs/latest";
const questions: {
  title: string;
  answer: string;
  link: string;
  label: string;
  latest?: boolean;
}[] = [
  {
    title: "What is Auto Agent Protocol?",
    answer:
      "AAP is an independent, open automotive contract. It defines what dealership information, inventory, prices, rebates, equipment evidence and consented inquiries mean across Model Context Protocol (MCP), Agent2Agent (A2A) and Personal Agent Protocol (PAP). Dealers can also offer optional trade-in valuation and credit applications.",
    link: "intro",
    label: "Start with the specification",
  },
  {
    title: "What changes in AAP 4.0?",
    answer:
      "AAP 4.0 adopts the stable PAP 1.0: every PAP request carries Poppy-Version: 1.0 next to its delegated Session JWT, and poppy.json declares extensions as per-version lists. New vehicles can list rebates. Two optional skills add trade-in valuation and credit applications. MCP, A2A 1.0 and the five core skills keep their meanings. Frozen AAP 3.2 stays available.",
    link: "versioning",
    label: "Read the migration guide",
    latest: true,
  },
  {
    title: "Which PAP version does AAP use?",
    answer:
      "AAP 4.0 uses PAP 1.0, the first stable Personal Agent Protocol release. Readers accept any 1.x poppy.json. Every request with the Poppy-Session header also sends Poppy-Version: 1.0; an endpoint rejects a missing or incompatible version with HTTP 400 version_unsupported. Frozen AAP 3.2 keeps Published PAP 0.3, and a dealer can link that document from supported_versions while clients migrate.",
    link: "personal-agent-protocol",
    label: "Read the PAP profile",
    latest: true,
  },
  {
    title: "Does AAP define a real MCP server?",
    answer:
      "The MCP binding specifies a working Streamable HTTP service with tool discovery, complete schemas and structured results. Dealers or their providers implement and host it. The published mcp.json is a reference tool catalog; downloading it does not connect an agent to live inventory.",
    link: "bindings/mcp",
    label: "Explore native MCP",
  },
  {
    title: "How do the three interfaces fit together?",
    answer:
      "MCP carries tool calls. A2A 1.0 carries typed automotive DataParts through SendMessage. The PAP 1.0 OpenAPI serves personal agents that send a delegated Session JWT in Poppy-Session with the Poppy-Version header. Signed-out calls need no OAuth token; optional account sign-in is separate. The same automotive payloads and behavior apply to all three.",
    link: "personal-agent-protocol",
    label: "Read the PAP profile",
  },
  {
    title: "Must every implementation support all three?",
    answer:
      "A full AAP dealer deployment exposes its implemented skill subset through MCP, A2A and PAP OpenAPI. A buyer client only needs the binding it uses. A partial dealer implementation can identify its supported AAP binding, but cannot claim full deployment conformance.",
    link: "conformance",
    label: "Understand conformance",
  },
  {
    title: "How will an agent find the dealership?",
    answer:
      "Start with the dealership’s own domain: /.well-known/agent-card.json, /.well-known/poppy.json and /llms.txt. These link the exact working endpoints and capabilities. A hosting provider can run the service while the dealer retains its discoverable identity.",
    link: "discovery",
    label: "See the discovery pattern",
  },
  {
    title: "Will every assistant automatically use AAP?",
    answer:
      "No. An assistant must discover the service, support an advertised interface and choose to use it. A card, llms.txt file or public mention does not install a connector or prove a protocol call occurred. Confirm actual use through request logs and client interoperability checks.",
    link: "conformance",
    label: "Verify actual behavior",
  },
  {
    title: "What can an agent do with the five core skills?",
    answer:
      "Read dealer locations and hours, discover inventory values, search matching vehicles, inspect a specific listing and send an explicitly consented inquiry. Vehicle interest, trade-in details and an appointment request can share one lead. Dealers may add two optional skills: trade-in valuation and credit applications. Payments, checkout, reservations and binding purchase quotes are outside the contract.",
    link: "skills/lead-submit",
    label: "Understand the inquiry lifecycle",
  },
  {
    title: "Does AAP support trade-in valuations?",
    answer:
      "Yes, through the optional trade_in.submit skill. The agent describes the vehicle (year, make, model, condition and mileage) and receives an amount or a range, as an estimate or a time-limited offer. Without contact details and consent it is an anonymous estimate and the dealer does not follow up; a dealer may require contact. Trade-in details inside lead.submit still return no valuation.",
    link: "skills/trade-in-submit",
    label: "Read the trade-in skill",
    latest: true,
  },
  {
    title: "Can an agent submit a credit application?",
    answer:
      "Yes, when the dealer declares the optional credit_application.submit skill. Each applicant grants their own credit consent with the exact text shown and a soft or hard inquiry; a hard inquiry is never made on a soft authorization. The agent reads the dealer’s capabilities first and collects a national identifier only when the dealer accepts one. Identifiers, date of birth and driver’s license data are never echoed in responses, errors, logs or URLs. Sign-in or lead consent never replaces credit consent.",
    link: "skills/credit-application-submit",
    label: "Read the credit application skill",
    latest: true,
  },
  {
    title: "What are rebates and are they included in the price?",
    answer:
      "Rebates are incentive programs listed on new vehicles. An unconditional rebate is available to every buyer and is already included in the price, so it is never subtracted again. A conditional rebate depends on eligibility, such as military service, and is shown separately as a possible saving; it is never deducted from the advertised price. No rebate list means no information, not “no rebates”.",
    link: "pricing-and-ftc#rebates-on-new-vehicles",
    label: "Read the rebate rules",
    latest: true,
  },
  {
    title: "How are prices and equipment kept trustworthy?",
    answer:
      "A known vehicle price includes mandatory dealer charges and any unconditional rebate. Only government-required consumer charges are excluded. Equipment filters require vehicle-specific source evidence; unknown equipment cannot count as present. Listing status and source update time remain explicit.",
    link: "pricing-and-ftc",
    label: "Read the pricing rules",
  },
  {
    title: "Does authentication give permission to contact a shopper?",
    answer:
      "No. Authentication identifies the calling agent. lead.submit separately requires explicit customer contact consent, permitted channels, matching contact details and an idempotency key. A consented trade-in follows the same rule, and a credit application needs separate credit consent from each applicant. The response distinguishes a received inquiry from a confirmed appointment.",
    link: "behavior-rules",
    label: "Read the consent rules",
  },
  {
    title: "Do dealers need an AI model or a new CRM?",
    answer:
      "No. Ordinary application code can serve structured inventory queries and lead operations. Existing dealer systems can stay in place. A verified ADF/XML mapping can deliver supported lead fields to a CRM while a separate record retains consent and idempotency.",
    link: "compatibility/adf-mapping",
    label: "Explore the CRM mapping",
  },
  {
    title: "Which contract should developers pin?",
    answer: `Use the exact AAP version advertised by the deployment. The current stable release is ${release.version}; released contracts stay immutable. /docs/latest contains editable work and may describe a future release. Protocol revisions for MCP, A2A and PAP are separate from the AAP version.`,
    link: "versioning",
    label: "Check version selection",
  },
];

export default function Faq(): JSX.Element {
  return (
    <Layout
      title="AAP, explained"
      description={`How Auto Agent Protocol ${release.version} connects MCP, A2A and PAP to dealership discovery, inventory, pricing, evidence and consent.`}
    >
      <main className={styles.page}>
        <article>
          <header className={styles.header}>
            <p>AUTO AGENT PROTOCOL · {release.version}</p>
            <h1>AAP, explained.</h1>
            <div className={styles.intro}>
              One automotive contract.
              <br />
              Three native ways for agents to use it.
            </div>
            <div className={styles.protocols}>
              <span>MCP</span>
              <span>A2A</span>
              <span>PAP</span>
            </div>
          </header>
          <div className={styles.questions}>
            {questions.map((question, index) => (
              <details key={question.title} open={index === 0}>
                <summary>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  {question.title}
                </summary>
                <div>
                  <p>{question.answer}</p>
                  <Link
                    to={`${question.latest ? latestDocs : docs}/${question.link}`}
                  >
                    {question.label} <span aria-hidden="true">↗</span>
                  </Link>
                </div>
              </details>
            ))}
          </div>
          <footer className={styles.footer}>
            <h2>Ready to build?</h2>
            <p>
              Start with discovery, choose your interface and verify the shared
              behavior.
            </p>
            <Link className="button button--primary" to={`${docs}/intro`}>
              Read the specification
            </Link>
            <Link to="https://github.com/auto-agent-protocol/auto-agent-protocol">
              Explore GitHub ↗
            </Link>
          </footer>
        </article>
      </main>
    </Layout>
  );
}
