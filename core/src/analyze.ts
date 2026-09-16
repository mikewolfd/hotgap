import type { CurvePoint, ProgramId } from "./types.js";
import { CASH_PROGRAMS, COVERAGE_PROGRAMS, NET_INCOME_CREDITS, PROGRAM_IDS } from "./types.js";
import { PERSON_LEVEL_PROGRAMS } from "./parse.js";

export const CLIFF_MIN = 200;
/** A program counts as "on" above this many dollars a year. */
export const PROGRAM_END_MIN = 100;
// A program is named on a cliff only if its own loss is at least this share of the drop.
const LOSS_SHARE_MIN = 0.2;

/**
 * Where a cliff's drop came from. The four shares sum to `drop` exactly, so a
 * report can attribute every dollar instead of naming a program and leaving
 * the reader to assume it explains the whole fall.
 *
 * Coverage programs are deliberately absent: Medicaid and CHIP carry a sticker
 * value, never cash, and that value is not in netIncome, so it cannot be part
 * of a change in netIncome. A child losing Medicaid is still a real event —
 * it just shows up in `programsLost`, not here.
 */
export interface CliffBreakdown {
  /** Cash programs plus PolicyEngine's untracked benefit remainder. */
  benefits: number;
  /** Refundable credits — federal and state — and the ACA premium subsidy. */
  credits: number;
  /** The rise in what the household pays for health coverage. */
  premiums: number;
  /** Everything else: taxes, and market-income effects. */
  other: number;
}

/**
 * Why a cliff does not arrive with the raise that causes it.
 *
 * Three federal rules carry a household past the income threshold that ends a
 * program, so the money does not change the month the raise lands — it changes
 * at a renewal that can be up to a year away. A cliff carrying one of these is
 * still a real loss and still reported; it just must not drive the verdict,
 * the danger zones, or the leap (see evaluate.ts).
 */
export type DeferralReason =
  | "head_start_program_year"
  | "child_continuous_eligibility"
  | "transitional_medical_assistance";

export interface Deferral {
  reason: DeferralReason;
  /** When the loss actually lands, in the household's own words. */
  until: string;
}

export const DEFERRAL_UNTIL: Record<DeferralReason, string> = {
  // 45 CFR 1302.12(j)(1): a child enrolled in Head Start stays eligible for
  // the remainder of the program year and the one immediately following.
  head_start_program_year: "the end of the next Head Start program year (45 CFR 1302.12(j)(1))",
  // 42 CFR 435.926 and 457.342: 12 months of continuous eligibility for a
  // child in Medicaid or CHIP, regardless of a change in family income.
  child_continuous_eligibility: "the child's next yearly renewal, up to 12 months away (42 CFR 435.926, 457.342)",
  // §1925 of the Social Security Act (42 U.S.C. 1396r-6): a family that loses
  // §1931 Medicaid because of earnings from employment keeps it for 6 months,
  // and a further 6 on a state's extension.
  transitional_medical_assistance: "6 to 12 months of Transitional Medical Assistance run out (§1925 of the Social Security Act, 42 U.S.C. 1396r-6)",
};

export interface Cliff {
  startEarnings: number;
  endEarnings: number;
  drop: number;
  programsLost: ProgramId[];
  breakdown: CliffBreakdown;
  // The breakdown component that explains the most of the drop — so a cliff
  // with no nameable program (an SSDI stop lives in otherBenefits; a premium
  // jump is not a program) still says what it was.
  driver: keyof CliffBreakdown;
  /** Set when nothing this cliff costs is lost in the year of the raise. */
  deferral: Deferral | null;
}
export interface DangerZone {
  startEarnings: number;
  endEarnings: number | null;
  peakNet: number;
}
export type Verdict = "always_up" | "cliff_ahead" | "in_danger_zone" | "cliff_behind";

