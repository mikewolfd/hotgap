# HotGap

**If I get paid more, do I lose more than I gain?**

HotGap computes benefits cliffs in plain language: what happens to a real
household's food help, health coverage, childcare help, and tax credits as
pay goes up. The money line is **health-adjusted** — it subtracts what the
household actually pays for health coverage: the ACA premium net of its
subsidy, or the employee's share of an employer plan when one is modeled. An
adult stuck in a non-expansion state's coverage gap (too much for Medicaid,
too little for a marketplace subsidy) is shown with **no premium at all**,
and flagged, because nobody in that band is buying the plan PolicyEngine
would otherwise charge them for. The premium tax credit is never subtracted
twice — an earlier version of this line double-counted it; see
[the methodology validation](docs/reviews/2026-09-14-methodology-validation.md)
for how that was found and fixed. Rationed programs (Head Start, a housing
voucher, employer coverage) default to "off." From the curve, HotGap derives
**the leap** — the raise a family must clear in one move to get past the
worst rough zone and earn safely again — and **reach** — where that leap
lands among real households' incomes.

## What's in the repo

- `core/` — `@hotgap/core`: the calculation library (validation, PolicyEngine
  payload/parse, cliff and escape analysis, reach, minimum-wage context) plus
  the committed data files and the `hotgap` CLI
- `pipeline/` — weekly batch job: sweeps 51 states × 8 household archetypes
  through the same PolicyEngine API and `@hotgap/core` math, producing the
  committed summary and per-state curve data
- `scripts/` — one-off builders for the ZIP→state, ZIP→county, and reach
  (ACS earnings) data files
- `contract/` — a live PolicyEngine API contract test (schedule-only; not
  part of the default test run)
- `fixtures/` — recorded PolicyEngine request/response payloads used by tests
- `docs/` — methodology reviews, upstream PolicyEngine issue reports, and
  planning history

## Library shape

- `validateAnswers(input)` — `unknown` → `HouseholdAnswers` (or a reason);
  also validates the three non-wage-income inputs below (each optional,
  default 0)
