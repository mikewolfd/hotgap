import { YEAR, type CurvePoint, type HouseholdAnswers } from "./types.js";

// WORKAROUND — this whole module re-implements one state's TAFDC grant
// because PolicyEngine's formula is wrong (policyengine-us #9469; fix in
// PR #9477). Remove it, the ma_tafdc_* inputs requested in translate.ts,
// and the resample loop in client.ts once that merges and the API serves
// it. The separate double count (#9470) shipped fixed in 2.4.4; the client
// probes each endpoint for it (probeMaTafdcDoubleCount) and `duplicatedTanf`
// below is 0 wherever the fix is served.
//
// WHICH REGIME THIS IS, because the state publishes the other one. TAFDC
// disregards 100% of earnings for the first six months of work, then $200 a
// month per earner and 50% of the rest for as long as the case stays open
// (106 CMR 704.281). Everything here is the SECOND regime — the ongoing
// recipient's, the one a household lives on. DTA's own examples are the first:
// the FY2026 TAFDC report's "$7,512 at $15,600 of earnings for a family of
// three" is a year-one figure, six months at the full disregard and six at the
// 50% one, where this formula gives $4,212 for the same family at the same
// pay. Neither number is wrong; they are different years of the same case, and
// a reader comparing HotGap against the state's published example has to know
// which is which. HotGap models the steady state because the curve answers
// "what do I live on at this pay", not "what does my first year look like".

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
 * Steady state only — a grant computed here is always lower than the state's
 * published year-one examples, which include six months of the full earnings
 * disregard (see the note at the top of this file).
 *
 * September's $500 per eligible child increases that month's need/payment
 * standard. Budget it for one month, including households whose ordinary
 * grant is zero. It is not an annual allowance that vanishes at the ordinary
 * income limit. The engine supplies the eligible children's allowance total.
 */
export interface MaTafdcGrantParts {
  /** Twelve ordinary monthly grants plus the infant benefit — what "on TAFDC" means. */
  ongoing: number;
  /** The extra paid in September because the $500-per-child clothing allowance raises that month's standard. */
  septemberExtra: number;
}

export function maTafdcGrantParts(earnings: number, spouseEarnings: number, inputs: MaTafdcInputs): MaTafdcGrantParts {
  if (YEAR !== "2026") throw new Error("Revalidate the Massachusetts TAFDC correction for the new policy year");
  if (!inputs.nonFinancialEligible) return { ongoing: 0, septemberExtra: 0 };
  const earned = [earnings, spouseEarnings].reduce((sum, pay) => sum + Math.max(0, pay - 2400) * 0.5, 0);
  const countable = (Math.max(0, earned - inputs.dependentCareDeduction) + inputs.unearnedIncome) / 12;
  const standard = inputs.paymentStandard / 12;
  // Step 7: round down to whole monthly dollars; pay only grants >= $10.
  const pay = (need: number) => {
    const grant = Math.floor(Math.max(0, need - countable));
    return grant >= 10 ? grant : 0;
  };
  const monthly = pay(standard);
  return {
    ongoing: 12 * monthly + (countable <= standard ? inputs.infantBenefit : 0),
    septemberExtra: pay(standard + inputs.clothingAllowance) - monthly,
  };
}

/** The year's total TAFDC cash: what the household receives and what is fed back to PolicyEngine. */
export function maTafdcGrant(earnings: number, spouseEarnings: number, inputs: MaTafdcInputs): number {
  const { ongoing, septemberExtra } = maTafdcGrantParts(earnings, spouseEarnings, inputs);
  return ongoing + septemberExtra;
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
      const { ongoing, septemberExtra } = maTafdcGrantParts(p.earnings, a.spouseAnnualEarnings, p.maTafdc!);
      const tanf = ongoing + septemberExtra;
      const duplicated = p.maTafdc!.duplicatedTanf;
      // `programs.tanf` is the ongoing grant, so "TANF ends" means the monthly
      // grant ends (~$31k for five), not the last September a $40 allowance
      // was paid ($64k). The September extra stays in the money line under
      // otherBenefits: real cash, not an ongoing program.
      return {
        ...p,
        netIncome: p.netIncome + tanf - (p.programs.tanf ?? 0) - duplicated,
        programs: { ...p.programs, tanf: ongoing },
        otherBenefits: Math.max(0, p.otherBenefits - duplicated) + septemberExtra,
        // The returned point contains no duplicate. Evaluating it again must
        // neither remove a second copy nor change the corrected grant.
        maTafdc: { ...p.maTafdc!, duplicatedTanf: 0 },
      };
    }),
    correction: {
      status: "applied",
      linkedBenefitsRecomputed,
      message: linkedBenefitsRecomputed
        ? "Massachusetts TAFDC uses the state's ONGOING-RECIPIENT rules ($200/month per earner, then a 50% disregard) in place of PolicyEngine's formula; PolicyEngine recomputed SNAP and every other linked benefit with the corrected grant. This is the steady state, not the first year: TAFDC disregards all earnings for six months before the 50% rule starts, so DTA's published examples (its FY2026 report shows $7,512 at $15,600 of earnings for a family of three, where this gives $4,212) are year-one figures and are higher on purpose. New-applicant eligibility is not modeled."
        : "Massachusetts TAFDC uses a local calculation for ONGOING recipients: $200/month per earner, then a 50% disregard. SNAP and other linked benefits still use PolicyEngine's original TANF, so net income and cliff rankings are approximate. This is the steady state, not the first year: TAFDC disregards all earnings for six months before the 50% rule starts, so DTA's published examples ($7,512 at $15,600 for a family of three in its FY2026 report, against $4,212 here) are year-one figures and are higher on purpose. New-applicant eligibility is not modeled.",
    },
  };
}
