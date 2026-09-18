// The citizen chart's arithmetic (design/charts.md § 1 and § The scroll
// rule): the initial view, the 2.5× y-range rule over the whole curve, ticks
// in the display unit, and the layout's clusters and scroll position. The
// nice steps, the scale, the merge rule and the scroll maths themselves are
// tested in lib/chart/geometry.test.ts.
import { describe, expect, test } from "vitest";
import { makeEvaluation, TOP } from "./fixture.js";
import { clusterCliffs, MAX_SCREENS } from "../lib/chart/geometry.js";
import { tickMoney } from "../lib/format.js";
import { layout, xTicks, yRange } from "./geometry.js";
import { sceneOf, WINDOW_MARGIN, windowFor } from "./model.js";

const year = { unit: "year" };

describe("the initial view", () => {
  test("is what the picture exists to show — the zone, the exit, the nearby biggest drop — plus the margin, and it crops nothing", () => {
    const s = sceneOf(makeEvaluation(), year);
    // zone $41k–$46k, the $54k→$55k drop within the margin: [41k − 10k, 55k + 20k].
    expect(s.window).toEqual([41_000 - WINDOW_MARGIN / 3, 55_000 + (2 * WINDOW_MARGIN) / 3]);
    expect(s.window[0] % s.step).toBe(0);
    // A household with nothing near it gets the margin alone.
    const alone = sceneOf(makeEvaluation({}, 100_000, { snapCliff: false, careCliff: false, deferredCliff: false }), year);
    expect(alone.window).toEqual([100_000 - WINDOW_MARGIN / 3, 100_000 + (2 * WINDOW_MARGIN) / 3]);
  });
  test("clamps at the axis ends without losing width", () => {
    const at0 = windowFor({ current: 5000, zone: null, stuck: false, exit: null, next: null, worst: null, top: TOP, step: 1000 });
    expect(at0[0]).toBe(0);
    expect(at0[1] - at0[0]).toBe(WINDOW_MARGIN);
    const atTop = windowFor({ current: 148_000, zone: null, stuck: false, exit: null, next: null, worst: null, top: TOP, step: 1000 });
    expect(atTop[1]).toBe(TOP);
    expect(atTop[1] - atTop[0]).toBe(WINDOW_MARGIN);
  });
  test("a stuck zone does not pull the initial view to the axis top", () => {
    const s = sceneOf(makeEvaluation({}, 60_000, { stuckAt: 61_000 }), year);
    expect(s.stuck).toBe(true);
    expect(s.window[1]).toBeLessThan(TOP);
  });
});

describe("the scroll rule", () => {
  test("the plot is the WHOLE axis, wider than the box at every width a phone or a desktop gives it", () => {
    const s = sceneOf(makeEvaluation(), year);
    for (const box of [390, 1280]) {
      const L = layout(s, box);
      expect(L.px(0)).toBe(12);
      expect(L.px(TOP)).toBe(L.W - 24);                 // the axis's last dollar is drawn, always
      expect(L.W).toBeGreaterThan(L.viewport);          // there is always somewhere to scroll (proof (a))
      expect(L.W).toBeLessThanOrEqual(MAX_SCREENS * L.viewport + 36);
      expect(L.i0).toBe(0);
      expect(L.i1).toBe(s.net.length - 1);
      expect(L.clusters.length).toBe(s.cliffs.length);  // nothing is dropped for being outside a window
    }
  });
  test("one screen of the scroller is the window: the initial view shows the pay the crop used to show", () => {
    const s = sceneOf(makeEvaluation(), year);
    const [lo, hi] = s.window;
    for (const box of [390, 1280]) {
      const L = layout(s, box);
      expect(L.viewport / L.scale).toBeCloseTo(hi - lo, 6);
      // …and therefore the window's two ends are both reachable without scrolling from the initial position.
      expect(L.px(lo) - L.scrollLeft).toBeGreaterThanOrEqual(-1);
      expect(L.px(hi) - L.scrollLeft).toBeLessThanOrEqual(L.viewport + 1);
    }
  });
  test("the initial scroll lands on the window with the household's own mark inside the viewport", () => {
    for (const box of [390, 1280]) {
      for (const pay of [30_000, 43_000, 71_000, 125_000]) {
        const s = sceneOf(makeEvaluation({}, pay), year);
        const L = layout(s, box);
        const you = L.px(s.current) - L.scrollLeft;
        expect(you).toBeGreaterThanOrEqual(44);
        expect(you).toBeLessThanOrEqual(L.viewport - 44);
        expect(L.scrollLeft).toBeGreaterThanOrEqual(0);
        expect(L.scrollLeft).toBeLessThanOrEqual(L.W - L.viewport);
      }
    }
  });
  test("paper cannot scroll, so the whole axis is fitted to the column and the ticks thin out", () => {
    const s = sceneOf(makeEvaluation(), year);
    const paper = layout(s, 640, true);
    expect(paper.print).toBe(true);
    expect(paper.scrollLeft).toBe(0);
    expect(paper.W).toBeLessThanOrEqual(640);
    expect(paper.px(0)).toBe(12);
    expect(paper.px(TOP)).toBe(paper.W - 24);           // the last dollar of the axis is on the page
    expect(paper.xTicks.length).toBeLessThan(layout(s, 1280).xTicks.length);
    expect(paper.narrow).toBe(false);                   // paper is one width, never the phone layout
  });
});

