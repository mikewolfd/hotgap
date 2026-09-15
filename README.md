# HotGap

**If I get paid more, do I lose more than I gain?**

HotGap computes benefits cliffs in plain language: what happens to a real
household's food help, health coverage, childcare help, and tax credits as
pay goes up. The money line is **health-adjusted** — it counts what a
household actually pays for health coverage (premiums net of subsidy, plus
other out-of-pocket costs), not just cash benefits, so "what you keep" means
money left after paying for health. Rationed programs (Head Start, a housing
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
- `docs/` — review and planning history

## Library shape

- `validateAnswers(input)` — `unknown` → `HouseholdAnswers` (or a reason)
- `buildPEPayload(answers)` — `HouseholdAnswers` → PolicyEngine request
- `fetchCurve(answers)` — the curve via the public
  [PolicyEngine](https://policyengine.org) API
- `analyzeCurve` / `escapeAnalysis` — cliffs, danger zones, safe exit, the leap
- `reachForHousehold` — where an income falls among real households
- `minWageContext` — hours-a-week-at-minimum-wage framing
- `evaluateHousehold(answers)` — the one-shot: all of the above in order,
  with an offline archetype-curve fallback when the live API fails
- `loadSummary` / `loadStateFile` — read the committed weekly-sweep data

## Data files and sources

All under `core/data/`:

- `summary.json`, `states/{ST}.json` — the weekly 51-state × 8-archetype
  PolicyEngine sweep. Rebuild: `npm run pipeline`.
- `reach.json` — household earnings percentile ladders from
  [U.S. Census Bureau ACS 1-Year PUMS](https://www.census.gov/programs-surveys/acs/microdata.html)
  household + person files (public domain): per household, the sum of
  members' wages and self-employment income, inflation-adjusted to the
  policy year. Rebuild: `node scripts/build-reach.mjs`.
- `zip3-state.json` — ZIP → state derived from
  [GeoNames](https://www.geonames.org/) (CC BY 4.0). Rebuild:
  `node scripts/build-zip-table.mjs`.
- `zip5-county.json` — ZIP → county crosswalk from the
  [U.S. Census Bureau 2020 ZCTA-county relationship file](https://www.census.gov/geographies/reference-files/time-series/geo/relationship-files.html)
  (public domain). Rebuild: `node scripts/build-zip-county.mjs`.

## Try it

    npm install
    npm run hotgap -- curve --state CA --kids 3,7 --earnings 30000            # live PolicyEngine call
    npm run hotgap -- curve --zip 94110 --kids 3 --rent 1500 --childcare 600 --earnings 30000
    npm run hotgap -- curve --state TX --married --kids 1,4,9 --earnings 42000 --offline   # committed archetype curve, no network
    npm run hotgap -- curve ... --json                                        # full HouseholdEvaluation
    npm run hotgap -- summary --state CA                                      # weekly sweep metrics

Flags: `--state` / `--zip` / `--county`, `--age`, `--married` /
`--spouse-age`, `--kids`, `--disabled` / `--spouse-disabled` /
`--kids-disabled`, `--rent`, `--childcare`, `--earnings` or `--pay` /
`--unit` / `--hours`, `--spouse-earnings`, `--head-start` / `--housing` /
`--employer-coverage`, `--offline`, `--json`.

## Develop

    npm test                # unit tests
    npm run typecheck       # tsc -b core pipeline
    npm run contract        # live PolicyEngine API contract check
    npm run pipeline        # re-run the weekly PolicyEngine sweep locally (~10 min)

`npm run pipeline` also takes `--from-data` (recompute summary/state metrics
from already-fetched curves, no PolicyEngine calls) and `--dry-run` (sweep
and validate without writing files).

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
