import type { HouseholdEvaluation, StateMetrics } from "@hotgap/core";

/**
 * Summary metrics come from the shared evaluation, so a state's ranking
 * reads the same curve a household sees offline: every cliff counts, and
 * the ones a federal rule defers to a later renewal are counted again in
 * `deferredCliffCount`, as a label (evaluate.ts, 2026-09-17).
 */
/** Percentiles are stored to a tenth: enough for "87 in 100", without 17 digits of float in every cell. */
const position = (p: number | null): number | null => (p === null ? null : Math.round(p * 10) / 10);

export function stateMetrics(ev: HouseholdEvaluation): StateMetrics {
  const { analysis, escape, deferred, road } = ev;
  const points = analysis.points;
  const axisMax = points[points.length - 1].earnings;
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
    keepRate: road?.keepRate == null ? null : Math.round(road.keepRate * 10_000) / 10_000,
    // The same slope to exactly twice poverty, without the road's one-step
    // allowance (road.ts): the boundary sensitivity of the figure above.
    keepRateToLine: road?.keepRateToLine == null ? null : Math.round(road.keepRateToLine * 10_000) / 10_000,
    roadLo: road?.lo ?? null,
    roadHi: road?.hi ?? null,
    roadCliffCount: road?.cliffs.length ?? 0,
    roadWorst: road?.worst ? { drop: Math.round(road.worst.drop), at: road.worst.startEarnings, programs: road.worst.programsLost } : null,
    // …and who is standing at the whole-axis worst step, so the table can say
    // "$33,587 at $97,000 — 80 in 100 families like this earn less" instead of
    // leaving a reader to assume the biggest number is the one that bites.
    biggestLossPosition: position(analysis.worstCliff?.position ?? null),
  };
}
