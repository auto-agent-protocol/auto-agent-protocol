import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import test from "node:test";
import { parse as parseYaml } from "yaml";
import { checkAllReleases } from "../../tools/check-releases.js";
import { freezeCheck } from "../../tools/freeze-check.js";
import { generateMcp } from "../../tools/generate-mcp-manifest.js";
import { generateOpenapi } from "../../tools/generate-openapi.js";
import { generateTypes } from "../../tools/generate-types.js";
import { contractFor, DRAFT_SITE, DRAFT_VERSION, filesIn, hash, loadRegistry, parseVersion, releasePrefixes, ROOT, readJson, SITE, writeJson } from "../../tools/lib/releases.js";
import { prepareRelease } from "../../tools/release-prepare.js";

function snapshot(directory: string): string {
  return hash(filesIn(directory).map(file => `${relative(directory, file).split("\\").join("/")}\0${hash(readFileSync(file))}`).join("\n"));
}

function releaseState(root: string): string {
  const directories = ["spec", "docs", "releases", "versioned_docs", "versioned_sidebars"].flatMap(name => filesIn(join(root, name)));
  const packageFiles = ["types", "schemas", "validator"].flatMap(name => [join(root, `packages/${name}/package.json`), ...filesIn(join(root, `packages/${name}/src`))]);
  const files = [...directories, ...packageFiles, "package.json", "releases.json", "versions.json"].map(file => file.startsWith(root) ? file : join(root, file)).sort();
  return hash(files.map(file => `${relative(root, file).split("\\").join("/")}\0${hash(readFileSync(file))}`).join("\n"));
}

function git(root: string, args: string[]): string {
  return execFileSync("git", args, {cwd: root, encoding: "utf8"}).trim();
}

function nextRelease(root: string): {version: string; contract: string} {
  const registry = loadRegistry(root);
  const stable = registry.releases.find(release => release.contract === registry.stable);
  if (!stable) throw new Error(`Stable release ${registry.stable} is missing`);
  const [major] = stable.version.split(".").map(Number);
  const version = `${major + 1}.0.0`;
  return {version, contract: contractFor(version)};
}

function fixture(): {root: string; cleanup: () => void; base: string} {
  const temporary = mkdtempSync(join(tmpdir(), "aap-release-test-"));
  const root = join(temporary, "repo");
  cpSync(ROOT, root, {
    recursive: true,
    filter(source) {
      const name = relative(ROOT, source).split("\\").join("/");
      return !name || !/^(?:\.git|node_modules|build|generated|\.docusaurus)(?:\/|$)/.test(name);
    },
  });
  git(root, ["init", "-q"]);
  git(root, ["config", "user.email", "alex.yankouski@gmail.com"]);
  git(root, ["config", "user.name", "Alex Yankouski"]);
  git(root, ["add", "."]);
  git(root, ["commit", "-qm", "feat: create release test fixture"]);
  return {root, base: git(root, ["rev-parse", "HEAD"]), cleanup: () => rmSync(temporary, {recursive: true, force: true})};
}

test("release version labels reject ambiguous patch contracts", () => {
  assert.deepEqual(parseVersion("1.3.0"), [1, 3, 0]);
  assert.equal(contractFor("1.3.0"), "v1.3");
  assert.throws(() => contractFor("1.3.1"), /patch/i);
  assert.throws(() => parseVersion("01.3.0"), /invalid/i);
});

test("draft generation is isolated from frozen releases and stable package types", async () => {
  const temporary = mkdtempSync(join(tmpdir(), "aap-draft-generation-"));
  const releasesBefore = snapshot(join(ROOT, "releases"));
  const typesBefore = hash(readFileSync(join(ROOT, "packages/types/src/index.d.ts")));
  try {
    await generateTypes(join(ROOT, "spec/latest/schemas"), temporary, "0.0.0-dev");
    await generateOpenapi(join(ROOT, "spec/latest"), temporary, "0.0.0-dev");
    generateMcp(join(ROOT, "spec/latest"), temporary, "0.0.0-dev");
    assert.deepEqual(filesIn(temporary).map(file => relative(temporary, file)).sort(), ["mcp.json", "openapi-jsonrpc.yaml", "openapi-poppy.yaml", "types.d.ts"]);
    assert.equal(snapshot(join(ROOT, "releases")), releasesBefore);
    assert.equal(hash(readFileSync(join(ROOT, "packages/types/src/index.d.ts"))), typesBefore);
  } finally {
    rmSync(temporary, {recursive: true, force: true});
  }
});

