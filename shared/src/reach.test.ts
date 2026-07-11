import { describe, it, expect } from "vitest";
import { reachPercentile } from "./reach.js";

// A linear ladder p0=0 … p100=100000 (21 points, $5k apart) makes the expected
// percentile easy to reason about: income X → X/1000.
const linear = Array.from({ length: 21 }, (_, i) => i * 5000);

describe("reachPercentile", () => {
  it("returns 0 at or below the floor", () => {
    expect(reachPercentile(linear, 0)).toBe(0);
    expect(reachPercentile(linear, -100)).toBe(0);
  });

  it("returns 100 at or above the top", () => {
    expect(reachPercentile(linear, 100000)).toBe(100);
    expect(reachPercentile(linear, 250000)).toBe(100);
  });

  it("interpolates linearly to the right percentile", () => {
    expect(reachPercentile(linear, 50000)).toBeCloseTo(50, 6);
    expect(reachPercentile(linear, 25000)).toBeCloseTo(25, 6);
    expect(reachPercentile(linear, 90000)).toBeCloseTo(90, 6);
  });

  it("interpolates between ladder points, not just at them", () => {
    // 52500 sits halfway between p50 (50000) and p55 (55000) → 52.5
    expect(reachPercentile(linear, 52500)).toBeCloseTo(52.5, 6);
  });

  it("handles a non-uniform (realistic) ladder monotonically", () => {
    const skewed = [0, 10000, 18000, 24000, 30000, 36000, 42000, 48000, 55000,
      63000, 72000, 82000, 94000, 108000, 125000, 146000, 172000, 205000, 250000, 320000, 500000];
    const p = reachPercentile(skewed, 72000); // == p50
    expect(p).toBeCloseTo(50, 6);
    // strictly increasing as income rises
    expect(reachPercentile(skewed, 40000)).toBeLessThan(reachPercentile(skewed, 80000));
  });

  it("throws on a degenerate ladder", () => {
    expect(() => reachPercentile([5], 3)).toThrow();
  });
});
