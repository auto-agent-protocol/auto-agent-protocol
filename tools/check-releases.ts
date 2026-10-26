import { existsSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { checkReleases, filesIn, hash, isMain, loadRegistry, readJson, ROOT, SITE } from "./lib/releases.js";
import { validateSchemas } from "./validate-schemas.js";
import { validateExamples } from "./validate-examples.js";
import { validateManifest } from "./validate-manifest.js";

interface BootstrapRecord {url: string; sha256: string; matchesCurrentGenerator: boolean}
interface BootstrapProvenance {sourceCommit: string; artifacts: BootstrapRecord[]}
interface McpTool {
  name?: string;
  inputSchema?: {$ref?: string};
  annotations?: {aap_response_schema?: string};
  _meta?: Record<string, Record<string, unknown>>;
}

function refs(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap(refs);
  return Object.entries(value as Record<string, unknown>).flatMap(([key, item]) => key === "$ref" && typeof item === "string" ? [item] : refs(item));
}

export async function checkAllReleases(root = ROOT): Promise<void> {
  checkReleases(root);
  const registry = loadRegistry(root);
  for (const release of registry.releases) {
    const spec = resolve(root, "spec", release.contract);
    await validateSchemas(spec, release.contract);
    await validateExamples(spec, release.contract);
    const schemaDir = resolve(spec, "schemas");
    for (const file of filesIn(schemaDir).filter(name => name.endsWith(".json"))) {
      const schema = readJson<{ $id?: string }>(file);
      const name = relative(schemaDir, file).split("\\").join("/");
      const expected = `${SITE}/${release.contract}/schemas/${name}`;
      if (schema.$id !== expected) throw new Error(`${release.contract}/${name}: $id must be ${expected}`);
    }
    const manifest = validateManifest(spec, release.contract);
    const normalizedVersion = manifest.version?.split(".").length === 2 ? `${manifest.version}.0` : manifest.version;
    const extensionPrefix = `${SITE}/extensions/`;
    if (normalizedVersion !== release.version || !manifest.extension_uri?.startsWith(extensionPrefix) || !manifest.extension_uri.endsWith(`/${release.contract}`) || manifest.schema_base_url !== `${SITE}/${release.contract}/schemas/`) throw new Error(`${release.contract}: manifest identifiers are not pinned to this release`);
    const artifactDir = resolve(root, "releases", release.contract, "artifacts");
    const openapis = ["openapi-jsonrpc.yaml", ...(existsSync(resolve(schemaDir, "poppy.schema.json")) ? ["openapi-poppy.yaml"] : [])];
    for (const name of [...openapis, "mcp.json"]) {
      const text = readFileSync(resolve(artifactDir, name), "utf8");
      if (text.includes("autoagentprotocol.invalid") || text.includes("/latest/")) throw new Error(`${release.contract}/${name}: draft identifier leaked into release`);
    }
    for (const name of openapis) {
      const openapi = parseYaml(readFileSync(resolve(artifactDir, name), "utf8")) as {components?: {schemas?: Record<string, unknown>}};
      const components = openapi.components?.schemas ?? {};
      for (const ref of refs(openapi).filter(value => value.startsWith("#/components/schemas/"))) {
        const component = ref.slice("#/components/schemas/".length).split("/")[0].replaceAll("~1", "/").replaceAll("~0", "~");
        if (!(component in components)) throw new Error(`${release.contract}/${name}: unresolved component reference ${ref}`);
      }
    }
    const mcp = readJson<{tools?: McpTool[]}>(resolve(artifactDir, "mcp.json"));
    const schemaReferences = (mcp.tools ?? []).flatMap(tool => {
      const references = [tool.inputSchema?.$ref, tool.annotations?.aap_response_schema].filter((value): value is string => value !== undefined);
      const metadata = tool._meta?.["autoagentprotocol.org/aap"];
      if (Number(release.version.split(".")[0]) >= 3 || metadata) {
        const fields = ["request_schema", "response_schema", "error_schema"];
        if (tool.name === "aap_inventory_search" || metadata?.capabilities_schema !== undefined) fields.push("capabilities_schema");
        for (const field of fields) {
          const ref = metadata?.[field];
          if (typeof ref !== "string" || !ref) throw new Error(`${release.contract}/${tool.name}: missing or invalid MCP metadata ${field}`);
          references.push(ref);
        }
      }
      return references;
    });
    const schemaFiles = new Set(filesIn(schemaDir).map(file => relative(schemaDir, file).split("\\").join("/")));
    for (const ref of schemaReferences) {
      const prefix = `${SITE}/${release.contract}/schemas/`;
      if (!ref.startsWith(prefix) || !schemaFiles.has(ref.slice(prefix.length))) throw new Error(`${release.contract}/mcp.json: unresolved schema reference ${ref}`);
    }
  }
  const stable = registry.stable;
  const publishedTypes = readFileSync(resolve(root, "packages/types/src/index.d.ts"));
  const frozenTypes = readFileSync(resolve(root, "releases", stable, "artifacts/types.d.ts"));
  if (!publishedTypes.equals(frozenTypes)) throw new Error("@autoagentprotocol/types must be sourced from the stable release snapshot");
  const bootstrap = readJson<BootstrapProvenance>(resolve(root, "releases/bootstrap-provenance.json"));
  if (!/^[a-f0-9]{40}$/.test(bootstrap.sourceCommit) || bootstrap.artifacts.length !== 20) throw new Error("Bootstrap provenance is incomplete");
  const seen = new Set<string>();
  for (const record of bootstrap.artifacts) {
    const match = record.url.match(/^https:\/\/autoagentprotocol\.org\/(v\d+\.\d+)\/(mcp\.json|openapi-jsonrpc\.yaml|openapi-rest\.yaml|types\.d\.ts)$/);
    if (!match || seen.has(record.url) || !record.matchesCurrentGenerator) throw new Error(`Invalid bootstrap provenance record: ${record.url}`);
    seen.add(record.url);
    const [, contract, name] = match;
    if (!registry.releases.some(release => release.contract === contract) || record.sha256 !== hash(readFileSync(resolve(root, "releases", contract, "artifacts", name)))) throw new Error(`Bootstrap public-artifact provenance mismatch: ${record.url}`);
  }
  console.log(`Release registry valid: ${registry.releases.length} immutable releases; stable=${stable}`);
}

if (isMain(import.meta.url)) checkAllReleases().catch(error => {console.error(error); process.exitCode = 1;});