test("release dry-run changes no repository bytes", async () => {
  const before = releaseState(ROOT);
  await prepareRelease(ROOT, nextRelease(ROOT).version, true);
  assert.equal(releaseState(ROOT), before);
});

test("release preparation rejects malformed draft-only notices without changing repository bytes", async () => {
  const context = fixture();
  try {
    const file = join(context.root, "docs/intro.md");
    const original = readFileSync(file, "utf8");
    const start = "{/* aap-draft-only:start */}", end = "{/* aap-draft-only:end */}";
    for (const malformed of [start, end, `${start}\n${start}\n${end}`, `inline ${start}\n${end}`]) {
      writeFileSync(file, `${original}\n${malformed}\n`);
      const before = releaseState(context.root);
      await assert.rejects(() => prepareRelease(context.root, nextRelease(context.root).version, true), /draft-only/);
      assert.equal(releaseState(context.root), before);
    }
  } finally {
    context.cleanup();
  }
});

test("rehearsing a major release does not bypass rejection of a breaking minor", async () => {
  const context = fixture();
  try {
    const registry = loadRegistry(context.root);
    const stable = registry.releases.find(release => release.contract === registry.stable)!;
    const [major, minor] = stable.version.split(".").map(Number);
    const schemaFile = join(context.root, "spec/latest/schemas/agent-card.schema.json");
    const schema = JSON.parse(readFileSync(schemaFile, "utf8"));
    // A new upper bound preserves these examples but narrows the public contract.
    schema.properties.description.maxLength = 100000;
    writeFileSync(schemaFile, `${JSON.stringify(schema, null, 2)}\n`);
    const before = releaseState(context.root);
    await assert.rejects(() => prepareRelease(context.root, `${major}.${minor + 1}.0`, true), /breaking schema changes; a minor release is not permitted/);
    assert.equal(releaseState(context.root), before);
  } finally {
    context.cleanup();
  }
});

test("the PAP 0.2 exception permits only the reviewed 2.0.0 to 2.1.0 specification", async () => {
  const context = fixture();
  try {
    const registry = loadRegistry(context.root);
    const baseline = registry.releases.findIndex(release => release.contract === "v2.0");
    assert.ok(baseline >= 0);
    const approvedSpec = join(context.root, "spec/v2.1"), draftSpec = join(context.root, "spec/latest");
    if (existsSync(approvedSpec)) {
      rmSync(draftSpec, {recursive: true});
      cpSync(approvedSpec, draftSpec, {recursive: true});
      for (const file of filesIn(draftSpec)) writeFileSync(file, readFileSync(file, "utf8")
        .replaceAll(`${SITE}/v2.1/`, `${DRAFT_SITE}/latest/`)
        .replaceAll(`${SITE}/extensions/aap/v2.1`, `${DRAFT_SITE}/extensions/aap/latest`)
        .replaceAll("2.1.0", DRAFT_VERSION));
    }
    for (const release of registry.releases.slice(baseline + 1)) {
      for (const path of releasePrefixes(release.contract)) rmSync(join(context.root, path), {recursive: true, force: true});
    }
    registry.releases = registry.releases.slice(0, baseline + 1);
    registry.stable = "v2.0";
    writeJson(join(context.root, "releases.json"), registry);
    writeJson(join(context.root, "versions.json"), registry.releases.map(release => release.contract).reverse());
    for (const file of ["package.json", "packages/types/package.json", "packages/schemas/package.json", "packages/validator/package.json"]) {
      const value = readJson<Record<string, unknown>>(join(context.root, file));
      writeJson(join(context.root, file), {...value, version: "2.0.0"});
    }
    cpSync(join(context.root, "releases/v2.0/artifacts/types.d.ts"), join(context.root, "packages/types/src/index.d.ts"));
    git(context.root, ["add", "-A"]);
    git(context.root, ["commit", "--allow-empty", "-qm", "feat: restore the PAP transition baseline"]);
    const frozenBefore = snapshot(join(context.root, "spec/v2.0"));
    for (const [name, property] of [["poppy-oauth-metadata", "issuer"], ["agent-card", "description"]]) {
      const file = join(context.root, `spec/latest/schemas/${name}.schema.json`);
      const original = readFileSync(file, "utf8");
      const schema = JSON.parse(original);
      schema.properties[property].maxLength = 100000;
      writeJson(file, schema);
      const before = releaseState(context.root);
      await assert.rejects(() => prepareRelease(context.root, "2.1.0", true), /breaking schema changes; a minor release is not permitted/);
      assert.equal(releaseState(context.root), before);
      writeFileSync(file, original);
    }
    await prepareRelease(context.root, "2.1.0", false);
    const report = readJson<{summary: {breaking: number}; compatibilityException: {workingSpecSha256: string}}>(join(context.root, "releases/v2.1/change-report.json"));
    const provenance = readJson<{workingSpecSha256: string}>(join(context.root, "releases/v2.1/provenance.json"));
    assert.ok(report.summary.breaking > 0, "the exception must retain the breaking-change report");
    assert.equal(report.compatibilityException.workingSpecSha256, provenance.workingSpecSha256);
    assert.equal(snapshot(join(context.root, "spec/v2.0")), frozenBefore);
    const file = join(context.root, "spec/latest/schemas/poppy-oauth-metadata.schema.json");
    const schema = JSON.parse(readFileSync(file, "utf8"));
    schema.properties.issuer.maxLength = 100000;
    writeJson(file, schema);
    await assert.rejects(() => prepareRelease(context.root, "2.2.0", true), /breaking schema changes; a minor release is not permitted/);
  } finally {
    context.cleanup();
  }
});

