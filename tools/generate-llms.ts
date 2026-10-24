import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";
import { parse as parseYaml } from "yaml";
import {
  filesIn,
  loadRegistry,
  readJson,
  ROOT,
  SITE,
  stableRelease,
} from "./lib/releases.js";
import {
  parseDoc,
  readableMarkdown,
  type MarkdownDoc,
} from "./lib/markdown.js";
import { loadPartners } from "./check-partners.js";

type SidebarItem =
  | string
  | { type: string; label?: string; id?: string; items?: SidebarItem[] };
type Skill = { id: string; name: string; description: string };
type Manifest = { version: string; extension_uri: string; skills: Skill[] };
const release = stableRelease();
const contract = release.contract;
const docsBase = `${SITE}/docs/${contract}`;
const artifactBase = `${SITE}/${contract}`;
const outDir = join(ROOT, "static");
const manifest = parseYaml(
  readFileSync(join(ROOT, "spec", contract, "skills.yaml"), "utf8"),
) as Manifest;
const poppyVersion = readJson<{ protocol_version: string }>(
  join(ROOT, "spec", contract, "examples/poppy.example.json"),
).protocol_version;
const nativeMcp = existsSync(
  join(ROOT, "spec", contract, "schemas/mcp-endpoint.schema.json"),
);
const interfaces = `${nativeMcp ? "native MCP Streamable HTTP tools; " : ""}A2A 1.0 SendMessage; Poppy draft ${poppyVersion} guest OpenAPI with DPoP`;
const sidebar = readJson<{ specSidebar: SidebarItem[] }>(
  join(ROOT, "versioned_sidebars", `version-${contract}-sidebars.json`),
).specSidebar;
const collectIds = (items: SidebarItem[]): string[] =>
  items.flatMap((item) =>
    typeof item === "string"
      ? [item]
      : item.type === "doc" && item.id
        ? [item.id]
        : collectIds(item.items ?? []),
  );
const ids = collectIds(sidebar);
const documents = new Map<string, MarkdownDoc>();
for (const id of ids)
  documents.set(
    id,
    parseDoc(
      readFileSync(
        join(ROOT, "versioned_docs", `version-${contract}`, `${id}.md`),
        "utf8",
      ),
      id,
    ),
  );
const partners = loadPartners(ROOT);

