// The road out of poverty, and what a family keeps walking it.
//
// Every headline HotGap had until now — the biggest loss, the leap, the safe
// exit — is an absolute dollar figure measured over the WHOLE earnings axis,
// so it names the tallest wall wherever it stands. Measured on the committed
// sweep on 2026-09-18, that wall sits above the 75th percentile of families
// like the household in 22 of 50 states, and above the median in 39: mostly
// the child-care subsidy ending at 85% of state median income, or the
// marketplace credit ending at 400% of poverty. Maryland's map figure was
// $33,587 at $97,000; the worst cliff where its families actually are was
// $913 at $54,000. Those are true facts about the rules and they stay. They
// are not an answer to "what happens to a family climbing out of poverty".
//
// This module is that answer, in the field's own terms:
//
//   Effective marginal tax rate (EMTR) — of each extra dollar earned, the
//   share taken back by taxes and lost benefits. A cliff is an EMTR above
//   100%. The Atlanta Fed's CLIFF tool, CBO and the benefits-cliff
//   literature all report it.
//
//   KEEP RATE = 1 - EMTR, over a range: (net(hi) - net(lo)) / (hi - lo).
//   Stated in cents per extra dollar because that is how a person hears it.
//   A page multiplies by 100; core keeps dollars per dollar.
//
//   THE ROAD = 100% to 200% of the 2025 federal poverty guideline for this
//   household's size (policyYear.ts `fpl2025`, the vintage the 2026 policy
//   year runs on), in FAMILY earnings, snapped to the sweep's own step.
//   FAMILY, because every program limit on it is tested against the
//   family's pay: the axis is the householder's own pay with a working
//   spouse's held fixed (archetypes.ts), so the road on the axis starts at
//   the guideline LESS the spouse's pay. Until 2026-09-26 it did not, and the
//   two-earner rows' "poverty line to twice it" was 147% to 253% of their
//   poverty line (policy-data review R4). FEDERAL on purpose, so
//   every state's road is the same road. The alternative — each state's
//   minimum wage to its own median — was measured first and rejected: it
//   makes the poorest states look kindest, because a $7.25 floor and a
//   $30,000 median describe a road too short and too low to cross a cliff.
//   Where a state's own families sit on the fixed road is reported
//   separately, as `familiesBelowHi` and `Cliff.position`.
//
// A low keep rate on this road IS regressivity toward the families the tool
// exists for. It is one measure with a definition, not a composite: the six
// whole-axis measures stay exactly as they are (design/README.md forbids
// collapsing them into a score).
import type { Cliff, CurveAnalysis } from "./analyze.js";
import { pointAtOrBelow } from "./analyze.js";
import { fpl2025 } from "./policyYear.js";
import { reachAtEarnings } from "./reachLookup.js";
import { householdSize, type CurvePoint, type HouseholdAnswers } from "./types.js";

/** What the road needs to know of a household: its guideline, and the pay beside the axis that counts toward it. */
export type RoadHousehold = Pick<HouseholdAnswers, "state" | "married" | "childAges" | "spouseAnnualEarnings">;

/** The road runs from this multiple of the poverty guideline… */
export const ROAD_FROM = 1;
/** …to this one. Poverty to twice poverty. */
export const ROAD_TO = 2;
/** How far ahead `keepNext` looks from where a household stands. */
export const KEEP_NEXT_OVER = 10_000;

