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
import { analyzeCurve, childCoverageAt, heldByAdults, zoneAt, type Cliff, type CurveAnalysis, type DangerZone, PROGRAM_END_MIN } from "./analyze.js";
import { fetchCurve, PolicyEngineError, type FetchCurveOptions } from "./client.js";
import { escapeAnalysis, type EscapeAnalysis } from "./escape.js";
import { loadStateFile, type StateFileJson } from "./data.js";
import { archetypeCurveFrom, clampFallbackEarnings, pickArchetypeId } from "./fallback.js";
import { fullTimeEarningsAt, minWageContext, minWageFor } from "./minWage.js";
import { ESI_EMPLOYEE_CONTRIBUTION, ESI_FULL_TIME_HOURS, fpl2025, MEDICARE_PART_B_ANNUAL, NON_EXPANSION_STATES, fpl2026 } from "./policyYear.js";
import { stateDefaults } from "./stateDefaults.js";
import { statePremiumAssistanceFor, type StatePremiumAssistance } from "./statePremiumAssistance.js";
import { premiumTierAbove, premiumWrapFor, type PremiumWrap } from "./statePremiumWraps.js";
import { reachForHousehold } from "./reachLookup.js";
import { answersFor, archetypeById } from "./archetypes.js";
import { correctMaTafdc, type MaTafdcCorrection } from "./maTafdc.js";
import { liheapAmount, liheapBoundary, type LiheapBoundary } from "./liheap.js";
import { householdSize, YEAR, type CurvePoint, type CurveResponse, type HouseholdAnswers } from "./types.js";

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
  /** What it costs to replace the slot: the market price of the care it provides. */
  replacementValue: number;
  /** The monthly childcare price that set it, and whose price it is. */
  monthlyReplacementCost: number;
  /** True when this state's market price set it, not the family's own bill. */
  usesStateMarketPrice: boolean;
  /** Always true: 45 CFR 1302.12(j)(1) carries an enrolled child forward. */
  deferred: true;
}

/** Which MEPS-IC employer-plan tier this household's plan has to be. */
export type EsiTier = keyof typeof ESI_EMPLOYEE_CONTRIBUTION;

export interface EsiSummary {
  /** null when nobody pays at this household's own earnings. */
  tier: EsiTier | null;
  annualContribution: number;
}

export interface HouseholdEvaluation {
  answers: HouseholdAnswers;
  source: CurveSource;
  curve: CurveResponse;
  /**
   * Cliffs are every cliff on the real curve; every other field — the verdict,
   * the danger zones, the worst cliff — describes the curve with the deferred
   * ones neutralized, because a household that takes the raise does not lose a
   * deferred program this year. `currentNet` stays the real curve's.
   * Two object-identity traps follow: `worstCliff`/`nextCliff` are computed
   * on the lifted curve and are never the same objects as entries of
   * `cliffs` (compare by `startEarnings`), and `dangerZones` describe the
   * lifted curve, not `points` — a plot of both must lift `points` too.
   */
  analysis: CurveAnalysis;
  /** The subset of `analysis.cliffs` that lands at a future renewal, not now. */
  deferred: Cliff[];
  escape: EscapeAnalysis;
  personal: PersonalEscape;
  reach: ReachSummary;
  minWage: MinWageSummary | null;
  coverageGap: CoverageGapSummary | null;
  headStart: HeadStartSummary | null;
  /** The employer-plan tier and charge at this household's own earnings. */
  esi: EsiSummary | null;
  maTafdc: MaTafdcCorrection | null;
  /** The state $0-premium tier this household's curve fell inside, if any (local ladder). */
  premiumWrap: PremiumWrap | null;
  /** The state's modeled premium assistance netted out of the premium, when the endpoint served it. */
  statePremiumAssistance: StatePremiumAssistanceSummary | null;
  /**
   * Where energy assistance (LIHEAP) stops for this household — the state's
   * income limit inside this curve's range, what the state pays at that top
   * band, and the share of eligible households it served — or null when the
   * curve ends below the limit (liheap.ts). A boundary, not a Cliff: it is
   * not in `cliffs`, `programEnds`, `dangerZones` or any metric, because
   * with the toggle off there is nothing in the money line to lose. Read
   * from the answers and the axis alone, so both paths agree.
   */
  liheap: LiheapBoundary | null;
  /**
   * What each entitlement the household said it does not get would pay at
   * its current earnings, from a second curve with every take-up on. Empty
   * when nothing is off or nothing off would pay; null on the offline path,
   * which has no second curve to ask for.
   */
  unclaimed: UnclaimedBenefit[] | null;
}

