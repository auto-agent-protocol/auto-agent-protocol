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

  // Get changed files (with status) from git diff. Compare against HEAD~1; fall
  // back to the staged diff when there is no prior commit.
  let diffLines: string[] = [];
  try {
    const diff = execSync(
      "git diff --name-status HEAD~1 2>/dev/null || git diff --name-status --cached",
      { cwd: ROOT, encoding: "utf-8" }
    );
    diffLines = diff.trim().split("\n").filter(Boolean);
  } catch {
    console.log("Could not determine changed files — skipping freeze check");
    process.exit(0);
  }

  // A released version is immutable once it EXISTS — but the commit that first
  // cuts the version legitimately ADDS its files (e.g. `docusaurus docs:version`
  // writing versioned_docs/version-X, or archiving a current doc into the
  // snapshot). So additions (A), copies (C), and rename DESTINATIONS into a
  // frozen path are allowed; only in-place edits (M/T), deletions (D), and rename
  // SOURCES of already-frozen files violate immutability. For a rename line
  // (`R<sim>\told\tnew`) the guarded path is the original `old` path.
  const guardedPaths: string[] = [];
  for (const line of diffLines) {
    const parts = line.split("\t");
    const code = parts[0][0]; // A | M | D | R | C | T
    if (code === "A" || code === "C") continue;
    if (parts[1]) guardedPaths.push(parts[1]);
  }

  for (const version of versions) {
    const frozenPaths = [
      `spec/${version}/`,
      `versioned_docs/version-${version}/`,
      `versioned_sidebars/version-${version}-sidebars.json`,
    ];

    for (const file of guardedPaths) {
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
