import { ARCHETYPES, DEFAULT_ARCHETYPE } from "./archetypes.js";
import type { StateFileJson } from "./data.js";
import type { CurvePoint, HouseholdAnswers } from "./types.js";

// The most kids any pipeline archetype models — households with more kids
// fall back to this archetype's curve as the closest available comparison.
const MAX_ARCHETYPE_KIDS = Math.max(...ARCHETYPES.map((a) => a.childAges.length));

/**
 * The three things an archetype is picked by. `HouseholdAnswers` satisfies it
 * structurally, so every real caller passes the household it already has
 * rather than unpacking it into positional arguments — which is how a fourth
 * dimension (the second earner) could be added without every call site
 * silently keeping the old answer.
 */
export type ArchetypeMatch = Pick<HouseholdAnswers, "married" | "childAges" | "spouseAnnualEarnings">;

/**
 * Picks the sweep archetype closest to a real household, by married status,
 * kid count and whether a second adult earns.
 *
 * DUAL-EARNER means a married household whose SPOUSE reports any earnings at
 * all. Not "both adults earn": the axis is the householder's own pay and it
 * starts at $0, so a couple where only the spouse currently earns is still
 * standing at the bottom of the dual-earner curve — which at least has their
 * second income in it — rather than on a married-* curve that models a spouse
 * with no earnings whatsoever. The threshold is above zero, not a full-time
 * floor, because a household reporting a spouse's pay is telling us there is a
 * second earner; judging how much of one is not this function's job.
 *
 * Kid count clamps to the largest archetype the pipeline builds (3+ kids -> the
 * 3-kid curve). Resolved against ARCHETYPES (the same list the pipeline sweeps)
 * rather than re-deriving the id format here, so a reshape of that list can
 * never silently desync this picker.
 */
export function pickArchetypeId(h: ArchetypeMatch): string {
  const kids = Math.min(h.childAges.length, MAX_ARCHETYPE_KIDS);
  const dual = h.married && h.spouseAnnualEarnings > 0;
  const shaped = ARCHETYPES.filter((a) => a.married === h.married && a.childAges.length === kids);
  // A dual-earner couple with NO children falls to the single-earner row on
  // purpose: married-dual-0 does not exist, because what the dual rows add is
  // the childcare dimension and a childless couple has none. DEFAULT_ARCHETYPE
  // is the defensive last resort for an unmatched combination (unreachable
  // today: both married values × 0..MAX kids exist).
  const match = shaped.find((a) => a.spouseWorks === dual) ?? shaped.find((a) => !a.spouseWorks);
  return match?.id ?? DEFAULT_ARCHETYPE;
}

/**
 * The matching archetype's curve out of a state file — the precomputed curve
 * used when a live PolicyEngine call fails. Archetype curves ignore county,
 * rent, age, disability, and take-up toggles — they are the honest baseline
 * for "a family shaped like this in this state".
 *
 * Null when the file is missing or the sweep has no curve for the matched
 * archetype (or a degenerate one), which is what a dual-earner household gets
 * until the next sweep runs. Substituting the single-earner twin's curve would
 * be worse than no answer: it models a spouse with no pay and no childcare
 * bill, so it would show this household a cliff pattern that is not theirs
 * and label it their own baseline.
 */
export function archetypeCurveFrom(file: StateFileJson | null, h: ArchetypeMatch): CurvePoint[] | null {
  const points = file?.archetypes?.[pickArchetypeId(h)]?.points;
  return points && points.length >= 2 ? points : null;
}

// Archetype curves are only sampled up to the pipeline's axis (axisSpec's
// household-size floor, which archetypes always sit at since their own
// annualEarnings is 0). A real household on the fallback path can earn more.
// Feeding analyzeCurve an earnings value beyond the last sampled point would
// let a danger-zone verdict claim "stuck" beyond data the sweep never checked,
// so clamp to the last sampled point first.
export function clampFallbackEarnings(points: CurvePoint[], annualEarnings: number): number {
  return Math.min(annualEarnings, points[points.length - 1].earnings);
}
