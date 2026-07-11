import { reachPercentile, type ReachLadder } from "@hotgap/shared";
import rawReach from "../data/reach.json";
import { pickArchetypeId } from "./fallback.js";

// Shape of the committed app/src/data/reach.json (see scripts/build-reach.mjs
// and docs/superpowers/plans/2026-07-11-hotgap-reach-metric.md). A cell is
// `null` when the underlying PUMS sample for that state x archetype was too
// small to trust (the builder's <30-unweighted-household guard) -- callers
// MUST treat null as "no reach line to show", never as "0%".
interface ReachFile {
  year: string;
  source: string;
  percentiles: number[];
  states: Record<string, Record<string, ReachLadder | null> | undefined>;
}

const reach = rawReach as unknown as ReachFile;

/**
 * Where `income` falls (0-100) among real households of `archetypeId` in
 * `state` -- null when there's no trustworthy PUMS cell for that state x
 * archetype (state not in the file, or a small-sample null cell).
 */
export function reachForArchetype(state: string, archetypeId: string, income: number): number | null {
  const cell = reach.states[state]?.[archetypeId];
  if (!cell) return null;
  return reachPercentile(cell.ladder, income);
}

// Maps flow answers -> the reach archetype the SAME way the personal door's
// fallback picker does (pickArchetypeId), so the two can never silently
// desync on how kid count clamps or married/single maps to an archetype id.
export function reachForHousehold(
  state: string,
  married: boolean,
  kidCount: number,
  income: number,
): number | null {
  return reachForArchetype(state, pickArchetypeId(married, kidCount), income);
}
