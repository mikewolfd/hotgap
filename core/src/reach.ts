// "Reach": where a given income falls in a distribution of household earnings.
// The ladder is a monotonic list of earnings values at fixed percentile steps
// (p0, p5, … p100 — see reach.json `percentiles`). reachPercentile answers
// "what fraction of households earn at or below this income", by linearly
// interpolating between ladder points.
//
// The yardstick is HOUSEHOLDER + SPOUSE earnings — the pay of the one or two
// adults whose income the tool actually varies — with a working-age (18–64)
// householder, in 2026 dollars. It is NOT total household income and NOT every
// member's pay; see scripts/build-reach.mjs for why, and reach.json's
// `earningsConcept` for the one-line statement of it. Compare like with like:
// pass the same householder-plus-spouse earnings you would put on the axis.
//
// This is a CROSS-SECTIONAL signal — how common an income is among families
// like this — NOT a probability of any individual reaching it.

export interface ReachLadder {
  /** Earnings at each percentile step; length matches REACH_PERCENTILES. */
  ladder: number[];
  /**
   * 90% margin of error for each ladder point, same length and order, from
   * Successive Difference Replication over the PUMS replicate weights. A zero
   * means every replicate produced the same value, not that the point is exact:
   * p0 and p100 are the cell's min and max and are structurally zero, and
   * `seZero` marks a cell where an interior point is zero too.
   */
  moe: number[];
  /** Weighted households the cell represents. */
  households: number;
  /** Unweighted PUMS households behind it. */
  n: number;
  /** Which PUMS vintage this cell came from: "2024-1yr" or "2020-2024-5yr". */
  vintage: string;
  /** An interior ladder point has zero replicate variance — unmeasured, not exact. */
  seZero?: boolean;
}

// Percentile steps the ladder is sampled at (must match the builder's output).
export const REACH_PERCENTILES = Array.from({ length: 21 }, (_, i) => i * 5);

/**
 * Fraction of households (0–100) earning at or below `income`, interpolated on
 * a percentile ladder. Below the ladder's floor → 0; at/above its top → 100.
 */
export function reachPercentile(ladder: number[], income: number): number {
  if (ladder.length < 2) throw new Error("ladder needs at least two points");
  const step = 100 / (ladder.length - 1);
  if (income <= ladder[0]) return 0;
  if (income >= ladder[ladder.length - 1]) return 100;
  for (let i = 1; i < ladder.length; i++) {
    if (income <= ladder[i]) {
      const lo = ladder[i - 1];
      const hi = ladder[i];
      const frac = hi === lo ? 0 : (income - lo) / (hi - lo);
      return (i - 1) * step + frac * step;
    }
  }
  return 100;
}
