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
voucher, a childcare subsidy, employer coverage) default to "off." From the
curve, HotGap derives **the leap** — the raise a family must clear in one move
to get past the worst rough zone and earn safely again — and **reach** — where
that leap lands among real households' incomes.

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
  also validates the four extra inputs below: three non-wage-income ones
  (each optional, default 0) and `hoursPerWeek` (optional, 1–80 when given)
- `buildPEPayload(answers)` — `HouseholdAnswers` → PolicyEngine request
- `buildCurvePayload(answers)` — the request with sourced per-household
  parameter overrides; used by `fetchCurve` and the weekly sweep
- `fetchCurve(answers)` — the curve via the public
  [PolicyEngine](https://policyengine.org) API; when `ssdiMonthly > 0` this
  is two requests spliced together (see SSDI, below)
- `analyzeCurve` — cliffs, danger zones, safe exit, the leap. Each `Cliff`
  carries a `breakdown` (benefits, credits, premiums, other — state
  refundable credits count as `credits`, not `other`) that sums to its
  `drop` exactly, and a `driver` naming the breakdown component that
  explains the most of it for a cliff with no nameable program.
  `programsLost` names a program only when it ends or loses more than half
  its value in that one step FOR SOME GROUP that holds it — the household
  total, or, for a person-level program, adults and children checked
  separately, so a parent losing Medicaid while the children keep theirs is
  still named — and a phase-down (EITC's 15.98%/21.06%, SNAP's 24%/36%)
  never qualifies. A `deferral` marks a cliff whose cost lands at a future
  renewal rather than with the raise that causes it — see `deferred`, below
  — with one of three reasons and its citation: Head Start's program-year
  carry-over (45 CFR 1302.12(j)(1)), a child's 12 months of continuous
  Medicaid/CHIP eligibility (42 CFR 435.926 / 457.342), or a parent's
  Medicaid converting to Transitional Medical Assistance (§1925 of the
  Social Security Act, 42 U.S.C. 1396r-6)
- `escapeAnalysis` — the whole-curve safe exit and leap, plus
  `programEndsByAge` (adults and children reported separately, since a
  parent's Medicaid usually ends at a much lower income than a child's),
  `childCoverageEndEarnings` (deferred by the federal 12-month
  continuous-eligibility rule — crossing it does not end a child's coverage
  the same year), and `benefitsEndEarnings` (money only, never a
  Medicaid/CHIP sticker value). `programEnds.ctc` reads the TOTAL child tax
  credit, not just the refundable series a cliff's own `programsLost` and
  `breakdown.credits` are built from — the refundable amount usually reaches
  zero where a rising tax bill absorbs the credit, not where the family
  loses it, so reporting that point as "ctc ends" told a family it had lost
  a credit it still had in full
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
    is actually worth to this family: the higher of their own reported
    childcare cost or the state's own market price for a preschool slot (DOL
    National Database of Childcare Prices), capped at the sticker value —
    since a family paying $0 for childcare because the Head Start slot IS
    the childcare still gains the market value of a full-day placement, not
    $0
  - `maTafdc` — whether the local Massachusetts cash-assistance correction
    was applied and whether PolicyEngine recomputed the linked benefits
    with the corrected grant (it does for live curves and the current sweep)
  - a `curve` where an employer-coverage household's health cost has already
    been replaced with the MEPS-IC employee contribution in place of the
    marketplace premium PolicyEngine would otherwise charge (live curves
    only — the committed archetype sweep never models ESI)
  - `deferred` — the subset of `analysis.cliffs` that lands at a future
    renewal rather than with the raise that causes it (see `analyzeCurve`'s
    `deferral`, above). `analysis.cliffs` lists every cliff, deferred ones
    included, and `currentNet` is the real curve's — but `analysis.verdict`,
    its danger zones, `escape`, and `personal` are all read off a curve with
    those deferred drops lifted out (an internal helper in `evaluate.ts`;
    the only place HotGap alters a curve for timing rather than for a wrong
    number): a household whose Head Start slot carries through the next
    program year is not standing in that hole the day it takes the raise
  - `esi` — the employer-plan tier (`single` / `plusOne` / `family`, AHRQ
    MEPS-IC 2024) and dollar contribution charged at this household's own
    earnings, following who the plan has to cover: a per-adult Medicaid
    guard (an adult already on Medicaid does not need the plan) and a
    30-hour eligibility floor (26 U.S.C. 4980H(c)(4)) below which no
    employer owes a plan at all
  - `premiumWrap` — the state's own $0-premium marketplace tier this
    household's curve fell inside, if any (Connecticut, Massachusetts, New
    Mexico, California — see Honesty, below)
- `loadSummary` / `loadStateFile` — read the committed weekly-sweep data

