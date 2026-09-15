import { readData } from "./data.js";
import { pickArchetypeId, type ArchetypeMatch } from "./fallback.js";
import { reachPercentile, type ReachLadder } from "./reach.js";

// Shape of the committed data/reach.json (see scripts/build-reach.mjs and
// docs/reviews/2026-09-14-methodology-validation.md, Appendix D).
//
// THE YARDSTICK: each ladder is HOUSEHOLDER + SPOUSE earnings (ADJINC-adjusted
// PERNP, floored at 0) for households with a householder aged 18–64, in 2026
// dollars. Not total household income, not every member's pay — so the income
// passed in here must be the same householder-plus-spouse earnings figure the
// tool varies on its axis, or the comparison is apples-to-oranges.
//
// A cell is `null` when the PUMS sample cannot support it: the 90% margin of
// error of its median exceeded half the median (the reliability test), or fewer
// than 30 unweighted households fell in it (a floor beneath that test). Callers
// MUST treat null as "no reach line to show", never as "0%".
interface ReachFile {
  year: string;
  basis?: string;
  source: string | Record<string, string>;
  percentiles: number[];
  earningsConcept?: string;
  householderAge?: [number, number];
  suppression?: string;
  growth?: { factor: number; series: string; method: string };
  states: Record<string, Record<string, ReachLadder | null> | undefined>;
}

const reach = (): ReachFile => readData<ReachFile>("reach.json") ?? { year: "", source: "", percentiles: [], states: {} };

/**
 * The whole PUMS cell for `state` × `archetypeId` — ladder, per-point margins
 * of error, sample size and vintage — for callers that need to say how sure the
 * number is. Null on the same terms as reachForArchetype.
 */
export function reachCell(state: string, archetypeId: string): ReachLadder | null {
  return reach().states[state]?.[archetypeId] ?? null;
}

/**
 * Where `income` falls (0-100) among real households of `archetypeId` in
 * `state` -- null when there's no trustworthy PUMS cell for that state x
 * archetype (state not in the file, or a suppressed cell). `income` is
 * householder + spouse earnings, the concept the ladder is built on.
 */
export function reachForArchetype(state: string, archetypeId: string, income: number): number | null {
  const cell = reachCell(state, archetypeId);
  if (!cell) return null;
  return reachPercentile(cell.ladder, income);
}

// Maps household answers -> the reach archetype the SAME way the archetype
// fallback picker does (pickArchetypeId), so the two can never silently
// desync on how kid count clamps, how married/single maps to an archetype id,
// or which side of the one/two-earner split a household falls.
//
// `householdEarnings` is householder + spouse employment earnings -- the two
// adults the tool models -- NOT the whole household's income.
export function reachForHousehold(
  state: string,
  household: ArchetypeMatch,
  householdEarnings: number,
): number | null {
  return reachForArchetype(state, pickArchetypeId(household), householdEarnings);
}