/**
 * The road's span on this household's axis: the earnings it runs from, the
 * start of its LAST step, and the earnings it runs to (`hiStart` + one step).
 *
 * GRID RESOLUTION, and why the top carries an allowance. A program's income
 * limit is a dollar figure; the curve is sampled every `step`, so a limit can
 * only be placed at the nearest sampled point, and a limit sitting ON the
 * 200%-of-poverty line lands in the step STARTING at the first point at or
 * above the line. SNAP's broad-based categorical eligibility is the common
 * case: its limit is tested against a fiscal-year-blended poverty figure a
 * little above the calendar guideline, so for a family of three (2 × $26,650
 * = $53,300) the cliff is the step out of $54,000, not out of $53,000.
 *
 * A road that ended at the nearest point to twice poverty therefore excluded,
 * by construction and in every BBCE state, the most common cliff at the top
 * of the road — the measure could not see the thing it exists to measure. So
 * the road's last step is the one starting at `hiStart`, the first sampled
 * point at or above twice poverty, and the span runs to `hi = hiStart + step`
 * so that step's whole drop is inside the keep rate. The cliffs counted and
 * the rate measured are then the same stretch of curve, which is the property
 * that has to hold: `cliffsBetween(cliffs, lo, hi)` is exactly the steps
 * starting in `[lo, hiStart]`.
 *
 * The low end is the nearest sampled point to the guideline itself: no
 * equivalent allowance is owed there, because the road's first step is inside
 * the span either way.
 *
 * All three are points of the AXIS — the householder's own pay. For a
 * two-earner household that is the family's guideline less the spouse's pay
 * (`povertyRoad`), so `lo` is where the FAMILY reaches the poverty line.
 */
export interface Road {
  lo: number;
  /** The start of the road's last step: the first sampled point at or above twice poverty. */
  hiStart: number;
  /** The top of the measured span, one step past `hiStart`. */
  hi: number;
}

export interface RoadSummary extends Road {
  /**
   * Dollars kept per extra dollar earned over the whole road: 0.30 means the
   * family keeps 30 cents of each extra dollar, -0.63 means it ends up 63
   * cents poorer for each one. Null only when an end of the road is not a
   * sampled point of this curve.
   */
  keepRate: number | null;
  /**
   * The same slope measured to `hiStart` — exactly the first sampled point at
   * or above twice poverty — instead of one step past it. It is the road
   * WITHOUT its one-step allowance, so an exit sitting on the 200% line (a
   * child-care subsidy or SNAP limit at twice poverty) falls outside it. The
   * pair is the boundary sensitivity a reader needs: a state negative on
   * `keepRate` and positive here is negative by one step at the line, not
   * across the road. Null in the same case `keepRate` is.
   */
  keepRateToLine: number | null;
  /**
   * The level beside the slope: net income (help and tax credits counted,
   * taxes, premiums and the family's own child-care bill out) at `lo` and at `hi`, read off the points as
   * `keepRate` is. A keep rate says raises add up, not how much the family
   * has; these say how much. Null when that end is not a sampled point.
   */
  netAtLo: number | null;
  netAtHi: number | null;
  /** Every cliff whose step STARTS on the road — `[lo, hiStart]` inclusive — in earnings order. */
  cliffs: Cliff[];
  /** The largest of them — where the road collapses — or null when it holds. */
  worst: Cliff | null;
  /** Share (0–100) of families like this in the state earning less than the top of the road; null where the reach ladder has no cell. */
  familiesBelowHi: number | null;
}

/** The keep rate over the next stretch of earnings: `over` dollars of it, `kept` dollars kept per dollar. */
export interface KeepNext {
  over: number;
  kept: number;
}

/**
 * How a keep rate is said: the sign word every road sentence selects on
 * (`messages/*.json` `road.sentence`, `road.rate`) and the cents a person
 * hears, which is always positive because the sign word carries the sign.
 *
 * Here rather than on each surface so the journalist map, the citizen answer
 * and the caseworker sheet cannot round or word the same rate three ways.
 * Zero keeps nothing and loses nothing: it says "keeps 0¢", which is true and
 * reads as the plateau it is.
 */
export const keepRateWords = (rate: number): { sign: "keeps" | "loses"; cents: number } =>
  ({ sign: rate < 0 ? "loses" : "keeps", cents: Math.abs(Math.round(rate * 100)) });

/** The sweep's own step, read off the curve rather than recomputed from the answers. */
const stepOf = (points: CurvePoint[]): number => points[1].earnings - points[0].earnings;

/** The net income at exactly this earnings, or null when the axis has no point there. */
function netAt(points: CurvePoint[], earnings: number): number | null {
  for (const p of points) if (p.earnings === earnings) return p.netIncome;
  return null;
}