export interface AnalyzeOptions {
  /**
   * Whether the household has a dependent child. Transitional Medical
   * Assistance continues coverage only for a §1931 family — a household with a
   * dependent child — so a childless adult losing expansion Medicaid loses it
   * on the spot and their cliff is never deferred. Defaults to false: with no
   * household context, nothing is excused.
   */
  hasChildren?: boolean;
  /**
   * Whether an adult-Medicaid loss at these earnings is the ACA adult group's
   * 138%-FPL end rather than a §1931 family loss. Transitional Medical
   * Assistance (§1925 of the Act) continues coverage only after a §1931 loss;
   * an adult leaving the expansion group goes to the marketplace that month.
   * Without it, every adult loss in a household with children is treated as
   * §1931 — wrong in the 41 expansion states, where parents usually leave
   * Medicaid at the adult-group line.
   */
  isAdultGroupLoss?: (earnings: number) => boolean;
}

export interface CurveAnalysis {
  points: CurvePoint[];
  currentEarnings: number;
  currentNet: number;
  cliffs: Cliff[];
  worstCliff: Cliff | null;
  dangerZones: DangerZone[];
  verdict: Verdict;
  nextCliff: Cliff | null;
  escapeEarnings: number | null;
}

function interpolate(points: CurvePoint[], earnings: number): number {
  if (earnings <= points[0].earnings) return points[0].netIncome;
  for (let i = 1; i < points.length; i++) {
    if (earnings <= points[i].earnings) {
      const a = points[i - 1];
      const b = points[i];
      const t = (earnings - a.earnings) / (b.earnings - a.earnings);
      return a.netIncome + t * (b.netIncome - a.netIncome);
    }
  }
  return points[points.length - 1].netIncome;
}

/** The danger zone this income sits inside, or null. */
export function zoneAt(zones: DangerZone[], earnings: number): DangerZone | null {
  return zones.find(
    (z) => earnings > z.startEarnings && (z.endEarnings === null || earnings < z.endEarnings),
  ) ?? null;
}

const total = (p: CurvePoint, ids: ProgramId[]): number =>
  ids.reduce((sum, id) => sum + (p.programs[id] ?? 0), 0);

function breakdownOf(a: CurvePoint, b: CurvePoint, drop: number): CliffBreakdown {
  const benefits = (total(a, CASH_PROGRAMS) + (a.otherBenefits ?? 0)) - (total(b, CASH_PROGRAMS) + (b.otherBenefits ?? 0));
  // State refundable credits count here, not in `other`: they are inside
  // netIncome exactly as the federal ones are (parse.ts). The nonrefundable
  // part of the CTC is deliberately absent — it never reaches netIncome, so a
  // credit turning nonrefundable is a tax effect, and lands in `other`.
  const credits = (total(a, NET_INCOME_CREDITS) + (a.stateCredits ?? 0))
    - (total(b, NET_INCOME_CREDITS) + (b.stateCredits ?? 0));
  const premiums = b.medicalOOP - a.medicalOOP;
  return { benefits, credits, premiums, other: drop - benefits - credits - premiums };
}

/**
 * How much of a program one group of people holds at a point. Adults are the
 * household total less the children's share, because PolicyEngine reports the
 * person-level programs per person and parse.ts keeps the children's sum.
 */
export type ProgramHolder = (p: CurvePoint, id: ProgramId) => number;
export const heldByHousehold: ProgramHolder = (p, id) => p.programs[id] ?? 0;
export const heldByChildren: ProgramHolder = (p, id) => p.childPrograms?.[id] ?? 0;
export const heldByAdults: ProgramHolder = (p, id) => heldByHousehold(p, id) - heldByChildren(p, id);

/** A program switching off, or losing more than half its value, for one group in one step. */
function notches(a: CurvePoint, b: CurvePoint, id: ProgramId, group: ProgramHolder): boolean {
  const before = group(a, id);
  const after = group(b, id);
  return before > PROGRAM_END_MIN && (after <= PROGRAM_END_MIN || after < 0.5 * before);
}

