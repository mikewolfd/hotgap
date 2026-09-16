import type { CurvePoint, ProgramId } from "./types.js";
import { CASH_PROGRAMS, CREDIT_PROGRAMS, PROGRAM_IDS } from "./types.js";
import { analyzeCurve, childCoverageAt, heldByAdults, heldByChildren, PROGRAM_END_MIN, programTotal, type CurveAnalysis } from "./analyze.js";
import { PERSON_LEVEL_PROGRAMS } from "./parse.js";

// PROGRAM_END_MIN now lives in analyze.ts, where the cliff-notch rule needs
// the same threshold; it is not re-exported here because index.ts star-exports
// both modules and a duplicated name would drop out of the package entirely.
export const BENEFITS_END_MIN = 250;

export interface ProgramEndsByAge {
  adults: Partial<Record<ProgramId, number>>;
  children: Partial<Record<ProgramId, number>>;
}

export interface EscapeAnalysis {
  safeExitEarnings: number | null;
  leap: number;
  leapIsLowerBound: boolean;
  /**
   * Per program, the LAST earnings at which it is still received (over
   * PROGRAM_END_MIN) — the same `lastAbove` rule as every other threshold here,
   * so a program "ending at $54,000" is still paid at $54,000 and gone at the
   * next point of the axis ($55,000 on a $1,000 sweep). A surface that wants
   * to say where it is gone adds one axis step; the cliff that removes it has
   * `startEarnings` equal to this figure. (The design audit of 2026-09-16 read
   * a ledger on one convention and a tile on the other as an asymmetry in
   * core; core is consistent, the display rule was unstated.)
   */
  programEnds: Partial<Record<ProgramId, number>>;
  /**
   * The person-level programs split by who loses them. Household totals hide
   * that a parent's Medicaid usually ends at a fraction of a child's limit —
   * CA cuts parents off at 138% FPL and children at 266% — so a single
   * "medicaid ends at $57k" line was two different events averaged together.
   */
  programEndsByAge: ProgramEndsByAge;
  benefitsEndEarnings: number | null;
  /**
   * The last earnings at which any child still has Medicaid or CHIP; null when
   * no child has either, or when coverage lasts past the top of the axis.
   *
   * This threshold is not a date. 42 CFR 435.926 and 457.342 give children 12
   * months of continuous eligibility, so crossing it does not end coverage —
   * it defers the loss to the next annual renewal, up to a year away. Any
   * front end that shows this number has to say so.
   */
  childCoverageEndEarnings: number | null;
}

/** The last earnings at which `value` is above the floor, or null. */
function lastAbove(points: CurvePoint[], value: (p: CurvePoint) => number, floor: number): number | null {
  let found: number | null = null;
  for (const p of points) if (value(p) > floor) found = p.earnings;
  return found;
}

export function escapeAnalysis(points: CurvePoint[], analysis?: CurveAnalysis): EscapeAnalysis {
  const a = analysis ?? analyzeCurve(points, 0);
  const axisMax = points[points.length - 1].earnings;
  const zones = a.dangerZones;
  const last = zones[zones.length - 1];
  const safeExitEarnings = zones.length === 0 ? 0 : last.endEarnings;

  let leap = 0;
  let leapIsLowerBound = false;
  for (const z of zones) {
    const width = (z.endEarnings ?? axisMax) - z.startEarnings;
    if (width > leap) {
      leap = width;
      leapIsLowerBound = z.endEarnings === null;
    }
  }

  // Still received at the top of the axis means "we never saw it end", not
  // "it ends here" — hence the axisMax check on every threshold below.
  const ends = (value: (p: CurvePoint) => number): number | null => {
    const at = lastAbove(points, value, PROGRAM_END_MIN);
    return at !== null && at < axisMax ? at : null;
  };

  const programEnds: Partial<Record<ProgramId, number>> = {};
  for (const id of PROGRAM_IDS) {
    // The child tax credit is reported on its TOTAL, not on the refundable
    // part `programs.ctc` carries. For most earners the refundable amount
    // reaches zero where a rising tax bill absorbs the credit — the point the
    // credit turns NONREFUNDABLE, not the point it is lost. Reporting that as
    // "ctc ends at $44,000" told a family they had lost a $6,600 credit they
    // still had in full. The refundable series keeps its own job: it is what
    // sits in netIncome, so it is what a cliff's `credits` share and
    // `programsLost` are built from. A curve fetched before `ctc` was
    // requested falls back to the refundable series, which is all it knows.
    const value = id === "ctc"
      ? (p: CurvePoint) => p.totalCtc ?? p.programs.ctc ?? 0
      : (p: CurvePoint) => p.programs[id] ?? 0;
    const at = ends(value);
    if (at !== null) programEnds[id] = at;
  }

  const programEndsByAge: ProgramEndsByAge = { adults: {}, children: {} };
  for (const id of PERSON_LEVEL_PROGRAMS) {
    const forAdults = ends((p) => heldByAdults(p, id));
    const forChildren = ends((p) => heldByChildren(p, id));
    if (forAdults !== null) programEndsByAge.adults[id] = forAdults;
    if (forChildren !== null) programEndsByAge.children[id] = forChildren;
  }

  const childCoverage = lastAbove(points, childCoverageAt, PROGRAM_END_MIN);

  // Money only. Coverage sticker values are excluded from this total as of
  // 2026-09-14: they are PolicyEngine's valuation of an insurance card, not
  // cash, and they are not inside netIncome, so counting them made "benefits
  // end" mean "the last child aged off Medicaid" rather than "the last dollar
  // of help stopped arriving". The untracked remainder is included because it
  // IS money — but note it carries any SSDI, child support or unemployment
  // the household reported (parse.ts), so such a household legitimately keeps
  // receiving a benefit at every earnings level on the axis.
  const benefitsEnd = lastAbove(points, (p) => programTotal(p, [...CASH_PROGRAMS, ...CREDIT_PROGRAMS]) + (p.otherBenefits ?? 0), BENEFITS_END_MIN);

  return {
    safeExitEarnings,
    leap,
    leapIsLowerBound,
    programEnds,
    programEndsByAge,
    benefitsEndEarnings: benefitsEnd === axisMax ? null : benefitsEnd,
    childCoverageEndEarnings: childCoverage !== null && childCoverage < axisMax ? childCoverage : null,
  };
}
