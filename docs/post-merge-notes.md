# Post-merge notes — personal door v1 (2026-07-11)

Deferred findings from the final whole-branch review (all judged non-blocking):

## Product / UX
- Military APO/FPO ZIP prefixes (090-098, 962-966) get generic "does not look right" copy
- Kid-disability checkbox is a native control (<44px on its own); invalid age has no inline hint
- Leading "0" in the pay field flashes clear via the money-text resync
- No focus management on loading->result/error transitions; radio chips lack roving tabindex
- "fewer/more kids" aria-labels hardcoded (not in en.json); "$/hour" chart unit labels likewise
- ~~result.chart.yLabel string is unused (y-axis unlabeled beyond $Nk ticks)~~ RESOLVED
  (Plan 4, Task 28): repurposed as a real rotated y-axis label on `CurveChart`, carrying the
  health-adjusted "after health costs" framing.
- Lost-program with $0 current value reads oddly in the why-list

## Engineering
- contract/ and app/e2e outside tsc typecheck project (add a tests tsconfig)
- PayUnit switches lack exhaustiveness guards; PROGRAM_IDS could be readonly as const
- parse.ts: prefer `in` over truthy check; programs Record type can under-populate keys
- Two-source program summing (head_start + early_head_start) unpinned by unit test
- Contract fixture request hand-aligned with buildPEPayload — generate it from buildPEPayload
- vitest exclude glob "**/e2e/**" is broad
- Worker: duplicated timeout-name condition; /api/health accepts POST; spouse earnings
  validated before zeroing when unmarried
- d3 y.ticks(4) can render 5 ticks; chart danger rects use index keys

## Before public launch
- Add AGPL source link to the site footer (§13 hygiene + civic trust)
- Consider Cloudflare rate-limit rule (open proxy to PolicyEngine; cache keys are exact
  floats — rounding earnings to $100 in validate would raise hit rates)
- Document the 7-day edge cache in a privacy note
- Spec records "Why?" expanders with EMTR slopes; shipped as a flat why-list (scope cut)

## Next: Plan 2 — places door
Batch pipeline (Python + policyengine-us, GitHub Actions weekly) -> state gap scores
("biggest possible loss" + danger-zone width per archetype) -> choropleth + drill-down,
plus per-state archetype fallback curves for the personal door's error path.

# Post-merge notes — places door (2026-07-11)

Deferred from the places-door final review (all non-blocking):
- Code-split the places route (React.lazy) — topology+summary ride in the main chunk (~106KB gzip total)
- Quantile bins (with plain-words legend) would discriminate better than equal-width-from-zero
- Radio chips lack APG roving tabindex (both flow and places pickers); stepper count not aria-live
- State <select> has no disabled "Choose a state" placeholder option
- Pipeline: no User-Agent identifying the bot; 400s retried same as 5xx
- topojson-specification used but undeclared (transitive dep); credit us-atlas/Census in README
- dangerWidth shipped in summary.json but unused in UI
- Fallback picker ignores age/disability/rent (framed by the assumptions line, but could match better)
- PlacesPage tests couple to live summary.json values (may need updating after weekly refreshes)
- Manual screen-reader pass (VoiceOver/NVDA) on the map still recommended

# Post-merge notes — escape metrics (Plan 3, 2026-07-11)

Deferred from the whole-branch review (non-blocking):
- summary.json ships `safeExit` per archetype but the app never reads it (drill-down recomputes it live); like `dangerWidth`, it's a duplicated/unused bundled field — trim or consume.
- StatePanel recomputes escapeAnalysis+narratePlacesEscape on every render (unmemoized); trivial cost, but a useMemo would match the page's discipline.

Plan 4 candidate (researched, see docs/research/2026-07-11-wage-distribution-data-sources.md):
- A "reach" metric — overlay the leap on real wage distributions to answer "is the jump attainable?" Verify PolicyEngine's enhanced-CPS microdata (state-keyed household incomes) is reusable from our pipeline FIRST; else ACS PUMS. Cross-sectional feasibility signal only, never framed as mobility odds.

# Post-merge notes — health-adjusted resources (Plan 4, 2026-07-11)

Deferred from the whole-branch review (non-blocking):
- EscapePath can render "Your path off help" with only the health-cost line (always_up household with health cost, no cliff/leap/thresholds); intended + test-covered, but consider a neutral wrapper heading if it ever reads oddly.
- Two doors surface health cost at different granularity by design: personal door shows a concrete dollar figure at the user's earnings; map drill-down shows only the static framing note (an archetype has no "current earnings"). Honest, not inconsistent.

# Post-merge notes — model honesty (Plan 6, 2026-07-11)

