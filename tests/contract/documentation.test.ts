import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { globSync } from "glob";
import { ROOT } from "../../tools/lib/releases.js";
import { readableMarkdown } from "../../tools/lib/markdown.js";

const schemas = globSync("spec/latest/schemas/**/*.schema.json", { cwd: ROOT }).map(file => ({ file, schema: JSON.parse(readFileSync(resolve(ROOT, file), "utf8")) }));
const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats(ajv);
for (const { schema } of schemas) ajv.addSchema(schema);
const byType = new Map(schemas.filter(({ schema }) => schema.properties?.type?.const).map(({ schema }) => [schema.properties.type.const, ajv.getSchema(schema.$id)!]));

function visit(value: unknown, callback: (value: Record<string, any>, path: string) => void, path = ""): void {
  if (Array.isArray(value)) value.forEach((item, index) => visit(item, callback, `${path}/${index}`));
  else if (value && typeof value === "object") {
    callback(value, path);
    for (const [key, item] of Object.entries(value)) visit(item, callback, `${path}/${key.replaceAll("~", "~0").replaceAll("/", "~1")}`);
  }
}

test("every copyable JSON example in the current specification parses and uses valid AAP payloads", () => {
  const seen = new Set<string>();
  for (const file of globSync("docs/**/*.{md,mdx}", { cwd: ROOT })) {
    const source = readFileSync(resolve(ROOT, file), "utf8");
    for (const match of source.matchAll(/```json\n([\s\S]*?)\n```/g)) {
      const line = source.slice(0, match.index).split("\n").length;
      let value: unknown;
      try { value = JSON.parse(match[1]); }
      catch (error) { throw new Error(`${file}:${line}: ${(error as Error).message}`); }
      visit(value, payload => {
        const validate = byType.get(payload.type);
        if (!validate) return;
        seen.add(payload.type);
        assert.ok(validate(payload), `${file}:${line}: ${ajv.errorsText(validate.errors, { separator: "; " })}`);
      });
    }
  }
  for (const type of byType.keys()) {
    if (type === "aap.event") continue;
    assert.ok(seen.has(type), `missing documented ${type} payload`);
  }
});

test("schema examples and defaults satisfy their own published constraints", () => {
  let checked = 0;
  for (const { file, schema } of schemas) {
    visit(schema, (node, pointer) => {
      if (!Array.isArray(node.examples) && !Object.hasOwn(node, "default")) return;
      const validate = ajv.compile({ $ref: `${schema.$id}#${pointer}` });
      const examples = [...(node.examples ?? []), ...(Object.hasOwn(node, "default") ? [node.default] : [])];
      for (const value of examples) {
        assert.ok(validate(value), `${file}#${pointer}: ${ajv.errorsText(validate.errors, { separator: "; " })}`);
        checked++;
      }
    });
  }
  assert.ok(checked > 0, "no schema examples audited");
});

test("readable documentation preserves executable examples and resolves relative reading links", () => {
  for (const file of globSync("docs/**/*.md", { cwd: ROOT })) {
    const source = readFileSync(resolve(ROOT, file), "utf8");
    const page = `https://autoagentprotocol.org/${file.replace(/^docs\//, "docs/latest/")}`;
    const markdown = readableMarkdown(source, page);
    const fences = (value: string) => [...value.matchAll(/^[ \t]*```[^\n]*\n[\s\S]*?\n[ \t]*```[ \t]*(?=\n|$)/gm)].map(match => match[0]);
    assert.deepEqual(fences(markdown), fences(source), `${file}: altered code examples`);
  }
  const converted = readableMarkdown("![Distance diagram](../img/geo-search.svg)\n[Search](./inventory-search.md#equipment-needs-evidence)", "https://autoagentprotocol.org/docs/v3.0/skills/inventory-vehicle.md");
  assert.equal(converted, "![Distance diagram](https://autoagentprotocol.org/docs/v3.0/img/geo-search.svg)\n[Search](https://autoagentprotocol.org/docs/v3.0/skills/inventory-search.md#equipment-needs-evidence)");
});
