import { spawn } from "child_process";
import { existsSync, mkdirSync, readFileSync, mkdtempSync, rmSync, statSync } from "fs";
import { resolve, dirname, basename, join } from "path";
import { tmpdir } from "os";
import { fileURLToPath } from "url";
import { glob } from "glob";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SRC_DIR = resolve(ROOT, "tools/img-src");
const DRAFT_IMG_DIR = "generated/latest/images";

// Existing PNGs are 1× the declared window-size (e.g. 1600×900), not Retina.
const DEVICE_SCALE_FACTOR = "1";
// Chrome often hangs after writing the screenshot (GoogleUpdater). Kill once
// the file is written, or after this budget.
const RENDER_TIMEOUT_MS = 20_000;

function resolveChrome(): string {
  if (process.env.CHROME && existsSync(process.env.CHROME)) {
    return process.env.CHROME;
  }
  const mac = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  if (existsSync(mac)) return mac;
  const chromium = "/Applications/Chromium.app/Contents/MacOS/Chromium";
  if (existsSync(chromium)) return chromium;
  throw new Error(
    "Google Chrome / Chromium not found. Install Chrome or set CHROME=/path/to/chrome"
  );
}

interface ImageJob {
  htmlPath: string;
  targetRel: string;
  width: number;
  height: number;
}

function parseJob(htmlPath: string): ImageJob | null {
  const text = readFileSync(htmlPath, "utf8");
  const commentMatch = text.match(/<!--([\s\S]*?)-->/);
  if (!commentMatch) {
    console.warn(`skip ${basename(htmlPath)}: no leading comment`);
    return null;
  }
  const comment = commentMatch[1];
  const sourceMatch = comment.match(
    /Source for\s+(static\/img\/[^\s]+\.png)/i
  );
  const sizeMatch = comment.match(/--window-size=(\d+),(\d+)/);
  if (!sourceMatch || !sizeMatch) {
    console.warn(
      `skip ${basename(htmlPath)}: comment missing Source for / --window-size`
    );
    return null;
  }
  return {
    htmlPath,
    // Source comments preserve the historical published filename, but image
    // generation must never write into an immutable static/img/v* directory.
    targetRel: `${DRAFT_IMG_DIR}/${basename(sourceMatch[1])}`,
    width: Number(sizeMatch[1]),
    height: Number(sizeMatch[2]),
  };
}

function render(chrome: string, job: ImageJob): Promise<void> {
  const targetAbs = resolve(ROOT, job.targetRel);
  mkdirSync(dirname(targetAbs), { recursive: true });
  const userDataDir = mkdtempSync(join(tmpdir(), "aap-img-"));
  const beforeMtime = existsSync(targetAbs) ? statSync(targetAbs).mtimeMs : 0;

  return new Promise<void>((resolvePromise, reject) => {
    const child = spawn(
      chrome,
      [
        "--headless=new",
        "--disable-gpu",
        "--hide-scrollbars",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-background-networking",
        "--disable-component-update",
        "--disable-default-apps",
        "--disable-extensions",
        "--disable-sync",
        "--disable-translate",
        "--metrics-recording-only",
        "--mute-audio",
        `--user-data-dir=${userDataDir}`,
        `--force-device-scale-factor=${DEVICE_SCALE_FACTOR}`,
        `--window-size=${job.width},${job.height}`,
        `--screenshot=${targetAbs}`,
        `file://${job.htmlPath}`,
      ],
      { stdio: "ignore" }
    );

    let settled = false;
    const finish = (err?: Error) => {
      if (settled) return;
      settled = true;
      clearInterval(poll);
      clearTimeout(timer);
      try {
        child.kill("SIGKILL");
      } catch {
        /* already exited */
      }
      try {
        rmSync(userDataDir, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
      if (err) reject(err);
      else resolvePromise();
    };

    const poll = setInterval(() => {
      if (!existsSync(targetAbs)) return;
      const st = statSync(targetAbs);
      if (st.size > 0 && st.mtimeMs > beforeMtime) {
        // Give Chrome a beat to finish flushing the file.
        setTimeout(() => finish(), 200);
      }
    }, 100);

    const timer = setTimeout(() => {
      if (existsSync(targetAbs) && statSync(targetAbs).size > 0) {
        finish();
      } else {
        finish(
          new Error(
            `timed out rendering ${basename(job.htmlPath)} after ${RENDER_TIMEOUT_MS}ms`
          )
        );
      }
    }, RENDER_TIMEOUT_MS);

    child.on("error", (e) => finish(e));
    child.on("exit", () => {
      if (existsSync(targetAbs) && statSync(targetAbs).size > 0) finish();
    });
  }).then(() => {
    console.log(
      `rendered ${basename(job.htmlPath)} → ${job.targetRel} (${job.width}×${job.height})`
    );
  });
}

async function main() {
  const filter = new Set(
    process.argv.slice(2).map((a) => a.replace(/\.html$/, ""))
  );
  const chrome = resolveChrome();
  console.log(`Chrome: ${chrome}`);
  console.log(`Draft images: ${DRAFT_IMG_DIR}`);

  const files = (await glob("*.html", { cwd: SRC_DIR })).sort();
  let rendered = 0;
  let skipped = 0;

  for (const file of files) {
    const stem = file.replace(/\.html$/, "");
    if (filter.size > 0 && !filter.has(stem)) continue;

    const htmlPath = resolve(SRC_DIR, file);
    const job = parseJob(htmlPath);
    if (!job) {
      skipped++;
      continue;
    }
    await render(chrome, job);
    rendered++;
  }

  console.log(`Done. rendered=${rendered} skipped=${skipped}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
