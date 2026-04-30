import Ajv from "ajv";
import addFormats from "ajv-formats";
import { glob } from "glob";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

async function main() {
  const schemaFiles = await glob("spec/*/schemas/**/*.schema.json", {
    cwd: ROOT,
  });

  if (schemaFiles.length === 0) {
    console.error("No schema files found");
    process.exit(1);
  }

  let errors = 0;

  // First pass: check structure
  const allSchemas: Array<{ file: string; schema: any }> = [];
  for (const file of schemaFiles) {
    const fullPath = resolve(ROOT, file);
    const content = readFileSync(fullPath, "utf-8");

    try {
      const schema = JSON.parse(content);

      if (!schema.$schema) {
        console.error(`FAIL: ${file} — missing $schema`);
        errors++;
        continue;
      }

      if (schema.$schema !== "https://json-schema.org/draft/2020-12/schema") {
        console.error(
          `FAIL: ${file} — $schema must be https://json-schema.org/draft/2020-12/schema`
        );
        errors++;
        continue;
      }

      if (!schema.$id) {
        console.error(`FAIL: ${file} — missing $id`);
        errors++;
        continue;
      }

      if (!schema.title) {
        console.error(`FAIL: ${file} — missing title`);
        errors++;
        continue;
      }

      allSchemas.push({ file, schema });
    } catch (e: any) {
      console.error(`FAIL: ${file} — invalid JSON: ${e.message}`);
      errors++;
    }
  }

  // Second pass: load all schemas into Ajv, then compile each
  const ajv = new Ajv({ strict: false, allErrors: true, validateSchema: false });
  addFormats(ajv);

  // Add all schemas first (so cross-refs resolve)
  for (const { schema } of allSchemas) {
    try {
      ajv.addSchema(schema);
    } catch (e: any) {
      // May fail on duplicate $id, which is itself an error
    }
  }

  // Now validate each compiles
  for (const { file, schema } of allSchemas) {
    try {
      ajv.compile(schema);
      console.log(`OK: ${file}`);
    } catch (e: any) {
      console.error(`FAIL: ${file} — ${e.message}`);
      errors++;
    }
  }

  console.log(`\nValidated ${schemaFiles.length} schemas, ${errors} errors`);
  if (errors > 0) process.exit(1);
}

main();
