import { analyzeCurve, type CurvePoint } from "@hotgap/shared";

export interface StateMetrics { biggestLoss: number; dangerWidth: number; cliffCount: number }

export function stateMetrics(points: CurvePoint[]): StateMetrics {
  const a = analyzeCurve(points, 0);
  const axisMax = points[points.length - 1].earnings;
  return {
    biggestLoss: Math.round(a.worstCliff?.drop ?? 0),
    dangerWidth: Math.round(
      a.dangerZones.reduce((w, z) => w + (z.endEarnings ?? axisMax) - z.startEarnings, 0),
    ),
    cliffCount: a.cliffs.length,
  };
}
