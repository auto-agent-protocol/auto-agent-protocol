import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
  specSidebar: [
    "intro",
    "why",
    "a2a-profile",
    "discovery",
    "contract-manifest",
    "pricing-and-ftc",
    {
      type: "category",
      label: "Bindings",
      collapsed: false,
      items: [
        "bindings/json-rpc",
        "bindings/rest",
      ],
    },
    {
      type: "category",
      label: "Skills",
      collapsed: false,
      items: [
        "skills/dealer-information",
        "skills/inventory-facets",
        "skills/inventory-search",
        "skills/inventory-vehicle",
        "skills/lead-submit",
      ],
    },
    {
      type: "category",
      label: "Compatibility",
      items: [
        "compatibility/adf-mapping",
        "compatibility/mcp",
      ],
    },
    "behavior-rules",
    "errors",
    "versioning",
    "contributing",
  ],
};

export default sidebars;