### Inputs to PolicyEngine

Every `buildPEPayload` request sends `tax_unit_is_filer: true`, always —
anyone claiming a marketplace premium tax credit files a return. Without it,
PolicyEngine derives filing status from the ordinary thresholds, so a
childless couple between the EITC's end and the $32,200 joint-filing
threshold is charged the full premium with no credit at all: verified live
2026-09-15, an Illinois couple at $30,000 went from $0 premium tax credit and
$19,870 of medical out-of-pocket to $18,779 of credit and $1,090 — an $18,780
phantom cliff that was the largest "loss" for that archetype in 45 states.
Filed upstream as policyengine-us #9479. Every child, not only one already
asked about Medicaid, CHIP, or Head Start, is also asked about WIC and SSI,
so a child's WIC no longer hides inside the untracked `otherBenefits`
remainder. Hours worked (`hoursPerWeek`) are sent when given, because two
things elsewhere in this file scale by them: Massachusetts' TAFDC
dependent-care deduction, and the 30-hour employer-coverage floor below.

**The childcare subsidy** (`getsChildcareSubsidy`, `--childcare-subsidy`) is a
take-up toggle like Head Start, off by default: CCDF reaches roughly one in
six eligible children and most states run a waiting list. Turning it on also
changes what PolicyEngine is asked. `childcare_expenses` is NOT an input
upstream — it is defined as `pre_subsidy_childcare_expenses` minus the
subsidy — so forcing it, which every HotGap request used to do, left the
pre-subsidy figure at $0 and every state's CCDF formula with no provider
charge to reimburse. That, not a missing variable, is why a July probe found
the subsidy empty in every state. With the toggle on, the household's bill is
sent as `spm_unit_pre_subsidy_childcare_expenses`, `childcare_expenses` is
left for PolicyEngine to compute (so SNAP's dependent-care deduction and the
child and dependent care credit run on the net bill), and full-day, full-week
attendance is assumed for each child — a stated assumption that changes the
subsidy's size but does not gate it. The value arrives as
`programs.childcare`. Verified live 2026-09-15: a Colorado single parent with
a 3-year-old and a $9,600 bill gets $0 the old way and $9,450 the new one.

**Four inputs beyond the household's basics:** `ssdiMonthly`,
`childSupportMonthly`, `unemploymentMonthly` — monthly dollars, all optional
(default 0) — and `hoursPerWeek`, hours a week actually worked, optional
(default: unknown, sent to no one), 1–80 when given. SSDI is modeled as a
hard stop, not a taper: PolicyEngine has no substantial-gainful-activity
rule, so `fetchCurve` makes two requests — one with the disability benefit,
one without — and splices them at $20,280/year (the 2026 SGA threshold), the
whole check switching off in one step. This is the steady-state rule only;
SSA's nine-month trial work period and 36-month extended eligibility period
are not modeled, so the curve says "at this pay, eventually," never "next
month."

Above SGA the stopped request also drops SNAP's disabled-member treatment
(the uncapped excess shelter deduction, 7 CFR 271.2) and any state
supplement, because "disabled" for SNAP means receiving a disability benefit
— so a high-rent family's SGA cliff is deeper than the check alone.
An SSDI household is additionally modeled as already on Medicare: no
marketplace premium or credit for the recipient, and the 2026 Part B premium
($202.90/month, CMS, 2025-11-14) charged instead unless the recipient has
Medicaid (which stands in for a Medicare Savings Program). This is a
documented SIMPLIFICATION — Medicare entitlement actually starts 24 months
after the first SSDI check (42 U.S.C. 426(b)), and HotGap never asks how
long the household has been receiving it, so every SSDI household is
modeled as already past that wait. The error runs one way: a household in
its first two years on SSDI would in reality still owe a marketplace
premium, and this leaves it out.

`core/src/policyYear.ts` holds the handful of annual constants PolicyEngine's
API does not expose — each with its publisher, table, and the date it was
read, so moving the policy year means re-deriving them from the source, never
from a cached percentage: 2026 SGA ($20,280, ssa.gov), the 2025 HHS poverty
guidelines that actually govern 2026 marketplace eligibility (`fpl2025`,
ASPE), the AHRQ MEPS-IC 2024 employer-plan employee contribution by plan tier
($1,789 single / $4,707 employee-plus-one / $7,216 family — a working parent
with one child is not buying a family plan), the 30-hour full-time floor
(`ESI_FULL_TIME_HOURS`, 26 U.S.C. 4980H(c)(4)(A)) below which no employer owes
a plan, and the 2026 Medicare Part B standard premium ($202.90/month, CMS,
2025-11-14).

## Data files and sources

All under `core/data/`:

