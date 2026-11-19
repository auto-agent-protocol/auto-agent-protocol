import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { glob } from "glob";
import sharp from "sharp";
import { imageSpecs, usedImageNames, type DiagramName } from "./image-specs.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = join(ROOT, "docs/img");
const WIDTH = 1200;
const HEIGHT = 760;
const brandSymbolData = `data:image/svg+xml;base64,${Buffer.from(readFileSync(join(ROOT, "static/img/brand/aap-symbol.svg"), "utf8")).toString("base64")}`;
const C = {
  paper: "#ffffff", canvas: "#f5f7fb", ink: "#12213a", muted: "#52627a", line: "#d8e1ed",
  blue: "#2874d7", blueDark: "#1855a6", blueTint: "#eaf2ff", teal: "#087d70", tealTint: "#e6f5f1",
  amber: "#93600b", amberTint: "#fff4dc", violet: "#6b4bb6", violetTint: "#f0ebfa",
} as const;
const palette = new Set<string>(Object.values(C));
const paths = {
  agent: '<rect x="4" y="6" width="16" height="14" rx="4"/><path d="M12 2v4M8 11h.01M16 11h.01M8 16h8M1 11v4M23 11v4"/>',
  dealer: '<path d="M3 10h18v11H3zM2 10l3-7h14l3 7M8 21v-7h8v7M7 3l-1 7M17 3l1 7"/>',
  search: '<circle cx="10" cy="10" r="7"/><path d="m15 15 7 7M7 10h6M10 7v6"/>',
  filter: '<path d="M3 5h18M6 12h12M10 19h4"/><circle cx="8" cy="5" r="2"/><circle cx="16" cy="12" r="2"/>',
  car: '<path d="m3 11 3-7h12l3 7v8H3zM3 11h18M7 4l-1 7M17 4l1 7M6 15h2M16 15h2M6 19v3M18 19v3"/>',
  motorcycle: '<circle cx="5" cy="17" r="4"/><circle cx="19" cy="17" r="4"/><path d="m5 17 5-8h7l2 8M11 17H5M10 9l3 8h6M17 9l-2-6h-3M7 7h5"/>',
  bolt: '<path d="m13 2-9 12h7l-1 8 10-13h-7z"/>',
  lead: '<rect x="2" y="5" width="20" height="15" rx="3"/><path d="m3 7 9 7 9-7"/>',
  check: '<path d="m5 12 4 4L20 5"/>',
  shield: '<path d="M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6zM7 12l3 3 7-7"/>',
  lock: '<rect x="4" y="10" width="16" height="12" rx="3"/><path d="M8 10V6a4 4 0 0 1 8 0v4M12 15v3"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  document: '<path d="M5 2h9l5 5v15H5zM14 2v6h5M8 12h8M8 16h8"/>',
  code: '<path d="m7 6-6 6 6 6M17 6l6 6-6 6M14 3l-4 18"/>',
  link: '<path d="m9 15 6-6M8 16l-2 2a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0M16 8l2-2a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0" transform="translate(0 -1) scale(.92)"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
  tools: '<path d="M14 3a6 6 0 0 0-7 8L2 18a3 3 0 0 0 4 4l7-6a6 6 0 0 0 8-7l-5 3-4-4z"/>',
  layers: '<path d="m12 2 11 6-11 6L1 8zM2 13l10 6 10-6M2 18l10 6 10-6"/>',
  globe: '<circle cx="12" cy="12" r="10"/><ellipse cx="12" cy="12" rx="4" ry="10"/><path d="M2 12h20"/>',
  database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 4 18 4 18 0V5M3 12c0 4 18 4 18 0"/>',
  key: '<circle cx="8" cy="8" r="6"/><path d="m12 12 10 10M17 17l3-3M20 20l3-3"/>',
  unknown: '<circle cx="12" cy="12" r="9"/><path d="M9 8a3 3 0 1 1 4 3l-1 1v2M12 18h.01"/>',
  cross: '<path d="m6 6 12 12M6 18 18 6"/>',
  person: '<circle cx="12" cy="7" r="4.5"/><path d="M3.5 22a8.5 8.5 0 0 1 17 0"/>',
} as const;
type Icon = keyof typeof paths;

