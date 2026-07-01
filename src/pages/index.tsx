import clsx from "clsx";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
import Head from "@docusaurus/Head";
import styles from "./index.module.css";

function Hero() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={clsx("hero hero--primary", styles.heroBanner)}>
      <div className="container">
        <div className={styles.heroInner}>
          <div className={styles.heroText}>
            <h1 className="hero__title">{siteConfig.title}</h1>
            <p className="hero__subtitle">{siteConfig.tagline}</p>
            <div className={styles.buttons}>
              <Link
                className="button button--secondary button--lg"
                to="/docs/v1.1/intro"
              >
                Read the Spec
              </Link>
              <Link
                className={clsx("button button--outline button--lg", styles.heroGithubButton)}
                to="https://github.com/auto-agent-protocol/auto-agent-protocol"
              >
                GitHub
              </Link>
            </div>
          </div>
          <div className={styles.heroImage}>
            <img
              src="/img/v1.1/hero.png"
              alt="A buyer agent and a dealership digital storefront connected by typed AAP messages"
              width="1376"
              height="768"
              fetchpriority="high"
            />
          </div>
        </div>
      </div>
    </header>
  );
}

const features = [
  {
    title: "An A2A Profile",
    description:
      "AAP is a strict A2A v1.0 profile: typed automotive messages ride on top of A2A's data layer. JSON-RPC 2.0 is the single transport — one SendMessage operation carries every skill.",
  },
  {
    title: "Five Skills",
    description:
      "dealer.information, inventory.facets, inventory.search, inventory.vehicle, lead.submit. Everything a BDC needs in one unified contract.",
  },
  {
    title: "FTC-Aware Pricing",
    description:
      "Three explicit pricing fields (msrp, list_price, price). The price field carries the final out-the-door amount a buyer can actually pay — AAP's rule against bait pricing, aligned with FTC guidance.",
  },
  {
    title: "Anonymous First",
    description:
      "Inventory operations are anonymous by default. Personal data only travels with leads, and only with an explicit ConsentGrant attached.",
  },
  {
    title: "ADF-Mappable Leads",
    description:
      "lead.submit is field-by-field convertible to ADF/XML, so any compliant lead drops cleanly into existing dealer CRMs without bespoke integration.",
  },
  {
    title: "MCP Ready",
    description:
      "An official MCP reference manifest maps every AAP skill to an MCP tool, so MCP hosts can adapt the same contract without speaking A2A directly.",
  },
];