export interface UnclaimedBenefit {
  program: "snap" | "tanf" | "medicaid" | "wic";
  annual: number;
}

/** The entitlements a household can say it does not get, each with the answer that switches it off. */
export const ENTITLEMENT_TAKE_UP: readonly { program: UnclaimedBenefit["program"]; flag: "getsSnap" | "getsTanf" | "getsMedicaid" | "getsWic" }[] = [
  { program: "snap", flag: "getsSnap" }, { program: "tanf", flag: "getsTanf" },
  { program: "medicaid", flag: "getsMedicaid" }, { program: "wic", flag: "getsWic" },
];

/** The same household with every entitlement taken up, or null when nothing is off. */
function withEveryEntitlement(a: HouseholdAnswers): HouseholdAnswers | null {
  if (ENTITLEMENT_TAKE_UP.every(({ flag }) => a[flag])) return null;
  return { ...a, getsSnap: true, getsTanf: true, getsMedicaid: true, getsWic: true };
}

/** The last sampled point at or below `earnings` — the point whose figures already sit in the curve — or the first when none is. */
function pointAtOrBelow(points: CurvePoint[], earnings: number): CurvePoint {
  let at = points[0];
  for (const p of points) if (p.earnings <= earnings) at = p;
  return at;
}

/** Programs that are off for `a` and pay something at its earnings on the all-take-up evaluation. */
function unclaimedFrom(a: HouseholdAnswers, allTakeUp: HouseholdEvaluation): UnclaimedBenefit[] {
  const at = pointAtOrBelow(allTakeUp.curve.points, a.annualEarnings);
  return ENTITLEMENT_TAKE_UP
    .filter(({ flag }) => !a[flag])
    .map(({ program }) => ({ program, annual: Math.round(at.programs[program] ?? 0) }))
    .filter(({ annual }) => annual > PROGRAM_END_MIN);
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
  // No `ctc` was requested before 2026-09-15, so the refundable series is the
  // only child tax credit such a curve knows about. Falling back to it keeps
  // the old (understated) threshold rather than pretending the credit is $0.
  stateCredits: p.stateCredits ?? 0,
  totalCtc: p.totalCtc ?? p.programs.ctc ?? 0,
  coverageGap: p.coverageGap ?? false,
});

const adultOnMedicaidAt = (p: CurvePoint): boolean => heldByAdults(p, "medicaid") > PROGRAM_END_MIN;
const childrenCoveredAt = (p: CurvePoint): boolean => childCoverageAt(p) > PROGRAM_END_MIN;

/**
 * The household's MAGI apart from the earnings on the axis: the spouse's
 * wages, unemployment, and Social Security (SSDI is added back). Child
 * support received is not gross income and is not in MAGI — counting it
 * moved the marketplace subsidy floor down and restored the phantom premium
 * between the two lines (verified live 2026-09-15: PolicyEngine's own credit
 * starts at the family-of-three line on earnings alone).
 */
const magiBesidesEarnings = (a: HouseholdAnswers): number =>
  a.spouseAnnualEarnings + 12 * (a.ssdiMonthly + a.unemploymentMonthly);

