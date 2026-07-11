# HotGap Places Door Implementation Plan (Plan 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the places door — a state choropleth of "biggest possible loss" gap scores with drill-down — plus archetype fallback curves for the personal door's error path, fed by a weekly batch pipeline.

**Architecture:** A TypeScript pipeline (`pipeline/` workspace, run with tsx) sweeps 51 states × 8 household archetypes through the SAME public PolicyEngine `/us/calculate` endpoint and the SAME `@hotgap/shared` parse/analyze math the app uses — the map and the personal door can never disagree. It emits a small bundled `summary.json` (map scores) and per-state lazy-fetched JSON (full curves for drill-down + personal-door fallback). The places stub becomes a real page: d3-geo choropleth over us-atlas TopoJSON, archetype picker, plain-language drill-down.

**Deviation from spec (adjudicated by controller 2026-07-11):** the spec said "Python + policyengine-us" for the batch. We use the live API + shared TS math instead: 408 requests/week is negligible load (MyFriendBen runs production screeners on this API; our nightly contract test already exercises it), it eliminates a heavy Python dependency from CI, and it guarantees numeric consistency with the personal door. Switching to a local engine later is a pipeline-internal change. Task 19 records this in the spec.

**Tech Stack additions:** tsx (pipeline runner), d3-geo, topojson-client, us-atlas (all from npm; us-atlas 3.0.1 / topojson-client 3.1.0 verified available).

## Verified ground truth (probed live 2026-07-11)

- Heaviest archetype (married, 3 kids, full variable set, 101-point axis) returns 200 in ~4.1 s. TX married-3-kids has a **$33,680 cliff at $63k earnings** — the map data is dramatic.
- 51 × 8 = 408 requests at concurrency 3 ≈ 10 minutes wall-clock.
- All variable placements as pinned by `contract/policyengine.contract.test.ts` (4 tests, green today).

## Global Constraints

(All Plan 1 constraints remain: AGPL-3.0-only, TS strict, copy only via `app/src/strings/en.json` + readability gate ≤5.9 corpus / ≤8.0 per-string (never raise limits), show-and-explain-never-advise, no logging of inputs, YEAR=2026 from shared, 44px touch targets, WCAG AA, conventional commits.)

- Branch: `places-door` (from main).
- The pipeline must reuse `parsePEResponse`/`analyzeCurve` from `@hotgap/shared` and `buildPEPayload` from the worker — no re-implemented math or payload building.
- Archetype adults are age 30, not disabled, rent null, childcare $0, spouse income $0 — documented honestly in drill-down copy as "a family like this."
- Map + drill-down numbers must be explainable at 5th grade: "biggest possible loss" = the largest single drop in what a family keeps as pay rises ($0–$100k sweep).
- Implementers of UI tasks read the `dataviz` skill (choropleth: sequential ramp in the danger hue, colorblind-safe, 5 quantized bins, legend in plain words) and `frontend-design:frontend-design`.

## File Structure

```
pipeline/                      package @hotgap/pipeline (new workspace)
├── package.json, tsconfig.json
└── src/
    ├── archetypes.ts          8 archetypes + answersFor(state, archetype)
    ├── metrics.ts             stateMetrics(points): {biggestLoss, dangerWidth, cliffCount}
    ├── build.ts               buildSummary(...), buildStateFile(...) (pure)
    ├── run.ts                 CLI: fetch loop w/ concurrency+retry, validation, file writes
    └── *.test.ts
app/src/data/places/summary.json        (bundled, committed, ~15 KB)
app/public/data/states/{ST}.json        (lazy-fetched, committed, ~80-150 KB each)
app/src/lib/fips.ts                     FIPS→USPS map
app/src/lib/fallback.ts                 pickArchetype(answers) + fetchFallbackCurve()
app/src/pages/PlacesPage.tsx            replaces PlacesStub route
app/src/pages/StatePanel.tsx            drill-down section
app/src/result/ResultPage.tsx           fallback path added
.github/workflows/places-data.yml       weekly refresh
```