/** …and losing enough of it to explain a real share of this step's drop. */
const notchesMaterially = (a: CurvePoint, b: CurvePoint, id: ProgramId, group: ProgramHolder, drop: number): boolean =>
  notches(a, b, id, group) && group(a, id) - group(b, id) >= LOSS_SHARE_MIN * drop;

/**
 * The deferral rules that fire at this step, with the programs each excuses.
 *
 * Run per person-group, because who loses the coverage decides which rule
 * carries them: a child's Medicaid or CHIP is continuous for 12 months, while
 * a parent's §1931 Medicaid converts to Transitional Medical Assistance — and
 * only if the family has a dependent child, which is what makes it a §1931
 * family in the first place.
 */
function deferralOf(
  a: CurvePoint,
  b: CurvePoint,
  programsLost: ProgramId[],
  hasChildren: boolean,
  isAdultGroupLoss: (earnings: number) => boolean,
): Deferral | null {
  const reasons: DeferralReason[] = [];
  const excused = new Set<ProgramId>();

  if (notches(a, b, "headstart", heldByHousehold)) {
    reasons.push("head_start_program_year");
    excused.add("headstart");
  }
  const childCoverage = COVERAGE_PROGRAMS.filter((id) => notches(a, b, id, heldByChildren));
  if (childCoverage.length > 0) {
    reasons.push("child_continuous_eligibility");
    for (const id of childCoverage) excused.add(id);
  }
  const adultMedicaidEnds = notches(a, b, "medicaid", heldByAdults);
  if (adultMedicaidEnds && hasChildren && !isAdultGroupLoss(a.earnings)) {
    reasons.push("transitional_medical_assistance");
    excused.add("medicaid");
  }
  // Medicaid is only excused when BOTH groups' ends are: a childless adult
  // (or an adult in a household whose children are not the reason) losing it
  // is an immediate loss, whatever the children's continuous eligibility says.
  if (adultMedicaidEnds && !excused.has("medicaid")) excused.delete("medicaid");

  if (reasons.length === 0) return null;
  // Anything named on this cliff that no rule carries forward makes the whole
  // cliff immediate — a household losing SNAP and Head Start in one step feels
  // the SNAP the same month. An EMPTY list of named programs still qualifies:
  // that is the premium-jump case, where the parent's coverage ending is the
  // whole cliff but the sticker value was too small to be named.
  if (programsLost.some((id) => !excused.has(id))) return null;
  // Several rules can fire at once (children age off CHIP in the same step a
  // parent's TMA starts). Report the first in this fixed order; `until` says
  // the horizon either way, and the CLI prints the whole cliff, not the label.
  return { reason: reasons[0], until: DEFERRAL_UNTIL[reasons[0]] };
}

