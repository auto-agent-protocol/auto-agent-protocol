import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { ROOT } from "./lib/releases.js";

execFileSync(
  process.execPath,
  [resolve(ROOT, "node_modules/@docusaurus/core/bin/docusaurus.mjs"), "build"],
  {
    cwd: ROOT,
    env: { ...process.env, WEBPACK_URL_LOADER_LIMIT: "0" },
    stdio: "inherit",
  },
);
