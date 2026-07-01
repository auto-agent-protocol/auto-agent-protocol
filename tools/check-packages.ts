// Regression guard for the published packages: assert that the built
// @autoagentprotocol/schemas + validator actually track the latest spec
// version, and that the validator can load the default schemas end-to-end.
//
// This guards the class of bug where the packages silently drift from the live
// spec (schemas/validator pinned to an old version). Run after building both
// packages; wired into CI.

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

// 1. The built schemas package must advertise the same latest version as the spec.
const schemas = require(resolve(ROOT, "packages/schemas/dist/index.js")) as { LATEST?: string };
if (schemas.LATEST !== LATEST) {
  fail(`@autoagentprotocol/schemas LATEST=${schemas.LATEST} but spec LATEST=${LATEST}`);
}

// 2. The raw-schema subpath export must point at the version-agnostic dist/schemas
// dir (no per-version literals to keep in sync).
const schemasPkg = JSON.parse(
  readFileSync(resolve(ROOT, "packages/schemas/package.json"), "utf-8")
) as { exports?: Record<string, string> };
if (schemasPkg.exports?.["./latest/*"] !== "./dist/schemas/*.json") {
  fail('packages/schemas/package.json exports["./latest/*"] must be "./dist/schemas/*.json"');
}

// 3. validator.loadDefaults() must resolve and compile the latest schemas without throwing.
const { AAPValidator } = require(resolve(ROOT, "packages/validator/dist/index.js")) as {
  AAPValidator: new () => { loadDefaults(): void; getSchemaNames(): string[] };
};
const validator = new AAPValidator();
validator.loadDefaults();
const count = validator.getSchemaNames().length;
if (count === 0) fail("validator.loadDefaults() loaded zero schemas");

console.log(
  `check-packages OK — schemas.LATEST=${schemas.LATEST}, validator.loadDefaults() loaded ${count} schemas`
);
