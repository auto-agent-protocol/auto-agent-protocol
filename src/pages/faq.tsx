import Link from "@docusaurus/Link";
import Layout from "@theme/Layout";
import releases from "../../releases.json";
import styles from "./faq.module.css";

const release = releases.releases.find(
  (item) => item.contract === releases.stable,
)!;
const docs = `/docs/${release.contract}`;
const questions = [
  {
    title: "What is Auto Agent Protocol?",
    answer:
      "AAP is an independent, open automotive contract. It defines what dealership information, inventory, prices, equipment evidence and consented inquiries mean across Model Context Protocol (MCP), Agent2Agent (A2A) and Personal Agent Protocol (PAP).",
    link: "intro",
    label: "Start with the specification",
  },
  {
    title: "What changes in AAP 3.1?",
    answer:
      "Currency and odometer labels preserve native USD/CAD amounts and mi/km readings. Search and facets select one currency and a mileage comparison unit, with explicit capability defaults and result context. Omitted vehicle labels keep their USD/miles meaning. This additive release retains the three native interfaces and frozen 3.0 contract.",
    link: "versioning",
    label: "Read the migration guide",
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
      "MCP carries tool calls. A2A 1.0 carries typed automotive DataParts through SendMessage. Poppy draft 0.3 guest OpenAPI uses verified Sessions and DPoP for personal agents. The same automotive payloads and behavior apply to all three.",
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
    title: "What can an agent do with the five skills?",
    answer:
      "Read dealer locations and hours, discover inventory values, search matching vehicles, inspect a specific listing and send an explicitly consented inquiry. Vehicle interest, trade-in information and an appointment request can share one lead. Payments, financing approval and vehicle reservations are outside the contract.",
    link: "skills/lead-submit",
    label: "Understand the inquiry lifecycle",
  },
  {
    title: "How are prices and equipment kept trustworthy?",
    answer:
      "A known vehicle price includes mandatory dealer charges. Only government-required consumer charges are excluded. Equipment filters require vehicle-specific source evidence; unknown equipment cannot count as present. Listing status and source update time remain explicit.",
    link: "pricing-and-ftc",
    label: "Read the pricing rules",
  },
  {
    title: "Does authentication give permission to contact a shopper?",
    answer:
      "No. Authentication identifies the calling agent. lead.submit separately requires explicit customer contact consent, permitted channels, matching contact details and an idempotency key. The response distinguishes a received inquiry from a confirmed appointment.",
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
      description="How Auto Agent Protocol 3.0 connects MCP, A2A and PAP to dealership discovery, inventory, pricing, evidence and consent."
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
                  <Link to={`${docs}/${question.link}`}>
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