- `buildPEPayload(answers)` — `HouseholdAnswers` → PolicyEngine request
- `fetchCurve(answers)` — the curve via the public
  [PolicyEngine](https://policyengine.org) API; when `ssdiMonthly > 0` this
  is two requests spliced together (see SSDI, below)
- `analyzeCurve` — cliffs, danger zones, safe exit, the leap. Each `Cliff`
  now carries a `breakdown` (benefits, credits, premiums, other) that sums to
  its `drop` exactly, and `programsLost` names a program only when it ends or
  loses more than half its value in that one step — a phase-down (EITC's
  15.98%/21.06%, SNAP's 24%/36%) never qualifies
- `escapeAnalysis` — the whole-curve safe exit and leap, plus
  `programEndsByAge` (adults and children reported separately, since a
  parent's Medicaid usually ends at a much lower income than a child's),
  `childCoverageEndEarnings` (deferred by the federal 12-month
  continuous-eligibility rule — crossing it does not end a child's coverage
  the same year), and `benefitsEndEarnings` (money only, never a
  Medicaid/CHIP sticker value)
- `reachForHousehold` — where an income falls among real households, on the
  same householder-plus-spouse earnings basis the ladders are built on
- `minWageContext` — hours-a-week-at-minimum-wage framing
- `evaluateHousehold(answers)` — the one-shot: all of the above in order,
  with an offline archetype-curve fallback when the live API fails. It also
  returns:
  - `personal` — this household's *own* zone-relative path: the danger zone
    it's actually in (if any), where that zone ends, and the raise needed to
    clear it — distinct from `escape.safeExitEarnings`/`escape.leap`, which
    answer "where does this state's worst zone end" rather than "how far
    does this household have to go"
  - `coverageGap` — the earnings band, if any, where this household has no
    Medicaid, no premium subsidy, and no employer plan (the phantom
    benchmark premium is removed from the curve over that band)
  - `headStart` — the program's PolicyEngine sticker value alongside what it
    is actually worth to this family: capped at their own reported childcare
    cost, since a family paying $0 for childcare gains $0 from a "free" slot
  - a `curve` where an employer-coverage household's health cost has already
    been replaced with the MEPS-IC employee contribution in place of the
    marketplace premium PolicyEngine would otherwise charge (live curves
    only — the committed archetype sweep never models ESI)
- `loadSummary` / `loadStateFile` — read the committed weekly-sweep data

**Three inputs beyond the household's basics:** `ssdiMonthly`,
`childSupportMonthly`, `unemploymentMonthly` — monthly dollars, all optional
(default 0). SSDI is modeled as a hard stop, not a taper: PolicyEngine has no
substantial-gainful-activity rule, so `fetchCurve` makes two requests — one
with the disability benefit, one without — and splices them at $20,280/year
(the 2026 SGA threshold), the whole check switching off in one step. This is
the steady-state rule only; SSA's nine-month trial work period and 36-month
extended eligibility period are not modeled, so the curve says "at this pay,
eventually," never "next month."

`core/src/policyYear.ts` holds the handful of annual constants PolicyEngine's
API does not expose — each with its publisher, table, and the date it was
read, so moving the policy year means re-deriving them from the source, never
from a cached percentage: 2026 SGA ($20,280, ssa.gov), the 2025 HHS poverty
guidelines that actually govern 2026 marketplace eligibility (`fpl2025`,
ASPE), and the AHRQ MEPS-IC 2024 employer-plan employee contribution ($1,789
single / $7,216 family).

## Data files and sources

All under `core/data/`:

- `summary.json`, `states/{ST}.json` — the weekly 51-state × 8-archetype
  PolicyEngine sweep. Each curve's axis runs past 400% of the 2025 poverty
  line (plus $40,000 of room to recover) for the household's own size, at
  $1,000 steps up to $350,000 and coarser only beyond that — so the top of
  the axis is $150,000 (151 points) for a household of one to three in the
  48 contiguous states (Alaska and Hawaii, whose guidelines are higher, get
  longer axes),
  $170,000 (171 points) for four, $195,000 (196 points) for five, and wider
  still for larger households, rather than one flat axis clipping the ACA
  subsidy cliff off the top of a bigger family's chart (see `axisSpec` in
  `core/src/translate.ts`). `summary.json` carries `leapIsLowerBound` per
  archetype: true when its worst danger zone runs off the top of that axis
  rather than actually closing. Rebuild: `npm run pipeline`.
- `reach.json` — household earnings percentile ladders from
  [U.S. Census Bureau ACS PUMS](https://www.census.gov/programs-surveys/acs/microdata.html)
  microdata (public domain): the 2024 1-Year PUMS, with the 2020–2024 5-Year
  PUMS substituted cell-by-cell for the five states too small for the 1-Year
  sample. Each ladder is the **householder's plus spouse's earnings** (PERNP,
  summed and floored at 0) among households whose householder is 18–64 — the
  same concept the tool varies on its own axis — with each record's `ADJINC`
  applied, then grown from 2024 to 2026 dollars by a BLS Employment Cost
  Index (wages and salaries, private industry) factor of **1.067533**. Every
  ladder point carries its own replicate-weight (WGTP1–80) 90% margin of
  error, and a cell publishes as `null` — never as a false 0% — when that
  margin exceeds half the median or fewer than 30 households fall in it;
  `reachCell` exposes the margin alongside the ladder. Rebuild:
  `node scripts/build-reach.mjs`.
- `zip3-state.json` — ZIP → state derived from
  [GeoNames](https://www.geonames.org/) (CC BY 4.0). Rebuild:
  `node scripts/build-zip-table.mjs`.
- `zip5-county.json` — ZIP → county crosswalk from the
  [U.S. Census Bureau 2020 ZCTA-county relationship file](https://www.census.gov/geographies/reference-files/time-series/geo/relationship-files.html)
  (public domain). Rebuild: `node scripts/build-zip-county.mjs`.

## Try it

    npm install
    npm run hotgap -- curve --state CA --kids 3,7 --earnings 30000                                       # live PolicyEngine call
    npm run hotgap -- curve --zip 94110 --kids 3 --rent 1500 --childcare 600 --earnings 30000 --offline
    npm run hotgap -- curve --state TX --married --kids 1,4,9 --earnings 42000 --offline                 # committed archetype curve, no network
    npm run hotgap -- curve --state CA --age 45 --disabled --ssdi 1500 --child-support 400 --earnings 15000   # live call; SSDI splices at the 2026 SGA ($20,280)
    npm run hotgap -- curve --state CA --married --kids 4,8 --earnings 60000 --employer-coverage         # live call; MEPS-IC employee premium replaces the marketplace charge
    npm run hotgap -- curve ... --json                                                                   # full HouseholdEvaluation
    npm run hotgap -- summary --state CA                                                                 # weekly sweep metrics

Flags: `--state` / `--zip` / `--county`, `--age`, `--married` /
`--spouse-age`, `--kids` / `--kids-disabled`, `--disabled` /
`--spouse-disabled`, `--rent`, `--childcare`, `--earnings` or `--pay` /
`--unit` / `--hours`, `--spouse-earnings`, `--ssdi` / `--child-support` /
`--unemployment` (monthly, other income), `--head-start` / `--housing` /
`--employer-coverage` (take-up, default: not received), `--offline`,
`--json`.

## Honesty

- Archetype (`--offline`) curves ignore county, rent, childcare, age,
  disability, and every take-up toggle — they're the honest baseline for a
  household shaped like this in this state, not this family's own numbers.
- Health cost is premiums only: the money line subtracts health-insurance
  premiums net of subsidy, not deductibles, copays, or other out-of-pocket
  spending.
- Minimum-wage framing (`minWageContext`, the "~hrs/wk" column) is context,
  not eligibility — nothing in the calculation depends on it.
- Reach is cross-sectional only: "N% of similar households earn at or below
  $X" describes today's income distribution, never the odds of a household
  getting there.
- HotGap does not ask about immigration status, assets, or a household
  member aged 65+. None of those are inputs, and the reach ladders
  themselves only cover householders 18–64.
- Parent-Medicaid thresholds come from PolicyEngine's own parameters. Five
  non-expansion states (TX, MS, GA, FL, WY) hold a frozen dollar standard
  that PolicyEngine hasn't refreshed since 2021 (GA since 2025), so the
  modeled threshold drifts above the state's real one every January until
  PolicyEngine updates it — see
  [docs/upstream/2026-09-14-policyengine-issues.md](docs/upstream/2026-09-14-policyengine-issues.md).

## Develop

    npm test                # unit tests
    npm run typecheck       # tsc -b core pipeline
    npm run contract        # live PolicyEngine API contract check
    npm run pipeline        # re-run the weekly PolicyEngine sweep locally (~10-15 min; 51 states x 8 archetypes, axis sized per household)

`npm run pipeline` also takes `--from-data` (recompute summary/state metrics
from already-fetched curves, no PolicyEngine calls) and `--dry-run` (build every request payload
without calling PolicyEngine or writing files).

`.github/workflows/places-data.yml` runs the sweep automatically every
Monday at 07:00 UTC (and on manual dispatch), running the test suite and
typecheck before committing. Data commits only when the swept numbers
changed — `generated` in `summary.json` and each state file is the stamp of
the sweep that last changed that file, not of the most recent sweep.

Estimates only — a caseworker decides real benefits.

## History

The site UI, design system, and Cloudflare Worker were split out of this
repo and live at git tag `ui-archive`; the deployed site at
hotgap.hotgap.workers.dev is unchanged. `docs/superpowers/` specs and plans
predate that split and cite paths (`app/`, `worker/`, `shared/`) that no
longer exist.

License: AGPL-3.0-only.
