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
  // archetype: its $22,103 Head Start loss at $30k is deferred to the next
  // program year, so the biggest immediate loss is the 400%-FPL subsidy end
  // ($3,868 at $84k) and the leap is that zone's width. safeExit is unchanged.
  // This fixture isn't one of the archetypes — it only pins the math.
  it("computes biggestLoss, cliffCount, dangerWidth, safeExit, and leap", () => {
    const m = stateMetrics(evaluated(fixturePoints));
    expect(m.biggestLoss).toBe(3868);
    expect(m.cliffCount).toBe(3);
    expect(m.deferredCliffCount).toBe(1);
    expect(m.dangerWidth).toBeGreaterThan(0);
    expect(m.safeExit).toBe(91000);
    expect(m.leap).toBe(7000);
    // The worst step carries its own facts (places review B3): the subsidy
    // end at $84k, the immediate cliff, not the deferred Head Start one at $30k.
    expect(m.biggestLossAt).toBe(84000);
    expect(m.biggestLossPrograms).toEqual(["aca"]);
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

describe("stateMetrics on synthetic curves", () => {
  it("reports zero loss, zero danger width, safeExit 0, and leap 0 for a monotonic curve", () => {
    const pts = [flat(0, 10000), flat(50000, 15000), flat(100000, 21000)];
    expect(stateMetrics(evaluated(pts))).toEqual({ biggestLoss: 0, biggestLossAt: null, biggestLossPrograms: [], dangerWidth: 0, cliffCount: 0, deferredCliffCount: 0, safeExit: 0, leap: 0, leapIsLowerBound: false, axisTop: 100000 });
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
