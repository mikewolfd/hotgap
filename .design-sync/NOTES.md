# design-sync notes — @hotgap/design-system

## Build
- Monorepo workspace `design-system/` (`@hotgap/design-system`). Build: `npm run build --workspace @hotgap/design-system` (tsup → `dist/index.js` + `dist/index.d.ts`; React/d3 external).
- Converter args: `--entry ./design-system/dist/index.js`, `--node-modules ./node_modules` (repo root — npm hoists, so `design-system/node_modules` is empty and lacks react).
- `cssEntry: src/styles.css` is the single stylesheet (tokens + component classes + dark mode).

## Origin (important for re-sync)
- This DS is a **hand-built extraction** of the shipped app's components (`app/src/**`), not generated from them. `design-system/src/styles.css` is a curated copy of `app/src/styles.css` (tokens + component classes). If the app's tokens or a component (esp. `CurveChart`) change, **re-port by hand** — there is no automated link.
- `CurveChart` was ported from `app/src/result/CurveChart.tsx` but decoupled: DS-local `CurveAnalysis` type, inline plain-English copy (no i18n `t()`), `unit` prop instead of the app's context object.

## Known render warns (checked, benign — re-sync should not treat as new)
- `[RENDER_THIN] ChoroplethMap` — the map is pure SVG `<path fill>` with **no text nodes**, so the thinness heuristic reads it as "paints nothing." Confirmed via `_screenshots/review/general__ChoroplethMap.png`: all 51 states render, shaded on the clay ramp, Oregon darkest. Not a failure.

## Re-sync risks / what can silently go stale
- **Sample data is inlined** in the preview `.tsx` for `CurveChart` (a `CurveAnalysis`) and `ChoroplethMap` (a `StateValues` spread across ~51 states). Illustrative, not live app data — safe, but won't reflect real numbers.
- **CurveChart far-right tick** clips `$100k`→`$100l` at narrow card width — faithful to the shipped app's tick logic, cosmetic, graded good.
- **Chromium for the render check**: no `~/.cache/ms-playwright/`; the check used a chromium available from the repo's Playwright e2e setup. A fresh clone may need `npx playwright install chromium` before validate.
- `us-atlas/states-albers-10m.json` geometry is bundled from the npm dep (pinned `^3.0.1`).
