// One-time, guarded migration from the pre-registry layout. Keep this script as
// provenance; normal releases must use release:prepare instead.
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { execFileSync } from "node:child_process";
import sidebars from "../sidebars.js";
import { ROOT, SITE, DRAFT_SITE, DRAFT_VERSION, filesIn, writeJson, createIntegrity, type Registry } from "./lib/releases.js";

if (existsSync(join(ROOT, "releases.json"))) throw new Error("Already migrated; use release:prepare");
const baseline = process.argv[2];
if (!baseline || !existsSync(join(baseline, "provenance.json"))) throw new Error("Provide a verified public-artifact baseline directory");
const sourceCommit = execFileSync("git", ["rev-parse", "HEAD"], {cwd: ROOT, encoding: "utf8"}).trim();
if (!sourceCommit.startsWith("bcc14b7")) throw new Error("Bootstrap must run from the reviewed, merged rebranding baseline");
const labels = ["v0.1", "v0.2", "v1.0", "v1.1", "v1.2"];
cpSync(join(ROOT, "docs"), join(ROOT, "versioned_docs/version-v1.2"), {recursive: true, errorOnExist: true, force: false});
writeJson(join(ROOT, "versioned_sidebars/version-v1.2-sidebars.json"), sidebars);
cpSync(join(ROOT, "spec/v1.2"), join(ROOT, "spec/latest"), {recursive: true, errorOnExist: true, force: false});
for (const file of filesIn(join(ROOT, "spec/latest"))) {
  let text = readFileSync(file, "utf8").replaceAll(`${SITE}/v1.2/`, `${DRAFT_SITE}/latest/`).replaceAll(`${SITE}/extensions/aap/v1.2`, `${DRAFT_SITE}/extensions/aap/latest`);
  if (file.endsWith("skills.yaml")) text = text.replace('version: "1.2.0"', `version: "${DRAFT_VERSION}"`);
  writeFileSync(file, text);
}
const registry: Registry = {schemaVersion: 1, stable: "v1.2", releases: labels.map(contract => ({contract, version: `${contract.slice(1)}.0`, sourceCommit}))};
for (const release of registry.releases) {
  const out = join(ROOT, "releases", release.contract);
  mkdirSync(out, {recursive: true});
  cpSync(join(baseline, release.contract), join(out, "artifacts"), {recursive: true});
  writeJson(join(out, "integrity.json"), createIntegrity(ROOT, release));
}
const provenance = JSON.parse(readFileSync(join(baseline, "provenance.json"), "utf8")) as Record<string, unknown>;
writeJson(join(ROOT, "releases/bootstrap-provenance.json"), {...provenance, sourceCommit});
writeJson(join(ROOT, "releases.json"), registry);
writeJson(join(ROOT, "versions.json"), [...labels].reverse());
console.log(`Bootstrapped ${labels.length} immutable releases from ${sourceCommit}; editable source is spec/latest.`);
