// One household in, everything HotGap knows about it out. Nothing here is new
// analysis: it is the fixed order the pieces have to run in (curve →
// corrections → cliffs → escape → reach → minimum-wage framing) written down
// once, so a CLI, a worker and a test can never disagree about how a household
// is evaluated.
//
// The corrections step is where PolicyEngine's curve stops being taken at face
// value. Each one is a place the model and the rulebook disagree, each is
// applied to the points BEFORE any analysis runs (so cliffs and danger zones
// describe the corrected curve, not the raw one), and each is reported on the
// evaluation so a front end can say what was changed and why.
import { analyzeCurve, zoneAt, type Cliff, type CurveAnalysis, type DangerZone, PROGRAM_END_MIN } from "./analyze.js";
import { fetchCurve, PolicyEngineError, type FetchCurveOptions } from "./client.js";
import { escapeAnalysis, type EscapeAnalysis } from "./escape.js";
import { clampFallbackEarnings, loadArchetypeCurve, pickArchetypeId } from "./fallback.js";
import { fullTimeEarningsAt, minWageContext, minWageFor } from "./minWage.js";
import { ESI_EMPLOYEE_CONTRIBUTION, fpl2025 } from "./policyYear.js";
import { reachForHousehold } from "./reachLookup.js";
import { ARCHETYPES, answersFor } from "./archetypes.js";
import { correctMaTafdc, type MaTafdcCorrection } from "./maTafdc.js";
import { esiTier, householdSize, YEAR, type CurvePoint, type CurveResponse, type HouseholdAnswers } from "./types.js";

/** Where the curve came from: a live PolicyEngine call, or the committed sweep. */
export type CurveSource = "live" | "archetype";

export interface ReachSummary {
  // Cross-sectional percentiles (0–100) among real households shaped like this
  // one in this state — "how common is this income", never odds of reaching it.
  // null when there is no trustworthy reach cell or the income is not positive.
  safeExit: number | null;
  current: number | null;
}

export interface MinWageSummary {
  wage: number;
  fullTimeEarnings: number;
  /** One entry per analysis.cliffs[i], in the same order. */
  cliffs: { startEarnings: number; hoursPerWeek: number | null }[];
}

/** This household's own position, rather than the whole curve's. */
export interface PersonalEscape {
  /** The danger zone containing current earnings, or null when already clear. */
  zone: DangerZone | null;
  /** Where that zone ends; null when it never recovers inside the axis. */
  escapeEarnings: number | null;
  /** The raise from here to there; null when not in a zone. */
  raiseToClear: number | null;
  /** True when the zone runs off the end of the axis, so the raise is a floor. */
  raiseIsLowerBound: boolean;
}

/** The band of earnings where no coverage help exists at all. */
export interface CoverageGapSummary {
  fromEarnings: number;
  toEarnings: number;
}

export interface HeadStartSummary {
  /** PolicyEngine's valuation of the slot. */
  stickerValue: number;
  /** What it is worth as a substitute for the childcare this family buys. */
  replacementValue: number;
  /** Always true: 45 CFR 1302.12(j)(1) carries an enrolled child forward. */
  deferred: true;
}

export interface HouseholdEvaluation {
  answers: HouseholdAnswers;
  source: CurveSource;
  curve: CurveResponse;
  analysis: CurveAnalysis;
  escape: EscapeAnalysis;
  personal: PersonalEscape;
  reach: ReachSummary;
  minWage: MinWageSummary | null;
  coverageGap: CoverageGapSummary | null;
  headStart: HeadStartSummary | null;
  maTafdc: MaTafdcCorrection | null;
}

function minWageSummary(state: string, cliffs: Cliff[]): MinWageSummary | null {
  const wage = minWageFor(state);
  if (wage === null) return null;
  return {
    wage,
    fullTimeEarnings: fullTimeEarningsAt(wage),
    // Re-asked per cliff rather than dividing here, so the "past full-time ⇒ no
    // meaningful hours framing" rule stays in minWageContext alone.
    cliffs: cliffs.map((c) => ({
      startEarnings: c.startEarnings,
      hoursPerWeek: minWageContext(state, c.startEarnings)?.hoursPerWeek ?? null,
    })),
  };
}

// Committed archetype curves were swept before childPrograms/otherBenefits/
// coverageGap existed, so a point read off disk can be missing all three.
// Fill them in once, here, rather than defending against undefined everywhere.
const normalize = (p: CurvePoint): CurvePoint => ({
  ...p,
  childPrograms: p.childPrograms ?? {},
  otherBenefits: p.otherBenefits ?? 0,
  coverageGap: p.coverageGap ?? false,
});

