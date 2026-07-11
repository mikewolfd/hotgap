import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { ARCHETYPES, parsePEResponse, type CurvePoint } from "@hotgap/shared";
import { buildSummary, buildStateFile, validateResults, type ResultsByStateArchetype } from "./build.js";
import { stateMetrics } from "./metrics.js";

const fixture = JSON.parse(
  readFileSync(new URL("../../fixtures/pe-ca-single-1kid-101.json", import.meta.url), "utf8"),
);
const fixturePoints = parsePEResponse(fixture, 101);

function linearCurve(netIncomeStart = 10000): CurvePoint[] {
  return Array.from({ length: 101 }, (_, i) => ({
    earnings: i * 1000,
    netIncome: netIncomeStart + i * 100,
    programs: { snap: 0, medicaid: 0, chip: 0, eitc: 0, ctc: 0, aca: 0, tanf: 0, housing: 0, wic: 0, ssi: 0, headstart: 0, schoolmeals: 0 },
  }));
}

function fullResultsFor(state: string): ResultsByStateArchetype {
  const forState: Record<string, CurvePoint[]> = {};
  for (const a of ARCHETYPES) forState[a.id] = linearCurve();
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

  it("reports a gap when a curve doesn't have exactly 101 points", () => {
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
  it("produces the schema: generated, year, archetype defs, and per-state per-archetype metrics", () => {
    const results = fullResultsFor("CA");
    const summary = buildSummary("2026-07-11T00:00:00.000Z", ["CA"], results);
    expect(summary.generated).toBe("2026-07-11T00:00:00.000Z");
    expect(summary.year).toBe("2026");
    expect(summary.archetypes).toEqual(ARCHETYPES.map((a) => ({ id: a.id, married: a.married, childAges: a.childAges })));
    expect(summary.states.CA["single-2"]).toEqual(stateMetrics(linearCurve()));
    expect(Object.keys(summary.states.CA)).toHaveLength(8);
  });

  // Fixture-driven: feed the real CA fixture's points under an archetype id
  // (the fixture household isn't one of the 8 archetypes — it only pins the
  // math, per the established metrics.test.ts pattern). Verified pins from
  // the plan: safeExit 64000, leap 34000.
  it("carries safeExit and leap through from escapeAnalysis, per the verified CA fixture pins", () => {
    const results = fullResultsFor("CA");
    results.CA["single-1"] = fixturePoints;
    const summary = buildSummary("g", ["CA"], results);
    expect(summary.states.CA["single-1"]).toEqual({
      biggestLoss: 21957,
      dangerWidth: expect.any(Number),
      cliffCount: expect.any(Number),
      safeExit: 64000,
      leap: 34000,
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
    expect(file.archetypes["single-2"].points).toHaveLength(101);
  });

  it("rounds netIncome and program values to whole dollars", () => {
    const results = fullResultsFor("CA");
    results.CA["single-0"] = [
      { earnings: 0, netIncome: 10000.4, programs: { snap: 123.6, medicaid: 0, chip: 0, eitc: 0, ctc: 0, aca: 0, tanf: 0, housing: 0, wic: 0, ssi: 0, headstart: 0, schoolmeals: 0 } },
      ...linearCurve().slice(1),
    ];
    const file = buildStateFile("g", "CA", results);
    const p0 = file.archetypes["single-0"].points[0];
    expect(p0.netIncome).toBe(10000);
    expect(p0.programs.snap).toBe(124);
    expect(p0.earnings).toBe(0);
  });
});