/**
 * Which employer-plan tier this household has to buy at this earnings level,
 * or null when nobody pays.
 *
 * Decided per person, not per household, and about the PLAN HOLDER first: the
 * plan is the householder's (translate.ts sets `has_esi` on "you"), so the
 * question is whether the householder still needs it, and only then who else
 * they have to put on it. PolicyEngine reports one Medicaid figure for the two
 * adults and HotGap cannot split it; but a married pair shares one MAGI and one
 * eligibility category, so they gain and lose Medicaid together EXCEPT through
 * the SSI-linked aged-blind-disabled pathway, which covers one adult and not
 * the other. That is the case the old "any adult on Medicaid ⇒ nobody pays"
 * guard got wrong: a householder whose disabled spouse is on Medicaid is
 * buying the plan.
 *
 * Then count who else the plan must cover — the spouse unless Medicaid has
 * them, plus every child without Medicaid or CHIP — and MEPS-IC's own three
 * tiers follow: nobody else is `single`, one other is `plusOne`, more is
 * `family`. A lone parent with one child buys a two-person plan, not a family
 * one, which is why the plus-one row is held in policyYear.ts at all.
 *
 * One child covered is read as all children covered. Children in a household
 * share a MAGI and, in nearly every state, one Medicaid/CHIP limit across ages
 * 1–18, so they cross together; a household straddling an age band for one
 * year is charged the smaller tier.
 */
export function esiTierAt(a: HouseholdAnswers, p: CurvePoint): EsiTier | null {
  if (!a.hasEmployerCoverage) return null;
  // No job, no payroll deduction.
  if (p.earnings <= 0) return null;
  // An employer owes coverage to a full-time employee — 30 hours a week,
  // 26 U.S.C. 4980H(c)(4)(A). Below that there is usually no plan to be
  // enrolled in, so no contribution is charged. A household that never
  // reported its hours is charged: "unknown" must not become "part-time".
  if (a.hoursPerWeek !== null && a.hoursPerWeek < ESI_FULL_TIME_HOURS) return null;
  const adultMedicaid = adultOnMedicaidAt(p);
  // Exactly one disabled adult is the only way the pair's coverage can differ.
  const onlySpouseDisabled = a.married && a.spouseDisabled && !a.youDisabled;
  const onlyYouDisabled = a.married && a.youDisabled && !a.spouseDisabled;
  if (adultMedicaid && !onlySpouseDisabled) return null;
  const spouseNeedsPlan = a.married && !(adultMedicaid && !onlyYouDisabled);
  const others = (spouseNeedsPlan ? 1 : 0) + (childrenCoveredAt(p) ? 0 : a.childAges.length);
  return others === 0 ? "single" : others === 1 ? "plusOne" : "family";
}

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
  return points.map((p) => {
    // Whether the household pays for the employer plan is a coverage question,
    // not a "did PolicyEngine charge a premium" question — the marketplace
    // premium switching on is unrelated to the employer plan.
    const tier = esiTierAt(a, p);
    if (tier === null) return p;
    const contribution = ESI_EMPLOYEE_CONTRIBUTION[tier];
    return { ...p, netIncome: p.netIncome + p.medicalOOP - contribution, medicalOOP: contribution };
  });
}

/**
 * Finding — SSDI and Medicare.
 *
 * An SSDI beneficiary is entitled to Medicare 24 months after the first month
 * of benefits (42 U.S.C. 426(b)), and that entitlement continues for at least
 * 93 months after the nine-month trial work period ends (42 U.S.C. 426(b),
 * last sentence). So a beneficiary who crosses substantial gainful activity
 * does NOT lose health coverage with the check: there is no coverage cliff at
 * SGA, and no marketplace premium to pay on the far side of it. HotGap was
 * charging one.
 *
 * SIMPLIFICATION, because HotGap never asks how long the check has been
 * coming: every household reporting `ssdiMonthly > 0` is modeled as already
 * past the 24-month wait. That is the ordinary case — the wait is two years out
 * of a benefit most people receive until retirement age — but it is the wrong
 * one for a household in its first two years on SSDI, whose real marketplace
 * premium HotGap now leaves out. The error runs one way, and this is it.
 *
 * Part B is charged unless the adult has Medicaid. HotGap models no Medicare
 * Savings Program, and the adult's own Medicaid stands in for one: the QMB,
 * SLMB and QI programs that pay a beneficiary's Part B premium are Medicaid
 * programs, so an adult PolicyEngine puts on Medicaid is the adult a state
 * would be paying the premium for.
 *
 * Not modeled at all when the household has employer coverage: Medicare
 * alongside a plan from current work is a choice about which pays first, and
 * HotGap does not ask. Their employee contribution stands unchanged.
 */
