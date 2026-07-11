# HotGap Escape Metrics Implementation Plan (Plan 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Refocus both doors on the owner's core question — *how hard is it to get off public benefits safely, and at what thresholds?* — via three derived numbers: the **safe exit** (earnings past which more pay never hurts again), the **leap** (the raise you must clear in one move to cross the worst trap), and **program thresholds** (where each kind of help ends).

**Architecture:** Pure derivation from data we already have. New `escapeAnalysis()` in `@hotgap/shared` consumes the existing 101-point curves; the pipeline gains a `--from-data` mode that recomputes `summary.json` from the committed state files (no network); the personal door gains a "path off help" section; the places door gains a metric picker (leap vs. biggest loss) and threshold lines in the drill-down.

**Verified pins (computed from committed data 2026-07-11 — trust these in tests):**
- CA fixture (`fixtures/pe-ca-single-1kid-101.json`): zones [23k→28k, 30k→64k]; `safeExitEarnings === 64000`; `leap === 34000`; programEnds: tanf 23000, snap 29000, headstart 30000, eitc 50000, medicaid 57000, aca 84000; `benefitsEndEarnings === 84000`.
- Committed single-2 states: OR safeExit 90000 / leap 47000; WV 65000 / 22000; CA 74000 / 46000; TX 65000 / 22000.

## Global Constraints

All standing constraints (AGPL, TS strict, copy via t()/en.json + readability gate ≤5.9/≤8.0 never raised, show-explain-never-advise, no input logging, 44px/WCAG AA, conventional commits). Branch: `escape-metrics`. Wage/dollar formatting reuses `formatWage`/`formatDollars` from `app/src/lib/narration.ts`. "You would need a raise of about $X" phrasing describes math, not advice — keep it descriptive, never "you should."

---

### Task 21: `escapeAnalysis` in shared

**Files:** Create `shared/src/escape.ts`, `shared/src/escape.test.ts`; modify `shared/src/index.ts` (re-export).

**Produces (exact):**

```ts
export interface EscapeAnalysis {
  safeExitEarnings: number | null; // 0 = always safe (no zones); null = not safe within the sweep
  leap: number;                    // widest danger zone in gross dollars; 0 if none
  leapIsLowerBound: boolean;       // true when an unrecovered zone contributed (real leap may exceed the sweep)
  programEnds: Partial<Record<ProgramId, number>>; // last earnings with value > PROGRAM_END_MIN; omitted if never received or still received at sweep end
  benefitsEndEarnings: number | null; // last earnings where summed program values > BENEFITS_END_MIN; null if still receiving at sweep end
}
export const PROGRAM_END_MIN = 100;
export const BENEFITS_END_MIN = 250;
export function escapeAnalysis(points: CurvePoint[]): EscapeAnalysis
```

- [ ] **Step 1: failing tests** — `shared/src/escape.test.ts`: fixture pins above (every listed value asserted exactly), plus synthetic cases: no-zones curve → safeExit 0 / leap 0; single unrecovered zone → safeExit null, leapIsLowerBound true, leap = axisMax − zoneStart; a program received at the last point → omitted from programEnds; all-zero programs → benefitsEndEarnings null? (define: never above threshold → null and distinguish nothing-received via programEnds empty — assert benefitsEndEarnings === null for an all-zero curve).

- [ ] **Step 2: implement** — `shared/src/escape.ts`:

```ts
import type { CurvePoint, ProgramId } from "./types.js";
import { PROGRAM_IDS } from "./types.js";
import { analyzeCurve } from "./analyze.js";

export const PROGRAM_END_MIN = 100;
export const BENEFITS_END_MIN = 250;

export interface EscapeAnalysis {
  safeExitEarnings: number | null;
  leap: number;
  leapIsLowerBound: boolean;
  programEnds: Partial<Record<ProgramId, number>>;
  benefitsEndEarnings: number | null;
}

export function escapeAnalysis(points: CurvePoint[]): EscapeAnalysis {
  const a = analyzeCurve(points, 0);
  const axisMax = points[points.length - 1].earnings;
  const zones = a.dangerZones;
  const last = zones[zones.length - 1];
  const safeExitEarnings = zones.length === 0 ? 0 : last.endEarnings;

  let leap = 0;
  let leapIsLowerBound = false;
  for (const z of zones) {
    const width = (z.endEarnings ?? axisMax) - z.startEarnings;
    if (width > leap) {
      leap = width;
      leapIsLowerBound = z.endEarnings === null;
    }
  }

  const programEnds: Partial<Record<ProgramId, number>> = {};
  for (const id of PROGRAM_IDS) {
    let lastAbove: number | null = null;
    for (const p of points) if ((p.programs[id] ?? 0) > PROGRAM_END_MIN) lastAbove = p.earnings;
    if (lastAbove !== null && lastAbove < axisMax) programEnds[id] = lastAbove;
  }

  let benefitsEnd: number | null = null;
  for (const p of points) {
    const total = PROGRAM_IDS.reduce((sum, id) => sum + (p.programs[id] ?? 0), 0);
    if (total > BENEFITS_END_MIN) benefitsEnd = p.earnings;
  }

  return {
    safeExitEarnings,
    leap,
    leapIsLowerBound,
    programEnds,
    benefitsEndEarnings: benefitsEnd === axisMax ? null : benefitsEnd,
  };
}
```

- [ ] **Step 3:** green + typecheck + commit `feat(shared): escape analysis — safe exit, leap, program thresholds`.

---

