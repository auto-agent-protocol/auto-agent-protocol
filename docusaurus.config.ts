import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

const config: Config = {
  title: "Auto Agent Protocol",
  tagline:
    "The open standard that lets AI assistants find dealerships, browse real inventory, and send consented leads — built on A2A v1.0",
  favicon: "img/brand/favicon.ico",
  url: "https://autoagentprotocol.org",
  baseUrl: "/",
  organizationName: "auto-agent-protocol",
  projectName: "auto-agent-protocol",
  trailingSlash: false,

  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "warn",

  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  markdown: {
    mermaid: true,
  },

  themes: [
    "@docusaurus/theme-mermaid",
    [
      "@easyops-cn/docusaurus-search-local",
      {
        hashed: true,
        indexDocs: true,
        indexBlog: false,
        indexPages: true,
        language: ["en"],
        docsRouteBasePath: "/docs",
        highlightSearchTermsOnTargetPage: true,
        searchBarShortcutHint: true,
        explicitSearchResultPath: true,
      },
    ],
  ],

  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: "./sidebars.ts",
          editUrl:
            "https://github.com/auto-agent-protocol/auto-agent-protocol/tree/main/",
          // The `current` docs (the `docs/` folder) are the actively-edited
          // v1.2.0. `lastVersion: "current"` makes v1.2 the default served at
          // the docs root and the version the dropdown opens on. The frozen
          // v0.1, v0.2, v1.0 and v1.1 live in `versioned_docs/version-*` (listed
          // in versions.json) and are reachable via the version dropdown at
          // /docs/v0.1/*, /docs/v0.2/*, /docs/v1.0/* and /docs/v1.1/*.
          lastVersion: "current",
          versions: {
            current: {
              label: "v1.2.0",
              path: "v1.2",
            },
            // Frozen versions keep their URLs, dropdown labels and edit links —
            // only the search index changes. They render the same titles and the
            // same meta descriptions as v1.2, so search engines were indexing up
            // to five interchangeable copies of every page and picking between
            // them themselves; worse, v0.1/v0.2/v1.0 still document the HTTP+JSON
            // (REST) binding that v1.1 removed, so AI crawlers were ingesting
            // superseded normative rules as current. noIndex governs search-index
            // inclusion only: an agent fetching an archived URL directly still
            // gets it, deliberately, since nothing is Disallow-ed — the built-in
            // "unmaintained" banner is what warns that reader.
            "v1.1": { noIndex: true },
            "v1.0": { noIndex: true },
            "v0.2": { noIndex: true },
            "v0.1": { noIndex: true },
          },
        },
        blog: false,
        sitemap: {
          // Only /search needs listing here: the sitemap plugin already drops
          // noIndex routes on its own, so the frozen versions above need no
          // entry, but /search is the local search UI (no noIndex of its own)
          // and is not content.
          ignorePatterns: ["/search"],
        },
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],

  plugins: [
    [
      "@docusaurus/plugin-client-redirects",
      {
        createRedirects(existingPath: string) {
          // Alias the latest version (v1.2) under /docs/latest/* so consumers
          // can deep-link to the most recent docs without pinning a version.
          if (existingPath.startsWith("/docs/v1.2/")) {
            return [existingPath.replace("/docs/v1.2/", "/docs/latest/")];
          }
          return undefined;
        },
      },
    ],
  ],

  // Site-wide schema.org structured data (WebSite + Organization) for rich
  // results and AI/search grounding. Page-specific structured data (the spec
  // APIReference) is injected on the homepage via <Head> in src/pages/index.tsx.
  headTags: [
    {
      tagName: "link",
      attributes: { rel: "icon", type: "image/svg+xml", href: "/img/brand/favicon.svg" },
    },
    {
      tagName: "link",
      attributes: { rel: "apple-touch-icon", sizes: "180x180", href: "/img/brand/apple-touch-icon.png" },
    },
    {
      tagName: "script",
      attributes: { type: "application/ld+json" },
      innerHTML: JSON.stringify({
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "WebSite",
            "@id": "https://autoagentprotocol.org/#website",
            name: "Auto Agent Protocol",
            alternateName: "AAP",
            url: "https://autoagentprotocol.org/",
            description:
              "The open standard that lets AI assistants find dealerships, browse real inventory, and send consented leads — built on A2A v1.0.",
            inLanguage: "en",
            publisher: { "@id": "https://autoagentprotocol.org/#organization" },
            potentialAction: {
              "@type": "SearchAction",
              target: {
                "@type": "EntryPoint",
                urlTemplate:
                  "https://autoagentprotocol.org/search?q={search_term_string}",
              },
              "query-input": "required name=search_term_string",
            },
          },
          {
            "@type": "Organization",
            "@id": "https://autoagentprotocol.org/#organization",
            name: "Auto Agent Protocol",
            alternateName: "AAP",
            url: "https://autoagentprotocol.org/",
            logo: {
              "@type": "ImageObject",
              url: "https://autoagentprotocol.org/img/brand/aap-symbol.png",
              width: 1024,
              height: 1024,
            },
            description:
              "An open A2A v1.0 profile for automotive: buyer-agent discovery, real inventory browsing, and consented lead submission.",
            sameAs: [
              "https://github.com/auto-agent-protocol/auto-agent-protocol",
            ],
          },
        ],
      }),
    },
  ],

  themeConfig: {
    // Default social-share image (og:image + twitter:image). Relative to
    // static/; Docusaurus expands it to an absolute URL per page.
    image: "img/brand/aap-social-card.png",
    // Global-additive social/SEO tags. Per-page og:title/og:description/og:url
    // and description are emitted by Docusaurus from each page's frontmatter, so
    // they are intentionally NOT set here (setting them globally would override).
    metadata: [
      {
        name: "keywords",
        content:
          "Auto Agent Protocol, AAP, A2A, Agent2Agent, agentic commerce, automotive retail, dealership API, agent card, .well-known/agent-card.json, vehicle inventory API, MCP, JSON-RPC, AI agents, buyer agent, consented leads, car buying, ADF/XML",
      },
      {
        name: "twitter:image:alt",
        content:
          "Auto Agent Protocol — the open automotive retail profile of A2A",
      },
      { property: "og:site_name", content: "Auto Agent Protocol" },
      { property: "og:type", content: "website" },
      {
        property: "og:image:alt",
        content:
          "Auto Agent Protocol — the open automotive retail profile of A2A",
      },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
    ],
    navbar: {
      logo: {
        alt: "Auto Agent Protocol",
        src: "img/brand/aap-wordmark.svg",
        srcDark: "img/brand/aap-wordmark-white.svg",
        width: 238,
        height: 40,
      },
      items: [
        {
          type: "docSidebar",
          sidebarId: "specSidebar",
          position: "left",
          label: "Specification",
        },
        {
          type: "docsVersionDropdown",
          position: "right",
        },
        {
          href: "https://a2a-protocol.org",
          label: "A2A spec",
          position: "right",
        },
        {
          href: "https://github.com/auto-agent-protocol/auto-agent-protocol",
          label: "GitHub",
          position: "right",
        },
      ],
    },
    footer: {
      style: "dark",
      logo: {
        alt: "Auto Agent Protocol",
        src: "img/brand/aap-wordmark-white.svg",
        href: "/",
        width: 298,
        height: 50,
      },
      links: [
        {
          title: "Specification",
          items: [
            { label: "Introduction", to: "/docs/v1.2/intro" },
            { label: "A2A profile", to: "/docs/v1.2/a2a-profile" },
            { label: "Discovery", to: "/docs/v1.2/discovery" },
            { label: "Pricing and FTC", to: "/docs/v1.2/pricing-and-ftc" },
          ],
        },
        {
          title: "Bindings & Skills",
          items: [
            { label: "JSON-RPC binding", to: "/docs/v1.2/bindings/json-rpc" },
            { label: "Inventory search", to: "/docs/v1.2/skills/inventory-search" },
            { label: "Submit lead", to: "/docs/v1.2/skills/lead-submit" },
          ],
        },
        {
          title: "Compatibility",
          items: [
            { label: "ADF mapping", to: "/docs/v1.2/compatibility/adf-mapping" },
            { label: "MCP", to: "/docs/v1.2/compatibility/mcp" },
          ],
        },
        {
          title: "Built on A2A",
          items: [
            {
              label: "A2A protocol",
              href: "https://a2a-protocol.org",
            },
            {
              label: "A2A spec v1.0",
              href: "https://a2a-protocol.org/latest/specification/",
            },
            {
              label: "How AAP profiles A2A",
              to: "/docs/v1.2/a2a-profile",
            },
          ],
        },
        {
          title: "Community",
          items: [
            {
              label: "GitHub",
              href: "https://github.com/auto-agent-protocol/auto-agent-protocol",
            },
            {
              label: "Contributing",
              to: "/docs/v1.2/contributing",
            },
          ],
        },
      ],
      copyright: `Copyright ${new Date().getFullYear()} Auto Agent Protocol contributors. Apache-2.0 License.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ["json", "bash", "yaml"],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
