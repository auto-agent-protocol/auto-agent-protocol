import { readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { filesIn, hash, ROOT, stableRelease } from "./lib/releases.js";

function tree(directory: string): Record<string, string> {
  return Object.fromEntries(filesIn(directory).map(file => [relative(directory, file).split("\\").join("/"), hash(readFileSync(file))]));
}

const stable = stableRelease(ROOT);
const pinned = tree(resolve(ROOT, "static", stable.contract));
const latest = tree(resolve(ROOT, "static/latest"));
if (JSON.stringify(pinned) !== JSON.stringify(latest)) throw new Error(`Public /latest is not byte-identical to ${stable.contract}`);

const build = resolve(ROOT, "build");
const textFiles = filesIn(build).filter(file => /\.(?:html|js|json|xml|txt|ya?ml)$/.test(file));
for (const file of textFiles) {
  const text = readFileSync(file, "utf8");
  if (text.includes("autoagentprotocol.invalid") || text.includes("Unreleased draft")) throw new Error(`Draft content leaked into production build: ${relative(ROOT, file)}`);
}
if (!readdirSync(join(build, "docs")).includes("latest")) throw new Error("Production docs/latest alias is missing");
console.log(`Production build valid: /latest equals ${stable.contract}; no draft identifiers found.`);