Deferred from the whole-branch review (non-blocking):
- Toggles.tsx has a dead `if(visible.length===0) return null` branch (housing/ESI rows are always shown) — harmless defensive code.
- ESI inputs are set on "you" only (correct for a single family ESI plan; adding to spouse would double the premium).
- Fallback path (live API down) ignores take-up toggles — it serves the honest-baseline archetype curve, so a flip has no effect in degraded mode. Archetype curves only exist for the baseline; revisit if per-toggle fallbacks are wanted.
- Each toggle flip briefly shows the loading spinner (whole-page loading state) before the recomputed result — UX polish, not a defect.

Still open from the adversarial review (Plan 7+ candidates): reach income-concept mismatch (employment vs household income) + vintage; uncertainty bounds on reach; external validation vs Atlanta Fed PRD; take-up modeled as user input, not probability; assets/immigration/other-income/household-composition questions; county-level (Plan 7); CCDF childcare subsidy (blocked on PolicyEngine).

# Post-merge notes — county-level (Plan 7, 2026-07-11)

Deferred from the whole-branch review (non-blocking):
- No runtime shape-validation of the fetched crosswalk JSON (self-generated, same-origin; worker re-validates FIPS format — end-to-end safe).
- translate uses truthy `if(a.countyFips)` not `!==null` (safe: validate only ever yields a 5-digit string or null).
- No App.test for the mount-effect crosswalk load (covered by the deterministic e2e).
- Contract PTC-diff threshold is loose ($100 vs ~$2,200 observed) — deliberate anti-flake margin.

County scope reminder: county is a live personal-door enhancement only (ACA rating-area accuracy, meaningful in high-cost states, ~nil in flat ones). The map stays state-level by design.

# Post-merge notes — reach earnings basis (Plan 8, 2026-07-11)

Whole-branch review (Opus) verdict: READY, no Critical/Important. Data
independently re-validated (all 398 non-null cells monotonic, non-negative,
21 points; WY single-2 median $47,000 = design probe $42k × 1.12). Two Minor
items fixed in the builder (dead `fips` param removed; numeric-column quote-
stripping made fail-safe for a future PUMS vintage — output-neutral today).

Accepted tolerances (not changed — swamped by the deliberately-approximate
×1.12 inflation factor and $100 rounding):
- ADJINC (2023 ≈ 1.006, converts rolling-reference income to survey-year
  dollars) is not applied; <1% effect.
- Earnings floor WAGP and SEMP per-component at 0, so a business loss that
  offsets wages isn't netted. This is the documented intent; direction is
  mildly non-conservative (nudges the jump to look marginally easier);
  magnitude negligible.

Still-open review items unchanged: uncertainty bounds on the reach line;
external validation vs Atlanta Fed PRD; the no-escape next-step resource
pointer (deferred per user "not now").

# Core split (2026-09-14)

The React UI (`app/`), design system, Claude Design sync inputs
(`.design-sync/`), and Cloudflare Worker (`worker/`) were archived out of
this repo to git tag `ui-archive`; the deployed site at
hotgap.hotgap.workers.dev keeps running untouched. What remains is the
calculation library and its supporting data/tooling: `core/` (`@hotgap/core`,
formerly `shared/`), `pipeline/`, `scripts/`, `contract/`, `fixtures/`,
`docs/`.

UI-only modules went with the archive: narration, chart labels, map color
ramps, `en.json` strings, the readability gate, and the Playwright e2e
suite. They had no life outside the site.

The modules that were genuinely shared logic, not UI, moved into
`@hotgap/core` instead of being deleted: `worker/src/translate.ts` and
`worker/src/validate.ts`, and `app/src/lib/{zip,county,fips,states,minWage,
reachLookup,fallback}.ts`. They now live at `core/src/translate.ts`,
`core/src/validate.ts`, `core/src/zip.ts`, `core/src/county.ts`,
`core/src/states.ts`, `core/src/minWage.ts`, `core/src/reachLookup.ts`, and
`core/src/fallback.ts`.

The state list was previously duplicated: `validate.ts`'s state check and
the pipeline's `ALL_STATES` sweep list were each their own hand-maintained
array. Both now derive from `core/src/states.ts`'s `STATE_CODES` — one list
of states in the repo, checked everywhere else against it.

Weekly-sweep noise-commit fix: `pipeline/src/run.ts` now compares each new
summary/state file against what's on disk with the `generated` timestamp
stripped, and skips writing (so nothing is git-added) when the numbers
themselves are unchanged. `generated` in the committed data means "the sweep
that last changed this file's numbers," not "the most recent sweep to run" —
see `core/src/data.ts`.

Still-open items carried forward (not UI-specific, so not resolved by the
split): uncertainty bounds on reach; external validation vs the Atlanta Fed
PRD; assets/immigration/other-income (and household-composition) input
questions; CCDF childcare subsidy, blocked on PolicyEngine support.

Rounding domain (found while proving the noise fix): the sweep stored whole-dollar
curves but computed `summary.json` from the unrounded floats, so `--from-data`
drifted by $1 in 114 `biggestLoss` cells and by one $1,000 grid step in six
Kansas escape metrics — the summary disagreed with its own stored curve. The
sweep now rounds each curve once at ingestion and derives both artifacts from
the same points; `summary.json` was rebuilt from the stored curves.

