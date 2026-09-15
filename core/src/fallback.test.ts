import { describe, it, expect } from "vitest";
import { analyzeCurve } from "./analyze.js";
import { ARCHETYPES, answersFor } from "./archetypes.js";
import { axisSpec } from "./translate.js";
import { archetypeCurveFrom, clampFallbackEarnings, loadArchetypeCurve, pickArchetypeId } from "./fallback.js";

const PROGRAMS = { snap: 0, medicaid: 0, chip: 0, eitc: 0, ctc: 0, aca: 0, tanf: 0, housing: 0, wic: 0, ssi: 0, headstart: 0, schoolmeals: 0, childcare: 0 };
const mkPoint = (earnings: number, netIncome: number) => ({ earnings, netIncome, medicalOOP: 0, programs: { ...PROGRAMS }, childPrograms: {}, otherBenefits: 0, stateCredits: 0, totalCtc: 0, coverageGap: false });
const points = [mkPoint(0, 20000), mkPoint(50000, 30000), mkPoint(100000, 45000)];
const stateFile = { generated: "2026-07-11T00:00:00.000Z", year: "2026", state: "CA", archetypes: { "single-1": { points } } };

describe("pickArchetypeId", () => {
  it("maps married + kid count to the matching archetype id", () => {
    expect(pickArchetypeId(false, 0)).toBe("single-0");
    expect(pickArchetypeId(false, 2)).toBe("single-2");
    expect(pickArchetypeId(true, 1)).toBe("married-1");
  });
  it("clamps kid counts above 3 down to the 3-kid archetype", () => {
    expect(pickArchetypeId(false, 5)).toBe("single-3");
    expect(pickArchetypeId(true, 4)).toBe("married-3");
  });
});

describe("archetypeCurveFrom", () => {
  it("returns the archetype's points when present", () => {
    expect(archetypeCurveFrom(stateFile, false, 1)).toEqual(points);
  });
  it("returns null for a missing file, a missing archetype, or a degenerate curve", () => {
    expect(archetypeCurveFrom(null, false, 1)).toBeNull();
    expect(archetypeCurveFrom(stateFile, true, 2)).toBeNull();
    expect(archetypeCurveFrom({ ...stateFile, archetypes: { "single-1": { points: points.slice(0, 1) } } }, false, 1)).toBeNull();
  });
});

describe("loadArchetypeCurve", () => {
  it("reads the committed curve for a real state, sized to that household's axis", () => {
    expect(loadArchetypeCurve("CA", false, 1)).toHaveLength(axisSpec(answersFor("CA", ARCHETYPES[1])).count);
  });
  it("returns null for a state we have no file for", () => {
    expect(loadArchetypeCurve("ZZ", false, 1)).toBeNull();
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
