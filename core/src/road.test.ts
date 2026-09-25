import { describe, expect, it } from "vitest";
import { answersFor, archetypeById } from "./archetypes.js";
import { analyzeCurve } from "./analyze.js";
import { evaluateOffline } from "./evaluate.js";
import { cliffsBetween, keepNext, keepRate, povertyRoad, roadSummary, type RoadSummary } from "./road.js";
import { STATE_CODES } from "./states.js";
import { answersWith, point } from "./testing.js";
import type { CurvePoint } from "./types.js";

/** A $150,000 axis at the sweep's $1,000 step, net income rising `slope` dollars per dollar from $10,000. */
const sloped = (slope: number, top = 150_000): CurvePoint[] =>
  Array.from({ length: top / 1000 + 1 }, (_, i) => point(i * 1000, 10_000 + slope * i * 1000));

const SINGLE_2 = archetypeById("single-2");
const roadFor = (state: string): { road: RoadSummary | null; answers: ReturnType<typeof answersFor> } => {
  const answers = answersFor(state, SINGLE_2);
  const ev = evaluateOffline(answers);
  if (!ev) throw new Error(`no committed curve for ${state}`);
  return { road: roadSummary(ev.analysis, answers), answers };
};

describe("povertyRoad", () => {
  it("runs from the poverty guideline to the step that clears twice it", () => {
    // A single parent of one: $21,150 for two in 2025, so the road starts at
    // $21,000 and its last step is the one out of $43,000, the first point at
    // or above $42,300 — a limit on that line can only be placed there.
    expect(povertyRoad(answersWith(), sloped(0.5))).toEqual({ lo: 21_000, hiStart: 43_000, hi: 44_000 });
    // …and of two: $26,650 for three, so $27,000 → the step out of $54,000.
    expect(povertyRoad(answersWith({ childAges: [3, 7], childDisabled: [false, false] }), sloped(0.5)))
      .toEqual({ lo: 27_000, hiStart: 54_000, hi: 55_000 });
  });

  it("puts Alaska and Hawaii on their own guideline ladders, not the contiguous one", () => {
    // Two people: AK $26,430 (2× = $52,860 → the step out of $53,000), HI
    // $24,320 (2× = $48,640 → out of $49,000), where the 48 contiguous states
    // are $21,150 (2× = $42,300 → out of $43,000).
    expect(povertyRoad(answersWith({ state: "AK" }), sloped(0.5))).toEqual({ lo: 26_000, hiStart: 53_000, hi: 54_000 });
    expect(povertyRoad(answersWith({ state: "HI" }), sloped(0.5))).toEqual({ lo: 24_000, hiStart: 49_000, hi: 50_000 });
  });

  it("is null when the road runs off the end of a short axis", () => {
    expect(povertyRoad(answersWith(), sloped(0.5, 30_000))).toBeNull();
    // The last step has to be ON the axis, not merely start on it.
    expect(povertyRoad(answersWith(), sloped(0.5, 43_000))).toBeNull();
    expect(povertyRoad(answersWith(), sloped(0.5, 44_000))).toEqual({ lo: 21_000, hiStart: 43_000, hi: 44_000 });
  });
});

describe("keepRate", () => {
  it("is the slope of the money line: dollars kept per extra dollar earned", () => {
    expect(keepRate(sloped(0.5), 21_000, 42_000)).toBeCloseTo(0.5, 10);
    expect(keepRate(sloped(0), 21_000, 42_000)).toBe(0);
    expect(keepRate(sloped(-0.25), 21_000, 42_000)).toBeCloseTo(-0.25, 10);
  });

  it("is null for a degenerate range or an end the axis never sampled", () => {
    expect(keepRate(sloped(0.5), 42_000, 42_000)).toBeNull();
    expect(keepRate(sloped(0.5), 21_500, 42_000)).toBeNull();
    expect(keepRate(sloped(0.5), 21_000, 200_000)).toBeNull();
  });
});

describe("cliffsBetween", () => {
  it("takes every cliff whose step starts at or after lo and before hi, in earnings order", () => {
    const points = sloped(0.5, 60_000);
    points[30].netIncome -= 5000; // a step down out of $30,000
    points[50].netIncome -= 3000; // …and out of $50,000
    const { cliffs } = analyzeCurve(points, 0);
    expect(cliffs.map((c) => c.startEarnings)).toEqual([29_000, 49_000]);
    expect(cliffsBetween(cliffs, 21_000, 42_000).map((c) => c.startEarnings)).toEqual([29_000]);
    expect(cliffsBetween(cliffs, 29_000, 49_000).map((c) => c.startEarnings)).toEqual([29_000]);
    expect(cliffsBetween(cliffs, 21_000, 29_000)).toEqual([]);
  });

  it("counts exactly the steps the keep rate measures, the last one included", () => {
    // The property the road's top allowance rests on: a cliff in the step out
    // of hiStart is inside [lo, hi) because hi is one step past hiStart, and
    // its drop is inside the keep rate for the same reason.
    const points = sloped(0.5, 60_000);
    for (let i = 55; i < points.length; i++) points[i].netIncome -= 9000;
    const { cliffs } = analyzeCurve(points, 0);
    expect(cliffs.map((c) => c.startEarnings)).toEqual([54_000]);
    const road = povertyRoad(answersWith({ childAges: [3, 7], childDisabled: [false, false] }), points)!;
    expect(road).toEqual({ lo: 27_000, hiStart: 54_000, hi: 55_000 });
    expect(cliffsBetween(cliffs, road.lo, road.hi)).toHaveLength(1);
    // $14,000 earned, $9,000 of it lost at the last step.
    expect(keepRate(points, road.lo, road.hi)).toBeCloseTo((14_000 - 9000) / 28_000, 10);
  });

  it("measures keepRateToLine to hiStart, so an exit sitting on the line falls outside it", () => {
    const points = sloped(0.5, 60_000);
    for (let i = 55; i < points.length; i++) points[i].netIncome -= 9000;
    const answers = answersWith({ childAges: [3, 7], childDisabled: [false, false] });
    const road = roadSummary(analyzeCurve(points, 0), answers)!;
    expect(road.keepRate).toBeCloseTo((14_000 - 9000) / 28_000, 10);
    // $13,500 earned over the 27 steps to the line, and nothing lost before it.
    expect(road.keepRateToLine).toBeCloseTo(0.5, 10);
  });
});