/**
 * Finding 5 — employer coverage.
 *
 * PolicyEngine charges an ESI household the full *marketplace* premium. Live
 * decomposition 2026-09-14 (CA, one parent one child, $60k): medical
 * out-of-pocket $5,220, every dollar of it `marketplace_net_premium`, with
 * `other_health_insurance_premiums` — the slot an employee contribution would
 * occupy — at $0. Because `offered_aca_disqualifying_esi` zeroes the premium
 * tax credit, that $5,220 is an unsubsidized premium for coverage this
 * household does not buy. The `employer_sponsored_insurance_premiums` input
 * does not touch it: $6,500 and $13,000 give byte-identical output, and
 * PolicyEngine documents the variable as the employer's share anyway.
 *
 * So this REPLACES the premium rather than adding to it — adding would charge
 * the family a marketplace premium and a paycheck deduction at once. What they
 * really pay is the MEPS-IC employee contribution.
 *
 * Two guards, both of which exist to avoid inventing a charge. The
 * $0-earnings point is left alone: no job, no payroll deduction. And a point
 * where PolicyEngine charged nothing is left alone too — for an ESI household
 * its medical out-of-pocket is entirely `marketplace_net_premium`, so $0 there
 * means the family is on Medicaid or CHIP at that income and is not paying an
 * employer plan. Without that second guard the curve grew a false cliff the
 * full size of the contribution at the first dollar of pay.
 */
// WORKAROUND — remove when upstream models the employee ESI share
// (policyengine-us #9473).
function applyEmployerCoverage(points: CurvePoint[], a: HouseholdAnswers): CurvePoint[] {
  if (!a.hasEmployerCoverage) return points;
  const tier = esiTier(a);
  return points.map((p) => {
    if (p.earnings <= 0) return p;
    // Whether the household pays for the employer plan is a coverage question,
    // not a "did PolicyEngine charge a premium" question — the marketplace
    // premium switching on is unrelated to the employer plan. An adult on
    // Medicaid is not buying the plan; a parent whose children are on
    // Medicaid or CHIP buys the single tier (a spouse still needs cover, so a
    // married household stays on the family tier); otherwise the family tier.
    const adultMedicaid = (p.programs.medicaid ?? 0) - (p.childPrograms.medicaid ?? 0);
    if (adultMedicaid > PROGRAM_END_MIN) return p;
    const childrenCovered = (p.childPrograms.medicaid ?? 0) + (p.childPrograms.chip ?? 0) > PROGRAM_END_MIN;
    const contribution = ESI_EMPLOYEE_CONTRIBUTION[childrenCovered && !a.married ? "single" : tier];
    return { ...p, netIncome: p.netIncome + p.medicalOOP - contribution, medicalOOP: contribution };
  });
}

/**
 * Finding 9 — Head Start.
 *
 * PolicyEngine values a slot at its program cost (about $22,285 a child in
 * California), and that sticker lands in net income as if it were cash. It is
 * not: what a family gains is the childcare bill it no longer pays, which is
 * capped by the bill they actually have. A family paying $600 a month is
 * better off by at most $7,200, not $22,285, so the "cliff" at the eligibility
 * threshold is a fraction of what the raw curve draws.
 *
 * The threshold is not a date either: under 45 CFR 1302.12(j)(1) a child who
 * is enrolled stays eligible through the following program year, so a raise
 * does not end Head Start when it crosses the line.
 */
function applyHeadStart(points: CurvePoint[], a: HouseholdAnswers): CurvePoint[] {
  if (!a.getsHeadStart) return points;
  const replacementCost = 12 * (a.monthlyChildcare ?? 0);
  return points.map((p) => {
    const sticker = p.programs.headstart ?? 0;
    if (sticker <= 0) return p;
    const value = Math.min(sticker, replacementCost);
    return {
      ...p,
      netIncome: p.netIncome - (sticker - value),
      programs: { ...p.programs, headstart: value },
      childPrograms: p.childPrograms.headstart === undefined
        ? p.childPrograms
        : { ...p.childPrograms, headstart: value },
    };
  });
}

