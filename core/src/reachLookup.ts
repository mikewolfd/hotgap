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
// WHO "FAMILIES LIKE THIS" ARE — the cell, exactly (policy-data review R15).
// A cell is one state × one archetype id, and a PUMS household lands in it on
// four things only:
//   • marital status — a married-couple household (HHT 1) or not; "not" is
//     every other household type, single parents and nonfamily households
//     alike;
//   • the number of the householder's own children under 18 (NOC), with
//     three or more pooled in the 3-child cell;
//   • for a married couple with children, one earner or two (both adults
//     with positive own earnings);
//   • a working-age householder, 18–64.
// NOT on the children's ages: the default household's 3- and 7-year-old are
// compared with every single parent of two children under 18, teenagers
// included. Nor on anyone's hours, disability, other income or county.
// `REACH_CELL_DEFINITION` is that in short, for a page to print.
//
// A cell is `null` when the PUMS sample cannot support it: the 90% margin of
// error of its median exceeded half the median (the reliability test), or fewer
// than 30 unweighted households fell in it (a floor beneath that test). Callers
// MUST treat null as "no reach line to show", never as "0%".
/**
 * What a reach cell matches on, short and in a fixed order — the fallback when
 * reach.json predates its own `cellDefinition`. Keep the two identical
 * (scripts/build-reach.mjs writes the file's).
 */
export const REACH_CELL_DEFINITION =
  "state; married couple or not; own children under 18: 0, 1, 2, 3 or more; couples with children: one earner or two; householder aged 18-64; children's ages not matched";

interface ReachFile {
  year: string;
  basis?: string;
  cellDefinition?: string;
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
 * Where this state's ladders come from, read off the file rather than
 * retyped: the earnings basis, what a cell matches a family on (see the top
 * of this file — the words a page needs to say who "families like yours"
 * are), the PUMS vintage(s) its published cells were built on (the 5-Year
 * file stands in cell by cell where the 1-Year cannot support a state), and
 * the ECI factor that grew them to 2026 dollars.
 */
export function reachProvenance(state: string): { basis: string; cellDefinition: string; vintages: string[]; growthFactor: number } {
  const file = reach();
  const cells = Object.values(file.states[state] ?? {}).filter((c): c is ReachLadder => c !== null);
  return {
    basis: file.basis ?? "",
    cellDefinition: file.cellDefinition ?? REACH_CELL_DEFINITION,
    vintages: [...new Set(cells.map((c) => c.vintage))].sort(),
    growthFactor: file.growth?.factor ?? 1,
  };
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

/**
 * Where a point on this household's earnings AXIS falls among families like
 * it — the one conversion every caller needs and none should repeat.
 *
 * The axis varies the householder's own pay and holds the spouse's fixed
 * (archetypes.ts), while the ladder's yardstick is householder PLUS spouse
 * earnings, so the spouse's pay is added back before the lookup. The "is
 * there any income to place" guard looks at that same combined figure, or a
 * household living on its spouse's wages loses its reach line; a zero income
 * has no position in an earnings distribution, and "0% earn less" would read
 * as a finding rather than a gap.
 *
 * Null when `axisEarnings` is null, when nothing is there to place, or when
 * the PUMS cell is missing or suppressed — never 0.
 */
export function reachAtEarnings(
  household: ArchetypeMatch & { state: string },
  axisEarnings: number | null,
): number | null {
  if (axisEarnings === null) return null;
  const combined = axisEarnings + household.spouseAnnualEarnings;
  return combined > 0 ? reachForHousehold(household.state, household, combined) : null;
}
