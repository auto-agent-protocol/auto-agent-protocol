import { compileFromFile } from "json-schema-to-typescript";
import { glob } from "glob";
import { writeFileSync, mkdirSync } from "fs";
import { resolve, dirname, basename } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

async function main() {
  const versions = ["v0.1"];

  for (const version of versions) {
    const schemasDir = resolve(ROOT, "spec", version, "schemas");
    const outDir = resolve(ROOT, "generated", version);
    mkdirSync(outDir, { recursive: true });

    const schemaFiles = await glob("*.schema.json", { cwd: schemasDir });
    const primitiveFiles = await glob("_primitives/*.schema.json", {
      cwd: schemasDir,
    });
    const allFiles = [...primitiveFiles, ...schemaFiles];

    let output = `// Auto-generated from JSON Schema — do not edit\n// Auto Agent Protocol ${version}\n\n`;

    for (const file of allFiles) {
      const fullPath = resolve(schemasDir, file);
      try {
        const ts = await compileFromFile(fullPath, {
          bannerComment: "",
          cwd: schemasDir,
          declareExternallyReferenced: false,
          unknownAny: false,
        });
        output += ts + "\n";
      } catch (e: any) {
        console.error(`Error compiling ${file}: ${e.message}`);
      }
    }

    const outFile = resolve(outDir, "types.d.ts");
    writeFileSync(outFile, output);
    console.log(`Generated ${outFile}`);

    // Also copy to packages/types/src
    const pkgDir = resolve(ROOT, "packages/types/src");
    mkdirSync(pkgDir, { recursive: true });
    writeFileSync(resolve(pkgDir, "index.d.ts"), output);
    console.log(`Copied types to packages/types/src/index.d.ts`);
  }
}

main();
