import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

function main() {
  const versionsFile = resolve(ROOT, "versions.json");

  if (!existsSync(versionsFile)) {
    console.log("No versions.json found — no frozen versions to check");
    process.exit(0);
  }

  const versions: string[] = JSON.parse(readFileSync(versionsFile, "utf-8"));

  if (versions.length === 0) {
    console.log("No released versions — nothing to freeze-check");
    process.exit(0);
  }

  let errors = 0;

  // Get changed files from git diff (compare against main or HEAD~1)
  let changedFiles: string[] = [];
  try {
    const diff = execSync("git diff --name-only HEAD~1 2>/dev/null || git diff --name-only --cached", {
      cwd: ROOT,
      encoding: "utf-8",
    });
    changedFiles = diff.trim().split("\n").filter(Boolean);
  } catch {
    console.log("Could not determine changed files — skipping freeze check");
    process.exit(0);
  }

  for (const version of versions) {
    const frozenPaths = [
      `spec/${version}/`,
      `versioned_docs/version-${version}/`,
      `versioned_sidebars/version-${version}-sidebars.json`,
    ];

    for (const file of changedFiles) {
      for (const frozenPath of frozenPaths) {
        if (file.startsWith(frozenPath)) {
          console.error(
            `FROZEN: ${file} — version ${version} is released and immutable`
          );
          errors++;
        }
      }
    }
  }

  if (errors > 0) {
    console.error(
      `\n${errors} file(s) in frozen version paths were modified. Released versions are immutable.`
    );
    process.exit(1);
  }

  console.log("Freeze check passed — no released version files modified");
}

main();
