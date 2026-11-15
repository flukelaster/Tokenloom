## Summary

<!-- Briefly describe what this PR introduces or fixes -->

## Verification Checklist

- [ ] `pnpm verify` passes (`typecheck`, `audit:packages`, `vitest`, `build`, `check:release` QuickJS VM check)
- [ ] `pnpm test:ui` passes Playwright E2E UI tests (`840×680` & `480×680`)
- [ ] `manifest.json` preserves `networkAccess.allowedDomains: ["none"]`
- [ ] Upstream open-source license provenance verified (if touching `libraries/`)
