import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "fs";
import { resolve, dirname, basename } from "path";
import { fileURLToPath } from "url";
import { glob } from "glob";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

interface FieldDef {
  name: string;
  type: string;
  required: boolean;
  description: string;
  enum?: string[];
  pattern?: string;
  format?: string;
  example?: unknown;
  defaultValue?: unknown;
}

function jsonSafe(value: unknown): string {
  return JSON.stringify(value).replace(/`/g, "\\`");
}

function describeType(prop: any): string {
  if (prop.const !== undefined) return `\`${prop.const}\``;
  if (prop.$ref) {
    const refName = prop.$ref.split("/").pop()!.replace(".schema.json", "");
    return refName
      .split("-")
      .map((s: string) => s.charAt(0).toUpperCase() + s.slice(1))
      .join("");
  }
  if (prop.enum) {
    return prop.enum.map((e: any) => `"${e}"`).join(" | ");
  }
  if (prop.type === "array") {
    if (prop.items?.$ref) {
      const refName = prop.items.$ref
        .split("/")
        .pop()!
        .replace(".schema.json", "");
      const camelName = refName
        .split("-")
        .map((s: string) => s.charAt(0).toUpperCase() + s.slice(1))
        .join("");
      return `${camelName}[]`;
    }
    if (prop.items?.type) return `${prop.items.type}[]`;
    if (prop.items?.enum) {
      return `(${prop.items.enum.map((e: any) => `"${e}"`).join(" | ")})[]`;
    }
    return "array";
  }
  if (Array.isArray(prop.type)) return prop.type.join(" | ");
  return prop.type || "any";
}

function buildFieldCards(schema: any): FieldDef[] {
  const required: string[] = schema.required || [];
  const properties: Record<string, any> = schema.properties || {};
  return Object.entries(properties).map(([name, prop]) => ({
    name,
    type: describeType(prop),
    required: required.includes(name),
    description: prop.description || "",
    enum: prop.enum,
    pattern: prop.pattern,
    format: prop.format,
    example: prop.example,
    defaultValue: prop.default,
  }));
}

function renderCardMdx(field: FieldDef): string {
  const props: string[] = [
    `name="${field.name}"`,
    `type={${jsonSafe(field.type)}}`,
    `required={${field.required}}`,
  ];
  if (field.format) props.push(`format="${field.format}"`);
  if (field.pattern) props.push(`pattern={${jsonSafe(field.pattern)}}`);
  if (field.enum) props.push(`enumValues={${jsonSafe(field.enum)}}`);
  if (field.defaultValue !== undefined)
    props.push(`defaultValue={${jsonSafe(field.defaultValue)}}`);
  if (field.example !== undefined)
    props.push(`example={${jsonSafe(field.example)}}`);

  const desc = field.description.replace(/`/g, "\\`");
  return `<FieldCard
  ${props.join("\n  ")}
>
  ${desc}
</FieldCard>`;
}

async function main() {
  const versions = ["v0.1"];

  for (const version of versions) {
    const schemasDir = resolve(ROOT, "spec", version, "schemas");
    const outDir = resolve(ROOT, "docs", "schemas", "_partials");

    if (existsSync(outDir)) rmSync(outDir, { recursive: true });
    mkdirSync(outDir, { recursive: true });

    const schemaFiles = await glob("*.schema.json", { cwd: schemasDir });
    const primitiveFiles = await glob("_primitives/*.schema.json", {
      cwd: schemasDir,
    });
    const allFiles = [...primitiveFiles, ...schemaFiles];

    for (const file of allFiles) {
      const schemaPath = resolve(schemasDir, file);
      const schema = JSON.parse(readFileSync(schemaPath, "utf-8"));

      // For schemas using $defs as the property source, walk them too
      const baseProperties = schema.properties;
      if (!baseProperties) continue;

      const fields = buildFieldCards(schema);
      const baseName = basename(file).replace(".schema.json", "");

      // Emit the schema-level description (which carries A2A/AAP context) above
      // the field cards so any docs page that imports the partial gets both the
      // narrative framing and the per-field cards in one block.
      const description = (schema.description || "").trim();
      const lines: string[] = [
        `{/* Auto-generated from ${file}. Edit the schema, not this file. */}`,
        "",
      ];
      if (description) {
        lines.push(description, "");
      }
      lines.push(...fields.map(renderCardMdx), "");

      const outFile = resolve(outDir, `${baseName}.mdx`);
      writeFileSync(outFile, lines.join("\n"));
      console.log(`Generated ${outFile}`);
    }
  }
}

main();
