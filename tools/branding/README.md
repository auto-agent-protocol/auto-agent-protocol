# AAP brand assets

The AAP identity is three connected circles labeled **A · A · P**, with a
matching rounded wordmark. The primary color is `#2874D7`; the inverse version
is white. The symbol and lettering have transparent backgrounds.

## Choose an asset

| Placement | Asset |
| --- | --- |
| Navigation and footer | [2380 px blue wordmark](../../static/img/brand/aap-wordmark.png) / [white wordmark](../../static/img/brand/aap-wordmark-white.png) |
| Avatars and compact website placements | [1024 px blue symbol](../../static/img/brand/aap-symbol.png) / [white symbol](../../static/img/brand/aap-symbol-white.png) |
| Vector workflows | [Blue wordmark](../../static/img/brand/aap-wordmark.svg) / [white wordmark](../../static/img/brand/aap-wordmark-white.svg); [blue symbol](../../static/img/brand/aap-symbol.svg) / [white symbol](../../static/img/brand/aap-symbol-white.svg) |
| Browser tabs | [Transparent 16/32/48/256 px ICO](../../static/img/brand/favicon.ico); an [SVG export](../../static/img/brand/favicon.svg) is also available |
| iOS home-screen bookmarks | [Transparent 180 px touch icon](../../static/img/brand/apple-touch-icon.png) |
| README and social/link previews | [1200 × 630 card](../../static/img/brand/aap-social-card.png) |

Browser placements use the transparent PNG exports to avoid low-resolution
SVG mask rendering in WebKit on high-density screens. The vector masters and
the logo's geometry remain unchanged.

Use the blue artwork on light backgrounds and white artwork on dark backgrounds.
Preserve the aspect ratio and leave clear space of at least one-quarter of the
symbol's width. Do not stretch, recolor with CSS filters, add shadows to the
mark, or set the project name again next to the full wordmark. Use meaningful
alternative text: “Auto Agent Protocol” for a brand link and an empty string
only when the image is genuinely decorative.

## Edit and regenerate

The editable master is [artwork.mjs](artwork.mjs). Both the symbol and the
wordmark are native vector paths: no font downloads or raster-image tracing
are needed. The lettering is custom-drawn to match the approved visual
direction, not asserted to be the exact font used by A2A. The supporting copy
on the social card uses a system sans-serif font.

```sh
pnpm generate:branding
pnpm check:branding
pnpm build
pnpm check:branding --build
```

Commit the master, all generated outputs, and `assets.json` together. The
manifest binds the exports to their source files and checks their hashes
without depending on cross-platform font rendering. Review the social card
visually after regeneration because system fonts can vary by OS.

Branding generation updates the current public brand assets and unversioned
logo/favicon/banner aliases. Historical versioned artwork remains byte-for-byte
unchanged. Do not regenerate or overwrite images under released snapshot paths.

## Explanatory diagrams

The current 32 diagrams are native SVGs generated from
[`image-specs.ts`](../image-specs.ts) and [`generate-images.ts`](../generate-images.ts).
They share one palette, accessible titles/descriptions and the canonical symbol.
The generator measures rendered text widths and checks every current reference.

```sh
pnpm generate:images
pnpm check:images
# Optional local PNG exports for visual review:
pnpm generate:images --preview-dir=/tmp/aap-visual-review
# Regenerate a single diagram after a targeted correction:
pnpm generate:images --only=discovery-flow
```

Review every changed diagram at full size and in the website, including mobile.
Check reading order, factual labels, text boundaries and connector placement.
The website links to full-size diagrams for detailed inspection. Automated width
checks complement visual review; they do not replace it.

CI verifies asset dimensions, transparency-capable PNGs, favicon frames,
source/export consistency, retired-artwork hashes, and shared branding on
every built documentation page. Hash checks catch identical retired assets,
not arbitrary visual alterations; newly added illustrations still need review.

## Relationship to A2A

The original visual direction referenced [A2A](https://a2a-protocol.org/)
through blue and connected circles. AAP 3.0 retains that independent identity
while treating MCP, A2A and PAP as native interfaces. The production paths are independently drawn for AAP.
This is AAP branding, not an official A2A logo, certification, or endorsement.
The repository's software license does not grant rights to third-party marks;
any A2A brand-permission questions should be confirmed with the mark owner
before external promotion.
