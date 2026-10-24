import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { globSync } from "glob";
import { generateTypes } from "../../tools/generate-types.js";
import { DRAFT_VERSION, ROOT } from "../../tools/lib/releases.js";

test("generated declarations typecheck real examples and retain required automotive fields", { timeout: 30000 }, async () => {
  const directory = mkdtempSync(join(tmpdir(), "aap-consumer-types-"));
  const spec = resolve(ROOT, "spec/latest");
  try {
    await generateTypes(join(spec, "schemas"), directory, DRAFT_VERSION);
    const schemas = new Map(globSync("*.schema.json", { cwd: join(spec, "schemas") }).map(file => [
      file.replace(".schema.json", ""), JSON.parse(readFileSync(join(spec, "schemas", file), "utf8")),
    ]));
    const assignments: string[] = [];
    for (const file of globSync("*.example.json", { cwd: join(spec, "examples") }).filter(file => !file.includes(".jsonrpc."))) {
      const schema = schemas.get(file.split(".")[0]);
      if (!schema) continue;
      const example = JSON.parse(readFileSync(join(spec, "examples", file), "utf8"));
      assignments.push(`const example${assignments.length}: AAP.${schema.title} = ${JSON.stringify(example)};`);
    }
    assert.ok(assignments.length >= 37, "Expected the complete typed example set");
    writeFileSync(join(directory, "consumer.ts"), `import type * as AAP from "./types.js";
${assignments.join("\n")}
// @ts-expect-error Required search result fields cannot disappear into an index signature.
const emptySearch: AAP.InventorySearchResponse["data"] = {};
// @ts-expect-error A total is numeric or unknown, never text.
const badTotal: AAP.InventorySearchResponse["data"]["total"] = "100";
// @ts-expect-error Every inventory listing needs an availability state and source timestamp.
const partialListing: AAP.InventoryListing = { vehicle_id: "vehicle-1" };
// @ts-expect-error A listing requires an identifier.
const unidentifiedListing: AAP.InventoryListing = { status: "available", updated_at: "2026-10-24T10:00:00Z" };
// @ts-expect-error A deployment default cannot require a geographic origin.
const badDefault: AAP.InventoryCapabilities["default_sort"] = { field: "distance_mi", order: "asc" };
// @ts-expect-error Appointment outcomes retain their defined vocabulary.
const badAppointment: NonNullable<AAP.LeadSubmitResponse["data"]["appointment"]>["status"] = "booked";
`);
    writeFileSync(join(directory, "tsconfig.json"), JSON.stringify({
      compilerOptions: { strict: true, skipLibCheck: false, noEmit: true, target: "ES2022", module: "NodeNext", moduleResolution: "NodeNext", types: [] },
      files: ["consumer.ts", "types.d.ts"],
    }));
    try {
      execFileSync(process.execPath, [resolve(ROOT, "node_modules/typescript/bin/tsc"), "--project", join(directory, "tsconfig.json")], { encoding: "utf8" });
    } catch (error) {
      throw new Error(String((error as { stdout?: string }).stdout ?? error));
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
