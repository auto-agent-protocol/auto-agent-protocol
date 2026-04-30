import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

const config: Config = {
  title: "Auto Agent Protocol",
  tagline: "The A2A v1.0 Automotive Retail Profile — typed messages for dealer agents",
  favicon: "img/favicon.ico",
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
          lastVersion: "current",
          versions: {
            current: {
              label: "v0.1",
              path: "v0.1",
            },
          },
        },
        blog: false,
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
          if (existingPath.startsWith("/docs/v0.1/")) {
            return [existingPath.replace("/docs/v0.1/", "/docs/latest/")];
          }
          return undefined;
        },
      },
    ],
  ],

  themeConfig: {
    navbar: {
      title: "Auto Agent Protocol",
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
      links: [
        {
          title: "Specification",
          items: [
            { label: "Introduction", to: "/docs/v0.1/intro" },
            { label: "A2A profile", to: "/docs/v0.1/a2a-profile" },
            { label: "Discovery", to: "/docs/v0.1/discovery" },
            { label: "Pricing and FTC", to: "/docs/v0.1/pricing-and-ftc" },
          ],
        },
        {
          title: "Bindings & Skills",
          items: [
            { label: "JSON-RPC binding", to: "/docs/v0.1/bindings/json-rpc" },
            { label: "REST binding", to: "/docs/v0.1/bindings/rest" },
            { label: "Inventory search", to: "/docs/v0.1/skills/inventory-search" },
            { label: "Vehicle lead", to: "/docs/v0.1/skills/lead-vehicle" },
          ],
        },
        {
          title: "Compatibility",
          items: [
            { label: "ADF mapping", to: "/docs/v0.1/compatibility/adf-mapping" },
            { label: "MCP", to: "/docs/v0.1/compatibility/mcp" },
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
              to: "/docs/v0.1/a2a-profile",
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
              to: "/docs/v0.1/contributing",
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
