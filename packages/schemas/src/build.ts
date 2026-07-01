import { cpSync, mkdirSync, writeFileSync, readdirSync, rmSync } from "fs";
import { resolve, basename, relative, sep } from "path";

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

// Every schema file under `dir`, recursively, as posix paths relative to `base`.
function listSchemas(dir: string, base: string = dir): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) return listSchemas(full, base);
    return entry.name.endsWith(".schema.json") ? [relative(base, full).split(sep).join("/")] : [];
  });
}

function main() {
  const latest = latestVersion();

  // Clean dist so a schema renamed/removed in the current spec can't linger and
  // get published under files:["dist"]. Ship the schemas under a stable,
  // version-agnostic `dist/schemas/` directory.
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(SCHEMAS_OUT, { recursive: true });
  cpSync(resolve(ROOT, "spec", latest, "schemas"), SCHEMAS_OUT, { recursive: true });

  const all = listSchemas(SCHEMAS_OUT); // e.g. ["agent-card.schema.json", "_primitives/address.schema.json"]
  const topLevel = all.filter((rel) => !rel.includes("/"));

  // The main entry exports the latest schemas as data:
  //  - one `<name>Schema` named export per top-level request/response schema,
  //  - `allSchemas` (every schema, including _primitives) so a consumer can
  //    register the complete set for cross-file $ref resolution without touching
  //    the filesystem,
  //  - `LATEST` (single source of truth) so downstream code never hardcodes a
  //    version. Raw files remain reachable via the version-agnostic
  //    "@autoagentprotocol/schemas/latest/<name>.schema" subpath.
  let js = `// Auto-generated schema index (latest = ${latest})\n"use strict";\n`;
  let dts = `// Auto-generated schema index (latest = ${latest})\n`;
  for (const rel of topLevel) {
    const name = exportName(rel);
    js += `exports.${name}Schema = require("./schemas/${rel}");\n`;
    dts += `export declare const ${name}Schema: Record<string, unknown>;\n`;
  }
  js += `exports.allSchemas = [\n${all.map((rel) => `  require("./schemas/${rel}")`).join(",\n")}\n];\n`;
  js += `exports.LATEST = ${JSON.stringify(latest)};\n`;
  dts += `export declare const allSchemas: Record<string, unknown>[];\n`;
  dts += `export declare const LATEST: string;\n`;

  writeFileSync(resolve(OUT, "index.js"), js);
  writeFileSync(resolve(OUT, "index.d.ts"), dts);

  console.log(`Built @autoagentprotocol/schemas: latest ${latest} (${all.length} schemas)`);
}

main();
