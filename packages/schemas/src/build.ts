import { cpSync, mkdirSync, writeFileSync, readdirSync, rmSync } from "fs";
import { resolve, basename } from "path";

const ROOT = resolve(__dirname, "../../..");
const OUT = resolve(__dirname, "../dist");
const SCHEMAS_OUT = resolve(OUT, "schemas");

// The latest released spec version, derived from spec/v*/ — the same single
// source of truth tools/versions.ts uses. The package ships ONLY the latest
// version's schemas; older versions live on in the spec/ tree and the docs site,
// not as a per-version matrix in the npm package.
function latestVersion(): string {
  const versions = readdirSync(resolve(ROOT, "spec"))
    .filter((dir) => /^v\d+\.\d+$/.test(dir))
    .sort((a, b) => {
      const [aMajor, aMinor] = a.slice(1).split(".").map(Number);
      const [bMajor, bMinor] = b.slice(1).split(".").map(Number);
      return aMajor - bMajor || aMinor - bMinor;
    });
  if (versions.length === 0) throw new Error("no spec/v*/ directories found");
  return versions[versions.length - 1];
}

// inventory-search-request.schema.json -> inventorySearchRequest
function exportName(schemaFile: string): string {
  return basename(schemaFile, ".schema.json")
    .split("-")
    .map((s, i) => (i === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1)))
    .join("");
}

function main() {
  const latest = latestVersion();

  // Clean dist so a schema renamed/removed in the current spec can't linger and
  // get published under files:["dist"]. Ship the schemas under a stable,
  // version-agnostic `dist/schemas/` directory.
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(SCHEMAS_OUT, { recursive: true });
  cpSync(resolve(ROOT, "spec", latest, "schemas"), SCHEMAS_OUT, { recursive: true });

  // The main entry re-exports the latest schemas plus LATEST (single source of
  // truth) so downstream code (e.g. the validator's loadDefaults) never hardcodes
  // a version. Raw files are also reachable via the version-agnostic
  // "@autoagentprotocol/schemas/latest/<name>.schema" subpath.
  const schemaFiles = readdirSync(SCHEMAS_OUT).filter((f) => f.endsWith(".schema.json"));

  let js = `// Auto-generated schema index (latest = ${latest})\n"use strict";\n`;
  let dts = `// Auto-generated schema index (latest = ${latest})\n`;
  for (const schema of schemaFiles) {
    const name = exportName(schema);
    js += `exports.${name}Schema = require("./schemas/${schema}");\n`;
    dts += `export declare const ${name}Schema: Record<string, unknown>;\n`;
  }
  js += `exports.LATEST = ${JSON.stringify(latest)};\n`;
  dts += `export declare const LATEST: string;\n`;

  writeFileSync(resolve(OUT, "index.js"), js);
  writeFileSync(resolve(OUT, "index.d.ts"), dts);

  console.log(`Built @autoagentprotocol/schemas: latest ${latest} (${schemaFiles.length} schemas)`);
}

main();
