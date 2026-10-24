import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync } from "node:fs";
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

const searchDirectory = resolve(ROOT, "build/search");
mkdirSync(searchDirectory, { recursive: true });
copyFileSync(resolve(ROOT, "build/search.html"), resolve(searchDirectory, "index.html"));