# Net-income correction (2026-09-14)

A methodology review (a policy-fellow agent; top finding re-verified by a
direct PolicyEngine decomposition on a second household) found that
`core/src/parse.ts` computed `net = household_net_income − premium_tax_credit −
MOOP`. The premise, recorded in the July adversarial review and in Plan 4/6,
was that PolicyEngine's net income already contained the PTC. It does not:
`household_net_income == household_market_income + household_benefits +
household_refundable_tax_credits − household_tax_before_refundable_credits` to
the dollar, and the refundable credits are the EITC and refundable CTC only.
MOOP is already the premium net of the PTC, so the stored curves were cash
minus the GROSS premium — the subsidy was erased. The fix is `net = rawNet −
moop`; the contract suite now pins the identity live. Regenerating the sweep
changes most cells: on the CA single-parent fixture, safe exit moves $81k →
$91k because the real 400%-FPL subsidy cliff ($84k) becomes visible, and the
leap shrinks $52k → $45k.

Every factual claim in that review was then validated against primary federal
and state sources by four independent research agents plus two follow-ups;
see `docs/reviews/2026-09-14-methodology-validation.md` for the verdicts,
the corrections to the review (NY Essential Plan now ends at 200% FPL; the
Massachusetts TAFDC figures came from PolicyEngine and are wrong; children's
Medicaid cannot end mid-year), and the split between HotGap fixes and
PolicyEngine upstream reports.

Still open from the same review, each a methodology decision: coverage-gap
households in the nine non-expansion states are charged the full benchmark
premium instead of being uninsured; the employer-coverage premium constants
never reach the money line; cliff labels name programs that merely phased
down; program-end and benefits-end mix children's and parents' limits and
sticker values; "disabled" models SSI only (no SSDI/SGA cliff); reach ladders
include retirees and ignore spouse earnings; personal safe-exit/leap are
whole-curve rather than zone-relative; Head Start is a $22k sticker value with
an instant cliff; the sweep axis stops at $100k.

# Methodology findings addressed (2026-09-14)