function Features() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {features.map((f, idx) => (
            <div key={idx} className={clsx("col col--4", styles.feature)}>
              <h2>{f.title}</h2>
              <p>{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Skills() {
  return (
    <section className={styles.skillsSection}>
      <div className="container">
        <div className="row">
          <div className="col col--5">
            <h2>Five skills, one contract</h2>
            <p>
              AAP standardizes the five skills that cover a dealership BDC's core
              needs — anonymous inventory queries plus a single unified{" "}
              <code>lead.submit</code> that bundles vehicle interest, trade-in,
              and appointment scheduling in one consented call. No quotes, no
              checkout, no payment scope. Just the read-and-lead lifecycle,
              typed and validated.
            </p>
            <Link to="/docs/v1.1/intro" className="button button--primary">
              Browse the skills
            </Link>
          </div>
          <div className="col col--7">
            <img
              src="/img/v1.1/skills-overview.png"
              alt="Honeycomb of five AAP skills: dealer.information, inventory.facets, inventory.search, inventory.vehicle, lead.submit"
              className={styles.fullImage}
              width="1376"
              height="768"
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section className={styles.pricingSection}>
      <div className="container">
        <div className="row">
          <div className="col col--7">
            <img
              src="/img/v1.1/pricing-ladder.png"
              alt="Vehicle pricing ladder: msrp, list_price, and the FTC-final price"
              className={styles.fullImage}
              width="1376"
              height="768"
              loading="lazy"
              decoding="async"
            />
          </div>
          <div className="col col--5">
            <h2>FTC-aware pricing, baked in</h2>
            <p>
              Vehicles carry three explicit pricing fields. The{" "}
              <code>price</code> field is the final out-the-door
              amount — what the buyer would actually pay; AAP requires it so
              agents never quote bait prices. <code>msrp</code> and{" "}
              <code>list_price</code> sit beside it, so AI agents can give honest
              answers, in line with the FTC's push against hidden fees and bait pricing.
            </p>
            <Link to="/docs/v1.1/pricing-and-ftc" className="button button--primary">
              Read the pricing semantics
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Protocols() {
  return (
    <section className={styles.protocols}>
      <div className="container">
        <h2 style={{ textAlign: "center", marginBottom: "2rem" }}>
          How AAP relates to other protocols
        </h2>
        <div className="row">
          <div className="col col--3">
            <h3>A2A</h3>
            <p>
              <strong>The base.</strong> AAP is a strict A2A v1.0 profile.
              Every AAP message rides inside an A2A <code>DataPart</code>.
            </p>
          </div>
          <div className="col col--3">
            <h3>ACP / UCP</h3>
            <p>
              Complementary. AAP focuses on automotive leads and appointments,
              not commerce checkout flows.
            </p>
          </div>
          <div className="col col--3">
            <h3>MCP</h3>
            <p>
              Complementary. AAP publishes an official MCP reference manifest mapping
              every skill to an MCP tool.
            </p>
          </div>
          <div className="col col--3">
            <h3>ADF/XML</h3>
            <p>
              Legacy bridge. <code>lead.submit</code> maps field-by-field to
              ADF/XML for existing dealer CRMs.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// Page-specific schema.org structured data for the homepage: the AAP spec as an
// APIReference, cross-linked (@id) to the site-wide WebSite/Organization graph
// declared in docusaurus.config.ts headTags.
const specStructuredData = {
  "@context": "https://schema.org",
  "@type": "APIReference",
  "@id": "https://autoagentprotocol.org/#spec",
  name: "Auto Agent Protocol (AAP) v1.1 Specification",
  headline:
    "Auto Agent Protocol — an open A2A v1.0 profile for automotive retail",
  url: "https://autoagentprotocol.org/docs/v1.1/intro",
  description:
    "AAP defines five A2A skills — dealer.information, inventory.facets, inventory.search, inventory.vehicle, lead.submit — carried over A2A SendMessage on JSON-RPC 2.0, with discovery via /.well-known/agent-card.json.",
  abstract:
    "Open standard letting AI buyer-agents discover a dealership, browse real inventory, and submit consented leads.",
  articleSection: "Specification",
  inLanguage: "en",
  version: "1.1.0",
  keywords:
    "Auto Agent Protocol, AAP, A2A, Agent2Agent, JSON-RPC, agent card, automotive inventory, dealership AI, consented leads, agentic commerce",
  isBasedOn: "https://a2a-protocol.org/latest/specification/",
  isPartOf: { "@id": "https://autoagentprotocol.org/#website" },
  author: { "@id": "https://autoagentprotocol.org/#organization" },
  publisher: { "@id": "https://autoagentprotocol.org/#organization" },
  image: "https://autoagentprotocol.org/img/v1.1/aap-hero-banner.png",
  license: "https://www.apache.org/licenses/LICENSE-2.0",
  workExample: [
    {
      "@type": "SoftwareSourceCode",
      name: "AAP JSON-RPC OpenAPI",
      codeRepository:
        "https://github.com/auto-agent-protocol/auto-agent-protocol",
      url: "https://autoagentprotocol.org/v1.1/openapi-jsonrpc.yaml",
      programmingLanguage: "OpenAPI",
    },
    {
      "@type": "SoftwareSourceCode",
      name: "AAP MCP manifest",
      url: "https://autoagentprotocol.org/v1.1/mcp.json",
      programmingLanguage: "JSON",
    },
  ],
};

export default function Home(): JSX.Element {
  return (
    <Layout
      title="Auto Agent Protocol"
      description="The A2A v1.0 Automotive Retail Profile — typed messages for dealer agents"
    >
      <Head>
        <script type="application/ld+json">
          {JSON.stringify(specStructuredData)}
        </script>
      </Head>
      <Hero />
      <main>
        <Features />
        <Skills />
        <Pricing />
        <Protocols />
      </main>
    </Layout>
  );
}
