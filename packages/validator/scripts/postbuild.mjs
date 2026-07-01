// Post-build step for @autoagentprotocol/validator.
//
// 1. Bundles the current (latest) spec's JSON Schemas into dist/schemas so the
//    `aap-validate` CLI works standalone via `npx`, without depending on a
//    separately-published schemas package. The version is derived from the
//    spec/v*/ directories — the same single source of truth tools/versions.ts
//    uses — so it never goes stale.
// 2. Ensures the compiled CLI has a Node shebang and is executable.

import { readdirSync, cpSync, existsSync, readFileSync, writeFileSync, chmodSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const here = dirname(fileURLToPath(import.meta.url)); // packages/validator/scripts
const PKG = resolve(here, "..");                       // packages/validator
const ROOT = resolve(PKG, "..", "..");                 // repo root
const DIST = resolve(PKG, "dist");

function latestSpecVersion() {
  const versions = readdirSync(resolve(ROOT, "spec"))
    .filter((dir) => /^v\d+\.\d+$/.test(dir))
    .sort((a, b) => {
      const [aMajor, aMinor] = a.slice(1).split(".").map(Number);
      const [bMajor, bMinor] = b.slice(1).split(".").map(Number);
      return aMajor - bMajor || aMinor - bMinor;
    });
  if (versions.length === 0) throw new Error("no spec/v*/ directories found");
  return versions[versions.length - 1];
}

const latest = latestSpecVersion();
const srcSchemas = resolve(ROOT, "spec", latest, "schemas");
if (!existsSync(srcSchemas)) throw new Error(`schemas not found: ${srcSchemas}`);
cpSync(srcSchemas, resolve(DIST, "schemas"), { recursive: true });

const cli = resolve(DIST, "cli.js");
if (existsSync(cli)) {
  const src = readFileSync(cli, "utf-8");
  if (!src.startsWith("#!")) writeFileSync(cli, `#!/usr/bin/env node\n${src}`);
  chmodSync(cli, 0o755);
}

console.log(`postbuild: bundled ${latest} schemas -> dist/schemas; prepared aap-validate bin`);
