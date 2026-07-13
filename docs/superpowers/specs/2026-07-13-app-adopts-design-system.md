# App adopts @hotgap/design-system — Design (Refactor)

**Date:** 2026-07-13
**Status:** Approved (user chose full adoption incl. CurveChart via a `labels` prop). Building via subagent-driven development.

## Goal

Make the deployed app (`app/`) consume `@hotgap/design-system` as its single source of UI components and styling, instead of its own parallel copies. This also carries the v0.2/v0.3 audit fixes (accessibility, correctness, honest copy) into production, which the app currently lacks because the DS was a hand-extraction that then improved independently.

## Non-negotiable constraints (carried from the app)

- **Copy discipline stays.** All user-facing copy remains in `app/src/strings/en.json` and must pass the readability gate (corpus ≤5.9, per-string ≤8.0, never raised). DS components receive copy as **props** — they never supply user-facing English to the app. This is why CurveChart gets a `labels` prop.
- TypeScript strict; AGPL-3.0; no input logging; 44px/WCAG AA; show-explain-never-advise; conventional commits.
- The 283-test suite, readability gate, and Playwright e2e stay green; the app redeploys at the end.

## Architecture

**Styling.** The app imports `@hotgap/design-system/styles.css` (the v0.3 base — tokens, component classes, all the a11y/contrast/motion fixes) plus a small **app-supplemental** `app/src/app.css` holding only the page/layout classes the DS doesn't own: `.landing*`, `.hero`, `.places-page`, `.places-panel*`, `.places-picker`, `.places-metric-picker`, `.places-state-select-row`, `.gets-row`, `.confirm-row`, `.kid-age-row`, `.hours-row`, `.error-text`, `.county-note`, `.landing-foot`, and the `100dvh` shell/loading overrides. The app's current monolithic `styles.css` is reduced to that supplemental set; every component class it duplicated (`.primary`, `.toggle`, `.why-item`, `.honesty`→`.callout`, `.curve-chart`, `.drop-*`, `.escape-*`, `.stepper`, `.input`, `.door*`, etc.) is deleted and comes from the DS sheet.

**Components.** Each duplicated app component is replaced by its DS counterpart, fed `t()` copy:

| App usage | DS component | Copy via |
|---|---|---|
| `.primary/.ghost/.choice` buttons | `Button` | children |
| `.input` + label | `Field` | `label`/`hint`/`error` props |
| kids/age counters | `Stepper` | `caption` prop |
| single-select choice rows | `RadioGroup` | `legend` + option labels |
| `Toggles.tsx` | `CheckboxGroup` (multi-select "what help") | `legend` + option labels |
| landing doors | `Door` (+ `Shell`) | `title`/`description`/`cta` |
| loading | `Spinner` | `label` |
| verdict h1 | `VerdictHeadline` | `tone` from verdict enum + children |
| honesty box | `Callout` | `tone` + children |
| `WhyList.tsx` | `WhyList` | `items` |
| `EscapePath.tsx` | `EscapePath` | line props |
| result chart | `CurveChart` (+ new `labels`) | `analysis` + `labels` from `t()` |
| places map | `ChoroplethMap` | `values` + `formatValue` |
| places legend | `Legend` | `rampLegendItems(...)` |
| state dropdown | `Select` | `label` + options |
| places panel | `Card` | `title`/`subtitle` + children |

App component files fully replaced are deleted (`result/CurveChart.tsx`, `result/Toggles.tsx`, `result/WhyList.tsx`, `result/EscapePath.tsx`).

**CurveChart `labels` prop (DS change).** Add an optional `labels?: CurveChartLabels` to the DS `CurveChart`, defaulting to the current inline English (so it still works standalone in Claude Design). Shape covers every user-facing string: `title, alt, xLabel(unit), yLabel, youAreHere, dangerZone, dropHint, close, markerLabel(pay,amount), cardAmount(pay,amount), cardLose, cardNone`, and a `programLabel(id)` mapper. The app passes these from `en.json` via `t()`, so chart copy stays gate-checked. The `analysis` prop already accepts the shared `CurveAnalysis` structurally (extra fields ignored).

**Types.** The app's `@hotgap/shared` `CurveAnalysis` is structurally compatible with the DS `CurveChart` prop (points/cliffs/dangerZones/current* all present). No shared-type change needed; the app may pass its analysis directly.

**Content back-port.** `en.json` copy flagged by the audit is corrected in the same pass (gate-checked): `result.verdict.cliff_ahead` "Watch out near {wage}" → neutral; `escape.title` "Your path off help" → neutral; `places.metric.leap`/`places.legend.titleLeap` "the jump to get out" → neutral threshold wording; program "tax credit" → "tax break".

## Testing

Keep every test; update the ~5 UI test files for the new component structure (DS classNames/roles instead of app-local ones). Add/adjust: RadioGroup radios (role=radio), CheckboxGroup, Progress, Select on places, the CurveChart `labels` wiring (assert the app still renders its `t()` copy, e.g. the neutral verdict). Readability re-run after en.json edits. e2e updated for any changed roles/text. All gates green before redeploy.

## Out of scope

- No change to the worker, shared math, pipeline, or committed data.
- No new features; behavior parity (plus the audit fixes).
- Class-name prefixing / src reorg (the two deliberately-deferred DS items) stay deferred.

## Risks

- **Test churn** is the main cost — many tests key on app-local classNames. Mitigated by doing the swap component-by-component with the suite run after each.
- **Visual parity** — verify the result/places/flow screens render unchanged (plus the fixes) via the existing e2e + a screenshot spot-check before redeploy.
- **CurveChart labels surface** — a chunky prop; keep it a single optional object with English defaults so the DS stays clean for standalone use.

## Branch

`app-uses-ds` (off `main`; the DS `labels` change lands here too and is a superset-compatible addition).
