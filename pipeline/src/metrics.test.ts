import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { answersFor, archetypeById, evaluateCurve, loadStateFile, parsePEResponse, type CurvePoint } from "@hotgap/core";
import { point as flat } from "../../core/src/testing.js";
import { stateMetrics } from "./metrics.js";

const fixture = JSON.parse(
  readFileSync(new URL("../../fixtures/pe-ca-single-1kid-101.json", import.meta.url), "utf8"),
);
const fixturePoints = parsePEResponse(fixture, 101);
const single1 = archetypeById("single-1");
const evaluated = (points: CurvePoint[], state = "CA") =>
  evaluateCurve(answersFor(state, single1), { year: "2026", currentEarnings: 0, points }, "archetype");

describe("stateMetrics on the committed CA fixture", () => {
  // The CA single-parent-one-kid fixture, evaluated as the CA single-1
  // archetype: its Head Start loss at $30k ($21,971 under California's
  // premium wrap) lands at the next program year, and since 2026-09-17 it
  // counts like any other cliff — it is the biggest loss, and the leap is the
  // $30k–$74k trough it opens (the 2026-09-15 pin read the $3,868 subsidy end
  // at $84k and a $7,000 leap, with the Head Start drop lifted out). safeExit
  // is unchanged: the last zone still closes at $91k. This fixture isn't one
  // of the archetypes — it only pins the math.
  it("computes biggestLoss, cliffCount, dangerWidth, safeExit, and leap", () => {
    const m = stateMetrics(evaluated(fixturePoints));
    expect(m.biggestLoss).toBe(21971);
    expect(m.cliffCount).toBe(4);
    expect(m.deferredCliffCount).toBe(1);
    expect(m.dangerWidth).toBe(56000);
    expect(m.safeExit).toBe(91000);
    expect(m.leap).toBe(44000);
    // The worst step carries its own facts (places review B3): the Head Start
    // end at $30k, deferred and counted.
    expect(m.biggestLossAt).toBe(30000);
    expect(m.biggestLossPrograms).toEqual(["headstart"]);
    // The axis the cell was swept to, so "past the axis" can be said in dollars (places rerun S6, N9).
    expect(m.axisTop).toBe(100000);
  });
});

describe("stateMetrics on the committed Ohio file", () => {
  // Pinned from the committed sweep, read at test time, so the figure the
  // places page prints for its default household ("$12,062 lost at $38,000
  // → $39,000, when the CCDF child care subsidy ends") is the file's.
  it("reads the worst step's earnings and programs off the single-parent curve", () => {
    const file = loadStateFile("OH")!;
    const single2 = archetypeById("single-2");
    const m = stateMetrics(evaluateCurve(answersFor("OH", single2), { year: file.year, currentEarnings: 0, points: file.archetypes["single-2"].points }, "archetype"));
    expect(m.biggestLoss).toBe(12062);
    expect(m.biggestLossAt).toBe(38000);
    expect(m.biggestLossPrograms).toEqual(["childcare"]);
    expect(m.axisTop).toBe(file.archetypes["single-2"].points.at(-1)!.earnings);
  });
});

describe("stateMetrics on the road out of poverty (Plan 9)", () => {
  // Read from the committed sweep at test time, like the Ohio pin above: these
  // are the figures the journalist map will rank states by, and the plan's own
  // most- and least-regressive examples.
  const single2 = archetypeById("single-2");
  const forState = (state: string) => {
    const file = loadStateFile(state)!;
    return stateMetrics(evaluateCurve(answersFor(state, single2), { year: file.year, currentEarnings: 0, points: file.archetypes["single-2"].points }, "archetype"));
  };

  it("Missouri loses 56 cents of every extra dollar between poverty and twice poverty", () => {
    const m = forState("MO");
    expect(m.roadLo).toBe(27000);   // $26,650 for three, snapped to the sweep's $1,000
    expect(m.roadHi).toBe(55000);   // the step out of $54,000 — the first point at or above $53,300 — carried to its end
    expect(m.keepRate!.toFixed(2)).toBe("-0.56");
    expect(m.roadCliffCount).toBe(7);
    expect(m.roadWorst).toEqual({ drop: 16428, at: 40000, programs: ["childcare"] });
    // Missouri is the case where the two measures agree: its whole-axis worst
    // step IS the road's, at $40,000, and it sits near the middle of the
    // distribution — 47 in 100 families like this earn less. (The plan's
    // illustrative readout says "6 in 10"; the ladder says 46.6, and the
    // ladder is what a page renders.)
    expect(m.biggestLossAt).toBe(40000);
    expect(m.biggestLossPosition).toBe(46.6);
  });

  it("New Mexico keeps 30 cents, with no cliff on the road at all", () => {
    const m = forState("NM");
    expect(m.keepRate!.toFixed(2)).toBe("0.30");
    expect(m.roadCliffCount).toBe(0);
    expect(m.roadWorst).toBeNull();
  });
});

describe("stateMetrics on synthetic curves", () => {
  it("reports zero loss, zero danger width, safeExit 0, and leap 0 for a monotonic curve", () => {
    const pts = [flat(0, 10000), flat(50000, 15000), flat(100000, 21000)];
    // The road snaps to this curve's own $50,000 step — a three-point curve is
    // not a sweep — so its last step is the one out of $50,000 and the span
    // runs $0 → $100,000, keeping eleven cents of each dollar.
    expect(stateMetrics(evaluated(pts))).toEqual({
      biggestLoss: 0, biggestLossAt: null, biggestLossPrograms: [], dangerWidth: 0, cliffCount: 0, deferredCliffCount: 0, safeExit: 0, leap: 0, leapIsLowerBound: false, axisTop: 100000,
      keepRate: 0.11, roadLo: 0, roadHi: 100000, roadCliffCount: 0, roadWorst: null, biggestLossPosition: null,
    });
  });

  it("measures dangerWidth to the axis max when the zone never recovers, and reports safeExit null", () => {
    const pts = [flat(0, 20000), flat(50000, 30000), flat(100000, 22000)];
    const m = stateMetrics(evaluated(pts));
    expect(m.biggestLoss).toBe(8000);
    expect(m.biggestLossAt).toBe(50000);
    expect(m.biggestLossPrograms).toEqual([]); // a drop no program explains still names its step
    expect(m.cliffCount).toBe(1);
    expect(m.dangerWidth).toBe(50000); // from the $50k peak to the $100k axis end
    expect(m.safeExit).toBeNull(); // the zone never recovers within the sweep
    expect(m.leap).toBe(50000); // axisMax - zoneStart = 100000 - 50000
    expect(m.axisTop).toBe(100000);
  });
});
