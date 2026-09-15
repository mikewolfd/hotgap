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
}

export const MA_TAFDC_SOURCES = {
  rules: "https://www.mass.gov/doc/106-cmr-704-transitional-cash-assistance-program-financial-eligibility/download",
  paymentStandards: "https://www.mass.gov/doc/table-of-need-payment-standards/download",
  issueReport: "docs/upstream/2026-09-14-policyengine-issues.md#issue-1--massachusetts-tafdc-ends-abruptly-at-26280-of-earnings-the-states-rules-taper-it-to-30960",
} as const;

export interface MaTafdcCorrection {
  status: "applied" | "unavailable";
  message: string;
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
      message: "Massachusetts TAFDC correction unavailable: this curve lacks the required inputs. Its TANF cliffs may reflect the known upstream formula error; refresh the sweep.",
    } };
  }
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
      message: "Massachusetts TAFDC uses a local calculation for ongoing recipients after the six-month full earnings disregard: $200/month per earner, then a 50% disregard. SNAP and other linked benefits still use PolicyEngine's original TANF, so net income and cliff rankings are approximate. The first six months and new-applicant eligibility are not modeled.",
    },
  };
}
