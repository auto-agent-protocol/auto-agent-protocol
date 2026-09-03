# AAP brand assets

The AAP identity is three connected circles labeled **A · A · P**, with a
matching rounded wordmark. The primary color is `#2874D7`; the inverse version
is white. The symbol and lettering have transparent backgrounds.

## Choose an asset

| Placement | Asset |
| --- | --- |
| Navigation, homepage, README | [Blue wordmark](../../static/img/brand/aap-wordmark.svg) / [white wordmark](../../static/img/brand/aap-wordmark-white.svg) |
| Avatars, integrations, compact placements | [Blue symbol](../../static/img/brand/aap-symbol.svg) / [white symbol](../../static/img/brand/aap-symbol-white.svg) |
| Raster-only consumers | [1024 px symbol](../../static/img/brand/aap-symbol.png) / [2380 px wordmark](../../static/img/brand/aap-wordmark.png) (white PNG variants are also provided) |
| Browser tabs | [SVG favicon](../../static/img/brand/favicon.svg), with a [16/32/48/256 px ICO fallback](../../static/img/brand/favicon.ico) |
| iOS home-screen bookmarks | [180 px touch icon](../../static/img/brand/apple-touch-icon.png) |
| Social/link previews | [1200 × 630 card](../../static/img/brand/aap-social-card.png) |

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

Branding generation owns the historic public logo/favicon and promotional
banner URLs as compatibility aliases. They serve the new artwork; no obsolete
binary is retained. The former banner HTML source was removed so the diagram
generator cannot overwrite the brand exports. The unused legacy hero was
removed. All historical explanatory diagrams and released contract text are
unchanged. Git history is intentionally not rewritten.

CI verifies asset dimensions, transparency-capable PNGs, favicon frames,
source/export consistency, retired-artwork hashes, and shared branding on
every built documentation page. Hash checks catch identical retired assets,
not arbitrary visual alterations; newly added illustrations still need review.

## Relationship to A2A

The visual direction was requested to reflect AAP's role as an automotive
retail profile of [A2A](https://a2a-protocol.org/), using its blue and connected
circles as a reference. The production paths are independently drawn for AAP.
This is AAP branding, not an official A2A logo, certification, or endorsement.
The repository's software license does not grant rights to third-party marks;
any A2A brand-permission questions should be confirmed with the mark owner
before external promotion.
