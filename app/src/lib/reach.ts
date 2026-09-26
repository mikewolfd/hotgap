// Reach's uncertainty in the unit reach is read in (policy review R7). The
// ladder carries a 90% margin of error per POINT, in dollars (core reach.ts);
// a percentile has no dollar margin, so "38th, ±$2,500" mixes two units. The
// honest conversion reads the ladder again at the income minus and plus that
// margin: "38th percentile (33rd–40th)". Both pages read it here, so the
// caseworker's tile and the citizen's "between 3 and 4 in 10" cannot differ.
import { provideData, REACH_PERCENTILES, reachPercentile, type ReachLadder } from "@hotgap/core";

let pending: Promise<boolean> | null = null;
/**
 * The ACS ladders (/data/reach.json, 183 KB), fetched at most once and handed
 * to core so reachCell can read them; true once they are in. A failure is
 * false, and every reader then says less (no range), never something wrong.
 */
export function loadReach(): Promise<boolean> {
  return (pending ??= fetch("/data/reach.json")
    .then(async (r) => { if (!r.ok) return false; provideData({ "reach.json": await r.json() }); return true; })
    .catch(() => false));
}

/** The ladder point at or below percentile `p`: the one whose margin the reading carries. */
export function ladderIndexAt(p: number): number {
  const above = REACH_PERCENTILES.findIndex((q) => q > p);
  return above < 0 ? REACH_PERCENTILES.length - 1 : Math.max(0, above - 1);
}

export interface ReachRange {
  /** Where `income` falls, 0–100. */
  at: number;
  /** The same reading at income − margin and income + margin, 0–100. */
  lo: number;
  hi: number;
  /** The margin in dollars that was applied: the 90% MoE of the ladder point at or below `at`. */
  moe: number;
}

/**
 * Where `income` falls on `cell`'s ladder, and the percentile range its
 * margin of error spans. `income` is on the ladder's own yardstick —
 * householder plus spouse earnings (core reachLookup.ts reachAtEarnings).
 */
export function reachRange(cell: ReachLadder, income: number): ReachRange {
  const at = reachPercentile(cell.ladder, income);
  const moe = cell.moe[ladderIndexAt(at)] ?? 0;
  return { at, lo: reachPercentile(cell.ladder, income - moe), hi: reachPercentile(cell.ladder, income + moe), moe };
}