## Archetype definitions (canonical — used by pipeline AND fallback picker)

```ts
// pipeline/src/archetypes.ts
import type { HouseholdAnswers } from "@hotgap/shared";

export interface Archetype { id: string; married: boolean; childAges: number[] }

export const ARCHETYPES: Archetype[] = [
  { id: "single-0", married: false, childAges: [] },
  { id: "single-1", married: false, childAges: [3] },
  { id: "single-2", married: false, childAges: [3, 7] },   // default on the map
  { id: "single-3", married: false, childAges: [1, 4, 9] },
  { id: "married-0", married: true, childAges: [] },
  { id: "married-1", married: true, childAges: [3] },
  { id: "married-2", married: true, childAges: [3, 7] },
  { id: "married-3", married: true, childAges: [1, 4, 9] },
];

export const DEFAULT_ARCHETYPE = "single-2";

export function answersFor(state: string, a: Archetype): HouseholdAnswers {
  return {
    state,
    married: a.married,
    childAges: a.childAges,
    childDisabled: a.childAges.map(() => false),
    monthlyRent: null,
    monthlyChildcare: 0,
    annualEarnings: 0,          // the axis varies earnings; this only sets axisMax=100k
    spouseAnnualEarnings: 0,
    age: 30,
    spouseAge: a.married ? 30 : null,
    youDisabled: false,
    spouseDisabled: false,
  };
}
```

## Metrics (pure, TDD against the committed CA fixture)

```ts
// pipeline/src/metrics.ts
import { analyzeCurve, type CurvePoint } from "@hotgap/shared";

export interface StateMetrics { biggestLoss: number; dangerWidth: number; cliffCount: number }

export function stateMetrics(points: CurvePoint[]): StateMetrics {
  const a = analyzeCurve(points, 0);
  const axisMax = points[points.length - 1].earnings;
  return {
    biggestLoss: Math.round(a.worstCliff?.drop ?? 0),
    dangerWidth: Math.round(
      a.dangerZones.reduce((w, z) => w + (z.endEarnings ?? axisMax) - z.startEarnings, 0),
    ),
    cliffCount: a.cliffs.length,
  };
}
```

Fixture expectation (CA, the committed single-parent-one-kid response — NOT one of the 8 archetypes, used only to pin the math): `biggestLoss === 21957`, `cliffCount >= 2`, `dangerWidth > 0`.

## Output schemas

`app/src/data/places/summary.json` (bundled):
```json
{ "generated": "<iso>", "year": "2026",
  "archetypes": [{ "id": "single-2", "married": false, "childAges": [3,7] }, ...],
  "states": { "CA": { "single-2": { "biggestLoss": 21957, "dangerWidth": 34000, "cliffCount": 3 }, ... }, ... } }
```

`app/public/data/states/{ST}.json` (lazy):
```json
{ "generated": "<iso>", "year": "2026", "state": "CA",
  "archetypes": { "single-2": { "points": [{ "earnings": 0, "netIncome": 40881, "programs": { "snap": 5090, ... } }, ...101] , ...} } }
```
Round `netIncome`/program values to whole dollars in state files (halves file size; sub-dollar precision is noise).

---

### Task 16: Pipeline package — archetypes, metrics, builders, CLI

**Files:** `pipeline/package.json`, `pipeline/tsconfig.json`, `pipeline/src/{archetypes,metrics,build,run}.ts` + tests. Root: add `"pipeline"` to workspaces + typecheck; add `tsx` to root devDependencies; add root script `"pipeline": "tsx pipeline/src/run.ts"`. Worker: add `"exports": { ".": "./src/index.ts", "./translate": "./src/translate.ts" }` to `worker/package.json` so the pipeline imports `@hotgap/worker/translate`.

