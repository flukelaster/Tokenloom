# Contributing to Tokenloom (DS Forge)

Thank you for contributing to **Tokenloom (`DS Forge`)**! Our goal is to make deterministic, native Figma Design System generation accessible, transparent, and open source.

---

## Local Setup

1. **Prerequisites**:
   - Node.js `>= 20`
   - `pnpm` `>= 9`

2. **Install & Verify**:
   ```bash
   pnpm install
   pnpm verify
   pnpm exec playwright install chromium
   pnpm test:ui
   ```

3. **Develop the Studio UI in Browser**:
   ```bash
   pnpm dev:ui
   ```
   Opens `http://localhost:5173` with a built-in standalone simulation bridge (`src/ui/bridge.ts`) so you can iterate on UI/UX, Light/Dark themes, and token exports without reloading Figma Desktop.

---

## Architecture & Guardrails

1. **Zero Network Access (`manifest.json`)**:
   - `networkAccess.allowedDomains` MUST remain `["none"]`.
   - All UI icons, brand logos (`src/ui/components/LibraryLogo.tsx`), and styles must bundle inline into `dist/ui.html` via `vite-plugin-singlefile`.
2. **QuickJS Sandbox Compatibility (`src/plugin/**`, `packages/**`, `libraries/**`)**:
   - Figma's plugin main thread executes inside QuickJS rather than Chromium V8.
   - Avoid Node/browser-only globals (`URL`, `window`, `document`, `fetch`) in `packages/*`, `libraries/*`, and `src/plugin/*`.
   - `pnpm check:release` executes compiled `dist/plugin.js` inside an isolated VM context to catch unsupported globals automatically.
3. **Clean-Room Open-Source Provenance (`libraries/**`)**:
   - Only reference permissive open-source upstream packages (`MIT` or `Apache-2.0`).
   - Strictly exclude commercial/Pro/Premium kits, proprietary font binaries, and unlicensed third-party community files.
   - For `Apache-2.0` packages, always populate `noticeText` and `modifications` in the library manifest and update [`NOTICE`](./NOTICE).

---

## Adding or Promoting a Library Adapter

1. Create `libraries/<library-id>/index.ts` (see `libraries/shadcn` or `libraries/antd` as reference implementations).
2. Define:
   - `source` provenance & license metadata
   - 3-tier token definitions (`Primitives`, `Semantic` Light/Dark, `Component`) with `en` & `th` usage guidance
   - Auto Layout component recipes (`variantAxes`, `componentProperties`, `contrastPairs`)
   - Composed `patterns` and `previewFixture`
3. Register the library in `libraries/index.ts` and ensure `<LibraryLogo libraryId="<library-id>" />` has an inline SVG vector mark in `src/ui/components/LibraryLogo.tsx`.
4. Run `pnpm audit:packages && pnpm verify && pnpm test:ui` and confirm `generateReady=true`.

---

## Pull Request Checklist

- [ ] `pnpm verify` passes (`typecheck`, `audit:packages`, `vitest`, `build`, and `check:release` QuickJS VM check)
- [ ] `pnpm test:ui` passes all Playwright E2E tests at both `840×680` and `480×680`
- [ ] Unit or integration tests added/updated under `tests/` for new engine or runtime behavior
- [ ] License provenance audited (no proprietary assets or external URLs introduced)
