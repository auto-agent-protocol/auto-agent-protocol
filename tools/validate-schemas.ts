import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { glob } from "glob";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ROOT, isMain } from "./lib/releases.js";

export async function validateSchemas(specDir: string, label: string): Promise<number> {
  const schemasDir = resolve(specDir, "schemas");
  const schemaFiles = (await glob("**/*.schema.json", {cwd: schemasDir})).sort();
  if (!schemaFiles.length) throw new Error(`${label}: no schemas found`);
  const schemas = schemaFiles.map(file => ({file, schema: JSON.parse(readFileSync(resolve(schemasDir, file), "utf8"))}));
  const ajv = new Ajv2020({strict: false, allErrors: true});
  addFormats(ajv);
  for (const {file, schema} of schemas) {
    if (schema.$schema !== "https://json-schema.org/draft/2020-12/schema" || !schema.$id || !schema.title) throw new Error(`${label}/${file}: missing or invalid $schema, $id, or title`);
    try { ajv.addSchema(schema); } catch (error) { throw new Error(`${label}/${file}: registration failed: ${(error as Error).message}`); }
  }
  for (const {file, schema} of schemas) {
    try { ajv.compile(schema); } catch (error) { throw new Error(`${label}/${file}: compilation failed: ${(error as Error).message}`); }
  }
  console.log(`Validated ${schemaFiles.length} schemas for ${label}`);
  return schemaFiles.length;
}
if (isMain(import.meta.url)) {
  validateSchemas(resolve(ROOT, "spec/latest"), "latest draft").catch(error => {console.error(error); process.exitCode = 1;});
}