**Interfaces:** Produces the archetype/metrics/schema code above verbatim. `run.ts` accepts `--states CA,TX` (default all 51), `--concurrency 3`, `--dry-run` (build payloads, no fetch); injects fetch for tests; per-request retry ×3 with 2s/8s backoff; on completion validates every state×archetype present with 101 points and finite metrics, else exits 1 listing gaps. TDD: metrics against the CA fixture; builders shape tests; run-loop test with injected fake fetch returning the fixture (2 fake states × 8 archetypes → correct file contents, zero real network).

Steps: failing tests → run → implement → green → `npm test`/`typecheck` → commit `feat(pipeline): state×archetype batch over PolicyEngine API with shared math`.

---

### Task 17: Run the real batch, commit the data

**Steps:**
- [ ] `npx tsx pipeline/src/run.ts --concurrency 3` (~10 min; be patient, do not parallelize beyond 3 — politeness to a free public API).
- [ ] Validation passes (51 states × 8 archetypes × 101 pts). Spot-check: CA single-2 `biggestLoss` > 0; TX married-3 `biggestLoss` ≈ 33680 (±10% tolerance — rules may shift); no state with all-zero metrics.
- [ ] Sanity-print the 5 worst and 5 best states for single-2 in the report.
- [ ] Commit `data: state×archetype gap scores and curves (PolicyEngine sweep <date>)`.

---

### Task 18: Places page — choropleth, archetype picker, drill-down

**Read `dataviz` + `frontend-design:frontend-design` skills first.**

**Files:** `app/src/lib/fips.ts` (FIPS→USPS, 51 entries), `app/src/pages/PlacesPage.tsx`, `app/src/pages/StatePanel.tsx`; modify `App.tsx` route (replace PlacesStub usage; delete `PlacesStub.tsx`), `CurveChart.tsx` (add optional `showCurrent?: boolean` default true — hides you-dot/label when false), `en.json` (new `places.*` strings, readability-gated), `styles.css`. Deps: `d3-geo`, `topojson-client`, `us-atlas` (+ `@types/d3-geo`, `@types/topojson-client`) in app.

