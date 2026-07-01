import { cpSync, mkdirSync, writeFileSync, readdirSync, rmSync } from "fs";
import { resolve, basename } from "path";

const ROOT = resolve(__dirname, "../../..");
const OUT = resolve(__dirname, "../dist");

// Every released spec version, derived from spec/v*/ — the same single source of
// truth tools/versions.ts uses. Sorted ascending so the highest (latest) is last.
function allVersions(): string[] {
  return readdirSync(resolve(ROOT, "spec"))
    .filter((dir) => /^v\d+\.\d+$/.test(dir))
    .sort((a, b) => {
      const [aMajor, aMinor] = a.slice(1).split(".").map(Number);
      const [bMajor, bMinor] = b.slice(1).split(".").map(Number);
      return aMajor - bMajor || aMinor - bMinor;
    });
}

// inventory-search-request.schema.json -> inventorySearchRequest
function exportName(schemaFile: string): string {
  return basename(schemaFile, ".schema.json")
    .split("-")
    .map((s, i) => (i === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1)))
    .join("");
}

function main() {
  const versions = allVersions();
  if (versions.length === 0) throw new Error("no spec/v*/ directories found");
  const latest = versions[versions.length - 1];

  // Start from a clean dist so a schema renamed/removed in the current (unfrozen)
  // spec dir can't linger as a stale file and get published under files:["dist"].
  rmSync(OUT, { recursive: true, force: true });

  // Copy every version's schemas so consumers pinned to an older version keep
  // working via the `./vX.Y/*` subpath exports; the main entry tracks `latest`.
  for (const version of versions) {
    mkdirSync(resolve(OUT, version), { recursive: true });
    cpSync(resolve(ROOT, "spec", version, "schemas"), resolve(OUT, version), {
      recursive: true,
    });
  }

  // The main entry (`import ... from "@autoagentprotocol/schemas"`) re-exports the
  // latest version's schemas, plus LATEST/VERSIONS so downstream code (e.g. the
  // validator's loadDefaults) never has to hardcode a version.
  const latestSchemas = readdirSync(resolve(ROOT, "spec", latest, "schemas")).filter(
    (f) => f.endsWith(".schema.json")
  );

  let js = `// Auto-generated schema index (latest = ${latest})\n"use strict";\n`;
  let dts = `// Auto-generated schema index (latest = ${latest})\n`;
  for (const schema of latestSchemas) {
    const name = exportName(schema);
    js += `exports.${name}Schema = require("./${latest}/${schema}");\n`;
    dts += `export declare const ${name}Schema: Record<string, unknown>;\n`;
  }
  js += `exports.LATEST = ${JSON.stringify(latest)};\n`;
  js += `exports.VERSIONS = ${JSON.stringify(versions)};\n`;
  dts += `export declare const LATEST: string;\n`;
  dts += `export declare const VERSIONS: string[];\n`;

  writeFileSync(resolve(OUT, "index.js"), js);
  writeFileSync(resolve(OUT, "index.d.ts"), dts);

  console.log(
    `Built @autoagentprotocol/schemas: ${versions.length} versions [${versions.join(
      ", "
    )}], latest ${latest} (${latestSchemas.length} schemas)`
  );
}

main();
