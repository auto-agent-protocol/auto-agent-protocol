import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";
import releases from "./releases.json";

const stableRelease = releases.releases.find((release) => release.contract === releases.stable);
if (!stableRelease) throw new Error(`Stable release ${releases.stable} is missing from releases.json`);
const stableContract = stableRelease.contract;
const releasedDocs = Object.fromEntries(
  releases.releases.map((release) => [
    release.contract,
    {
      label: release.version,
      path: release.contract,
      ...(release.contract === stableContract
        ? { banner: "none" as const, noIndex: false }
        : { banner: "unmaintained" as const, noIndex: true }),
    },
  ])
);

const config: Config = {
  title: "Auto Agent Protocol",
  tagline:
    "The open automotive contract for MCP, A2A and PAP: dealer discovery, real inventory, evidence, pricing and consent",
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
        // Search every explicitly selected version locally, including drafts
        // and archives. Public search engines index only the stable contract.
        forceIgnoreNoIndex: true,
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
          editUrl: ({ version, docPath }) =>
            version === "current" || version === stableContract
              ? `https://github.com/auto-agent-protocol/auto-agent-protocol/edit/main/docs/${docPath}`
              : undefined,
          // The editable documentation always owns /docs/latest. Every frozen
          // release remains separately addressable and selectable by full
          // SemVer, including the newest approved release.
          includeCurrentVersion: true,
          onlyIncludeVersions: ["current", ...releases.releases.map((release) => release.contract)],
          // Docusaurus's unreleased banner must point from the editable latest
          // page to the corresponding page in the newest published snapshot.
          lastVersion: stableContract,
          versions: {
            current: {
              label: "Latest",
              path: "latest",
              banner: "unreleased",
              badge: false,
              noIndex: true,
            },
            ...releasedDocs,
          },
        },
        blog: false,
        sitemap: {
          // Draft and archived docs are already excluded through noIndex.
          ignorePatterns: ["/search"],
        },
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],

  // Site-wide schema.org structured data (WebSite + Organization) for rich
  // results and AI/search grounding. Page-specific structured data (the spec
  // APIReference) is injected on the homepage via <Head> in src/pages/index.tsx.
  headTags: [
    {
      tagName: "link",
      attributes: { rel: "describedby", type: "text/plain", href: "/llms.txt" },
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
              "The open automotive contract for MCP, A2A and PAP: dealer discovery, real inventory, evidence, pricing and consent.",
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
              "An independent open automotive protocol with native MCP, A2A and Personal Agent Protocol interfaces.",
            sameAs: [
              "https://github.com/auto-agent-protocol/auto-agent-protocol",
            ],
          },
        ],
      }),
    },
  ],

  themeConfig: {
    docs: {
      // Docusaurus otherwise persists the last version a reader opened and
      // replays it as the navbar default on every page that has no version of
      // its own. The version dropdown and the Specification item then advertise
      // a frozen release the reader is not on. With persistence off, a version
      // is displayed only while it is genuinely the active one.
      versionPersistence: "none",
    },
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
          "Auto Agent Protocol, AAP, MCP, Model Context Protocol, PAP, Personal Agent Protocol, A2A, Agent2Agent, agentic commerce, automotive retail, dealership API, agent card, .well-known/agent-card.json, vehicle inventory API, JSON-RPC, AI agents, buyer agent, consented leads, car buying, ADF/XML",
      },
      {
        name: "twitter:image:alt",
        content:
          "Auto Agent Protocol 3.0 — automotive skills through MCP, A2A and PAP",
      },
      { property: "og:site_name", content: "Auto Agent Protocol" },
      { property: "og:type", content: "website" },
      {
        property: "og:image:alt",
        content:
          "Auto Agent Protocol 3.0 — automotive skills through MCP, A2A and PAP",
      },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
    ],
    navbar: {
      logo: {
        alt: "Auto Agent Protocol",
        src: "img/brand/aap-wordmark.png",
        srcDark: "img/brand/aap-wordmark-white.png",
        width: 238,
        height: 40,
      },
      items: [
        {
          to: "/faq",
          label: "FAQ",
          position: "left",
        },
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
          label: "Protocols",
          position: "right",
          items: [
            { label: "MCP specification", href: "https://modelcontextprotocol.io/specification/2026-07-28" },
            { label: "A2A 1.0 specification", href: "https://a2a-protocol.org/v1.0.0/specification/" },
            { label: "PAP draft 0.2 specification", href: "https://personalagentprotocol.org/docs/0.2/spec" },
          ],
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
        src: "img/brand/aap-wordmark-white.png",
        href: "/",
        width: 298,
        height: 50,
      },
      links: [
        {
          title: "Specification",
          items: [
            { label: "Start here", to: `/docs/${stableContract}/intro` },
            { label: "Dealer discovery", to: `/docs/${stableContract}/discovery` },
            { label: "Inventory search", to: `/docs/${stableContract}/skills/inventory-search` },
            { label: "Pricing and consent", to: `/docs/${stableContract}/behavior-rules` },
          ],
        },
        {
          title: "Native interfaces",
          items: [
            { label: "MCP tools", to: `/docs/${stableContract}/bindings/mcp` },
            { label: "A2A messages", to: `/docs/${stableContract}/bindings/json-rpc` },
            { label: "PAP guest API", to: `/docs/${stableContract}/personal-agent-protocol` },
            { label: "CRM / ADF mapping", to: `/docs/${stableContract}/compatibility/adf-mapping` },
          ],
        },
        {
          title: "For builders",
          items: [
            { label: "Conformance", to: `/docs/${stableContract}/conformance` },
            { label: "MCP tool catalog", href: `https://autoagentprotocol.org/${stableContract}/mcp.json` },
            { label: "llms.txt", href: "https://autoagentprotocol.org/llms.txt" },
            { label: "Full specification for agents", href: "https://autoagentprotocol.org/llms-full.txt" },
          ],
        },
        {
          title: "Project",
          items: [
            { label: "FAQ", to: "/faq" },
            { label: "Ecosystem", to: "/partners" },
            { label: "GitHub", href: "https://github.com/auto-agent-protocol/auto-agent-protocol" },
            { label: "Contribute", to: "/docs/latest/contributing" },
          ],
        },
      ],
      copyright: `Copyright ${new Date().getFullYear()} Auto Agent Protocol contributors. Specification: Apache-2.0. Documentation: CC BY 4.0.`,
    },
    prism: {
      theme: {
        ...prismThemes.vsLight,
        styles: [...prismThemes.vsLight.styles, { types: ["attr-name"], style: { color: "#b42335" } }],
      },
      darkTheme: prismThemes.dracula,
      additionalLanguages: ["json", "bash", "yaml"],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
