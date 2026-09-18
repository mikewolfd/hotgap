import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { ARCHETYPES, answersFor, archetypeById, axisSpec, parsePEResponse, evaluateCurve, stateCoverage, type CurvePoint } from "@hotgap/core";
import { NO_PROGRAMS, point } from "../../core/src/testing.js";
import { buildSummary, buildStateFile, validateResults, type ResultsByStateArchetype, roundPoint } from "./build.js";
import { stateMetrics } from "./metrics.js";

const fixture = JSON.parse(
  readFileSync(new URL("../../fixtures/pe-ca-single-1kid-101.json", import.meta.url), "utf8"),
);
const fixturePoints = parsePEResponse(fixture, 101);

const AXIS_COUNT = axisSpec(answersFor("CA", ARCHETYPES[0])).count;
const countFor = (state: string, archetypeId: string) => axisSpec(answersFor(state, archetypeById(archetypeId))).count;

function linearCurve(netIncomeStart = 10000, length = AXIS_COUNT): CurvePoint[] {
  return Array.from({ length }, (_, i) => point(i * 1000, netIncomeStart + i * 100));
}

function fullResultsFor(state: string): ResultsByStateArchetype {
  const forState: Record<string, CurvePoint[]> = {};
  for (const a of ARCHETYPES) forState[a.id] = linearCurve(10000, countFor(state, a.id));
  return { [state]: forState };
}

