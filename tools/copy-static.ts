import { cpSync, mkdirSync, existsSync, rmSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { glob } from "glob";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// The HIGHEST released version. Mirrored at /latest so consumers can deep-link
// to the most recent stable URL without pinning a version. When v0.2 is cut
// this constant is updated; v0.1 still serves at /v0.1 unchanged.
const LATEST_VERSION = "v0.1";

async function copyVersion(version: string, destLabel: string): Promise<void> {
  const specDir = resolve(ROOT, "spec", version);
  const generatedDir = resolve(ROOT, "generated", version);
  const staticDir = resolve(ROOT, "static", destLabel);

  if (existsSync(staticDir)) rmSync(staticDir, { recursive: true });

  // Copy schemas
  const schemasSource = resolve(specDir, "schemas");
  const schemasDest = resolve(staticDir, "schemas");
  if (existsSync(schemasSource)) {
    mkdirSync(schemasDest, { recursive: true });
    cpSync(schemasSource, schemasDest, { recursive: true });
    console.log(`Copied schemas to ${schemasDest}`);
  }

  // Copy examples
  const examplesSource = resolve(specDir, "examples");
  const examplesDest = resolve(staticDir, "examples");
  if (existsSync(examplesSource)) {
    mkdirSync(examplesDest, { recursive: true });
    cpSync(examplesSource, examplesDest, { recursive: true });
    console.log(`Copied examples to ${examplesDest}`);
  }

  // Copy generated artifacts
  if (existsSync(generatedDir)) {
    const generatedFiles = await glob("*", { cwd: generatedDir });
    for (const file of generatedFiles) {
      const src = resolve(generatedDir, file);
      const dest = resolve(staticDir, file);
      cpSync(src, dest, { recursive: true });
      console.log(`Copied ${file} to ${staticDir}`);
    }
  }
}

async function main(): Promise<void> {
  const versions = ["v0.1"];

  for (const version of versions) {
    await copyVersion(version, version);
  }

  // Mirror the highest released version under /latest so people can deep-link
  // to the canonical "latest" URL (parallels Docusaurus's /docs/latest/* alias).
  await copyVersion(LATEST_VERSION, "latest");
}

main();