export function analyzeCurve(points: CurvePoint[], currentEarnings: number, opts: AnalyzeOptions = {}): CurveAnalysis {
  if (points.length < 2) throw new Error("need at least 2 curve points");

  const cliffs: Cliff[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const drop = points[i].netIncome - points[i + 1].netIncome;
    // Detection floor. `drop` is measured net of the step's own wage gain, so
    // the real bar is "loses more than it gains, plus CLIFF_MIN": a household
    // keeping ~80 cents of each marginal dollar over a $1,000 step must shed
    // more than ~$800 + $200 before the step registers as a cliff. Because
    // axisSpec widens the step for higher earners, the same cliff can fall
    // below the floor on a wider axis. The thresholds are unchanged on
    // purpose — this is the documentation of what they can and cannot see.
    if (drop > CLIFF_MIN) {
      // A program is "lost" only at a notch: it was meaningfully on, and it
      // either switches off or loses at least half its value in one step.
      // A phase-down (EITC at 15.98%/21.06%, SNAP at 24% or 36%) never
      // qualifies, which is the point — naming it "lost SNAP" told people a
      // program had ended when it had only tapered.
      // …and only when that loss explains a real share of the drop: a SNAP
      // notch worth 3% of a fall that was 105% premium is not why the money
      // fell, and saying "lost SNAP" would be read as if it were.
      // …and tested per person-group for the programs PolicyEngine reports per
      // person, not on the household total alone. A parent losing Medicaid
      // while the children keep theirs leaves the total flat, so the
      // household test could never name it: 94 of the 271 adult Medicaid ends
      // that fall on a cliff step in the 2026-09 sweep went unnamed. The
      // household total stays in the list because two people each holding less
      // than PROGRAM_END_MIN still add up to a loss neither group can see.
      const a = points[i];
      const b = points[i + 1];
      const programsLost = PROGRAM_IDS.filter((id) =>
        (PERSON_LEVEL_PROGRAMS.includes(id) ? [heldByHousehold, heldByAdults, heldByChildren] : [heldByHousehold])
          .some((group) => notchesMaterially(a, b, id, group, drop)),
      );
      const breakdown = breakdownOf(a, b, drop);
      const driver = (Object.keys(breakdown) as (keyof CliffBreakdown)[]).reduce((best, k) =>
        breakdown[k] > breakdown[best] ? k : best,
      );
      cliffs.push({
        startEarnings: a.earnings,
        endEarnings: b.earnings,
        drop,
        programsLost,
        breakdown,
        driver,
        deferral: deferralOf(a, b, programsLost, opts.hasChildren === true, opts.isAdultGroupLoss ?? (() => false)),
      });
    }
  }

  const dangerZones: DangerZone[] = [];
  let peakNet = points[0].netIncome;
  let peakEarnings = points[0].earnings;
  let open: DangerZone | null = null;
  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    if (p.netIncome > peakNet) {
      if (open) {
        open.endEarnings = p.earnings;
        dangerZones.push(open);
        open = null;
      }
      peakNet = p.netIncome;
      peakEarnings = p.earnings;
    } else if (p.netIncome < peakNet - CLIFF_MIN && !open) {
      // Intentional hysteresis: dips smaller than CLIFF_MIN below the running
      // max are noise, not danger zones. A zone opens only once the shortfall
      // exceeds CLIFF_MIN, and is backdated to the peak where the decline began.
      //
      // Opening and closing are deliberately asymmetric. A zone OPENS only
      // after falling more than CLIFF_MIN below the peak, but CLOSES at the
      // first point that merely EXCEEDS the peak, with no margin at all. So a
      // zone's start is conservative and its end is not: a household a dollar
      // above its old peak is called clear, and a raise that lands exactly at
      // the far edge buys back nothing. Unchanged on purpose; said out loud so
      // the safe-exit number is read as the earliest possible exit, not a
      // comfortable one.
      open = { startEarnings: peakEarnings, endEarnings: null, peakNet };
    }
  }
  if (open) dangerZones.push(open);

  const currentNet = interpolate(points, currentEarnings);
  const zone = zoneAt(dangerZones, currentEarnings);
  const nextCliff = cliffs.find((c) => c.startEarnings >= currentEarnings) ?? null;

  // Zone membership is checked before always_up: cumulative erosion can open a
  // danger zone even when no single step exceeds CLIFF_MIN, so a user inside
  // such a zone must never be told "always_up".
  const verdict: Verdict =
    zone ? "in_danger_zone"
    : cliffs.length === 0 ? "always_up"
    : nextCliff ? "cliff_ahead"
    : "cliff_behind";

  const worstCliff = cliffs.length
    ? cliffs.reduce((a, b) => (b.drop > a.drop ? b : a))
    : null;

  return {
    points,
    currentEarnings,
    currentNet,
    cliffs,
    worstCliff,
    dangerZones,
    verdict,
    nextCliff,
    escapeEarnings: zone ? zone.endEarnings : null,
  };
}
