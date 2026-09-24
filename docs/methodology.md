# Methodology

How HotGap turns a household into a PolicyEngine request, and every place
where its numbers are a simplification, a local correction, or a known gap.
The short version is in the [README](../README.md#what-it-does-and-doesnt-model).

## The headline figures

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
[the methodology validation](reviews/2026-09-14-methodology-validation.md)
for how that was found and fixed. Rationed programs (Head Start, a housing
voucher, a childcare subsidy, employer coverage) default to "off." From the
curve, HotGap derives **the leap** — the raise a family must clear in one move
to get past the worst rough zone and earn safely again — and **reach** — where
that leap lands among real households' incomes.

## Inputs to PolicyEngine

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
  the MODELED family's rate (the first point above: a renter in the
  state's largest county, every parent working, each child priced for care,
  claiming what it is entitled to), not any real household's. And the road is
  FEDERAL on purpose, so every state's road is the same road: the obvious
  alternative — each state's own minimum wage to its own median — was
  measured first and rejected, because it makes the poorest states look
  kindest, a $7.25 floor and a $30,000 median describing a road too short and
  too low to cross a cliff. Where a state's own families sit on the fixed
  road is reported separately, as `familiesBelowHi` and each cliff's
  `position`, and never folded into the rate. The road's top carries a
  one-step allowance for the grid: a program limit sitting on the
  200%-of-poverty line can only be placed at the nearest sampled point, and
  SNAP's broad-based limit — tested against a fiscal-year-blended poverty
  figure a little above the calendar guideline — lands in the step starting
  at the first point at or above the line ($54,000 for a family of three,
  where twice the guideline is $53,300), so the road's last step is that one
  and the rate spans it, rather than the measure excluding by construction
  the most common cliff at the top of the road. Plan 9,
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
  [local corrections and evidence](upstream/2026-09-15-local-corrections.md)
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
  [local corrections and evidence](upstream/2026-09-15-local-corrections.md)
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