- `summary.json`, `states/{ST}.json` — the weekly 51-state × 8-archetype
  PolicyEngine sweep, each archetype now a typical renter in the state's
  most populous county (see `state-defaults.json`, below) rather than a
  household with no rent and no county at all. Each curve's axis runs past
  400% of the 2025 poverty line (plus $40,000 of room to recover) for the
  household's own size, at $1,000 steps up to $350,000 and coarser only
  beyond that — so the top of the axis is $150,000 (151 points) for a
  household of one to three in the 48 contiguous states (Alaska and Hawaii,
  whose guidelines are higher, get longer axes),
  $170,000 (171 points) for four, $195,000 (196 points) for five, and wider
  still for larger households, rather than one flat axis clipping the ACA
  subsidy cliff off the top of a bigger family's chart (see `axisSpec` in
  `core/src/translate.ts`). `summary.json` carries `leapIsLowerBound` per
  archetype: true when its worst danger zone runs off the top of that axis
  rather than actually closing. `cliffCount` and `deferredCliffCount` come
  from the same `evaluateCurve` that `evaluateHousehold` and
  `evaluateOffline` both call — every cliff, real or deferred, counts
  toward one or the other, and `biggestLoss`, the danger zones, and `leap`
  all read the curve with deferred losses lifted out, so none of the three
  can be driven by a Head Start or continuous-eligibility cliff that does
  not land this year.
  Massachusetts summary metrics include the local TAFDC correction and an
  approximation notice. State files retain PolicyEngine's TANF and the
  `maTafdc` inputs used to replay that correction; use `evaluateOffline` to
  obtain the corrected curve. Rebuild: `npm run pipeline`.
- `state-defaults.json` — the typical renter each state's archetype sweep
  uses: HUD FY2026 two-bedroom Fair Market Rent and the Census Vintage 2024
  most populous county for `monthlyRent`/`countyFips` (`stateDefaults`,
  read by `answersFor`), and DOL's National Database of Childcare Prices'
  median county preschool price for `monthlyChildcarePreschool` — not an
  archetype input itself, but the replacement value of a "free" Head Start
  slot (`headStart`, above). Hand-assembled, not script-generated; the
  file's own `sources` object carries each column's publisher, table,
  vintage, date read, and exact arithmetic.
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
    npm run hotgap -- curve --state CA --kids 3,7 --earnings 30000 --offline                             # simplest usage; committed archetype curve, no network
    npm run hotgap -- curve --zip 94110 --kids 3 --rent 1500 --childcare 600 --earnings 30000 --offline
    npm run hotgap -- curve --state TX --married --kids 1,4,9 --earnings 42000 --offline                 # committed archetype curve, no network
    npm run hotgap -- curve --state CA --age 45 --disabled --ssdi 1500 --child-support 400 --earnings 15000   # live call; modeled as already on Medicare, splices the marketplace-vs-none check at the 2026 SGA ($20,280)
    npm run hotgap -- curve --state CA --married --kids 4,8 --earnings 60000 --employer-coverage --hours 40   # live call; MEPS-IC employee premium replaces the marketplace charge; --hours must clear the 30-hour floor (26 U.S.C. 4980H(c)(4)) for a contribution to be charged
    npm run hotgap -- curve --state CT --kids 3 --childcare 1416 --childcare-subsidy --hours 40 --earnings 25000   # live call; the CCDF childcare subsidy, added to net income in the 28 states PolicyEngine leaves it out of
    npm run hotgap -- curve ... --json                                                                   # full HouseholdEvaluation
    npm run hotgap -- summary --state CA                                                                 # weekly sweep metrics

Flags: `--state` / `--zip` / `--county`, `--age`, `--married` /
`--spouse-age`, `--kids` / `--kids-disabled`, `--disabled` /
`--spouse-disabled`, `--rent`, `--childcare`, `--earnings` or `--pay` /
`--unit` / `--hours`, `--spouse-earnings`, `--ssdi` / `--child-support` /
`--unemployment` (monthly, other income), `--head-start` / `--housing` /
`--childcare-subsidy` / `--employer-coverage` (take-up, default: not
received), `--offline`, `--json`.

## Honesty

- Archetype (`--offline`) curves still ignore childcare, age, disability,
  every take-up toggle (Head Start, housing, the childcare subsidy, employer
  coverage), and SSDI —
  they're the honest baseline for a household shaped like this in this
  state, not this family's own numbers. Rent and county are no longer part
  of that ignore list: since 2026-09-15 every archetype uses the state's
  own typical renter (HUD FY2026 two-bedroom Fair Market Rent, Census
  Vintage 2024 most populous county — see `state-defaults.json`), not a
  household with no rent and no county at all.
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
- Parent-Medicaid limits in TX, MS, GA, FL and WY use the states' published
  dollar tables for the household's size, converted to PolicyEngine's 2026
  poverty-line fraction. SC uses 67%. HotGap sends these as request parameters;
  PolicyEngine still calculates eligibility and related benefits. New York
  uses the 200% Essential Plan ceiling effective July 1, 2026. These are
  annualized current-rule scenarios, not prorated calendar-year benefit totals.
