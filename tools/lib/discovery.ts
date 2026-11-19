import { isDeepStrictEqual } from "node:util";
import type { SkillsManifest } from "../validate-manifest.js";

export function checkDiscovery(
  card: Record<string, any>,
  poppy: Record<string, any>,
  manifest: SkillsManifest,
  cardUrl: string,
  tools?: Record<string, any>[],
): string[] {
  const errors: string[] = [];
  const params = card.capabilities.extensions.find((entry: any) => entry.uri === manifest.extension_uri)?.params;
  const listed = poppy.extensions["autoagentprotocol.org/aap"];
  const bridge = Array.isArray(listed) ? listed.find((entry: any) => entry?.version === "1") : listed;
  if (!params) return ["Agent Card must declare the selected AAP extension and its params"];
  if (!bridge) return ["Poppy document must list the version-1 AAP bridge entry"];
  if (params.version !== manifest.version || params.schema_base_url !== manifest.schema_base_url || bridge.aap_version !== manifest.version) {
    errors.push("Discovery documents must identify the same AAP contract as the manifest");
  }
  const canonical = new Map(manifest.skills!.map(skill => [skill.id, skill]));
  const ids: string[] = card.skills.map((skill: any) => skill.id);
  if (new Set(ids).size !== ids.length) errors.push("Agent Card skill IDs must be unique");
  const aapIds = ids.filter(id => canonical.has(id)).sort();
  if (!isDeepStrictEqual(aapIds, Object.keys(params.skills).sort())) errors.push("Agent Card skills and AAP params.skills must declare the same subset");
  for (const [id, entry] of Object.entries(params.skills) as [string, any][]) {
    const skill = canonical.get(id);
    if (!skill || entry.request_schema !== `${manifest.schema_base_url}${skill.request_schema}` || entry.response_schema !== `${manifest.schema_base_url}${skill.response_schema}`) {
      errors.push(`${id}: request and response schema URLs must match the selected manifest`);
    }
  }
  // Releases before 4.0 used dotted skill ids (inventory.search).
  const snake = (id: string) => id.replaceAll(".", "_");
  const searchId = Object.keys(params.skills).find(id => snake(id) === "inventory_search") ?? "inventory_search";
  const capabilities = params.skills[searchId]?.capabilities;
  if (capabilities) {
    if (!capabilities.sort_fields.includes(capabilities.default_sort.field)) errors.push("Search default_sort must use a supported sort field");
    if (capabilities.default_limit > capabilities.max_limit) errors.push("Search default_limit must not exceed max_limit");
    if (!(capabilities.currencies ?? ["USD"]).includes(capabilities.default_currency ?? "USD")) errors.push("Search default_currency must be a supported currency");
  }
  const poppyUrl = new URL(params.poppy);
  if (poppyUrl.protocol !== "https:" || poppyUrl.hostname !== poppy.organization.domain.toLowerCase() ||
      poppyUrl.pathname !== "/.well-known/poppy.json" || poppyUrl.username || poppyUrl.password || poppyUrl.search || poppyUrl.hash) {
    errors.push("AAP Poppy link must name the final dealer-domain discovery document");
  }
  if (new URL(params.llms_txt).href !== `${poppyUrl.origin}/llms.txt` || bridge.llms_txt !== params.llms_txt) errors.push("Both discovery documents must link the same dealer-domain llms.txt");
  if (bridge.agent_card !== cardUrl) errors.push("Poppy bridge must link the paired Agent Card");
  if (bridge.mcp !== params.mcp.url) errors.push("Both discovery documents must link the same MCP endpoint");
  for (const api of poppy.apis.filter((entry: any) => entry.type === "mcp")) {
    if (api.url !== params.mcp.url || (!Array.isArray(listed) && api.resource !== params.mcp.url)) errors.push("Native PAP MCP must use the advertised MCP URL, which is also its protected resource");
  }
  if (tools) {
    const aapTools = tools.filter(tool => tool._meta?.["autoagentprotocol.org/aap"]);
    const toolIds = aapTools.map(tool => tool._meta["autoagentprotocol.org/aap"].skill).sort();
    if (!isDeepStrictEqual(toolIds, aapIds)) errors.push("MCP tools/list must expose the same AAP skill subset");
    for (const tool of aapTools) {
      const metadata = tool._meta["autoagentprotocol.org/aap"];
      const skill = canonical.get(metadata.skill);
      if (!skill) continue;
      if (tool.name !== `aap_${skill.id!.replaceAll(".", "_")}` || metadata.version !== manifest.version ||
          metadata.request_type !== skill.request_type || metadata.response_type !== skill.response_type ||
          metadata.request_schema !== `${manifest.schema_base_url}${skill.request_schema}` ||
          metadata.response_schema !== `${manifest.schema_base_url}${skill.response_schema}` ||
          metadata.error_schema !== `${manifest.schema_base_url}error.schema.json`) {
        errors.push(`${tool.name}: MCP metadata must match the shared skill contract`);
      }
      if (snake(skill.id!) === "inventory_search") {
        const normalize = (value: any) => value && ({ ...value, filters: [...value.filters].sort(), sort_fields: [...value.sort_fields].sort(),
          currencies: [...(value.currencies ?? ["USD"])].sort(), default_currency: value.default_currency ?? "USD", default_mileage_unit: value.default_mileage_unit ?? "mi" });
        if (!isDeepStrictEqual(normalize(metadata.capabilities), normalize(capabilities))) errors.push("MCP and Agent Card search capabilities must agree");
      }
      if (snake(skill.id!) === "trade_in_submit" || snake(skill.id!) === "credit_application_submit") {
        const normalize = (value: any) => value && ({ ...value, currencies: [...(value.currencies ?? ["USD"])].sort(), ...(value.inquiry_types ? { inquiry_types: [...value.inquiry_types].sort() } : {}) });
        if (!isDeepStrictEqual(normalize(metadata.capabilities), normalize(params.skills[skill.id!]?.capabilities))) errors.push(`MCP and Agent Card ${skill.id} capabilities must agree`);
      }
    }
  }
  return errors;
}
