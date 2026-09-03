// Editable vector source. Lettering is drawn as paths, so exports do not depend
// on installed fonts, remote font services, or raster generation.
export const BLUE = '#2874d7';
export const WORDMARK_WIDTH = 1190;
export const WORDMARK_HEIGHT = 200;

const a = 'M18 64 39 14 60 64 M25 47H53';
const p = 'M145 186V136H164Q182 136 182 152T164 168H145';

export function symbol(color = BLUE) {
  return `<defs>
    <mask id="aap-symbol" maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="200">
      <g fill="white">
        <circle cx="100" cy="100" r="83" fill="none" stroke="white" stroke-width="8"/>
        <circle cx="39" cy="39" r="39"/>
        <circle cx="100" cy="100" r="39"/>
        <circle cx="161" cy="161" r="39"/>
      </g>
      <g fill="none" stroke="black" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="${a}"/><path d="${a}" transform="translate(61 61)"/><path d="${p}"/>
      </g>
    </mask>
  </defs>
  <path fill="${color}" mask="url(#aap-symbol)" d="M0 0H200V200H0Z"/>`;
}

// Rounded geometric lettering matches the approved AAP concept. These are
// custom paths, not a claim to use A2A's unidentified original font.
const glyphs = {
  A: [50, 'M0 60 24 0 48 60 M9 40H39'],
  u: [40, 'M0 18V44Q0 60 16 60H22Q38 60 38 46 M38 18V60'],
  t: [30, 'M13 5V46Q13 60 28 60 M0 20H30'],
  o: [40, 'M17 18H23Q40 18 40 35V43Q40 60 23 60H17Q0 60 0 43V35Q0 18 17 18Z'],
  g: [40, 'M38 20V66Q38 79 24 79H14Q4 79 2 73 M38 31Q38 18 23 18H17Q0 18 0 35V43Q0 60 17 60H23Q38 60 38 46'],
  e: [40, 'M38 51Q36 60 23 60H17Q0 60 0 43V35Q0 18 17 18H23Q40 18 40 35V39H0'],
  n: [40, 'M0 60V20 M0 30Q0 18 17 18H23Q40 18 40 35V60'],
  P: [43, 'M0 60V0H23Q43 0 43 17T23 34H0'],
  r: [28, 'M0 60V20 M0 34Q0 18 22 18H28'],
  c: [38, 'M38 22Q33 18 23 18H17Q0 18 0 35V43Q0 60 17 60H23Q33 60 38 56'],
  l: [14, 'M0 0V49Q0 60 12 60'],
};

export function lettering(color = BLUE) {
  let x = 0;
  const paths = [...'Auto Agent Protocol'].map(character => {
    if (character === ' ') { x += 29; return ''; }
    const [width, path] = glyphs[character];
    const result = `<path transform="translate(${x} 0)" d="${path}"/>`;
    x += width + 12;
    return result;
  }).join('');
  return `<g transform="translate(256 65) scale(1.04)" fill="none" stroke="${color}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">${paths}</g>`;
}

export function svg(content, width, height, title = 'Auto Agent Protocol') {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title"><title id="title">${title}</title>${content}</svg>\n`;
}

export function icon(color = BLUE) { return svg(symbol(color), 200, 200, 'AAP'); }
export function wordmark(color = BLUE) { return svg(symbol(color) + lettering(color), WORDMARK_WIDTH, WORDMARK_HEIGHT); }

export function socialCard() {
  return svg(`<path fill="#fff" d="M0 0H1200V630H0Z"/>
    <path fill="${BLUE}" d="M0 0H1200V12H0Z"/>
    <g transform="translate(84 125) scale(.87)">${symbol()}${lettering()}</g>
    <text x="84" y="392" font-family="Arial, Helvetica, sans-serif" font-size="33" fill="#20364f">The open automotive retail profile of A2A</text>
    <path stroke="#dce5f0" d="M84 462H1116"/>
    <text x="84" y="523" font-family="Arial, Helvetica, sans-serif" font-size="24" fill="#52657c">Discover dealerships. Browse inventory. Connect with consent.</text>
    <text x="84" y="578" font-family="Arial, Helvetica, sans-serif" font-size="20" fill="${BLUE}">autoagentprotocol.org</text>`, 1200, 630);
}
