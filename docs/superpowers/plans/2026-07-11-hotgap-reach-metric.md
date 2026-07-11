# HotGap Reach Metric Implementation Plan (Plan 5)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Answer "is the jump even attainable, and for whom?" by overlaying each state×archetype's escape income (safe-exit / the leap's far edge) on the real distribution of household incomes for families like that — a **reach** signal: "getting fully clear here means out-earning about N% of families like yours in this state."

**Owner directive:** "research data sources for income data … is it even possible to make the jump?" → build the feasibility overlay.

## The load-bearing honesty rule

This is a **cross-sectional** signal: *how many families like yours already earn at or above the escape income.* It is NOT a probability of making the jump (that needs longitudinal earnings data we don't have). Every user-facing string says "already earn" / "out of families like this," never "you can reach" or "your odds." One transparency note: the comparison is to Census total household income (ACS PUMS), which is close to but not identical to our model's employment-earnings axis.

## Verified data source (probed live 2026-07-11)

- The **Census data API now requires a free key** (keyless requests 302 → "Missing Key"). BUT **bulk ACS PUMS files are downloadable without a key** from `https://www2.census.gov/programs-surveys/acs/data/pums/2023/1-Year/` (`csv_h{st}.zip`, e.g. WY 0.7 MB, CA ~26 MB).
- PUMS **household** records carry everything needed with NO person-file join: `HINCP` (household income), `HHT` (household/family type), `NOC` (number of own children), `WGTP` (household weight), plus the file is per-state (state FIPS in the filename / `ST` column).
- Prototype confirmed (WY 2023): weighted median HINCP — single+2kids $76,700, married+2kids $94,700, single+0kids $36,000. The method works.

**Archetype → PUMS filter** (household-file-only):
- `single-N` (N≥1): `HHT ∈ {2,3}` (family, no spouse) AND `NOC == N`
- `married-N`: `HHT == 1` AND `NOC == N`
- `single-0`: `HHT ∈ {4,6}` (nonfamily, living alone) — a single adult
- `married-0`: `HHT == 1` AND `NOC == 0`

## Design

**One-time (annual) reach-data build, controller-run** (PUMS is annual, NOT part of the weekly cliff refresh): download all 51 state household PUMS files, compute per state×archetype a **percentile ladder** of weighted HINCP (income at each 5th percentile, p5…p95, plus min/max), emit compact `app/src/data/reach.json` (~51×8×21 numbers). Committed once.

**shared:** `reachPercentile(ladder, income): number` (0–100) — the fraction of households (by weight) earning at or below `income`, linearly interpolated on the ladder.

**Personal door:** below the safe-exit / path-off-help, one honest line: when the household has a finite safe-exit, "To fully clear the cliffs here (about {income} a year), you'd out-earn about {n}% of families like yours in {state}." When safe-exit is null (never safe within $100k), "Even families like yours in the top {x}% here still hit rough spots." Uses the user's state + archetype (map the flow answers → the nearest reach archetype: married?/kid-count clamped 0–3).

**Places door drill-down:** add a reach line — "The income to get fully clear here is more than about {n}% of families like this earn." Uses the state's safe-exit from summary.json + reach.json.

**Transparency:** a short note (honesty area) that this compares to Census household income and shows how common that income is, not anyone's odds of reaching it.

## Global Constraints

All standing constraints (AGPL, TS strict, copy via t()/en.json + readability gate ≤5.9/≤8.0 never raised, show-explain-never-advise, no input logging, 44px/WCAG AA, conventional commits). Branch: `reach-metric`. reach.json is generated data committed once; the builder script is committed for reproducibility but not on the weekly CI path.

## Attribution
Census ACS PUMS is public domain (U.S. Government work); still credit "U.S. Census Bureau, American Community Survey PUMS" in README + a data note (civic-trust hygiene, mirrors the GeoNames credit).

---

### Task 31: Reach-data builder + reach.json

**Files:** `scripts/build-reach.mjs` (downloads 51 PUMS household files, computes ladders, writes `app/src/data/reach.json`), `app/src/data/reach.json` (controller-run output), README/attribution.

- Builder: for each state FIPS, download `csv_h{st}.zip` from the 2023 1-Year PUMS, stream-parse the CSV, for each archetype filter by the HHT/NOC rules above with `WGTP>0`, build a weighted HINCP sorted list, emit percentile ladder `[p0,p5,…,p95,p100]` (round to $100). Skip archetype cells with too few sample households (< 30 unweighted) → store `null` (small-sample honesty). Emit `{ year: "2023", source: "ACS 1-Year PUMS", states: { CA: { "single-2": { ladder:[…]|null, households:N }, … }, … } }`.
- The builder is idempotent and rerunnable; document the run in README.
- Controller runs it (heavy download); commit builder + reach.json.
- Commit `data: reach — state×archetype household-income ladders from ACS PUMS`.

### Task 32: `reachPercentile` in shared

**Files:** `shared/src/reach.ts` (+test), `shared/src/index.ts`.
- `interface ReachLadder { ladder: number[]; households: number }` (ladder = 21 income points p0..p100 at 5-pt steps).
- `reachPercentile(ladder: number[], income: number): number` — linear-interpolate the income's position → percentile 0–100; clamp to [0,100]; monotonic ladder assumed.
- TDD: a synthetic ladder (e.g. p0=0…p100=100000 linear) → income 50000 → 50; income below p0 → 0; above p100 → 100; interpolation midpoints. Pin against a real reach.json cell too.
- Commit `feat(shared): reachPercentile — where an income falls in a distribution`.

### Task 33: Personal door reach line

**Files:** `app/src/lib/narration.ts` (+test), `app/src/result/EscapePath.tsx`, `app/src/result/ResultPage.tsx`, `app/src/lib/reachLookup.ts` (map flow answers → reach cell; import reach.json), `en.json`.
- `reachArchetypeId(married, kidCount)` (clamp kids 0–3) mirrors places `pickArchetypeId`.
- Given the analysis' safeExitEarnings (or the leap's far edge when null) + state + archetype, look up reach.json; if the cell is non-null, render the reach line via `escapeAnalysis`→narration. Handle: finite safe-exit → "out-earn about {n}%…"; null safe-exit → the top-% framing; null reach cell (small sample) → omit silently.
- Honesty note string.
- Gate-green copy; tests (narration reach line for finite/null/small-sample); e2e assert the reach line appears in the main flow.
- Commit `feat(app): reach line — how attainable the safe income is`.

### Task 34: Places drill-down reach + docs

**Files:** `app/src/pages/StatePanel.tsx` (+test), `en.json`, spec, README.
- Drill-down: reach line from the state's safe-exit (summary.json) + reach.json for the selected archetype. Omit when reach cell or safe-exit is null (or use the top-% framing).
- Spec §: document the reach metric, the PUMS source, the household-file method, and the cross-sectional-not-odds honesty rule. README: reach + PUMS attribution + how to rebuild.
- Commit conventional.

### Task 35: Final review + merge
Whole-branch review (most capable model): verify the honesty framing (no "you can reach"/odds language anywhere); reachPercentile math; small-sample nulls handled; attribution present; archetype mapping matches between doors. Fix Criticals/Importants; merge `reach-metric` to main.

## Self-review notes
- HINCP (total household income) ≠ our employment-earnings axis exactly; the copy says "earn" against household income and carries the transparency note — acceptable for a feasibility signal, not a precise join.
- Small-sample cells (rare archetype×small-state) store null → the reach line is omitted, never shown with a shaky number.
- reach.json is annual; keep it out of the weekly refresh workflow.
