import { fpl2025, householdSize, keepRate, type CurvePoint, type HouseholdEvaluation, type RoadSummary, type StateMetrics } from "@hotgap/core";

/** A keep rate as the file stores it: four decimals, a hundredth of the cent the page prints. */
const rate4 = (r: number | null): number | null => (r === null ? null : Math.round(r * 10_000) / 10_000);

/** The band top's multiple of the poverty guideline (R3), in tenths so 220% of a whole-dollar guideline is exact: the road's own top is twice it. */
export const WIDE_TO_TENTHS = 22;
/** How far past the road's top `pastRoadWorst` looks (R3 (c)). */
export const PAST_ROAD = 5_000;

/**
 * The road's second top (policy-data review R3, 2026-09-26): the sampled
 * point as many steps past the road's last step (`hiStart`) as the first point
 * at or above 220% of the guideline is past the first at or above 200%. On a
 * road measured on the householder's own pay that is exactly the first point
 * at or above 220%; counted in steps from `hiStart`, it moves with the road
 * wherever core puts the road's origin (road.ts), so the two tops can never
 * describe different climbs. Null when it runs off the axis.
 */
export function wideTop(points: CurvePoint[], road: Pick<RoadSummary, "hiStart">, fpl: number): number | null {
  const step = points[1].earnings - points[0].earnings;
  const top = road.hiStart + (Math.ceil((WIDE_TO_TENTHS * fpl) / 10 / step) - Math.ceil((2 * fpl) / step)) * step;
  return top <= points[points.length - 1].earnings ? top : null;
}

/**
 * The deepest fall on the road (R3 (b)): net income at `lo` less the lowest
 * net income on `[lo, hi]`, 0 where the family never dips below its start.
 * Unlike the keep rate it does not depend on where the road stops, so a wall
 * one step either side of the top reads the same. Null without a point at `lo`.
 */
export function deepestFall(points: CurvePoint[], lo: number, hi: number): number | null {
  const start = points.find((p) => p.earnings === lo);
  if (!start) return null;
  let min = start.netIncome;
  for (const p of points) if (p.earnings >= lo && p.earnings <= hi && p.netIncome < min) min = p.netIncome;
  return Math.round(start.netIncome - min);
}

/** Percentiles are stored to a tenth: enough for "87 in 100", without 17 digits of float in every cell. */
const position = (p: number | null): number | null => (p === null ? null : Math.round(p * 10) / 10);

/**
 * Summary metrics come from the shared evaluation, so a state's ranking
 * reads the same curve a household sees offline: every cliff counts, and
 * the ones a federal rule defers to a later renewal are counted again in
 * `deferredCliffCount`, as a label (evaluate.ts, 2026-09-17).
 */
export function stateMetrics(ev: HouseholdEvaluation): StateMetrics {
  const { analysis, escape, deferred, road } = ev;
  const points = analysis.points;
  const axisMax = points[points.length - 1].earnings;
  const wide = road ? wideTop(points, road, fpl2025(ev.answers.state, householdSize(ev.answers))) : null;
  /* The largest cliff just past the road's top, where a wall one step outside
     the span is invisible to the keep rate (R3 (c): Minnesota's $27,483 at
     $56,000, one step past a road that ends at $55,000). */
  const past = road ? analysis.cliffs
    .filter((c) => c.startEarnings >= road.hi && c.startEarnings < road.hi + PAST_ROAD)
    .reduce<(typeof analysis.cliffs)[number] | null>((w, c) => (w === null || c.drop > w.drop ? c : w), null) : null;
  return {
    biggestLoss: Math.round(analysis.worstCliff?.drop ?? 0),
    // The worst step's own facts travel with its figure (places review B3).
    biggestLossAt: analysis.worstCliff?.startEarnings ?? null,
    biggestLossPrograms: analysis.worstCliff?.programsLost ?? [],
    dangerWidth: Math.round(
      analysis.dangerZones.reduce((w, z) => w + (z.endEarnings ?? axisMax) - z.startEarnings, 0),
    ),
    cliffCount: analysis.cliffs.length,
    deferredCliffCount: deferred.length,
    safeExit: escape.safeExitEarnings,
    leap: escape.leap,
    leapIsLowerBound: escape.leapIsLowerBound,
    axisTop: axisMax,
    // The road out of poverty, read off the same evaluation (road.ts): what a
    // family climbing from the poverty line to twice it keeps of each extra
    // dollar, and where that road collapses. A cent is the display unit, so
    // four decimals is a hundredth of one and the cell stays readable.
    keepRate: rate4(road?.keepRate ?? null),
    // The same slope to exactly twice poverty, without the road's one-step
    // allowance (road.ts): the boundary sensitivity of the figure above.
    keepRateToLine: rate4(road?.keepRateToLine ?? null),
    // The level beside that slope (road.ts): what the family has, in whole
    // dollars, at each end of the road. A keep rate alone cannot say it.
    netAtRoadLo: road?.netAtLo == null ? null : Math.round(road.netAtLo),
    netAtRoadHi: road?.netAtHi == null ? null : Math.round(road.netAtHi),
    roadLo: road?.lo ?? null,
    roadHi: road?.hi ?? null,
    roadCliffCount: road?.cliffs.length ?? 0,
    roadWorst: road?.worst ? { drop: Math.round(road.worst.drop), at: road.worst.startEarnings, programs: road.worst.programsLost } : null,
    // …and who is standing at the whole-axis worst step, so the table can say
    // "$33,587 at $97,000 — 80 in 100 families like this earn less" instead of
    // leaving a reader to assume the biggest number is the one that bites.
    biggestLossPosition: position(analysis.worstCliff?.position ?? null),
    // R3, the road de-knife-edged: the keep rate to 220% of the guideline
    // beside the one to 200%, the deepest fall (which has no top to sit on),
    // and the largest cliff just past the top. All read off the same points.
    keepRateWide: road && wide !== null ? rate4(keepRate(points, road.lo, wide)) : null,
    roadWideHi: wide,
    deepestFall: road ? deepestFall(points, road.lo, road.hi) : null,
    pastRoadWorst: past ? { drop: Math.round(past.drop), at: past.startEarnings, programs: past.programsLost } : null,
    // The level's composition (M3): how much of `netAtRoadLo` is child-care
    // help paid to a provider, so the page can say it beside the figure.
    childcareAtRoadLo: road ? Math.round(points.find((p) => p.earnings === road.lo)?.programs.childcare ?? 0) : null,
  };
}
