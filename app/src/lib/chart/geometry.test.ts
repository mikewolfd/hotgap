// The geometry both charts share (design/charts.md § 1; audit D10): nice
// steps, the next step up, the ticks inside a range, the merge of colliding
// marks, and the pixel maps.
import { describe, expect, test } from "vitest";
import { makeEvaluation } from "../../citizen/fixture.js";
import { sceneOf } from "../../citizen/model.js";
import { clusterCliffs, indexAtX, layerFor, niceStep, niceTicks, niceUp } from "./geometry.js";

describe("nice values", () => {
  test("a step is range / n snapped to 1, 2, 2.5 or 5 × 10^k", () => {
    expect(niceStep(75_000, 5)).toBe(10_000);
    expect(niceStep(75_000, 4)).toBe(20_000);
    expect(niceStep(48_806, 4)).toBe(10_000);
    expect(niceStep(37, 4)).toBe(10);
    // The caseworker's gridline step is the same snap of range / n.
    expect(niceStep(84_732 - 20_000, 5)).toBe(10_000);
  });
  test("niceUp is the next nice value above a step, across a decade", () => {
    expect([1000, 2000, 2500, 5000, 10_000].map(niceUp)).toEqual([2000, 2500, 5000, 10_000, 20_000]);
    expect(niceUp(2499.9999)).toBe(2500);
  });
  test("ticks are the multiples of the step inside the range", () => {
    expect(niceTicks(23_000, 68_000, 20_000)).toEqual([40_000, 60_000]);
    expect(niceTicks(0, 150_000, 25_000)).toEqual([0, 25_000, 50_000, 75_000, 100_000, 125_000, 150_000]);
  });
});

describe("marks", () => {
  test("dots closer than 10px merge into one mark, whichever kind; farther apart stay separate; a cluster of deferred cliffs alone is hollow", () => {
    const s = sceneOf(makeEvaluation(), { unit: "year" });
    const tight = clusterCliffs(s.immediate, () => 100);
    expect(tight).toHaveLength(1);
    expect(tight[0].cliffs).toHaveLength(2);
    expect(clusterCliffs(s.immediate, (e) => e / 100)).toHaveLength(2);
    const mixed = clusterCliffs(s.inWindow, () => 100);
    expect(mixed).toHaveLength(1);
    expect(mixed[0].cliffs).toHaveLength(3);
    expect(mixed[0].later).toBe(false);
    expect(clusterCliffs(s.deferred, () => 100)[0].later).toBe(true);
  });
});

describe("the layer", () => {
  test("maps the x-range across the box inside its padding and the y-range top-down, and a client x back to a point index", () => {
    const L = layerFor(400, 300, { t: 20, r: 20, b: 30, l: 50 }, 0, 100_000, 20_000, 80_000);
    expect(L.px(0)).toBe(50);
    expect(L.px(100_000)).toBe(380);
    expect(L.py(80_000)).toBe(20);
    expect(L.py(20_000)).toBe(270);
    // The SVG box rendered at half width: the same client x maps to the same point.
    expect(indexAtX(L, 215, 0, 400, 0, 100)).toBe(50);
    expect(indexAtX(L, 107.5, 0, 200, 0, 100)).toBe(50);
    expect(indexAtX(L, -50, 0, 400, 10, 100)).toBe(10);
    expect(indexAtX(L, 900, 0, 400, 10, 100)).toBe(100);
  });
});