// WORKAROUND — remove when upstream models Medicare enrollment for SSDI
// beneficiaries (no issue filed; PolicyEngine has no Medicare enrollment input).
// Simplification, stated: only full Medicaid stands in for a Medicare Savings
// Program. QMB/SLMB/QI pay Part B up to 135% FPL without full Medicaid, so a
// recipient between the state's Medicaid line and 135% FPL is charged
// $2,435 they may not owe; MSP take-up is low and asset-tested, so charging
// is the conservative direction.
function applyMedicare(points: CurvePoint[], a: HouseholdAnswers): CurvePoint[] {
  if (a.ssdiMonthly <= 0 || a.hasEmployerCoverage) return points;
  return points.map((p) => {
    const partB = adultOnMedicaidAt(p) ? 0 : MEDICARE_PART_B_ANNUAL;
    // PolicyEngine reports ONE medical-out-of-pocket figure for the whole SPM
    // unit, so the marketplace premium cannot be split between the people on
    // the plan. The rule, therefore, is all-or-nothing: the premium (and the
    // credit that nets against it) belongs to the recipient alone only when
    // nobody else in the household needs a marketplace plan — no spouse, and
    // every child on Medicaid or CHIP. Otherwise the household's premium
    // stands and Part B is charged on top of it, which overstates the
    // recipient's own share. That is the conservative direction, and it is
    // stated rather than fixed by splitting on an invented ratio.
    const recipientOnly = medicareCoversWholeHousehold(p, a);
    const marketplace = recipientOnly ? p.medicalOOP : 0;
    return {
      ...p,
      netIncome: p.netIncome + marketplace - partB,
      medicalOOP: p.medicalOOP - marketplace + partB,
      // The premium tax credit is not inside netIncome — it reaches it only
      // through the premium — so zeroing it moves no money. It stops the
      // reports from saying a Medicare household's marketplace subsidy ended.
      programs: recipientOnly ? { ...p.programs, aca: 0 } : p.programs,
    };
  });
}

/**
 * Finding 9 — Head Start.
 *
 * PolicyEngine values a slot at its program cost (about $22,285 a child in
 * California), and that sticker lands in net income as if it were cash. It is
 * not: what a family gains is the care they would otherwise have to buy, which
 * is worth what that care costs — not what the program costs to run.
 *
 * What it costs to replace is the market price of a full-day preschool place
 * for a preschooler in this state, or the family's own childcare bill when
 * that is higher. Capping it at the family's own bill alone, as this did until
 * 2026-09-15, handed $0 of value to the family that reports paying nothing —
 * and a family pays nothing precisely BECAUSE the Head Start slot is full-day
 * and free. The cap told them a free full-day place was worth nothing to them.
 *
 * The threshold is not a date either: under 45 CFR 1302.12(j)(1) a child who
 * is enrolled stays eligible through the following program year, so a raise
 * does not end Head Start when it crosses the line.
 */
function headStartMonthlyCost(a: HouseholdAnswers): number {
  return Math.max(a.monthlyChildcare ?? 0, stateDefaults(a.state).monthlyChildcarePreschool);
}

