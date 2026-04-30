import clsx from "clsx";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
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
                to="/docs/v0.1/intro"
              >
                Read the Spec
              </Link>
              <Link
                className="button button--outline button--lg"
                to="https://github.com/auto-agent-protocol/auto-agent-protocol"
                style={{ marginLeft: "1rem", color: "white", borderColor: "white" }}
              >
                GitHub
              </Link>
            </div>
          </div>
          <div className={styles.heroImage}>
            <img src="/img/hero.png" alt="A buyer agent and a dealership digital storefront connected by typed AAP messages" />
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
      "AAP is a strict A2A v1.0 profile: typed automotive messages ride on top of A2A's data layer. Use the JSON-RPC or HTTP+JSON binding — both work identically.",
  },
  {
    title: "Seven Skills",
    description:
      "dealer.information, inventory.facets, inventory.search, inventory.vehicle, lead.general, lead.vehicle, lead.appointment. Everything a BDC needs.",
  },
  {
    title: "FTC-Aware Pricing",
    description:
      "Four explicit pricing fields (msrp, list_price, offered_price, price). The price field reflects the FTC-mandated final out-the-door amount, not bait pricing.",
  },
  {
    title: "Anonymous First",
    description:
      "Inventory operations are anonymous by default. Personal data only travels with leads, and only with an explicit ConsentGrant attached.",
  },
  {
    title: "ADF-Mappable Leads",
    description:
      "lead.vehicle is field-by-field convertible to ADF/XML, so any compliant lead drops cleanly into existing dealer CRMs without bespoke integration.",
  },
  {
    title: "MCP Ready",
    description:
      "An official MCP wrapper exposes every AAP skill as an MCP tool, so LLM-only clients can use the same contract without speaking A2A directly.",
  },
];

function Features() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {features.map((f, idx) => (
            <div key={idx} className={clsx("col col--4", styles.feature)}>
              <h3>{f.title}</h3>
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
            <h2>Seven skills, one contract</h2>
            <p>
              AAP standardizes the seven skills every dealership BDC actually
              needs — from anonymous inventory queries to ADF-mappable
              vehicle-specific leads to test-drive appointment requests. No
              quotes, no checkout, no payment scope. Just the read-and-lead
              lifecycle, typed and validated.
            </p>
            <Link to="/docs/v0.1/intro" className="button button--primary">
              Browse the skills
            </Link>
          </div>
          <div className="col col--7">
            <img
              src="/img/skills-overview.png"
              alt="Honeycomb of seven AAP skills: dealer.information, inventory.facets, inventory.search, inventory.vehicle, lead.general, lead.vehicle, lead.appointment"
              className={styles.fullImage}
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
              src="/img/pricing-ladder.png"
              alt="Vehicle pricing ladder: msrp, list_price, offered_price, and the FTC-final price"
              className={styles.fullImage}
            />
          </div>
          <div className="col col--5">
            <h2>FTC-aware pricing, baked in</h2>
            <p>
              Vehicles carry four explicit pricing fields. The{" "}
              <code>price</code> field is the FTC-required final out-the-door
              amount — what the buyer would actually pay. <code>msrp</code>,{" "}
              <code>list_price</code>, and the regional <code>offered_price</code>{" "}
              sit beside it, so AI agents can give honest answers and dealers
              can stay on the right side of recent FTC enforcement.
            </p>
            <Link to="/docs/v0.1/pricing-and-ftc" className="button button--primary">
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
            <h4>A2A</h4>
            <p>
              <strong>The base.</strong> AAP is a strict A2A v1.0 profile.
              Every AAP message rides inside an A2A <code>DataPart</code>.
            </p>
          </div>
          <div className="col col--3">
            <h4>ACP / UCP</h4>
            <p>
              Complementary. AAP focuses on automotive leads and appointments,
              not commerce checkout flows.
            </p>
          </div>
          <div className="col col--3">
            <h4>MCP</h4>
            <p>
              Complementary. AAP ships an official MCP wrapper that exposes
              every skill as an MCP tool.
            </p>
          </div>
          <div className="col col--3">
            <h4>ADF/XML</h4>
            <p>
              Legacy bridge. <code>lead.vehicle</code> maps field-by-field to
              ADF/XML for existing dealer CRMs.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home(): JSX.Element {
  return (
    <Layout
      title="Auto Agent Protocol"
      description="The A2A v1.0 Automotive Retail Profile — typed messages for dealer agents"
    >
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