/**
 * This household's road out of poverty on this curve's axis, snapped to the
 * sweep's step (see `Road` for what the top's one-step allowance is for) —
 * null when the top runs off the axis, which is what a short axis or a very
 * large household gives. Alaska and Hawaii are on their own guideline
 * ladders (`fpl2025`), so their road is longer, as their poverty line is.
 *
 * The guideline is a FAMILY-earnings line and the axis is the householder's
 * own pay, so a spouse's pay (held fixed along the axis) comes off both ends:
 * a two-earner couple of four with the spouse at $15,080 is at its poverty
 * line ($32,150) when the householder earns $17,070, not $32,150. Where the
 * spouse's pay alone clears the line, the road starts at the axis's first
 * point — the family is already on it at $0 of the householder's pay.
 */
export function povertyRoad(household: RoadHousehold, points: CurvePoint[]): Road | null {
  if (points.length < 2) return null;
  const step = stepOf(points);
  if (!(step > 0)) return null;
  const line = fpl2025(household.state, householdSize(household));
  const besideAxis = household.married ? household.spouseAnnualEarnings : 0;
  const first = points[0].earnings;
  const last = points[points.length - 1].earnings;
  const lo = Math.max(first, Math.round((ROAD_FROM * line - besideAxis) / step) * step);
  const hiStart = Math.max(first, Math.ceil((ROAD_TO * line - besideAxis) / step) * step);
  const hi = hiStart + step;
  return hi <= last && hi > lo ? { lo, hiStart, hi } : null;
}

/**
 * Dollars kept per extra dollar earned between two points of the axis — the
 * slope of the money line, which is 1 minus the effective marginal tax rate.
 * Null when either end is not a sampled point (an irregular axis), rather
 * than an interpolated figure no point of the curve stands behind.
 */
export function keepRate(points: CurvePoint[], lo: number, hi: number): number | null {
  if (hi <= lo) return null;
  const netLo = netAt(points, lo);
  const netHi = netAt(points, hi);
  return netLo === null || netHi === null ? null : (netHi - netLo) / (hi - lo);
}

/**
 * The cliffs whose step starts on [lo, hi) — the ones a family walking that
 * stretch actually meets. Half-open at the top because a cliff starting AT
 * `hi` drops outside the span, so its loss is not in the keep rate either:
 * the set of cliffs and the rate always describe the same stretch of curve.
 * On the road that means `[lo, hiStart]` inclusive, `hi` being one step past
 * `hiStart`.
 */
export const cliffsBetween = (cliffs: Cliff[], lo: number, hi: number): Cliff[] =>
  cliffs.filter((c) => c.startEarnings >= lo && c.startEarnings < hi);

/**
 * Everything the road says about one evaluated curve, in one O(points) pass.
 * Null when the road runs off the axis.
 */
export function roadSummary(analysis: CurveAnalysis, answers: HouseholdAnswers): RoadSummary | null {
  const road = povertyRoad(answers, analysis.points);
  if (road === null) return null;
  const cliffs = cliffsBetween(analysis.cliffs, road.lo, road.hi);
  return {
    ...road,
    keepRate: keepRate(analysis.points, road.lo, road.hi),
    keepRateToLine: keepRate(analysis.points, road.lo, road.hiStart),
    netAtLo: netAt(analysis.points, road.lo),
    netAtHi: netAt(analysis.points, road.hi),
    cliffs,
    worst: cliffs.reduce<Cliff | null>((worst, c) => (worst === null || c.drop > worst.drop ? c : worst), null),
    familiesBelowHi: reachAtEarnings(answers, road.hi),
  };
}

/**
 * The keep rate over the next stretch from where a household stands: the next
 * $10,000 of earnings, or whatever is left of the axis when that is less.
 *
 * Measured from the last sampled point at or below `currentEarnings` — the
 * point whose figures already sit in the curve, the same rule every other
 * "at this household's own pay" reading uses — to a whole number of steps
 * above it. Null when fewer than one step of axis remains.
 */
export function keepNext(points: CurvePoint[], currentEarnings: number): KeepNext | null {
  if (points.length < 2) return null;
  const step = stepOf(points);
  if (!(step > 0)) return null;
  const from = pointAtOrBelow(points, currentEarnings).earnings;
  const top = points[points.length - 1].earnings;
  const over = Math.floor(Math.min(KEEP_NEXT_OVER, top - from) / step) * step;
  if (over < step) return null;
  const kept = keepRate(points, from, from + over);
  return kept === null ? null : { over, kept };
}
