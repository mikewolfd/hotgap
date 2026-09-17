// State marketplace premium assistance that PolicyEngine models — as a
// tax-unit amount that lands in `household_health_benefits`, never in the
// premium HotGap reads (`spm_unit_medical_out_of_pocket_expenses` is plan
// cost minus the federal credit only; see docs/upstream/2026-09-15-local-
// corrections.md). So where an endpoint serves the amount, HotGap asks for it
// and nets it out of the premium itself; where it does not (the hosted API
// as of 1.764.6 lacks every one of them), the local tables in
// statePremiumWraps.ts stand in for the states they cover.
//
// Compared against the local ladders on policyengine-us 2.5.0, 2026-09-16,
// single adult: California agrees to within $4 at every point; New Mexico's
// upstream model keeps paying between 250% and 400% FPL where the ladder
// stopped ($1,091 vs $3,598 net premium at 260% FPL); Maryland, Colorado and
// Vermont have no ladder here at all.
//
// New Jersey and Washington joined the list on 2026-09-16, when upstream's
// own models (policyengine-us 1.801.0 and 1.797.0, issues #9224 and #9222)
// reached the hosted engine at 2.6.2. Measured there the same day on a single
// parent with two children: NJ pays $240 at $38,000 rising to $3,600 at
// $100,000 — 12 × $100 × three members once the children age out of NJ
// FamilyCare — and $1,800 above 400% FPL; WA pays $660 ($55 × 12 for the one
// adult who buys a plan) from $38,000 to the 250%-FPL ceiling and $0 above it.
// Both were "figures incomplete" on the map until that day.

export interface StatePremiumAssistance {
  state: string;
  /** Tax-unit variable, annual dollars. */
  variable: string;
  program: string;
}

export const STATE_PREMIUM_ASSISTANCE: readonly StatePremiumAssistance[] = [
  { state: "CA", variable: "assigned_ca_premium_subsidy", program: "California Premium Subsidy" },
  { state: "NJ", variable: "nj_njhps", program: "NJ Health Plan Savings" },
  { state: "NM", variable: "assigned_nm_premium_assistance", program: "New Mexico Premium Assistance" },
  { state: "MD", variable: "md_premium_assistance", program: "Maryland Young Adult Premium Assistance" },
  { state: "CO", variable: "assigned_co_premium_assistance", program: "Colorado premium assistance" },
  { state: "VT", variable: "vt_premium_assistance", program: "Vermont Premium Assistance" },
  { state: "WA", variable: "wa_cascade_care_savings", program: "Cascade Care Savings" },
];

export function statePremiumAssistanceFor(state: string): StatePremiumAssistance | null {
  return STATE_PREMIUM_ASSISTANCE.find((s) => s.state === state) ?? null;
}

/**
 * State premium help that exists for 2026 and that NEITHER PolicyEngine (no
 * variable above) NOR the local tables (statePremiumWraps.ts) model. A curve
 * in such a state overstates the net premium by the state's help, and the
 * summary's coverage block names the program so a reader knows — that is what
 * hatches the state on the journalist map as "figures incomplete".
 *
 * EMPTY since 2026-09-16. It held New Jersey and Washington, the two flat
 * per-member programs no FPL-bounded $0 ladder fits; both are now modeled
 * twice over — upstream (STATE_PREMIUM_ASSISTANCE above, served by the engine)
 * and locally for endpoints that lack the variable (PER_MEMBER_PREMIUM_HELP in
 * statePremiumWraps.ts) — so no state's premium figure is incomplete today.
 * The list stays because the next such program needs somewhere to be declared,
 * and because its emptiness is a claim the tests check rather than an absence
 * nobody notices (statePremiumWraps.test.ts).
 */
export const UNMODELED_STATE_PREMIUM_ASSISTANCE: readonly { state: string; program: string; note: string }[] = [];
