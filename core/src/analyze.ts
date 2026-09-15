import type { CurvePoint, ProgramId } from "./types.js";
import { CASH_PROGRAMS, NET_INCOME_CREDITS, PROGRAM_IDS } from "./types.js";

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
  /** Refundable credits and the ACA premium subsidy. */
  credits: number;
  /** The rise in what the household pays for health coverage. */
  premiums: number;
  /** Everything else: taxes, and market-income effects. */
  other: number;
}

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
}
export interface DangerZone {
  startEarnings: number;
  endEarnings: number | null;
  peakNet: number;
}
export type Verdict = "always_up" | "cliff_ahead" | "in_danger_zone" | "cliff_behind";

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
  const credits = total(a, NET_INCOME_CREDITS) - total(b, NET_INCOME_CREDITS);
  const premiums = b.medicalOOP - a.medicalOOP;
  return { benefits, credits, premiums, other: drop - benefits - credits - premiums };
}

export function analyzeCurve(points: CurvePoint[], currentEarnings: number): CurveAnalysis {
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
      const programsLost = PROGRAM_IDS.filter((id) => {
        const before = points[i].programs[id] ?? 0;
        const after = points[i + 1].programs[id] ?? 0;
        const notch = before > PROGRAM_END_MIN && (after <= PROGRAM_END_MIN || after < 0.5 * before);
        return notch && before - after >= LOSS_SHARE_MIN * drop;
      });
      const breakdown = breakdownOf(points[i], points[i + 1], drop);
      const driver = (Object.keys(breakdown) as (keyof CliffBreakdown)[]).reduce((best, k) =>
        breakdown[k] > breakdown[best] ? k : best,
      );
      cliffs.push({
        startEarnings: points[i].earnings,
        endEarnings: points[i + 1].earnings,
        drop,
        programsLost,
        breakdown,
        driver,
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