function docLink(id: string): string {
  const doc = documents.get(id)!;
  return `- [${doc.title}](${docsBase}/${id}.md)${doc.description ? `: ${doc.description}` : ""}`;
}
function artifactLinks(): string[] {
  return [
    `- [MCP reference tool catalog](${artifactBase}/mcp.json): tool definitions, not a running MCP endpoint`,
    `- [A2A JSON-RPC OpenAPI](${artifactBase}/openapi-jsonrpc.yaml): the automotive SendMessage binding`,
    `- [PAP OpenAPI](${artifactBase}/openapi-poppy.yaml): native automotive operations with guest Sessions`,
    `- [Agent Card example](${artifactBase}/examples/agent-card.example.json): replace fictional identity and deployment URLs`,
    `- [Poppy discovery example](${artifactBase}/examples/poppy.example.json): PAP identity, issuer and API discovery`,
    ...(nativeMcp
      ? [
          `- [Dealer llms.txt example](${artifactBase}/examples/llms.txt.example.md): exact MCP URL, discovery links and access requirements`,
        ]
      : []),
    `- [Agent Card schema](${artifactBase}/schemas/agent-card.schema.json): JSON Schema 2020-12; other payload schemas share this versioned directory`,
    `- [Full specification](${SITE}/llms-full.txt): the complete stable documentation in one Markdown file`,
    `- [Source repository](https://github.com/auto-agent-protocol/auto-agent-protocol): schemas, tools, examples and release history`,
  ];
}
function indexText(): string {
  const out = [
    "# Auto Agent Protocol",
    "",
    `> Auto Agent Protocol (AAP) is an open automotive contract for dealership discovery, inventory, pricing and consented inquiries. Current release ${release.version} (contract ${contract}). Interfaces: ${interfaces}.`,
    "",
    "This website publishes the specification and examples. It is not a dealer inventory service or a live MCP endpoint. Find working services through a dealership's own discovery documents and use the exact advertised URLs, capabilities and contract version.",
    "",
    "The links below prefer readable Markdown. Every documentation page also advertises its corresponding Markdown representation with an HTML alternate link. Schemas define payload validation; normative prose defines behavior and security obligations.",
    "",
    "## Start here",
    "",
    `- [AAP FAQ](${SITE}/faq): purpose, native interfaces, discovery and adoption`,
    ...sidebar
      .filter((item): item is string => typeof item === "string")
      .map(docLink),
    "",
  ];
  for (const category of sidebar) {
    if (typeof category === "string" || !category.items) continue;
    out.push(
      `## ${category.label}`,
      "",
      ...collectIds(category.items).map(docLink),
      "",
    );
  }
  out.push(
    "## Machine-readable artifacts",
    "",
    ...artifactLinks(),
    "",
    "## Ecosystem",
    "",
    `- [Public ecosystem register](${SITE}/partners): implementations and upstream organizations; a listing is not certification of AAP ${release.version}`,
    ...partners.partners.map(
      (partner) =>
        `- [${partner.name}](${partner.links[0].url}): ${partner.role}. ${partner.description}`,
    ),
    "",
  );
  return out.join("\n");
}
function fullText(): string {
  const out = [
    `# Auto Agent Protocol — Full Specification (${contract})`,
    "",
    `Canonical URL: ${SITE}`,
    `Version: ${release.version} | Extension URI: ${manifest.extension_uri}`,
    `Interfaces: ${interfaces}`,
    `Source: immutable ${contract} documentation. Editable future work is separate at ${SITE}/docs/latest/intro.md.`,
    "Scope: specification and contract fixtures; not certification of a live dealership or agent.",
    "License: specification and schemas Apache-2.0; documentation prose CC BY 4.0.",
    "",
  ];
  for (const [id, doc] of documents) {
    out.push(
      `<!-- Source: ${docsBase}/${id} -->`,
      "",
      readableMarkdown(doc.body, `${docsBase}/${id}.md`),
      "",
    );
  }
  out.push("## Machine-readable artifacts", "", ...artifactLinks(), "");
  return out.join("\n");
}
function generatePageMarkdown(): number {
  const target = join(outDir, "docs");
  rmSync(target, { recursive: true, force: true });
  const versions = [
    { label: "latest", directory: join(ROOT, "docs"), draft: true },
    ...loadRegistry().releases.map((item) => ({
      label: item.contract,
      directory: join(ROOT, "versioned_docs", `version-${item.contract}`),
      draft: false,
    })),
  ];
  let count = 0;
  for (const version of versions) {
    const destination = join(target, version.label);
    mkdirSync(destination, { recursive: true });
    const imageDirectory = join(version.directory, "img");
    if (existsSync(imageDirectory))
      cpSync(imageDirectory, join(destination, "img"), { recursive: true });
    for (const file of filesIn(version.directory).filter(
      (file) =>
        file.endsWith(".md") &&
        !relative(version.directory, file)
          .split(/[\\/]/)
          .some((part) => part.startsWith("_")),
    )) {
      const id = relative(version.directory, file)
        .replaceAll("\\", "/")
        .replace(/\.md$/, "");
      const doc = parseDoc(readFileSync(file, "utf8"), id);
      const pageUrl = `${SITE}/docs/${version.label}/${id}.md`;
      const content = readableMarkdown(doc.body, pageUrl);
      const header = [
        `<!-- Canonical HTML: ${SITE}/docs/${version.label}/${id} -->`,
        version.draft
          ? `<!-- Editable draft. Stable contract: ${contract}. -->`
          : `<!-- Immutable contract: ${version.label}. -->`,
        "",
      ];
      const output = join(destination, `${id}.md`);
      mkdirSync(dirname(output), { recursive: true });
      writeFileSync(
        output,
        `${header.join("\n")}${/^# /m.test(content) ? "" : `# ${doc.title}\n\n`}${content}\n`,
      );
      count++;
    }
  }
  return count;
}
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "llms.txt"), `${indexText().trimEnd()}\n`);
writeFileSync(join(outDir, "llms-full.txt"), `${fullText().trimEnd()}\n`);
console.log(
  `Generated llms.txt, llms-full.txt and ${generatePageMarkdown()} Markdown pages; stable ${release.version}.`,
);
