import type { CurvePoint, ProgramId } from "./types.js";
import { PROGRAM_IDS } from "./types.js";
import { analyzeCurve } from "./analyze.js";

export const PROGRAM_END_MIN = 100;
export const BENEFITS_END_MIN = 250;

export interface EscapeAnalysis {
  safeExitEarnings: number | null;
  leap: number;
  leapIsLowerBound: boolean;
  programEnds: Partial<Record<ProgramId, number>>;
  benefitsEndEarnings: number | null;
}

export function escapeAnalysis(points: CurvePoint[]): EscapeAnalysis {
  const a = analyzeCurve(points, 0);
  const axisMax = points[points.length - 1].earnings;
  const zones = a.dangerZones;
  const last = zones[zones.length - 1];
  const safeExitEarnings = zones.length === 0 ? 0 : last.endEarnings;

  let leap = 0;
  let leapIsLowerBound = false;
  for (const z of zones) {
    const width = (z.endEarnings ?? axisMax) - z.startEarnings;
    if (width > leap) {
      leap = width;
      leapIsLowerBound = z.endEarnings === null;
    }
  }

  const programEnds: Partial<Record<ProgramId, number>> = {};
  for (const id of PROGRAM_IDS) {
    let lastAbove: number | null = null;
    for (const p of points) if ((p.programs[id] ?? 0) > PROGRAM_END_MIN) lastAbove = p.earnings;
    if (lastAbove !== null && lastAbove < axisMax) programEnds[id] = lastAbove;
  }

  let benefitsEnd: number | null = null;
  for (const p of points) {
    const total = PROGRAM_IDS.reduce((sum, id) => sum + (p.programs[id] ?? 0), 0);
    if (total > BENEFITS_END_MIN) benefitsEnd = p.earnings;
  }

  return {
    safeExitEarnings,
    leap,
    leapIsLowerBound,
    programEnds,
    benefitsEndEarnings: benefitsEnd === axisMax ? null : benefitsEnd,
  };
}
