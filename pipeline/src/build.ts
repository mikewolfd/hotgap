import { ARCHETYPES, YEAR, answersFor, axisSpec, evaluateCurve, type CurvePoint, type ProgramId, type SummaryJson, type StateFileJson, type StateMetrics } from "@hotgap/core";
import { stateMetrics } from "./metrics.js";

// state -> archetype id -> curve points, as accumulated by the run loop.
export type ResultsByStateArchetype = Record<string, Record<string, CurvePoint[]>>;

export interface ValidationGap { state: string; archetypeId: string; reason: string }
export interface ValidationResult { ok: boolean; gaps: ValidationGap[] }


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
      const expected = axisSpec(answersFor(state, a)).count;
      if (points.length !== expected) {
        gaps.push({ state, archetypeId: a.id, reason: `expected ${expected} points, got ${points.length}` });
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
      const evaluation = evaluateCurve(answersFor(state, a), {
        year: YEAR, currentEarnings: 0, points: results[state][a.id],
      }, "archetype");
      summaryStates[state][a.id] = {
        ...stateMetrics(evaluation),
        ...(evaluation.maTafdc ? { maTafdc: evaluation.maTafdc } : {}),
      };
    }
  }
  // A state is flagged when every archetype that pays for care got $0 back.
  const unmodeled = states.filter((state) => {
    const paying = ARCHETYPES.filter((a) => (answersFor(state, a).monthlyChildcare ?? 0) > 0);
    if (paying.length === 0) return false;
    return paying.every((a) => (results[state][a.id] ?? []).every((p) => (p.programs.childcare ?? 0) <= 0));
  });

  return {
    generated,
    year: YEAR,
    ...(unmodeled.length ? { childcareSubsidyUnmodeled: unmodeled } : {}),
    archetypes: ARCHETYPES.map((a) => ({ id: a.id, married: a.married, childAges: a.childAges })),
    states: summaryStates,
  };
}

// Whole dollars are what the sweep stores. runPipeline rounds each curve ONCE
// at ingestion so summary.json and states/*.json derive from identical points,
// and `--from-data` rebuilds the summary as an exact identity.
export function roundPoint(p: CurvePoint): CurvePoint {
  return {
    ...(p.maTafdc ? { maTafdc: p.maTafdc } : {}),
    earnings: p.earnings,
    netIncome: Math.round(p.netIncome),
    medicalOOP: Math.round(p.medicalOOP),
    programs: Object.fromEntries(
      Object.entries(p.programs).map(([id, v]) => [id, Math.round(v)]),
    ) as Record<ProgramId, number>,
    childPrograms: Object.fromEntries(
      Object.entries(p.childPrograms).map(([id, v]) => [id, Math.round(v as number)]),
    ) as Partial<Record<ProgramId, number>>,
    otherBenefits: Math.round(p.otherBenefits),
    stateCredits: Math.round(p.stateCredits ?? 0),
    totalCtc: Math.round(p.totalCtc ?? p.programs.ctc ?? 0),
    // coverageGap is a read-time verdict (evaluate.ts), never a sweep output;
    // storing `false` 66,000 times bought nothing. Loaders default it.
  } as CurvePoint;
}

export function buildStateFile(generated: string, state: string, results: ResultsByStateArchetype): StateFileJson {
  const archetypes: Record<string, { points: CurvePoint[] }> = {};
  for (const a of ARCHETYPES) {
    archetypes[a.id] = { points: results[state][a.id] };
  }
  return { generated, year: YEAR, state, archetypes };
}
