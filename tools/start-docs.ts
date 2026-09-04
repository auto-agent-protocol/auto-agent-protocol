import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { ROOT } from "./lib/releases.js";

const docusaurus = resolve(ROOT, "node_modules/@docusaurus/core/bin/docusaurus.mjs");
const cleared = spawnSync(process.execPath, [docusaurus, "clear"], {cwd: ROOT, env: process.env, stdio: "inherit"});
if (cleared.error) throw cleared.error;
if (cleared.status !== 0) process.exit(cleared.status ?? 1);
const args = process.argv.slice(2).filter((argument, index) => argument !== "--" || index !== 0);
const result = spawnSync(process.execPath, [docusaurus, "start", ...args], {
  cwd: ROOT,
  env: process.env,
  stdio: "inherit",
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
