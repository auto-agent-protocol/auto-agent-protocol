import { compileFromFile } from "json-schema-to-typescript";
import { glob } from "glob";
import { writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";
import { DRAFT_VERSION, ROOT, isMain } from "./lib/releases.js";

// Each schema file is compiled independently and the results are concatenated
// into one .d.ts. With `declareExternallyReferenced: true` every file emits the
// full definition of the shared $defs it references (e.g. Vehicle, Customer,
// TermFacet), so the same declaration appears many times. Identical `type`
// aliases collide (TS2300) and identical `interface`s merge but re-declare their
// string index signature (TS2374). We drop only byte-identical duplicate
// declaration blocks (keyed by name + body), which is safe: removing an exact
// duplicate cannot change the resulting type. Legitimately different types that
// happen to share a name (e.g. the distinct `Filters` on the search vs. facets
// requests) have different bodies, so both are preserved exactly as before.
function stripCommentsAndStrings(
  line: string,
  state: { block: boolean; str: string | null }
): string {
  let out = "";
  let i = 0;
  while (i < line.length) {
    if (state.block) {
      const end = line.indexOf("*/", i);
      if (end === -1) return out;
      i = end + 2;
      state.block = false;
      continue;
    }
    if (state.str) {
      if (line[i] === "\\") {
        i += 2;
        continue;
      }
      if (line[i] === state.str) state.str = null;
      i++;
      continue;
    }
    if (line[i] === "/" && line[i + 1] === "*") {
      state.block = true;
      i += 2;
      continue;
    }
    if (line[i] === "/" && line[i + 1] === "/") return out;
    if (line[i] === '"' || line[i] === "'" || line[i] === "`") {
      state.str = line[i];
      i++;
      continue;
    }
    out += line[i];
    i++;
  }
  return out;
}

function dedupeDeclarations(source: string): string {
  const lines = source.split("\n");
  const result: string[] = [];
  const seen = new Set<string>();
  let i = 0;
  while (i < lines.length) {
    // Capture an optional leading JSDoc comment attached to a declaration.
    const comment: string[] = [];
    let j = i;
    if (lines[i].trimStart().startsWith("/**")) {
      while (j < lines.length) {
        comment.push(lines[j]);
        const closed = lines[j].includes("*/");
        j++;
        if (closed) break;
      }
    }

    const declLine = lines[j] ?? "";
    const m = declLine.match(/^export (interface|type) ([A-Za-z0-9_]+)/);
    if (!m) {
      // Not a declaration (banner, blank line, etc.) — emit verbatim.
      result.push(lines[i]);
      i++;
      continue;
    }

    const kind = m[1];
    const name = m[2];
    const bodyLines: string[] = [];
    const state = { block: false, str: null as string | null };
    let depth = 0;
    let started = false;
    let k = j;
    for (; k < lines.length; k++) {
      bodyLines.push(lines[k]);
      const stripped = stripCommentsAndStrings(lines[k], state);
      for (const ch of stripped) {
        if (ch === "{" || (kind === "type" && (ch === "(" || ch === "["))) {
          depth++;
          started = true;
        } else if (
          ch === "}" ||
          (kind === "type" && (ch === ")" || ch === "]"))
        ) {
          depth--;
        }
      }
      if (kind === "interface") {
        if (started && depth === 0) {
          k++;
          break;
        }
      } else {
        // type alias: terminate on a `;` once all bracket groups are closed.
        if (depth <= 0 && /;\s*$/.test(stripped)) {
          k++;
          break;
        }
      }
    }

    const body = bodyLines.join("\n");
    const key = `${name}\u0000${body}`;
    if (seen.has(key)) {
      // Skip the duplicate block and the blank line that follows it.
      if (k < lines.length && lines[k].trim() === "") k++;
    } else {
      seen.add(key);
      result.push(...comment, ...bodyLines);
    }
    i = k;
  }
  return result.join("\n");
}

export async function generateTypes(schemasDir: string, outDir: string, version: string): Promise<string> {
  mkdirSync(outDir, { recursive: true });
  const schemaFiles = (await glob("*.schema.json", { cwd: schemasDir })).sort();
  const primitiveFiles = (await glob("_primitives/*.schema.json", { cwd: schemasDir })).sort();
  let output = `// Auto-generated from JSON Schema — do not edit\n// Auto Agent Protocol ${version}\n\n`;
  for (const file of [...primitiveFiles, ...schemaFiles]) {
    output += await compileFromFile(resolve(schemasDir, file), {
      bannerComment: "",
      cwd: schemasDir,
      declareExternallyReferenced: true,
      unknownAny: false,
    }) + "\n";
  }
  const deduped = dedupeDeclarations(output);
  writeFileSync(resolve(outDir, "types.d.ts"), deduped);
  console.log(`Generated ${resolve(outDir, "types.d.ts")}`);
  return deduped;
}

if (isMain(import.meta.url)) {
  generateTypes(resolve(ROOT, "spec/latest/schemas"), resolve(ROOT, "generated/latest"), DRAFT_VERSION)
    .catch(error => { console.error(error); process.exitCode = 1; });
}
