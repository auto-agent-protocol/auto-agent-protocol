import Link from "@docusaurus/Link";
import ThemedImage from "@theme/ThemedImage";
import Layout from "@theme/Layout";
import Head from "@docusaurus/Head";
import styles from "./index.module.css";
import releases from "../../releases.json";
import MultiClassDiagram from "../../docs/img/multi-class-inventory.svg";
import SkillsDiagram from "../../docs/img/skills-overview.svg";
import PricingDiagram from "../../docs/img/pricing-ladder.svg";

const stableRelease = releases.releases.find((release) => release.contract === releases.stable);
if (!stableRelease) throw new Error(`Stable release ${releases.stable} is missing from releases.json`);
const stableContract = stableRelease.contract;
const stableVersion = stableRelease.version;

function Hero() {
  return (
    <header className={styles.heroBanner}>
      <div className="container">
        <p className={styles.eyebrow}>The open automotive retail profile of A2A</p>
        <h1 className={styles.brandHeading}>
          <ThemedImage
            alt="Auto Agent Protocol"
            sources={{
              light: "/img/brand/aap-wordmark.svg",
              dark: "/img/brand/aap-wordmark-white.svg",
            }}
            width={1190}
            height={200}
            className={styles.heroWordmark}
          />
        </h1>
        <p className={styles.heroDescription}>
          One open contract for dealer discovery, real inventory,
          transparent pricing, and consented leads.
        </p>
        <div className={styles.buttons}>
          <Link
            className="button button--primary button--lg"
                to="/docs/latest/intro"
          >
            Read the Spec
          </Link>
          <Link
            className="button button--outline button--primary button--lg"
            to="https://github.com/auto-agent-protocol/auto-agent-protocol"
          >
            GitHub
          </Link>
        </div>
        <div className={styles.protocolProof} aria-label="Core protocol choices">
          <span>A2A v1.0 profile</span>
          <span>JSON-RPC 2.0</span>
          <span>Five typed skills</span>
        </div>
        <Link className={styles.profileLink} to="/docs/latest/a2a-profile">See how AAP profiles A2A <span aria-hidden="true">↗</span></Link>
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
      "The authoritative price includes mandatory dealer charges and travels with the vehicle's complete effective fee snapshot. Government charges remain outside price; conditional rebates never reduce it.",
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
        <div className={styles.sectionLead}>
          <p className={styles.sectionEyebrow}>Small surface, strong guarantees</p>
          <h2>Everything needed for the read-and-lead journey</h2>
          <p>AAP stays deliberately narrow so dealerships and buyer agents can implement it with confidence.</p>
        </div>
        <div className={styles.featureMatrix}>
          {features.map((feature, index) => (
            <article key={feature.title} className={styles.feature}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function MultiClass() {
  return (
    <section className={styles.multiClassSection}>
      <div className="container">
        <div className="row">
          <div className="col col--5">
            <h2>Cars, EVs, and motorcycles — one contract</h2>
            <p>
              v{stableVersion} extends inventory beyond cars. An optional{" "}
              <code>vehicle_type</code> discriminator covers{" "}
              <code>car</code>, <code>motorcycle</code>, and room for trailer /
              RV later (absent means car, so existing integrations keep
              working). Electric cars and electric motorcycles share the same
              powertrain fields — including filterable <code>charge_port</code> —
              while motorcycle segments reuse free-text <code>body</code>.
            </p>
            <Link to="/docs/latest/skills/inventory-vehicle" className="button button--primary">
              See the vehicle shape
            </Link>
          </div>
          <div className="col col--7">
            <MultiClassDiagram
              role="img"
              aria-label="Cars, motorcycles, and electric powertrains sharing one typed inventory contract"
              className={styles.fullImage}
              width="1600"
              height="800"
            />
          </div>
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
            <Link to="/docs/latest/intro" className="button button--primary">
              Browse the skills
            </Link>
          </div>
          <div className="col col--7">
            <SkillsDiagram
              role="img"
              aria-label="Five AAP skills spanning dealership information, inventory, and consented leads"
              className={styles.fullImage}
              width="1600"
              height="900"
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
            <PricingDiagram
              role="img"
              aria-label="MSRP as a reference and list price plus complete dealer fees equaling the authoritative advertised price"
              className={styles.fullImage}
              width="1600"
              height="900"
            />
          </div>
          <div className="col col--5">
            <h2>FTC-aware pricing, baked in</h2>
            <p>
              A vehicle's <code>price</code> is the authoritative advertised
              price: it includes every mandatory dealer charge and excludes
              government charges. When <code>price</code> is present, the same
              vehicle carries the complete effective <code>fees</code> snapshot.
              Buyer agents never join rooftop defaults into a vehicle, and
              conditional rebates never reduce the advertised price.
            </p>
            <Link to="/docs/latest/pricing-and-ftc" className="button button--primary">
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
        <div className={styles.sectionLead}>
          <p className={styles.sectionEyebrow}>Protocol map</p>
          <h2>Designed to connect, not duplicate</h2>
        </div>
        <div className={styles.protocolGrid}>
          <article>
            <h3>A2A</h3>
            <p>
              <strong>The base.</strong> AAP is a strict A2A v1.0 profile.
              Every AAP message rides inside an A2A <code>DataPart</code>.
            </p>
          </article>
          <article>
            <h3>ACP / UCP</h3>
            <p>
              Complementary. AAP focuses on automotive leads and appointments,
              not commerce checkout flows.
            </p>
          </article>
          <article>
            <h3>MCP</h3>
            <p>
              Complementary. AAP publishes an official MCP reference manifest mapping
              every skill to an MCP tool.
            </p>
          </article>
          <article>
            <h3>ADF/XML</h3>
            <p>
              Legacy bridge. <code>lead.submit</code> maps field-by-field to
              ADF/XML for existing dealer CRMs.
            </p>
          </article>
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
  name: `Auto Agent Protocol (AAP) v${stableVersion} Specification`,
  headline:
    "Auto Agent Protocol — an open A2A v1.0 profile for automotive retail",
  url: "https://autoagentprotocol.org/docs/latest/intro",
  description:
    "AAP defines five A2A skills — dealer.information, inventory.facets, inventory.search, inventory.vehicle, lead.submit — carried over A2A SendMessage on JSON-RPC 2.0, with discovery via /.well-known/agent-card.json.",
  abstract:
    "Open standard letting AI buyer-agents discover a dealership, browse real inventory, and submit consented leads.",
  articleSection: "Specification",
  inLanguage: "en",
  version: stableVersion,
  keywords:
    "Auto Agent Protocol, AAP, A2A, Agent2Agent, JSON-RPC, agent card, automotive inventory, dealership AI, consented leads, agentic commerce",
  isBasedOn: "https://a2a-protocol.org/latest/specification/",
  isPartOf: { "@id": "https://autoagentprotocol.org/#website" },
  author: { "@id": "https://autoagentprotocol.org/#organization" },
  publisher: { "@id": "https://autoagentprotocol.org/#organization" },
  image: "https://autoagentprotocol.org/img/brand/aap-social-card.png",
  license: "https://www.apache.org/licenses/LICENSE-2.0",
  workExample: [
    {
      "@type": "SoftwareSourceCode",
      name: "AAP JSON-RPC OpenAPI",
      codeRepository:
        "https://github.com/auto-agent-protocol/auto-agent-protocol",
      url: `https://autoagentprotocol.org/${stableContract}/openapi-jsonrpc.yaml`,
      programmingLanguage: "OpenAPI",
    },
    {
      "@type": "SoftwareSourceCode",
      name: "AAP MCP manifest",
      url: `https://autoagentprotocol.org/${stableContract}/mcp.json`,
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
        <MultiClass />
        <Skills />
        <Pricing />
        <Protocols />
      </main>
    </Layout>
  );
}
