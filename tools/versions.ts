import { loadRegistry } from "./lib/releases.js";

// Creating a folder is not a release. Only reviewed registry entries are public.
export const RELEASES = loadRegistry();
export const ALL_VERSIONS = RELEASES.releases.map(release => release.contract);
export const LATEST = RELEASES.stable;
export const WORKING = "latest";
