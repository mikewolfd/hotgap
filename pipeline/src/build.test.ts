import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { ARCHETYPES, answersFor, axisSpec, parsePEResponse, correctMaTafdc, evaluateCurve, type CurvePoint } from "@hotgap/core";
import { buildSummary, buildStateFile, validateResults, type ResultsByStateArchetype, roundPoint } from "./build.js";
import { stateMetrics } from "./metrics.js";

const fixture = JSON.parse(
  readFileSync(new URL("../../fixtures/pe-ca-single-1kid-101.json", import.meta.url), "utf8"),
);
const fixturePoints = parsePEResponse(fixture, 101);

const AXIS_COUNT = axisSpec(answersFor("CA", ARCHETYPES[0])).count;
const countFor = (state: string, archetypeId: string) => axisSpec(answersFor(state, ARCHETYPES.find((a) => a.id === archetypeId)!)).count;

function linearCurve(netIncomeStart = 10000, length = AXIS_COUNT): CurvePoint[] {
  return Array.from({ length }, (_, i) => ({
    earnings: i * 1000,
    netIncome: netIncomeStart + i * 100,
    medicalOOP: 0,
    programs: { snap: 0, medicaid: 0, chip: 0, eitc: 0, ctc: 0, aca: 0, tanf: 0, housing: 0, wic: 0, ssi: 0, headstart: 0, schoolmeals: 0 },
    childPrograms: {}, otherBenefits: 0, coverageGap: false,
  }));
}

function fullResultsFor(state: string): ResultsByStateArchetype {
  const forState: Record<string, CurvePoint[]> = {};
  for (const a of ARCHETYPES) forState[a.id] = linearCurve(10000, countFor(state, a.id));
  return { [state]: forState };
}

describe("validateResults", () => {
  it("passes when every requested state has all 8 archetypes with 101 finite points", () => {
    const results = fullResultsFor("CA");
    expect(validateResults(["CA"], results)).toEqual({ ok: true, gaps: [] });
  });

  it("reports a gap when an archetype is entirely missing for a state", () => {
    const results = fullResultsFor("CA");
    delete results.CA["married-3"];
    const v = validateResults(["CA"], results);
    expect(v.ok).toBe(false);
    expect(v.gaps).toContainEqual(expect.objectContaining({ state: "CA", archetypeId: "married-3", reason: "missing" }));
  });

  it("reports a gap when a state is missing entirely", () => {
    const results = fullResultsFor("CA");
    const v = validateResults(["CA", "TX"], results);
    expect(v.ok).toBe(false);
    expect(v.gaps.every((g) => g.state === "TX")).toBe(true);
    expect(v.gaps).toHaveLength(ARCHETYPES.length);
  });

  it("reports a gap when a curve doesn't have exactly the axis's point count", () => {
    const results = fullResultsFor("CA");
    results.CA["single-0"] = linearCurve().slice(0, 50);
    const v = validateResults(["CA"], results);
    expect(v.ok).toBe(false);
    expect(v.gaps).toContainEqual(
      expect.objectContaining({ state: "CA", archetypeId: "single-0", reason: expect.stringContaining("50") }),
    );
  });

  it("reports a gap when curve data contains non-finite values", () => {
    const results = fullResultsFor("CA");
    results.CA["single-1"] = linearCurve();
    results.CA["single-1"][10] = { ...results.CA["single-1"][10], netIncome: NaN };
    const v = validateResults(["CA"], results);
    expect(v.ok).toBe(false);
    expect(v.gaps).toContainEqual(
      expect.objectContaining({ state: "CA", archetypeId: "single-1", reason: expect.stringContaining("finite") }),
    );
  });
});

