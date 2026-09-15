import { describe, it, expect } from "vitest";
import { ARCHETYPES, answersFor, buildCurvePayload, evaluateCurve, parsePEResponse, requestPE } from "../core/src/index.js";

function probe(state: string, id: string, min: number, max: number, count: number) {
  const answers = answersFor(state, ARCHETYPES.find((a) => a.id === id)!);
  const payload = buildCurvePayload(answers);
  const household = payload.household as { axes: unknown[][] };
  household.axes[0][0] = { name: "employment_income", min, max, count, period: "2026" };
  return { answers, payload };
}
const call = (payload: unknown) => requestPE(payload, { timeoutMs: 90_000 }) as Promise<any>;

describe.skipIf(process.env.RUN_CONTRACT !== "1")("live policy corrections", () => {
  it("removes South Carolina parent Medicaid at $25,000 and retains children's coverage", async () => {
    const { payload } = probe("SC", "single-2", 18000, 25000, 2);
    const corrected = await call(payload);
    const baseline = await call({ household: payload.household });
    expect(corrected.result.people.you.medicaid["2026"][0]).toBeGreaterThan(0);
    expect(corrected.result.people.you.medicaid["2026"][1]).toBe(0);
    expect(baseline.result.people.you.medicaid["2026"][1]).toBeGreaterThan(0);
    for (const child of ["child1", "child2"]) {
      expect(corrected.result.people[child].medicaid["2026"]).toEqual(baseline.result.people[child].medicaid["2026"]);
      expect(corrected.result.people[child].medicaid["2026"][1]).toBeGreaterThan(0);
    }
  }, 190_000);

  it("uses New York's post-July marketplace treatment above 200% FPL", async () => {
    const { payload } = probe("NY", "single-0", 30000, 36000, 2);
    const corrected = parsePEResponse(await call(payload), 2);
    const baseline = parsePEResponse(await call({ household: payload.household }), 2);
    expect(corrected[0].medicalOOP).toBe(0);
    expect(baseline[1].medicalOOP).toBe(0);
    expect(corrected[1].programs.aca).toBeCloseTo(5387, -1);
    expect(corrected[1].medicalOOP).toBeCloseTo(2773, -1);
  }, 190_000);

  it("supplies enough MA inputs to remove the $26–27k TANF cutoff locally", async () => {
    const { answers, payload } = probe("MA", "married-3", 26000, 27000, 2);
    const body = await call(payload);
    const points = parsePEResponse(body, 2);
    const ev = evaluateCurve(answers, { year: "2026", currentEarnings: 26000, points }, "live");
    expect(points.map((p) => p.programs.tanf)).toEqual([9880, 0]);
    expect(ev.curve.points.map((p) => p.programs.tanf)).toEqual([3972, 3480]);
    expect(ev.curve.points.map((p) => p.programs.snap)).toEqual(points.map((p) => p.programs.snap));
    expect(ev.maTafdc?.status).toBe("applied");
    expect(body.result.households.household.household_state_benefits["2026"]).toEqual([9880, 0]);
    expect(points[0].maTafdc?.duplicatedTanf).toBe(9880);
    expect(ev.curve.points[0].otherBenefits).toBeCloseTo(ev.curve.points[1].otherBenefits, 0);
    expect(ev.curve.points[0].netIncome).toBeCloseTo(points[0].netIncome + 3972 - 2 * 9880, 2);
    expect(ev.analysis.cliffs).toHaveLength(0);
  }, 100_000);
});