function xml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
function widthOf(value: string, size: number, mono = false): number {
  return [...value].reduce((sum, char) => sum + size * (mono ? .61 : "ilI.,:;|' ".includes(char) ? .29 : "MW@%".includes(char) ? .86 : .55), 0);
}
function label(value: string, x: number, y: number, width = 1104, size = 24, color: string = C.ink, weight = 500, mono = false, anchor = "start"): string {
  if (widthOf(value, size, mono) > width) throw new Error(`Text does not fit: ${value} (${width}px at ${size}px)`);
  return `<text x="${x}" y="${y}" font-family="${mono ? "DejaVu Sans Mono, monospace" : "DejaVu Sans, Arial, sans-serif"}" font-size="${size}" font-weight="${weight}" fill="${color}" text-anchor="${anchor}" data-max-width="${width}">${xml(value)}</text>`;
}
function lines(values: string[], x: number, y: number, width: number, size = 22, color: string = C.muted, mono = false): string {
  return values.map((value, i) => label(value, x, y + i * (size * 1.45), width, size, color, 400, mono)).join("");
}
function centered(values: string[], x: number, y: number, width: number, size = 22, color: string = C.muted, mono = false): string {
  return lines(values, x, y, width, size, color, mono).replaceAll('text-anchor="start"', 'text-anchor="middle"');
}
function rect(x: number, y: number, width: number, height: number, fill: string = C.paper, border: string = C.line, radius = 20): string {
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" fill="${fill}" stroke="${border}" stroke-width="2"/>`;
}
function line(x1: number, y1: number, x2: number, y2: number, color: string = C.line, dash = false): string {
  return `<path d="M${x1} ${y1}L${x2} ${y2}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round"${dash ? ' stroke-dasharray="8 9"' : ""}/>`;
}
function arrow(x1: number, y1: number, x2: number, y2 = y1, color: string = C.blue): string {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const tip = [Math.cos(angle), Math.sin(angle)];
  const points = [[x2 - tip[0] * 10 - tip[1] * 6, y2 - tip[1] * 10 + tip[0] * 6], [x2, y2], [x2 - tip[0] * 10 + tip[1] * 6, y2 - tip[1] * 10 - tip[0] * 6]];
  return `${line(x1, y1, x2, y2, color)}<polyline points="${points.map(p => p.join(",")).join(" ")}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
}
function curve(x1: number, y1: number, x2: number, y2: number, color: string = C.line): string {
  const mid = (x1 + x2) / 2;
  return `<path d="M${x1} ${y1}C${mid} ${y1} ${mid} ${y2} ${x2} ${y2}" fill="none" stroke="${color}" stroke-width="3"/>`;
}
function icon(name: Icon, x: number, y: number, size = 48, color: string = C.blue): string {
  return `<g transform="translate(${x} ${y}) scale(${size / 24})" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</g>`;
}
function pill(value: string, x: number, y: number, width: number, color: string = C.blueDark, fill: string = C.blueTint, size = 18): string {
  return `${rect(x, y, width, 36, fill, fill, 18)}${label(value, x + width / 2, y + 24, width - 24, size, color, 600, false, "middle")}`;
}
function tile(title: string, detail: string, name: Icon, x: number, y: number, width: number, color: string = C.blue): string {
  return rect(x, y, width, 96) + icon(name, x + 20, y + 23, 44, color) + label(title, x + 82, y + 39, width - 100, 25, C.ink, 650) + label(detail, x + 82, y + 69, width - 100, 18, C.muted);
}
function brand(x: number, y: number, size: number): string {
  return `<image href="${brandSymbolData}" x="${x}" y="${y}" width="${size}" height="${size}"/>`;
}
type Step = { title: string; icon: Icon; detail: string[]; tag: string };
function flow(steps: Step[]): string {
  const gap = 30, width = (1104 - gap * (steps.length - 1)) / steps.length;
  return steps.map((step, i) => {
    const x = 48 + i * (width + gap), y = 235;
    return (i ? arrow(x - gap + 6, 385, x - 6) : "") + rect(x, y, width, 304)
      + icon(step.icon, x + 24, y + 30, 58, i === steps.length - 1 ? C.teal : C.blue)
      + label(String(i + 1).padStart(2, "0"), x + width - 24, y + 51, 60, 18, C.muted, 500, true, "end")
      + label(step.title, x + 24, y + 137, width - 48, 27, C.ink, 650)
      + lines(step.detail, x + 24, y + 179, width - 48, 20)
      + pill(step.tag, x + 24, y + 245, width - 48, i === steps.length - 1 ? C.teal : C.blueDark, i === steps.length - 1 ? C.tealTint : C.blueTint, 17);
  }).join("");
}

function renderVisual(name: DiagramName): string {
  switch (name) {
    case "network-overview": {
      const rows = [230, 360, 490];
      return rows.map(y => curve(334, y + 48, 465, 407)).join("") + rows.map(y => curve(735, 407, 866, y + 48)).join("")
        + tile("MCP", "Native tools", "tools", 48, rows[0], 286)
        + tile("A2A", "Typed messages", "agent", 48, rows[1], 286)
        + tile("PAP", "Personal agents", "key", 48, rows[2], 286)
        + rect(465, 282, 270, 250, C.blueTint, C.blue)
        + brand(558, 308, 84) + label("AAP", 600, 440, 200, 44, C.ink, 700, false, "middle")
        + label("Automotive contract", 600, 484, 250, 20, C.blueDark, 500, false, "middle")
        + tile("Dealer A", "Its live inventory", "dealer", 866, rows[0], 286)
        + tile("Dealer B", "Its capabilities", "dealer", 866, rows[1], 286)
        + tile("Dealer C", "Its lead destination", "dealer", 866, rows[2], 286);
    }
    case "dealer-onboarding": return flow([
      { title: "Publish", icon: "globe", detail: ["Dealer-domain", "discovery links"], tag: "Identity" },
      { title: "Connect", icon: "link", detail: ["MCP · A2A · PAP", "One skill contract"], tag: "Interfaces" },
      { title: "Verify", icon: "shield", detail: ["Real requests", "Honest capabilities"], tag: "Behavior" },
      { title: "Go live", icon: "dealer", detail: ["Current inventory", "Consented inquiries"], tag: "Working service" },
    ]);
    case "buyer-journey": return flow([
      { title: "Discover", icon: "globe", detail: ["Find the dealer", "Read capabilities"], tag: "Dealer domain" },
      { title: "Compare", icon: "search", detail: ["Apply constraints", "Follow every page"], tag: "inventory_search" },
      { title: "Verify", icon: "car", detail: ["Check evidence", "Read current status"], tag: "inventory_vehicle" },
      { title: "Ask", icon: "lead", detail: ["Approve the inquiry", "Choose channels"], tag: "lead_submit" },
    ]);
    case "agent-etiquette": return flow([
      { title: "Discover", icon: "filter", detail: ["Use advertised", "filters and skills"], tag: "Capabilities" },
      { title: "Ground", icon: "document", detail: ["Show equipment", "source evidence"], tag: "Facts" },
      { title: "Confirm", icon: "shield", detail: ["Approve the inquiry", "Choose channels"], tag: "Consent" },
      { title: "Report", icon: "check", detail: ["Read the actual", "business outcome"], tag: "Truthful status" },
    ]);
    case "versioning-timeline": return flow([
      { title: "Edit", icon: "code", detail: ["spec/latest", "Editable sources"], tag: "Draft" },
      { title: "Review", icon: "shield", detail: ["Schema + behavior", "Client interop"], tag: "Verified candidate" },
      { title: "Freeze", icon: "lock", detail: ["Pinned identifiers", "Immutable artifacts"], tag: "New release" },
      { title: "Migrate", icon: "link", detail: ["Verify deployment", "Switch discovery"], tag: "Explicit adoption" },
    ]);
    case "skills-overview": {
      const skills: [Icon, string, string, string][] = [["dealer", "Dealer", "information", "Know the location"], ["filter", "Inventory", "facets", "Learn the vocabulary"], ["search", "Inventory", "search", "Find matching listings"], ["car", "Inventory", "vehicle", "Inspect the evidence"], ["lead", "Lead", "submit", "Send with consent"]];
      return line(146, 300, 1054, 300) + skills.map(([glyph, title, operation, detail], i) => {
        const x = 48 + i * 226;
        return rect(x, 220, 200, 310, i === 4 ? C.tealTint : C.paper)
          + icon(glyph, x + 65, 257, 70, i === 4 ? C.teal : C.blue)
          + label(title, x + 100, 390, 176, 27, C.ink, 650, false, "middle")
          + label(operation, x + 100, 429, 180, 23, i === 4 ? C.teal : C.blueDark, 500, true, "middle")
          + label(detail, x + 100, 488, 182, 16, C.muted, 400, false, "middle");
      }).join("") + pill("Read without shopper contact details", 48, 568, 878) + pill("Explicit consent", 952, 568, 200, C.teal, C.tealTint, 17);
    }
    case "architecture-stack": return rect(48, 202, 1104, 148, C.blueTint, C.blue)
      + brand(80, 234, 80) + label("AAP automotive contract", 194, 260, 900, 35, C.ink, 700)
      + label("Skills · vehicle facts · pricing · evidence · consent · outcomes", 194, 310, 900, 25, C.blueDark)
      + ["MCP tools", "A2A DataParts", "PAP OpenAPI"].map((v, i) => rect(48 + i * 378, 388, 348, 86) + label(v, 222 + i * 378, 440, 300, 28, C.ink, 650, false, "middle") + arrow(222 + i * 378, 350, 222 + i * 378, 384)).join("")
      + [222, 600, 978].map(x => arrow(x, 478, x, 516)).join("")
      + rect(48, 520, 1104, 92, C.ink, C.ink) + icon("database", 80, 542, 48, C.paper)
      + label("Dealer inventory and CRM", 164, 577, 930, 30, C.paper, 600);
    case "why-before-after": {
      const ys = [284, 404, 524];
      return rect(48, 204, 530, 406) + rect(608, 204, 544, 406, C.blueTint)
        + label("Custom mappings", 80, 248, 450, 26, C.muted, 650) + label("Shared automotive contract", 640, 248, 480, 26, C.blueDark, 650)
        + ys.flatMap(y => ys.map(z => line(158, y + 30, 470, z + 30))).join("")
        + ys.map(y => icon("agent", 88, y, 60) + icon("dealer", 480, y, 60)).join("")
        + ys.map(y => curve(716, y + 30, 832, 434, C.blue) + curve(930, 434, 1046, y + 30, C.blue)).join("")
        + ys.map(y => icon("agent", 650, y, 60) + icon("dealer", 1054, y, 60)).join("")
        + rect(812, 366, 136, 136, C.paper, C.blue, 32) + brand(842, 385, 76)
        + label("AAP", 880, 486, 104, 23, C.blueDark, 700, false, "middle");
    }
    case "agent-card-passport": {
      const rows: [string, string][] = [["Identity", "name · provider · version"], ["A2A interface", "JSONRPC · protocolVersion 1.0"], ["AAP extension", "required URI · params.version"], ["Working capabilities", "skills · filters · MCP · PAP · llms.txt"]];
      return rect(48, 202, 1104, 414) + icon("document", 78, 227, 40) + label("/.well-known/agent-card.json", 140, 256, 950, 27, C.blueDark, 600, true)
        + rows.map(([key, value], i) => {
          const y = 290 + i * 76;
          return rect(72, y, 1056, 62, i === 2 ? C.blueTint : C.canvas, i === 2 ? C.blueTint : C.canvas, 12)
            + label(key, 94, y + 39, 310, 23, C.ink, 650) + label(value, 426, y + 39, 676, 21, C.muted, 400, true);
        }).join("");
    }
    case "datapart-anatomy": return rect(48, 204, 1104, 410)
      + label("A2A Message", 80, 250, 1000, 28, C.ink, 650)
      + label("messageId  ·  role: ROLE_USER  ·  parts[]", 80, 291, 1000, 24, C.muted, 400, true)
      + rect(106, 322, 996, 246, C.blueTint, C.blue)
      + label("DataPart", 140, 366, 900, 27, C.blueDark, 650)
      + rect(164, 396, 884, 126)
      + label('data: { type: "inventory_search_request",', 192, 439, 828, 24, C.ink, 500, true)
      + label('        filters: { make: ["Toyota"] } }', 192, 483, 828, 24, C.ink, 500, true);
    case "jsonrpc-envelope": return pill("A2A-Version: 1.0", 48, 197, 282, C.blueDark, C.blueTint, 22)
      + pill("A2A-Extensions: <exact contract URI>", 354, 197, 798, C.blueDark, C.blueTint, 22)
      + rect(48, 260, 1104, 354) + label('JSON-RPC 2.0  ·  method: "SendMessage"  ·  id', 80, 307, 1040, 25, C.ink, 600, true)
      + rect(106, 338, 992, 230, C.canvas, C.line) + label("params.message", 138, 382, 928, 24, C.muted, 500, true)
      + rect(164, 413, 876, 108, C.blueTint, C.blue)
      + label('parts[0].data.type: "inventory_search_request"', 192, 477, 820, 23, C.blueDark, 600, true);
    case "discovery-flow": {
      const rows = [294, 396, 498];
      return rect(48, 202, 652, 414) + rect(48, 202, 652, 62, C.canvas, C.line)
        + icon("lock", 72, 220, 26, C.muted) + label("dealer.example", 118, 242, 540, 24, C.ink, 600, true)
        + ["/.well-known/agent-card.json", "/.well-known/poppy.json", "/llms.txt"].map((v, i) => rect(74, rows[i], 600, 76) + icon("document", 94, rows[i] + 20, 36) + label(v, 148, rows[i] + 46, 496, 24, C.blueDark, 500, true)).join("")
        + rows.map(y => curve(700, y + 38, 828, 407)).join("")
        + rect(828, 258, 324, 298, C.blueTint, C.blue)
        + label("Working endpoints", 990, 306, 290, 25, C.ink, 650, false, "middle")
        + ["MCP", "A2A", "PAP OpenAPI"].map((v, i) => pill(v, 856, 334 + i * 62, 268, C.blueDark, C.paper, 24)).join("");
    }
    case "poppy-discovery": return rect(48, 192, 1104, 60, C.ink, C.ink)
      + label('extensions: { "autoagentprotocol.org/aap": [{ "version": "1", … }] }', 600, 230, 1060, 20, C.paper, 500, true, "middle")
      + rect(48, 272, 530, 276)
      + pill("AAP extension entry", 76, 296, 474, C.blueDark, C.blueTint, 24)
      + icon("tools", 285, 350, 56)
      + label("Public MCP", 313, 448, 474, 31, C.ink, 650, false, "middle")
      + centered(["Exact endpoint URL", "Its own access policy"], 313, 490, 474, 21)
      + rect(608, 272, 544, 276, C.tealTint)
      + pill('Native PAP apis: "mcp"', 636, 296, 488, C.teal, C.paper, 24)
      + icon("key", 852, 350, 56, C.teal)
      + label("PAP-authorized MCP", 880, 448, 488, 31, C.ink, 650, false, "middle")
      + centered(["Session JWT + Poppy-Version", "OAuth for account access"], 880, 490, 488, 21)
      + rect(48, 568, 1104, 48, C.blueTint, C.blueTint)
      + label("Optional tasks.endpoint: excluded tasks · skill index · feedback", 600, 600, 1060, 22, C.blueDark, 600, false, "middle");
    case "poppy-session": {
      const xs = [158, 600, 1042];
      return ["Identity key", "Personal agent", "Automotive API"].map((v, i) => pill(v, xs[i] - 110, 198, 220, i === 2 ? C.teal : C.blueDark, i === 2 ? C.tealTint : C.blueTint, 21) + line(xs[i], 252, xs[i], 611, C.line, true)).join("")
        + label("Sign a short-lived ES256 or PS384 delegation", 193, 293, 800, 23, C.ink, 500)
        + arrow(158, 315, 600) + label("Session JWT + Poppy-Version: 1.0", 635, 365, 500, 23, C.ink, 500)
        + arrow(600, 387, 1042) + label("Verify delegation, request, version", 635, 437, 390, 22, C.blueDark, 500)
        + label("Typed automotive result", 635, 509, 500, 23, C.teal, 500)
        + arrow(1042, 531, 600, 531, C.teal)
        + label("client_id + sid + User ID find the Session; keys may rotate", 193, 582, 900, 23, C.teal, 500);
    }
    case "poppy-mcp-tokens": return rect(48, 192, 1104, 68, C.blueTint, C.blue)
      + label("Use the advertised native PAP MCP endpoint", 600, 235, 1040, 28, C.blueDark, 650, false, "middle")
      + arrow(310, 264, 310, 302) + arrow(890, 264, 890, 302, C.teal)
      + rect(48, 310, 530, 296) + rect(622, 310, 530, 296, C.tealTint)
      + pill("Signed out", 76, 334, 474, C.blueDark, C.blueTint, 25)
      + pill("Account access", 650, 334, 474, C.teal, C.paper, 25)
      + lines(["Poppy-Session + Poppy-Version", "No access token", "No OAuth sign-in"], 80, 414, 466, 23)
      + lines(["Token with resource = MCP url", "ath binds access token", "DPoP if token is bound"], 654, 414, 466, 23)
      + arrow(310, 505, 310, 538) + arrow(890, 505, 890, 538, C.teal)
      + label("Verified Session", 313, 576, 474, 26, C.blueDark, 650, false, "middle")
      + label("Account + scopes", 887, 576, 474, 25, C.teal, 650, false, "middle");
    case "poppy-browser-join": {
      const steps: [string, Icon, string[]][] = [
        ["Browser gets code", "globe", ["Own endpoint page", "Short-lived one-use code", "Protected join cookie"]],
        ["Agent authorizes", "key", ["POST /authorize", "Session JWT + code", "204 after verification"]],
        ["Browser redeems", "shield", ["Match cookie + code", "Consume first attempt", "Apply verified Session"]],
      ];
      return steps.map(([title, glyph, detail], i) => {
        const x = 48 + i * 378;
        return rect(x, 210, 348, 336) + pill(`0${i + 1}`, x + 24, 230, 64)
          + icon(glyph, x + 140, 284, 68, i === 2 ? C.teal : C.blue)
          + label(title, x + 174, 400, 312, 27, C.ink, 650, false, "middle")
          + lines(detail, x + 174, 446, 306, 21).replaceAll('text-anchor="start"', 'text-anchor="middle"')
          + (i < 2 ? arrow(x + 350, 378, x + 372) : "");
      }).join("") + rect(48, 568, 538, 48, C.tealTint, C.tealTint)
        + label("303 + Session cookie after verification", 317, 600, 510, 22, C.teal, 650, false, "middle")
        + rect(614, 568, 538, 48, C.blueTint, C.blueTint)
        + label("Signed in: poppy:browser-sign-in scope", 883, 600, 510, 22, C.blueDark, 650, false, "middle");
    }
    case "consent-gate": return tile("Browse", "Dealer + inventory skills", "search", 48, 257, 370)
      + tile("Inspect", "Price + equipment evidence", "car", 48, 416, 370)
      + curve(418, 305, 521, 398) + curve(418, 464, 521, 398)
      + rect(521, 214, 198, 386, C.tealTint, C.teal)
      + icon("shield", 578, 251, 84, C.teal)
      + label("Consent", 620, 391, 170, 30, C.teal, 700, false, "middle")
      + lines(["Payload", "Purpose", "Channels"], 620, 443, 170, 24).replaceAll('text-anchor="start"', 'text-anchor="middle"')
      + arrow(723, 398, 806, 398, C.teal)
      + rect(810, 280, 342, 246) + icon("lead", 840, 309, 58, C.teal)
      + label("lead_submit", 840, 423, 280, 30, C.ink, 650, true)
      + label("One idempotent inquiry", 840, 474, 280, 21, C.muted);
    case "pricing-ladder": return rect(48, 210, 632, 398)
      + label("Vehicle price", 80, 258, 566, 28, C.ink, 650)
      + label("$32,995", 80, 350, 566, 76, C.ink, 700)
      + pill("Includes mandatory dealer charges", 80, 382, 568, C.teal, C.tealTint, 24)
      + line(80, 453, 648, 453)
      + label("Illustrative price components", 80, 491, 566, 22, C.muted)
      + label("$32,500 vehicle  +  $495 dealer fee", 80, 551, 566, 24, C.ink, 500)
      + rect(716, 210, 436, 188, C.blueTint)
      + icon("document", 744, 238, 40) + label("Fee breakdown", 804, 268, 320, 27, C.blueDark, 650)
      + lines(["Explains the total.", "Never added a second time."], 744, 324, 380, 23)
      + rect(716, 426, 436, 182, C.amberTint, C.amberTint)
      + label("Separate government charges", 744, 470, 380, 22, C.amber, 650)
      + lines(["Only charges the government", "requires the consumer to pay."], 744, 521, 380, 23);
    case "dealer-rooftops": return tile("Dealer group", "Identity + welcome + contacts", "dealer", 370, 196, 460)
      + [232, 600, 968].map(x => line(600, 292, x, 354)).join("")
      + ["North rooftop", "Central rooftop", "South rooftop"].map((v, i) => {
        const x = 48 + i * 378;
        return rect(x, 354, 348, 244) + icon("pin", x + 26, 380, 48)
          + label(v, x + 26, 473, 296, 28, C.ink, 650)
          + lines(["Location · hours · contacts", "Services · fee disclosures"], x + 26, 521, 296, 20);
      }).join("");
    case "facets-overview": {
      const values: [string, number][] = [["SUV", 42], ["Sedan", 28], ["Truck", 16]];
      return rect(48, 210, 540, 398) + label("Body styles", 80, 257, 476, 29, C.ink, 650)
        + values.map(([v, n], i) => label(v, 80, 318 + i * 90, 150, 25) + rect(210, 294 + i * 90, n * 6, 34, C.blueTint, C.blueTint, 7) + label(String(n), 530, 319 + i * 90, 70, 25, C.blueDark, 650, true, "end")).join("")
        + rect(618, 210, 534, 398) + label("Feature vocabulary", 650, 257, 470, 29, C.ink, 650)
        + ["heated_seats", "adaptive_cruise", "tow_package"].map((v, i) => label(v, 650, 325 + i * 90, 340, 22, C.ink, 500, true) + pill(["31", "24", "12"][i], 1030, 298 + i * 90, 90, C.teal, C.tealTint, 24)).join("");
    }
    case "inventory-search-flow": return flow([
      { title: "Constrain", icon: "filter", detail: ["Supported filters", "Query + sort + limit"], tag: "Typed request" },
      { title: "Match", icon: "database", detail: ["Real listings", "All constraints apply"], tag: "Dealer inventory" },
      { title: "Explain", icon: "document", detail: ["Evidence + distance", "Price + freshness"], tag: "Applied filters" },
      { title: "Continue", icon: "link", detail: ["Follow next_cursor", "Until it is null"], tag: "Complete results" },
    ]);
    case "vehicle-detail-lookup": return rect(48, 248, 404, 308)
      + icon("search", 78, 276, 52) + label("Identify the listing", 78, 377, 344, 28, C.ink, 650)
      + lines(["VIN", "stock", "vehicle_id"], 78, 430, 344, 23, C.blueDark, true)
      + arrow(458, 402, 546)
      + rect(552, 210, 600, 398) + icon("car", 584, 239, 68)
      + label("One vehicle record", 692, 283, 428, 31, C.ink, 650)
      + line(584, 335, 1120, 335)
      + ["Status + updated_at", "Authoritative price", "Equipment + source evidence", "Relevant vehicle specifications"].map((v, i) => icon("check", 584, 362 + i * 53, 28, C.teal) + label(v, 632, 386 + i * 53, 486, 25)).join("");
    case "multi-class-inventory": {
      const rows: [Icon, string, string[]][] = [["car", "Cars", ["Body · drivetrain", "Mileage · fuel type"]], ["motorcycle", "Motorcycles", ["Segment · displacement", "Mileage · fuel type"]], ["bolt", "Electric powertrains", ["Battery · range", "Charge port · DC charging"]]];
      return rows.map(([glyph, title, detail], i) => {
        const x = 48 + i * 378;
        return rect(x, 210, 348, 310, i === 2 ? C.tealTint : C.paper)
          + icon(glyph, x + 132, 244, 84, i === 2 ? C.teal : C.blue)
          + label(title, x + 174, 399, 304, i === 2 ? 26 : 32, C.ink, 650, false, "middle")
          + lines(detail, x + 174, 448, 304, 22).replaceAll('text-anchor="start"', 'text-anchor="middle"');
      }).join("") + pill("Shared: identity · availability · price · equipment evidence", 48, 560, 1104, C.blueDark, C.blueTint, 27);
    }
    case "lead-lifecycle": return rect(48, 270, 320, 258)
      + icon("lead", 78, 300, 54) + label("Approved inquiry", 78, 403, 260, 26, C.ink, 650)
      + lines(["Consent + contact", "Idempotency key"], 78, 451, 260, 23)
      + arrow(374, 399, 472) + rect(478, 226, 288, 346, C.blueTint, C.blue)
      + icon("shield", 590, 255, 64) + label("Validate + dedupe", 622, 371, 250, 24, C.ink, 650, false, "middle")
      + lines(["received", "rejected", "replayed: true"], 622, 431, 230, 23, C.blueDark, true).replaceAll('text-anchor="start"', 'text-anchor="middle"')
      + arrow(772, 399, 858) + rect(864, 226, 288, 346, C.tealTint)
      + icon("clock", 976, 255, 64, C.teal) + label("Appointment", 1008, 371, 248, 28, C.ink, 650, false, "middle")
      + lines(["requested / proposed", "confirmed / rejected", "Separate outcome"], 1008, 431, 248, 21, C.teal).replaceAll('text-anchor="start"', 'text-anchor="middle"');
    case "error-anatomy": return rect(48, 210, 622, 398, C.ink, C.ink)
      + label('type: "aap_error"', 80, 266, 556, 27, C.paper, 600, true)
      + label('code: "UNSUPPORTED_FILTER"', 80, 334, 556, 25, C.paper, 500, true)
      + label('message: "Filter is not supported"', 80, 395, 556, 23, C.paper, 500, true)
      + label('retryable: false', 80, 456, 556, 25, C.paper, 500, true)
      + label('details: { field: "near" }', 80, 517, 556, 25, C.paper, 500, true)
      + ["MCP structuredContent", "A2A standard detail", "PAP JSON body"].map((v, i) => curve(670, 399, 770, 272 + i * 128) + rect(770, 224 + i * 128, 382, 96) + label(v, 961, 282 + i * 128, 338, 25, C.blueDark, 600, false, "middle")).join("");
    case "adf-bridge": return tile("AAP lead_submit", "Approved customer inquiry", "lead", 48, 267, 360)
      + arrow(414, 315, 484) + tile("CRM mapping", "Receiver-specific ADF", "code", 490, 267, 340)
      + arrow(836, 315, 900) + rect(906, 230, 246, 172) + icon("database", 998, 253, 62)
      + label("Dealer CRM", 1029, 365, 218, 28, C.ink, 650, false, "middle")
      + arrow(228, 369, 228, 466, C.teal) + rect(48, 472, 1104, 126, C.tealTint)
      + icon("shield", 80, 506, 54, C.teal) + label("Retained record", 166, 522, 920, 28, C.teal, 650)
      + label("Consent · contact channels · idempotency · unmapped fields", 166, 568, 920, 25, C.ink);
    case "mcp-wrapper": return rect(48, 220, 312, 370)
      + icon("agent", 167, 251, 74) + label("MCP host", 204, 392, 264, 34, C.ink, 650, false, "middle")
      + lines(["Discover tools", "Select a skill", "Read typed results"], 204, 448, 264, 23).replaceAll('text-anchor="start"', 'text-anchor="middle"')
      + arrow(366, 295, 624) + label("tools/list", 495, 276, 238, 23, C.blueDark, 500, true, "middle")
      + arrow(366, 405, 624) + label("tools/call", 495, 386, 238, 23, C.blueDark, 500, true, "middle")
      + arrow(624, 515, 366, 515, C.teal) + label("structuredContent", 495, 496, 238, 20, C.teal, 500, true, "middle")
      + rect(630, 220, 522, 370, C.blueTint, C.blue) + icon("tools", 662, 250, 60)
      + label("Dealer MCP server", 662, 367, 458, 34, C.ink, 650)
      + lines(["aap_inventory_search", "arguments: typed AAP request", "result: response or aap_error"], 662, 431, 458, 22, C.blueDark, true)
      + pill("Streamable HTTP", 662, 534, 458, C.blueDark, C.paper, 22);
    case "aap-sdk-toolbox": return pill("Reviewed JSON Schema contract", 300, 195, 600, C.blueDark, C.blueTint, 28)
      + [232, 600, 968].map(x => line(600, 235, x, 325)).join("")
      + ([['document', 'schemas', 'JSON Schema 2020-12'], ['code', 'types', 'TypeScript declarations'], ['shield', 'validator', 'Runtime validation']] as [Icon, string, string][]).map(([glyph, name, detail], i) => {
        const x = 48 + i * 378;
        return rect(x, 325, 348, 269) + icon(glyph, x + 142, 354, 64)
          + label(`@autoagentprotocol/`, x + 174, 464, 312, 22, C.muted, 400, true, "middle")
          + label(name, x + 174, 510, 312, 32, C.blueDark, 650, true, "middle")
          + label(detail, x + 174, 560, 312, 22, C.ink, 500, false, "middle");
      }).join("");
    case "interop-clients": {
      const rows: [string, string][] = [["MCP current", "Per-request metadata"], ["MCP legacy", "Initialize lifecycle"], ["A2A 1.0", "Activated DataPart"], ["PAP 1.0", "Session + Poppy-Version"]];
      return rows.map(([title, detail], i) => tile(title, detail, i === 3 ? "key" : "agent", 48, 192 + i * 108, 386) + arrow(440, 240 + i * 108, 592)).join("")
        + rect(598, 192, 554, 420, C.blueTint, C.blue) + icon("shield", 831, 225, 88)
        + label("One AAP contract", 875, 386, 490, 36, C.ink, 650, false, "middle")
        + lines(["Real HTTP envelopes", "Typed requests + responses", "Actionable errors", "Equivalent business behavior"], 875, 445, 490, 25).replaceAll('text-anchor="start"', 'text-anchor="middle"');
    }
    case "feature-evidence": {
      const rows: [Icon, string, string, string, string][] = [["check", "Present", "Heated seats", "Window sticker confirms equipment", C.teal], ["cross", "Absent", "Tow package", "Dealer record explicitly says absent", C.blueDark], ["unknown", "Unknown", "Adaptive cruise", "No verified equipment evidence", C.amber]];
      return rows.map(([glyph, state, feature, evidence, color], i) => {
        const y = 218 + i * 132;
        return rect(48, y, 1104, 112, i === 0 ? C.tealTint : C.paper) + icon(glyph, 78, y + 30, 50, color)
          + label(state, 156, y + 48, 210, 29, color, 650) + label(feature, 388, y + 47, 710, 27, C.ink, 600)
          + label(evidence, 388, y + 84, 710, 23, C.muted);
      }).join("");
    }
    case "geo-search": return rect(48, 202, 674, 412, C.paper)
      + [130, 240, 350, 460, 570, 680].map(x => line(x, 226, x - 30, 590)).join("")
      + [268, 350, 432, 514].map(y => line(72, y, 698, y + 22)).join("")
      + '<circle cx="352" cy="410" r="152" fill="#eaf2ff" fill-opacity=".8" stroke="#2874d7" stroke-width="3" stroke-dasharray="9 8"/>'
      + '<circle cx="352" cy="410" r="9" fill="#2874d7"/>' + line(352, 410, 504, 410, C.blue)
      + label("25 mi", 402, 396, 92, 23, C.blueDark, 650)
      + icon("pin", 260, 296, 52, C.teal) + icon("pin", 422, 463, 52, C.teal) + icon("pin", 606, 252, 52, C.muted)
      + pill("Shopper point", 252, 550, 200, C.blueDark, C.paper, 22)
      + rect(752, 202, 400, 412)
      + label("Radius search", 784, 252, 336, 31, C.ink, 650)
      + lines(["near: lat + lon", "radius_mi: 25", "sort: distance_mi"], 784, 320, 336, 23, C.blueDark, true)
      + icon("check", 784, 443, 32, C.teal) + label("Inside: eligible", 838, 469, 282, 24, C.teal, 600)
      + icon("cross", 784, 507, 32, C.muted) + label("Outside: excluded", 838, 533, 282, 24, C.muted, 600);
    case "cursor-pagination": return pill("Same query · filters · sort · page size", 48, 201, 1104, C.blueDark, C.blueTint, 27)
      + ["Page 1", "Page 2", "Final page"].map((v, i) => {
        const x = 48 + i * 378;
        return (i ? arrow(x - 24, 412, x - 6) : "") + rect(x, 276, 348, 328)
          + label(v, x + 28, 324, 292, 30, C.ink, 650)
          + [0, 1, 2].map(j => rect(x + 28, 350 + j * 48, 292, 32, C.canvas, C.canvas, 7)).join("")
          + line(x + 28, 511, x + 320, 511)
          + label("next_cursor", x + 28, 549, 292, 22, C.muted, 500, true)
          + label(i === 2 ? "null" : '"opaque token"', x + 28, 583, 292, 23, i === 2 ? C.teal : C.blueDark, 600, true);
      }).join("");
    case "llms-discovery": return rect(48, 202, 658, 412, C.ink, C.ink)
      + label("/llms.txt", 80, 250, 594, 27, C.paper, 600, true)
      + label("# Demo dealership", 80, 311, 594, 26, C.paper, 500, true)
      + lines(["[MCP endpoint](exact URL)", "[A2A Agent Card](dealer URL)", "[PAP discovery](dealer URL)", "[API + inventory](dealer URL)"], 80, 373, 594, 23, C.paper, true)
      + label("State public reads + consent requirements.", 80, 568, 594, 21, C.paper)
      + arrow(712, 408, 800) + rect(806, 240, 346, 336, C.blueTint)
      + icon("document", 944, 270, 68) + label("Readable pages", 979, 397, 302, 30, C.ink, 650, false, "middle")
      + lines(["HTML ↔ Markdown", "Descriptive links", "Working resources"], 979, 454, 302, 23).replaceAll('text-anchor="start"', 'text-anchor="middle"');
    case "capability-parity": {
      const columns = [696, 880, 1064], rows = ["Core + optional skills", "Search capabilities", "Inventory + evidence", "Pricing + availability", "Consent + outcomes"];
      return rect(48, 202, 1104, 412) + ["MCP", "A2A", "PAP"].map((v, i) => pill(v, columns[i] - 64, 222, 128, C.blueDark, C.blueTint, 26)).join("")
        + rows.map((v, i) => label(v, 80, 320 + i * 63, 500, 25, C.ink, 500) + columns.map(x => icon("check", x - 18, 292 + i * 63, 36, C.teal)).join("")).join("");
    }
    case "naming-snake-case": {
      const rows: [string, string, string][] = [
        ["Skill id", "lead.submit", "lead_submit"],
        ["Message type", "lead.submit.request", "lead_submit_request"],
        ["Error type", "aap.error", "aap_error"],
        ["PAP path", "/skills/lead.submit", "/skills/lead_submit"],
        ["MCP tool", "aap_lead_submit", "aap_lead_submit, unchanged"],
      ];
      return pill("AAP 3.2 and earlier", 232, 192, 404, C.muted, C.paper, 20) + pill("AAP 4.0", 712, 192, 440, C.teal, C.tealTint, 20)
        + rows.map(([area, before, after], i) => {
          const y = 246 + i * 74;
          return label(area, 48, y + 38, 176, 21, C.ink, 650)
            + rect(232, y, 404, 60, C.canvas, C.line, 14) + label(before, 254, y + 38, 364, 19, C.muted, 400, true)
            + arrow(646, y + 30, 702)
            + rect(712, y, 440, 60, C.paper, C.line, 14) + icon("check", 730, y + 16, 28, C.teal)
            + label(after, 774, y + 38, 360, 19, C.ink, 600, true);
        }).join("");
    }
    case "pap-migration": {
      const rows: [string, string, string][] = [
        ["Version", "Poppy-Session only", "+ Poppy-Version: 1.0"],
        ["Extensions", "One object per name", "A list, one entry per major"],
        ["Tasks", "excluded_tasks, skill_index, feedback", "One tasks.endpoint"],
        ["Keys", "PS384 recommended", "ES256 and PS384 accepted"],
        ["Session", "Found by client_id + sid", "client_id + sid + User ID"],
      ];
      return pill("AAP 3.2 · PAP 0.3", 196, 192, 440, C.muted, C.paper, 20) + pill("AAP 4.0 · PAP 1.0", 712, 192, 440, C.teal, C.tealTint, 20)
        + rows.map(([area, before, after], i) => {
          const y = 246 + i * 74;
          return label(area, 48, y + 38, 140, 21, C.ink, 650)
            + rect(196, y, 440, 60, C.canvas, C.line, 14) + label(before, 218, y + 38, 400, 19, C.muted)
            + arrow(646, y + 30, 702)
            + rect(712, y, 440, 60, C.paper, C.line, 14) + icon("check", 730, y + 16, 28, C.teal)
            + label(after, 774, y + 38, 360, 21, C.ink, 600);
        }).join("");
    }
    case "poppy-versions": {
      const cards: [Icon, string, string[]][] = [
        ["document", "Fetch poppy.json", ["protocol_version: 1.0", "Optional supported_versions"]],
        ["filter", "Choose the newest", ["Compatible means", "the same major version"]],
        ["key", "Declare it", ["Poppy-Version: 1.0", "On every Session request"]],
      ];
      return cards.map(([glyph, title, detail], i) => {
        const x = 48 + i * 378;
        return rect(x, 196, 348, 270, i === 2 ? C.tealTint : C.paper) + pill(`0${i + 1}`, x + 24, 216, 64)
          + icon(glyph, x + 140, 250, 68, i === 2 ? C.teal : C.blue)
          + label(title, x + 174, 366, 312, 26, C.ink, 650, false, "middle")
          + centered(detail, x + 174, 410, 306, 20)
          + (i < 2 ? arrow(x + 350, 331, x + 372) : "");
      }).join("")
        + arrow(600, 498, 600, 472, C.amber)
        + rect(48, 500, 1104, 110, C.amberTint, C.amberTint)
        + icon("unknown", 76, 529, 52, C.amber)
        + label("HTTP 400 version_unsupported", 152, 548, 700, 24, C.amber, 650, true)
        + label("Refetch poppy.json and choose again; a new version starts a new Session, retried once.", 152, 586, 980, 19, C.ink);
    }
    case "poppy-request-headers": {
      const rows: [string, string, string, boolean][] = [
        ["Poppy-Session", "eyJ0eXAiOiJwb3BweS1zZXNz…", "Required", true],
        ["Poppy-Version", "1.0", "Required", true],
        ["Poppy-Extensions", '"autoagentprotocol.org/aap";v="1"', "With extensions", false],
        ["Authorization", "Bearer eyJhbGciOi…", "Signed in only", false],
        ["Poppy-Approval", 'operation_id="…", approver="user"', "With Operations", false],
      ];
      return label("POST /skills/inventory_search", 48, 206, 1000, 21, C.ink, 600, true)
        + rows.map(([name, value, tag, required], i) => {
          const y = 226 + i * 78;
          return rect(48, y, 1104, 64, required ? C.tealTint : C.paper, required ? C.tealTint : C.line, 14)
            + label(name, 76, y + 40, 270, 21, required ? C.teal : C.blueDark, 600, true)
            + label(value, 360, y + 40, 500, 18, C.muted, 400, true)
            + pill(tag, 880, y + 14, 248, required ? C.teal : C.blueDark, required ? C.paper : C.blueTint, 17);
        }).join("");
    }
    case "poppy-tasks": {
      const rows: [string, string][] = [["excluded_tasks", "Tasks not offered, with alternatives"], ["skill_index", "Agent Skills index, not AAP skills"], ["feedback.endpoint", "Report a task the agent could not do"]];
      return rect(48, 200, 392, 360) + icon("document", 76, 244, 52)
        + label("GET tasks.endpoint", 76, 350, 336, 24, C.blueDark, 600, true)
        + lines(["Poppy-Session header", "Poppy-Version: 1.0"], 76, 404, 336, 21, C.ink)
        + icon("cross", 76, 476, 26, C.muted) + label("No access token", 112, 496, 300, 21, C.muted)
        + arrow(446, 380, 508)
        + rect(514, 200, 638, 360, C.blueTint, C.blue)
        + rows.map(([key, detail], i) => {
          const y = 220 + i * 112;
          return rect(538, y, 590, 96) + label(key, 566, y + 40, 534, 23, C.blueDark, 600, true) + label(detail, 566, y + 74, 534, 19, C.muted);
        }).join("")
        + pill("Per Session · Cache-Control: private or no-store when responses differ", 48, 578, 1104, C.teal, C.tealTint, 20);
    }
    case "poppy-compliance-map": {
      const columns: [string, string, string, Icon, [string, string][]][] = [
        ["Required", C.teal, C.tealTint, "check", [["Discovery", "poppy.json + AAP bridge"], ["Versions", "Poppy-Version check"], ["Sessions", "Verify every request"], ["APIs", "openapi API entry"]]],
        ["Required when advertised", C.blueDark, C.blueTint, "check", [["Sign-in", "Complete OAuth rules"], ["Browser join", "poppy:browser-sign-in"], ["Conversations", "All upstream rules"], ["Task coverage", "tasks.endpoint"], ["Operations", "Operations v3"]]],
        ["Client obligations", C.amber, C.amberTint, "shield", [["Keys", "Protect identity keys"], ["Secrets", "Never in model context"], ["Destinations", "Check audience + host"]]],
      ];
      return columns.map(([title, color, fill, glyph, items], i) => {
        const x = 48 + i * 378;
        return rect(x, 200, 348, 412, i === 0 ? C.tealTint : C.paper)
          + pill(title, x + 24, 222, 300, color, i === 0 ? C.paper : fill, 18)
          + items.map(([name, detail], j) => {
            const y = 300 + j * 62;
            return icon(glyph, x + 26, y - 22, 26, color === C.blueDark ? C.blue : color)
              + label(name, x + 66, y, 258, 22, C.ink, 650) + label(detail, x + 66, y + 25, 258, 17, C.muted);
          }).join("")
          + (i === 2 ? label("Not a dealer requirement", x + 174, 510, 300, 18, C.amber, 600, false, "middle") : "");
      }).join("");
    }
    case "poppy-operations": {
      const agent = 210, dealer = 770;
      return pill("Personal agent", agent - 120, 198, 240, C.blueDark, C.blueTint, 21) + pill("Dealer API", dealer - 120, 198, 240, C.teal, C.tealTint, 21)
        + line(agent, 252, agent, 611, C.line, true) + line(dealer, 252, dealer, 611, C.line, true)
        + label("Write skill, declaring Operations v3", agent + 30, 290, 520, 21, C.ink)
        + arrow(agent, 308, dealer)
        + label("403 approval_required + exact terms", agent + 30, 360, 520, 21, C.amber, 600)
        + arrow(dealer, 378, agent, 378, C.amber)
        + rect(agent - 160, 404, 320, 64, C.paper, C.blue, 14)
        + label("User or agent approves", agent, 444, 290, 21, C.ink, 650, false, "middle")
        + label("Same request + Poppy-Approval", agent + 30, 510, 520, 21, C.ink)
        + arrow(agent, 528, dealer)
        + label("Performed at most once", agent + 30, 576, 520, 21, C.teal, 600)
        + arrow(dealer, 594, agent, 594, C.teal)
        + rect(830, 252, 322, 342, C.tealTint)
        + icon("shield", 860, 296, 52, C.teal)
        + label("Still required", 860, 386, 270, 25, C.teal, 650)
        + lines(["AAP consent grant in", "the request body", "Same idempotency key", "Declined is final"], 860, 432, 270, 20, C.ink);
    }
    case "optional-skills": {
      const core: [Icon, string][] = [["dealer", "dealer_information"], ["filter", "inventory_facets"], ["search", "inventory_search"], ["car", "inventory_vehicle"], ["lead", "lead_submit"]];
      const optional: [Icon, string, string, string[]][] = [
        ["car", "trade_in_submit", "Trade-in valuation", ["instant_valuation", "currencies"]],
        ["document", "credit_application_submit", "Credit application", ["inquiry_types · joint_applications", "national_id · currencies"]],
      ];
      return label("Five core skills", 48, 200, 600, 18, C.muted, 650)
        + core.map(([glyph, operation], i) => {
          const x = 48 + i * 225;
          return rect(x, 214, 204, 100) + icon(glyph, x + 84, 230, 36) + label(operation, x + 102, 294, 184, 16, C.blueDark, 500, true, "middle");
        }).join("")
        + label("Two optional skills, declared with capabilities", 48, 350, 1000, 18, C.muted, 650)
        + optional.map(([glyph, operation, detail, capabilities], i) => {
          const x = 48 + i * 562;
          return rect(x, 364, 542, 248, C.blueTint, C.blue) + icon(glyph, x + 24, 386, 48)
            + label(operation, x + 90, 414, 428, 24, C.ink, 650, true) + label(detail, x + 90, 444, 428, 18, C.muted)
            + ["MCP tool", "A2A skill", "PAP path"].map((binding, j) => pill(binding, x + 24 + j * 166, 466, 154, C.blueDark, C.paper, 17)).join("")
            + label("capabilities", x + 24, 538, 494, 16, C.muted, 600)
            + lines(capabilities, x + 24, 566, 494, 17, C.blueDark, true);
        }).join("");
    }
    case "optional-skill-bindings": {
      const columns: [Icon, string, string, string, string, number][] = [
        ["tools", "MCP", "Tool name in tools/call", "aap_trade_in_submit", "aap_credit_application_submit", 340],
        ["agent", "A2A", "Skill id of the typed DataPart", "trade_in_submit", "credit_application_submit", 340],
        ["key", "PAP", "POST path, with Poppy-Version: 1.0", "/skills/trade_in_submit", "/skills/credit_application_submit", 388],
      ];
      let x = 48;
      return columns.map(([glyph, binding, how, tradeIn, credit, width]) => {
        const left = x; x += width + 18;
        return rect(left, 204, width, 408) + icon(glyph, left + 24, 226, 44, binding === "PAP" ? C.teal : C.blue)
          + label(binding, left + 84, 250, width - 108, 28, C.ink, 700) + label(how, left + 84, 278, width - 108, 16, C.muted)
          + ([["Trade-in valuation", tradeIn], ["Credit application", credit]] as const).map(([caption, id], row) => {
            const top = 312 + row * 146;
            return rect(left + 12, top, width - 24, 126, C.blueTint, C.blueTint, 14)
              + label(caption, left + 26, top + 44, width - 52, 18, C.blueDark, 650) + label(id, left + 26, top + 88, width - 52, 16, C.ink, 500, true);
          }).join("");
      }).join("");
    }
    case "optional-skill-delivery": {
      const card = (x: number, glyph: Icon, id: string, subtitle: string, note: string) => rect(x, 204, 542, 408) + icon(glyph, x + 24, 226, 44)
        + label(id, x + 84, 250, 434, 22, C.ink, 650, true) + label(subtitle, x + 84, 278, 434, 16, C.muted)
        + pill(note, x + 24, 552, 494, C.blueDark, C.blueTint, 17);
      const never = (x: number, y: number) => rect(x, y, 494, 96, C.amberTint, C.amber) + icon("cross", x + 20, y + 23, 44, C.amber)
        + label("Never ADF or email", x + 82, y + 39, 394, 25, C.amber, 650) + label("Applicant data is sensitive", x + 82, y + 69, 394, 18, C.ink);
      return card(48, "car", "trade_in_submit", "Two ways to deliver, one tool", "Declare instant_valuation: false or true")
        + tile("ADF/XML to the CRM", "Reply received · dealer follows up", "lead", 72, 312, 494)
        + tile("Valuation API", "Reply valued · amount or range now", "code", 72, 424, 494, C.teal)
        + card(610, "document", "credit_application_submit", "One way to deliver", "Declare inquiry_types and national_id")
        + tile("Secure API only", "To the dealer or lender credit system", "lock", 634, 312, 494, C.teal)
        + never(634, 424);
    }
    case "rebates-price": {
      const rows: [string, string, string][] = [["List price", "$35,390", C.ink], ["Mandatory fees", "+ $500", C.ink], ["Customer cash, unconditional", "− $1,000", C.teal]];
      return rect(48, 200, 652, 410)
        + rows.map(([name, value, color], i) => label(name, 80, 250 + i * 50, 420, 23, color, 500) + label(value, 668, 250 + i * 50, 170, 24, color, 600, true, "end")).join("")
        + line(80, 380, 668, 380)
        + label("price", 80, 420, 300, 21, C.muted, 500, true)
        + label("$34,890", 80, 494, 560, 64, C.ink, 700)
        + pill("Unconditional rebate already included", 80, 534, 588, C.teal, C.tealTint, 21)
        + rect(730, 200, 422, 410, C.amberTint, C.amberTint)
        + label("Conditional rebates", 760, 250, 360, 25, C.amber, 650)
        + label("is_conditional: true or omitted", 760, 282, 360, 17, C.muted, 400, true)
        + [["Military", "$500"], ["College", "$500"]].map(([name, value], i) => rect(760, 310 + i * 66, 362, 54, C.paper, C.paper, 12)
          + label(name, 784, 344 + i * 66, 220, 22, C.ink, 500) + label(value, 1098, 344 + i * 66, 120, 22, C.amber, 600, true, "end")).join("")
        + lines(["Possible extra saving,", "subject to eligibility"], 760, 478, 362, 21, C.ink)
        + pill("Never subtracted from price", 760, 548, 362, C.amber, C.paper, 19);
    }
    case "trade-in-valuation": return rect(48, 204, 330, 196) + icon("car", 72, 226, 44)
      + label("Vehicle facts", 128, 256, 236, 20, C.ink, 650)
      + lines(["year · make · model", "condition · mileage"], 72, 312, 290, 19, C.blueDark, true)
      + label("Other details optional", 72, 380, 290, 17, C.muted)
      + rect(48, 416, 330, 196, C.tealTint) + icon("shield", 72, 438, 44, C.teal)
      + label("Customer + consent", 128, 468, 236, 20, C.ink, 650)
      + lines(["Required, same as a lead", "scope: trade_in_submission"], 72, 524, 290, 19)
      + curve(378, 302, 452, 408, C.blue) + curve(378, 514, 452, 408, C.teal)
      + rect(452, 318, 250, 180, C.blueTint, C.blue) + icon("lead", 553, 340, 48)
      + label("trade_in_submit", 577, 432, 226, 20, C.ink, 650, true, "middle")
      + label("One tool, one request", 577, 464, 226, 17, C.muted, 400, false, "middle")
      + curve(702, 408, 776, 302, C.teal) + curve(702, 408, 776, 514, C.blue)
      + rect(776, 204, 376, 196, C.tealTint) + icon("check", 800, 226, 44, C.teal)
      + label("valued", 860, 256, 270, 23, C.teal, 650, true)
      + lines(["Amount, range or both, now", "Dealer with a valuation API"], 800, 312, 336, 19)
      + rect(776, 416, 376, 196) + icon("clock", 800, 438, 44)
      + label("received", 860, 468, 270, 23, C.blueDark, 650, true)
      + lines(["Dealer follows up", "Dealer delivering to a CRM"], 800, 524, 336, 19);
    case "trade-in-outcomes": {
      const columns: [Icon, string, string[], string, string, string][] = [
        ["check", "valued", ["Amount, range or both", "Estimate or offer", "An offer has expires_at"], C.teal, C.teal, C.tealTint],
        ["clock", "received", ["No valuation yet", "Dealer follows up", "On the consented channels"], C.blue, C.blueDark, C.paper],
        ["cross", "rejected", ["Not accepted", "Nothing was recorded", "No valuation"], C.muted, C.muted, C.paper],
      ];
      return columns.map(([glyph, status, detail, iconColor, color, fill], i) => {
        const x = 48 + i * 378;
        return rect(x, 200, 348, 340, fill) + icon(glyph, x + 136, 230, 76, iconColor)
          + label(status, x + 174, 368, 300, 30, color, 650, true, "middle")
          + centered(detail, x + 174, 420, 304, 21);
      }).join("") + pill("Retry with the same idempotency key: original result, replayed: true", 48, 568, 1104, C.blueDark, C.blueTint, 21);
    }
    case "credit-application-flow": {
      const steps: [Icon, string, string][] = [
        ["document", "Read capabilities", "inquiry_types · joint_applications · national_id"],
        ["filter", "Collect accepted data", "Ask for an identifier only when the dealer accepts it"],
        ["shield", "Record each applicant's consent", "Verbatim text · soft or hard inquiry · channels"],
        ["lead", "Submit once", "credit_application_submit with an idempotency key"],
        ["check", "Read the result", "Submission status, then any separate decision"],
      ];
      return steps.map(([glyph, title, detail], i) => {
        const y = 210 + i * 78;
        return rect(48, y, 712, 66, i === 4 ? C.tealTint : C.paper, C.line, 14)
          + label(String(i + 1).padStart(2, "0"), 70, y + 41, 40, 18, C.muted, 500, true)
          + icon(glyph, 114, y + 15, 36, i === 4 ? C.teal : C.blue)
          + label(title, 172, y + 29, 560, 22, C.ink, 650) + label(detail, 172, y + 54, 560, 18, C.muted);
      }).join("")
        + rect(790, 210, 362, 378, C.blueTint, C.blue)
        + label("status", 818, 252, 300, 22, C.blueDark, 600, true)
        + pill("received", 818, 268, 146, C.teal, C.paper, 18) + pill("rejected", 978, 268, 146, C.muted, C.paper, 18)
        + line(818, 330, 1124, 330)
        + label("decision", 818, 368, 300, 22, C.blueDark, 600, true)
        + label("Optional, may come later", 818, 394, 306, 17, C.muted)
        + lines(["pending", "prequalified", "approved", "conditionally_approved", "declined"], 818, 430, 306, 18, C.ink, true);
    }
    case "credit-application-data": {
      const groups: [Icon, string, string[]][] = [
        ["person", "Identity", ["Name, suffix", "Marital status"]],
        ["lead", "Contact", ["Email or phone", "For each applicant"]],
        ["pin", "Residence", ["Address, housing", "Months at address"]],
        ["tools", "Employment", ["Status, employer", "Monthly income"]],
        ["document", "Financing", ["Finance or lease", "Down payment, term"]],
        ["car", "Vehicles", ["Vehicle of interest", "Trade-in, payoff"]],
      ];
      return groups.map(([glyph, title, detail], i) => {
        const x = 48 + (i % 3) * 243, y = 206 + Math.floor(i / 3) * 198;
        return rect(x, y, 226, 180) + icon(glyph, x + 22, y + 22, 36)
          + label(title, x + 22, y + 96, 186, 22, C.ink, 650) + lines(detail, x + 22, y + 130, 196, 18);
      }).join("")
        + rect(790, 206, 362, 378, C.amberTint, C.amber)
        + icon("lock", 818, 230, 44, C.amber) + label("Sensitive", 878, 262, 250, 25, C.amber, 650)
        + label("Never echoed", 818, 318, 306, 21, C.ink, 650)
        + ["national_id", "date_of_birth", "drivers_license"].map((field, i) => rect(818, 340 + i * 52, 306, 40, C.paper, C.paper, 10)
          + label(field, 838, 367 + i * 52, 270, 20, C.ink, 500, true)).join("")
        + lines(["Not in responses, errors,", "logs or URLs"], 818, 528, 306, 18);
    }
    case "credit-consent": {
      const fields: [string, string][] = [["consent_text", "Verbatim text they saw"], ["authorized_inquiry", "soft or hard"], ["allowed_channels", "email · phone · sms"], ["granted_at", "When they agreed"], ["expires_at", "Optional deadline"]];
      return ["Applicant", "Co-applicant"].map((who, i) => {
        const x = 48 + i * 572;
        return rect(x, 200, 532, 328) + icon("person", x + 28, 222, 44, C.teal)
          + label(who, x + 88, 254, 260, 26, C.ink, 650)
          + (i === 1 ? pill("Joint only", x + 368, 226, 140, C.blueDark, C.blueTint, 17) : "")
          + line(x + 28, 290, x + 504, 290)
          + fields.map(([field, detail], j) => label(field, x + 28, 328 + j * 42, 214, 18, C.blueDark, 500, true) + label(detail, x + 256, 328 + j * 42, 252, 19, C.ink)).join("");
      }).join("")
        + rect(48, 548, 1104, 64, C.amberTint, C.amberTint)
        + icon("cross", 74, 562, 36, C.amber)
        + label("Not lead consent.", 128, 589, 250, 23, C.amber, 650)
        + label("Lead consent, sign-in or an Operations approval never replaces it.", 380, 589, 750, 20, C.ink);
    }
  }
}

function renderDiagram(name: DiagramName): string {
  const spec = imageSpecs[name];
  let titleSize = 39;
  while (widthOf(spec.title, titleSize) > 1090) titleSize--;
  const takeawayWords = spec.takeaway.split(" ");
  const takeawayLines: string[] = [""];
  for (const word of takeawayWords) {
    const last = takeawayLines.length - 1;
    const next = `${takeawayLines[last]} ${word}`.trim();
    if (widthOf(next, 20) > 1080) takeawayLines.push(word);
    else takeawayLines[last] = next;
  }
  if (takeawayLines.length > 2) throw new Error(`${name}: takeaway exceeds two lines`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-labelledby="${name}-title ${name}-desc" aria-label="${xml(spec.description)}">
<title id="${name}-title">${xml(spec.title)}</title><desc id="${name}-desc">${xml(spec.description)} ${xml(spec.takeaway)}</desc>
${rect(1, 1, WIDTH - 2, HEIGHT - 2, C.canvas, C.line, 28)}
${label(spec.eyebrow, 48, 55, 1000, 17, C.blueDark, 700)}${brand(1104, 26, 44)}
${label(spec.title, 48, 119, 1104, titleSize, C.ink, 700)}
${renderVisual(name)}
${line(48, 655, 1152, 655)}${lines(takeawayLines, 48, 698, 1104, 20)}
</svg>\n`;
}
function currentImageReferences(): string[] {
  const files = ["README.md", ...glob.sync("docs/**/*.{md,mdx}", { cwd: ROOT }), ...glob.sync("src/**/*.{ts,tsx,css}", { cwd: ROOT })];
  return files.flatMap(file => [...readFileSync(join(ROOT, file), "utf8").matchAll(/(?:docs\/img\/|\.\.\/img\/|\.\/img\/)([a-z0-9-]+\.svg)/g)].map(match => match[1]));
}
const measuredText = new Map<string, number>();
async function validateSvg(name: string, source: string): Promise<void> {
  const errors: string[] = [];
  for (const match of source.matchAll(/#[0-9a-f]{6}/gi)) if (!palette.has(match[0].toLowerCase())) throw new Error(`${name}: unexpected color ${match[0]}`);
  const metadata = await sharp(Buffer.from(source)).metadata();
  if (metadata.format !== "svg" || metadata.width !== WIDTH || metadata.height !== HEIGHT) throw new Error(`${name}: invalid dimensions`);
  if (!source.includes('role="img"') || !source.includes("<title") || !source.includes("<desc") || !source.includes(brandSymbolData)) throw new Error(`${name}: missing accessibility or brand metadata`);
  for (const match of source.matchAll(/<text([^>]*)>([\s\S]*?)<\/text>/g)) {
    const maxWidth = Number(match[1].match(/data-max-width="([\d.]+)"/)?.[1]);
    const attributes = match[1].replace(/\s(?:x|y|text-anchor|data-max-width)="[^"]*"/g, "");
    const sample = `<svg xmlns="http://www.w3.org/2000/svg" width="2400" height="180"><text${attributes} x="16" y="110">${match[2]}</text></svg>`;
    if (!measuredText.has(sample)) {
      const { info } = await sharp(Buffer.from(sample)).trim().png().toBuffer({ resolveWithObject: true });
      measuredText.set(sample, info.width);
    }
    if (measuredText.get(sample)! > maxWidth + 2) errors.push(`${name}: rendered text exceeds ${maxWidth}px: ${match[2]} (${measuredText.get(sample)}px)`);
  }
  if (errors.length) throw new Error(errors.join("\n"));
}
async function main(): Promise<void> {
  const check = process.argv.includes("--check");
  const only = process.argv.find(arg => arg.startsWith("--only="))?.slice(7);
  const preview = process.argv.find(arg => arg.startsWith("--preview-dir="))?.slice(14);
  if (only && !usedImageNames.includes(only as DiagramName)) throw new Error(`Unknown diagram: ${only}`);
  if (check && only) throw new Error("Image checks must cover the complete current set");
  mkdirSync(OUTPUT_DIR, { recursive: true });
  if (preview) mkdirSync(preview, { recursive: true });
  const names = only ? [only as DiagramName] : usedImageNames;
  const failures: string[] = [];
  for (const name of names) {
    try {
      const source = renderDiagram(name), file = join(OUTPUT_DIR, `${name}.svg`);
      await validateSvg(name, source);
      if (check) {
        if (!existsSync(file) || readFileSync(file, "utf8") !== source) throw new Error(`${relative(ROOT, file)} is stale. Run pnpm generate:images.`);
      } else {
        writeFileSync(file, source);
        if (preview) await sharp(Buffer.from(source)).png().toFile(join(preview, `${name}.png`));
        console.log(`Generated ${relative(ROOT, file)}`);
      }
    } catch (error) { failures.push(String(error)); }
  }
  if (failures.length) throw new Error(failures.join("\n"));
  if (check) {
    const actualNames = readdirSync(OUTPUT_DIR).filter(name => name.endsWith(".svg")).sort();
    const expectedNames = usedImageNames.map(name => `${name}.svg`).sort();
    if (JSON.stringify(actualNames) !== JSON.stringify(expectedNames)) throw new Error("Unexpected or missing current diagram");
    const references = new Set(currentImageReferences());
    const unused = expectedNames.filter(name => !references.has(name));
    if (unused.length) throw new Error(`Generated diagrams are not used: ${unused.join(", ")}`);
    for (const file of ["README.md", ...glob.sync("docs/**/*.{md,mdx}", { cwd: ROOT }), ...glob.sync("src/**/*.{ts,tsx}", { cwd: ROOT })]) {
      const source = readFileSync(join(ROOT, file), "utf8");
      if (/static\/img\/v\d|\/img\/v\d/.test(source)) throw new Error(`${file}: current content reuses frozen artwork`);
      if (/(?:docs\/img\/|\.\.?\/img\/)[^\s)'\"]+\.(?:png|jpe?g|gif|webp)/i.test(source)) throw new Error(`${file}: use the current generated SVGs`);
    }
  }
  console.log(`${check ? "Verified" : "Generated"} ${names.length} diagrams.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
