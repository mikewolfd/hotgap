import { describe, it, expect } from "vitest";
import { analyzeCurve } from "./analyze.js";
import { ARCHETYPES, answersFor } from "./archetypes.js";
import { axisSpec } from "./translate.js";
import { loadStateFile } from "./data.js";
import { archetypeCurveFrom, clampFallbackEarnings, pickArchetypeId } from "./fallback.js";
import { point } from "./testing.js";

const points = [point(0, 20000), point(50000, 30000), point(100000, 45000)];
const stateFile = { generated: "2026-07-11T00:00:00.000Z", year: "2026", state: "CA", archetypes: { "single-1": { points } } };

// The household as the picker sees it: married, how many children, and what
// the spouse earns. Ages never matter, only the count.
const hh = (married: boolean, kidCount: number, spouseAnnualEarnings = 0) => ({
  married, spouseAnnualEarnings, childAges: Array.from({ length: kidCount }, () => 5),
});

describe("pickArchetypeId", () => {
  it("maps married + kid count to the matching archetype id", () => {
    expect(pickArchetypeId(hh(false, 0))).toBe("single-0");
    expect(pickArchetypeId(hh(false, 2))).toBe("single-2");
    expect(pickArchetypeId(hh(true, 1))).toBe("married-1");
  });
  it("clamps kid counts above 3 down to the 3-kid archetype", () => {
    expect(pickArchetypeId(hh(false, 5))).toBe("single-3");
    expect(pickArchetypeId(hh(true, 4))).toBe("married-3");
    expect(pickArchetypeId(hh(true, 4, 15080))).toBe("married-dual-3");
  });
  it("sends a couple with a second earner to the dual-earner archetype", () => {
    expect(pickArchetypeId(hh(true, 1, 15080))).toBe("married-dual-1");
    expect(pickArchetypeId(hh(true, 2, 15080))).toBe("married-dual-2");
    expect(pickArchetypeId(hh(true, 3, 15080))).toBe("married-dual-3");
  });
  it("counts any spouse earnings at all as a second earner, not a full-time floor", () => {
    expect(pickArchetypeId(hh(true, 2, 1))).toBe("married-dual-2");
    expect(pickArchetypeId(hh(true, 2, 0))).toBe("married-2");
  });
  it("leaves a childless couple on married-0, second earner or not", () => {
    // There is no married-dual-0 to send them to: what the dual rows add is the
    // childcare dimension, and a childless couple has none.
    expect(pickArchetypeId(hh(true, 0, 40000))).toBe("married-0");
    expect(pickArchetypeId(hh(true, 0))).toBe("married-0");
  });
  it("ignores spouse earnings on an unmarried household, which has no spouse", () => {
    expect(pickArchetypeId(hh(false, 2, 40000))).toBe("single-2");
  });
});

describe("archetypeCurveFrom", () => {
  it("returns the archetype's points when present", () => {
    expect(archetypeCurveFrom(stateFile, hh(false, 1))).toEqual(points);
  });
  it("returns null for a missing file, a missing archetype, or a degenerate curve", () => {
    expect(archetypeCurveFrom(null, hh(false, 1))).toBeNull();
    expect(archetypeCurveFrom(stateFile, hh(true, 2))).toBeNull();
    expect(archetypeCurveFrom({ ...stateFile, archetypes: { "single-1": { points: points.slice(0, 1) } } }, hh(false, 1))).toBeNull();
  });
  it("returns null rather than the single-earner twin when the dual-earner curve is missing", () => {
    // A curve modelling a spouse with no pay and no childcare bill is not this
    // household's baseline, so no answer beats the wrong one.
    const file = { ...stateFile, archetypes: { "married-2": { points } } };
    expect(archetypeCurveFrom(file, hh(true, 2, 15080))).toBeNull();
    expect(archetypeCurveFrom(file, hh(true, 2))).toEqual(points);
  });
});

describe("archetypeCurveFrom on the committed sweep", () => {
  it("reads the curve for a real state, sized to that household's axis", () => {
    expect(archetypeCurveFrom(loadStateFile("CA"), hh(false, 1))).toHaveLength(axisSpec(answersFor("CA", ARCHETYPES[1])).count);
  });
  it("returns null for a state we have no file for", () => {
    expect(archetypeCurveFrom(loadStateFile("ZZ"), hh(false, 1))).toBeNull();
  });
});

describe("clampFallbackEarnings", () => {
  it("clamps earnings beyond the last sampled point down to the curve's max, else passes through", () => {
    expect(clampFallbackEarnings(points, 150000)).toBe(100000);
    expect(clampFallbackEarnings(points, 40000)).toBe(40000);
    expect(clampFallbackEarnings(points, 100000)).toBe(100000);
  });
  it("keeps a $150k earner on the fallback path inside the sampled data", () => {
    const analysis = analyzeCurve(points, clampFallbackEarnings(points, 150000));
    expect(analysis.currentEarnings).toBe(100000);
  });
});
