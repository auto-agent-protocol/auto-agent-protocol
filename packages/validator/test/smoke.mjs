// Dependency-free smoke test for the aap-validate CLI.
// Builds nothing — run `pnpm --filter @autoagentprotocol/validator build` first.
// Exercises good/bad/usage paths and asserts exit codes so CI catches regressions
// without pulling in a test framework.

import { execFileSync } from "child_process";
import { writeFileSync, mkdtempSync } from "fs";
import { tmpdir } from "os";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";

const here = dirname(fileURLToPath(import.meta.url));
const PKG = resolve(here, "..");
const ROOT = resolve(PKG, "..", "..");
const CLI = resolve(PKG, "dist", "cli.js");
const GOOD = resolve(ROOT, "spec", "v1.1", "examples", "inventory-search-request.example.json");

function run(args) {
  try {
    const out = execFileSync("node", [CLI, ...args], { encoding: "utf-8" });
    return { code: 0, out };
  } catch (e) {
    return { code: typeof e.status === "number" ? e.status : 1, out: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
}

let failures = 0;
function check(name, fn) {
  try {
    fn();
    console.log(`  ok   ${name}`);
  } catch (e) {
    failures++;
    console.error(`  FAIL ${name}: ${e.message}`);
  }
}

function expectCode(args, expected) {
  const r = run(args);
  if (r.code !== expected) throw new Error(`expected exit ${expected}, got ${r.code}\n${r.out}`);
  return r;
}

const tmp = mkdtempSync(join(tmpdir(), "aap-validate-"));
const missingType = join(tmp, "missing-type.json");
writeFileSync(missingType, JSON.stringify({ filters: { make: ["Honda"] } }));

check("valid example, explicit schema name -> exit 0", () => expectCode(["inventory-search-request", GOOD], 0));
check("valid example, schema auto-detected from type -> exit 0", () => expectCode([GOOD], 0));
check("message-type alias resolves -> exit 0", () => expectCode(["inventory.search.request", GOOD], 0));
check("missing required field -> exit 1", () => expectCode(["inventory-search-request", missingType], 1));
check("payload checked against the wrong schema -> exit 1", () => expectCode(["lead-submit-request", GOOD], 1));
check("--list names a known schema -> exit 0", () => {
  const r = expectCode(["--list"], 0);
  if (!r.out.includes("inventory-search-request")) throw new Error(`--list missing schema names:\n${r.out}`);
});
check("nonexistent file -> exit 2", () => expectCode(["inventory-search-request", join(tmp, "nope.json")], 2));

if (failures > 0) {
  console.error(`\n${failures} smoke check(s) failed`);
  process.exit(1);
}
console.log("\nAll aap-validate smoke checks passed");
