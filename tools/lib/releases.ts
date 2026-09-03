import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const SITE = "https://autoagentprotocol.org";
export const DRAFT_SITE = "https://draft.autoagentprotocol.invalid";
export const DRAFT_VERSION = "0.0.0-dev";
export interface Release { contract: string; version: string; sourceCommit: string }
export interface Registry { schemaVersion: 1; stable: string; releases: Release[] }
export interface Integrity { schemaVersion: 1; contract: string; version: string; sourceCommit: string; files: Record<string, string> }

export function parseVersion(value: string): [number, number, number] {
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value)) throw new Error(`Invalid release version: ${value}`);
  const parts = value.split(".").map(Number);
  if (parts.some(n => !Number.isSafeInteger(n))) throw new Error(`Version exceeds safe integer range: ${value}`);
  return parts as [number, number, number];
}
export function contractFor(version: string): string {
  const [major, minor, patch] = parseVersion(version);
  if (patch !== 0) throw new Error("Contract snapshots use MAJOR.MINOR.0. A patch must not replace an existing major.minor URL.");
  return `v${major}.${minor}`;
}
export function compareVersions(a: string, b: string): number {
  const left = parseVersion(a), right = parseVersion(b);
  return left[0] - right[0] || left[1] - right[1] || left[2] - right[2];
}
export function loadRegistry(root = ROOT): Registry {
  const registry = JSON.parse(readFileSync(join(root, "releases.json"), "utf8")) as Registry;
  if (registry.schemaVersion !== 1 || !Array.isArray(registry.releases) || !registry.releases.length) throw new Error("Invalid or empty release registry");
  let previous: Release | undefined;
  for (const release of registry.releases) {
    if (contractFor(release.version) !== release.contract || !/^[a-f0-9]{40}$/.test(release.sourceCommit)) throw new Error(`Invalid release record: ${JSON.stringify(release)}`);
    if (previous && compareVersions(previous.version, release.version) >= 0) throw new Error("Releases must be unique and ordered oldest first");
    previous = release;
  }
  if (registry.stable !== previous?.contract) throw new Error("Stable must name the most recent approved release");
  return registry;
}
export function stableRelease(root = ROOT): Release {
  const registry = loadRegistry(root);
  return registry.releases.find(release => release.contract === registry.stable)!;
}
export function readJson<T = unknown>(file: string): T { return JSON.parse(readFileSync(file, "utf8")) as T; }
export function writeJson(file: string, value: unknown): void { writeFileSync(file, JSON.stringify(value, null, 2) + "\n"); }
export function hash(content: string | Buffer): string { return createHash("sha256").update(content).digest("hex"); }
export function filesIn(directory: string): string[] {
  if (!existsSync(directory)) return [];
  if (lstatSync(directory).isSymbolicLink()) throw new Error(`Symlinks are not allowed in release inputs: ${directory}`);
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const full = join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Symlinks are not allowed in release inputs: ${full}`);
    return entry.isDirectory() ? filesIn(full) : [full];
  }).sort();
}
export function releasePrefixes(contract: string): string[] {
  if (!/^v(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(contract)) throw new Error(`Unsafe contract label: ${contract}`);
  return [`spec/${contract}/`, `versioned_docs/version-${contract}/`, `versioned_sidebars/version-${contract}-sidebars.json`, `releases/${contract}/`, `static/img/${contract}/`];
}
export function isBrandAlias(file: string): boolean { return /^static\/img\/v\d+\.\d+\/aap-hero-banner\.png$/.test(file); }
export function snapshotFiles(root: string, contract: string): string[] {
  const files = new Set<string>();
  for (const prefix of releasePrefixes(contract)) {
    const target = join(root, prefix);
    const entries = prefix.endsWith("/") ? filesIn(target) : existsSync(target) ? [target] : [];
    for (const full of entries) {
      const name = relative(root, full).split("\\").join("/");
      if (name !== `releases/${contract}/integrity.json` && !isBrandAlias(name)) files.add(name);
    }
  }
  // Older docs share unversioned illustrations. Pin referenced images too.
  for (const file of [...files].filter(file => /\.(md|mdx)$/.test(file))) {
    const source = readFileSync(join(root, file), "utf8");
    for (const match of source.matchAll(/\/img\/[^\s)"'<>]+\.(?:png|svg|jpe?g|webp)/g)) {
      const asset = `static${match[0]}`;
      if (asset.includes("..") || !existsSync(join(root, asset))) throw new Error(`Missing or unsafe released image: ${asset}`);
      if (!isBrandAlias(asset)) files.add(asset);
    }
  }
  return [...files].sort();
}
export function createIntegrity(root: string, release: Release): Integrity {
  return {schemaVersion: 1, ...release, files: Object.fromEntries(snapshotFiles(root, release.contract).map(file => [file, hash(readFileSync(join(root, file)))]))};
}
export function checkReleases(root = ROOT): void {
  const registry = loadRegistry(root);
  const expectedVersions = registry.releases.map(release => release.contract).reverse();
  if (JSON.stringify(readJson(join(root, "versions.json"))) !== JSON.stringify(expectedVersions)) throw new Error("versions.json must match the release registry (newest first)");
  const specDirectories = readdirSync(join(root, "spec")).filter(name => /^v\d/.test(name)).sort();
  if (JSON.stringify(specDirectories) !== JSON.stringify([...expectedVersions].sort())) throw new Error("Unregistered or missing spec release directory");
  for (const release of registry.releases) {
    const integrity = readJson<Integrity>(join(root, "releases", release.contract, "integrity.json"));
    const actual = createIntegrity(root, release);
    if (JSON.stringify(integrity) !== JSON.stringify(actual)) throw new Error(`Release integrity mismatch: ${release.contract}. Released files must not be added, edited, deleted, or renamed.`);
    for (const required of [`spec/${release.contract}/skills.yaml`, `versioned_sidebars/version-${release.contract}-sidebars.json`, `releases/${release.contract}/artifacts/types.d.ts`, `releases/${release.contract}/artifacts/openapi-jsonrpc.yaml`, `releases/${release.contract}/artifacts/mcp.json`]) {
      if (!integrity.files[required]) throw new Error(`Incomplete release ${release.contract}: ${required}`);
    }
    if (!filesIn(join(root, "versioned_docs", `version-${release.contract}`)).some(file => file.endsWith(".md"))) throw new Error(`Missing docs for ${release.contract}`);
  }
}
export function isMain(metaUrl: string): boolean { return !!process.argv[1] && resolve(process.argv[1]) === fileURLToPath(metaUrl); }
