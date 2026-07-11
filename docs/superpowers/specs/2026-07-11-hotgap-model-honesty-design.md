# HotGap Model Honesty — Design (Plan 6)

**Date:** 2026-07-11
**Status:** Approved in brainstorming; pending written-spec review.
**Origin:** Direct response to the 5-expert adversarial review (`docs/reviews/2026-07-11-adversarial-methodology-review.md`), whose #1 finding was that modeling rationed programs as guaranteed inflates the flagship cliffs.

## Goal

Let people tell the tool which programs they actually receive (instead of assuming everyone gets everything), add the missing CCDF childcare subsidy, fix the verified health-fold correctness bugs, and make the map's baseline honest — so the numbers reflect a real household, not a best-case one.

**County-level personal door is deliberately deferred to Plan 7** (it carries a ZIP→county data dependency the rest of this work does not). This spec is self-contained: every PolicyEngine input it relies on is already verified to work.

## Verified ground truth (probed live 2026-07-11) — MECHANISM CORRECTED

**The take-up ENROLLMENT FLAGS do not work.** `is_enrolled_in_head_start` (and the `is_enrolled_in_ccdf` / `receives_*` family) are microsimulation *reweighting* inputs; they do NOT gate the household-level benefit value. Probed: `head_start` = $22,285 with the flag default, `true`, AND `false` — identical. So they cannot drive a "what if I don't get this" toggle.

**The working mechanism is a VALUE OVERRIDE to 0.** Forcing the program's dollar variable to 0 as a scalar input removes it across the whole earnings sweep. Probed: `head_start: {"2026": 0}` drops net income $55,258 → $32,972 (−$22,286, exactly the Head Start value). So:
- **Head Start off** → input `head_start: 0` (per eligible child, broadcast across the axis).
- **Housing voucher off** → input `spm_unit_capped_housing_subsidy: 0` (override accepted; effect only when the family has rent + is eligible).
- **Childcare subsidy off** → input `spm_unit_ccdf_subsidy: 0` — **but see CCDF risk below.**

**Employer coverage works via real inputs** (verified): `has_esi: true` + `offered_aca_disqualifying_esi: true` + `employer_sponsored_insurance_premiums` (a $) → PTC drops to $0 and MOOP becomes the ESI premium (~$8,857 at a $5k ESI premium test). This is the fix for the manufactured 400%-FPL marketplace cliff.

