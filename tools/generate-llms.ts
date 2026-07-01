// Generates static/llms.txt and static/llms-full.txt from the single sources of
// truth — sidebars.ts (doc structure/order), spec/<latest>/skills.yaml (skills +
// version + schema URLs), and the docs' own frontmatter/prose — so neither file
// is ever hand-maintained or drifts on a version change. Run as part of
// `pnpm run generate`; the outputs are gitignored build artifacts.
//
// llms.txt        — the llmstxt.org index (curated links).
// llms-full.txt   — every docs page inlined into one file for one-fetch LLM ingestion.

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { parse as parseYaml } from "yaml";
import { LATEST } from "./versions.js";
import sidebars from "../sidebars.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DOCS_DIR = resolve(ROOT, "docs");
const OUT_DIR = resolve(ROOT, "static");

// Stable site identity (not version-dependent). Everything version-specific below
// is derived from LATEST / skills.yaml.
const SITE = "https://autoagentprotocol.org";
const TITLE = "Auto Agent Protocol";
const DOCS_BASE = `${SITE}/docs/${LATEST}`;
const VER_BASE = `${SITE}/${LATEST}`;

interface Skill {
  id: string;
  name: string;
  description: string;
}
interface SkillsManifest {
  version: string;
  extension_uri: string;
  skills: Skill[];
}

const skillsManifest = parseYaml(
  readFileSync(resolve(ROOT, "spec", LATEST, "skills.yaml"), "utf-8")
) as SkillsManifest;

// --- sidebar traversal (doc structure is the single source of order) ---
type SidebarItem = string | { type: string; label: string; items?: SidebarItem[] };
const rootItems = (sidebars as { specSidebar: SidebarItem[] }).specSidebar;

const strings = (items: SidebarItem[]): string[] =>
  items.filter((i): i is string => typeof i === "string");

// Recursively collect doc ids in sidebar order, walking nested categories.
// Tolerates non-category items (link/html/ref) that carry no `items`.
const collectDocIds = (items: SidebarItem[] = []): string[] =>
  items.flatMap((i) => (typeof i === "string" ? [i] : collectDocIds(i.items)));

const topLevelDocs = strings(rootItems);
const categories = rootItems.filter(
  (i): i is { type: string; label: string; items?: SidebarItem[] } => typeof i !== "string"
);
// Full reading order: every doc (including any nested categories), in sidebar order.
const allDocIds = collectDocIds(rootItems);

// --- doc reading ---
interface Doc {
  title: string;
  description: string;
  body: string;
}
function readDoc(id: string): Doc {
  const raw = readFileSync(resolve(DOCS_DIR, `${id}.md`), "utf-8");
  const fm = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!fm) return { title: id, description: "", body: raw };
  const meta = parseYaml(fm[1]) as Record<string, unknown>;
  return {
    title: typeof meta.title === "string" ? meta.title : id,
    description: typeof meta.description === "string" ? meta.description : "",
    body: raw.slice(fm[0].length),
  };
}

// Clean a doc body into plain, self-contained spec text for llms-full.txt.
function cleanBody(md: string): string {
  return md
    .replace(/```mermaid[\s\S]*?```/g, "") // drop diagram source
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "") // drop images
    .replace(/^:::(\w+)[ \t]*(.*?)\s*$/gm, (_m, type: string, title: string) => {
      // admonition open -> bold, preserving the severity word (Note/Info/Warning/…)
      const label = type.charAt(0).toUpperCase() + type.slice(1);
      return title ? `**${label}: ${title}**` : `**${label}**`;
    })
    .replace(/^:::\s*$/gm, "") // admonition close
    .replace(/\[([^\]]+)\]\((?!https?:)[^)]*\.md[^)]*\)/g, "$1") // relative .md links -> text
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function docLink(id: string): string {
  const d = readDoc(id);
  return `- [${d.title}](${DOCS_BASE}/${id})${d.description ? `: ${d.description}` : ""}`;
}

