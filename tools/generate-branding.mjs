import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { icon, wordmark, socialCard } from './branding/artwork.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const check = process.argv.includes('--check');
const artifacts = new Map();
const raster = (source, width) => sharp(Buffer.from(source)).resize({ width }).png().toBuffer();

for (const [suffix, color] of [['', '#2874d7'], ['-white', '#ffffff']]) {
  artifacts.set(`img/brand/aap-symbol${suffix}.svg`, Buffer.from(icon(color)));
  artifacts.set(`img/brand/aap-wordmark${suffix}.svg`, Buffer.from(wordmark(color)));
  artifacts.set(`img/brand/aap-symbol${suffix}.png`, await raster(icon(color), 1024));
  artifacts.set(`img/brand/aap-wordmark${suffix}.png`, await raster(wordmark(color), 2380));
}

artifacts.set('img/brand/aap-social-card.svg', Buffer.from(socialCard()));
artifacts.set('img/brand/aap-social-card.png', await raster(socialCard(), 1200));
// Match the official A2A icon treatment: a snug blue mark directly on a
// transparent canvas, without a surrounding tile or artificial padding.
const favicon = icon();
artifacts.set('img/brand/favicon.svg', Buffer.from(favicon));
artifacts.set('img/brand/apple-touch-icon.png', await raster(favicon, 180));

// ICO with PNG frames: supported by modern browsers and Windows, no ICO-only
// dependency required. Keep small/large frames for non-SVG favicon consumers.
const frames = await Promise.all([16, 32, 48, 256].map(size => raster(favicon, size)));
const directory = Buffer.alloc(6 + frames.length * 16);
directory.writeUInt16LE(1, 2);
directory.writeUInt16LE(frames.length, 4);
let offset = directory.length;
frames.forEach((frame, index) => {
  const size = [16, 32, 48, 256][index];
  const entry = 6 + index * 16;
  directory[entry] = directory[entry + 1] = size === 256 ? 0 : size;
  directory.writeUInt16LE(1, entry + 4);
  directory.writeUInt16LE(32, entry + 6);
  directory.writeUInt32LE(frame.length, entry + 8);
  directory.writeUInt32LE(offset, entry + 12);
  offset += frame.length;
});
artifacts.set('img/brand/favicon.ico', Buffer.concat([directory, ...frames]));

// Preserve existing public asset URLs without retaining obsolete artwork.
artifacts.set('img/logo.png', artifacts.get('img/brand/aap-symbol.png'));
artifacts.set('img/logo-white.png', artifacts.get('img/brand/aap-symbol-white.png'));
artifacts.set('img/favicon.ico', artifacts.get('img/brand/favicon.ico'));
for (const prefix of ['', 'v1.0/', 'v1.1/', 'v1.2/']) {
  artifacts.set(`img/${prefix}aap-hero-banner.png`, artifacts.get('img/brand/aap-social-card.png'));
}

let failed = false;
for (const [relative, content] of artifacts) {
  const destination = path.join(root, 'static', relative);
  if (check) {
    const actual = await fs.readFile(destination).catch(() => null);
    // Compare decoded pixels for PNG: encoder output can differ between OSes.
    let equal = actual?.equals(content) ?? false;
    if (actual && relative.endsWith('.png')) {
      const decode = buffer => sharp(buffer).ensureAlpha().raw().toBuffer({resolveWithObject: true});
      const [a, b] = await Promise.all([decode(actual), decode(content)]);
      const sameSize = a.info.width === b.info.width && a.info.height === b.info.height;
      // The card's supporting text uses system sans-serif; font rasterization
      // differs by OS. Its editable SVG is checked exactly above.
      equal = sameSize && (relative.endsWith('aap-social-card.png') || a.data.equals(b.data));
    }
    if (!equal) { console.error(`Out-of-date branding: static/${relative}`); failed = true; }
  } else {
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, content);
  }
}
if (failed) process.exitCode = 1;
else {
  if (!check) {
    const sha256 = data => createHash('sha256').update(data).digest('hex');
    const sourceFiles = ['tools/branding/artwork.mjs', 'tools/generate-branding.mjs'];
    const sources = Object.fromEntries(await Promise.all(sourceFiles.map(async file => [file, sha256(await fs.readFile(path.join(root, file)))])));
    const files = Object.fromEntries([...artifacts].map(([name, buffer]) => [`static/${name}`, sha256(buffer)]));
    await fs.writeFile(path.join(root, 'tools/branding/assets.json'), `${JSON.stringify({sources, files}, null, 2)}\n`);
  }
  console.log(`${check ? 'Verified' : 'Generated'} ${artifacts.size} branding assets.`);
}
