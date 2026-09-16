// The chart's arithmetic (design/charts.md § 1): the lift, the window, the
// 2.5× y-range rule, nice ticks in the display unit, and the merge of
// colliding marks.
import { describe, expect, test } from "vitest";
import { makeEvaluation, TOP } from "./fixture.js";
import { clusterCliffs, layout, niceStep, niceTicks, tickLabel, xTicks, yRange } from "./geometry.js";
import { liftDeferred, sceneOf, windowFor } from "./model.js";

const year = { unit: "year" };

describe("the lift", () => {
  test("a deferred drop is added back to every point above its step, and only there", () => {
    const s = sceneOf(makeEvaluation(), year);
    const d = s.deferred[0];
    expect(d.startEarnings).toBe(71_000);
    const i = s.idx(d.startEarnings);
    expect(s.lifted[i]).toBe(s.net[i]);
    expect(s.lifted[i + 1] - s.net[i + 1]).toBeCloseTo(d.drop);
    expect(s.lifted[s.lifted.length - 1] - s.net[s.net.length - 1]).toBeCloseTo(d.drop);
    // The lifted curve no longer steps down there.
    expect(s.net[i + 1]).toBeLessThan(s.net[i]);
    expect(s.lifted[i + 1]).toBeGreaterThanOrEqual(s.lifted[i]);
    expect(liftDeferred([1, 2, 3], [], (e) => e)).toEqual([1, 2, 3]);
  });
});

describe("the window", () => {
  test("holds the diamond and the household's exit, takes in the nearby biggest drop, and is snapped to points", () => {
    const s = sceneOf(makeEvaluation(), year);
    const [lo, hi] = s.window;
    expect(lo).toBeLessThanOrEqual(s.current);
    expect(hi).toBeGreaterThanOrEqual(s.exit!);
    expect(hi).toBeGreaterThanOrEqual(s.worst!.endEarnings);
    expect(hi - lo).toBeGreaterThanOrEqual(TOP / 2);
    expect(lo % s.step).toBe(0);
    expect(hi % s.step).toBe(0);
    expect(lo).toBeGreaterThanOrEqual(0);
    expect(hi).toBeLessThanOrEqual(TOP);
  });
  test("clamps at the axis ends without losing width", () => {
    const at0 = windowFor({ current: 5000, zone: null, stuck: false, exit: null, next: null, worst: null, top: TOP, step: 1000 });
    expect(at0[0]).toBe(0);
    expect(at0[1] - at0[0]).toBe(TOP / 2);
    const atTop = windowFor({ current: 148_000, zone: null, stuck: false, exit: null, next: null, worst: null, top: TOP, step: 1000 });
    expect(atTop[1]).toBe(TOP);
    expect(atTop[1] - atTop[0]).toBe(TOP / 2);
  });
  test("a stuck zone does not pull the window to the axis top", () => {
    const s = sceneOf(makeEvaluation({}, 60_000, { stuckAt: 61_000 }), year);
    expect(s.stuck).toBe(true);
    expect(s.window[1]).toBeLessThan(TOP);
  });
});

describe("axis honesty", () => {
  test("the y-range is at least 2.5× the largest drop in the window, snapped to the gridline step", () => {
    for (const narrow of [true, false]) {
      const s = sceneOf(makeEvaluation(), year);
      const { y0, y1, stepY, maxDrop } = yRange(s, narrow);
      expect(maxDrop).toBe(9000);
      expect(y1 - y0).toBeGreaterThanOrEqual(2.5 * maxDrop);
      expect(y0 % stepY).toBe(0);
      expect(y1 % stepY).toBe(0);
      const slice = s.lifted.slice(s.idx(s.window[0]), s.idx(s.window[1]) + 1);
      expect(y0).toBeLessThanOrEqual(Math.min(...slice));
      expect(y1).toBeGreaterThanOrEqual(Math.max(...slice));
    }
  });
});

describe("ticks", () => {
  test("nice steps: 1, 2, 2.5 or 5 × 10^k", () => {
    expect(niceStep(75_000, 5)).toBe(10_000);
    expect(niceStep(75_000, 4)).toBe(20_000);
    expect(niceStep(48_806, 4)).toBe(10_000);
    expect(niceStep(37, 4)).toBe(10);
    expect(niceTicks(23_000, 68_000, 20_000)).toEqual([40_000, 60_000]);
  });
  test("x ticks are generated in the display unit and mapped back to annual for position", () => {
    const s = sceneOf(makeEvaluation({ answers: { ...makeEvaluation().answers, hoursPerWeek: 40 } }), { unit: "hour" });
    const ticks = xTicks(s, 5);
    expect(ticks.length).toBeGreaterThan(2);
    for (const tk of ticks) {
      expect(tk.value % 0.5).toBe(0);                               // a round hourly figure…
      expect(tk.annual).toBeCloseTo(tk.value * 40 * 52, 6);         // …placed at exactly its annual pay
    }
    expect(tickLabel(17.5, "hour")).toBe("$17.50");
    expect(tickLabel(20, "hour")).toBe("$20");
    expect(tickLabel(40_000, "year")).toBe("$40k");
    expect(tickLabel(2500, "month")).toBe("$2,500");
  });
});

describe("marks", () => {
  test("dots closer than 10px merge into one mark; farther apart stay separate", () => {
    const s = sceneOf(makeEvaluation(), year);
    const tight = clusterCliffs(s.immediate, () => 100);
    expect(tight).toHaveLength(1);
    expect(tight[0].cliffs).toHaveLength(2);
    const loose = clusterCliffs(s.immediate, (e) => e / 100);
    expect(loose).toHaveLength(2);
  });
  test("a layout puts immediate cliffs in clusters and deferred ones in `later`, and draws no ghost for a small deferred drop", () => {
    const s = sceneOf(makeEvaluation(), year);
    const L = layout(s, 800);
    expect(L.clusters.flatMap((c) => c.cliffs).map((c) => c.startEarnings)).toEqual([41_000, 54_000]);
    expect(L.later.map((c) => c.startEarnings)).toEqual([71_000]);
    expect(L.ghost).toBe(L.later[0].drop > 0.015 * (L.y1 - L.y0));
    expect(L.narrow).toBe(false);
    expect(layout(s, 358).narrow).toBe(true);
  });
});
