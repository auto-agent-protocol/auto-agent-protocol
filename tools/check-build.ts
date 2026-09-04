import { readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { filesIn, hash, loadRegistry, readJson, ROOT, stableRelease } from "./lib/releases.js";
import { loadPartners } from "./check-partners.js";

interface DocsGlobalData {
  versions?: Array<{name?: string; label?: string; path?: string; isLast?: boolean}>;
}

function tree(directory: string): Record<string, string> {
  return Object.fromEntries(filesIn(directory).map(file => [relative(directory, file).split("\\").join("/"), hash(readFileSync(file))]));
}

const stable = stableRelease(ROOT);
const registry = loadRegistry(ROOT);
const pinned = tree(resolve(ROOT, "static", stable.contract));
const latest = tree(resolve(ROOT, "static/latest"));
if (JSON.stringify(pinned) !== JSON.stringify(latest)) throw new Error(`Public /latest is not byte-identical to ${stable.contract}`);
const llmsIndex = readFileSync(resolve(ROOT, "static/llms.txt"), "utf8");
if (!llmsIndex.includes(`Current release ${stable.version} (contract ${stable.contract})`)) throw new Error("llms.txt does not distinguish the full SemVer release label from its major/minor contract identifier");

const globalData = readJson<Record<string, {default?: DocsGlobalData}>>(resolve(ROOT, ".docusaurus/globalData.json"));
const renderedVersions = globalData["docusaurus-plugin-content-docs"]?.default?.versions;
if (!renderedVersions) throw new Error("Built documentation version metadata is missing");
const displayedVersions = renderedVersions.map(({name, label, path}) => ({name, label, path}));
const expectedVersions = [
  {name: "current", label: "Latest", path: "/docs/latest"},
  ...[...registry.releases].reverse().map(release => ({
    name: release.contract,
    label: release.version,
    path: `/docs/${release.contract}`,
  })),
];
if (JSON.stringify(displayedVersions) !== JSON.stringify(expectedVersions)) {
  throw new Error(`Documentation version dropdown does not match releases.json:\nexpected ${JSON.stringify(expectedVersions)}\nreceived ${JSON.stringify(displayedVersions)}`);
}
const suggestedVersion = renderedVersions.find(version => version.isLast);
if (suggestedVersion?.name !== stable.contract) {
  throw new Error(`Documentation banners must suggest the latest published version ${stable.contract}, not ${suggestedVersion?.name ?? "an unknown version"}`);
}

const build = resolve(ROOT, "build");
if (!readdirSync(join(build, "docs")).includes("latest")) throw new Error("Production docs/latest alias is missing");
if (!readdirSync(join(build, "docs")).includes(stable.contract)) throw new Error(`Published docs/${stable.contract} is missing`);
const latestDocsRoot = join(build, "docs", "latest");
const latestPages = filesIn(latestDocsRoot).filter(file => file.endsWith(".html"));
for (const file of latestPages) {
  const documentPath = relative(latestDocsRoot, file).split("\\").join("/").replace(/\.html$/, "");
  const expectedTarget = `/docs/${stable.contract}/${documentPath}`;
  const html = readFileSync(file, "utf8");
  const target = html.match(/<a href="([^"]+)">latest version<\/a>/)?.[1];
  if (target !== expectedTarget) {
    throw new Error(`Latest-docs banner in ${relative(ROOT, file)} must link to published ${expectedTarget}, not ${target ?? "a missing target"}`);
  }
}
const partnerAnchors = readFileSync(join(build, "partners.html"), "utf8").match(/<a[^>]*data-partner-link[^>]*>/g) ?? [];
if (partnerAnchors.length !== loadPartners(ROOT).partners.flatMap(partner => partner.links).length) throw new Error("Built partner page does not link every registered partner site");
const qualified = partnerAnchors.find(anchor => /\b(?:nofollow|noreferrer|sponsored)\b/.test(anchor.match(/rel="([^"]*)"/)?.[1] ?? ""));
if (qualified) throw new Error(`Partner links must stay plain dofollow with referrer: ${qualified}`);
console.log(`Production build valid: editable docs rendered at /docs/latest; /latest artifacts equal ${stable.contract}; ${renderedVersions.length - 1} frozen releases remain selectable.`);
