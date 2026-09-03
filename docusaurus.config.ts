import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";
import releases from "./releases.json";

const draftDocs = process.env.AAP_DOCS_DRAFT === "1";
const stableRelease = releases.releases.find((release) => release.contract === releases.stable);
if (!stableRelease) throw new Error(`Stable release ${releases.stable} is missing from releases.json`);
const stableContract = stableRelease.contract;
const releasedDocs = Object.fromEntries(
  releases.releases.map((release) => [
    release.contract,
    {
      label: release.version,
      path: release.contract === stableContract ? "latest" : release.contract,
      ...(release.contract === stableContract
        ? { banner: "none" as const }
        : { banner: "unmaintained" as const, noIndex: true }),
    },
  ])
);
const draftReleasedDocs = Object.fromEntries(
  releases.releases.map((release) => [
    release.contract,
    {
      label: release.version,
      path: release.contract,
      ...(release.contract === stableContract
        ? { banner: "none" as const, noIndex: true }
        : { banner: "unmaintained" as const, noIndex: true }),
    },
  ])
);

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

  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: "warn",
    },
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
          // Local development puts the editable docs at /docs/latest and also
          // keeps every frozen release available in the version selector.
          // Production excludes the draft and aliases /docs/latest to the
          // approved stable release from the registry.
          includeCurrentVersion: draftDocs,
          onlyIncludeVersions: draftDocs
            ? ["current", ...releases.releases.map((release) => release.contract)]
            : releases.releases.map((release) => release.contract),
          lastVersion: draftDocs ? "current" : stableContract,
          versions: draftDocs
            ? {
                current: {
                  label: `Unreleased draft (from ${stableRelease.version})`,
                  path: "latest",
                  banner: "unreleased",
                  badge: false,
                },
                ...draftReleasedDocs,
              }
            : releasedDocs,
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
          // Stable docs are canonical at /docs/latest; retain the immutable
          // release label as an equivalent deep-link route.
          if (!draftDocs && existingPath.startsWith("/docs/latest/")) {
            return [existingPath.replace("/docs/latest/", `/docs/${stableContract}/`)];
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
          to: "/partners",
          label: "Partners",
          position: "left",
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
            { label: "Introduction", to: "/docs/latest/intro" },
            { label: "A2A profile", to: "/docs/latest/a2a-profile" },
            { label: "Discovery", to: "/docs/latest/discovery" },
            { label: "Pricing and fees", to: "/docs/latest/pricing-and-ftc" },
          ],
        },
        {
          title: "Bindings & Skills",
          items: [
            { label: "JSON-RPC binding", to: "/docs/latest/bindings/json-rpc" },
            { label: "Inventory search", to: "/docs/latest/skills/inventory-search" },
            { label: "Submit lead", to: "/docs/latest/skills/lead-submit" },
          ],
        },
        {
          title: "Compatibility",
          items: [
            { label: "ADF mapping", to: "/docs/latest/compatibility/adf-mapping" },
            { label: "MCP", to: "/docs/latest/compatibility/mcp" },
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
              to: "/docs/latest/a2a-profile",
            },
          ],
        },
        {
          title: "Community",
          items: [
            { label: "Partners", to: "/partners" },
            {
              label: "GitHub",
              href: "https://github.com/auto-agent-protocol/auto-agent-protocol",
            },
            {
              label: "Contributing",
              href: "https://github.com/auto-agent-protocol/auto-agent-protocol/blob/main/RELEASING.md",
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