/**
 * Finding 2 — the coverage gap.
 *
 * In the nine non-expansion states with a gap, an adult above the state's
 * parent limit and below 100% FPL qualifies for nothing: no Medicaid, and no
 * premium tax credit, because 26 CFR 1.36B-2(b)(1) puts the subsidy floor at
 * 100% FPL. PolicyEngine still charges them the full unsubsidized benchmark
 * premium — live 2026-09-14, a Texas parent with one child at $10,000 of
 * earnings has no Medicaid, no credit, and $6,962 of medical out-of-pocket,
 * against a 100%-FPL line of $21,150 for two. Nobody in that band buys that
 * plan. Wyoming's own 2026 eligibility chart labels the band "No Coverage".
 *
 * So we call it what it is: uninsured. The premium comes back out of the money
 * line and the point is flagged, which is worse news honestly told — the
 * household keeps the cash and has no coverage at all.
 *
 * The FPL vintage is 2025, not 2026: marketplace eligibility for coverage year
 * 2026 runs on the guidelines in effect when open enrollment began
 * (26 CFR 1.36B-1(h)). See policyYear.ts.
 */
// WORKAROUND — remove when upstream gates marketplace take-up on subsidy
// eligibility (policyengine-us #9472).
function applyCoverageGap(points: CurvePoint[], a: HouseholdAnswers): CurvePoint[] {
  const povertyLine = fpl2025(a.state, householdSize(a));
  // The subsidy floor is tested on MAGI (IRC §36B(d)(2)(B)): wages, the
  // spouse's wages, unemployment, and Social Security (SSDI is added back).
  // Child support received is not gross income and is not in MAGI — counting
  // it moved the floor down and restored the phantom premium between the two
  // lines (verified live 2026-09-15: PolicyEngine's own credit starts at the
  // family-of-three line on earnings alone).
  const nonWageIncome = a.spouseAnnualEarnings + 12 * (a.ssdiMonthly + a.unemploymentMonthly);
  return points.map((p) => {
    const adultMedicaid = (p.programs.medicaid ?? 0) - (p.childPrograms.medicaid ?? 0);
    const inGap =
      adultMedicaid <= PROGRAM_END_MIN &&
      (p.programs.aca ?? 0) <= PROGRAM_END_MIN &&
      !a.hasEmployerCoverage &&
      p.medicalOOP > 0 &&
      p.earnings + nonWageIncome < povertyLine;
    return inGap ? { ...p, coverageGap: true, netIncome: p.netIncome + p.medicalOOP, medicalOOP: 0 } : p;
  });
}

function coverageGapSummary(points: CurvePoint[]): CoverageGapSummary | null {
  // The first contiguous band only: the summary must never span points that
  // are not in the gap.
  const first = points.findIndex((p) => p.coverageGap);
  if (first === -1) return null;
  let last = first;
  while (last + 1 < points.length && points[last + 1].coverageGap) last++;
  return { fromEarnings: points[first].earnings, toEarnings: points[last].earnings };
}

function headStartSummary(raw: CurvePoint[], a: HouseholdAnswers): HeadStartSummary | null {
  if (!a.getsHeadStart) return null;
  // The headline figure is the slot at its most valuable point on the curve —
  // the number a family would otherwise see as the size of their cliff.
  const stickerValue = Math.round(Math.max(...raw.map((p) => p.programs.headstart ?? 0)));
  if (stickerValue <= 0) return null;
  return { stickerValue, replacementValue: Math.round(Math.min(stickerValue, 12 * (a.monthlyChildcare ?? 0))), deferred: true };
}

function personalEscape(analysis: CurveAnalysis): PersonalEscape {
  const zone = zoneAt(analysis.dangerZones, analysis.currentEarnings);
  const axisTop = analysis.points[analysis.points.length - 1].earnings;
  return {
    zone,
    escapeEarnings: zone?.endEarnings ?? null,
    // The whole-curve safe exit answers "where does this state's worst zone
    // end"; this answers "how much more does THIS household need". An
    // open-ended zone has no end inside the axis, so the raise is reported as
    // a floor measured to the top of the sweep.
    raiseToClear: zone === null ? null : (zone.endEarnings ?? axisTop) - analysis.currentEarnings,
    raiseIsLowerBound: zone !== null && zone.endEarnings === null,
  };
}

