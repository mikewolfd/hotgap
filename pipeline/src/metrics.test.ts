import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { ARCHETYPES, answersFor, evaluateCurve, parsePEResponse, type CurvePoint } from "@hotgap/core";
import { point as flat } from "../../core/src/testing.js";
import { stateMetrics } from "./metrics.js";

const fixture = JSON.parse(
  readFileSync(new URL("../../fixtures/pe-ca-single-1kid-101.json", import.meta.url), "utf8"),
);
const fixturePoints = parsePEResponse(fixture, 101);
const single1 = ARCHETYPES.find((a) => a.id === "single-1")!;
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
  });
});

describe("stateMetrics on synthetic curves", () => {
  it("reports zero loss, zero danger width, safeExit 0, and leap 0 for a monotonic curve", () => {
    const pts = [flat(0, 10000), flat(50000, 15000), flat(100000, 21000)];
    expect(stateMetrics(evaluated(pts))).toEqual({ biggestLoss: 0, dangerWidth: 0, cliffCount: 0, deferredCliffCount: 0, safeExit: 0, leap: 0, leapIsLowerBound: false });
  });

  it("measures dangerWidth to the axis max when the zone never recovers, and reports safeExit null", () => {
    const pts = [flat(0, 20000), flat(50000, 30000), flat(100000, 22000)];
    const m = stateMetrics(evaluated(pts));
    expect(m.biggestLoss).toBe(8000);
    expect(m.cliffCount).toBe(1);
    expect(m.dangerWidth).toBe(50000); // from the $50k peak to the $100k axis end
    expect(m.safeExit).toBeNull(); // the zone never recovers within the sweep
    expect(m.leap).toBe(50000); // axisMax - zoneStart = 100000 - 50000
  });
});