Every library-side finding in
`docs/reviews/2026-09-14-methodology-validation.md` (the "what is HotGap's
to fix" list) is implemented, each rule verified live against PolicyEngine
before being written down (commits `93b4bb8`, `cb919f6`, `27a9392`).

**Implemented, one line each:**
- Cliff attribution: `core/src/analyze.ts` (`CliffBreakdown`, `breakdownOf`) — every cliff's drop is decomposed into benefits, credits, premiums, and other, summing to the drop exactly.
- Program labels: `core/src/analyze.ts` (the `programsLost` filter in `analyzeCurve`) — a program is named only when it ends or loses more than half its value in one step, never on a mere phase-down.
- Program-end / benefits-end conflation: `core/src/escape.ts` — `programEndsByAge` reports adults and children separately; `childCoverageEndEarnings` reports the threshold with the federal 12-month continuous-eligibility deferral noted; `benefitsEndEarnings` counts money only, never a Medicaid/CHIP sticker value.
- Coverage gap: `core/src/evaluate.ts` (`applyCoverageGap`, `coverageGapSummary`) — below 100% of the 2025 FPL with no adult Medicaid, no premium credit, and no employer plan, the phantom benchmark premium is removed and the point is flagged `coverageGap: true`.
- Employer coverage: `core/src/evaluate.ts` (`applyEmployerCoverage`) with the constant in `core/src/policyYear.ts` (`ESI_EMPLOYEE_CONTRIBUTION`, AHRQ MEPS-IC 2024: $1,789 single / $7,216 family) — replaces PolicyEngine's marketplace premium with the household's own employee contribution.
- Head Start: `core/src/evaluate.ts` (`applyHeadStart`, `headStartSummary`) — valued at the household's own reported childcare cost, capped at PolicyEngine's sticker value, noted as deferred under 45 CFR 1302.12(j)(1).
- SSDI / SGA cliff: `core/src/client.ts` (`fetchSplicedForSSDI`) with `core/src/policyYear.ts` (`SGA_MONTHLY`/`SGA_ANNUAL`, $20,280) — two PolicyEngine requests, spliced at the 2026 SGA threshold, so the whole check switches off in one step.
- Other income inputs: `core/src/types.ts`, `core/src/validate.ts`, `core/src/translate.ts` add `ssdiMonthly`, `childSupportMonthly`, `unemploymentMonthly`; `core/src/evaluate.ts` nets the steady (non-means-tested) ones out of `otherBenefits` so "benefits end" isn't permanently unreachable for a household that reports them.
- Personal path: `core/src/evaluate.ts` (`personalEscape`, `PersonalEscape`) — a zone-relative escape earnings and raise-to-clear for this household specifically, alongside the existing whole-curve safe exit and leap.
- Reach ladders: `scripts/build-reach.mjs` rebuilt — ADJINC applied per record, householder restricted to age 18–64, ladder built on householder-plus-spouse `PERNP` only, replicate-weight (WGTP1–80) margins of error with MOE-based suppression, 2024 1-Year PUMS with the 2020–2024 5-Year substituted for five small states, BLS ECI growth factor 1.067533; `core/src/reachLookup.ts` (`reachCell`) exposes the margin; `core/src/evaluate.ts` now passes householder-plus-spouse earnings into `reachForHousehold` to match.
- Sweep axis: `core/src/translate.ts` (`axisSpec`) first moved the flat top from $100,000 to $150,000 at $1,000 steps (`cb919f6`), then — after the resweep showed twenty cells with no safe exit because a flat $150,000 axis still clipped the 400%-FPL subsidy cliff for four- and five-person households — was widened again to run past `4 × fpl2025(state, size) + 40,000` for the household's own size (`27a9392`): $150,000 (151 points) for one to three people, $170,000 (171) for four, $195,000 (196) for five, coarser steps only beyond $350,000.
- Pipeline: `pipeline/src/metrics.ts` carries `leapIsLowerBound` into `summary.json`; `pipeline/src/build.ts`/`run.ts` validate each archetype's curve against its own `axisSpec` and round the new fields.

**Deliberately not done, and why:**
- SSDI has no trial-work-period timing: `core/src/client.ts`'s splice is the steady-state rule only — SSA's nine-month trial work period and 36-month extended eligibility period mean a worker does not lose the check the month they first cross SGA, and none of that timing is modeled, so the curve answers "at this pay, eventually," never "next month."
- Head Start is valued at reported childcare, not added on top of it: `core/src/evaluate.ts`'s `applyHeadStart` caps the value at `12 * monthlyChildcare`, so a family reporting $0 childcare gets $0 of Head Start value even though PolicyEngine still prices the slot at its ~$22k sticker cost.
- ESI replaces rather than adds to the premium: `core/src/evaluate.ts`'s `applyEmployerCoverage` substitutes the MEPS-IC employee contribution for PolicyEngine's marketplace premium rather than charging both, because PolicyEngine already zeroes the premium tax credit for an ESI household and charges the full unsubsidized marketplace premium — adding the employee's share on top would double-charge them.
- The coverage-gap rule needs `childPrograms` to separate a parent's Medicaid from a child's, so it is withheld on any curve swept before that field existed: `core/src/evaluate.ts`'s `knowsWhoHolds` check, same guard used for `programEndsByAge` and `childCoverageEndEarnings`.
- Zero-SE reach medians are flagged, not GVF-corrected: per `core/data/reach.json`'s `suppression` metadata and `scripts/build-reach.mjs`, a cell where an interior ladder point has a zero replicate variance is marked `seZero: true` rather than having a generalized-variance-function standard error substituted for it — Census's own guidance says a median should never have a zero SE, and this build reports "unmeasured here," never "exact."
- `core/src/translate.ts` still sends the MEPS-IC employee contribution in PolicyEngine's `employer_sponsored_insurance_premiums` field even though the field is inert ($6,500 and $13,000 produce byte-identical output, verified live): the field is documented as the *employer's* share, not the employee's, so if PolicyEngine ever starts using it, this needs to switch to the MEPS total premium minus the employee contribution rather than the employee contribution itself.

**Still upstream, not HotGap's to fix** — see
`docs/upstream/2026-09-14-policyengine-issues.md` for the live-probed detail
and the exact PolicyEngine commit each was checked against:
- Massachusetts TAFDC's payment standard and abrupt end (Issue 1) and New York's Essential Plan ceiling stuck at 250% FPL past its 2026-07-01 end date (Issue 2) are PolicyEngine parameter bugs, not HotGap's.
- The coverage-gap benchmark premium (Issue 3) and the employer premium input not reaching medical out-of-pocket (Issue 4) are PolicyEngine behavior HotGap works around in `evaluate.ts`, not something HotGap can fix upstream of the API.
- Six non-expansion states' parent/caretaker Medicaid limits differ from what each state currently publishes (Issue 5): five (TX, MS, GA, FL, WY) hold a frozen *dollar* standard, last stamped 2021 (GA 2025), that drifts further from the real percentage every January the guidelines rise; South Carolina's parameter is a flat 100% FPL, stamped 2021, that simply does not match the state's published 67% and never has. The five are flagged in the README's Honesty section; none of the six are hand-corrected in HotGap, since HotGap has no authority to override PolicyEngine's eligibility determination.
- Three review candidates were disproved by the live probes rather than confirmed, so nothing was implemented for them: the below-100%-FPL immigrant PTC exception is already off for 2026 in PolicyEngine's parameters, the APTC repayment cap is simply unmodeled (not wrongly modeled), and the SNAP non-citizen allowlist already matches the 2025-07-01 statute.

Whole-branch review (Opus, independent) on the findings branch: READY WITH
FIXES, all applied. The two blockers were read-time bugs in the new code, not
in the data: cliff attribution counted the premium tax credit as a credit
*and* as a premium (it reaches net income only through the premium — 79% of
stored cliffs carried a phantom "credits" share), and the coverage-gap floor
counted child support, which is not in MAGI, so a Texas parent with child
support got the phantom premium back between the two lines and a fabricated
cliff. Also fixed: programs are named on a cliff only when their loss is at
least a fifth of the drop, with a `driver` naming the dominant component
otherwise (an SSDI stop or a premium jump no longer prints as "lost aca" or
"lost snap"); the employer-coverage charge follows who the plan must cover
(adult on Medicaid pays nothing; children on Medicaid, single tier for an
unmarried parent) instead of whether PolicyEngine happened to charge a
premium; the reach guard looks at householder-plus-spouse earnings; the
reach builder merges partial runs and offers the 5-Year PUMS to any cell the
1-Year cannot support (406 of 408 now publish); the axis keeps $1,000 steps
through $350,000 so no admissible household gets a coarser grid; stored
curve points no longer carry a constant `coverageGap`; the upstream evidence
lives in `docs/upstream/evidence/`.

# Massachusetts grant fed back to the engine (2026-09-15)

The local TAFDC correction no longer leaves SNAP on upstream's TANF. After
the axis request, `core/src/client.ts` (`resampleMaTafdc`) re-requests every
point whose corrected grant differs from PolicyEngine's — about thirty for a
household with children — with `ma_tafdc` forced as a scalar SPM-unit input
on a two-point axis, and splices the engine's answer back. SNAP, EAEDC,
categorical eligibility and net income then follow from the corrected grant
with no local benefit math. Fed-back points carry
`engineUsedCorrectedGrant: true`; `correctMaTafdc` reports
`linkedBenefitsRecomputed` and says so in its message. Verified live before
building: at $26,000 with the grant forced to $3,972, SNAP rose from $6,019
to $7,836. Rejected on the way: an array of grants along the axis (HTTP 500,
Codex's probe) and a parallel axis on `ma_tafdc` (rejected twice, in two
ways). The pipeline's queue helper moved into core and is shared. Still
unmodeled: the six-month full disregard's timing and new-applicant
eligibility. The step becomes a no-op when policyengine-us PR #9477 merges.
Speed: measured on fresh households, the loop runs eight point requests at a
time (the API saturates past ten) and skips differences of $100 or less, so a
five-person household evaluates in about 26 s instead of 80; the sweep passes
`resampleConcurrency: 3`. Pre-rolling per household is not possible (rent,
childcare and spouse pay change the answer), but the weekly sweep already
pre-rolls the archetypes, so the offline path is instant.

# Second methodology review addressed (2026-09-15)

**Implemented, one line each:**
- Filer flag: `core/src/translate.ts` sends `tax_unit_is_filer: true` on
  every request — without it PolicyEngine zeroed the credit for a childless
  couple between the EITC's end and the joint filing threshold while still
  charging the full premium, an $18,780 cliff at $30,000 that was the
  largest "loss" for that archetype in 45 states.
- Children's WIC and SSI: `core/src/translate.ts`'s `PERSON_VARS` now asks
  every person, children included — the constant "other benefits" in every
  curve with a young child was the child's untracked WIC.
- Hours worked: `core/src/validate.ts` (`hoursPerWeek`, 1–80 when given) and
  `core/src/translate.ts` (`weekly_hours_worked_before_lsr`) — Massachusetts'
  TAFDC dependent-care deduction and the employer-coverage 30-hour floor
  both scale by it.
- SSDI's "stopped" request: `core/src/client.ts`'s `ABOVE_SGA` option
  (`ssiPathway: false`) drops `is_ssi_disabled` from the above-SGA request,
  so working at substantial gainful activity no longer grants an SSI finding
  (and SSI-linked Medicaid) a person could never actually get.
- Archetypes: `core/src/archetypes.ts`'s `answersFor` now reads
  `core/src/stateDefaults.ts` for a typical renter — HUD FY2026 two-bedroom
  Fair Market Rent and the Census Vintage 2024 most populous county — in
  place of the null rent and null county every swept cell used to send.
- Head Start's replacement value: `core/src/evaluate.ts`'s
  `applyHeadStart`/`headStartSummary`, backed by `core/src/stateDefaults.ts`'s
  `monthlyChildcarePreschool` (DOL National Database of Childcare Prices) —
  a family reporting $0 childcare because the Head Start slot IS the
  childcare now gets the state's market price of a preschool slot, not $0.
- Per-adult/per-child attribution: `core/src/analyze.ts`'s `Group` types
  (`HOUSEHOLD`/`ADULTS`/`CHILDREN`) run the cliff-notch test per group, not
  just on the household total — 94 of 271 adult Medicaid ends that fall on a
  cliff step in the 2026-09 sweep went unnamed under the household-only test.
- State credits as credits: `core/src/translate.ts` requests
  `household_refundable_tax_credits`; `core/src/analyze.ts`'s `breakdownOf`
  folds `stateCredits` into `credits`, not `other`.
- CTC from the total credit: `core/src/translate.ts` requests `ctc` (the
  whole credit) alongside `refundable_ctc`; `core/src/escape.ts`'s
  `programEnds.ctc` reads the total, while a cliff's own `programsLost` and
  `breakdown.credits` keep the refundable series, labeled as such in
  `core/src/cli.ts`'s report.
- Deferred losses: `core/src/analyze.ts` (`DeferralReason`, `Deferral`,
  `deferralOf`) marks a cliff whose cost is carried forward by Head Start's
  program-year rule, a child's 12-month continuous eligibility, or a
  parent's Transitional Medical Assistance; `core/src/evaluate.ts`'s
  `immediateCurve` lifts those drops out of the curve that drives the
  verdict, the danger zones, the leap, and the personal path, while
  `HouseholdEvaluation.deferred` and `analysis.cliffs` still carry every one
  of them in full.
- Summary counts them apart: `pipeline/src/metrics.ts`'s `stateMetrics`
  reads `deferred` off the shared evaluation and reports
  `deferredCliffCount` next to `cliffCount`; `core/src/data.ts`'s
  `StateMetrics` carries the new field.
- Medicare for SSDI: `core/src/evaluate.ts`'s `applyMedicare`, backed by
  `core/src/policyYear.ts`'s `MEDICARE_PART_B_MONTHLY`/`_ANNUAL` ($202.90,
  CMS, 2025-11-14) — no marketplace premium or credit for the recipient,
  Part B charged unless they are on Medicaid.
