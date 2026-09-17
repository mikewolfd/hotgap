import type { HouseholdEvaluation, StateMetrics } from "@hotgap/core";

/**
 * Summary metrics come from the shared evaluation, so a state's ranking
 * reads the same curve a household sees offline: verdicts from the immediate
 * curve (deferred losses lifted out), the real cliffs counted separately.
 */
export function stateMetrics(ev: HouseholdEvaluation): StateMetrics {
  const { analysis, escape, deferred } = ev;
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
    cliffCount: analysis.cliffs.length - deferred.length,
    deferredCliffCount: deferred.length,
    safeExit: escape.safeExitEarnings,
    leap: escape.leap,
    leapIsLowerBound: escape.leapIsLowerBound,
  };
}
