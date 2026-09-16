import { describe, it, expect } from "vitest";
import { answersFor, archetypeById, buildCurvePayload, evaluateCurve, PROBE_SENTINEL, maTafdcGrantParts, maTafdcProbePayload, modelVersion, PARENT_LIMITS_UPSTREAM_SINCE, parsePEResponse, probeMaTafdcDoubleCount, releaseAtLeast, requestPE } from "../core/src/index.js";

function probe(state: string, id: string, min: number, max: number, count: number) {
  const answers = answersFor(state, archetypeById(id));
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
    // A model at or past 2.5.2 carries the fix itself (policyengine-us #9475),
    // so the override is a no-op there and fetchCurve stops sending it; an
    // older model still needs it. Either way the corrected answer is the same.
    const upstream = releaseAtLeast(await modelVersion({ timeoutMs: 30_000 }), PARENT_LIMITS_UPSTREAM_SINCE);
    if (upstream) expect(baseline.result.people.you.medicaid["2026"]).toEqual(corrected.result.people.you.medicaid["2026"]);
    else expect(baseline.result.people.you.medicaid["2026"][1]).toBeGreaterThan(0);
    const sent = buildCurvePayload(answersFor("SC", archetypeById("single-2")), { parentLimitsUpstream: upstream }) as { policy?: object };
    expect(sent.policy === undefined).toBe(upstream);
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
    // The credit's size depends on the county's benchmark premium (Kings
    // County now that archetypes carry the state's largest county); the net
    // premium is the applicable-percentage cap on income and is not.
    expect(corrected[1].programs.aca).toBeGreaterThan(5000);
    expect(corrected[1].medicalOOP).toBeCloseTo(2773, -1);
  }, 190_000);

  it("the TAFDC double-count probe is unambiguous: the sentinel is either in household_state_benefits or absent", async () => {
    const body = await call(maTafdcProbePayload());
    const h = body.result.households.household;
    expect(h.household_benefits["2026"]).toBeGreaterThan(PROBE_SENTINEL / 2);
    const stateBenefits = h.household_state_benefits["2026"] as number;
    expect(stateBenefits < 10_000 || stateBenefits > PROBE_SENTINEL - 10_000).toBe(true);
    expect(await probeMaTafdcDoubleCount({ timeoutMs: 90_000 })).toBe(stateBenefits > PROBE_SENTINEL / 2);
  }, 100_000);

  it("supplies enough MA inputs to remove the $26–27k TANF cutoff locally", async () => {
    const { answers, payload } = probe("MA", "married-3", 26000, 27000, 2);
    const doubled = await probeMaTafdcDoubleCount({ timeoutMs: 90_000 });
    const body = await call(payload);
    const points = parsePEResponse(body, 2, { maTafdcDoubleCounted: doubled });
    const ev = evaluateCurve(answers, { year: "2026", currentEarnings: 26000, points }, "live");
    expect(points.map((p) => p.programs.tanf)).toEqual([9880, 0]);
    // `programs.tanf` is the ONGOING grant. The $500-per-child September
    // clothing allowance ($1,500 here) is real cash but not an ongoing
    // program, so it rides in otherBenefits — otherwise "TANF ends" would
    // report the last September a $40 allowance was paid, not the month the
    // grant stopped. Net income below still uses the full $3,972.
    expect(ev.curve.points.map((p) => p.programs.tanf)).toEqual([2472, 1980]);
    const parts = maTafdcGrantParts(26000, 0, points[0].maTafdc!);
    expect(parts.ongoing + parts.septemberExtra).toBe(3972);
    expect(parts.septemberExtra).toBe(1500);
    expect(ev.curve.points.map((p) => p.programs.snap)).toEqual(points.map((p) => p.programs.snap));
    expect(ev.maTafdc?.status).toBe("applied");
    // Upstream's $9,880 grant is replaced by $3,972; on a double-counting
    // model (public API, policyengine-us < 2.4.4) the second copy in
    // household_state_benefits goes too.
    const stateBenefits = body.result.households.household.household_state_benefits["2026"] as number[];
    expect(stateBenefits[0] >= 9880).toBe(doubled);
    expect(points[0].maTafdc?.duplicatedTanf).toBe(doubled ? 9880 : 0);
    expect(ev.curve.points[0].otherBenefits).toBeCloseTo(ev.curve.points[1].otherBenefits, 0);
    expect(ev.curve.points[0].netIncome).toBeCloseTo(points[0].netIncome + 3972 - (doubled ? 2 : 1) * 9880, 2);
    expect(ev.analysis.cliffs).toHaveLength(0);
  }, 100_000);
});
