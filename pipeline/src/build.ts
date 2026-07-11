import { ARCHETYPES, YEAR, type CurvePoint, type ProgramId } from "@hotgap/shared";
import { stateMetrics, type StateMetrics } from "./metrics.js";

// state -> archetype id -> curve points, as accumulated by the run loop.
export type ResultsByStateArchetype = Record<string, Record<string, CurvePoint[]>>;

export interface ValidationGap { state: string; archetypeId: string; reason: string }
export interface ValidationResult { ok: boolean; gaps: ValidationGap[] }

export interface SummaryJson {
  generated: string;
  year: string;
  archetypes: { id: string; married: boolean; childAges: number[] }[];
  states: Record<string, Record<string, StateMetrics>>;
}

export interface StateFileJson {
  generated: string;
  year: string;
  state: string;
  archetypes: Record<string, { points: CurvePoint[] }>;
}

function pointsAreFinite(points: CurvePoint[]): boolean {
  return points.every(
    (p) =>
      Number.isFinite(p.earnings) &&
      Number.isFinite(p.netIncome) &&
      Object.values(p.programs).every((v) => Number.isFinite(v)),
  );
}

export function validateResults(states: string[], results: ResultsByStateArchetype): ValidationResult {
  const gaps: ValidationGap[] = [];
  for (const state of states) {
    for (const a of ARCHETYPES) {
      const points = results[state]?.[a.id];
      if (!points) {
        gaps.push({ state, archetypeId: a.id, reason: "missing" });
        continue;
      }
      if (points.length !== 101) {
        gaps.push({ state, archetypeId: a.id, reason: `expected 101 points, got ${points.length}` });
        continue;
      }
      if (!pointsAreFinite(points)) {
        gaps.push({ state, archetypeId: a.id, reason: "non-finite values in curve data" });
      }
    }
  }
  return { ok: gaps.length === 0, gaps };
}

export function buildSummary(generated: string, states: string[], results: ResultsByStateArchetype): SummaryJson {
  const summaryStates: Record<string, Record<string, StateMetrics>> = {};
  for (const state of states) {
    summaryStates[state] = {};
    for (const a of ARCHETYPES) {
      summaryStates[state][a.id] = stateMetrics(results[state][a.id]);
    }
  }
  return {
    generated,
    year: YEAR,
    archetypes: ARCHETYPES.map((a) => ({ id: a.id, married: a.married, childAges: a.childAges })),
    states: summaryStates,
  };
}

function roundPoint(p: CurvePoint): CurvePoint {
  return {
    earnings: p.earnings,
    netIncome: Math.round(p.netIncome),
    programs: Object.fromEntries(
      Object.entries(p.programs).map(([id, v]) => [id, Math.round(v)]),
    ) as Record<ProgramId, number>,
  };
}

export function buildStateFile(generated: string, state: string, results: ResultsByStateArchetype): StateFileJson {
  const archetypes: Record<string, { points: CurvePoint[] }> = {};
  for (const a of ARCHETYPES) {
    archetypes[a.id] = { points: results[state][a.id].map(roundPoint) };
  }
  return { generated, year: YEAR, state, archetypes };
}
