import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { execFileSync } from "node:child_process";
import sidebars from "../sidebars.js";
import { checkReleases, compareVersions, contractFor, createIntegrity, DRAFT_SITE, DRAFT_VERSION, filesIn, hash, isMain, loadRegistry, ROOT, SITE, stableRelease, writeJson, type Release } from "./lib/releases.js";
import { validateSchemas } from "./validate-schemas.js";
import { validateExamples } from "./validate-examples.js";
import { generateTypes } from "./generate-types.js";
import { generateOpenapi } from "./generate-openapi.js";
import { generateMcp } from "./generate-mcp-manifest.js";
import { validateManifest } from "./validate-manifest.js";

interface Change {kind: "additive" | "breaking"; file: string; path: string; detail: string}
const JSON_SCHEMA_ANNOTATIONS = new Set(["$comment", "$id", "default", "deprecated", "description", "examples", "readOnly", "title", "writeOnly"]);
function normalizeReleaseIdentifiers(value: unknown): unknown {
  if (typeof value === "string") return value
    .replaceAll(/https:\/\/autoagentprotocol\.org\/v\d+\.\d+\//g, `${SITE}/v{release}/`)
    .replaceAll(/https:\/\/autoagentprotocol\.org\/extensions\/(?:aap|a2a-automotive-retail)\/v\d+\.\d+/g, `${SITE}/extensions/aap/v{release}`);
  if (Array.isArray(value)) return value.map(normalizeReleaseIdentifiers);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, normalizeReleaseIdentifiers(item)]));
  return value;
}
function structuralDiff(previous: unknown, candidate: unknown, file: string, path = "$"): Change[] {
  if (JSON.stringify(previous) === JSON.stringify(candidate)) return [];
  const keyword = path.slice(path.lastIndexOf(".") + 1);
  if (JSON_SCHEMA_ANNOTATIONS.has(keyword)) return [];
  if (previous && candidate && typeof previous === "object" && typeof candidate === "object" && !Array.isArray(previous) && !Array.isArray(candidate)) {
    const before = previous as Record<string, unknown>, after = candidate as Record<string, unknown>, changes: Change[] = [];
    for (const key of Object.keys(before)) {
      if (!(key in after) && !JSON_SCHEMA_ANNOTATIONS.has(key)) changes.push({kind: "breaking", file, path: `${path}.${key}`, detail: "removed"});
      else changes.push(...structuralDiff(before[key], after[key], file, `${path}.${key}`));
    }
    for (const key of Object.keys(after)) if (!(key in before)) {
      if (JSON_SCHEMA_ANNOTATIONS.has(key)) continue;
      const additive = path.endsWith(".properties") || path.endsWith(".$defs");
      changes.push({kind: additive ? "additive" : "breaking", file, path: `${path}.${key}`, detail: additive ? "optional definition/property added" : "value added outside an optional property map"});
    }
    return changes;
  }
  return [{kind: "breaking", file, path, detail: "validation-affecting value changed"}];
}
function compatibility(root: string, previousContract: string, candidateSpec: string): Change[] {
  const previousDir = join(root, "spec", previousContract, "schemas"), candidateDir = join(candidateSpec, "schemas");
  const oldFiles = filesIn(previousDir).map(file => relative(previousDir, file).split("\\").join("/"));
  const newFiles = filesIn(candidateDir).map(file => relative(candidateDir, file).split("\\").join("/"));
  const changes: Change[] = [];
  for (const file of oldFiles) {
    if (!newFiles.includes(file)) changes.push({kind: "breaking", file, path: "$", detail: "schema removed"});
    else changes.push(...structuralDiff(normalizeReleaseIdentifiers(JSON.parse(readFileSync(join(previousDir, file), "utf8"))), normalizeReleaseIdentifiers(JSON.parse(readFileSync(join(candidateDir, file), "utf8"))), file));
  }
  for (const file of newFiles) if (!oldFiles.includes(file)) changes.push({kind: "additive", file, path: "$", detail: "schema added"});
  return changes;
}
function transformDraft(file: string, stable: string, contract: string, version: string): string {
  return readFileSync(file, "utf8")
    .replaceAll(`${DRAFT_SITE}/latest/`, `${SITE}/${contract}/`)
    .replaceAll(`${DRAFT_SITE}/extensions/aap/latest`, `${SITE}/extensions/aap/${contract}`)
    .replaceAll(DRAFT_VERSION, version)
    .replaceAll(`${SITE}/${stable}/`, `${SITE}/${contract}/`)
    .replaceAll(`${SITE}/extensions/aap/${stable}`, `${SITE}/extensions/aap/${contract}`);
}
function workingTree(root: string): string { return execFileSync("git", ["status", "--porcelain", "--untracked-files=all"], {cwd: root, encoding: "utf8"}).trim(); }
function updatePackageVersion(file: string, version: string): void { const value = JSON.parse(readFileSync(file, "utf8")); value.version = version; writeJson(file, value); }

