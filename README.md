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
- `pipeline/` — weekly batch job: sweeps 51 states × 11 household archetypes
  (single with 0–3 children, married with 0–3, and married with 1–3 where
  **both** parents work). The two married families differ in more than a
  second wage: a single-earner couple has a parent at home, so it buys no
  child care and cannot claim the subsidy, which every state conditions on
  all parents working; a dual-earner couple buys care, claims the subsidy,
  and is the household the child-care cliff actually hits. The dual-earner
  spouse earns a fixed $15,080, full-time at the *federal* minimum wage, on
  purpose — a state-varying second wage would make the map partly a
  comparison of households rather than of state rules.
  through the same PolicyEngine API and `@hotgap/core` math, producing the
  committed summary and per-state curve data
- `app/` — the site: three Vite pages on one design system (`design/`),
  and the input editor. `app/README.md` is the contract a surface builds on
- `worker/` — the Cloudflare Worker that serves `app/dist` and answers
  `/api/evaluate` with core against the hosted engine (`app/README.md`)
- `scripts/` — one-off builders for the ZIP→state, ZIP→county, and reach
  (ACS earnings) data files
- `contract/` — a live PolicyEngine API contract test (schedule-only; not
  part of the default test run)
- `fixtures/` — recorded PolicyEngine request/response payloads used by tests
  (`fixtures/README.md` says which model answered each, and how to re-record)
- `docs/` — methodology reviews, upstream PolicyEngine issue reports, and
  planning history

## Library shape

- `validateAnswers(input)` — `unknown` → `HouseholdAnswers` (or a reason);
  also validates the four extra inputs below: three non-wage-income ones
  (each optional, default 0) and `hoursPerWeek` (optional, 1–80 when given).
  An optional `zip` resolves the state and county (`resolvePlace`, the one
  rule the CLI's `--zip`, the site's API and its ZIP field share): a given
  state must agree with the ZIP's, a given county wins over the ZIP's
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
  same householder-plus-spouse earnings basis the ladders are built on;
  `reachAtEarnings` does the one conversion every caller needs, adding the
  spouse's fixed pay back to a figure taken off the earnings axis
- `povertyRoad` / `keepRate` / `cliffsBetween` / `roadSummary` / `keepNext`
  (`road.ts`) — the road out of poverty and what a household keeps walking
  it, in cents per extra dollar (§ Honesty). `roadSummary` also says how
  many families like this one earn less than the road's top, and every
  `Cliff` gains a `position` saying the same of the pay its step starts at
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
    `deferral`, above). It is a **label**, not an exclusion: since
    2026-09-17 `analysis` is read off the real curve, so a deferred loss
    counts in the verdict, the danger zones, the leap, the safe exit and
    every summary metric, and `deferred` only says which of the counted
    cliffs land later and under which rule (the badge's data — when, and
    the citation). The owner's rule: the family will lose that money, and
    the tool exists to show the impact of a raise, so the impact is the
    figure and the timing is a clause beside it. HotGap no longer keeps a
    second, lifted reading of the curve anywhere
  - `esi` — the employer-plan tier (`single` / `plusOne` / `family`, AHRQ
    MEPS-IC 2024) and dollar contribution charged at this household's own
    earnings, following who the plan has to cover: a per-adult Medicaid
    guard (an adult already on Medicaid does not need the plan) and a
    30-hour eligibility floor (26 U.S.C. 4980H(c)(4)) below which no
    employer owes a plan at all
  - `premiumWrap` — the state's own $0-premium marketplace tier this
    household's curve fell inside, if any (Connecticut, Massachusetts, New
    Mexico, California — see Honesty, below)
  - `statePremiumAssistance` — the state's own marketplace premium help as
    PolicyEngine modeled it, netted out of the premium here, when the endpoint
    served the variable (California, New Mexico, Maryland, Colorado, Vermont
    on the self-hosted engine; null on the hosted API, where the ladder above
    stands in)
  - `unclaimed` — for each entitlement the household said it does not get
    (`getsSnap`, `getsTanf`, `getsMedicaid`, `getsWic` false), what it would
    pay at current earnings on a second curve with every take-up on; empty
    when nothing off would pay, null on the offline path
- `loadSummary` / `loadStateFile` — read the committed weekly-sweep data

### Running outside Node

Nothing in the library imports a Node builtin statically, so the same
modules bundle for a Cloudflare Worker (`worker/`) or a page (`app/`). Three
seams cover what the environment has to supply:

