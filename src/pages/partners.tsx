import Link from "@docusaurus/Link";
import Layout from "@theme/Layout";
import Head from "@docusaurus/Head";
import styles from "./partners.module.css";
import registry from "../../partners.json";

const SITE = "https://autoagentprotocol.org";
const PAGE = `${SITE}/partners`;

const partners = registry.partners;
const updated = new Date(`${registry.updated}T00:00:00Z`).toLocaleDateString("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

const slug = (name: string, index: number) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `partner-${index + 1}`;

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
        "Organizations with a public, verifiable connection to the Auto Agent Protocol or the A2A standard it profiles: implementations, upstream specifications, and dealership platforms.",
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
          "Organizations with a public, verifiable connection to the Auto Agent Protocol or the A2A standard it profiles. Each entry states the basis for its listing.",
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
        { "@type": "ListItem", position: 1, name: "Auto Agent Protocol", item: `${SITE}/` },
        { "@type": "ListItem", position: 2, name: "Partners" },
      ],
    },
  ],
};

export default function Partners(): JSX.Element {
  return (
    <Layout
      title="Partners and the AAP ecosystem"
      description="Organizations with a public, verifiable connection to AAP or the A2A standard it profiles — implementations, upstream specs, and dealership platforms."
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
            <h1 className={styles.title}>Partners</h1>
            <p className={styles.lede}>
              <strong>
                Partners are organizations with a public, verifiable connection to AAP or to the
                A2A standard it profiles
              </strong>{" "}
              — a shipped implementation, a published agent card, or stewardship of an upstream
              specification. AAP is a free, open standard: a listing costs nothing, requires no
              reciprocal link, and is not a commercial endorsement.
            </p>
            <p className={styles.spec}>
              What a listing may claim is defined by the specification: the{" "}
              <Link to="/docs/latest/discovery">agent card and extension URI</Link>, the{" "}
              <Link to="/docs/latest/bindings/json-rpc">JSON-RPC binding</Link>, the{" "}
              <Link to="/docs/latest/intro">five skills</Link>, and the{" "}
              <Link to="/docs/latest/compatibility/adf-mapping">ADF lead mapping</Link>.
            </p>
            <p className={styles.count}>
              {partners.length} organizations, listed alphabetically. Last updated{" "}
              <time dateTime={registry.updated}>{updated}</time>.
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
                        <Link className={styles.site} href={link.url} rel="noopener" data-partner-link="">
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
                Listings are open to organizations that ship an AAP agent, build a buyer agent
                against AAP, map AAP leads into a dealer CRM, or maintain a specification AAP
                depends on. The evidence has to be public — an agent card, a documentation page, a
                release, or a published announcement. Maintainers review each request, and may
                decline a listing or remove one whose public evidence no longer resolves.
              </p>
              <h3 className={styles.joinQuestion}>How do I get listed?</h3>
              <p className={styles.joinAnswer}>
                Open an issue with your organization name, your site, and the public evidence.
                Maintainers add the entry to <code>partners.json</code> in the repository, where the
                alphabetical order and the link rules are enforced by CI.
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
