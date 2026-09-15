// One household in, everything HotGap knows about it out. Nothing here is new
// analysis: it is the fixed order the pieces have to run in (curve → cliffs →
// escape → reach → minimum-wage framing) written down once, so a CLI, a worker
// and a test can never disagree about how a household is evaluated.
import { analyzeCurve, type Cliff, type CurveAnalysis } from "./analyze.js";
import { fetchCurve, PolicyEngineError, type FetchCurveOptions } from "./client.js";
import { escapeAnalysis, type EscapeAnalysis } from "./escape.js";
import { clampFallbackEarnings, loadArchetypeCurve } from "./fallback.js";
import { fullTimeEarningsAt, minWageContext, minWageFor } from "./minWage.js";
import { reachForHousehold } from "./reachLookup.js";
import { YEAR, type CurveResponse, type HouseholdAnswers } from "./types.js";

/** Where the curve came from: a live PolicyEngine call, or the committed sweep. */
export type CurveSource = "live" | "archetype";

export interface ReachSummary {
  // Cross-sectional percentiles (0–100) among real households shaped like this
  // one in this state — "how common is this income", never odds of reaching it.
  // null when there is no trustworthy reach cell or the income is not positive.
  safeExit: number | null;
  current: number | null;
}

export interface MinWageSummary {
  wage: number;
  fullTimeEarnings: number;
  /** One entry per analysis.cliffs[i], in the same order. */
  cliffs: { startEarnings: number; hoursPerWeek: number | null }[];
}

export interface HouseholdEvaluation {
  answers: HouseholdAnswers;
  source: CurveSource;
  curve: CurveResponse;
  analysis: CurveAnalysis;
  escape: EscapeAnalysis;
  reach: ReachSummary;
  minWage: MinWageSummary | null;
}

function minWageSummary(state: string, cliffs: Cliff[]): MinWageSummary | null {
  const wage = minWageFor(state);
  if (wage === null) return null;
  return {
    wage,
    fullTimeEarnings: fullTimeEarningsAt(wage),
    // Re-asked per cliff rather than dividing here, so the "past full-time ⇒ no
    // meaningful hours framing" rule stays in minWageContext alone.
    cliffs: cliffs.map((c) => ({
      startEarnings: c.startEarnings,
      hoursPerWeek: minWageContext(state, c.startEarnings)?.hoursPerWeek ?? null,
    })),
  };
}

/** Every derived result for one household against one already-fetched curve. */
export function evaluateCurve(
  answers: HouseholdAnswers,
  curve: CurveResponse,
  source: CurveSource,
): HouseholdEvaluation {
  const analysis = analyzeCurve(curve.points, curve.currentEarnings);
  const escape = escapeAnalysis(curve.points);
  // A zero (or absent) income has no position in an earnings distribution —
  // reporting "0% of households earn less" would read as a finding, not a gap.
  const reachAt = (income: number | null): number | null =>
    income !== null && income > 0
      ? reachForHousehold(answers.state, answers.married, answers.childAges.length, income)
      : null;

  return {
    answers,
    source,
    curve,
    analysis,
    escape,
    reach: { safeExit: reachAt(escape.safeExitEarnings), current: reachAt(curve.currentEarnings) },
    minWage: minWageSummary(answers.state, analysis.cliffs),
  };
}

/**
 * Evaluate against the committed archetype curve instead of PolicyEngine —
 * null when this state × household shape has no swept curve.
 *
 * The archetype curve ignores county, rent, age, disability, and the take-up
 * toggles: it is the honest baseline for "a family shaped like this in this
 * state", not this family's own numbers. Earnings are clamped to the sweep's
 * last sampled point so no verdict claims anything past the data.
 */
export function evaluateOffline(answers: HouseholdAnswers): HouseholdEvaluation | null {
  const points = loadArchetypeCurve(answers.state, answers.married, answers.childAges.length);
  if (!points) return null;
  const curve: CurveResponse = {
    year: YEAR,
    currentEarnings: clampFallbackEarnings(points, answers.annualEarnings),
    points,
  };
  return evaluateCurve(answers, curve, "archetype");
}

export interface EvaluateOptions extends FetchCurveOptions {
  /** Fall back to the archetype curve when PolicyEngine fails. Default true. */
  fallback?: boolean;
}

/** The whole calculation: a live curve when we can get one, the archetype baseline when we can't. */
export async function evaluateHousehold(
  answers: HouseholdAnswers,
  opts: EvaluateOptions = {},
): Promise<HouseholdEvaluation> {
  try {
    return evaluateCurve(answers, await fetchCurve(answers, opts), "live");
  } catch (e) {
    // Only PolicyEngine's own failures earn the fallback. A bug in our analysis
    // must surface as itself rather than be papered over with a baseline curve.
    if (opts.fallback === false || !(e instanceof PolicyEngineError)) throw e;
    const offline = evaluateOffline(answers);
    // Rethrow the ORIGINAL error, not "no archetype": the live failure is the
    // thing the caller has to act on.
    if (!offline) throw e;
    return offline;
  }
}