### Task 22: Pipeline `--from-data` + extended summary

**Files:** `pipeline/src/build.ts` (+test), `pipeline/src/run.ts` (+test), regenerated `app/src/data/places/summary.json` (controller runs the regeneration).

- Summary metrics per state×archetype gain `safeExit: number | null` and `leap: number` (from `escapeAnalysis`; keep existing three fields).
- `run.ts` gains `--from-data`: skip fetching; read every `app/public/data/states/{ST}.json`, rebuild ONLY `summary.json` from the stored points (state files untouched). Validation still enforces 51×8×101.
- Tests: builder emits new fields (fixture-driven); `--from-data` round-trip on 2 synthetic state files.
- The controller (not you) will run `npx tsx pipeline/src/run.ts --from-data` after review and commit the regenerated summary.
- Commit `feat(pipeline): escape metrics in summary; offline --from-data recompute`.

---

### Task 23: Personal door — "Your path off help"

**Files:** `app/src/lib/narration.ts` (+tests), `app/src/result/ResultPage.tsx`, new `app/src/result/EscapePath.tsx`, `app/src/strings/en.json`.

- New narration helper `narrateEscape(esc: EscapeAnalysis, ctx: PayContext): EscapeNarration` returning `{ safeLine: string | null; leapLine: string | null; thresholds: { label: string; wage: string }[] }`:
  - safeLine: safeExit > 0 → `t("escape.safe", {wage})` ("Past {wage}, more pay always helps you."); safeExit === null → `t("escape.safeNever")` ("Even at the top of our chart, we did not find a fully safe spot."); safeExit === 0 → null (the always-up verdict already says it).
  - leapLine: leap > 0 → `t("escape.leap", {amount})` ("To get past the worst rough zone in one move, it takes a raise of about {amount} a year.") or `escape.leapMore` ("…more than {amount}…") when lower-bound. leap === 0 → null.
  - thresholds: programEnds sorted by earnings ascending, max 5, each `{ label: t("program.<id>"), wage: formatWage(earnings, ctx) }`.
- `EscapePath.tsx`: renders a titled section (`escape.title` "Your path off help") with the two lines and a plain list "When help ends for you:" (`escape.endsTitle`) — "{label}: near {wage}" (`escape.ends`). Rendered on the result page AFTER WhyList, only when `benefitsEndEarnings !== null || leap > 0 || Object.keys(programEnds).length > 0`.
- ResultPage: compute `escapeAnalysis(points)` alongside the existing analysis (both live and fallback paths — on fallback the banner already frames approximation).
- Strings (tune only for the gate): keys above; all descriptive, no advice.
- Tests: narrateEscape unit tests on the fixture (safe "past $30.75 an hour"? compute: 64000/2080 = 30.77 → rounds $30.75 an hour at 40h — assert contains "$30.75 an hour"), leap $34,000, thresholds ordering (tanf first, aca last), null/zero branches. Component render smoke via existing jsdom pattern.
- e2e: extend the main flow test — the mocked curve already produces a danger zone; assert the escape section heading is visible.
- Commit `feat(app): path-off-help section — safe wage, the leap, thresholds`.

---

### Task 24: Places door — the leap as a first-class metric

**Files:** `app/src/pages/PlacesPage.tsx` (+tests), `app/src/pages/StatePanel.tsx` (+tests), `en.json`, `app/e2e/places.spec.ts`, spec + README, `docs/post-merge-notes.md` cleanup if touched items get fixed.

- **Metric picker** (two chips above the legend, same choice-chip idiom): `places.metric.loss` ("Biggest loss") and `places.metric.leap` ("The jump to get out") — **default: leap** (it answers the owner's question). Map fill + legend switch accordingly: leap legend `places.legend.leapUpTo` ("Needs a jump of up to {amount}"); loss keeps existing strings. Null safeExit/leap-lower-bound states: color by leap value (already numeric); no special casing on the map.
- **Drill-down additions** (StatePanel, after the headline): `places.panel.safe` ("Earning more is fully safe here after about {amount} a year.") / `places.panel.safeNever` ("Even at $100,000 a year, this family still hits rough spots here.") and `places.panel.leap` ("Getting past the worst rough zone takes a raise of about {amount} in one move."). Plus "When help ends here:" list reusing the escape thresholds (compute `escapeAnalysis` on the lazy-loaded points — no new data needed) with the same `escape.ends`-style lines (reuse `escape.endsTitle`/`escape.ends` strings from Task 23; year-unit wages).
- Rank line follows the SELECTED metric (worse = bigger leap or bigger loss).
- e2e: toggle metric chips → at least one state fill changes; drill-down asserts the safe/leap lines render with dollar amounts.
- Docs: spec section 2 gains the core-question framing + the three metrics; README one-liner. Mission paragraph in the spec gains: "The product's core question: how hard is it to get off public benefits safely, and at what thresholds?"
- Commit(s) conventional.

---

### Task 25: Final review + merge

Filtered review package (exclude regenerated summary.json hunks beyond stat), whole-branch reviewer on the most capable model, fix Criticals/Importants, merge `escape-metrics` to main after gates.

## Self-review notes
- escapeAnalysis intentionally reuses analyzeCurve's zone semantics (CLIFF_MIN hysteresis) so personal-door verdicts and escape numbers can never disagree.
- summary.json regeneration is offline (`--from-data`) — no API load, byte-stable state files.
- The map default changing to "the jump" is an owner-direction call (this plan's goal); the loss metric stays one tap away.