test("release preparation snapshots latest once and refuses overwrite", async () => {
  const context = fixture();
  try {
    const candidate = nextRelease(context.root);
    const latestBefore = snapshot(join(context.root, "spec/latest"));
    const docsBefore = snapshot(join(context.root, "docs"));
    await prepareRelease(context.root, candidate.version, false);
    const registry = loadRegistry(context.root);
    assert.equal(registry.stable, candidate.contract);
    assert.equal(registry.releases.at(-1)?.version, candidate.version);
    assert.equal(snapshot(join(context.root, "spec/latest")), latestBefore);
    assert.equal(snapshot(join(context.root, "docs")), docsBefore, "release transformation must leave editable notices intact");
    assert.equal(readJson<{version: string}>(join(context.root, "package.json")).version, candidate.version);
    const releaseRoot = join(context.root, "releases", candidate.contract);
    assert.deepEqual(filesIn(join(releaseRoot, "artifacts")).map(file => relative(join(releaseRoot, "artifacts"), file)).sort(), ["mcp.json", "openapi-jsonrpc.yaml", "openapi-poppy.yaml", "types.d.ts"]);
    const latestDiagram = join(context.root, "docs/img/pricing-ladder.svg");
    const releasedDiagram = join(context.root, "versioned_docs", `version-${candidate.contract}`, "img/pricing-ladder.svg");
    assert.equal(hash(readFileSync(releasedDiagram)), hash(readFileSync(latestDiagram)), "release must freeze the reviewed latest diagrams with its docs");
    assert.ok(!filesIn(releaseRoot).some(file => readFileSync(file).includes("autoagentprotocol.invalid")));
    const openapi = parseYaml(readFileSync(join(releaseRoot, "artifacts/openapi-jsonrpc.yaml"), "utf8"));
    const header = openapi.paths["/"].post.parameters.find((parameter: {name: string}) => parameter.name === "A2A-Extensions");
    const extensionUri = `https://autoagentprotocol.org/extensions/aap/${candidate.contract}`;
    assert.ok(new RegExp(header.schema.pattern).test(extensionUri), "released header must accept the pinned extension URI");
    assert.equal(new RegExp(header.schema.pattern).test(extensionUri.replace("autoagentprotocol.", "autoagentprotocolX")), false);
    const releasedDocs = join(context.root, "versioned_docs", `version-${candidate.contract}`);
    for (const file of ["intro.md", "a2a-profile.md", "discovery.md", "bindings/json-rpc.md", "errors.md", "compatibility/mcp.md"]) {
      const editable = readFileSync(join(context.root, "docs", file), "utf8");
      const frozen = readFileSync(join(releasedDocs, file), "utf8");
      assert.match(editable, /aap-draft-only:start/, `${file}: editable scope warning must remain`);
      assert.doesNotMatch(frozen, /aap-draft-only:|Unreleased contract|This editable page describes the planned|draft\.autoagentprotocol\.invalid/, `${file}: draft-only warning leaked into the frozen release`);
      assert.ok(frozen.includes(extensionUri), `${file}: examples must identify the approved release`);
    }
    const binding = readFileSync(join(releasedDocs, "bindings/json-rpc.md"), "utf8");
    assert.ok(binding.includes(":::info A2A v1.0 wire format — the ProtoJSON form"), "unmarked substantive admonitions must not be stripped");
    const discovery = readFileSync(join(releasedDocs, "discovery.md"), "utf8");
    assert.ok(discovery.includes(`https://autoagentprotocol.org/${candidate.contract}/schemas/`), "released schema URLs must be pinned to the approved contract");
    const versioning = readFileSync(join(releasedDocs, "versioning.md"), "utf8");
    const historicalReferences = [...readFileSync(join(context.root, "docs/versioning.md"), "utf8")
      .matchAll(/https:\/\/autoagentprotocol\.org\/(?:v\d+\.\d+\/schemas\/[a-z.-]+|extensions\/aap\/v\d+\.\d+)/g)]
      .map(match => match[0]);
    assert.ok(historicalReferences.length > 0, "historical version references are missing from the audit");
    for (const url of historicalReferences) assert.ok(versioning.includes(url), `historical pinned URL was silently rewritten: ${url}`);
    await checkAllReleases(context.root);
    await assert.rejects(() => prepareRelease(context.root, candidate.version, false), /already exists|immutable/);
    await assert.rejects(() => prepareRelease(context.root, nextRelease(context.root).version, false), /clean working tree/);
  } finally {
    context.cleanup();
  }
});

