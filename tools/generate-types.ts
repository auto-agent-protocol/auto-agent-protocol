import { compile } from "json-schema-to-typescript";
import { glob } from "glob";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { DRAFT_VERSION, ROOT, isMain } from "./lib/releases.js";

export async function generateTypes(schemasDir: string, outDir: string, version: string): Promise<string> {
  const files = (await glob("**/*.schema.json", { cwd: schemasDir })).sort();
  const properties = Object.fromEntries(files.map(file => {
    const schema = JSON.parse(readFileSync(resolve(schemasDir, file), "utf8"));
    if (typeof schema.title !== "string" || !schema.title) throw new Error(`${file}: a schema title is required for its public type`);
    return [schema.title, { $ref: `./${file}` }];
  }));
  if (Object.keys(properties).length !== files.length) throw new Error("Schema titles must be unique");
  // One compilation gives shared and context-specific declarations a single naming scope.
  const declarations = await compile({
    title: "AapSchemaTypes",
    description: "Type lookup by JSON Schema title. This is a TypeScript helper, not an AAP wire payload.",
    type: "object",
    properties,
    required: Object.keys(properties),
    additionalProperties: false,
  }, "AapSchemaTypes", {
    bannerComment: "",
    cwd: schemasDir,
    declareExternallyReferenced: true,
    unknownAny: false,
  });
  const output = `// Auto-generated from JSON Schema — do not edit\n// Auto Agent Protocol ${version}\n\n${declarations}\n`;
  mkdirSync(outDir, { recursive: true });
  writeFileSync(resolve(outDir, "types.d.ts"), output);
  console.log(`Generated ${resolve(outDir, "types.d.ts")}`);
  return output;
}

if (isMain(import.meta.url)) {
  generateTypes(resolve(ROOT, "spec/latest/schemas"), resolve(ROOT, "generated/latest"), DRAFT_VERSION)
    .catch(error => { console.error(error); process.exitCode = 1; });
}
