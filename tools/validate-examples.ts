import Ajv from "ajv";
import addFormats from "ajv-formats";
import { glob } from "glob";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname, basename } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// Examples that intentionally don't validate against an AAP schema
// (binding wrapper envelopes, MCP manifest, etc).
const NON_VALIDATED_PATTERNS = [
  /\.jsonrpc\.example\.json$/,
  /\.rest\.example\.json$/,
  /^mcp-manifest\./,
];

async function main() {
  const versions = await glob("spec/*/", { cwd: ROOT });

  let totalExamples = 0;
  let errors = 0;

  for (const versionDir of versions) {
    const schemasDir = resolve(ROOT, versionDir, "schemas");
    const examplesDir = resolve(ROOT, versionDir, "examples");

    if (!existsSync(examplesDir)) continue;

    const ajv = new Ajv({
      strict: false,
      allErrors: true,
      validateSchema: false,
    });
    addFormats(ajv);

    const schemaFiles = await glob("**/*.schema.json", { cwd: schemasDir });
    const schemasByName = new Map<string, any>();

    for (const sf of schemaFiles) {
      const schemaPath = resolve(schemasDir, sf);
      const schema = JSON.parse(readFileSync(schemaPath, "utf-8"));
      const name = basename(sf, ".schema.json");
      schemasByName.set(name, schema);

      try {
        ajv.addSchema(schema);
      } catch {
        // duplicate $id — fine
      }
    }

    const exampleFiles = await glob("*.example.json", { cwd: examplesDir });

    for (const ef of exampleFiles) {
      totalExamples++;

      // Skip binding-wrapper envelopes and MCP manifest examples.
      if (NON_VALIDATED_PATTERNS.some((rx) => rx.test(ef))) {
        console.log(`SKIP: ${ef} (binding wrapper or MCP manifest)`);
        continue;
      }

      const examplePath = resolve(examplesDir, ef);
      const example = JSON.parse(readFileSync(examplePath, "utf-8"));
      const exampleName = basename(ef, ".example.json");

      // For lead-response example, dispatch by the example's `type` field.
      let candidate = exampleName;
      if (exampleName === "lead-response" && example?.type) {
        candidate = "lead-response";
      }

      const schema = schemasByName.get(candidate);

      if (!schema) {
        console.log(`SKIP: ${ef} — no matching schema "${candidate}"`);
        continue;
      }

      try {
        const validate = ajv.compile(schema);
        const valid = validate(example);
        if (!valid) {
          console.error(
            `FAIL: ${ef} —`,
            JSON.stringify(validate.errors, null, 2)
          );
          errors++;
        } else {
          console.log(`OK: ${ef}`);
        }
      } catch (e: any) {
        console.error(`FAIL: ${ef} — compile error: ${e.message}`);
        errors++;
      }
    }
  }

  console.log(`\nValidated ${totalExamples} examples, ${errors} errors`);
  if (errors > 0) process.exit(1);
}

main();
