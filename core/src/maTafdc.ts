import { YEAR, type CurvePoint, type HouseholdAnswers } from "./types.js";

/** PolicyEngine inputs retained so the local calculation can be replayed. Dollars are annual. */
export interface MaTafdcInputs {
  paymentStandard: number;
  nonFinancialEligible: boolean;
  unearnedIncome: number;
  dependentCareDeduction: number;
  clothingAllowance: number;
  infantBenefit: number;
  /** Upstream TANF counted again in this point's net income and otherBenefits. */
  duplicatedTanf: number;
  /**
   * True when this point was re-requested with the corrected grant forced
   * as an input, so PolicyEngine's SNAP and every other linked benefit on
   * the point already reflect it (see client.ts resampleMaTafdc).
   */
  engineUsedCorrectedGrant: boolean;
}

export const MA_TAFDC_SOURCES = {
  rules: "https://www.mass.gov/doc/106-cmr-704-transitional-cash-assistance-program-financial-eligibility/download",
  paymentStandards: "https://www.mass.gov/doc/table-of-need-payment-standards/download",
  issueReport: "docs/upstream/2026-09-14-policyengine-issues.md#issue-1--massachusetts-tafdc-ends-abruptly-at-26280-of-earnings-the-states-rules-taper-it-to-30960",
} as const;

export interface MaTafdcCorrection {
  status: "applied" | "unavailable";
  /** Every point whose grant changed was recomputed by PolicyEngine with the corrected grant. */
  linkedBenefitsRecomputed: boolean;
  message: string;
}

// A grant difference at or below this is not fed back: SNAP moves by under
// $30 for it, it is mostly the September clothing allowance's long tail, and
// each point costs a request. Same floor analyze.ts uses for "meaningfully on".
const RESAMPLE_MIN_DIFFERENCE = 100;

/**
 * Points whose corrected grant differs from what PolicyEngine paid by more
 * than RESAMPLE_MIN_DIFFERENCE and that have not yet been fed back to the
 * engine. The client re-requests exactly these, one at a time, with the
 * grant forced as an input.
 */
export function maTafdcResampleIndices(a: HouseholdAnswers, points: CurvePoint[]): number[] {
  if (a.state !== "MA" || a.childAges.length === 0) return [];
  if (!points.every((p) => p.maTafdc?.duplicatedTanf !== undefined)) return [];
  const out: number[] = [];
  points.forEach((p, i) => {
    if (p.maTafdc!.engineUsedCorrectedGrant) return;
    const grant = maTafdcGrant(p.earnings, a.spouseAnnualEarnings, p.maTafdc!);
    if (Math.abs(grant - (p.programs.tanf ?? 0)) > RESAMPLE_MIN_DIFFERENCE) out.push(i);
  });
  return out;
}

/**
 * Ongoing-recipient rules after the six-month 100% disregard, 106 CMR
 * 704.260, .270, .281(B), .500(A). Checked against the state rules 2026-09-15.
 * Each earner gets $200/month, then 50% of the remainder is counted. Retain
 * the engine's non-financial eligibility, payment standard, dependent-care
 * deduction and unearned income instead of duplicating those rules here.
 *
 * September's $500 per eligible child increases that month's need/payment
 * standard. Budget it for one month, including households whose ordinary
 * grant is zero. It is not an annual allowance that vanishes at the ordinary
 * income limit. The engine supplies the eligible children's allowance total.
 */
export function maTafdcGrant(earnings: number, spouseEarnings: number, inputs: MaTafdcInputs): number {
  if (YEAR !== "2026") throw new Error("Revalidate the Massachusetts TAFDC correction for the new policy year");
  if (!inputs.nonFinancialEligible) return 0;
  const earned = [earnings, spouseEarnings].reduce((sum, pay) => sum + Math.max(0, pay - 2400) * 0.5, 0);
  const countable = (Math.max(0, earned - inputs.dependentCareDeduction) + inputs.unearnedIncome) / 12;
  const standard = inputs.paymentStandard / 12;
  // Step 7: round down to whole monthly dollars; pay only grants >= $10.
  const pay = (need: number) => {
    const grant = Math.floor(Math.max(0, need - countable));
    return grant >= 10 ? grant : 0;
  };
  return 11 * pay(standard) + pay(standard + inputs.clothingAllowance)
    + (countable <= standard ? inputs.infantBenefit : 0);
}

/** Replace TAFDC before cliff analysis. Other programs retain their upstream values. */
export function correctMaTafdc(a: HouseholdAnswers, points: CurvePoint[]): { points: CurvePoint[]; correction: MaTafdcCorrection | null } {
  if (a.state !== "MA" || a.childAges.length === 0) return { points, correction: null };
  if (!points.every((p) => p.maTafdc?.duplicatedTanf !== undefined)) {
    return { points, correction: {
      status: "unavailable",
      linkedBenefitsRecomputed: false,
      message: "Massachusetts TAFDC correction unavailable: this curve lacks the required inputs. Its TANF cliffs may reflect the known upstream formula error; refresh the sweep.",
    } };
  }
  // Exact when every point whose grant changed was fed back to the engine;
  // otherwise SNAP and the other linked benefits still sit on upstream's TANF.
  const linkedBenefitsRecomputed = maTafdcResampleIndices(a, points).length === 0;
  return {
    points: points.map((p) => {
      const tanf = maTafdcGrant(p.earnings, a.spouseAnnualEarnings, p.maTafdc!);
      const duplicated = p.maTafdc!.duplicatedTanf;
      return {
        ...p,
        netIncome: p.netIncome + tanf - (p.programs.tanf ?? 0) - duplicated,
        programs: { ...p.programs, tanf },
        otherBenefits: Math.max(0, p.otherBenefits - duplicated),
        // The returned point contains no duplicate. Evaluating it again must
        // neither remove a second copy nor change the corrected grant.
        maTafdc: { ...p.maTafdc!, duplicatedTanf: 0 },
      };
    }),
    correction: {
      status: "applied",
      linkedBenefitsRecomputed,
      message: linkedBenefitsRecomputed
        ? "Massachusetts TAFDC uses the state's ongoing-recipient rules ($200/month per earner, then a 50% disregard) in place of PolicyEngine's formula; PolicyEngine recomputed SNAP and every other linked benefit with the corrected grant. The first six months' full disregard and new-applicant eligibility are not modeled."
        : "Massachusetts TAFDC uses a local calculation for ongoing recipients after the six-month full earnings disregard: $200/month per earner, then a 50% disregard. SNAP and other linked benefits still use PolicyEngine's original TANF, so net income and cliff rankings are approximate. The first six months and new-applicant eligibility are not modeled.",
    },
  };
}