**CCDF childcare subsidy — AT RISK.** `spm_unit_ccdf_subsidy` returned `null`/0 for a plainly eligible family ($22k, two young kids, CA, county 06037, kids `is_enrolled_in_ccdf`, `childcare_expenses` and `pre_subsidy_childcare_expenses` both tried). PolicyEngine may not model CCDF robustly household-by-household (consistent with the research's "state program depth is uneven"). **A spike is the gate**: if CCDF does not produce a nonzero subsidy for eligible families across a reasonable set of states, the childcare-subsidy program-add AND its toggle are DESCOPED from this plan (noted as blocked on PolicyEngine), and the plan ships the Head Start + housing + employer-coverage toggles only.

**PTC double-count (confirmed bug):** `household_net_income` includes the ACA premium tax credit (inside `household_refundable_tax_credits`), and MOOP is the premium *net* of that same PTC — so subtracting MOOP from net income counts the subsidy twice (TX single-parent-2 at $44k: tool shows ~$46,800 vs. honest ~$42,000).

**MOOP is premium-only:** for synthetic axis households, MOOP = net premium with zero non-premium out-of-pocket, so the "+deductibles/copays" label is false.

## 1. Take-up: questions + result toggles (personal door)

Four things a household may or may not receive, all rationed or coverage-dependent (mechanism per corrected ground truth above — value overrides, not enrollment flags):
- **Head Start / Early Head Start** (per eligible child) → override `head_start: 0` when off
- **Housing voucher / housing assistance** → override `spm_unit_capped_housing_subsidy: 0` when off
- **Childcare subsidy (CCDF)** → override `spm_unit_ccdf_subsidy: 0` when off — *conditional on the CCDF spike passing; else dropped*
- **Employer health coverage** → `has_esi = true` + `offered_aca_disqualifying_esi = true` + a reasonable `employer_sponsored_insurance_premiums` when on (fixes the manufactured 400%-FPL marketplace cliff)

**Flow (accuracy):** one new screen after the childcare question — "Which of these do you get now?" — with the applicable items as yes/no chips. Only show an item when it could apply (childcare/Head Start only if a young child; ESI phrased "health insurance through a job"). **Default = no** for the three rationed programs (honest baseline: most eligible families don't receive them); ESI default = no (so the marketplace path is shown unless they say otherwise). Each is optional; "not sure" is allowed and treated as no.

**Result page (exploration):** toggle chips for the same four settings, seeded from the flow answers, that recompute the curve **live** via a fresh `/api/curve` call when flipped. A short line frames it: "Change what you get to see how it moves your cliffs." The health-adjusted math and everything downstream recompute unchanged — only the household inputs differ.

`HouseholdAnswers` gains: `getsHeadStart: boolean`, `getsHousing: boolean`, `getsChildcareSubsidy: boolean`, `hasEmployerCoverage: boolean`. `translate.ts` maps them to the flags above (per-child flags applied to each eligible child; ESI applied to adults).

## 2. Add CCDF childcare subsidy as a tracked program — SPIKE-GATED

**Task 0 of the plan is a spike:** probe `spm_unit_ccdf_subsidy` across ~6 states (expansion + non-expansion, large + small) for eligible low-income families with young children and real childcare cost. Decision gate:
- **If it returns meaningful nonzero subsidies:** `ProgramId` gains `"childcaresubsidy"`; `translate.ts` requests `spm_unit_ccdf_subsidy`; `parse.ts` sums it into the program; it appears in the why-list and thresholds; the childcare toggle ships. String `program.childcaresubsidy` = "help paying for child care (CCDF)" (gate-checked). Closes the review gap of showing childcare cost without the offsetting help.
- **If it is ~0/null (not modeled robustly):** DESCOPE — no `childcaresubsidy` program, no childcare toggle. Document the finding in the plan and the review doc. Ship the other three toggles (Head Start, housing, employer coverage) and the correctness fixes, which are all verified to work. Do NOT ship an inert toggle.

## 3. Correctness fixes (health fold)

- **PTC double-count:** `parse.ts` already parses `premium_tax_credit` as the `aca` program value (via `TAX_PROGRAMS`). Reuse that same series: after-health `netIncome = rawNet − acaPTC − MOOP`, so the subsidy the household never receives as spendable cash isn't credited on top of the net-of-PTC premium already reflected in MOOP. The `aca` program still shows in the why-list. Verify on the fixture that the TX-style overstatement (~$4,800 at $44k) is gone and that no double subtraction occurs (the value is subtracted once from net income, still displayed once in the why-list — display ≠ subtraction, no conflict).
- **MOOP label:** relabel `medicalOOP` and its copy from "deductibles/copays" to health-insurance **premiums** (what it actually is). Chart/why-list/honesty strings updated. (Folding in true cost-sharing exposure is out of scope; the label must not overclaim.)
- **Non-expansion honesty copy:** `result.honesty.health` ("Losing Medicaid often means paying for other coverage, not losing it all") is false in the coverage gap. Soften to not universalize: e.g., "In many states, losing Medicaid means moving to other coverage you help pay for. In some states there is no low-cost option." (gate-checked).

## 4. Honest map baseline

Regenerate the 51-state archetype curves with the three rationed programs **off** by default (`is_enrolled_in_head_start = false`, `receives_housing_assistance = false`, `is_enrolled_in_ccdf = false`), while entitlements with near-universal take-up (SNAP, Medicaid, EITC, CTC, WIC, school meals) stay on. This removes the systematic inflation (the $22k Head Start cliff that most eligible families never face). The archetype builder (`shared/src/archetypes.ts` `answersFor`) sets the new take-up fields to false; the pipeline regenerates. Map copy adds a plain disclosure: "These numbers assume a family that does not get waitlisted help like Head Start or a housing voucher."

The personal door, by contrast, defaults its flow the same way but lets the user turn each on — so the two doors still share identical math on identical assumptions when the user's toggles match the archetype (the "doors agree" property is preserved for the same inputs).

## 5. Data regeneration & testing

- Fixture + all 51 state files + summary regenerate (correctness fixes AND baseline change every number). Pinned test values across shared/pipeline/app update to the new figures. Controller runs the regen (heavy) as a dedicated step, whole suite as the gate.
- Reach data (`reach.json`) is unaffected (PUMS income distribution doesn't depend on these inputs) — but the safe-exit incomes it's compared against change, so no reach rebuild is needed, only the escape values shift.
- New tests: `translate.ts` maps each take-up field to the right flag; CCDF subsidy parses into its program; the PTC-corrected after-health value on the fixture; the live-toggle recompute path (client re-fetches with new answers); e2e drives a toggle and asserts the curve/verdict updates.
- Contract test extended to pin `spm_unit_ccdf_subsidy` and the take-up flags' acceptance.

## Constraints (carried)

AGPL-3.0; TS strict; all copy via `en.json` + readability gate (≤5.9 corpus, ≤8.0/string, never raised); show-explain-never-advise; no input logging; 44px/WCAG AA; conventional commits. Branch: `model-honesty`.

## Out of scope (explicit)

- County-level anything → **Plan 7**.
- Cost-sharing/deductible exposure beyond premiums; ACA subsidy-regime scenario switching; take-up modeling as *probabilities* (we ask the user, not estimate); asset/immigration/other-income questions; the larger reach income-concept fix (its own follow-up). The map does not get per-user toggles.

## Open questions carried into implementation

1. **CCDF spike (gating):** does `spm_unit_ccdf_subsidy` return meaningful nonzero values for eligible families across states, and with which childcare-cost input? If not, the CCDF pieces are descoped (see §2).
2. A sensible default `employer_sponsored_insurance_premiums` when the user says "I get insurance through my job" (national-average employee share ≈ $1,400/yr single / $6,500/yr family, or derive) — pin during implementation, document the choice.
3. Confirm the `head_start: 0` and `spm_unit_capped_housing_subsidy: 0` scalar overrides broadcast correctly across the 101-point earnings axis (they should; verify parse returns a 101-array of 0 and the cliff disappears).
