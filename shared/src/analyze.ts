import type { CurvePoint, ProgramId } from "./types.js";
import { PROGRAM_IDS } from "./types.js";

export const CLIFF_MIN = 200;
const PROGRAM_LOSS_MIN = 100;

export interface Cliff {
  startEarnings: number;
  endEarnings: number;
  drop: number;
  programsLost: ProgramId[];
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

export function analyzeCurve(points: CurvePoint[], currentEarnings: number): CurveAnalysis {
  if (points.length < 2) throw new Error("need at least 2 curve points");

  const cliffs: Cliff[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const drop = points[i].netIncome - points[i + 1].netIncome;
    if (drop > CLIFF_MIN) {
      const programsLost = PROGRAM_IDS.filter(
        (id) => (points[i].programs[id] ?? 0) - (points[i + 1].programs[id] ?? 0) > PROGRAM_LOSS_MIN,
      );
      cliffs.push({
        startEarnings: points[i].earnings,
        endEarnings: points[i + 1].earnings,
        drop,
        programsLost,
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
      open = { startEarnings: peakEarnings, endEarnings: null, peakNet };
    }
  }
  if (open) dangerZones.push(open);

  const currentNet = interpolate(points, currentEarnings);
  const zone = dangerZones.find(
    (z) => currentEarnings > z.startEarnings && (z.endEarnings === null || currentEarnings < z.endEarnings),
  );
  const nextCliff = cliffs.find((c) => c.startEarnings >= currentEarnings) ?? null;

  const verdict: Verdict =
    cliffs.length === 0 ? "always_up"
    : zone ? "in_danger_zone"
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
