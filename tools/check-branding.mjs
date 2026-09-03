import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../', import.meta.url));
const sha256 = data => createHash('sha256').update(data).digest('hex');
const manifest = JSON.parse(await fs.readFile(path.join(root, 'tools/branding/assets.json'), 'utf8'));
// Hashes record removed artwork, not copies of the old images. Scan content,
// not filenames, to catch accidental reintroduction under a different name.
const retired = new Set([
  '45701c855a313c8c783d0f8e0aba00932036c59aee11f6b698684eb108a1ac63',
  'c9b148de1ca3dcb0bdf8ece658558cff3ea89328a7a81e2f681a7edce520cde5',
  '369d360216c7087f62311b4e8fd6a182406b7c5234ab912f88b7bd76337a7d08',
  '7e8f11cc519f5b2d6c0332f8c74ebf77c24fd50247dd6e08d5d90c970790aeac',
  '71ff174e88bd3304f983417fb07df9374d87caba00b5f376ac27eb683ed8b975',
]);

for (const [file, expected] of Object.entries({...manifest.sources, ...manifest.files})) {
  const content = await fs.readFile(path.join(root, file));
  assert.equal(sha256(content), expected, `${file}: run pnpm generate:branding and review the exports`);
}
const managed = (await fs.readdir(path.join(root, 'static/img/brand'))).map(file => `static/img/brand/${file}`).sort();
assert.deepEqual(managed, Object.keys(manifest.files).filter(file => file.startsWith('static/img/brand/')).sort(), 'Unexpected or missing brand assets');

async function assertTransparentCanvas(content, file) {
  const {data, info} = await sharp(content).ensureAlpha().raw().toBuffer({resolveWithObject: true});
  const alphaAt = (x, y) => data[(y * info.width + x) * info.channels + 3];
  const lastX = info.width - 1, lastY = info.height - 1;
  for (const [x, y] of [[0, 0], [lastX, 0], [0, lastY], [lastX, lastY], [Math.floor(lastX / 2), 0], [lastX, Math.floor(lastY / 2)], [Math.floor(lastX / 2), lastY], [0, Math.floor(lastY / 2)]]) {
    // The 16 px rasterizer can leave a negligible 1–3/255 antialias trace at
    // an extreme corner; an opaque or translucent background still fails.
    assert.ok(alphaAt(x, y) <= 4, `${file}: canvas edge (${x}, ${y}) must be transparent`);
  }
  let transparentPixels = 0;
  for (let index = 3; index < data.length; index += info.channels) if (data[index] === 0) transparentPixels++;
  assert.ok(transparentPixels / (info.width * info.height) > 0.25, `${file}: transparent canvas area is unexpectedly small`);
  assert.ok(data.some((value, index) => index % info.channels === 3 && value > 0), `${file}: no visible pixels`);
}

for (const [file, dimensions] of Object.entries({
  'aap-symbol.png': [1024, 1024],
  'aap-symbol-white.png': [1024, 1024],
  'aap-wordmark.png': [2380, 400],
  'aap-wordmark-white.png': [2380, 400],
  'apple-touch-icon.png': [180, 180],
  'aap-social-card.png': [1200, 630],
})) {
  const png = await fs.readFile(path.join(root, 'static/img/brand', file));
  assert.equal(png.subarray(1, 4).toString(), 'PNG', `${file}: not a PNG`);
  assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], dimensions, `${file}: incorrect dimensions`);
  if (file !== 'aap-social-card.png') {
    assert.equal(png[25], 6, `${file}: expected RGBA transparency`);
    await assertTransparentCanvas(png, file);
  }
}

const faviconSvg = await fs.readFile(path.join(root, 'static/img/brand/favicon.svg'), 'utf8');
assert.ok(!/<rect\b/i.test(faviconSvg), 'favicon.svg: background rectangle is not allowed');

const ico = await fs.readFile(path.join(root, 'static/img/brand/favicon.ico'));
assert.equal(ico.readUInt16LE(2), 1);
assert.equal(ico.readUInt16LE(4), 4);
for (const [index, size] of [16, 32, 48, 256].entries()) {
  const entry = 6 + index * 16;
  assert.equal(ico[entry] || 256, size);
  assert.equal(ico[entry + 1] || 256, size);
  const offset = ico.readUInt32LE(entry + 12);
  const length = ico.readUInt32LE(entry + 8);
  assert.ok(offset + length <= ico.length);
  assert.equal(ico.readUInt32BE(offset + 16), size);
  assert.equal(ico.readUInt32BE(offset + 20), size);
  await assertTransparentCanvas(ico.subarray(offset, offset + length), `favicon.ico ${size}x${size} frame`);
}

const tracked = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], {cwd: root}).toString().split('\0').filter(Boolean);
const images = tracked.filter(file => /\.(?:png|svg|ico|jpe?g|gif|webp|avif)$/i.test(file));
for (const file of images) {
  const data = await fs.readFile(path.join(root, file)).catch(error => {
    if (error.code === 'ENOENT') return null; // unstaged, intentional deletion
    throw error;
  });
  if (data) assert.ok(!retired.has(sha256(data)), `Retired logo found in ${file}`);
}

const sourceFiles = tracked.filter(file => /\.(?:tsx?|css|mdx?|html)$/.test(file) && !file.startsWith('static/'));
for (const file of sourceFiles) {
  const content = await fs.readFile(path.join(root, file), 'utf8').catch(error => {
    if (error.code === 'ENOENT') return '';
    throw error;
  });
  assert.ok(!/img\/(?:logo(?:-white)?\.png|favicon\.ico|hero\.png|(?:v[\d.]+\/)?aap-hero-banner\.png)/.test(content), `Legacy brand reference in ${file}`);
}

if (process.argv.includes('--build')) {
  for (const [file, expected] of Object.entries(manifest.files)) {
    const built = path.join(root, 'build', file.replace(/^static\//, ''));
    assert.equal(sha256(await fs.readFile(built)), expected, `Stale or missing built asset: ${built}`);
  }
  const walk = async directory => (await Promise.all((await fs.readdir(directory, {withFileTypes: true})).map(async entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  }))).flat();
  const builtFiles = await walk(path.join(root, 'build'));
  let pages = 0;
  for (const file of builtFiles) {
    const content = await fs.readFile(file);
    assert.ok(!retired.has(sha256(content)), `Retired logo in build: ${file}`);
    if (file.endsWith('.html') && content.includes(Buffer.from('navbar__brand'))) {
      const html = content.toString();
      for (const asset of ['aap-wordmark.svg', 'aap-wordmark-white.svg', 'aap-social-card.png', 'favicon.ico']) {
        assert.ok(html.includes(`/img/brand/${asset}`), `${file}: missing ${asset}`);
      }
      assert.ok(!/\/img\/(?:logo(?:-white)?\.png|favicon\.ico|hero\.png|(?:v[\d.]+\/)?aap-hero-banner\.png)/.test(html), `Legacy brand reference in ${file}`);
      pages++;
    }
  }
  assert.ok(pages > 0, 'No branded pages were found in build');
  const archivedVersions = JSON.parse(await fs.readFile(path.join(root, 'versions.json'), 'utf8'));
  for (const version of archivedVersions) {
    assert.ok(builtFiles.some(file => file.includes(`/docs/${version}/`) && file.endsWith('.html')), `Missing archived docs: ${version}`);
  }
  console.log(`Verified shared branding on ${pages} built pages; no retired artwork in build.`);
}
console.log(`Branding valid: ${Object.keys(manifest.files).length} exports; ${images.length} repository images scanned.`);
