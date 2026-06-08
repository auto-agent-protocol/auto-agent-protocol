import { readdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Every spec version, derived from the spec/v*/ directories — the single source
// of truth. Adding a version is `mkdir spec/vX.Y`; nothing else needs editing.
// Sorted ascending by (major, minor) so the highest is last and v0.10 sorts
// after v0.2 (a plain string sort would get that wrong).
export const ALL_VERSIONS: string[] = readdirSync(resolve(ROOT, "spec"))
  .filter((dir) => /^v\d+\.\d+$/.test(dir))
  .sort((a, b) => {
    const [aMajor, aMinor] = a.slice(1).split(".").map(Number);
    const [bMajor, bMinor] = b.slice(1).split(".").map(Number);
    return aMajor - bMajor || aMinor - bMinor;
  });

// The highest version — the one the npm packages and the /latest mirror ship.
export const LATEST: string = ALL_VERSIONS[ALL_VERSIONS.length - 1];
