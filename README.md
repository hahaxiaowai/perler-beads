# Perler Beads

A Vite + React tool for turning uploaded images into bead-sized pixel art patterns.

## Current Features

- Upload JPG, PNG, or WebP images and crop them to a bead grid.
- Tune brightness, contrast, saturation, color count, and speckle cleanup.
- Switch between English and Chinese UI copy.
- Export the clean pixel PNG or a grid-overlay PNG for bead placement.
- Review a bead color inventory with swatches, counts, hex values, and share.
- Estimate a 29 x 29 board layout with board count and bead coordinate ranges.
- Replace any generated color with a selected bead palette color.

## Roadmap

1. Practical pattern exports: grid PNGs, color inventory, and 29 x 29 board layout details.
2. Pattern editing: manual color replacement, brand-specific palettes, and saved projects.
3. Image quality controls: dithering, edge enhancement, background cleanup, and before/after previews.
4. App structure and QA: split panels into focused components and add browser smoke coverage.

## Scripts

```sh
npm install
npm run dev
npm test
npm run test:e2e
npm run build
```

## Development

- `npm run dev` starts the local Vite server.
- `npm test` runs the Vitest suite.
- `npm run test:e2e` runs a Playwright smoke flow against a temporary Vite server.
- `npm run build` type-checks and creates the production build.
