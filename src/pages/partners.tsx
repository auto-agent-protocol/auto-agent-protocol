import Link from "@docusaurus/Link";
import Layout from "@theme/Layout";
import Head from "@docusaurus/Head";
import styles from "./partners.module.css";
import registry from "../../partners.json";
import releases from "../../releases.json";

const SITE = "https://autoagentprotocol.org";
const PAGE = `${SITE}/partners`;
const docs = `/docs/${releases.stable}`;

const partners = registry.partners;
const updated = new Date(`${registry.updated}T00:00:00Z`).toLocaleDateString(
  "en-US",
  {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  },
);

const slug = (name: string, index: number) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || `partner-${index + 1}`;

// Page-specific schema.org structured data for the partner register, cross-linked
// (@id) to the site-wide WebSite/Organization graph declared in docusaurus.config.ts.
const partnersStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "CollectionPage",
      "@id": `${PAGE}#page`,
      url: PAGE,
      name: "The Auto Agent Protocol ecosystem",
      description:
        "Public implementations, upstream standards and dealership platforms in the Auto Agent Protocol ecosystem. Each listing states its relationship; listings are not conformance certification.",
      inLanguage: "en",
      dateModified: registry.updated,
      isPartOf: { "@id": `${SITE}/#website` },
      publisher: { "@id": `${SITE}/#organization` },
      breadcrumb: { "@id": `${PAGE}#breadcrumb` },
      mainEntity: {
        "@type": "ItemList",
        "@id": `${PAGE}#list`,
        name: "The Auto Agent Protocol ecosystem",
        description:
          "Organizations with a public, verifiable connection to Auto Agent Protocol or its upstream agent standards. Each entry states the basis for its listing.",
        itemListOrder: "https://schema.org/ItemListOrderAscending",
        numberOfItems: partners.length,
        itemListElement: partners.map((partner, index) => ({
          "@type": "ListItem",
          position: index + 1,
          item: {
            "@type": partner.type,
            name: partner.name,
            url: partner.links[0].url,
            disambiguatingDescription: partner.role,
            description: partner.description,
            ...(partner.links.length > 1
              ? {
                  brand: partner.links.slice(1).map((link) => ({
                    "@type": "Brand",
                    name: link.label,
                    url: link.url,
                  })),
                }
              : {}),
          },
        })),
      },
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${PAGE}#breadcrumb`,
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Auto Agent Protocol",
          item: `${SITE}/`,
        },
        { "@type": "ListItem", position: 2, name: "Partners" },
      ],
    },
  ],
};

export default function Partners(): JSX.Element {
  return (
    <Layout
      title="Partners and the AAP ecosystem"
      description="Public implementations, upstream standards and dealership platforms in the Auto Agent Protocol ecosystem."
    >
      <Head>
        <script type="application/ld+json">
          {JSON.stringify(partnersStructuredData).replace(/</g, "\\u003c")}
        </script>
      </Head>
      <main>
        <header className={styles.intro}>
          <div className="container">
            <p className={styles.eyebrow}>Ecosystem</p>
            <h1 className={styles.title}>An open ecosystem.</h1>
            <p className={styles.lede}>
              Implementations, upstream standards and dealership platforms with
              a public connection to AAP. Each listing explains its
              relationship.
            </p>
            <p className={styles.spec}>
              Listings are free and require no reciprocal link. They are not an
              endorsement or certification of a particular AAP version. Verify a
              deployment’s advertised version and{" "}
              <Link to={`${docs}/conformance`}>conformance</Link> directly.
            </p>
            <p className={styles.count}>
              {partners.length} organizations, listed alphabetically. Last
              updated <time dateTime={registry.updated}>{updated}</time>.
            </p>
          </div>
        </header>

        <section className={styles.listing}>
          <div className="container">
            <ul className={styles.list} role="list">
              {partners.map((partner, index) => (
                <li key={partner.name} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h2 id={slug(partner.name, index)} className={styles.name}>
                      {partner.name}
                    </h2>
                    <span className={styles.role}>{partner.role}</span>
                  </div>
                  <p className={styles.description}>{partner.description}</p>
                  <ul className={styles.sites} role="list">
                    {partner.links.map((link) => (
                      <li key={link.url}>
                        {/* Overrides Link's noreferrer default, which would hide us from partner analytics. */}
                        <Link
                          className={styles.site}
                          href={link.url}
                          rel="noopener"
                          data-partner-link=""
                        >
                          {link.label}
                          <span aria-hidden="true">↗</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>

            <section className={styles.join}>
              <h2>Get listed</h2>
              <h3 className={styles.joinQuestion}>Who can be listed?</h3>
              <p className={styles.joinAnswer}>
                Build an AAP service or buyer agent, connect AAP leads to a
                dealer CRM, or maintain an upstream specification. Show public
                evidence: an Agent Card, documentation, release or announcement.
              </p>
              <h3 className={styles.joinQuestion}>How do I get listed?</h3>
              <p className={styles.joinAnswer}>
                Open an issue with your organization name, website and evidence.
                Maintainers review each request and may remove entries whose
                public evidence no longer resolves.
              </p>
              <Link
                className="button button--primary"
                href="https://github.com/auto-agent-protocol/auto-agent-protocol/issues/new?template=partner_listing.md"
              >
                Request a listing
              </Link>
            </section>
          </div>
        </section>
      </main>
    </Layout>
  );
}
