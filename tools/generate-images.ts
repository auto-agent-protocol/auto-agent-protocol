import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { glob } from "glob";
import sharp from "sharp";
import { imageSpecs, usedImageNames, type DiagramItem, type DiagramSpec } from "./image-specs.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = join(ROOT, "docs", "img");
const WIDTH = 1600;
const brandSymbolSource = readFileSync(join(ROOT, "static", "img", "brand", "aap-symbol.svg"), "utf8");
const brandSymbolData = `data:image/svg+xml;base64,${Buffer.from(brandSymbolSource).toString("base64")}`;

const palette = {
  canvas: "#f7fbff",
  surface: "#ffffff",
  mist: "#eaf3ff",
  pale: "#dbeafe",
  line: "#c9dced",
  lineStrong: "#8db8e8",
  blue: "#2874d7",
  blueDark: "#174a8b",
  navy: "#20364f",
  ink: "#102a43",
  muted: "#52657c",
  teal: "#0f766e",
  tealMist: "#e7f7f5",
  white: "#ffffff",
} as const;

const allowedColors = new Set(Object.values(palette).map((color) => color.toLowerCase()));

type Tone = DiagramItem["tone"];
type TextOptions = {
  size?: number;
  weight?: number;
  fill?: string;
  family?: "sans" | "mono";
  anchor?: "start" | "middle" | "end";
  tracking?: number;
};

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function approximateWidth(value: string, size: number, mono = false): number {
  return [...value].reduce((sum, character) => {
    if (character === " ") return sum + size * 0.31;
    if ("ilI.,:;|'".includes(character)) return sum + size * 0.29;
    if ("MW@#%".includes(character)) return sum + size * 0.82;
    return sum + size * (mono ? 0.61 : 0.54);
  }, 0);
}

function fittedSize(value: string, maxWidth: number, preferred: number, minimum: number, mono = false): number {
  let size = preferred;
  while (size > minimum && approximateWidth(value, size, mono) > maxWidth) size -= 1;
  return size;
}

function breakToken(token: string): string[] {
  return token
    .replaceAll("/", "/\u200b")
    .replaceAll(".", ".\u200b")
    .replaceAll("_", "_\u200b")
    .replaceAll("·", "·\u200b")
    .split("\u200b")
    .filter(Boolean);
}

function wrapText(value: string, width: number, size: number, mono = false): string[] {
  const words = value.split(/\s+/).flatMap((word) =>
    approximateWidth(word, size, mono) > width ? breakToken(word) : [word]
  );
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && approximateWidth(candidate, size, mono) > width) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function text(
  value: string,
  x: number,
  y: number,
  maxWidth: number,
  options: TextOptions = {},
): { svg: string; height: number } {
  const size = options.size ?? 24;
  const family = options.family === "mono"
    ? "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    : "Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
  const lineHeight = size * 1.34;
  const lines = wrapText(value, maxWidth, size, options.family === "mono");
  const tspans = lines.map((item, index) =>
    `<tspan x="${x}" dy="${index === 0 ? 0 : lineHeight}">${escapeXml(item)}</tspan>`
  ).join("");
  return {
    svg: `<text x="${x}" y="${y}" font-family="${family}" font-size="${size}" font-weight="${options.weight ?? 400}" fill="${options.fill ?? palette.ink}" text-anchor="${options.anchor ?? "start"}"${options.tracking ? ` letter-spacing="${options.tracking}"` : ""}>${tspans}</text>`,
    height: lines.length * lineHeight,
  };
}

function line(x1: number, y1: number, x2: number, y2: number, color: string = palette.lineStrong): string {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="3" stroke-linecap="round"/>`;
}

function arrow(x1: number, y: number, x2: number): string {
  return `${line(x1, y, x2, y)}<path d="M ${x2 - 12} ${y - 9} L ${x2} ${y} L ${x2 - 12} ${y + 9}" fill="none" stroke="${palette.lineStrong}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function toneColors(tone: Tone): { background: string; border: string; accent: string } {
  if (tone === "primary") return { background: palette.mist, border: palette.lineStrong, accent: palette.blue };
  if (tone === "teal") return { background: palette.tealMist, border: "#7fc8c1", accent: palette.teal };
  if (tone === "navy") return { background: "#eef3f8", border: palette.line, accent: palette.navy };
  return { background: palette.surface, border: palette.line, accent: palette.blueDark };
}