describe("keepNext", () => {
  it("measures the next $10,000 from the last sampled point at or below where the household stands", () => {
    expect(keepNext(sloped(0.5), 30_000)).toEqual({ over: 10_000, kept: 0.5 });
    expect(keepNext(sloped(0.5), 30_400)).toEqual({ over: 10_000, kept: 0.5 });
  });

  it("is about zero on a plateau and negative across a cliff step", () => {
    const flat = sloped(0.5);
    for (let i = 30; i <= 40; i++) flat[i].netIncome = flat[30].netIncome;
    expect(keepNext(flat, 30_000)!.kept).toBeCloseTo(0, 10);
    const cliff = sloped(0.5);
    for (let i = 35; i < cliff.length; i++) cliff[i].netIncome -= 20_000;
    expect(keepNext(cliff, 30_000)!.kept).toBeCloseTo(0.5 - 2, 10); // $5,000 gained, $20,000 lost
  });

  it("shrinks to the axis end, and is null with less than a step left", () => {
    expect(keepNext(sloped(0.5), 146_000)).toEqual({ over: 4000, kept: 0.5 });
    expect(keepNext(sloped(0.5), 150_000)).toBeNull();
    expect(keepNext(sloped(0.5), 200_000)).toBeNull();
  });
});

// The plan's own figures (docs/superpowers/plans/2026-09-18-hotgap-keep-rate.md),
// measured on this committed sweep on 2026-09-18 and pinned to two decimals.
// They are what the journalist map will print, so they are read here from the
// data rather than typed anywhere a page can reach.
describe("the road on the committed sweep, single parent of two", () => {
  it("Missouri: 56 cents poorer per extra dollar, and the road collapses where child-care help ends", () => {
    const { road } = roadFor("MO");
    expect(road).toMatchObject({ lo: 27_000, hiStart: 54_000, hi: 55_000 });
    expect(road!.keepRate!.toFixed(2)).toBe("-0.56");
    expect(road!.worst!.drop).toBe(16_428);
    expect(road!.worst!.startEarnings).toBe(40_000);
    expect(road!.worst!.programsLost).toEqual(["childcare"]);
    // Its collapse is inside the road, not on the line: still negative measured to exactly twice poverty.
    expect(road!.keepRateToLine!).toBeLessThan(0);
    // Where the family stands on the road, from the reach ladder.
    expect(road!.familiesBelowHi).toBeGreaterThan(50);
    expect(road!.familiesBelowHi).toBeLessThan(75);
  });

  it("New Mexico: 30 cents kept, with no cliff anywhere on the road", () => {
    const { road } = roadFor("NM");
    expect(road!.keepRate!.toFixed(2)).toBe("0.30");
    expect(road!.cliffs).toEqual([]);
    expect(road!.worst).toBeNull();
  });

  it("Massachusetts collapses at the SNAP limit on the line, which a road stopping short could not see", () => {
    // The case that fixed the definition: BBCE tests SNAP against a
    // fiscal-year-blended poverty figure a little above the calendar
    // guideline, so the cliff is the step out of $54,000 with 2 × $26,650 =
    // $53,300. A road whose last step started at $53,000 excluded it — and
    // the same one-step miss hid Maryland's $913 at $54,000.
    const ma = roadFor("MA").road!;
    expect(ma.worst).toMatchObject({ startEarnings: 54_000, drop: 3513, programsLost: ["snap", "wic"] });
    expect(roadFor("MD").road!.worst).toMatchObject({ startEarnings: 54_000, drop: 913 });
  });

  it("nationally, a family that doubles its earnings from poverty ends up poorer than it started", () => {
    const rates = STATE_CODES.map((state) => roadFor(state).road?.keepRate ?? null);
    expect(rates.filter((r) => r === null)).toEqual([]); // every state's road is on its axis
    const mean = rates.reduce<number>((sum, r) => sum + r!, 0) / rates.length;
    expect(mean.toFixed(2)).toBe("-0.17");
  });
});