- **Data.** `readData` serves the in-memory cache first and reads
  `core/data/` from disk only where `process.getBuiltinModule("node:fs")`
  exists (Node ≥ 22.3). Anywhere else, `provideData({ "reach.json": … })`
  hands it the parsed tables — a Worker bundles the four small ones and
  fetches a state file from its static assets on demand
  (`EvaluateOptions.loadStateFile`, called only on the fallback path).
- **Endpoint.** `configurePolicyEngine({ url, token })` sets what
  `HOTGAP_PE_URL` / `HOTGAP_PE_TOKEN` set on Node; a set value wins, an empty
  one defers to the environment.
- **Hashing.** `curveCacheKey` is async and uses Web Crypto (`sha256Hex`),
  the same digest on every runtime.

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

- `summary.json`, `states/{ST}.json` — the weekly 51-state × 11-archetype
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
  rather than actually closing, and `axisTop`, the axis that cell was swept
  to, so a page can print "past $150,000" rather than "past the axis".
  `cliffCount` and `deferredCliffCount` come
  from the same `evaluateCurve` that `evaluateHousehold` and
  `evaluateOffline` both call. Since 2026-09-17 `cliffCount` counts every
  cliff and `deferredCliffCount` is the subset of those that land at a
  later renewal, and `biggestLoss`, the danger zones and `leap` all read
  the real curve, so a Head Start or continuous-eligibility cliff can drive
  any of them — it is a loss the household takes, and the `deferred` count
  beside it says how much of the figure waits.
  Massachusetts summary metrics include the local TAFDC correction and an
  approximation notice. State files retain PolicyEngine's TANF and the
  `maTafdc` inputs used to replay that correction; use `evaluateOffline` to
  obtain the corrected curve. Rebuild: `npm run pipeline`.
  `summary.json` also carries `coverage`, one block per state
  (`StateCoverage` in `core/src/data.ts`, built by `core/src/coverage.ts`)
  that a reader of that state's numbers should check before comparing them:
  `corrections` — which HotGap-side corrections apply there, each derived
  from the code that applies it (the parameter overrides actually sent, with
  the value per archetype; the Massachusetts TAFDC recomputation; whether the
  state's premium help is PolicyEngine's own amount, a local ladder, or
  nothing; whether the child-care subsidy is inside net income or added by
  HotGap; whether the coverage-gap correction can fire) with a one-sentence
  note and the upstream issue number; `unmodeled` — programs the map cannot
  show there (a state premium program modeled nowhere, a child-care subsidy
  the engine paid nothing for, LIHEAP everywhere); `otherBenefits` — what the
  untracked remainder is, traced to a PolicyEngine variable
  (`core/src/stateOtherBenefits.ts`, pinned live by the contract suite):
  California's and Kansas's is the HUD voucher payment PolicyEngine models
  for an eligible renter through `housing_assistance`, a variable the
  `spm_unit_capped_housing_subsidy: 0` take-up switch does not reach, capped
  at the PHA utility allowance because the rent is sent as `rent` rather than
  `pre_subsidy_rent`; New Jersey's is the $450 ANCHOR renter benefit; and
  `vintages` — the model, the rent and county sources, the child-care price
  basis and the reach ladders' PUMS vintage(s), read from the data files
  rather than retyped. `npm run pipeline -- --from-data` regenerates it
  without network, and a change to it counts as a change to the file.
- `state-defaults.json` — the typical renter each state's archetype sweep
  uses (`stateDefaults`, read by `answersFor`). Every figure describes
  **one** household in **one** county: the Census Vintage 2024 most populous
  county (`countyFips`), HUD's FY2026 two-bedroom Fair Market Rent for it
  (`monthlyRent`), and DOL's National Database of Childcare Prices
  center-based prices for that same county in each of the NDCP's age bands
  (`MCInfant`/`MCToddler`/`MCPreschool`/`MCSA` →
  `monthlyChildcare{Infant,Toddler,Preschool,SchoolAge}`), carried from
  their NDCP study year to 2026 dollars by the BLS Employment Cost Index.
  `answersFor` prices each child of a working household by band — ages 0–1
  infant, 2 toddler, 3–4 preschool, 5–12 the school-age rate, the
  before-and-after-school care a working parent still buys (a schoolchild
  cost nothing before 2026-09-16) — and the preschool price is the
  replacement value of a "free" Head Start slot (`headStart`, above). The
  preschool price used to be the state *median* county's
  while the county and the rent were the largest county's, which understated
  the bill wherever the biggest county is also the priciest — Virginia was
  $774 against Fairfax's $1,839. Where the county itself has no NDCP price
  the state median county stands in (Connecticut only: its planning regions
  post-date the database), and where a state has none in any year the
  national median does (IN, NM); `childcareBasis` records the rule and the
  study year state by state, and `sources` carries each column's publisher,
  table, vintage, date read and exact arithmetic. Rebuild:
  `node scripts/build-state-defaults.mjs` — needs `ZYTE_TOKEN`, because
  huduser.gov answers a plain request with an empty HTTP 202 bot challenge.