function renderCodeRows(codes: string[], x: number, y: number, width: number, maxBottom: number, compact = false, context = "card"): string {
  const chunks: string[] = [];
  let cursor = y;
  const rowHeight = compact ? 30 : 38;
  const rowStep = compact ? 36 : 48;
  for (const code of codes) {
    if (cursor + rowHeight > maxBottom) throw new Error(`${context}: code content exceeds its card; increase the canvas or simplify the copy`);
    const size = Math.max(12, Math.min(compact ? 15 : 18, width / Math.max(1, approximateWidth(code, 1, true))));
    chunks.push(`<rect x="${x}" y="${cursor}" width="${width}" height="${rowHeight}" rx="9" fill="${palette.canvas}" stroke="${palette.line}"/>`);
    chunks.push(text(code, x + 14, cursor + rowHeight * 0.67, width - 28, { size, family: "mono", fill: palette.blueDark, weight: 600 }).svg);
    cursor += rowStep;
  }
  return chunks.join("");
}

function renderCard(item: DiagramItem, x: number, y: number, width: number, height: number): string {
  const colors = toneColors(item.tone);
  const compact = height < 240;
  const padding = Math.max(24, Math.min(34, width * 0.08));
  const contentWidth = width - padding * 2;
  const chunks = [
    `<g class="diagram-card">`,
    `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="24" fill="${colors.background}" stroke="${colors.border}" stroke-width="2" filter="url(#shadow)"/>`,
    `<rect x="${x}" y="${y + 20}" width="7" height="${Math.max(0, height - 40)}" rx="3.5" fill="${colors.accent}"/>`,
  ];
  let cursor = y + (compact ? 30 : 44);
  if (item.label) {
    chunks.push(text(item.label, x + padding, cursor, contentWidth, { size: compact ? 12 : 15, weight: 800, fill: colors.accent, tracking: 1.8 }).svg);
    cursor += compact ? 28 : 42;
  }
  const titleSize = compact ? 18 : width < 310 ? 23 : width < 380 ? 26 : 29;
  const renderedTitle = text(item.title, x + padding, cursor, contentWidth, { size: titleSize, weight: 750, fill: palette.ink });
  chunks.push(renderedTitle.svg);
  cursor += renderedTitle.height + (compact ? 11 : 20);
  const bodySize = compact ? 14 : width < 310 ? 18 : 20;
  const renderedBody = text(item.body, x + padding, cursor, contentWidth, { size: bodySize, fill: palette.muted });
  chunks.push(renderedBody.svg);
  cursor += renderedBody.height + (compact ? 11 : 22);
  const maxBottom = y + height - (compact ? 16 : 24);
  if (cursor > maxBottom) throw new Error(`${item.title}: text exceeds its card; increase the canvas or simplify the copy`);
  if (item.code?.length) chunks.push(renderCodeRows(item.code, x + padding, cursor, contentWidth, maxBottom, compact, item.title));
  chunks.push("</g>");
  return chunks.join("");
}

function renderMotif(): string {
  // Embed the canonical brand file byte-for-byte. The diagrams must never
  // approximate the protocol identity with a separately drawn mark.
  return `<image href="${brandSymbolData}" x="1406" y="28" width="88" height="88" aria-hidden="true"/>`;
}

function renderFrame(spec: DiagramSpec, content: string): string {
  const height = spec.height ?? 900;
  const titleSize = fittedSize(spec.title, 1260, 42, 30);
  const descriptionSize = fittedSize(spec.description, 1280, 22, 17);
  const footerSize = spec.footer ? fittedSize(spec.footer, 1380, 19, 14) : 19;
  const footer = spec.footer
    ? `<g><rect x="72" y="${height - 86}" width="1456" height="1" fill="${palette.line}"/>${text(spec.footer, 800, height - 43, 1380, { size: footerSize, weight: 600, fill: palette.blueDark, anchor: "middle" }).svg}</g>`
    : "";
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}" role="img" aria-label="${escapeXml(`${spec.title}. ${spec.description}`)}">
  <title>${escapeXml(spec.title)}</title>
  <desc>${escapeXml(spec.description)}</desc>
  <defs>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="${palette.navy}" flood-opacity="0.07"/></filter>
    <linearGradient id="pageWash" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${palette.canvas}"/><stop offset="1" stop-color="${palette.surface}"/></linearGradient>
  </defs>
  <rect width="${WIDTH}" height="${height}" fill="url(#pageWash)"/>
  <circle cx="1550" cy="-30" r="240" fill="${palette.mist}" opacity="0.68"/>
  <circle cx="1510" cy="-60" r="150" fill="${palette.pale}" opacity="0.45"/>
  ${text(spec.eyebrow, 88, 66, 1150, { size: 16, weight: 800, fill: palette.blue, tracking: 2.4 }).svg}
  ${text(spec.title, 88, 123, 1260, { size: titleSize, weight: 780, fill: palette.ink }).svg}
  ${text(spec.description, 88, 180, 1280, { size: descriptionSize, fill: palette.muted }).svg}
  ${renderMotif()}
  ${content}
  ${footer}
