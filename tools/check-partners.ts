import { resolve } from "node:path";
import { isMain, readJson, ROOT } from "./lib/releases.js";

export type EntityType = "Organization" | "Project";
export interface PartnerLink { label: string; url: string }
export interface Partner { name: string; type: EntityType; role: string; description: string; links: PartnerLink[] }
export interface PartnerRegistry { schemaVersion: 1; updated: string; partners: Partner[] }

const ENTITY_TYPES: EntityType[] = ["Organization", "Project"];
// These reach an unescaped JSON-LD <script> on the page and single-line Markdown in llms.txt.
const UNSAFE = /[<>\p{Cc}\p{Cf}]/u;
const ROLE = /^\p{Lu}/u;
const MAX_TIMEZONE_SKEW = 24 * 60 * 60 * 1000;

function text(value: unknown, field: string, min: number, max: number): string {
  if (typeof value !== "string") throw new Error(`${field} must be a string, got ${JSON.stringify(value)}`);
  if (value.length < min || value.length > max) throw new Error(`${field} must be ${min}-${max} characters, got ${value.length}`);
  if (value.trim() !== value || UNSAFE.test(value)) throw new Error(`${field} must be trimmed plain text without angle brackets or control characters: ${JSON.stringify(value)}`);
  return value;
}

export function sortKey(name: string): string {
  return name.toLocaleLowerCase("en");
}

export function loadPartners(root = ROOT): PartnerRegistry {
  const registry = readJson<PartnerRegistry>(resolve(root, "partners.json"));
  if (registry.schemaVersion !== 1 || !Array.isArray(registry.partners) || !registry.partners.length) throw new Error("Invalid or empty partner registry");
  const updated = new Date(`${text(registry.updated, "updated", 10, 10)}T00:00:00Z`);
  if (Number.isNaN(updated.getTime()) || updated.toISOString().slice(0, 10) !== registry.updated) throw new Error(`updated must be an ISO calendar date: ${registry.updated}`);
  if (updated.getTime() > Date.now() + MAX_TIMEZONE_SKEW) throw new Error(`updated is in the future: ${registry.updated}`);
  const urls = new Set<string>();
  let previous: Partner | undefined;
  for (const partner of registry.partners) {
    const name = text(partner?.name, "partner name", 1, 60);
    if (!ENTITY_TYPES.includes(partner.type)) throw new Error(`${name}: type must be one of ${ENTITY_TYPES.join(", ")}, got ${JSON.stringify(partner.type)}`);
    if (!ROLE.test(text(partner.role, `${name}: role`, 3, 40))) throw new Error(`${name}: role must start with a capital letter, got ${JSON.stringify(partner.role)}`);
    text(partner.description, `${name}: description`, 80, 400);
    if (!Array.isArray(partner.links) || !partner.links.length) throw new Error(`${name}: at least one link is required`);
    const labels = new Set<string>();
    for (const link of partner.links) {
      if (!link || typeof link !== "object") throw new Error(`${name}: each link must be an object, got ${JSON.stringify(link)}`);
      const label = text(link.label, `${name}: link label`, 1, 60);
      const raw = text(link.url, `${name}: link url`, 8, 255);
      const url = new URL(raw);
      if (url.protocol !== "https:" || url.pathname !== "/" || url.search || url.hash) throw new Error(`${name}: links must be bare https origins, got ${raw}`);
      if (raw !== url.origin) throw new Error(`${name}: write the link in normalized origin form: ${url.origin}`);
      if (labels.has(label)) throw new Error(`${name}: duplicate link label ${JSON.stringify(label)}`);
      if (urls.has(raw)) throw new Error(`Duplicate partner link: ${raw}`);
      labels.add(label);
      urls.add(raw);
    }
    if (partner.links[0].label !== name) throw new Error(`${name}: the first link must be the organization itself, got ${JSON.stringify(partner.links[0].label)}`);
    if (previous && sortKey(previous.name).localeCompare(sortKey(name), "en") >= 0) throw new Error(`Partners must be unique and alphabetical: ${previous.name} precedes ${name}`);
    previous = partner;
  }
  return registry;
}

if (isMain(import.meta.url)) {
  try {
    const registry = loadPartners();
    console.log(`Partner registry valid: ${registry.partners.length} partners, alphabetical, updated ${registry.updated}`);
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}
