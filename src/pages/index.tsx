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
                to="/docs/v1.0/intro"
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
              src="/img/v1.0/hero.png"
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
      "AAP is a strict A2A v1.0 profile: typed automotive messages ride on top of A2A's data layer. The JSON-RPC binding is required everywhere; HTTP+JSON can be added — the payloads are identical.",
  },
  {
    title: "Five Skills",
    description:
      "dealer.information, inventory.facets, inventory.search, inventory.vehicle, lead.submit. Everything a BDC needs in one unified contract.",
  },
  {
    title: "FTC-Aware Pricing",
    description:
      "Four explicit pricing fields (msrp, list_price, offered_price, price). The price field carries the final out-the-door amount a buyer can actually pay — AAP's rule against bait pricing, aligned with FTC guidance.",
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
            <Link to="/docs/v1.0/intro" className="button button--primary">
              Browse the skills
            </Link>
          </div>
          <div className="col col--7">
            <img
              src="/img/v1.0/skills-overview.png"
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
              src="/img/v1.0/pricing-ladder.png"
              alt="Vehicle pricing ladder: msrp, list_price, offered_price, and the FTC-final price"
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
              Vehicles carry four explicit pricing fields. The{" "}
              <code>price</code> field is the final out-the-door
              amount — what the buyer would actually pay; AAP requires it so
              agents never quote bait prices. <code>msrp</code>,{" "}
              <code>list_price</code>, and the regional <code>offered_price</code>{" "}
              sit beside it, so AI agents can give honest answers, in line with the
              FTC's push against hidden fees and bait pricing.
            </p>
            <Link to="/docs/v1.0/pricing-and-ftc" className="button button--primary">
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