function buildLlmsTxt(): string {
  const skillIds = skillsManifest.skills.map((s) => s.id).join(", ");
  const out: string[] = [
    `# ${TITLE}`,
    "",
    `> ${TITLE} (AAP) is an open A2A v1.0 profile: AI buyer-agents discover a car dealership, browse its real inventory, and submit consented sales leads. ${skillsManifest.skills.length} skills: ${skillIds}. Current version ${LATEST}; sole transport A2A SendMessage over JSON-RPC 2.0; discovery via /.well-known/agent-card.json; extension URI ${skillsManifest.extension_uri}.`,
    "",
    `The entire specification is also available as a single self-contained file at ${SITE}/llms-full.txt.`,
    "",
    "## Specification",
    ...topLevelDocs.map(docLink),
    "",
  ];
  for (const cat of categories) {
    const ids = collectDocIds(cat.items);
    // The skills category is rendered from skills.yaml below; identify it by
    // content (all skill docs) rather than a fragile display-label match.
    if (ids.length > 0 && ids.every((id) => id.startsWith("skills/"))) continue;
    out.push(`## ${cat.label}`, ...ids.map(docLink), "");
  }
  out.push(
    "## Skills",
    ...skillsManifest.skills.map(
      (s) => `- [${s.name}](${DOCS_BASE}/skills/${s.id.replace(/\./g, "-")}): ${s.description}`
    ),
    "",
    "## Machine-readable artifacts",
    `- [OpenAPI (JSON-RPC)](${VER_BASE}/openapi-jsonrpc.yaml): OpenAPI 3.1 description of AAP over the JSON-RPC binding`,
    `- [MCP manifest](${VER_BASE}/mcp.json): AAP skills exposed as MCP tools`,
    `- [JSON Schemas](${VER_BASE}/schemas/agent-card.schema.json): JSON Schema 2020-12 objects, one file per type under /${LATEST}/schemas/`,
    `- [Agent Card example](${VER_BASE}/examples/agent-card.example.json): sample /.well-known/agent-card.json declaring the aap extension`,
    `- [Full spec, single file](${SITE}/llms-full.txt): entire AAP protocol inlined for one-fetch ingestion`,
    ""
  );
  return out.join("\n");
}

function buildLlmsFull(): string {
  const out: string[] = [
    `# ${TITLE} — Full Specification (${LATEST})`,
    "",
    `Canonical URL: ${SITE}`,
    `Version: ${skillsManifest.version}  |  Extension URI: ${skillsManifest.extension_uri}`,
    "Transport: A2A `SendMessage` over JSON-RPC 2.0 — sole binding",
    "Discovery: GET https://{dealer-domain}/.well-known/agent-card.json",
    "Built on: A2A v1.0 (Agent2Agent, https://a2a-protocol.org)",
    "License: Specification & schemas Apache-2.0; documentation prose CC-BY-4.0",
    `Generated from the ${LATEST} documentation — do not edit by hand. The machine-readable artifacts linked at the end are authoritative over the prose below.`,
    "",
  ];
  for (const id of allDocIds) out.push(cleanBody(readDoc(id).body), "");
  out.push(
    "## Machine-readable artifacts",
    "",
    `- OpenAPI (JSON-RPC, 3.1): ${VER_BASE}/openapi-jsonrpc.yaml`,
    `- MCP manifest:            ${VER_BASE}/mcp.json`,
    `- JSON Schemas (2020-12):  ${VER_BASE}/schemas/<name>.schema.json`,
    `- Agent Card example:      ${VER_BASE}/examples/agent-card.example.json`,
    "- Source repository:       https://github.com/auto-agent-protocol/auto-agent-protocol",
    ""
  );
  return out.join("\n");
}

function main() {
  writeFileSync(resolve(OUT_DIR, "llms.txt"), buildLlmsTxt().trimEnd() + "\n");
  writeFileSync(resolve(OUT_DIR, "llms-full.txt"), buildLlmsFull().trimEnd() + "\n");
  console.log(
    `Generated static/llms.txt + static/llms-full.txt for ${LATEST} (${allDocIds.length} docs, ${skillsManifest.skills.length} skills)`
  );
}

main();
