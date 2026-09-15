import { analyzeCurve, escapeAnalysis, type CurvePoint, type StateMetrics } from "@hotgap/core";

export function stateMetrics(points: CurvePoint[]): StateMetrics {
  const a = analyzeCurve(points, 0);
  const axisMax = points[points.length - 1].earnings;
  const esc = escapeAnalysis(points);
  return {
    biggestLoss: Math.round(a.worstCliff?.drop ?? 0),
    dangerWidth: Math.round(
      a.dangerZones.reduce((w, z) => w + (z.endEarnings ?? axisMax) - z.startEarnings, 0),
    ),
    cliffCount: a.cliffs.length,
    safeExit: esc.safeExitEarnings,
    leap: esc.leap,
    leapIsLowerBound: esc.leapIsLowerBound,
  };
}