/** Every derived result for one household against one already-fetched curve. */
export function evaluateCurve(
  answers: HouseholdAnswers,
  curve: CurveResponse,
  source: CurveSource,
): HouseholdEvaluation {
  // A curve swept before childPrograms existed cannot say whether a parent or
  // a child holds a program. Guessing would hand the child's Medicaid to the
  // adult — which is exactly the conflation finding 4 is about — so anything
  // that needs the split is withheld instead of asserted. The next sweep
  // restores it; nothing else on the curve depends on it.
  const knowsWhoHolds = curve.points.every((p) => p.childPrograms !== undefined);
  const raw = curve.points.map(normalize);
  // Child support and unemployment ride inside PolicyEngine's household_benefits
  // (verified live 2026-09-14). They are the household's own income, constant
  // across the axis, and not means-tested help, so take them out of the
  // "other benefits" remainder — otherwise "benefits end" could never fire for
  // such a household. SSDI stays: its end above SGA is a real cliff.
  const steady = 12 * (answers.childSupportMonthly + answers.unemploymentMonthly);
  for (const p of raw) p.otherBenefits = Math.max(0, p.otherBenefits - steady);
  // The employer-coverage and Head Start corrections describe inputs the
  // archetype sweep never sent (it runs every take-up toggle off and nobody
  // with ESI), so they apply to a live curve only. The coverage gap is a
  // property of the state and the income, so it applies to both.
  // Offline points describe the swept archetype, including its spouse's $0
  // pay. Never apply the caller's personal inputs to that baseline.
  const modeledAnswers = source === "live" ? answers : answersFor(answers.state,
    ARCHETYPES.find((a) => a.id === pickArchetypeId(answers.married, answers.childAges.length))!);
  const tafdc = correctMaTafdc(modeledAnswers, raw);
  const corrected = source === "live" ? applyHeadStart(applyEmployerCoverage(tafdc.points, answers), answers) : tafdc.points;
  const points = knowsWhoHolds ? applyCoverageGap(corrected, answers) : corrected;
  const analysis = analyzeCurve(points, curve.currentEarnings);
  const escape = knowsWhoHolds
    ? escapeAnalysis(points, analysis)
    : { ...escapeAnalysis(points, analysis), programEndsByAge: { adults: {}, children: {} }, childCoverageEndEarnings: null };
  // A zero (or absent) income has no position in an earnings distribution —
  // reporting "0% of households earn less" would read as a finding, not a gap.
  // The reach ladder is indexed on householder-plus-spouse earnings, so a
  // married household's position has to include the spouse's pay — and the
  // "is there any income to place" guard has to look at the same combined
  // figure, or a household living on the spouse's wages loses its reach line.
  const reachAt = (income: number | null): number | null => {
    if (income === null) return null;
    const household = income + answers.spouseAnnualEarnings;
    return household > 0 ? reachForHousehold(answers.state, answers.married, answers.childAges.length, household) : null;
  };

  return {
    answers,
    source,
    curve: { ...curve, points },
    analysis,
    escape,
    personal: personalEscape(analysis),
    reach: { safeExit: reachAt(escape.safeExitEarnings), current: reachAt(curve.currentEarnings) },
    minWage: minWageSummary(answers.state, analysis.cliffs),
    coverageGap: coverageGapSummary(points),
    headStart: source === "live" ? headStartSummary(raw, answers) : null,
    maTafdc: tafdc.correction,
  };
}

/**
 * Evaluate against the committed archetype curve instead of PolicyEngine —
 * null when this state × household shape has no swept curve.
 *
 * The archetype curve ignores county, rent, age, disability, and the take-up
 * toggles: it is the honest baseline for "a family shaped like this in this
 * state", not this family's own numbers. Earnings are clamped to the sweep's
 * last sampled point so no verdict claims anything past the data.
 */
export function evaluateOffline(answers: HouseholdAnswers): HouseholdEvaluation | null {
  const points = loadArchetypeCurve(answers.state, answers.married, answers.childAges.length);
  if (!points) return null;
  const curve: CurveResponse = {
    year: YEAR,
    currentEarnings: clampFallbackEarnings(points, answers.annualEarnings),
    points,
  };
  return evaluateCurve(answers, curve, "archetype");
}

export interface EvaluateOptions extends FetchCurveOptions {
  /** Fall back to the archetype curve when PolicyEngine fails. Default true. */
  fallback?: boolean;
}

/** The whole calculation: a live curve when we can get one, the archetype baseline when we can't. */
export async function evaluateHousehold(
  answers: HouseholdAnswers,
  opts: EvaluateOptions = {},
): Promise<HouseholdEvaluation> {
  try {
    return evaluateCurve(answers, await fetchCurve(answers, opts), "live");
  } catch (e) {
    // Only PolicyEngine's own failures earn the fallback. A bug in our analysis
    // must surface as itself rather than be papered over with a baseline curve.
    if (opts.fallback === false || !(e instanceof PolicyEngineError)) throw e;
    const offline = evaluateOffline(answers);
    // Rethrow the ORIGINAL error, not "no archetype": the live failure is the
    // thing the caller has to act on.
    if (!offline) throw e;
    return offline;
  }
}
