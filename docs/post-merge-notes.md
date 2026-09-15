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
- Sweep axis: `core/src/translate.ts` (`axisSpec`) first moved the flat top from $100,000 to $150,000 at $1,000 steps (`cb919f6`), then — after the resweep showed twenty cells with no safe exit because a flat $150,000 axis still clipped the 400%-FPL subsidy cliff for four- and five-person households — was widened again to run past `4 × fpl2025(state, size) + 40,000` for the household's own size (`27a9392`): $150,000 (151 points) for one to three people, $170,000 (171) for four, $195,000 (196) for five, coarser steps only beyond $250,000.
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
