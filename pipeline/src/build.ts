import { isDeepStrictEqual } from "node:util";
import { ARCHETYPES, YEAR, type Archetype, answersFor, axisSpec, evaluateCurve, stateCoverage, type CurvePoint, type ModelRecord, type ProgramId, type StateCoverage, type SummaryJson, type StateFileJson, type StateMetrics } from "@hotgap/core";
import { stateMetrics } from "./metrics.js";

// state -> archetype id -> curve points, as accumulated by the run loop.
export type ResultsByStateArchetype = Record<string, Record<string, CurvePoint[]>>;
// state -> the model that swept it. One sweep has one model; a --from-data
// rebuild reads each state file's own, and they differ after a partial re-sweep.
export type ModelsByState = Partial<Record<string, ModelRecord>>;

/** The one model behind every state, or undefined when a mix of models has no single name. */
export function sharedModel(states: string[], models: ModelsByState): ModelRecord | undefined {
  const first = models[states[0]];
  return first && states.every((s) => isDeepStrictEqual(models[s], first)) ? first : undefined;
}

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

export function validateResults(states: string[], results: ResultsByStateArchetype, archetypes: readonly Archetype[] = ARCHETYPES): ValidationResult {
  const gaps: ValidationGap[] = [];
  for (const state of states) {
    for (const a of archetypes) {
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

/**
 * The archetypes a set of stored results carries: every row of ARCHETYPES that
 * at least one state has a curve for. A `--from-data` rebuild reads the files
 * a past sweep wrote, and a row added to ARCHETYPES since is simply not in
 * them — so the rebuild describes the rows the files hold instead of failing
 * on the one they cannot. (The `-nosub` twin is the exception with a remedy:
 * runFromData derives it from its base row first, twin.ts.) A row SOME
 * states carry and others lack is still a gap, and validateResults reports it.
 */
export function sweptArchetypes(states: string[], results: ResultsByStateArchetype): Archetype[] {
  const found = ARCHETYPES.filter((a) => states.some((st) => results[st]?.[a.id] !== undefined));
  // Nothing read at all is every row missing, which validateResults reports as such.
  return found.length ? found : ARCHETYPES;
}

/**
 * The summary for a set of curves. `derived` names the rows the caller
 * computed from another row's points rather than swept (twin.ts: id → the id
 * it came from); they are evaluated like any other row and marked
 * `derivedFrom` in the archetype list, so a page can say how the row was made.
 */
export function buildSummary(generated: string, states: string[], results: ResultsByStateArchetype, models: ModelsByState = {}, archetypes: readonly Archetype[] = ARCHETYPES, derived: Readonly<Record<string, string>> = {}): SummaryJson {
  const model = sharedModel(states, models);
  const summaryStates: Record<string, Record<string, StateMetrics>> = {};
  for (const state of states) {
    summaryStates[state] = {};
    for (const a of archetypes) {
      const evaluation = evaluateCurve(answersFor(state, a), {
        year: YEAR, currentEarnings: 0, points: results[state][a.id],
      }, "archetype");
      summaryStates[state][a.id] = {
        ...stateMetrics(evaluation),
        ...(evaluation.maTafdc ? { maTafdc: evaluation.maTafdc } : {}),
      };
    }
  }
  // Judged on the archetypes that actually buy care — a single parent, or a
  // two-earner couple. Every one of them qualifies for the subsidy somewhere on
  // its curve in every state, so a curve that is zero throughout can only mean
  // the engine could not compute it. The SINGLE-earner married archetypes
  // cannot be used for this: their spouse has no earnings, and the subsidy's
  // activity test requires every parent to be working, so their $0 is correct
  // policy rather than a gap (verified live 2026-09-15 — Delaware pays a
  // married couple $13,260 once the spouse works and $0 when they do not).
  // The test is the childcare bill rather than married/single, because
  // "married" stopped meaning "a parent is home" the day married-dual-* was
  // added. Partial coverage across household shapes still counts: Massachusetts
  // pays a household with an infant and nothing to one whose only child is a
  // preschooler, because the provider type defaults to a school-age rate.
  // A `-nosub` twin pays for care and claims no subsidy BY DESIGN, so its $0
  // is the question it asks, not a gap: it is left out of the test.
  const unmodeled = states.filter((state) => {
    const buysCare = archetypes.filter((a) => a.subsidy !== false && (answersFor(state, a).monthlyChildcare ?? 0) > 0);
    return buysCare.some((a) => (results[state][a.id] ?? []).every((p) => (p.programs.childcare ?? 0) <= 0));
  });

  // Derived last, from the same curves and the tables that shaped them, so
  // it describes this sweep and not a hand-kept idea of it (coverage.ts).
  const coverage: Record<string, StateCoverage> = {};
  for (const state of states) coverage[state] = stateCoverage(state, results[state], { model: models[state], childcareSubsidyUnmodeled: unmodeled });

  return {
    generated,
    year: YEAR,
    ...(model ? { model } : {}),
    ...(unmodeled.length ? { childcareSubsidyUnmodeled: unmodeled } : {}),
    archetypes: archetypes.map((a) => ({ id: a.id, married: a.married, childAges: a.childAges, ...(derived[a.id] ? { derivedFrom: derived[a.id] } : {}) })),
    states: summaryStates,
    coverage,
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
    // The state's modeled premium assistance, only where the endpoint served it (statePremiumAssistance.ts).
    ...(p.statePremiumAssistance !== undefined ? { statePremiumAssistance: Math.round(p.statePremiumAssistance) } : {}),
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

export function buildStateFile(generated: string, state: string, results: ResultsByStateArchetype, model?: ModelRecord): StateFileJson {
  const archetypes = Object.fromEntries(ARCHETYPES.map((a) => [a.id, { points: results[state][a.id] }]));
  return { generated, year: YEAR, state, ...(model ? { model } : {}), archetypes };
}
