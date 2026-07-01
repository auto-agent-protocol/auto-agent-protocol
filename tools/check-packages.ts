// Regression guard for the published packages: assert that the built
// @autoagentprotocol/schemas + validator actually track the latest spec
// version, and that the validator can load the default schemas end-to-end.
//
// This is the guard for the class of bug where the packages silently drift
// from the live spec (schemas/validator pinned to an old version). Run after
// building both packages; wired into CI.

import { readFileSync } from "fs";
import { createRequire } from "module";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { LATEST } from "./versions.js";

const require = createRequire(import.meta.url);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function fail(message: string): never {
  console.error(`check-packages: ${message}`);
  process.exit(1);
}

// 1. The schemas package must advertise the same latest version as the spec.
const schemas = require(resolve(ROOT, "packages/schemas/dist/index.js")) as {
  LATEST?: string;
  VERSIONS?: string[];
};
if (schemas.LATEST !== LATEST) {
  fail(`@autoagentprotocol/schemas LATEST=${schemas.LATEST} but spec LATEST=${LATEST}`);
}

// 1b. The hand-maintained `exports` map must stay in sync with the shipped
// versions — the map is static JSON (can't be derived at build time), so guard
// against silent drift on the next spec release (a new spec/vX.Y won't get a
// subpath export, and `./latest/*` won't repoint, until package.json is edited).
const schemasPkg = JSON.parse(
  readFileSync(resolve(ROOT, "packages/schemas/package.json"), "utf-8")
) as { exports?: Record<string, string> };
const exportsMap = schemasPkg.exports ?? {};
for (const version of schemas.VERSIONS ?? []) {
  const key = `./${version}/*`;
  const want = `./dist/${version}/*.json`;
  if (exportsMap[key] !== want) {
    fail(`packages/schemas/package.json exports["${key}"] must be "${want}" (add it for the new spec version)`);
  }
}
if (exportsMap["./latest/*"] !== `./dist/${LATEST}/*.json`) {
  fail(`packages/schemas/package.json exports["./latest/*"] must point at "./dist/${LATEST}/*.json"`);
}

// 2. loadDefaults() must resolve and compile the latest schemas without throwing.
const { AAPValidator } = require(resolve(ROOT, "packages/validator/dist/index.js")) as {
  AAPValidator: new () => { loadDefaults(): void; getSchemaNames(): string[] };
};
const validator = new AAPValidator();
validator.loadDefaults();
const count = validator.getSchemaNames().length;
if (count === 0) fail("validator.loadDefaults() loaded zero schemas");

console.log(
  `check-packages OK — schemas.LATEST=${schemas.LATEST}, VERSIONS=[${(schemas.VERSIONS ?? []).join(
    ", "
  )}], validator.loadDefaults() loaded ${count} schemas`
);