</svg>
`;
}

function renderFlow(spec: Extract<DiagramSpec, { kind: "flow" }>): string {
  const height = spec.height ?? 900;
  const count = spec.items.length;
  const gap = 28;
  const left = 76;
  const available = WIDTH - left * 2;
  const cardWidth = (available - gap * (count - 1)) / count;
  const y = 250;
  const cardHeight = height - y - 126;
  return renderFrame(spec, spec.items.map((item, index) => {
    const x = left + index * (cardWidth + gap);
    const connector = index < count - 1 ? arrow(x + cardWidth + 6, y + cardHeight / 2, x + cardWidth + gap - 6) : "";
    return renderCard(item, x, y, cardWidth, cardHeight) + connector;
  }).join(""));
}

function renderGrid(spec: Extract<DiagramSpec, { kind: "grid" }>): string {
  const height = spec.height ?? 900;
  const columns = Math.min(spec.columns ?? 3, spec.items.length);
  const rows = Math.ceil(spec.items.length / columns);
  const gap = 24;
  const left = 76;
  const top = 245;
  const availableWidth = WIDTH - left * 2;
  const availableHeight = height - top - 126;
  const cardWidth = (availableWidth - gap * (columns - 1)) / columns;
  const cardHeight = (availableHeight - gap * (rows - 1)) / rows;
  return renderFrame(spec, spec.items.map((item, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    return renderCard(item, left + column * (cardWidth + gap), top + row * (cardHeight + gap), cardWidth, cardHeight);
  }).join(""));
}

function renderStack(spec: Extract<DiagramSpec, { kind: "stack" }>): string {
  const height = spec.height ?? 900;
  const x = 116;
  const top = 240;
  const gap = 18;
  const width = WIDTH - x * 2;
  const availableHeight = height - top - 122;
  const itemHeight = (availableHeight - gap * (spec.items.length - 1)) / spec.items.length;
  const layers = spec.items.map((item, index) => {
    const y = top + index * (itemHeight + gap);
    const colors = toneColors(item.tone);
    const label = item.label ? text(item.label, x + 34, y + 40, 280, { size: 13, weight: 800, fill: colors.accent, tracking: 1.7 }).svg : "";
    const title = text(item.title, x + 34, y + 78, 300, { size: 24, weight: 750, fill: palette.ink }).svg;
    const body = text(item.body, x + 390, y + 48, 500, { size: 18, fill: palette.muted }).svg;
    const codes = item.code?.length ? renderCodeRows(item.code, x + 930, y + 28, width - 964, y + itemHeight - 20, true, item.title) : "";
    return `<g><rect x="${x}" y="${y}" width="${width}" height="${itemHeight}" rx="24" fill="${colors.background}" stroke="${colors.border}" stroke-width="2" filter="url(#shadow)"/><rect x="${x}" y="${y + 20}" width="7" height="${Math.max(0, itemHeight - 40)}" rx="3.5" fill="${colors.accent}"/>${label}${title}${body}${codes}</g>`;
  }).join("");
  return renderFrame(spec, `${layers}<path d="M 92 270 V ${height - 150}" stroke="${palette.blue}" stroke-width="4" stroke-linecap="round"/>`);
}

function renderNetwork(spec: Extract<DiagramSpec, { kind: "network" }>): string {
  const height = spec.height ?? 900;
  const top = 245;
  const bottom = height - 122;
  const sideWidth = 330;
  const centerWidth = 430;
  const sideX = 80;
  const rightX = WIDTH - 80 - sideWidth;
  const centerX = (WIDTH - centerWidth) / 2;
  const sideGap = 18;
  const sideHeight = (bottom - top - sideGap * 2) / 3;
  const centerY = top + 62;
  const centerHeight = bottom - top - 124;
  const connectors = spec.left.map((_, index) => {
    const y = top + index * (sideHeight + sideGap) + sideHeight / 2;
    return `${line(sideX + sideWidth, y, centerX, centerY + centerHeight / 2, palette.line)}${line(centerX + centerWidth, centerY + centerHeight / 2, rightX, y, palette.line)}`;
  }).join("");
  const leftCards = spec.left.map((item, index) => renderCard(item, sideX, top + index * (sideHeight + sideGap), sideWidth, sideHeight)).join("");
  const rightCards = spec.right.map((item, index) => renderCard(item, rightX, top + index * (sideHeight + sideGap), sideWidth, sideHeight)).join("");
  const center = renderCard(spec.center, centerX, centerY, centerWidth, centerHeight);
  return renderFrame(spec, `${connectors}${leftCards}${rightCards}${center}`);
}

function renderSplit(spec: Extract<DiagramSpec, { kind: "split" }>): string {
  const height = spec.height ?? 900;
  const top = 245;
  const cardHeight = height - top - 126;
  const width = 620;
  const leftX = 82;
  const rightX = WIDTH - leftX - width;
  const centerY = top + cardHeight / 2;
  const bridge = spec.bridge ?? "maps to";
  const bridgeLabel = text(bridge, WIDTH / 2, centerY - 18, 150, { size: 16, weight: 800, fill: palette.blue, anchor: "middle", tracking: 1.1 });
  const connector = `${arrow(leftX + width + 24, centerY, rightX - 24)}<rect x="${WIDTH / 2 - 72}" y="${centerY - 42}" width="144" height="34" rx="17" fill="${palette.surface}" stroke="${palette.line}"/>${bridgeLabel.svg}`;
  return renderFrame(spec, `${connector}${renderCard(spec.left, leftX, top, width, cardHeight)}${renderCard(spec.right, rightX, top, width, cardHeight)}`);
}

function renderCompare(spec: Extract<DiagramSpec, { kind: "compare" }>): string {
  const height = spec.height ?? 900;
  const panelTop = 245;
  const panelHeight = height - panelTop - 126;
  const panelWidth = 700;
  const leftX = 70;
  const rightX = WIDTH - leftX - panelWidth;
  const renderPanel = (items: DiagramItem[], x: number, label: string, accent: string) => {
    const headerHeight = 70;
    const gap = 16;
    const itemHeight = (panelHeight - headerHeight - 24 - gap * (items.length - 1)) / items.length;
    return `<rect x="${x}" y="${panelTop}" width="${panelWidth}" height="${panelHeight}" rx="28" fill="${palette.surface}" stroke="${palette.line}" stroke-width="2"/>
      ${text(label, x + 34, panelTop + 44, panelWidth - 68, { size: 16, weight: 800, fill: accent, tracking: 2 }).svg}
      ${items.map((item, index) => renderCard(item, x + 22, panelTop + headerHeight + index * (itemHeight + gap), panelWidth - 44, itemHeight)).join("")}`;
  };
  return renderFrame(spec, `${renderPanel(spec.before, leftX, "BEFORE", palette.muted)}${renderPanel(spec.after, rightX, "AFTER", palette.blue)}${arrow(leftX + panelWidth + 14, panelTop + panelHeight / 2, rightX - 14)}`);
}

function renderTimeline(spec: Extract<DiagramSpec, { kind: "timeline" }>): string {
  const height = spec.height ?? 900;
  const count = spec.items.length;
  const left = 82;
  const right = WIDTH - 82;
  const lineY = 338;
  const spacing = (right - left) / (count - 1);
  const cardWidth = 330;
  const cardHeight = height - 430 - 126;
  const track = `${line(left, lineY, right, lineY, palette.lineStrong)}${spec.items.map((_, index) => `<circle cx="${left + index * spacing}" cy="${lineY}" r="12" fill="${palette.surface}" stroke="${palette.blue}" stroke-width="5"/>`).join("")}`;
  const cards = spec.items.map((item, index) => {
    const center = left + index * spacing;
    return renderCard(item, Math.max(55, Math.min(WIDTH - 55 - cardWidth, center - cardWidth / 2)), 405, cardWidth, cardHeight);
  }).join("");
  return renderFrame(spec, `${track}${cards}`);
}

function renderPricing(spec: Extract<DiagramSpec, { kind: "pricing" }>): string {
  const height = spec.height ?? 900;
  const left = 60;
  const gap = 22;
  const cardWidth = (WIDTH - left * 2 - gap * 3) / 4;
  const top = 250;
  const cardHeight = height - top - 126;
  // MSRP is a reference price, not an input to the advertised-price equation.
  // The actual relationship is list_price + fees = price.
  const operators = ["", "→", "+", "="];
  return renderFrame(spec, spec.items.map((item, index) => {
    const x = left + index * (cardWidth + gap);
    const operator = index > 0
      ? `<circle cx="${x - gap / 2}" cy="${top + cardHeight / 2}" r="22" fill="${palette.surface}" stroke="${palette.lineStrong}" stroke-width="2"/>${text(operators[index], x - gap / 2, top + cardHeight / 2 + 8, 35, { size: 25, weight: 800, fill: palette.blue, anchor: "middle" }).svg}`
      : "";
    return operator + renderCard(item, x, top, cardWidth, cardHeight);
  }).join(""));
}

export function renderDiagram(spec: DiagramSpec): string {
  switch (spec.kind) {
    case "flow": return renderFlow(spec);
    case "grid": return renderGrid(spec);
    case "stack": return renderStack(spec);
    case "network": return renderNetwork(spec);
    case "split": return renderSplit(spec);
    case "compare": return renderCompare(spec);
    case "timeline": return renderTimeline(spec);
    case "pricing": return renderPricing(spec);
  }
}

function expectedImages(): Map<string, string> {
  return new Map(usedImageNames.map((name) => [`${name}.svg`, renderDiagram(imageSpecs[name])]));
}

function currentImageReferences(): string[] {
  const files = ["README.md", ...glob.sync("docs/**/*.{md,mdx}", { cwd: ROOT }), ...glob.sync("src/**/*.{ts,tsx,css}", { cwd: ROOT })];
  return files.flatMap((file) => {
    const source = readFileSync(join(ROOT, file), "utf8");
    return [...source.matchAll(/(?:docs\/img\/|\.\.\/img\/|\.\/img\/)([a-z0-9-]+\.svg)/g)].map((match) => match[1]);
  });
}

async function validateSvg(name: string, source: string): Promise<void> {
  if (/FTC-final|out-the-door/i.test(source)) throw new Error(`${name}: obsolete pricing language`);
  for (const match of source.matchAll(/#[0-9a-f]{6}/gi)) {
    if (!allowedColors.has(match[0].toLowerCase()) && match[0].toLowerCase() !== "#7fc8c1" && match[0].toLowerCase() !== "#eef3f8") {
      throw new Error(`${name}: color ${match[0]} is outside the AAP diagram palette`);
    }
  }
  const metadata = await sharp(Buffer.from(source)).metadata();
  if (metadata.format !== "svg" || metadata.width !== WIDTH || !metadata.height) throw new Error(`${name}: invalid SVG dimensions`);
  if (!source.includes('role="img"') || !source.includes('aria-label="') || !source.includes("<title") || !source.includes("<desc")) throw new Error(`${name}: missing accessible SVG metadata`);
  if (!source.includes(brandSymbolData)) throw new Error(`${name}: does not embed the canonical AAP symbol exactly`);
}

async function check(): Promise<void> {
  const expected = expectedImages();
  const actualNames = existsSync(OUTPUT_DIR) ? readdirSync(OUTPUT_DIR).filter((name) => name.endsWith(".svg")).sort() : [];
  if (JSON.stringify(actualNames) !== JSON.stringify([...expected.keys()].sort())) {
    throw new Error(`docs/img is stale: expected ${expected.size} generated SVGs, found ${actualNames.length}. Run pnpm generate:images.`);
  }
  for (const [name, source] of expected) {
    await validateSvg(name, source);
    const file = join(OUTPUT_DIR, name);
    if (readFileSync(file, "utf8") !== source) throw new Error(`${relative(ROOT, file)} is stale. Run pnpm generate:images.`);
  }
  const references = currentImageReferences().sort();
  const uniqueReferences = [...new Set(references)];
  const missingReferences = [...expected.keys()].filter((name) => !uniqueReferences.includes(name));
  if (missingReferences.length) throw new Error(`Generated diagrams are not used: ${missingReferences.join(", ")}`);
  const currentFiles = ["README.md", ...glob.sync("docs/**/*.{md,mdx}", { cwd: ROOT }), ...glob.sync("src/**/*.{ts,tsx}", { cwd: ROOT })];
  for (const file of currentFiles) {
    const source = readFileSync(join(ROOT, file), "utf8");
    if (/static\/img\/v\d|\/img\/v\d/.test(source)) throw new Error(`${file}: current content must not reuse frozen version artwork`);
  }
  console.log(`Image check passed: ${expected.size} SVGs, one palette, all referenced.`);
}

async function generate(): Promise<void> {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const expected = expectedImages();
  for (const [name, source] of expected) {
    await validateSvg(name, source);
    writeFileSync(join(OUTPUT_DIR, name), source);
    console.log(`generated docs/img/${name}`);
  }
  for (const name of readdirSync(OUTPUT_DIR)) {
    if (name.endsWith(".svg") && !expected.has(name)) throw new Error(`Unexpected unmanaged SVG in docs/img: ${name}`);
  }
  console.log(`Done. generated=${expected.size}`);
}

const shouldCheck = process.argv.includes("--check");
(shouldCheck ? check() : generate()).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
