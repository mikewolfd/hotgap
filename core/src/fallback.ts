import { ARCHETYPES, DEFAULT_ARCHETYPE } from "./archetypes.js";
import { loadStateFile, type StateFileJson } from "./data.js";
import type { CurvePoint } from "./types.js";

// The most kids any pipeline archetype models — households with more kids
// fall back to this archetype's curve as the closest available comparison.
const MAX_ARCHETYPE_KIDS = Math.max(...ARCHETYPES.map((a) => a.childAges.length));

// Picks the sweep archetype closest to a real household by married status and
// kid count, clamping kid count to the largest archetype the pipeline builds
// (3+ kids -> the 3-kid curve). Resolved against ARCHETYPES (the same list the
// pipeline sweeps) rather than re-deriving the "(single|married)-N" id format
// here, so a reshape of that list can never silently desync this picker;
// DEFAULT_ARCHETYPE is the defensive last resort for an unmatched combination
// (unreachable today: both married values × 0..MAX kids exist).
export function pickArchetypeId(married: boolean, kidCount: number): string {
  const kids = Math.min(kidCount, MAX_ARCHETYPE_KIDS);
  const match = ARCHETYPES.find((a) => a.married === married && a.childAges.length === kids);
  return match?.id ?? DEFAULT_ARCHETYPE;
}

/** The matching archetype's curve out of a state file; null when absent or degenerate. */
export function archetypeCurveFrom(file: StateFileJson | null, married: boolean, kidCount: number): CurvePoint[] | null {
  const points = file?.archetypes?.[pickArchetypeId(married, kidCount)]?.points;
  return points && points.length >= 2 ? points : null;
}

/**
 * The precomputed archetype curve used when a live PolicyEngine call fails.
 * Archetype curves ignore county, rent, age, disability, and take-up toggles —
 * they are the honest baseline for "a family shaped like this in this state".
 */
export function loadArchetypeCurve(state: string, married: boolean, kidCount: number): CurvePoint[] | null {
  return archetypeCurveFrom(loadStateFile(state), married, kidCount);
}

// Archetype curves are only sampled up to the pipeline's axis (a $100k floor —
// see translate.ts's axisMax, which archetypes always hit since their own
// annualEarnings is 0). A real household on the fallback path can earn more.
// Feeding analyzeCurve an earnings value beyond the last sampled point would
// let a danger-zone verdict claim "stuck" beyond data the sweep never checked,
// so clamp to the last sampled point first.
export function clampFallbackEarnings(points: CurvePoint[], annualEarnings: number): number {
  return Math.min(annualEarnings, points[points.length - 1].earnings);
}
