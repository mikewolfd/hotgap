import { describe, it, expect } from "vitest";
import { RAMP_BINS, RAMP_COLOR_VARS, buildRamp, metricValue } from "./placesRamp.js";

describe("RAMP_COLOR_VARS", () => {
  it("has one CSS variable reference per bin", () => {
    expect(RAMP_COLOR_VARS).toHaveLength(RAMP_BINS);
    for (const v of RAMP_COLOR_VARS) expect(v).toMatch(/^var\(--danger-ramp-\d\)$/);
  });
});

describe("buildRamp", () => {
  it("splits the observed range into 5 equal-width bins, upper bound rounded to whole dollars", () => {
    const ramp = buildRamp([0, 40, 100]); // max = 100
    expect(RAMP_BINS).toBe(5);
    expect(ramp.max).toBe(100);
    expect(ramp.upperBounds).toEqual([20, 40, 60, 80, 100]);
  });

  it("assigns the lightest bin (0) to 0 and the darkest bin (4) to the max value", () => {
    const ramp = buildRamp([0, 40, 100]);
    expect(ramp.binIndex(0)).toBe(0);
    expect(ramp.binIndex(100)).toBe(4);
  });

  it("assigns values at a bin boundary to the bin they enter (right-open)", () => {
    const ramp = buildRamp([0, 100]); // step = 20
    expect(ramp.binIndex(19)).toBe(0);
    expect(ramp.binIndex(20)).toBe(1);
    expect(ramp.binIndex(39)).toBe(1);
    expect(ramp.binIndex(40)).toBe(2);
  });

  it("never returns a bin past the last index even for values above max (defensive)", () => {
    const ramp = buildRamp([0, 100]);
    expect(ramp.binIndex(1000)).toBe(4);
  });

  it("treats a negative or missing value as bin 0", () => {
    const ramp = buildRamp([0, 100]);
    expect(ramp.binIndex(-5)).toBe(0);
  });

  it("degenerates to a single bin when every value is 0 (e.g. the single-0 archetype)", () => {
    const ramp = buildRamp([0, 0, 0]);
    expect(ramp.max).toBe(0);
    expect(ramp.upperBounds).toEqual([0]);
    expect(ramp.binIndex(0)).toBe(0);
  });
});

// Task 24: the places-door metric picker (leap vs biggest loss) reads its map
// fill / legend / rank value through this one pure selector, so the three
// can never disagree about which field backs the currently-selected metric.
describe("metricValue", () => {
  it("reads leap when the metric is leap", () => {
    expect(metricValue({ biggestLoss: 22000, leap: 46000 }, "leap")).toBe(46000);
  });

  it("reads biggestLoss when the metric is loss", () => {
    expect(metricValue({ biggestLoss: 22000, leap: 46000 }, "loss")).toBe(22000);
  });

  it("defaults to 0 for a missing state/archetype entry, regardless of metric", () => {
    expect(metricValue(undefined, "leap")).toBe(0);
    expect(metricValue(undefined, "loss")).toBe(0);
  });
});
