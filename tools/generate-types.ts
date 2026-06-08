import { compileFromFile } from "json-schema-to-typescript";
import { glob } from "glob";
import { writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { ALL_VERSIONS, LATEST } from "./versions.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

async function main() {
  const versions = ALL_VERSIONS;

  // The @autoagentprotocol/types package ships exactly one version's types.
  const PACKAGE_VERSION = LATEST;
  const outputByVersion = new Map<string, string>();

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
    outputByVersion.set(version, output);
  }

  // Copy the published version's types into packages/types/src exactly once
  // (previously this ran inside the loop, so v0.1 was written then immediately
  // overwritten by v0.2 on every build).
  const pkgOutput = outputByVersion.get(PACKAGE_VERSION);
  if (pkgOutput) {
    const pkgDir = resolve(ROOT, "packages/types/src");
    mkdirSync(pkgDir, { recursive: true });
    writeFileSync(resolve(pkgDir, "index.d.ts"), pkgOutput);
    console.log(`Copied ${PACKAGE_VERSION} types to packages/types/src/index.d.ts`);
  }
}

main();
