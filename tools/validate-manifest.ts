import { existsSync, readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { DRAFT_SITE, DRAFT_VERSION, isMain, ROOT } from "./lib/releases.js";

interface Skill {
  id?: string;
  request_schema?: string;
  response_schema?: string;
  request_type?: string;
  response_type?: string;
}
export interface SkillsManifest {
  version?: string;
  extension_uri?: string;
  schema_base_url?: string;
  skills?: Skill[];
}

export function validateManifest(specDir: string, label: string): SkillsManifest {
  const manifest = parseYaml(readFileSync(resolve(specDir, "skills.yaml"), "utf8")) as SkillsManifest;
  if (!manifest.version || !manifest.extension_uri || !manifest.schema_base_url || !Array.isArray(manifest.skills) || !manifest.skills.length) throw new Error(`${label}: incomplete skills.yaml`);
  const ids = new Set<string>();
  for (const skill of manifest.skills) {
    if (!skill.id || ids.has(skill.id)) throw new Error(`${label}: missing or duplicate skill id ${skill.id ?? "(missing)"}`);
    ids.add(skill.id);
    if (skill.request_type !== `${skill.id}.request` || skill.response_type !== `${skill.id}.response`) throw new Error(`${label}/${skill.id}: request/response type does not match the skill id`);
    for (const [kind, name, type] of [["request", skill.request_schema, skill.request_type], ["response", skill.response_schema, skill.response_type]] as const) {
      if (!name || basename(name) !== name || !name.endsWith(".schema.json")) throw new Error(`${label}/${skill.id}: unsafe ${kind} schema path`);
      const file = resolve(specDir, "schemas", name);
      if (!existsSync(file)) throw new Error(`${label}/${skill.id}: missing ${name}`);
      const schema = JSON.parse(readFileSync(file, "utf8")) as {$id?: string; properties?: {type?: {const?: string}}};
      if (schema.$id !== `${manifest.schema_base_url}${name}` || schema.properties?.type?.const !== type) throw new Error(`${label}/${skill.id}: ${name} does not match manifest URL/type metadata`);
    }
  }
  return manifest;
}

if (isMain(import.meta.url)) {
  try {
    const manifest = validateManifest(resolve(ROOT, "spec/latest"), "latest draft");
    if (manifest.version !== DRAFT_VERSION || manifest.extension_uri !== `${DRAFT_SITE}/extensions/aap/latest` || manifest.schema_base_url !== `${DRAFT_SITE}/latest/schemas/`) throw new Error("latest draft: manifest must use non-routable draft identifiers");
    console.log(`Validated ${manifest.skills!.length} skills for latest draft`);
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}
