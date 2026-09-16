// State marketplace premium assistance that PolicyEngine models — as a
// tax-unit amount that lands in `household_health_benefits`, never in the
// premium HotGap reads (`spm_unit_medical_out_of_pocket_expenses` is plan
// cost minus the federal credit only; see docs/upstream/2026-09-15-local-
// corrections.md). So where an endpoint serves the amount, HotGap asks for it
// and nets it out of the premium itself; where it does not (the hosted API
// as of 1.764.6 lacks all five), the local ladders in statePremiumWraps.ts
// stand in for the states they cover.
//
// Compared against the local ladders on policyengine-us 2.5.0, 2026-09-16,
// single adult: California agrees to within $4 at every point; New Mexico's
// upstream model keeps paying between 250% and 400% FPL where the ladder
// stopped ($1,091 vs $3,598 net premium at 260% FPL); Maryland, Colorado and
// Vermont have no ladder here at all.

export interface StatePremiumAssistance {
  state: string;
  /** Tax-unit variable, annual dollars. */
  variable: string;
  program: string;
}

export const STATE_PREMIUM_ASSISTANCE: readonly StatePremiumAssistance[] = [
  { state: "CA", variable: "assigned_ca_premium_subsidy", program: "California Premium Subsidy" },
  { state: "NM", variable: "assigned_nm_premium_assistance", program: "New Mexico Premium Assistance" },
  { state: "MD", variable: "md_premium_assistance", program: "Maryland Young Adult Premium Assistance" },
  { state: "CO", variable: "assigned_co_premium_assistance", program: "Colorado premium assistance" },
  { state: "VT", variable: "vt_premium_assistance", program: "Vermont Premium Assistance" },
];

export function statePremiumAssistanceFor(state: string): StatePremiumAssistance | null {
  return STATE_PREMIUM_ASSISTANCE.find((s) => s.state === state) ?? null;
}

/**
 * State premium help that exists for 2026 and that NEITHER PolicyEngine (no
 * variable above) NOR the local ladders (statePremiumWraps.ts) model: each is
 * a flat per-member amount with no $0 band, so no FPL-bounded ladder fits.
 * A curve in these states overstates the net premium by the state's help;
 * the summary's coverage block names them so a reader knows. Checked
 * 2026-09-15 alongside the ladder table (statePremiumWraps.test.ts).
 */
export const UNMODELED_STATE_PREMIUM_ASSISTANCE: readonly { state: string; program: string; note: string }[] = [
  { state: "NJ", program: "NJ Health Plan Savings", note: "a flat $20–$100 per person per month to 600% FPL, no $0 band" },
  { state: "WA", program: "Cascade Care Savings", note: "a flat $55 per member per month to 250% FPL, no $0 band" },
];