- `smi.json` — 60% of state median income for a four-person household, per
  state, for LIHEAP FY2026 (and FY2025, which South Carolina's and West
  Virginia's FY2026 tables still apply), with the 45 CFR 96.85 household-size
  ladder (52% for one person, +16 points a person through six, +3 beyond).
  The publisher of record is ACF's LIHEAP-IM-2025-02 Attachment 4, which
  acf.gov will not serve to a plain request; the file is read from
  policyengine-us's transcription of it (`parameters/gov/hhs/smi/`) at a
  commit pinned in the file, so it can be re-derived byte for byte, and was
  cross-checked to the dollar against 19 state matrices on 2026-09-16.
  `liheapLimitDollars` (`core/src/liheap.ts`) turns it into the household's
  limit. Rebuild: `node scripts/build-smi.mjs`.
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
- `county-names.json` — county FIPS → name ("El Paso County", "Orleans
  Parish") from the
  [U.S. Census Bureau 2020 Gazetteer](https://www.census.gov/geographies/reference-files/time-series/geo/gazetteer-files.html)
  counties file (public domain) — the same 2020 county vintage as the
  crosswalk above, so every county it can point at has a name here
  (`countyName`). Nothing but the name is kept. Rebuild:
  `node scripts/build-county-names.mjs`.

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

- Archetype (`--offline`) curves are the state's typical working household
  of that shape — every parent working, each child priced for care by age
  band with the state subsidy claimed — and ignore age, disability, Head
  Start, housing, employer coverage, SSDI, immigration status, savings and
  self-employment. They're the honest baseline for a household shaped like
  this in this state, not this family's own numbers. Rent and county are no longer part
  of that ignore list: since 2026-09-15 every archetype uses the state's
  own typical renter (HUD FY2026 two-bedroom Fair Market Rent, Census
  Vintage 2024 most populous county — see `state-defaults.json`), not a
  household with no rent and no county at all.
- Health cost is premiums only: the money line subtracts health-insurance
  premiums net of subsidy, not deductibles, copays, or other out-of-pocket
  spending.
- Immigration status, savings and self-employment are asked (`--status`,
  `--years-in-us`, `--savings`, `--self-employed`; citizen, none and wages
  by default) and sent to the model, which gates on them: an undocumented
  parent loses the EITC and their share of SNAP, a permanent resident under
  the five-year bar loses Medicaid — and since 2026 a marketplace subsidy
  below the poverty line too (P.L. 119-21) — and $5,000 in the bank ends
  SNAP where there is no broad-based categorical eligibility. Children are
  modeled as citizens; the model applies no five-year bar to SNAP (its rule
  is a status list); work hours are full time unless `--hours` says
  otherwise. The archetype sweep is unchanged by any of this.
- The entitlements — SNAP, TANF, Medicaid, WIC — are taken up unless the
  household says otherwise (`--no-snap` etc.). Then the curve is the money
  it lives on without them, and the report says what each would pay at
  today's earnings, from a second curve with everything claimed.
- A loss a federal rule defers to a later renewal still counts as a cliff,
  from 2026-09-17. Head Start's program-year carry-over (45 CFR
  1302.12(j)(1)), a child's 12 months of continuous Medicaid or CHIP
  eligibility (42 CFR 435.926) and a parent's Transitional Medical
  Assistance (42 U.S.C. 1396r-6) all mean a household crosses the threshold
  before the money stops. HotGap used to lift those drops out of the curve
  it read the verdict from, on the reasoning that a family whose Head Start
  slot is guaranteed through the next program year is not standing in the
  hole the day it takes the raise. That reasoning is withdrawn: the family
  loses the money, and a tool built to show what a raise does has to show
  it. So the verdict, the danger zones, the leap, the safe exit and every
  `summary.json` metric are read off the real curve, and the deferral is a
  label on the cliff instead — the DeferredBadge saying when the loss lands
  and under which rule, plus a timing clause on the answer ("… but not that
  day"). There is no second, lifted curve anywhere in HotGap; the honest
  reading and the drawn reading are the same one. What moved: the
  California single-parent pipeline fixture's largest one-step loss went
  $3,868 → $21,971 at $30,000, because Head Start is now its worst step.
- The keep rate is an effective marginal tax rate, measured over one fixed
  stretch of the curve. Of each extra dollar a household earns climbing from
  100% to 200% of the federal poverty guideline for its size — the road out
  of poverty — it is the share left after taxes take theirs and benefits fall
  away: `(net(hi) − net(lo)) / (hi − lo)`, stated in cents because that is
  how a person hears it. One minus it is the EMTR the Atlanta Fed's CLIFF
  tool, CBO and the benefits-cliff literature report; a cliff is an EMTR
  above 100%, which is a keep rate below zero. Two things it is not. It is
  the MODELED family's rate (§ Archetype curves above: a renter in the
  state's largest county, every parent working, each child priced for care,
  claiming what it is entitled to), not any real household's. And the road is
  FEDERAL on purpose, so every state's road is the same road: the obvious
  alternative — each state's own minimum wage to its own median — was
  measured first and rejected, because it makes the poorest states look
  kindest, a $7.25 floor and a $30,000 median describing a road too short and
  too low to cross a cliff. Where a state's own families sit on the fixed
  road is reported separately, as `familiesBelowHi` and each cliff's
  `position`, and never folded into the rate. Plan 9,
  `docs/superpowers/plans/2026-09-18-hotgap-keep-rate.md`.
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
  Premium Subsidy (150%). PolicyEngine models all four since August 2026
  and the hosted engine serves them (`core/src/statePremiumAssistance.ts`:
  nine states in all), so the sweep nets the engine's own figure out of the
  premium; on an endpoint that predates those releases HotGap zeroes the net
  premium in that band itself, each bound read from the state's own page
  (the table in `core/src/statePremiumWraps.ts`, applied by `evaluate.ts`'s
  `applyPremiumWrap`). The reduced-premium tiers above the $0 band are in
  that table too where the state publishes them — Massachusetts'
  ConnectorCare Plan Types 2B–3C to 400% FPL, priced per person on the
  plan, California's scale to 165%, New Mexico's to 250% — so a band edge
  steps to the state's real next price. Before 2026-09-15 Massachusetts
  premiums above 200% FPL were overstated by up to $9,300 a year (external
  validation, `docs/reviews/2026-09-15-external-validation.md`); before
  2026-09-16 a Massachusetts family's were understated once the children
  left MassHealth, because the ladder charged the parent's premium alone.
- Two more states pay a flat amount per person per month instead: New
  Jersey's NJ Health Plan Savings ($20 to $100 by income band, to 600% FPL,
  paid even where the federal credit is $0) and Washington's Cascade Care
  Savings ($55 to 250% FPL). PolicyEngine models both since August 2026 and
  the hosted engine serves them, so the sweep nets the engine's own figure
  out of the premium (`core/src/statePremiumAssistance.ts`); on an endpoint
  that predates those releases, the same schedules are applied locally from
  `PER_MEMBER_PREMIUM_HELP` in `core/src/statePremiumWraps.ts`. Until
  2026-09-16 neither was modeled anywhere and the two states were hatched
  "figures incomplete" on the journalist map; the schedules, their sources
  and the before/after are in
  `docs/research/premium-assistance-nj-wa-2026-09-16.md`.
- The childcare subsidy reaches PolicyEngine's net income in only 23 states.
  PolicyEngine models a CCDF child-care subsidy in every state, but only the
  states listed in `gov.household.household_state_benefits` flow into
  `household_net_income`; in the rest the money is computed and dropped, and
  the household is left looking POORER for holding it, because the
  net-of-subsidy childcare bill shrinks SNAP's dependent-care deduction and
  the CDCC while the benefit never arrives (Connecticut, single parent with a
  3-year-old, $25,000 of pay: $34,121 against $38,102 with the subsidy forced
  off, for an $8,850 benefit). HotGap adds it back in those states — a
  WORKAROUND (in `core/src/parse.ts`, with the table in
  `core/src/stateChildcareSubsidies.ts`) on a model that predates
  policyengine-us PR #9503, which routes every state's subsidy into household
  benefits; the client probes each endpoint for which kind it is and stands
  the addition down where it is no longer needed. Four of the 38 states
  whose variable is deployed today still return $0 for a plainly eligible
  household — California, Massachusetts, Maryland and Nebraska — and HotGap
  reports no subsidy there rather than inventing one; see
  [local corrections and evidence](docs/upstream/2026-09-15-local-corrections.md)
  for each cause.
- Energy assistance (LIHEAP) is shown as an eligibility BOUNDARY, never
  drawn into the money line by default. It is a block grant, not an
  entitlement: a family under the state's limit is eligible to apply, and in
  FY2024 the states served 3% (Texas) to 85% (Michigan) of their
  income-eligible households, about 12% nationally. So every evaluation
  carries `liheap` — the earner's pay at the state's heating limit, what the
  state pays at that top income band, and the served share — from a 51-row
  table hand-read from the LIHEAP Clearinghouse's FY2026 tables and matrices
  and ACF's FY2024 state profiles (`core/src/liheap.ts`, one source URL and
  date per row; 60% of state median income from `core/data/smi.json`, built
  by `scripts/build-smi.mjs` from policyengine-us's transcription of ACF's
  LIHEAP-IM-2025-02 table at a pinned commit). The dollars enter the curve
  only behind `getsEnergyAssistance` (`--energy-assistance`), off by default
  like housing and the child-care subsidy; on, the state's published amount
  is a program series (`programs.liheap`) that ends at the limit, so its loss
  joins whatever else ends in that step — one cliff, one breakdown. The
  amount is HotGap's own table in every state today: PolicyEngine models
  DC, MA and IL's schedules but none reaches its net income
  (`docs/upstream/2026-09-16-liheap-net-income-issue.md`), and all of them
  return $0 on HotGap's payload because each is capped at or keyed on a fuel
  and heating bill HotGap never asks for. Michigan's heating money is the
  refundable Home Heating Credit, which PolicyEngine models and HotGap
  already counts in state credits; `--heat-in-rent` halves it, as the
  state's form does. Plan 7, `docs/superpowers/plans/2026-09-16-hotgap-liheap-boundary.md`.
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
    npm run typecheck       # wrangler types, then tsc -b core pipeline app worker
    npm run contract        # live PolicyEngine contract check (public API, or HOTGAP_PE_URL)
    npm run pipeline        # re-run the weekly PolicyEngine sweep locally (~35 min on the engine; 51 states x 11 archetypes)