describe("axis honesty", () => {
  test("the y-range is the WHOLE curve's and still at least 2.5× the largest drop, snapped to the gridline step", () => {
    for (const narrow of [true, false]) {
      const s = sceneOf(makeEvaluation(), year);
      const { y0, y1, stepY, maxDrop } = yRange(s, narrow);
      expect(maxDrop).toBe(9000);
      expect(y1 - y0).toBeGreaterThanOrEqual(2.5 * maxDrop);
      expect(y0 % (stepY / 4)).toBe(0);
      expect(y1 % (stepY / 4)).toBe(0);
      expect(y0).toBeGreaterThan(0);
      // Every point of the curve fits, not just a window's: no drop is outside the comparison.
      expect(y0).toBeLessThanOrEqual(Math.min(...s.net));
      expect(y1).toBeGreaterThanOrEqual(Math.max(...s.net));
    }
  });
  test("the biggest drop clears the 24px floor in the initial view at 390 and at 1280 (charts.md § The scroll rule)", () => {
    const s = sceneOf(makeEvaluation(), year);
    for (const box of [390, 1280]) {
      const L = layout(s, box);
      const worst = s.worst!;
      const drop = L.py(s.net[s.idx(worst.endEarnings)]) - L.py(s.net[s.idx(worst.startEarnings)]);
      expect(drop).toBeGreaterThanOrEqual(24);
    }
  });
});

describe("ticks", () => {
  test("x ticks are generated in the display unit and mapped back to annual for position, over the whole axis", () => {
    const s = sceneOf(makeEvaluation({ answers: { ...makeEvaluation().answers, hoursPerWeek: 40 } }), { unit: "hour" });
    const ticks = xTicks(s, 5);
    expect(ticks.length).toBeGreaterThan(2);
    expect(ticks[0].value).toBe(0);                                 // the axis starts at $0 and says so
    for (const tk of ticks) {
      expect(tk.value % 0.5).toBe(0);                               // a round hourly figure…
      expect(tk.annual).toBeCloseTo(tk.value * 40 * 52, 6);         // …placed at exactly its annual pay
    }
    expect(tickMoney(17.5, "hour")).toBe("$17.50");
    expect(tickMoney(20, "hour")).toBe("$20");
    expect(tickMoney(40_000, "year")).toBe("$40k");
    expect(tickMoney(2500, "month")).toBe("$2,500");
  });
});

describe("marks", () => {
  test("a layout clusters every cliff on the curve, and a cluster of deferred cliffs alone is hollow", () => {
    const s = sceneOf(makeEvaluation(), year);
    const L = layout(s, 800);
    expect(L.clusters.map((c) => [c.cliffs.map((x) => x.startEarnings), c.later])).toEqual([[[41_000], false], [[54_000], false], [[71_000], true]]);
    expect(L.narrow).toBe(false);
    expect(layout(s, 358).narrow).toBe(true);
    // A deferred cliff and an immediate one under 10px apart share one solid mark.
    const tight = clusterCliffs(s.cliffs, () => 100);
    expect(tight).toHaveLength(1);
    expect(tight[0].later).toBe(false);
    expect(tight[0].cliffs).toHaveLength(3);
  });
  test("the drop label is the curve's biggest drop, and it is always in the picture now", () => {
    const inside = sceneOf(makeEvaluation(), year);
    expect(layout(inside, 800).labelled).toBe(inside.worst);
    // A household at $120k: the initial view starts past the $55k cliff, but the drop is drawn and labelled all the same.
    const far = sceneOf(makeEvaluation({}, 120_000, { deferredCliff: false }), year);
    expect(far.window[0]).toBeGreaterThan(55_000);
    expect(far.worst?.startEarnings).toBe(54_000);
    expect(layout(far, 800).labelled).toBe(far.worst);
  });
});