**Behavior:**
- Import `summary.json` (bundled) + `us-atlas/states-albers-10m.json`; render `geoPath()` (pre-projected albers — use `geoPath()` with NO projection) per state feature; fill = 5-bin quantize over the selected archetype's `biggestLoss` across states, sequential ramp of the danger hue (light→dark clay red; colorblind-safe by lightness); `stroke: var(--line)`.
- Picker mirrors FamilyScreen idiom: "Just me / Me and my spouse" chips + kids stepper 0–3 → maps to archetype id. Default single-2.
- Legend: quantize thresholds in plain words ("loses up to $2,000" … "loses up to $35,000"), swatches + text.
- Tap/click a state (each `path` is a button role with `aria-label` = state name + its loss) → `StatePanel` below the map: headline `t("places.panel.headline", {state, loss})` ("In {state}, a family like this can lose up to {loss} a year by earning more."), rank line ("Worse than {n} of 50 other states."), the state's curve via `<CurveChart showCurrent={false} …>` fed by lazy `fetch(/data/states/{ST}.json)` + `analyzeCurve(points, 0)`, honesty line ("Numbers for a family like the one you picked. Your real numbers depend on your home."). Loading/error states for the lazy fetch (reuse spinner + a short error string).
- Keyboard: states focusable, Enter selects. Mobile-first: map full-width, panel stacks below.
- All new copy in `en.json`, gate green. Suggested keys/copy (tune to pass the gate): `places.pick.title` "Pick a family to compare", `places.legend.title` "How much can they lose?", `places.panel.headline` "In {state}, a family like this can lose up to {loss} a year by earning more.", `places.panel.rank` "Worse than {n} of 50 other states.", `places.panel.honesty` "These are numbers for the family you picked, not your family. Check your own numbers on the home page.", `places.loading` "Getting this state's numbers…", `places.error` "We could not load this state. Please try again."
- e2e (`app/e2e/places.spec.ts`): visit `#/places`, assert 51 state paths render, archetype picker changes fills (assert at least one path's fill differs after toggling married), click CA (intercept `**/data/states/CA.json` with a small fixture) → panel headline visible with a dollar amount.

Gates: `npm test`, typecheck, readability, build, `npm run e2e`. Commit `feat(app): places door — state gap choropleth with drill-down`.

---

### Task 19: Personal-door fallback, weekly refresh, docs

**Files:** `app/src/lib/fallback.ts` (+test), `app/src/result/ResultPage.tsx`, `en.json`, `.github/workflows/places-data.yml`, `docs/superpowers/specs/2026-07-11-hotgap-design.md`, `README.md`.

**Fallback:**
```ts
// app/src/lib/fallback.ts
import { ARCHETYPES, DEFAULT_ARCHETYPE } from "…";  // move archetypes const into shared? NO —
// duplicate-free rule: pipeline imports from app? Neither. MOVE archetypes.ts to shared/src/archetypes.ts
// in this task (export from @hotgap/shared), update pipeline imports; app + pipeline both consume shared.
export function pickArchetypeId(married: boolean, kidCount: number): string {
  return `${married ? "married" : "single"}-${Math.min(kidCount, 3)}`;
}
export async function fetchFallbackCurve(state: string, married: boolean, kidCount: number, fetchImpl = fetch) { /* fetch /data/states/{state}.json, return archetypes[pickArchetypeId(...)]?.points ?? null; null on any failure */ }
```
- ResultPage: on `{ok:false}` → try `fetchFallbackCurve(answers.state, answers.married, answers.childAges.length)`; if points arrive: render the normal result computed from those points at the user's earnings, with an always-visible banner `t("result.fallback.banner")` ("We could not get your exact numbers right now. These are numbers for a family like yours in your state.") ABOVE the headline, plus the existing Try again button; if fallback also fails → existing error page. Unit-test `pickArchetypeId` (4+ kids clamps to 3); e2e: extend the error-path test — route /api/curve → 502 AND /data/states/** → fixture: banner + chart visible; a second variant where both fail → error page.
- Weekly workflow `places-data.yml`: cron `0 7 * * 1` + workflow_dispatch; checkout, setup-node 22, npm ci, `npx tsx pipeline/src/run.ts --concurrency 3`, then commit-if-changed with the default token (`git config user.name "hotgap-data-bot"`, add the two data paths, diff-index check, commit "data: weekly PolicyEngine sweep", push).
- Spec: update Architecture (pipeline = API + shared TS math, deviation note; fallback = implemented as designed) and mark places door shipped (section 2 no longer provisional — final visuals iterated on real data). README: add places door + data refresh to Develop docs.

Gates: full suite + e2e. Commit `feat(app): archetype fallback curves; weekly data refresh workflow`.

---

### Task 20: Final review + merge

`scripts/review-package $(git merge-base main HEAD) HEAD` → whole-branch reviewer (most capable model) with the deferred list from `docs/post-merge-notes.md` for context; fix Criticals/Importants; merge `places-door` to main after gates.

## Plan self-review notes

- Archetypes single-source: Task 19 moves `archetypes.ts` into `@hotgap/shared` (pipeline + app import it) — Task 16 may create it in pipeline first OR directly in shared; **directly in shared is better** — implementer of Task 16: create `shared/src/archetypes.ts`, export from shared's index, and have pipeline import `@hotgap/shared`. Task 19's fallback then imports the same. (Recorded here so Tasks 16/19 agree.)
- The spec's "danger zone width" secondary metric surfaces only in the drill-down if it fits cleanly; the map colors by biggestLoss only (one message per chart — dataviz).
- summary.json bundling keeps the map instant; state files lazy — no fetch on first paint of the map.