test("a late release failure restores metadata and removes partial targets", async () => {
  const context = fixture();
  try {
    const candidate = nextRelease(context.root);
    const docs = join(context.root, "docs/intro.md");
    writeFileSync(docs, `${readFileSync(docs, "utf8")}\n![missing release asset](/img/missing-release-asset.png)\n`);
    git(context.root, ["add", "docs/intro.md"]);
    git(context.root, ["commit", "-qm", "fix: simulate release integrity failure"]);
    const before = releaseState(context.root);
    await assert.rejects(() => prepareRelease(context.root, candidate.version, false), /Missing or unsafe released image/);
    assert.equal(releaseState(context.root), before);
    for (const path of [`spec/${candidate.contract}`, `versioned_docs/version-${candidate.contract}`, `versioned_sidebars/version-${candidate.contract}-sidebars.json`, `releases/${candidate.contract}`]) assert.equal(existsSync(join(context.root, path)), false, `${path} must be rolled back`);
  } finally {
    context.cleanup();
  }
});

test("freeze check rejects every mutation class within a baseline release", () => {
  const context = fixture();
  const vehicle = join(context.root, "spec/v1.2/schemas/vehicle.schema.json");
  const original = readFileSync(vehicle);
  // The old public banner URL is still a generated compatibility alias, but
  // production source must not reference it directly (the branding check
  // enforces that). It is nevertheless part of the frozen v1.2 asset tree.
  const branding = join(context.root, "static", "img", "v1.2", ["aap", "hero", "banner.png"].join("-"));
  const originalBranding = readFileSync(branding);
  const added = join(context.root, "spec/v1.2/schemas/not-allowed.schema.json");
  const renamed = join(context.root, "spec/v1.2/schemas/vehicle-renamed.schema.json");
  try {
    writeFileSync(vehicle, Buffer.concat([original, Buffer.from("\n")]));
    assert.throws(() => freezeCheck(context.root, context.base), /immutable/);
    writeFileSync(vehicle, original);

    writeFileSync(added, "{}\n");
    assert.throws(() => freezeCheck(context.root, context.base), /immutable/);
    rmSync(added);

    rmSync(vehicle);
    assert.throws(() => freezeCheck(context.root, context.base), /immutable/);
    mkdirSync(dirname(vehicle), {recursive: true});
    writeFileSync(vehicle, original);

    renameSync(vehicle, renamed);
    assert.throws(() => freezeCheck(context.root, context.base), /immutable/);
    renameSync(renamed, vehicle);

    writeFileSync(branding, Buffer.concat([originalBranding, Buffer.from("\n")]));
    assert.throws(() => freezeCheck(context.root, context.base), /immutable/);
    writeFileSync(branding, originalBranding);

    assert.throws(() => freezeCheck(context.root, "missing-baseline"), /does not resolve/);
    freezeCheck(context.root, context.base);
  } finally {
    context.cleanup();
  }
});
