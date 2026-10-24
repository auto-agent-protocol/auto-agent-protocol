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
  const bridge = poppy.extensions["autoagentprotocol.org/aap"];
  if (!params) return ["Agent Card must declare the selected AAP extension and its params"];
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
  const capabilities = params.skills["inventory.search"]?.capabilities;
  if (capabilities) {
    if (!capabilities.sort_fields.includes(capabilities.default_sort.field)) errors.push("Search default_sort must use a supported sort field");
    if (capabilities.default_limit > capabilities.max_limit) errors.push("Search default_limit must not exceed max_limit");
  }
  const origin = `https://${poppy.organization.domain}`;
  if (params.poppy !== `${origin}/.well-known/poppy.json`) errors.push("AAP Poppy link must name the final dealer-domain discovery document");
  if (params.llms_txt !== `${origin}/llms.txt` || bridge.llms_txt !== params.llms_txt) errors.push("Both discovery documents must link the same dealer-domain llms.txt");
  if (bridge.agent_card !== cardUrl) errors.push("Poppy bridge must link the paired Agent Card");
  if (bridge.mcp !== params.mcp.url) errors.push("Both discovery documents must link the same MCP endpoint");
  for (const api of poppy.apis.filter((entry: any) => entry.type === "mcp")) {
    if (api.url !== params.mcp.url || api.resource !== params.mcp.url) errors.push("Native PAP MCP must use the advertised MCP URL as both url and resource");
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
      if (skill.id === "inventory.search") {
        const normalize = (value: any) => value && ({ ...value, filters: [...value.filters].sort(), sort_fields: [...value.sort_fields].sort() });
        if (!isDeepStrictEqual(normalize(metadata.capabilities), normalize(capabilities))) errors.push("MCP and Agent Card search capabilities must agree");
      }
    }
  }
  return errors;
}