`npm run pipeline` also takes `--from-data` (recompute summary/state metrics
from already-fetched curves, no PolicyEngine calls) and `--dry-run` (build every request payload
without calling PolicyEngine or writing files).

**Which PolicyEngine.** Every request goes to `HOTGAP_PE_URL` when it is set,
else to the public API. The public API runs an older model (its service
version 1.764.6 in September 2026, serving a model that matched
policyengine-us 2.2.0; `fixtures/README.md`) that lacks 13 states'
child-care subsidies and takes 35–40 s per policy-override request, so the
sweep — and anything else that can — runs on `engine/`, HotGap's own copy of
the one endpoint it calls, pinned to the latest release in
`engine/requirements.txt`. Dependabot bumps that pin; CI's `engine-contract`
job runs the live contract suite against the engine on every push, so a
release that breaks an assumption `core/` makes fails there. `summary.json`
and each state file record the model that produced them (`model`). The
public API stays the fallback for a `hotgap` run with no engine, and
`.github/workflows/contract.yml` watches it daily.

    pip install -r engine/requirements.txt
    gunicorn -c engine/gunicorn.conf.py --bind 127.0.0.1:8099 --workers 4 engine.app:app &
    HOTGAP_PE_URL=http://127.0.0.1:8099/us/calculate npm run pipeline

A hosted copy runs on a DigitalOcean droplet for the personal path
(`engine/README.md`, "Hosted on DigitalOcean"; `scripts/hosted-engine.mjs
up|down|status`): `.env.example` names the two variables that point the
CLI at it, URL and bearer token.

`.github/workflows/places-data.yml` runs the sweep on the engine every
Monday at 07:00 UTC (and on manual dispatch), running the test suite and
typecheck before committing. Data commits only when the swept numbers
changed — `generated` in `summary.json` and each state file is the stamp of
the sweep that last changed that file, not of the most recent sweep; a
`--from-data` rebuild of the summary keeps the newest state file's stamp,
since adding a derived field is not a sweep. It is a UTC instant, and the
pages print its date in the reader's own time zone.

Estimates only — a caseworker decides real benefits.

## History

The first site UI, design system, and Cloudflare Worker were split out of
this repo and live at git tag `ui-archive`; the deployed site at
hotgap.hotgap.workers.dev still runs that July core until the new `app/` and
`worker/` are deployed. `docs/superpowers/` specs and plans predate that
split and cite paths (`app/`, `worker/`, `shared/`) that have since been
re-founded on the current core.

License: AGPL-3.0-only.