export async function prepareRelease(root: string, version: string, dryRun: boolean): Promise<{contract: string; changes: Change[]}> {
  checkReleases(root);
  const registry = loadRegistry(root), stable = stableRelease(root), contract = contractFor(version);
  if (registry.releases.some(release => release.contract === contract) || existsSync(join(root, "spec", contract))) throw new Error(`${contract} already exists; releases are immutable`);
  const [oldMajor, oldMinor] = stable.version.split(".").map(Number), [major, minor] = version.split(".").map(Number);
  if (compareVersions(version, stable.version) <= 0 || !((major === oldMajor && minor === oldMinor + 1) || (major === oldMajor + 1 && minor === 0))) throw new Error(`Release must be the next minor or next major after ${stable.version}`);
  if (!dryRun && workingTree(root)) throw new Error("Release preparation requires a clean working tree. Commit the reviewed draft first.");
  const draftHash = hash(filesIn(join(root, "spec/latest")).map(file => `${relative(root, file)}\0${hash(readFileSync(file))}`).join("\n"));
  const staging = mkdtempSync(join(tmpdir(), "aap-release-"));
  try {
    const candidateSpec = join(staging, "spec", contract), candidateDocs = join(staging, "versioned_docs", `version-${contract}`), artifacts = join(staging, "artifacts");
    cpSync(join(root, "spec/latest"), candidateSpec, {recursive: true});
    cpSync(join(root, "docs"), candidateDocs, {recursive: true});
    for (const file of [...filesIn(candidateSpec), ...filesIn(candidateDocs)]) writeFileSync(file, transformDraft(file, stable.contract, contract, version));
    const manifest = validateManifest(candidateSpec, contract);
    if (manifest.version !== version || manifest.extension_uri !== `${SITE}/extensions/aap/${contract}` || manifest.schema_base_url !== `${SITE}/${contract}/schemas/`) throw new Error("Candidate manifest did not resolve to pinned release identifiers");
    await validateSchemas(candidateSpec, contract); await validateExamples(candidateSpec, contract);
    mkdirSync(artifacts, {recursive: true});
    await generateTypes(join(candidateSpec, "schemas"), artifacts, version); await generateOpenapi(candidateSpec, artifacts, version); generateMcp(candidateSpec, artifacts, version);
    const changes = compatibility(root, stable.contract, candidateSpec);
    const breaking = changes.filter(change => change.kind === "breaking");
    if (breaking.length > 0 && major === oldMajor) {
      throw new Error(`Compatibility report found breaking schema changes; a minor release is not permitted:\n${JSON.stringify(breaking, null, 2)}`);
    }
    const report = {schemaVersion: 1, previous: stable.version, candidate: version, summary: {additive: changes.filter(c => c.kind === "additive").length, breaking: changes.filter(c => c.kind === "breaking").length}, changes, note: "Structural schema check only. Maintainers must review normative behavior and documentation."};
    if (dryRun) { console.log(JSON.stringify(report, null, 2)); return {contract, changes}; }
    const sourceCommit = execFileSync("git", ["rev-parse", "HEAD"], {cwd: root, encoding: "utf8"}).trim();
    const release: Release = {contract, version, sourceCommit};
    const targets = [join(root, "spec", contract), join(root, "versioned_docs", `version-${contract}`), join(root, "versioned_sidebars", `version-${contract}-sidebars.json`), join(root, "releases", contract)];
    if (targets.some(existsSync)) throw new Error("A release target appeared during preparation; refusing to overwrite");
    const mutableFiles = [
      "releases.json",
      "versions.json",
      "package.json",
      "packages/types/package.json",
      "packages/schemas/package.json",
      "packages/validator/package.json",
      "packages/types/src/index.d.ts",
    ].map(file => join(root, file));
    const backups = new Map(mutableFiles.map(file => [file, readFileSync(file)]));
    try {
      cpSync(candidateSpec, targets[0], {recursive: true, errorOnExist: true, force: false}); cpSync(candidateDocs, targets[1], {recursive: true, errorOnExist: true, force: false});
      writeJson(targets[2], sidebars); mkdirSync(targets[3], {recursive: true}); cpSync(artifacts, join(targets[3], "artifacts"), {recursive: true}); writeJson(join(targets[3], "change-report.json"), report);
      writeJson(join(targets[3], "provenance.json"), {schemaVersion: 1, sourceCommit, workingSpecSha256: draftHash, generators: Object.fromEntries(["tools/generate-types.ts", "tools/generate-openapi.ts", "tools/generate-mcp-manifest.ts", "pnpm-lock.yaml"].map(file => [file, hash(readFileSync(join(root, file)))]))});
      registry.stable = contract; registry.releases.push(release); writeJson(join(root, "releases.json"), registry); writeJson(join(root, "versions.json"), registry.releases.map(item => item.contract).reverse());
      for (const file of ["package.json", "packages/types/package.json", "packages/schemas/package.json", "packages/validator/package.json"]) updatePackageVersion(join(root, file), version);
      cpSync(join(artifacts, "types.d.ts"), join(root, "packages/types/src/index.d.ts")); writeJson(join(targets[3], "integrity.json"), createIntegrity(root, release));
      if (hash(filesIn(join(root, "spec/latest")).map(file => `${relative(root, file)}\0${hash(readFileSync(file))}`).join("\n")) !== draftHash) throw new Error("Working spec changed during release preparation");
    } catch (error) {
      for (const target of targets) rmSync(target, {recursive: true, force: true});
      for (const [file, contents] of backups) writeFileSync(file, contents);
      throw error;
    }
    console.log(`Prepared ${version} for review. No commit, tag, push, or publication was performed.`);
    return {contract, changes};
  } finally { rmSync(staging, {recursive: true, force: true}); }
}

if (isMain(import.meta.url)) {
  const version = process.argv.find(argument => /^\d/.test(argument));
  if (!version) throw new Error("Usage: pnpm release:prepare VERSION [--dry-run]");
  prepareRelease(ROOT, version, process.argv.includes("--dry-run")).catch(error => {console.error(error); process.exitCode = 1;});
}