describe("validateResults", () => {
  it("passes when every requested state has every archetype with a full-axis finite curve", () => {
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
    const a = answersFor("TX", archetypeById("single-2"));
    const evaluation = evaluateCurve(a, { year: "2026", currentEarnings: 0, points }, "archetype");
    expect(evaluation.curve.points[6].coverageGap).toBe(true);
    const summary = buildSummary("g", ["TX"], results);
    expect(summary.states.TX["single-2"]).toEqual(stateMetrics(evaluation));
    // The phantom premium is gone from the summary's curve and still there on the raw points.
    expect(evaluation.curve.points[6].medicalOOP).toBe(0);
    expect(points[6].medicalOOP).toBe(7000);
  });

  it("corrects Massachusetts rankings from retained raw points and reports the approximation", () => {
    const raw = JSON.parse(readFileSync(new URL("../../fixtures/pe-ma-married-3kids-11.json", import.meta.url), "utf8"));
    const points = parsePEResponse(raw, 11).map(roundPoint);
    const results = fullResultsFor("MA");
    results.MA["married-3"] = points;
    const a = answersFor("MA", archetypeById("married-3"));
    const evaluation = evaluateCurve(a, { year: "2026", currentEarnings: 0, points }, "archetype");
    expect(buildSummary("g", ["MA"], results).states.MA["married-3"]).toEqual({
      ...stateMetrics(evaluation), maTafdc: evaluation.maTafdc,
    });
    expect(evaluation.maTafdc?.status).toBe("applied");
    expect(points[2].programs.tanf).toBe(9880);
    expect(buildStateFile("g", "MA", results).archetypes["married-3"].points[2].maTafdc).toEqual(points[2].maTafdc);
  });

  it("produces the schema: generated, year, archetype defs, and per-state per-archetype metrics", () => {
    const results = fullResultsFor("CA");
    const summary = buildSummary("2026-07-11T00:00:00.000Z", ["CA"], results);
    expect(summary.generated).toBe("2026-07-11T00:00:00.000Z");
    expect(summary.year).toBe("2026");
    expect(summary.archetypes).toEqual(ARCHETYPES.map((a) => ({ id: a.id, married: a.married, childAges: a.childAges })));
    const single2 = archetypeById("single-2");
    expect(summary.states.CA["single-2"]).toEqual(stateMetrics(evaluateCurve(answersFor("CA", single2), { year: "2026", currentEarnings: 0, points: linearCurve(10000, countFor("CA", "single-2")) }, "archetype")));
    expect(Object.keys(summary.states.CA)).toEqual(ARCHETYPES.map((a) => a.id));
  });

  it("carries a coverage block per swept state, built from the same curves and the sweep's own model and gaps", () => {
    const results = { ...fullResultsFor("NJ"), ...fullResultsFor("TX") };
    results.NJ["single-0"] = results.NJ["single-0"].map((p) => ({ ...p, otherBenefits: 450 }));
    const model = { endpoint: "127.0.0.1:8099", version: "2.5.0" };
    const summary = buildSummary("g", ["NJ", "TX"], results, { NJ: model, TX: model });
    expect(summary.model).toEqual(model);
    expect(Object.keys(summary.coverage!).sort()).toEqual(["NJ", "TX"]);
    expect(summary.coverage!.NJ).toEqual(stateCoverage("NJ", results.NJ, { model, childcareSubsidyUnmodeled: summary.childcareSubsidyUnmodeled }));
    expect(summary.coverage!.NJ.otherBenefits).toEqual([{ variable: "nj_property_tax_relief", label: expect.any(String), message: { code: "coverage.otherBenefits.nj_property_tax_relief" }, maxAnnualInSweep: 450 }]);
    expect(summary.coverage!.NJ.vintages.model).toEqual(model);
    // A partial re-sweep leaves states on different models: each block keeps its own, the summary names none.
    const newer = { endpoint: "127.0.0.1:8099", version: "2.7.0", countsChildcareSubsidy: true };
    const mixed = buildSummary("g", ["NJ", "TX"], results, { NJ: model, TX: newer });
    expect(mixed.model).toBeUndefined();
    expect(mixed.coverage!.NJ.vintages.model).toEqual(model);
    expect(mixed.coverage!.TX.vintages.model).toEqual(newer);
    expect(mixed.coverage!.TX.corrections.childcareSubsidy.source).toBe("in net income");
    expect(mixed.coverage!.NJ.corrections.childcareSubsidy.source).toBe("added by HotGap");
    expect(buildSummary("g", ["NJ"], results).model).toBeUndefined();
    // A linear curve pays no subsidy, so both states are flagged, and each block says so.
    expect(summary.childcareSubsidyUnmodeled).toEqual(["NJ", "TX"]);
    expect(summary.coverage!.TX.unmodeled.map((u) => u.program)).toEqual(["Child-care subsidy (CCDF)"]);
    expect(summary.coverage!.TX.corrections.coverageGap.applies).toBe(true);
    // LIHEAP's boundary rides on every block (Plan 7), from the table, not the curves.
    expect(summary.coverage!.TX.liheap).toMatchObject({ limitKind: "150% of the poverty guideline", servedShare: 0.03 });
    expect(summary.coverage!.TX.corrections.liheap?.source).toBe("boundary");
  });

  // Fixture-driven: feed the real CA fixture's points under an archetype id
  // (the fixture household isn't one of the archetypes — it only pins the
  // math, per the established metrics.test.ts pattern).
  it("carries safeExit and leap through from escapeAnalysis, per the verified CA fixture pins", () => {
    const results = fullResultsFor("CA");
    results.CA["single-1"] = fixturePoints;
    const summary = buildSummary("g", ["CA"], results);
    // The Head Start loss at $30k ($21,971 under California's premium wrap)
    // lands at the next program year and, since 2026-09-17, counts: it is the
    // biggest loss and the leap is its $30k–$74k trough. (Pinned 2026-09-15 at
    // the $3,868 subsidy end and a $7,000 leap, with the deferred drop lifted
    // out.) cliffCount now counts every cliff, the deferred one included.
    expect(summary.states.CA["single-1"]).toEqual({
      biggestLoss: 21971,
      biggestLossAt: 30000,
      biggestLossPrograms: ["headstart"],
      dangerWidth: 56000,
      cliffCount: 4,
      deferredCliffCount: 1,
      safeExit: 91000,
      leap: 44000,
      leapIsLowerBound: false,
      axisTop: 100000,
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
    const p = roundPoint(point(0, 10000.4, { medicalOOP: 12.5, programs: { snap: 123.6 }, childPrograms: { medicaid: 3210.7 }, otherBenefits: 99.5 }));
    expect(p).toEqual({ earnings: 0, netIncome: 10000, medicalOOP: 13, programs: { ...NO_PROGRAMS, snap: 124 }, childPrograms: { medicaid: 3211 }, otherBenefits: 100, stateCredits: 0, totalCtc: 0 });
    // The state's modeled premium assistance survives rounding when served, and is absent, not 0, otherwise.
    expect(roundPoint({ ...p, statePremiumAssistance: 907.4 }).statePremiumAssistance).toBe(907);
    expect("statePremiumAssistance" in roundPoint(p)).toBe(false);
  });
});