describe("buildSummary", () => {
  it("uses the same coverage-gap correction as an offline household evaluation", () => {
    const results = fullResultsFor("TX");
    const points = results.TX["single-2"];
    for (const p of points) {
      if (p.earnings >= 6000 && p.earnings < 27000) {
        p.medicalOOP = 7000;
        p.netIncome -= 7000;
      }
    }
    const a = answersFor("TX", ARCHETYPES.find((a) => a.id === "single-2")!);
    const evaluation = evaluateCurve(a, { year: "2026", currentEarnings: 0, points }, "archetype");
    expect(evaluation.curve.points[6].coverageGap).toBe(true);
    const summary = buildSummary("g", ["TX"], results);
    expect(summary.states.TX["single-2"]).toEqual(stateMetrics(evaluation.curve.points));
    expect(summary.states.TX["single-2"]).not.toEqual(stateMetrics(points));
  });

  it("corrects Massachusetts rankings from retained raw points and reports the approximation", () => {
    const raw = JSON.parse(readFileSync(new URL("../../docs/upstream/evidence/local-ma-tafdc.response.json", import.meta.url), "utf8"));
    const points = parsePEResponse(raw, 11).map(roundPoint);
    const results = fullResultsFor("MA");
    results.MA["married-3"] = points;
    const a = answersFor("MA", ARCHETYPES.find((a) => a.id === "married-3")!);
    const corrected = correctMaTafdc(a, points);
    expect(buildSummary("g", ["MA"], results).states.MA["married-3"]).toEqual({
      ...stateMetrics(corrected.points), maTafdc: corrected.correction,
    });
    expect(points[2].programs.tanf).toBe(9880);
    expect(buildStateFile("g", "MA", results).archetypes["married-3"].points[2].maTafdc).toEqual(points[2].maTafdc);
  });

  it("produces the schema: generated, year, archetype defs, and per-state per-archetype metrics", () => {
    const results = fullResultsFor("CA");
    const summary = buildSummary("2026-07-11T00:00:00.000Z", ["CA"], results);
    expect(summary.generated).toBe("2026-07-11T00:00:00.000Z");
    expect(summary.year).toBe("2026");
    expect(summary.archetypes).toEqual(ARCHETYPES.map((a) => ({ id: a.id, married: a.married, childAges: a.childAges })));
    expect(summary.states.CA["single-2"]).toEqual(stateMetrics(linearCurve(10000, countFor("CA", "single-2"))));
    expect(Object.keys(summary.states.CA)).toHaveLength(8);
  });

  // Fixture-driven: feed the real CA fixture's points under an archetype id
  // (the fixture household isn't one of the 8 archetypes — it only pins the
  // math, per the established metrics.test.ts pattern). Verified pins post
  // PTC double-count fix (Plan 6): safeExit 81000, leap 52000.
  it("carries safeExit and leap through from escapeAnalysis, per the verified CA fixture pins", () => {
    const results = fullResultsFor("CA");
    results.CA["single-1"] = fixturePoints;
    const summary = buildSummary("g", ["CA"], results);
    expect(summary.states.CA["single-1"]).toEqual({
      biggestLoss: 22089,
      dangerWidth: expect.any(Number),
      cliffCount: expect.any(Number),
      safeExit: 91000,
      leap: 45000,
      leapIsLowerBound: false,
    });
  });
});

describe("buildStateFile", () => {
  it("produces the schema: generated, year, state, and archetype→points map", () => {
    const results = fullResultsFor("CA");
    const file = buildStateFile("2026-07-11T00:00:00.000Z", "CA", results);
    expect(file.generated).toBe("2026-07-11T00:00:00.000Z");
    expect(file.year).toBe("2026");
    expect(file.state).toBe("CA");
    expect(file.archetypes["single-2"].points).toHaveLength(AXIS_COUNT);
  });

  it("roundPoint rounds netIncome, medicalOOP, and program values to whole dollars", () => {
    const programs = { snap: 123.6, medicaid: 0, chip: 0, eitc: 0, ctc: 0, aca: 0, tanf: 0, housing: 0, wic: 0, ssi: 0, headstart: 0, schoolmeals: 0 };
    const p = roundPoint({ earnings: 0, netIncome: 10000.4, medicalOOP: 12.5, programs, childPrograms: { medicaid: 3210.7 }, otherBenefits: 99.5, coverageGap: false });
    expect(p).toEqual({ earnings: 0, netIncome: 10000, medicalOOP: 13, programs: { ...programs, snap: 124 }, childPrograms: { medicaid: 3211 }, otherBenefits: 100 });
  });
});
