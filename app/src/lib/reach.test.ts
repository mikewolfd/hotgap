import { REACH_PERCENTILES, type ReachLadder } from "@hotgap/core";
import { describe, expect, test } from "vitest";
import { ladderIndexAt, reachRange } from "./reach.js";

/* A ladder rising $2,000 a step from $0 (p0) to $40,000 (p100), each interior point ±$2,500. */
const cell: ReachLadder = {
  ladder: REACH_PERCENTILES.map((_, i) => i * 2000),
  moe: REACH_PERCENTILES.map((_, i) => (i === 0 || i === REACH_PERCENTILES.length - 1 ? 0 : 2500)),
  households: 1000, n: 300, vintage: "2024-1yr",
};

describe("reach in percentile terms (policy review R7)", () => {
  test("the point at or below a percentile carries the margin", () => {
    expect(ladderIndexAt(0)).toBe(0);
    expect(ladderIndexAt(37.5)).toBe(7);
    expect(ladderIndexAt(40)).toBe(8);
    expect(ladderIndexAt(100)).toBe(REACH_PERCENTILES.length - 1);
  });
  test("the dollar margin is read back through the ladder as a percentile range", () => {
    const r = reachRange(cell, 15_000);
    expect(r.at).toBeCloseTo(37.5);
    expect(r.moe).toBe(2500);
    expect(r.lo).toBeCloseTo(31.25);
    expect(r.hi).toBeCloseTo(43.75);
  });
  test("the range stops at the ladder's ends, never below 0 or past 100", () => {
    expect(reachRange(cell, 2_000).lo).toBe(0);
    expect(reachRange(cell, 39_500).hi).toBe(100);
  });
});
