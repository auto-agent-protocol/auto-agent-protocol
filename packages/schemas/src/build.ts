import { cpSync, mkdirSync, writeFileSync, readdirSync } from "fs";
import { resolve, basename } from "path";

const ROOT = resolve(__dirname, "../../..");
const OUT = resolve(__dirname, "../dist");

function main() {
  mkdirSync(resolve(OUT, "v0.1"), { recursive: true });

  // Copy all schema files
  cpSync(
    resolve(ROOT, "spec/v0.1/schemas"),
    resolve(OUT, "v0.1"),
    { recursive: true }
  );

  // Generate index.js that exports schema names
  const schemas = readdirSync(resolve(ROOT, "spec/v0.1/schemas"))
    .filter((f) => f.endsWith(".schema.json"));

  let indexContent = "// Auto-generated schema index\n";
  for (const schema of schemas) {
    const name = basename(schema, ".schema.json")
      .split("-")
      .map((s, i) => (i === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1)))
      .join("");
    indexContent += `export const ${name}Schema = require("./v0.1/${schema}");\n`;
  }

  writeFileSync(resolve(OUT, "index.js"), indexContent);

  // Generate index.d.ts
  let dtsContent = "// Auto-generated schema index\n";
  for (const schema of schemas) {
    const name = basename(schema, ".schema.json")
      .split("-")
      .map((s, i) => (i === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1)))
      .join("");
    dtsContent += `export declare const ${name}Schema: Record<string, unknown>;\n`;
  }

  writeFileSync(resolve(OUT, "index.d.ts"), dtsContent);

  console.log(`Built @autoagentprotocol/schemas with ${schemas.length} schemas`);
}

main();
