import { execFileSync } from "node:child_process";
import { checkReleases, isMain, releasePrefixes, ROOT, type Registry } from "./lib/releases.js";

function git(root: string, args: string[], allowFailure = false): string {
  try {
    return execFileSync("git", args, {cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", allowFailure ? "ignore" : "inherit"]}).trim();
  } catch (error) {
    if (allowFailure) return "";
    throw error;
  }
}

function resolveBase(root: string, requested?: string): string {
  const base = requested || process.env.AAP_BASE_REF || git(root, ["merge-base", "HEAD", "origin/main"], true);
  if (!base || /^0+$/.test(base)) throw new Error("No comparison baseline is available. Pass --base <commit> or set AAP_BASE_REF.");
  const commit = git(root, ["rev-parse", "--verify", `${base}^{commit}`], true);
  if (!commit) throw new Error(`Freeze-check baseline does not resolve to a commit: ${base}`);
  return commit;
}

function existsAt(root: string, base: string, path: string): boolean {
  try {
    execFileSync("git", ["cat-file", "-e", `${base}:${path}`], {cwd: root, stdio: "ignore"});
    return true;
  } catch {
    return false;
  }
}

function baselineFrozenPaths(root: string, base: string): {contracts: string[]; prefixes: string[]} {
  const registryText = git(root, ["show", `${base}:releases.json`], true);
  if (registryText) {
    const registry = JSON.parse(registryText) as Registry;
    if (registry.schemaVersion !== 1 || !Array.isArray(registry.releases)) throw new Error("Baseline release registry is invalid");
    const contracts = registry.releases.map(release => release.contract);
    return {contracts, prefixes: contracts.flatMap(releasePrefixes)};
  }
  // One-time migration path for repositories that predate releases.json.
  const contracts = git(root, ["ls-tree", "-d", "--name-only", `${base}:spec`])
    .split("\n")
    .filter(name => /^v\d+\.\d+$/.test(name));
  const candidates = contracts.flatMap(releasePrefixes);
  return {contracts, prefixes: candidates.filter(prefix => existsAt(root, base, prefix.replace(/\/$/, "")))};
}

interface Change { status: string; paths: string[] }
function parseChanges(text: string): Change[] {
  return text.split("\n").filter(Boolean).map(line => {
    const [status, ...paths] = line.split("\t");
    if (!status || !paths.length) throw new Error(`Unrecognized git diff entry: ${line}`);
    return {status, paths};
  });
}

function allChanges(root: string, base: string): Change[] {
  const entries = [
    ...parseChanges(git(root, ["diff", "--name-status", "--find-renames", "--find-copies", `${base}...HEAD`])),
    ...parseChanges(git(root, ["diff", "--name-status", "--find-renames", "--find-copies"])),
    ...parseChanges(git(root, ["diff", "--cached", "--name-status", "--find-renames", "--find-copies"])),
    ...git(root, ["ls-files", "--others", "--exclude-standard"]).split("\n").filter(Boolean).map(path => ({status: "A", paths: [path]})),
  ];
  const seen = new Set<string>();
  return entries.filter(entry => {
    const key = `${entry.status}\0${entry.paths.join("\0")}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function inPrefix(path: string, prefix: string): boolean {
  return prefix.endsWith("/") ? path.startsWith(prefix) : path === prefix;
}

export function freezeCheck(root: string, requestedBase?: string): void {
  const base = resolveBase(root, requestedBase);
  const {contracts, prefixes: frozen} = baselineFrozenPaths(root, base);
  if (!contracts.length) throw new Error(`No released contracts found at baseline ${base}`);
  const violations: string[] = [];
  for (const change of allChanges(root, base)) {
    for (const path of change.paths) {
      const prefix = frozen.find(item => inPrefix(path, item));
      if (prefix) violations.push(`${change.status}\t${path} (frozen by ${prefix})`);
    }
  }
  if (violations.length) throw new Error(`Released files are immutable across the entire change set:\n${violations.join("\n")}`);
  checkReleases(root);
  console.log(`Freeze check passed against ${base.slice(0, 12)}; ${contracts.length} baseline releases remain immutable.`);
}

if (isMain(import.meta.url)) {
  const index = process.argv.indexOf("--base");
  if (index >= 0 && !process.argv[index + 1]) throw new Error("--base requires a git ref");
  try {
    freezeCheck(ROOT, index >= 0 ? process.argv[index + 1] : undefined);
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}
