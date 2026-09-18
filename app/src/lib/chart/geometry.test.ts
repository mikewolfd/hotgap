// The geometry both charts share (design/charts.md § 1; audit D10): nice
// steps, the next step up, the ticks inside a range, the merge of colliding
// marks, and the pixel maps.
import { describe, expect, test } from "vitest";
import type { Cliff } from "@hotgap/core";
import { makeEvaluation } from "../../citizen/fixture.js";
import { sceneOf } from "../../citizen/model.js";
import { clusterCliffs, indexAtX, layerFor, MAX_SCREENS, niceStep, niceTicks, niceUp, plotHeight, plotWidth, PLOT_H, PLOT_LEAD, scaleFor, scrollFor, scrollToShow } from "./geometry.js";

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
    const tight = clusterCliffs(s.cliffs.filter((c) => !c.deferral), () => 100);
    expect(tight).toHaveLength(1);
    expect(tight[0].cliffs).toHaveLength(2);
    expect(clusterCliffs(s.cliffs.filter((c) => !c.deferral), (e) => e / 100)).toHaveLength(2);
    const mixed = clusterCliffs(s.cliffs, () => 100);
    expect(mixed).toHaveLength(1);
    expect(mixed[0].cliffs).toHaveLength(3);
    expect(mixed[0].later).toBe(false);
    expect(clusterCliffs(s.deferred, () => 100)[0].later).toBe(true);
  });
  test("a wait sharing the step with an immediate loss keeps the solid mark", () => {
    const mixed = {
      startEarnings: 38_000, endEarnings: 39_000, drop: 16_700, programsLost: ["medicaid", "headstart"],
      breakdown: { benefits: 16_700, credits: 0, premiums: 0, other: 0 }, driver: "benefits" as const,
      deferral: { reason: "head_start_program_year" as const, until: "later", complete: false }, position: null,
    } satisfies Cliff;
    expect(clusterCliffs([mixed], () => 100)[0].later).toBe(false);
  });
});

describe("the scroll rule", () => {
  const pad = { t: 26, r: 24, b: 38, l: PLOT_LEAD };
  test("the scale puts the window in one screen, so the initial view is the crop rule's own choice", () => {
    // A $30,000 window in a 300px viewport: 10px per $1,000, and a $150,000 axis is five screens long.
    expect(scaleFor(300, [40_000, 70_000], 150_000) * 1000).toBeCloseTo(10, 6);
    expect(plotWidth(150_000, pad, scaleFor(300, [40_000, 70_000], 150_000))).toBe(PLOT_LEAD + 24 + 1500);
    // The same window on a desktop column shows the same PAY, at better legibility — that is what a wider box buys.
    expect(scaleFor(600, [40_000, 70_000], 150_000) * 1000).toBeCloseTo(20, 6);
  });
  test("an axis too long to reach by hand zooms out to MAX_SCREENS, showing more pay than the window and never less", () => {
    // The caseworker's live curves reach $750,000. At the window's own scale that is 25 screens of swiping.
    const ideal = scaleFor(300, [40_000, 70_000], 750_000);
    expect(plotWidth(750_000, pad, ideal)).toBeLessThanOrEqual(MAX_SCREENS * 300 + PLOT_LEAD + 24);
    // Zoomed out, one screen shows more than the $30,000 window, which crops nothing.
    expect(300 / ideal).toBeGreaterThan(30_000);
    // A short axis is never zoomed IN past the window: the cap is a ceiling, not a target.
    expect(scaleFor(300, [40_000, 70_000], 150_000)).toBe(300 / 30_000);
  });
  test("the plot is as tall as the biggest drop needs, between a floor and a ceiling", () => {
    // A drop that is 10% of the range needs 240px of plot, which is under the floor: the floor wins.
    expect(plotHeight(100_000, 10_000)).toBe(PLOT_H.min);
    // 5%: 480px, which is what it gets.
    expect(plotHeight(100_000, 5_000)).toBe(480);
    // 2.7% — the Massachusetts household — wants 880px and is capped. charts.md records the shortfall.
    expect(plotHeight(110_000, 3_000)).toBe(PLOT_H.max);
    // A curve with no cliff has no drop to size for and takes the floor.
    expect(plotHeight(100_000, 0)).toBe(PLOT_H.min);
  });
  test("the initial scroll centres the window and then pulls the household's own pay inside the viewport", () => {
    const L = layerFor(1812, 400, pad, 0, 150_000, 0, 100_000);
    // A window in the middle, with the household inside it: the window's centre is the viewport's.
    expect(scrollFor(L, 346, [40_000, 70_000], 55_000)).toBe(Math.round(L.px(55_000) - 173));
    // The same window, household near its low end: centring would leave the diamond 31px from the edge,
    // inside the 44px margin, so the scroll gives way to the diamond. The window is context; "you" is the answer.
    expect(scrollFor(L, 346, [40_000, 70_000], 43_000)).toBe(Math.round(L.px(43_000) - 44));
    // A window much wider than the viewport, with the household at its right end: the centre would leave
    // "you" off screen, so the scroll is pulled back until the diamond is 44px inside the edge.
    const wide = scrollFor(L, 346, [0, 150_000], 140_000);
    expect(Math.round(L.px(140_000) - wide)).toBe(346 - 44);
    // Both ends clamp to the scroller's own range, never past it.
    expect(scrollFor(L, 346, [0, 20_000], 0)).toBe(0);
    expect(scrollFor(L, 346, [140_000, 150_000], 150_000)).toBe(L.W - 346);
  });
  test("scrollToShow moves only when the target is outside the viewport, and by the least it can", () => {
    // Already inside: unchanged, so a key that lands on a visible mark does not lurch the picture.
    expect(scrollToShow(500, 400, 346, 1812)).toBe(400);
    // Off the right edge: brought to 44px inside it. Off the left: the same, the other way.
    expect(scrollToShow(800, 400, 346, 1812)).toBe(800 - 346 + 44);
    expect(scrollToShow(410, 400, 346, 1812)).toBe(410 - 44);
    expect(scrollToShow(10, 400, 346, 1812)).toBe(0);
    expect(scrollToShow(1810, 0, 346, 1812)).toBe(1812 - 346);
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