function applyHeadStart(points: CurvePoint[], a: HouseholdAnswers): CurvePoint[] {
  if (!a.getsHeadStart) return points;
  const replacementCost = 12 * headStartMonthlyCost(a);
  return points.map((p) => {
    const sticker = p.programs.headstart ?? 0;
    if (sticker <= 0) return p;
    // A childcare subsidy at this point already pays part of the bill Head
    // Start would replace; count that part once (both toggles on together).
    const value = Math.min(sticker, Math.max(0, replacementCost - (p.programs.childcare ?? 0)));
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
 * True when the SSDI recipient is the only person who needs coverage — no
 * spouse, and every child on Medicaid or CHIP — so Medicare (applyMedicare)
 * covers the whole household and no marketplace premium or gap applies.
 */
function medicareCoversWholeHousehold(p: CurvePoint, a: HouseholdAnswers): boolean {
  return a.ssdiMonthly > 0 && !a.hasEmployerCoverage && !a.married && (a.childAges.length === 0 || childrenCoveredAt(p));
}

/**
 * Whether an adult-Medicaid loss at these earnings sits on the ACA adult
 * group's line (138% FPL plus the 5-point disregard, on the 2026 guideline
 * Medicaid uses). In an expansion state a parent normally leaves Medicaid
 * there, and that is not a §1931 loss, so Transitional Medical Assistance
 * does not follow it. Non-expansion states have no adult group: every
 * parent loss there is §1931 and TMA applies. The window is deliberately
 * wide — from 128% (a $1,000 step below the line for a one-person guideline)
 * to 151% (the line plus the disregard) — so the grid cannot miss it.
 */
function adultGroupLossTest(a: HouseholdAnswers): (earnings: number) => boolean {
  if (NON_EXPANSION_STATES.has(a.state)) return () => false;
  const line = fpl2026(a.state, householdSize(a));
  const otherMagi = magiBesidesEarnings(a);
  return (earnings) => {
    const share = (earnings + otherMagi) / line;
    return share >= 1.28 && share <= 1.51;
  };
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
 *
 * The subsidy floor is tested on MAGI (IRC §36B(d)(2)(B)) — the earnings on
 * the axis plus magiBesidesEarnings.
 */
// WORKAROUND — remove when upstream gates marketplace take-up on subsidy
// eligibility (policyengine-us #9472).
function applyCoverageGap(points: CurvePoint[], a: HouseholdAnswers): CurvePoint[] {
  const povertyLine = fpl2025(a.state, householdSize(a));
  const otherMagi = magiBesidesEarnings(a);
  return points.map((p) => {
    // Medicare is coverage, so a household HotGap models as enrolled through
    // SSDI (applyMedicare) is never in the marketplace gap. Only a one-adult
    // household is exempt outright: a married couple can still have an
    // uncovered spouse, and applyMedicare leaves their marketplace premium in
    // place for exactly that reason.
    if (medicareCoversWholeHousehold(p, a)) return p;
    const inGap =
      !adultOnMedicaidAt(p) &&
      (p.programs.aca ?? 0) <= PROGRAM_END_MIN &&
      !a.hasEmployerCoverage &&
      p.medicalOOP > 0 &&
      p.earnings + otherMagi < povertyLine;
    return inGap ? { ...p, coverageGap: true, netIncome: p.netIncome + p.medicalOOP, medicalOOP: 0 } : p;
  });
}

/** The state assistance PolicyEngine modeled, netted out of the premium on this curve. */
export interface StatePremiumAssistanceSummary extends StatePremiumAssistance {
  /** The largest annual amount on the curve. */
  maxAnnual: number;
}

/**
 * Where the endpoint served the state's own premium assistance, net it out
 * of the premium here — PolicyEngine keeps it in household_health_benefits,
 * never in the out-of-pocket figure — and leave the local ladder alone for
 * that state. A curve without the amounts (the hosted API) falls through to
 * the ladder as before.
 */
function applyStatePremiumAssistance(points: CurvePoint[], a: HouseholdAnswers): { points: CurvePoint[]; assistance: StatePremiumAssistanceSummary | null } {
  const program = statePremiumAssistanceFor(a.state);
  if (!program || a.hasEmployerCoverage || !points.every((p) => p.statePremiumAssistance !== undefined)) return { points, assistance: null };
  let maxAnnual = 0;
  const out = points.map((p) => {
    const netted = Math.min(p.statePremiumAssistance!, p.medicalOOP);
    if (netted <= 0) return p;
    maxAnnual = Math.max(maxAnnual, netted);
    return { ...p, netIncome: p.netIncome + netted, medicalOOP: p.medicalOOP - netted };
  });
  return { points: out, assistance: maxAnnual > 0 ? { ...program, maxAnnual: Math.round(maxAnnual) } : null };
}

// WORKAROUND — remove when upstream models state premium wraps (policyengine-us
// #9481). A marketplace enrollee inside the state's $0-premium tier pays
// nothing: the state tops up the federal credit. Modeled as the benchmark or
// lowest-cost plan being free — exact for CT, NM and CA, slightly generous for
// MA, whose $0 is the lowest-cost plan rather than the benchmark. Same MAGI as
// the coverage-gap test; same adult-Medicaid guard; only where a credit and a
// premium both exist, which is what "marketplace enrollee" means here.
function applyPremiumWrap(points: CurvePoint[], a: HouseholdAnswers): { points: CurvePoint[]; wrap: PremiumWrap | null } {
  if (a.hasEmployerCoverage) return { points, wrap: null };
  // The model's own amounts, when served, replace the local ladder.
  if (points.every((p) => p.statePremiumAssistance !== undefined)) return { points, wrap: null };
  const povertyLine = fpl2025(a.state, householdSize(a));
  const otherMagi = magiBesidesEarnings(a);
  let wrap: PremiumWrap | null = null;
  const out = points.map((p) => {
    if (adultOnMedicaidAt(p) || (p.programs.aca ?? 0) <= PROGRAM_END_MIN || p.medicalOOP <= 0) return p;
    const magi = p.earnings + otherMagi;
    const share = magi / povertyLine;
    const w = premiumWrapFor(a.state, share);
    if (w) {
      wrap = w;
      return { ...p, netIncome: p.netIncome + p.medicalOOP, medicalOOP: 0 };
    }
    // Just above the $0 band the state still caps the premium; without this
    // the band edge would step to the full federal net premium, a cliff the
    // state's own sliding scale does not have.
    const t = premiumTierAbove(a.state, share);
    if (!t) return p;
    const cap = Math.round(t.tier.annualPremium(magi, share, a.married ? 2 : 1));
    if (cap >= p.medicalOOP) return p;
    wrap = t.wrap;
    return { ...p, netIncome: p.netIncome + p.medicalOOP - cap, medicalOOP: cap };
  });
  return { points: out, wrap };
}

/**
 * Energy assistance (LIHEAP) in the money line, behind the household's own
 * take-up toggle — the rule housing vouchers and the child-care subsidy
 * follow, because a block grant that served 3–85% of eligible households is
 * not something to assume for a family that never said it had it.
 *
 * The state's own modeled schedule is used where the endpoint served it with
 * a real amount (parse.ts already put that series in `programs.liheap` and
 * net income). Where it did not — every state today, because upstream's DC,
 * MA and IL variables are capped at or keyed on a fuel and heating bill
 * HotGap never asks for, and return $0 on its payload — the amount is
 * HotGap's own sourced table: the family's band where the matrix gives an
 * income-only staircase, else the top band's minimum, flat to the limit and
 * zero above it. The drop lands in whichever step holds the limit, and
 * analyzeCurve then counts it in that step's cliff, breakdown and
 * programsLost exactly as it would a SNAP loss there: no new cliff logic.
 * Live path only — the archetype sweep runs every take-up off, like housing.
 */
// WORKAROUND (the table half) — retire a state's amount here when the
// endpoint serves that state's schedule with a non-zero series for HotGap's
// household (docs/upstream/2026-09-15-local-corrections.md).
function applyLiheap(points: CurvePoint[], a: HouseholdAnswers): CurvePoint[] {
  if (!a.getsEnergyAssistance) return points;
  if (points.some((p) => (p.programs.liheap ?? 0) > 0)) return points;
  return points.map((p) => {
    const amount = liheapAmount(a, p.earnings);
    return { ...p, netIncome: p.netIncome + amount, programs: { ...p.programs, liheap: amount } };
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
  const monthlyReplacementCost = headStartMonthlyCost(a);
  return {
    stickerValue,
    replacementValue: Math.round(Math.min(stickerValue, 12 * monthlyReplacementCost)),
    monthlyReplacementCost,
    usesStateMarketPrice: monthlyReplacementCost > (a.monthlyChildcare ?? 0),
    deferred: true,
  };
}

/** The employer-plan charge at this household's own pay, for the report. */
function esiSummary(a: HouseholdAnswers, points: CurvePoint[], currentEarnings: number): EsiSummary | null {
  if (!a.hasEmployerCoverage) return null;
  const tier = esiTierAt(a, pointAtOrBelow(points, currentEarnings));
  return { tier, annualContribution: tier === null ? 0 : ESI_EMPLOYEE_CONTRIBUTION[tier] };
}

/**
 * The curve as it would read if every deferred loss arrived with the raise
 * that causes it: each deferred step's drop is added back to every point above
 * it, so the step flattens to zero and the points beyond keep their shape.
 *
 * THIS IS THE ONLY PLACE HOTGAP ALTERS A CURVE FOR TIMING. Every other
 * correction in this file changes a number PolicyEngine got wrong; this one
 * changes WHEN a number that is right arrives, and it is never the curve that
 * is reported — `evaluateCurve` returns the real points and uses this copy
 * only to decide danger zones, safe exit, the leap and this household's own
 * path. A deferred cliff is still listed, still carries its full drop, and
 * still says what carries the household past it.
 */
function immediateCurve(points: CurvePoint[], deferred: Cliff[]): CurvePoint[] {
  if (deferred.length === 0) return points;
  const dropAt = new Map(deferred.map((c) => [c.startEarnings, c.drop]));
  let lift = 0;
  return points.map((p) => {
    const lifted = lift === 0 ? p : { ...p, netIncome: p.netIncome + lift };
    // The drop happens BETWEEN this point and the next, so it lifts the next
    // point and everything above it, never this one.
    lift += dropAt.get(p.earnings) ?? 0;
    return lifted;
  });
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
    archetypeById(pickArchetypeId(answers)));
  const tafdc = correctMaTafdc(modeledAnswers, raw);
  // The child-care subsidy needs no step here: parse.ts already put it in net
  // income wherever the model dropped it (policyengine-us #9405), so a stored
  // curve and a live one both arrive with it counted once.
  const corrected = source === "live" ? applyLiheap(applyHeadStart(applyEmployerCoverage(tafdc.points, answers), answers), answers) : tafdc.points;
  // The archetype path measures the swept household, not the caller's: its
  // spouse pay, SSDI, unemployment and size decide the poverty-line tests.
  const gapped = knowsWhoHolds ? applyCoverageGap(corrected, modeledAnswers) : corrected;
  const { points: assisted, assistance: statePremiumAssistance } = knowsWhoHolds ? applyStatePremiumAssistance(gapped, modeledAnswers) : { points: gapped, assistance: null };
  const { points: wrapped, wrap: premiumWrap } = knowsWhoHolds ? applyPremiumWrap(assisted, modeledAnswers) : { points: assisted, wrap: null };
  // Medicare last: it is the only correction that reads the coverage-gap
  // verdict's own output (a married couple whose phantom premium has just been
  // removed must not then be charged Part B against a premium that is gone).
  const points = source === "live" ? applyMedicare(wrapped, answers) : wrapped;

  // Two readings of the same curve. `full` is what happens: every cliff,
  // including the ones a federal rule defers to a renewal up to a year out.
  // `immediate` is what happens THIS year, and it is what the verdict, the
  // danger zones, the safe exit, the leap and this household's own path are
  // measured on — a family whose Head Start slot is guaranteed through the
  // next program year is not standing in a $20,000 hole the day they take the
  // raise, and telling them to leap over one is telling them not to take it.
  //
  // Transitional Medical Assistance is the one deferral that needs to know
  // WHICH adult lost the coverage, so it is withheld on a curve that cannot
  // say who holds it — the same guard the coverage gap and the per-age
  // thresholds use. Excusing a cliff is the strong claim; a curve that cannot
  // tell a parent's Medicaid from a child's does not get to make it.
  const opts = {
    hasChildren: knowsWhoHolds && modeledAnswers.childAges.length > 0,
    isAdultGroupLoss: adultGroupLossTest(modeledAnswers),
  };
  const full = analyzeCurve(points, curve.currentEarnings, opts);
  const deferred = full.cliffs.filter((c) => c.deferral !== null);
  const immediate = analyzeCurve(immediateCurve(points, deferred), curve.currentEarnings, opts);
  const analysis: CurveAnalysis = {
    ...immediate,
    // The real curve and its real cliffs; only the verdicts come from the
    // counterfactual. currentNet especially: it is this household's money
    // today, and a household already above a deferred step really has lost it.
    points,
    cliffs: full.cliffs,
    currentNet: full.currentNet,
  };
  // Program thresholds read the points' program values, which the lift never
  // touches — only netIncome moves — so escapeAnalysis sees the same
  // thresholds either way and takes its zones from the immediate reading.
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
    return household > 0 ? reachForHousehold(answers.state, answers, household) : null;
  };

  return {
    answers,
    source,
    curve: { ...curve, points },
    analysis,
    deferred,
    escape,
    personal: personalEscape(analysis),
    reach: { safeExit: reachAt(escape.safeExitEarnings), current: reachAt(curve.currentEarnings) },
    minWage: minWageSummary(answers.state, analysis.cliffs),
    coverageGap: coverageGapSummary(points),
    headStart: source === "live" ? headStartSummary(raw, answers) : null,
    esi: source === "live" ? esiSummary(answers, points, curve.currentEarnings) : null,
    maTafdc: tafdc.correction,
    premiumWrap,
    statePremiumAssistance,
    // The swept household on the archetype path, this one on the live path —
    // the same choice every poverty-line test above makes.
    liheap: liheapBoundary(modeledAnswers, { ...curve, points }),
    unclaimed: null,
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
 *
 * `file` is the state's sweep file: the committed one from disk by default,
 * or whatever the caller fetched where there is no disk (see EvaluateOptions).
 */
export function evaluateOffline(answers: HouseholdAnswers, file: StateFileJson | null = loadStateFile(answers.state)): HouseholdEvaluation | null {
  const points = archetypeCurveFrom(file, answers);
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
  /**
   * Where the fallback's sweep file comes from. Default: the committed file
   * on disk. A Worker, which has no disk and must not hold every state's
   * 600 KB in memory, fetches it from its static assets — and only when the
   * fallback actually runs, which is why this is a loader and not a value.
   */
  loadStateFile?: (state: string) => Promise<StateFileJson | null>;
}

/** The whole calculation: a live curve when we can get one, the archetype baseline when we can't. */
export async function evaluateHousehold(
  answers: HouseholdAnswers,
  opts: EvaluateOptions = {},
): Promise<HouseholdEvaluation> {
  try {
    const ev = evaluateCurve(answers, await fetchCurve(answers, opts), "live");
    const everything = withEveryEntitlement(answers);
    if (!everything) return { ...ev, unclaimed: [] };
    // A second curve, corrections and all, so the figure is the one the
    // household would see if it did claim.
    const claimed = evaluateCurve(everything, await fetchCurve(everything, opts), "live");
    return { ...ev, unclaimed: unclaimedFrom(answers, claimed) };
  } catch (e) {
    // Only PolicyEngine's own failures earn the fallback. A bug in our analysis
    // must surface as itself rather than be papered over with a baseline curve.
    if (opts.fallback === false || !(e instanceof PolicyEngineError)) throw e;
    const offline = evaluateOffline(answers, opts.loadStateFile ? await opts.loadStateFile(answers.state) : undefined);
    // Rethrow the ORIGINAL error, not "no archetype": the live failure is the
    // thing the caller has to act on.
    if (!offline) throw e;
    return offline;
  }
}
