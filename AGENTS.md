# Repository Guidelines

## Project Structure & Module Organization

This is a Vite + React TypeScript app for converting uploaded images into perler bead pixel patterns. Runtime source lives in `src/`: `App.tsx` contains the main UI flow, `main.tsx` mounts React, `imageProcessing.ts` holds canvas and palette utilities, and `styles.css` contains app styling. Unit tests are colocated with source as `*.test.ts`, currently `src/imageProcessing.test.ts`. Static entry files and build configuration live at the repo root: `index.html`, `vite.config.ts`, `tsconfig.json`, and `tsconfig.app.json`. Production output is generated into `dist/` and should not be edited manually.

## Build, Test, and Development Commands

- `npm install`: install dependencies from `package-lock.json`.
- `npm run dev`: start the Vite dev server on `0.0.0.0` for local browser testing.
- `npm test`: run the Vitest suite once.
- `npm run build`: run TypeScript project checks with `tsc -b`, then create the Vite production build.
- `npm run preview`: serve the built app locally for production-build verification.

Run `npm test` and `npm run build` before opening a pull request when behavior or types change.

## Coding Style & Naming Conventions

Use TypeScript modules with explicit exports for shared utilities. Follow the existing style: two-space indentation, single quotes, no semicolons, and trailing commas in multiline calls or objects. React components and type names use `PascalCase`; functions, variables, and hooks use `camelCase`; constants use `UPPER_SNAKE_CASE` when they represent fixed configuration, such as pixel limits. Keep canvas/image algorithms in `imageProcessing.ts` unless they become broadly reusable.

## Testing Guidelines

Vitest is the test runner. Name test files `*.test.ts` or `*.test.tsx` and colocate them beside the code they cover. Prefer deterministic tests using small in-memory `ImageData` fixtures rather than browser screenshots for image-processing logic. Add or update tests for palette matching, sampling, color adjustment, transparency handling, and error-prone edge cases before changing those algorithms.

## Commit & Pull Request Guidelines

The current history uses Conventional Commit style, for example `chore: initial commit`. Continue with short, imperative messages such as `fix: preserve transparent pixels` or `feat: add palette controls`. Pull requests should include a clear summary, testing results, linked issues when applicable, and screenshots or short recordings for visible UI changes. Note any generated files, dependency updates, or intentionally skipped checks.