- Employer coverage's three tiers: `core/src/evaluate.ts`'s `esiTierAt`,
  backed by `core/src/policyYear.ts`'s `ESI_EMPLOYEE_CONTRIBUTION`
  (single/plusOne/family) and `ESI_FULL_TIME_HOURS` (30) — a per-adult
  Medicaid guard and a 30-hour floor, decided by who the plan actually has
  to cover.
- State premium wraps: `core/src/statePremiumWraps.ts`'s table, applied by
  `core/src/evaluate.ts`'s `applyPremiumWrap` — Connecticut (175% FPL),
  Massachusetts and California (150%), New Mexico (200%) each zero the net
  premium in their own $0-premium band.
- Massachusetts ongoing grant vs. September extra: `core/src/maTafdc.ts`'s
  `maTafdcGrantParts` splits the ongoing monthly grant from the one-month,
  $500-per-child September clothing allowance, so `programs.tanf` reports
  only the ongoing grant and "TANF ends" means that grant's end.

**Deliberate choices:**
- Medicare assumes the 24-month wait is already past: HotGap never asks how
  long a household has been receiving SSDI, so `applyMedicare` models every
  SSDI household as already Medicare-entitled. The error runs one way — a
  household in its first two years on SSDI would in reality still owe a
  marketplace premium, and this leaves it out.