- Massachusetts TAFDC (`programs.tanf`) reports the ONGOING monthly grant
  after the six-month full earnings disregard; the one-month, $500-per-child
  September clothing allowance is counted separately as cash under
  `otherBenefits`, so "TANF ends" means the ongoing grant's end, not the
  last September a small allowance was paid. DTA's own published examples
  (its FY2026 report: $7,512 at $15,600 of earnings for a family of three)
  are YEAR-ONE figures — six months at the full disregard, six at the
  ongoing 50% rule — where this local, steady-state formula gives $4,212 for
  the same family and pay; neither number is wrong, they are different years
  of the same case. The local correction removes a duplicate TAFDC payment
  from upstream net income, then changes TANF and net income before
  analysis, including offline results and summary rankings. The corrected
  grant is then fed back to PolicyEngine one earnings point at a time, so
  SNAP and every other linked benefit follow from it; only the six-month
  full disregard's timing and new-applicant eligibility stay unmodeled.
  Older curves without the required inputs are flagged as uncorrected. See
  [local corrections and evidence](docs/upstream/2026-09-15-local-corrections.md)
  for sources, scope and removal checks.
- Four states pay off the remainder of the marketplace premium entirely
  below a state-specific share of the poverty line: Connecticut's Covered
  Connecticut Program (175% FPL), Massachusetts' ConnectorCare Plan Type 2A
  (150%), New Mexico's Premium Assistance program (200%), and California's
  Premium Subsidy (150%). HotGap zeroes the net premium in that band, each
  bound read from the state's own page — a WORKAROUND (the table in
  `core/src/statePremiumWraps.ts`, applied by `evaluate.ts`'s
  `applyPremiumWrap`) until PolicyEngine models the wraps itself
  (policyengine-us #9481). The reduced-premium tiers above the $0 band are
  modeled where the state publishes them — Massachusetts' ConnectorCare
  Plan Types 2B–3C to 400% FPL, California's scale to 165%, New Mexico's to
  250% — so a band edge steps to the state's real next price. PolicyEngine
  itself models ConnectorCare 2B but not 3A–3C; before this, Massachusetts
  premiums above 200% FPL were overstated by up to $9,300 a year (external
  validation, `docs/reviews/2026-09-15-external-validation.md`).
- The childcare subsidy reaches PolicyEngine's net income in only 23 states.
  PolicyEngine models a CCDF child-care subsidy in every state, but only the
  states listed in `gov.household.household_state_benefits` flow into
  `household_net_income`; in the rest the money is computed and dropped, and
  the household is left looking POORER for holding it, because the
  net-of-subsidy childcare bill shrinks SNAP's dependent-care deduction and
  the CDCC while the benefit never arrives (Connecticut, single parent with a
  3-year-old, $25,000 of pay: $34,121 against $38,102 with the subsidy forced
  off, for an $8,850 benefit). HotGap adds it back in those states — a
  WORKAROUND (`applyChildcareSubsidy` in `core/src/evaluate.ts`, with the
  table in `core/src/stateChildcareSubsidies.ts`) until policyengine-us #9405
  routes every state's subsidy into household benefits. Four of the 38 states
  whose variable is deployed today still return $0 for a plainly eligible
  household — California, Massachusetts, Maryland and Nebraska — and HotGap
  reports no subsidy there rather than inventing one; see
  [local corrections and evidence](docs/upstream/2026-09-15-local-corrections.md)
  for each cause.
- Alaska and Hawaii's marketplace subsidies are computed by PolicyEngine
  against the 48-contiguous-states poverty guideline, not their own higher
  guidelines (verified live 2026-09-15) — filed upstream as policyengine-us
  #9482. HotGap's own `fpl2025` table (`core/src/policyYear.ts`) already
  carries the correct Alaska and Hawaii guidelines for the coverage-gap and
  premium-wrap corrections above; the marketplace premium and credit
  PolicyEngine itself returns for an Alaska or Hawaii household are still
  computed on the wrong line, and HotGap does not correct them.
- Before this review, a household that sent no county got PolicyEngine's
  default ACA rating area for its state — byte-identical for Connecticut and
  Illinois, and for Colorado and Indiana (policyengine-us #9480), so a
  premium comparison between those pairs was partly comparing the same
  default rather than the states. Every archetype, and any live call that
  resolves a ZIP or is given a county, now sends a real one, which sidesteps
  the defect regardless of whether upstream ever fixes it.

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
