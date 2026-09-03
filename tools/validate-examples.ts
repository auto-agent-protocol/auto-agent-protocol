import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { glob } from "glob";
import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { ROOT, isMain } from "./lib/releases.js";

const SKIP = [/\.jsonrpc\.example\.json$/, /\.rest\.example\.json$/, /^mcp-manifest\./];
export async function validateExamples(specDir: string, label: string): Promise<{total: number; validated: number}> {
  const schemasDir = resolve(specDir, "schemas"), examplesDir = resolve(specDir, "examples");
  const ajv = new Ajv2020({strict: false, allErrors: true}); addFormats(ajv);
  const schemas = new Map<string, unknown>();
  for (const file of (await glob("**/*.schema.json", {cwd: schemasDir})).sort()) {
    const schema = JSON.parse(readFileSync(resolve(schemasDir, file), "utf8"));
    schemas.set(basename(file, ".schema.json"), schema);
    try { ajv.addSchema(schema); } catch (error) { throw new Error(`${label}/${file}: registration failed: ${(error as Error).message}`); }
  }
  const files = (await glob("*.example.json", {cwd: examplesDir})).sort();
  let validated = 0;
  for (const file of files) {
    if (SKIP.some(pattern => pattern.test(file))) continue;
    const name = basename(file, ".example.json"), variant = name.match(/^([a-z][a-z0-9-]+(?:request|response))\./);
    const candidate = variant?.[1] ?? name, schema = schemas.get(candidate);
    if (!schema) {
      if (candidate === "agent-card" && label === "v0.2") continue;
      throw new Error(`${label}/${file}: no matching schema ${candidate}`);
    }
    const validate = ajv.compile(schema), value = JSON.parse(readFileSync(resolve(examplesDir, file), "utf8"));
    if (!validate(value)) throw new Error(`${label}/${file}: ${ajv.errorsText(validate.errors, {separator: "\n"})}`);
    validated++;
  }
  console.log(`Validated ${validated}/${files.length} examples for ${label}`);
  return {total: files.length, validated};
}
if (isMain(import.meta.url)) {
  validateExamples(resolve(ROOT, "spec/latest"), "latest draft").catch(error => {console.error(error); process.exitCode = 1;});
}
