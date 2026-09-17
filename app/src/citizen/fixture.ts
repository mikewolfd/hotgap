// A synthetic HouseholdEvaluation for the citizen tests: a 151-point curve
// with one immediate cliff inside the household's zone, one bigger cliff
// past it, one deferred cliff, and so a second zone beyond the exit — every
// shape the components branch on, small enough to read. Built through
// core's own analyzeCurve and escapeAnalysis, so the fixture cannot drift
// from what the Worker returns.
import { analyzeCurve, escapeAnalysis, type CurvePoint, type HouseholdAnswers, type HouseholdEvaluation, type ProgramId } from "@hotgap/core";

const ANSWERS: HouseholdAnswers = {
  state: "CO", married: false, age: 30, spouseAge: null, youStatus: "citizen", spouseStatus: "citizen",
  youYearsInUs: null, spouseYearsInUs: null, childAges: [3, 7], youDisabled: false, spouseDisabled: false, childDisabled: [false, false],
  monthlyRent: 1735, monthlyChildcare: null, annualEarnings: 43000, spouseAnnualEarnings: 0, selfEmployed: false, savings: 0,
  hoursPerWeek: null, getsHeadStart: false, getsHousing: false, getsChildcareSubsidy: false, getsEnergyAssistance: false, heatInRent: false, getsSnap: true, getsTanf: true,
  getsMedicaid: true, getsWic: true, hasEmployerCoverage: false, countyFips: "08041", ssdiMonthly: 0, childSupportMonthly: 0, unemploymentMonthly: 0,
};

export const STEP = 1000;
export const TOP = 150_000;

const zero = (): Record<ProgramId, number> => ({ snap: 0, medicaid: 0, chip: 0, eitc: 0, ctc: 0, aca: 0, tanf: 0, housing: 0, wic: 0, ssi: 0, headstart: 0, schoolmeals: 0, childcare: 0, liheap: 0 });

export interface Shape {
  /** SNAP ($3,000) ends at $42k with a $2,500 drop: the household's zone is $41k–$46k. */
  snapCliff?: boolean;
  /** SNAP halves at $42k instead of ending, and $1,200 of it goes on to $50k. */
  snapTail?: boolean;
  /** The child-care subsidy ($20,000) ends at $55k with a $9,000 drop: a second zone, $54k–$67k. */
  careCliff?: boolean;
  /** The children's Medicaid ends at $72k as a $1,500 step that continuous eligibility defers. */
  deferredCliff?: boolean;
  /** A drop at this pay the curve never recovers from inside the axis. */
  stuckAt?: number;
  /** The children's CHIP ($4,000 sticker) is received up to this pay and then gone, with no step in net income. */
  chipEndsAt?: number;
}

/** Net income rises $800 a step from $20,000; the parent's Medicaid ends at $38k with no cliff; the premium credit starts at $39k. */
function makePoints({ snapCliff = true, snapTail = false, careCliff = true, deferredCliff = true, stuckAt, chipEndsAt }: Shape = {}): CurvePoint[] {
  const points: CurvePoint[] = [];
  let net = 20_000;
  for (let e = 0; e <= TOP; e += STEP) {
    const programs = zero();
    if (snapCliff && e <= 41_000) programs.snap = 3000;
    if (snapCliff && snapTail && e >= 42_000 && e <= 50_000) programs.snap = 1200;
    if (careCliff && e <= 54_000) programs.childcare = 20_000;
    const childMedicaid = deferredCliff ? (e <= 71_000 ? 8000 : 0) : 8000;
    programs.medicaid = (e <= 37_000 ? 6000 : 0) + childMedicaid;
    const childChip = chipEndsAt !== undefined && e <= chipEndsAt ? 4000 : 0;
    programs.chip = childChip;
    if (e >= 39_000) programs.aca = 2000;
    if (e >= 1000 && e <= 57_000) programs.eitc = 3000;
    if (e > 0) net += 800;
    if (snapCliff && e === 42_000) net -= 2500 + 800;
    if (careCliff && e === 55_000) net -= 9000 + 800;
    if (deferredCliff && e === 72_000) net -= 1500 + 800;
    if (stuckAt !== undefined && e === stuckAt) net -= 100_000;
    points.push({
      earnings: e, netIncome: net, medicalOOP: e >= 39_000 ? 1200 : 0, programs,
      childPrograms: { medicaid: childMedicaid, chip: childChip }, otherBenefits: 0, stateCredits: 0, totalCtc: 0, coverageGap: false,
    });
  }
  return points;
}

export function makeEvaluation(overrides: Partial<HouseholdEvaluation> = {}, current = 43_000, shape: Shape = {}): HouseholdEvaluation {
  const points = makePoints(shape);
  // The one reading evaluate.ts makes: every cliff counts, the deferred one labelled (2026-09-17).
  const analysis = analyzeCurve(points, current, { hasChildren: true, isAdultGroupLoss: () => true });
  const deferred = analysis.cliffs.filter((c) => c.deferral !== null);
  const escape = escapeAnalysis(points, analysis);
  const zone = analysis.dangerZones.find((z) => current > z.startEarnings && (z.endEarnings === null || current < z.endEarnings)) ?? null;
  return {
    answers: { ...ANSWERS, annualEarnings: current }, source: "live", curve: { year: "2026", currentEarnings: current, points },
    analysis, deferred, escape,
    personal: { zone, escapeEarnings: zone?.endEarnings ?? null, raiseToClear: zone ? (zone.endEarnings ?? TOP) - current : null, raiseIsLowerBound: zone !== null && zone.endEarnings === null },
    reach: { safeExit: 80, current: 37.5 }, minWage: { wage: 15.16, fullTimeEarnings: 31532.8, cliffs: [] },
    coverageGap: null, headStart: null, esi: null, maTafdc: null, premiumWrap: null, perMemberPremiumHelp: null, statePremiumAssistance: null, liheap: null, unclaimed: [],
    ...overrides,
  };
}
