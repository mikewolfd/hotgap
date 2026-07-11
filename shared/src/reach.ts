// "Reach": where a given income falls in a distribution of household incomes.
// The ladder is a monotonic list of income values at fixed percentile steps
// (p0, p5, … p100 — see reach.json `percentiles`). reachPercentile answers
// "what fraction of households earn at or below this income", by linearly
// interpolating between ladder points.
//
// This is a CROSS-SECTIONAL signal — how common an income is among families
// like this — NOT a probability of any individual reaching it.

export interface ReachLadder {
  ladder: number[]; // income at each percentile step; length matches PERCENTILES
  households: number;
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