- `immediateCurve` (`core/src/evaluate.ts`) is the only place HotGap alters
  a curve for TIMING rather than for a wrong number: every other correction
  in that file changes a number PolicyEngine got wrong; this one changes
  when a correct number arrives, and the real curve — deferred cliffs full
  size, in place — is still what `HouseholdEvaluation.curve` and
  `analysis.cliffs` return.
- Three ESI tiers by headcount, not two: AHRQ publishes single,
  employee-plus-one, and family employee contributions, and a parent with
  one child is not buying a family plan.
- The $100 resample floor (`core/src/maTafdc.ts`'s
  `RESAMPLE_MIN_DIFFERENCE`, from the prior review) also does the work of
  not feeding back most of the new September-allowance tail: SNAP moves
  under $30 for a difference that small, so it is mostly not worth another
  request.
- The premium wrap models the benchmark or lowest-cost plan as free: exact
  for Connecticut, New Mexico, and California, whose $0 tier IS the
  benchmark; slightly generous for Massachusetts, whose $0 is the
  lowest-cost ConnectorCare plan, which can be cheaper than the benchmark.
- Transitional Medical Assistance is withheld on any curve that cannot say
  who holds a program (`knowsWhoHolds`, same guard as the coverage gap and
  `programEndsByAge`): excusing a cliff is the strong claim, and a curve
  that cannot tell a parent's Medicaid from a child's does not get to make
  it.

**Investigated:**
- Alaska and Hawaii's marketplace subsidies are computed by PolicyEngine
  against the 48-contiguous-states poverty guideline, not their own higher
  ones (verified live 2026-09-15). HotGap's own `fpl2025` table already
  carries the correct AK/HI guidelines for the corrections above (the
  coverage gap and the premium wraps); the marketplace premium and credit
  PolicyEngine itself returns for an Alaska or Hawaii household are still
  computed on the wrong line, inside the subsidy formula rather than behind
  an overridable input, so there is no per-request parameter that fixes it
  the way the parent-Medicaid and TAFDC overrides do. Left to upstream:
  policyengine-us #9482.
