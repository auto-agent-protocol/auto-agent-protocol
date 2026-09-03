# Documentation artwork

The former browser-screenshot sources have been retired. They duplicated layout CSS, used several unrelated palettes, and allowed text to drift away from the protocol.

Current artwork is generated from two reviewed TypeScript files:

- `tools/image-specs.ts` owns the words and diagram structure.
- `tools/generate-images.ts` owns the shared visual system and validation.

Run `pnpm generate:images` after changing either source. Commit the generated `docs/img/*.svg` files so pull requests show both the semantic source change and the exact vector output. `pnpm check:images` rejects stale output, obsolete pricing language, colors outside the AAP palette, missing accessibility metadata, unreferenced diagrams, and current pages that reuse frozen release artwork.

Release preparation copies `docs/img` into the versioned documentation snapshot. Never regenerate or edit artwork inside a released version.