- Massachusetts' apparent "TANF ends at $64,000": this was never the
  ongoing grant ending — it was the last year the $40 September clothing
  allowance happened to survive the ordinary income test. Fixed locally by
  splitting the ongoing grant from the September extra (above), rather than
  left as a discrepancy.

**Filed upstream from this review** — see `docs/upstream/2026-09-15-local-corrections.md`
for the workaround each retires:
- policyengine-us #9479 — the filer flag: `tax_unit_is_filer` should follow
  APTC eligibility, not just the ordinary filing thresholds.
- policyengine-us #9480 — the default ACA rating area is byte-identical for
  Connecticut and Illinois, and for Colorado and Indiana, when no county is
  sent.
- policyengine-us #9481 — state premium wraps (Connecticut, Massachusetts,
  New Mexico, California) are not modeled at all.
- policyengine-us #9482 — Alaska and Hawaii marketplace subsidies are
  computed against the contiguous-states poverty guideline instead of their
  own.

Gates: typecheck, 316 unit tests, dry-run sweep; the resweep follows.

Whole-branch review (Opus, independent) on `review-2`: READY WITH FIXES, all
applied. Blockers: the premium wrap was computed and then discarded on the
archetype path (`: gapped` for `: wrapped`), so every offline evaluation and
the whole sweep reported a zeroed premium it had not applied; and
transitional medical assistance was deferring every adult-Medicaid loss in a
household with children, though §1925 follows only a §1931 loss — 176 of 221
deferrals sat on the ACA adult group's 138% line and suppressed real cliffs
(Arizona's single parent read "always up, already clear"). TMA is now gated
off the adult-group window (128–151% of the 2026 guideline, expansion states
only; `NON_EXPANSION_STATES` in policyYear.ts). Deferred cliffs sweep-wide
fell 265 → 47. Also: the reduced-premium tier just above each $0 band is
modeled (MA $53/month, CA 3.19–3.91% of income to 165%, NM 0–2% to 250%) so
the band edge steps to the real next price rather than the full federal
premium; the offline path now measures the swept household for the coverage
gap and the wrap (not the caller's inputs); one Medicare predicate serves the
gap exemption and the Part B charge; the SSDI splice's SNAP effect (the
disabled-member shelter deduction and a state supplement leave above SGA,
by rule) is documented; `summary` prints deferred cliffs; the duplicate
two-tier `esiTier` is gone; the pipeline test pins literals again.

Open: `core/data/state-defaults.json` gives Illinois a preschool price of
$730, byte-identical to the documented national-median fallback used for
Indiana and New Mexico, though the note names only those two — verify
whether Cook County resolves from the NDCP or fell back silently.

# Childcare subsidy (CCDF) modeled (2026-09-15)

Both methodology reviews said the childcare-subsidy exit is usually the
largest cliff for a parent of a young child, and HotGap showed none. It was
dropped in July because the variable came back empty. The live probes say
that was our own payload.

**The root cause, and the fix that needed no upstream change:**
`childcare_expenses` is a DERIVED variable — upstream defines it as
`pre_subsidy_childcare_expenses` minus `child_care_subsidies`. Every HotGap
request sent the household's bill as `childcare_expenses`, which forces the
derived value and leaves `spm_unit_pre_subsidy_childcare_expenses` at its $0
default, so every state's CCDF formula had no provider charge to reimburse and
returned $0. Sending the same bill as the pre-subsidy figure instead turns 34
of the 38 states whose variable is deployed from $0 into a real subsidy.

**Implemented, one line each:**
- `childcare` is a `ProgramId` and a `CASH_PROGRAM` (`core/src/types.ts`): it
  pays a provider, which frees the same dollars one for one and is capped at a
  real bill — school meals and Head Start, not a Medicaid sticker value.
- Take-up is off by default (`getsChildcareSubsidy`, `--childcare-subsidy`),
  the same rule every other rationed program here follows; CCDF reaches about
  one in six eligible children. "Off" is the old payload byte for byte, so
  every existing curve and the whole archetype sweep are unchanged — verified
  by re-running the `single-1` archetype live with hours and no childcare in
  three states and getting the committed curve's metrics exactly.
- `core/src/translate.ts`'s `applyChildcareSubsidy` sends the bill as
  `spm_unit_pre_subsidy_childcare_expenses`, leaves `childcare_expenses` for
  PolicyEngine (so SNAP's dependent-care deduction and the CDCC run on the net
  bill), and asks for the AGGREGATE `child_care_subsidies`.
- `core/src/parse.ts` reads it into `programs.childcare` and keeps it OUT of
  the `otherBenefits` remainder except where `household_benefits` really
  carried it; `stateOf` reads the state off the response so parsing stays a
  pure function of the body, and is consulted only when there is a subsidy to
  place. The same step is the WORKAROUND (policyengine-us #9405): it adds
  the subsidy to `netIncome` where the model dropped it, so a stored curve
  carries it counted once. Which models drop it: every one before PR #9503;
  `core/src/client.ts` `probeChildcareSubsidyCounted` asks each endpoint,
  and the answer rides on the sweep's `model.countsChildcareSubsidy`
  (2026-09-16; the evaluate-time `applyChildcareSubsidy` it replaced was
  moved, not changed — the committed curves were migrated by the same
  arithmetic and `--from-data` reproduced every metric).
- `core/src/stateChildcareSubsidies.ts` holds the two lists, read from the
  deployed model's own metadata; a live contract test pins the per-state
  variable names, the aggregate, the pre-subsidy input and the inclusion table
  by forcing each state's variable to 0 and watching net income move.

**Deliberate choices:**
- The AGGREGATE `child_care_subsidies`, not `<st>_child_care_subsidies`: one
  name in every state, it spans the states whose own variable is defined per
  MONTH (CA, MA, …), and 13 states' per-state variables are not in the
  deployed model at all — `ny_child_care_subsidies` is a 400. The per-state
  names stay in `stateChildcareSubsidies.ts` as documentation and as the
  contract test's subject.
- The inclusion table encodes `main`'s 23 states, not the deployed 18. The
  five extras (DC, NC, NY, OH, OK) have no subsidy variable deployed at all,
  so the branch is a no-op today, and the day the API ships `main` they gain
  the variable and the list entry in the same release. The deployed 18 would
  have been wrong on that day in the expensive direction.
- Full-day, full-week attendance is assumed and said out loud. It is not a
  gate — Colorado pays with or without it — but it changes the number, because
  the rate ceiling and copay only bind once care has a duration.
  `meets_ccdf_activity_test` and `weekly_hours_worked_before_lsr` are NOT
  sent for this: Colorado's output is byte-identical with and without either.
- Vermont's $22,828 against a $9,600 bill is left uncapped. `vt_ccfap` models
  the post-2023-12-16 regime where Vermont pays the state rate regardless of
  the provider's charge, with the citation in its own docstring. A documented
  rule is not a defect to patch from outside.

**Investigated, reported, not worked around** — see
`docs/upstream/2026-09-15-local-corrections.md` for each:
California (deployed formula reads CA-only month-period attendance inputs;
fixed on `main`), Massachusetts (`ma_ccfa_care_provider_type` defaults to
school-age, a zero rate for a preschooler), Maryland and Nebraska ($0, cause
not chased). HotGap reports no subsidy in those four rather than supplying a
modeling artifact it never asked the household about.

**Measured, left for the maintainer to decide:** what the baseline archetype
should do. `answersFor` still sends `monthlyChildcare: 0`. With the state's
own DOL preschool price and the subsidy claimed, the `single-1` archetype
changes shape completely — the subsidy exit becomes the largest cliff in all
three states measured, and the leap triples or quadruples. Numbers in the
report accompanying this branch.

Gates: typecheck, 339 unit tests, dry-run sweep, two new live contract cases.

# Dual-earner archetypes, and childcare in the sweep (2026-09-15)

The sweep's archetypes now buy child care and claim the subsidy, and the
set grew from eight to eleven. Three things came together:

- A working parent of a young child pays for care, so a $0 bill was not a
  neutral default — it was the one that hid the child-care cliff. Each
  child under 6 is charged the state's centre-based preschool price.
- A single-earner married couple has a parent at home, so it buys no care
  and claims no subsidy; the subsidy's activity test requires every parent
  to work (verified live — Delaware pays such a couple $13,260 once the
  spouse works and $0 when they do not). Charging them for care *and*
  denying them the subsidy was wrong in both directions at once.
- That left the two-earner couple, the household the cliff actually hits,
  unmodelled. `married-dual-1/2/3` add it: spouse at a fixed $15,080,
  full-time at the federal minimum, chosen national rather than
  state-varying so the map compares state rules and not households.

Consequences worth knowing. The reach ladders for `married-1/2/3` were
pooling one- and two-earner couples and using the blend as the yardstick
for a household modelled as single-earner; split properly, a single-earner
couple with one child has median household earnings of $68,300 against
$135,500 for a dual-earner one. 558 of 561 reach cells publish. And
`summary.json` carries `childcareSubsidyUnmodeled`, 18 states where a lone
working parent paying for care receives nothing — 13 have no state variable
in the deployed API, four return $0 on default inputs (upstream #9485),
and the flag is judged on single parents alone, because a married
archetype's $0 is correct policy rather than an engine gap.

Two process traps, both now guarded: a git worktree has no `node_modules`,
so a subagent's `@hotgap/core` resolved into the main checkout and its
tests ran against in-flight code; and because the worktree sits inside the
repo, vitest collected both copies (706 tests where there are 353).
`vitest.config.ts` and `.gitignore` exclude `.claude/worktrees/`.
