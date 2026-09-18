import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { analyzeCurve } from "./analyze.js";
import { PolicyEngineError } from "./client.js";
import { loadStateFile as loadStateFile_ } from "./data.js";
import { evaluateCurve, evaluateHousehold, evaluateOffline, modeledAnswers } from "./evaluate.js";
import { parsePEResponse } from "./parse.js";
import { axisSpec } from "./translate.js";
import { ESI_EMPLOYEE_CONTRIBUTION, fpl2025, MEDICARE_PART_B_ANNUAL } from "./policyYear.js";
import { reachForArchetype } from "./reachLookup.js";
import { stateDefaults } from "./stateDefaults.js";
import { answersWith, point as pt, respond, type PointOver } from "./testing.js";
import type { CurvePoint, CurveResponse, HouseholdAnswers } from "./types.js";

const fixture = readFileSync(new URL("../../fixtures/pe-ca-single-1kid-101.json", import.meta.url), "utf8");
const fixturePoints = parsePEResponse(JSON.parse(fixture), 101);

const answers = answersWith();

describe("evaluateCurve", () => {
  const curve: CurveResponse = { year: "2026", currentEarnings: 30000, points: fixturePoints };
  const ev = evaluateCurve(answers, curve, "live");

  it("keeps every cliff, labels the Head Start one deferred, and reads the verdict from the real curve", () => {
    // Just past the Head Start step, against the corrected curve (California's
    // premium wrap zeroes the net premium through 150% FPL, which adds a small
    // real cliff where it ends).
    const at31k = evaluateCurve(answers, { year: "2026", currentEarnings: 31000, points: fixturePoints }, "live");
    const direct = analyzeCurve(at31k.curve.points, 31000, { hasChildren: true });
    // Every cliff on the real curve is reported, and the zones are the real
    // curve's: the $30k Head Start loss lands at the next program year, so it
    // is labelled deferred — and still counted (2026-09-17). Until then it was
    // lifted out of the zones, and the trough that runs to $74k here ended at
    // $34k, where only the $31k premium step had to be recovered.
    expect(at31k.analysis.cliffs.map((c) => [c.startEarnings, Math.round(c.drop)])).toEqual(direct.cliffs.map((c) => [c.startEarnings, Math.round(c.drop)]));
    expect(at31k.deferred.map((c) => [c.startEarnings, c.deferral?.reason])).toEqual([[30000, "head_start_program_year"]]);
    expect(at31k.analysis.dangerZones).toEqual(direct.dangerZones);
    expect(at31k.analysis.dangerZones.find((z) => z.startEarnings === 30000)!.endEarnings).toBe(74000);
    expect(at31k.analysis.worstCliff).toBe(at31k.deferred[0]);
    expect(at31k.analysis.verdict).toBe("in_danger_zone");
  });

  it("places current earnings in the state's reach distribution", () => {
    expect(ev.reach.current).toBeTypeOf("number");
    expect(ev.reach.current!).toBeGreaterThanOrEqual(0);
    expect(ev.reach.current!).toBeLessThanOrEqual(100);
  });

  it("gives one minimum-wage framing per cliff, each a positive whole number of hours or null", () => {
    expect(ev.minWage!.cliffs).toHaveLength(ev.analysis.cliffs.length);
    expect(ev.minWage!.cliffs.map((c) => c.startEarnings)).toEqual(ev.analysis.cliffs.map((c) => c.startEarnings));
    for (const { hoursPerWeek } of ev.minWage!.cliffs) {
      if (hoursPerWeek === null) continue;
      expect(Number.isInteger(hoursPerWeek)).toBe(true);
      expect(hoursPerWeek).toBeGreaterThan(0);
    }
  });

  it("reports no safe-exit reach when the curve never has a danger zone", () => {
    // A curve that only ever goes up has safeExitEarnings 0 — "already safe",
    // not an income to locate in a distribution.
    const points = [pt(0, 10000), pt(10000, 15000), pt(20000, 21000)];
    const safe = evaluateCurve(answers, { year: "2026", currentEarnings: 10000, points }, "live");
    expect(safe.escape.safeExitEarnings).toBe(0);
    expect(safe.reach.safeExit).toBeNull();
    expect(safe.reach.current).toBeTypeOf("number");
  });
});

describe("the household a curve models (modeledAnswers)", () => {
  it("is the caller's own answers on the live path and the swept archetype's on the fallback", () => {
    const live = answersWith({ monthlyRent: 999, getsHousing: true });
    expect(modeledAnswers({ answers: live, source: "live" })).toBe(live);
    const swept = modeledAnswers({ answers: live, source: "archetype" });
    // The archetype's shape (single-1: one child, aged 3) at the state's typical rent, with every take-up toggle off.
    expect(swept.state).toBe(live.state);
    expect(swept.childAges).toHaveLength(live.childAges.length);
    expect(swept.monthlyRent).toBe(stateDefaults(live.state).monthlyRent);
    expect(swept.getsHousing).toBe(false);
  });
});

describe("evaluateOffline", () => {
  it("uses the committed archetype curve, clamped to its last sampled point", () => {
    const ev = evaluateOffline(answersWith({ annualEarnings: 999_999 }))!;
    const last = ev.curve.points[ev.curve.points.length - 1].earnings;
    expect(ev.source).toBe("archetype");
    expect(last).toBeGreaterThanOrEqual(150_000);
    expect(ev.curve.currentEarnings).toBe(last);
    expect(ev.analysis.currentEarnings).toBe(last);
  });

  it("returns null when no state file exists", () => {
    // Bypasses validateAnswers on purpose: "ZZ" is exactly what it rejects, and
    // evaluateOffline must still refuse rather than throw.
    expect(evaluateOffline({ ...answers, state: "ZZ" })).toBeNull();
  });
});

describe("state premium assistance from the model", () => {
  it("nets the served amount out of the premium, floors at the premium, and stands down the local ladder", () => {
    const ca = answersWith({ childAges: [], childDisabled: [], annualEarnings: 23000 });
    // The fixture is a CA curve without the amount: the local ladder applies.
    const ladder = evaluateCurve(ca, { year: "2026", currentEarnings: 23000, points: fixturePoints }, "live");
    expect(ladder.statePremiumAssistance).toBeNull();
    // The same curve with the amount served: $500 everywhere, more than the premium at some points.
    const served = fixturePoints.map((p) => ({ ...p, statePremiumAssistance: 500 }));
    const modeled = evaluateCurve(ca, { year: "2026", currentEarnings: 23000, points: served }, "live");
    expect(modeled.premiumWrap).toBeNull();
    expect(modeled.statePremiumAssistance).toMatchObject({ state: "CA", variable: "assigned_ca_premium_subsidy", maxAnnual: 500 });
    for (let i = 0; i < served.length; i++) {
      const before = ladder.curve.points[i]; const after = modeled.curve.points[i];
      // Where the coverage gap zeroed the premium nothing is netted; elsewhere min($500, premium) moves from premium to net income.
      const rawMoop = served[i].coverageGap ? 0 : served[i].medicalOOP;
      const expected = Math.min(500, Math.max(0, rawMoop));
      expect(after.medicalOOP + after.netIncome).toBeCloseTo(before.medicalOOP + before.netIncome, 2);
      if (!before.coverageGap && before.medicalOOP === served[i].medicalOOP) expect(after.medicalOOP).toBeCloseTo(served[i].medicalOOP - expected, 2);
    }
  });
});

describe("unclaimed entitlements", () => {
  it("asks for a second curve only when something is off, and reports what the off programs would pay at today's pay", async () => {
    let requests = 0;
    const axis = axisSpec(answers);
    // The 101-point fixture stretched to the household's axis by repeating its last point.
    const stretch = (v: unknown): unknown =>
      Array.isArray(v) && v.length === 101 ? Array.from({ length: axis.count }, (_, i) => v[Math.min(i, 100)]) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v as object).map(([a, b]) => [a, stretch(b)])) : v;
    const fetchImpl = (async (_url: unknown, init?: RequestInit) => {
      const payload = JSON.parse(init!.body as string);
      // California's premium-assistance probe: answer as the hosted API does.
      if (!payload.household.axes) return new Response(JSON.stringify({ status: "error", message: "Unrecognized household variable" }), { status: 400 });
      requests++;
      // The all-take-up request carries no switch; the household's own request does.
      const off = payload.household.spm_units.spm_unit.takes_up_snap_if_eligible?.["2026"] === false;
      const body = stretch(JSON.parse(fixture)) as any;
      body.result.axes = [[{ name: "employment_income", min: 0, max: axis.max, count: axis.count, period: "2026" }]];
      if (off) for (const k of Object.keys(body.result.spm_units)) body.result.spm_units[k].snap["2026"] = body.result.spm_units[k].snap["2026"].map(() => 0);
      return new Response(JSON.stringify(body), { status: 200 });
    }) as unknown as typeof fetch;
    const on = await evaluateHousehold(answers, { fetchImpl, fallback: false });
    expect(requests).toBe(1);
    expect(on.unclaimed).toEqual([]);
    const off = await evaluateHousehold(answersWith({ annualEarnings: 15000, getsSnap: false, getsWic: false }), { fetchImpl, fallback: false });
    expect(requests).toBe(3);
    // SNAP is off and the fixture pays it at $15k, so it is listed; WIC is off but pays nothing for a 5-year-old.
    const snapAt15k = Math.round(fixturePoints.find((p) => p.earnings === 15000)!.programs.snap ?? 0);
    expect(snapAt15k).toBeGreaterThan(1000);
    expect(off.unclaimed).toEqual([{ program: "snap", annual: snapAt15k }]);
    expect(off.curve.points.every((p) => (p.programs.snap ?? 0) === 0)).toBe(true);
    expect(evaluateOffline(answersWith({ getsSnap: false }))?.unclaimed).toBeNull();
  });
});

describe("evaluateHousehold", () => {
  it("falls back to the archetype curve when PolicyEngine fails", async () => {
    const ev = await evaluateHousehold(answers, { fetchImpl: respond(() => new Response("boom", { status: 500 })) });
    expect(ev.source).toBe("archetype");
    expect(ev.curve.currentEarnings).toBe(30000);
  });

  it("rethrows the live failure when the fallback is off", async () => {
    await expect(
      evaluateHousehold(answers, { fallback: false, fetchImpl: respond(() => new Response("boom", { status: 500 })) }),
    ).rejects.toBeInstanceOf(PolicyEngineError);
  });

  it("takes the fallback's sweep file from the caller's loader, and only asks for it on the fallback path", async () => {
    const fail = respond(() => new Response("boom", { status: 500 }));
    const asked: string[] = [];
    const loadStateFile = async (state: string) => { asked.push(state); return loadStateFile_(state); };
    const ev = await evaluateHousehold(answers, { fetchImpl: fail, loadStateFile });
    expect(ev.source).toBe("archetype");
    expect(asked).toEqual(["CA"]);
    // A loader with nothing to give is "no archetype": the live failure surfaces.
    await expect(evaluateHousehold(answers, { fetchImpl: fail, loadStateFile: async () => null })).rejects.toBeInstanceOf(PolicyEngineError);
    // The live path never asks.
    const cached: CurveResponse = { year: "2026", currentEarnings: 30000, points: fixturePoints };
    asked.length = 0;
    await evaluateHousehold(answers, { cache: { get: () => cached, set: () => {} }, fetchImpl: fail, loadStateFile });
    expect(asked).toEqual([]);
  });

  it("uses the live curve, untouched by archetype data, when the call succeeds", async () => {
    // Served from the cache rather than a fetch stub: the recorded fixture is
    // pinned to the retired 101-point axis, and a cache hit is the live path
    // just the same — fetchCurve returns it without calling PolicyEngine.
    const cached: CurveResponse = { year: "2026", currentEarnings: 30000, points: fixturePoints };
    const cache = { get: () => cached, set: () => {} };
    const ev = await evaluateHousehold(answers, { cache, fetchImpl: respond(() => { throw new Error("must not fetch"); }) });
    expect(ev.source).toBe("live");
    expect(ev.curve.points).toHaveLength(101);
    // Corrections may move netIncome and medicalOOP (the CA premium wrap does
    // here); the program series they never touch must be the fixture's own.
    expect(ev.curve.points.map((p) => [p.earnings, p.programs.snap, p.programs.eitc])).toEqual(fixturePoints.map((p) => [p.earnings, p.programs.snap, p.programs.eitc]));
    // The CA single-1 archetype is a different household (a typical renter in
    // Los Angeles County with a 3-year-old), so a live result must not
    // coincide with it point for point.
    expect(ev.curve.points).not.toEqual(evaluateOffline(answers)!.curve.points);
  });
});

const evaluateOn = (a: HouseholdAnswers, points: CurvePoint[], currentEarnings = points[0].earnings) =>
  evaluateCurve(a, { year: "2026", currentEarnings, points }, "live");

describe("coverage gap (finding 2)", () => {
  // Texas, one parent and one child: the parent is over the state's ~14%-FPL
  // parent limit and under the 100%-FPL subsidy floor, so nothing covers them.
  // 100% FPL for a household of two on the 2025 guidelines is $21,150.
  const txAnswers = answersWith({ state: "TX", annualEarnings: 10000 });
  const gapPoint = (earnings: number, over: PointOver = {}) =>
    pt(earnings, 20000, { medicalOOP: 7000, programs: { medicaid: 5000 }, childPrograms: { medicaid: 5000 }, ...over });

  it("drops the phantom premium and flags the band when nothing covers the adult", () => {
    const points = [gapPoint(10000), gapPoint(25000)];
    const ev = evaluateOn(txAnswers, points);
    expect(fpl2025("TX", 2)).toBe(21_150);
    expect(ev.curve.points[0]).toMatchObject({ coverageGap: true, medicalOOP: 0, netIncome: 27000 });
    // $25,000 is over the poverty line, so a subsidy exists there: not a gap.
    expect(ev.curve.points[1]).toMatchObject({ coverageGap: false, medicalOOP: 7000, netIncome: 20000 });
    expect(ev.coverageGap).toEqual({ fromEarnings: 10000, toEarnings: 10000 });
  });

  it("does not trigger when the adult has Medicaid, has a subsidy, has employer coverage, or pays nothing", () => {
    const cases: [string, HouseholdAnswers, CurvePoint][] = [
      ["adult on Medicaid", txAnswers, gapPoint(10000, { programs: { medicaid: 16000 }, childPrograms: { medicaid: 5000 } })],
      ["has a premium subsidy", txAnswers, gapPoint(10000, { programs: { medicaid: 5000, aca: 4000 } })],
      ["employer coverage", answersWith({ state: "TX", hasEmployerCoverage: true }), gapPoint(10000)],
      ["pays no premium", txAnswers, gapPoint(10000, { medicalOOP: 0 })],
    ];
    for (const [why, a, point] of cases) {
      const ev = evaluateOn(a, [point, gapPoint(25000)]);
      expect(ev.coverageGap, why).toBeNull();
    }
  });

  it("counts spouse pay and MAGI income (unemployment, SSDI) against the poverty line", () => {
    // Same $10k of the householder's earnings, but $15k of unemployment puts
    // the household over the line for two — no gap.
    const withUi = answersWith({ state: "TX", annualEarnings: 10000, unemploymentMonthly: 1250 });
    expect(evaluateOn(withUi, [gapPoint(10000), gapPoint(25000)]).coverageGap).toBeNull();
  });

  it("does not count child support: it is not in MAGI, so it cannot move the subsidy floor", () => {
    // IRC §36B(d)(2)(B). Counting it ended the gap band $4,800 early and put
    // the phantom premium back between the two lines.
    const withSupport = answersWith({ state: "TX", annualEarnings: 10000, childSupportMonthly: 1250 });
    expect(evaluateOn(withSupport, [gapPoint(10000), gapPoint(25000)]).coverageGap).toEqual({ fromEarnings: 10000, toEarnings: 10000 });
  });

  it("withholds both the gap verdict and the per-age split on a curve swept before childPrograms existed", () => {
    // Committed archetype curves predate the field. Treating a missing split
    // as "no child programs" would hand the child's Medicaid to the parent —
    // the exact conflation finding 4 is about — so nothing is asserted until
    // the next sweep records it.
    const legacy = [gapPoint(10000), gapPoint(25000), gapPoint(40000, { programs: {} })].map((p) => {
      const { childPrograms, ...rest } = p;
      return rest as unknown as CurvePoint;
    });
    const ev = evaluateCurve(txAnswers, { year: "2026", currentEarnings: 10000, points: legacy }, "archetype");
    expect(ev.coverageGap).toBeNull();
    expect(ev.escape.programEndsByAge).toEqual({ adults: {}, children: {} });
    expect(ev.escape.childCoverageEndEarnings).toBeNull();
    // Everything that does not need the split still works: the household-total
    // threshold, and the premium left exactly as PolicyEngine reported it.
    expect(ev.escape.programEnds.medicaid).toBe(25000);
    expect(ev.curve.points[0].medicalOOP).toBe(7000);
  });

  it("applies to the archetype curve too, where the other corrections do not", () => {
    const ev = evaluateCurve(txAnswers, { year: "2026", currentEarnings: 10000, points: [gapPoint(10000), gapPoint(25000)] }, "archetype");
    expect(ev.coverageGap).toEqual({ fromEarnings: 10000, toEarnings: 10000 });
  });
});

describe("steady non-means-tested income is not \"other benefits\"", () => {
  it("removes child support and unemployment from otherBenefits so benefits-end can still fire", () => {
    const a = answersWith({ childSupportMonthly: 300, unemploymentMonthly: 100 });
    const ev = evaluateOn(a, [pt(0, 20000, { otherBenefits: 4800 }), pt(50000, 40000, { otherBenefits: 4800 })]);
    expect(ev.curve.points.map((p) => p.otherBenefits)).toEqual([0, 0]);
    expect(ev.escape.benefitsEndEarnings).toBeNull(); // nothing means-tested was ever paid
  });
});

describe("employer coverage (finding 5)", () => {
  const esiAnswers = answersWith({ hasEmployerCoverage: true, annualEarnings: 30000 });

  it("replaces PolicyEngine's marketplace premium with the MEPS-IC employee contribution", () => {
    const ev = evaluateOn(esiAnswers, [pt(0, 20000), pt(30000, 40000, { medicalOOP: 5000 })]);
    // One parent, one uncovered child: a two-person plan, not a family one.
    expect(ev.curve.points[1].medicalOOP).toBe(ESI_EMPLOYEE_CONTRIBUTION.plusOne);
    // The phantom premium comes back into the money line, the real one goes out.
    expect(ev.curve.points[1].netIncome).toBe(40000 + 5000 - ESI_EMPLOYEE_CONTRIBUTION.plusOne);
  });

  it("uses the single rate for a childless unmarried household", () => {
    const single = answersWith({ hasEmployerCoverage: true, childAges: [], childDisabled: [] });
    const ev = evaluateOn(single, [pt(0, 20000), pt(30000, 40000, { medicalOOP: 5000 })]);
    expect(ev.curve.points[1].medicalOOP).toBe(ESI_EMPLOYEE_CONTRIBUTION.single);
  });

  it("charges by who the plan has to cover, not by whether PolicyEngine charged a premium", () => {
    const adultOnMedicaid = pt(30000, 40000, { medicalOOP: 0, programs: { medicaid: 5000 } });
    const kidsOnMedicaid = pt(30000, 40000, { medicalOOP: 0, programs: { medicaid: 5000 }, childPrograms: { medicaid: 5000 } });
    const nobodyCovered = pt(30000, 40000, { medicalOOP: 0 });
    const ev = evaluateOn(esiAnswers, [pt(0, 20000, { medicalOOP: 0 }), adultOnMedicaid, kidsOnMedicaid, nobodyCovered]);
    expect(ev.curve.points.map((p) => p.medicalOOP)).toEqual([
      0,                                  // no job, no payroll deduction
      0,                                  // the adult is on Medicaid, not buying the plan
      ESI_EMPLOYEE_CONTRIBUTION.single,   // unmarried parent, child on Medicaid: covers herself
      ESI_EMPLOYEE_CONTRIBUTION.plusOne,  // nobody else covers the child: a two-person plan
    ]);
    expect(ev.curve.points[3].netIncome).toBe(40000 - ESI_EMPLOYEE_CONTRIBUTION.plusOne);
  });

  it("puts a married couple whose child is on Medicaid on the employee-plus-one tier", () => {
    // The old rule charged them the family tier because a spouse still needed
    // covering; MEPS-IC publishes a two-person price, and this is it.
    const married = answersWith({ hasEmployerCoverage: true, married: true, spouseAge: 30 });
    const ev = evaluateOn(married, [pt(0, 20000, { medicalOOP: 0 }), pt(30000, 40000, { medicalOOP: 0, programs: { medicaid: 5000 }, childPrograms: { medicaid: 5000 } })]);
    expect(ev.curve.points[1].medicalOOP).toBe(ESI_EMPLOYEE_CONTRIBUTION.plusOne);
  });

  it("reaches the family tier once the plan has to cover three people", () => {
    const married = answersWith({ hasEmployerCoverage: true, married: true, spouseAge: 30, childAges: [5, 9], childDisabled: [false, false] });
    const ev = evaluateOn(married, [pt(0, 20000, { medicalOOP: 0 }), pt(30000, 40000, { medicalOOP: 0 })]);
    expect(ev.curve.points[1].medicalOOP).toBe(ESI_EMPLOYEE_CONTRIBUTION.family);
  });

  it("charges the householder whose disabled spouse — not the householder — holds the Medicaid", () => {
    // The old guard read "any adult on Medicaid" as "nobody pays". A married
    // pair shares one MAGI, so they gain and lose Medicaid together EXCEPT
    // through the SSI-linked disability pathway, which covers one and not the
    // other; the working householder is still buying the plan.
    const spouseDisabled = answersWith({ hasEmployerCoverage: true, married: true, spouseAge: 30, spouseDisabled: true, childAges: [], childDisabled: [] });
    const youDisabled = answersWith({ hasEmployerCoverage: true, married: true, spouseAge: 30, youDisabled: true, childAges: [], childDisabled: [] });
    const onMedicaid = pt(30000, 40000, { medicalOOP: 0, programs: { medicaid: 9000 } });
    expect(evaluateOn(spouseDisabled, [pt(0, 20000), onMedicaid]).curve.points[1].medicalOOP)
      .toBe(ESI_EMPLOYEE_CONTRIBUTION.single);
    // The householder is the covered one: nobody pays for a plan they hold.
    expect(evaluateOn(youDisabled, [pt(0, 20000), onMedicaid]).curve.points[1].medicalOOP).toBe(0);
  });

  it("charges nothing below 30 hours a week, and charges when the hours were never asked", () => {
    // 26 U.S.C. 4980H(c)(4)(A) — below full time there is usually no plan to
    // be enrolled in. "Not asked" must not be read as "part-time".
    const points = [pt(0, 20000), pt(30000, 40000, { medicalOOP: 5000 })];
    const partTime = answersWith({ hasEmployerCoverage: true, hoursPerWeek: 20 });
    expect(evaluateOn(partTime, points).curve.points[1]).toMatchObject({ medicalOOP: 5000, netIncome: 40000 });
    expect(evaluateOn(partTime, points).esi).toEqual({ tier: null, annualContribution: 0 });
    const fullTime = answersWith({ hasEmployerCoverage: true, hoursPerWeek: 30 });
    expect(evaluateOn(fullTime, points).curve.points[1].medicalOOP).toBe(ESI_EMPLOYEE_CONTRIBUTION.plusOne);
    const unasked = answersWith({ hasEmployerCoverage: true, hoursPerWeek: null });
    expect(evaluateOn(unasked, points).curve.points[1].medicalOOP).toBe(ESI_EMPLOYEE_CONTRIBUTION.plusOne);
  });

  it("reports the tier and charge at this household's own pay", () => {
    const ev = evaluateOn(esiAnswers, [pt(0, 20000), pt(30000, 40000, { medicalOOP: 5000 })], 30000);
    expect(ev.esi).toEqual({ tier: "plusOne", annualContribution: ESI_EMPLOYEE_CONTRIBUTION.plusOne });
    expect(evaluateOn(answersWith(), [pt(0, 20000), pt(30000, 40000)]).esi).toBeNull();
  });

  it("leaves a household without employer coverage alone", () => {
    const ev = evaluateOn(answersWith(), [pt(0, 20000), pt(30000, 40000, { medicalOOP: 5000 })]);
    expect(ev.curve.points[1]).toMatchObject({ medicalOOP: 5000, netIncome: 40000 });
  });
});

describe("Head Start (finding 9)", () => {
  const points = () => [pt(0, 40000, { programs: { headstart: 22285 }, childPrograms: { headstart: 22285 } }), pt(30000, 45000)];
  const caPreschool = stateDefaults("CA").monthlyChildcarePreschool;

  it("values the slot at what it would cost to replace in this state", () => {
    // A family reporting $600 a month still gets a full-day place; what the
    // slot replaces is the market price of that place, not their current bill.
    const a = answersWith({ getsHeadStart: true, monthlyChildcare: 600 });
    const ev = evaluateOn(a, points());
    expect(caPreschool).toBeGreaterThan(600);
    expect(ev.curve.points[0].programs.headstart).toBe(12 * caPreschool);
    expect(ev.curve.points[0].childPrograms.headstart).toBe(12 * caPreschool);
    expect(ev.curve.points[0].netIncome).toBe(40000 - (22285 - 12 * caPreschool));
    expect(ev.headStart).toEqual({
      stickerValue: 22285, replacementValue: 12 * caPreschool,
      monthlyReplacementCost: caPreschool, usesStateMarketPrice: true, deferred: true,
    });
  });

  it("is still worth a full-day place to a family that reports paying nothing", () => {
    // The old cap handed $0 to exactly the family the slot helps most — a
    // family pays $0 BECAUSE the Head Start place is full-day and free.
    const ev = evaluateOn(answersWith({ getsHeadStart: true, monthlyChildcare: null }), points());
    expect(ev.curve.points[0].programs.headstart).toBe(12 * caPreschool);
    expect(ev.headStart).toMatchObject({ replacementValue: 12 * caPreschool, usesStateMarketPrice: true });
  });

  it("uses the family's own bill when it is above the state's market price", () => {
    const a = answersWith({ getsHeadStart: true, monthlyChildcare: 1500 });
    const ev = evaluateOn(a, points());
    expect(1500).toBeGreaterThan(caPreschool);
    expect(ev.headStart).toMatchObject({
      replacementValue: 18000, monthlyReplacementCost: 1500, usesStateMarketPrice: false,
    });
  });

  it("never revalues upward past the sticker", () => {
    const ev = evaluateOn(answersWith({ getsHeadStart: true, monthlyChildcare: 8000 }), points());
    expect(ev.curve.points[0].programs.headstart).toBe(22285);
    expect(ev.curve.points[0].netIncome).toBe(40000);
    expect(ev.headStart).toMatchObject({ replacementValue: 22285 });
  });

  it("reports nothing for a family that does not get Head Start", () => {
    expect(evaluateOn(answersWith(), points()).headStart).toBeNull();
    expect(evaluateOn(answersWith({ getsHeadStart: true }), [pt(0, 40000), pt(30000, 45000)]).headStart).toBeNull();
  });
});

describe("deferred losses count, and carry their label", () => {
  // The same shape three times: a $18,000 fall at $20,000 that the curve only
  // climbs back out of at $50,000. Since 2026-09-17 that is a hole the
  // household has to leap whether or not the loss arrives with the raise: the
  // family will lose the money, and the deferral is the label that says when.
  // (From 2026-09-15 to 2026-09-17 the deferred reading lifted the drop out and
  // these households read always_up with a leap of $0.)
  const withCliff = (over: PointOver, after: PointOver = {}) => [
    pt(0, 40000, over), pt(10000, 45000, over), pt(20000, 27000, after),
    pt(30000, 33000, after), pt(40000, 39000, after), pt(50000, 46000, after),
  ];
  // The same fall with nothing to defer it: SNAP ending.
  const snapCliff = withCliff({ programs: { snap: 4000 } });

  it("gives a Head Start household the leap the same fall gives a SNAP household", () => {
    const a = answersWith({ getsHeadStart: true, monthlyChildcare: 1200, annualEarnings: 10000 });
    const hs = { programs: { headstart: 12000 }, childPrograms: { headstart: 12000 } };
    const ev = evaluateOn(a, withCliff(hs), 10000);
    const control = evaluateOn(answersWith({ annualEarnings: 10000 }), snapCliff, 10000);
    expect(control.deferred).toEqual([]);
    expect(ev.escape.leap).toBe(control.escape.leap);
    expect(ev.escape.leap).toBe(40000);
    expect(ev.escape.safeExitEarnings).toBe(50000);
    expect(ev.analysis.dangerZones).toEqual(control.analysis.dangerZones);
    expect(ev.analysis.verdict).toBe(control.analysis.verdict);
    expect(ev.analysis.verdict).toBe("cliff_ahead");
    // The cliff is the worst one, and it is the same object `deferred` lists, with what carries them past it.
    expect(ev.analysis.worstCliff).toMatchObject({ startEarnings: 10000, endEarnings: 20000, drop: 18000 });
    expect(ev.deferred).toEqual([ev.analysis.worstCliff]);
    expect(ev.analysis.nextCliff).toBe(ev.analysis.worstCliff);
    expect(ev.deferred[0].deferral).toEqual({
      reason: "head_start_program_year",
      until: expect.stringContaining("45 CFR 1302.12(j)(1)"),
      complete: true,
    });
  });

  it("labels a child's CHIP end by the 12-month continuous-eligibility rule, and counts it", () => {
    const covered = { programs: { chip: 4000 }, childPrograms: { chip: 4000 } };
    const ev = evaluateOn(answersWith({ annualEarnings: 30000 }), withCliff(covered, { medicalOOP: 5000 }), 30000);
    expect(ev.deferred.map((c) => c.deferral!.reason)).toEqual(["child_continuous_eligibility"]);
    expect(ev.escape.leap).toBe(40000);
    expect(ev.analysis.verdict).toBe("in_danger_zone");
    expect(ev.personal).toMatchObject({ escapeEarnings: 50000, raiseToClear: 20000, raiseIsLowerBound: false });
  });

  it("labels a parent's Medicaid end in a non-expansion state by transitional Medical Assistance", () => {
    // Texas, one parent one child: the parent is cut off far below the child.
    const tx = answersWith({ state: "TX", annualEarnings: 30000 });
    const covered = { programs: { medicaid: 15000, chip: 3000 }, childPrograms: { medicaid: 6000, chip: 3000 } };
    const after = { programs: { medicaid: 6000, chip: 3000 }, childPrograms: { medicaid: 6000, chip: 3000 }, medicalOOP: 5000 };
    const ev = evaluateOn(tx, withCliff(covered, after), 30000);
    expect(ev.deferred.map((c) => c.deferral!.reason)).toEqual(["transitional_medical_assistance"]);
    expect(ev.deferred[0].deferral!.until).toContain("42 U.S.C. 1396r-6");
    // A childless adult in the same state gets no §1925 continuation: the same
    // fall, unlabelled — and the same leap, because the label changes nothing else.
    const childless = answersWith({ state: "TX", childAges: [], childDisabled: [], annualEarnings: 30000 });
    const soloCovered = { programs: { medicaid: 9000 } };
    const soloAfter = { programs: {}, medicalOOP: 5000 };
    const solo = evaluateOn(childless, withCliff(soloCovered, soloAfter), 30000);
    expect(solo.deferred).toEqual([]);
    expect(solo.escape.leap).toBe(40000);
    expect(ev.escape.leap).toBe(40000);
  });

  it("reads a deferred cliff below an immediate one as one trough, and the worst as the bigger of the two", () => {
    const hs = { programs: { headstart: 12000 }, childPrograms: { headstart: 12000 } };
    const points = [
      pt(0, 40000, hs), pt(10000, 45000, hs),
      pt(20000, 27000, {}),                       // deferred: Head Start ended here
      pt(30000, 33000, { programs: { snap: 4000 } }),
      pt(40000, 28000, {}),                       // immediate: SNAP ends
      pt(50000, 60000, {}),
    ];
    const a = answersWith({ getsHeadStart: true, monthlyChildcare: 1200, annualEarnings: 35000 });
    const ev = evaluateOn(a, points, 35000);
    expect(ev.analysis.cliffs.map((c) => c.startEarnings)).toEqual([10000, 30000]);
    expect(ev.deferred.map((c) => c.startEarnings)).toEqual([10000]);
    expect(ev.analysis.worstCliff).toMatchObject({ startEarnings: 10000, drop: 18000, programsLost: ["headstart"] });
    // The curve never climbs back past its $45,000 peak until $50,000: one zone, one leap.
    expect(ev.analysis.dangerZones).toEqual([{ startEarnings: 10000, endEarnings: 50000, peakNet: 45000 }]);
    expect(ev.escape.leap).toBe(40000);
    expect(ev.analysis.currentNet).toBe(30500);
  });

  it("will not label a parent's Medicaid end on a curve that cannot say who held it", () => {
    // Committed curves swept before childPrograms existed. Treating the split
    // as empty would hand every child's Medicaid to the parent and then label
    // the cliff under §1925 — the same conflation the coverage-gap guard
    // refuses to make. The label is a claim about the rule, so it is withheld.
    const covered = { programs: { medicaid: 15000 } };
    const after = { programs: {}, medicalOOP: 5000 };
    const legacy = withCliff(covered, after).map((p) => {
      const { childPrograms: _, ...rest } = p;
      return rest as unknown as CurvePoint;
    });
    const ev = evaluateCurve(answersWith({ annualEarnings: 30000 }), { year: "2026", currentEarnings: 30000, points: legacy }, "archetype");
    expect(ev.deferred).toEqual([]);
    expect(ev.analysis.cliffs).toHaveLength(1);
  });

  it("leaves a curve with nothing deferred exactly as it was", () => {
    const points = [pt(0, 40000, { programs: { snap: 4000 } }), pt(10000, 45000, { programs: { snap: 4000 } }), pt(20000, 27000), pt(30000, 46000)];
    const ev = evaluateOn(answersWith({ annualEarnings: 10000 }), points, 10000);
    expect(ev.deferred).toEqual([]);
    expect(ev.analysis.cliffs).toHaveLength(1);
    expect(ev.escape.leap).toBe(20000);
  });
});

describe("SSDI and Medicare", () => {
  const ssdi = (over: Partial<Record<string, unknown>> = {}) =>
    answersWith({ ssdiMonthly: 1500, youDisabled: true, annualEarnings: 30000, ...over });
  const uncoveredKid = { medicalOOP: 6000, programs: { chip: 0 } };
  const coveredKid = { medicalOOP: 6000, programs: { chip: 4000 }, childPrograms: { chip: 4000 } };

  it("takes the marketplace premium off a lone beneficiary and charges Part B instead", () => {
    // Medicare entitlement starts 24 months in and runs at least 93 months
    // past a trial work period (42 U.S.C. 426(b)): no coverage cliff at SGA.
    const ev = evaluateOn(ssdi({ childAges: [], childDisabled: [] }), [
      pt(0, 20000, { medicalOOP: 0 }),
      pt(30000, 40000, { medicalOOP: 6000, programs: { aca: 4000 } }),
    ], 30000);
    expect(ev.curve.points[1].medicalOOP).toBe(MEDICARE_PART_B_ANNUAL);
    expect(ev.curve.points[1].netIncome).toBe(40000 + 6000 - MEDICARE_PART_B_ANNUAL);
    // The credit is not inside net income, so zeroing it moves no money — it
    // stops the reports claiming a Medicare household's subsidy ended.
    expect(ev.curve.points[1].programs.aca).toBe(0);
    expect(ev.escape.programEnds.aca).toBeUndefined();
  });

  it("charges no Part B where the adult is on Medicaid, HotGap's stand-in for a Medicare Savings Program", () => {
    const ev = evaluateOn(ssdi({ childAges: [], childDisabled: [] }), [
      pt(0, 20000, { medicalOOP: 0, programs: { medicaid: 9000 } }),
      pt(30000, 40000, { medicalOOP: 6000 }),
    ], 30000);
    expect(ev.curve.points[0].medicalOOP).toBe(0);
    expect(ev.curve.points[1].medicalOOP).toBe(MEDICARE_PART_B_ANNUAL);
  });

  it("only takes the household premium when the beneficiary is the only one who needs a plan", () => {
    // One parent, one child on CHIP: the premium is the parent's, so it goes.
    const covered = evaluateOn(ssdi(), [pt(0, 20000, { medicalOOP: 0 }), pt(30000, 40000, coveredKid)], 30000);
    expect(covered.curve.points[1].medicalOOP).toBe(MEDICARE_PART_B_ANNUAL);
    // The same household once the child is off CHIP: the premium covers the
    // child too and HotGap cannot split it, so it stands and Part B is added.
    const shared = evaluateOn(ssdi(), [pt(0, 20000, { medicalOOP: 0 }), pt(30000, 40000, uncoveredKid)], 30000);
    expect(shared.curve.points[1].medicalOOP).toBe(6000 + MEDICARE_PART_B_ANNUAL);
    expect(shared.curve.points[1].netIncome).toBe(40000 - MEDICARE_PART_B_ANNUAL);
    // …and so does a married household, whose spouse still needs the plan.
    const married = evaluateOn(ssdi({ married: true, spouseAge: 30, childAges: [], childDisabled: [] }), [
      pt(0, 20000, { medicalOOP: 0 }), pt(30000, 40000, { medicalOOP: 6000, programs: { aca: 4000 } }),
    ], 30000);
    expect(married.curve.points[1].medicalOOP).toBe(6000 + MEDICARE_PART_B_ANNUAL);
    expect(married.curve.points[1].programs.aca).toBe(4000);
  });

  it("never puts a Medicare household in the marketplace coverage gap", () => {
    // A lone Texas beneficiary below the poverty line has Medicare, so the
    // gap rule must not fire and hand them back the Part B premium as cash.
    const tx = ssdi({ state: "TX", childAges: [], childDisabled: [], annualEarnings: 10000 });
    const ev = evaluateOn(tx, [pt(10000, 20000, { medicalOOP: 6000 }), pt(25000, 30000, { medicalOOP: 6000 })], 10000);
    expect(ev.coverageGap).toBeNull();
    expect(ev.curve.points[0].medicalOOP).toBe(MEDICARE_PART_B_ANNUAL);
  });

  it("leaves a household with employer coverage alone, and one without SSDI alone", () => {
    const esi = evaluateOn(ssdi({ hasEmployerCoverage: true, childAges: [], childDisabled: [] }), [
      pt(0, 20000, { medicalOOP: 0 }), pt(30000, 40000, { medicalOOP: 6000 }),
    ], 30000);
    expect(esi.curve.points[1].medicalOOP).toBe(ESI_EMPLOYEE_CONTRIBUTION.single);
    const noSsdi = evaluateOn(answersWith(), [pt(0, 20000), pt(30000, 40000, { medicalOOP: 6000 })], 30000);
    expect(noSsdi.curve.points[1].medicalOOP).toBe(6000);
  });
});

describe("personal escape (finding 8)", () => {
  // One zone from $10k to $40k, then clear.
  const zoned = [pt(0, 20000), pt(10000, 30000), pt(20000, 22000), pt(30000, 28000), pt(40000, 34000)];

  it("reports the zone containing this household's pay and the raise out of it", () => {
    const ev = evaluateOn(answersWith({ annualEarnings: 25000 }), zoned, 25000);
    expect(ev.personal.zone).toMatchObject({ startEarnings: 10000, endEarnings: 40000 });
    expect(ev.personal.escapeEarnings).toBe(40000);
    expect(ev.personal.raiseToClear).toBe(15000);
    expect(ev.personal.raiseIsLowerBound).toBe(false);
  });

  it("reports nothing when the household is already clear of every zone", () => {
    const ev = evaluateOn(answersWith({ annualEarnings: 5000 }), zoned, 5000);
    // …except what the next stretch pays: $10,000 more earnings, $10,000 more
    // money, so every dollar of it is kept. A household clear of every zone
    // still has a keep rate (Plan 9).
    expect(ev.personal).toEqual({ zone: null, escapeEarnings: null, raiseToClear: null, raiseIsLowerBound: false, keepNext: { over: 10000, kept: 1 } });
  });

  it("measures the keep rate over the next stretch: flat on a plateau, negative across a cliff", () => {
    const plateau = [pt(0, 20000), pt(10000, 30000), pt(20000, 30000), pt(30000, 30000), pt(40000, 34000)];
    expect(evaluateOn(answersWith({ annualEarnings: 10000 }), plateau, 10000).personal.keepNext).toEqual({ over: 10000, kept: 0 });
    // The $10k → $20k step of `zoned` loses $8,000 while earning $10,000.
    expect(evaluateOn(answersWith({ annualEarnings: 10000 }), zoned, 10000).personal.keepNext).toEqual({ over: 10000, kept: -0.8 });
    // Nothing left of the axis to look ahead over.
    expect(evaluateOn(answersWith({ annualEarnings: 40000 }), zoned, 40000).personal.keepNext).toBeNull();
  });

  it("gives a lower bound when the zone never recovers inside the axis", () => {
    const open = [pt(0, 20000), pt(10000, 30000), pt(20000, 22000), pt(30000, 25000), pt(40000, 26000)];
    const ev = evaluateOn(answersWith({ annualEarnings: 25000 }), open, 25000);
    expect(ev.personal.escapeEarnings).toBeNull();
    expect(ev.personal.raiseIsLowerBound).toBe(true);
    expect(ev.personal.raiseToClear).toBe(15000); // to the top of the sweep, at least
  });
});

describe("the road out of poverty, and where each cliff stands (Plan 9)", () => {
  const ev = evaluateCurve(answers, { year: "2026", currentEarnings: 30000, points: fixturePoints }, "live");

  it("gives every cliff its position on the reach ladder, rising with earnings", () => {
    const positions = ev.analysis.cliffs.map((c) => c.position);
    expect(positions.some((p) => p === null)).toBe(false);
    // Monotone because the ladder is: a cliff further up the axis has more
    // families below it, whatever its size. This is the fact the whole-axis
    // headline could not see — the tallest wall is usually the emptiest.
    expect(positions).toEqual([...(positions as number[])].sort((a, b) => a - b));
    expect(positions.at(-1)!).toBeGreaterThan(positions[0]!);
    for (const c of ev.analysis.cliffs) {
      expect(c.position).toBe(reachForArchetype("CA", "single-1", c.startEarnings));
    }
    // worstCliff, nextCliff and deferred are entries of cliffs, not copies,
    // so they carry the position without a second pass.
    expect(ev.analysis.worstCliff!.position).toBe(ev.analysis.cliffs.find((c) => c === ev.analysis.worstCliff)!.position);
    expect(ev.analysis.worstCliff!.position).toBeTypeOf("number");
    expect(ev.deferred.every((c) => typeof c.position === "number")).toBe(true);
  });

  it("carries this household's road, the keep rate over it, and the cliffs on it", () => {
    // A single parent of one: $21,150 for two in 2025, so the road starts at
    // $21,000 and its last step is the one out of $43,000 — the first sampled
    // point at or above twice the guideline, where a limit sitting on that
    // line can only be placed (road.ts, grid resolution).
    expect(ev.road).toMatchObject({ lo: 21000, hiStart: 43000, hi: 44000 });
    const netAt = (e: number) => ev.analysis.points.find((p) => p.earnings === e)!.netIncome;
    expect(ev.road!.keepRate).toBeCloseTo((netAt(44000) - netAt(21000)) / 23000, 10);
    expect(ev.road!.cliffs).toEqual(ev.analysis.cliffs.filter((c) => c.startEarnings >= 21000 && c.startEarnings <= 43000));
    expect(ev.road!.worst).toBe(ev.road!.cliffs.reduce((w, c) => (c.drop > w.drop ? c : w)));
    expect(ev.road!.familiesBelowHi).toBe(reachForArchetype("CA", "single-1", 44000));
  });

  it("is null when the road runs off the end of the axis", () => {
    expect(evaluateOn(answers, [pt(0, 20000), pt(10000, 25000)]).road).toBeNull();
  });

  it("reads the archetype path's road off the household the curve models, not the caller's", () => {
    // Five children fall back to the three-child curve, so the road is the
    // swept family's: $32,150 for four, not $43,150 for six.
    const big = answersWith({ childAges: [1, 2, 3, 4, 5], childDisabled: [false, false, false, false, false] });
    const offline = evaluateOffline(big)!;
    expect(offline.road).toMatchObject({ lo: 32000, hiStart: 65000, hi: 66000 });
    expect(offline.analysis.cliffs.every((c) => c.position === reachForArchetype("CA", "single-3", c.startEarnings))).toBe(true);
  });
});

describe("reach guard looks at the household, not the householder alone", () => {
  it("still places a household living on the spouse's wages", () => {
    const a = answersWith({ married: true, spouseAge: 30, spouseAnnualEarnings: 50000, annualEarnings: 0 });
    const ev = evaluateOn(a, [pt(0, 30000), pt(50000, 60000)]);
    expect(ev.reach.current).toBeTypeOf("number");
  });
});

describe("reach uses householder-plus-spouse earnings", () => {
  const couple = (spouseAnnualEarnings: number) =>
    answersWith({ married: true, spouseAge: 30, annualEarnings: 30000, spouseAnnualEarnings });
  const points = [pt(0, 20000), pt(30000, 40000)];

  it("places a two-earner household by the pair's combined pay", () => {
    // Both are two-earner couples, so both are measured against the same
    // ladder and the only thing that moves is the money. Comparing a one-earner
    // couple with a two-earner one would change the yardstick as well as the
    // income, and would be a test of the archetype split, not of the sum.
    const low = evaluateOn(couple(5000), points, 30000);
    const high = evaluateOn(couple(45000), points, 30000);
    expect(high.reach.current!).toBeGreaterThan(low.reach.current!);
    expect(high.reach.current).toBe(reachForArchetype("CA", "married-dual-1", 75000));
  });

  it("measures a one-earner couple against one-earner couples, not against every couple", () => {
    // The two curves model different households — one pay with a parent at
    // home, or two pays and a childcare bill — so they are read off different
    // ladders. A couple living on one wage compared against every couple, most
    // of them two-earner, reads as poorer than it is against its own kind.
    expect(evaluateOn(couple(0), points, 30000).reach.current)
      .toBe(reachForArchetype("CA", "married-1", 30000));
  });
});

describe("Head Start and a childcare subsidy together", () => {
  it("values Head Start only for the part of the bill the subsidy does not already pay", () => {
    const p = (earnings: number, subsidy: number) => pt(earnings, 40000, { programs: { headstart: 20000, childcare: subsidy }, childPrograms: { headstart: 20000 } });
    const a = answersWith({ getsHeadStart: true, getsChildcareSubsidy: true, monthlyChildcare: 800, childAges: [3], childDisabled: [false] });
    const alone = evaluateCurve(a, { year: "2026", currentEarnings: 20000, points: [p(20000, 0), p(30000, 0)] }, "live");
    const both = evaluateCurve(a, { year: "2026", currentEarnings: 20000, points: [p(20000, 9000), p(30000, 9000)] }, "live");
    const valued = (ev: ReturnType<typeof evaluateCurve>) => ev.curve.points[0].netIncome - 40000 + 20000; // net change vs the $20k sticker
    expect(valued(both)).toBe(Math.max(0, valued(alone) - 9000));
  });
});

describe("state premium wraps", () => {
  const enrollee = (earnings: number, moop: number, over: PointOver = {}) => pt(earnings, 30000 - moop, { medicalOOP: moop, programs: { aca: 4000 }, ...over });
  const single = (state: string, annualEarnings = 23000) => answersWith({ state, childAges: [], childDisabled: [], annualEarnings });

  it("zeroes the premium inside the $0 band on the archetype path too", () => {
    // CT single at $23,000 is 147% FPL: inside Covered Connecticut's 175% band.
    const ev = evaluateCurve(single("CT"), { year: "2026", currentEarnings: 23000, points: [enrollee(20000, 900), enrollee(23000, 907), enrollee(30000, 1200)] }, "archetype");
    expect(ev.curve.points.map((p) => p.medicalOOP)).toEqual([0, 0, 1200]); // $30k = 192%: outside
    expect(ev.premiumWrap?.state).toBe("CT");
  });

  it("caps the premium at the state's next tier just above the $0 band instead of stepping to the federal net premium", () => {
    // MA single at $25,000 = 160% FPL: Plan Type 2B, $53/month.
    const ma = evaluateCurve(single("MA"), { year: "2026", currentEarnings: 25000, points: [enrollee(23000, 900), enrollee(25000, 1500)] }, "archetype");
    expect(ma.curve.points.map((p) => p.medicalOOP)).toEqual([0, 636]);
    // CA single at $24,300 ≈ 155% FPL: 3.19%→3.91% of MAGI, about 3.43% here.
    const ca = evaluateCurve(single("CA"), { year: "2026", currentEarnings: 24300, points: [enrollee(23000, 900), enrollee(24300, 1500)] }, "archetype");
    expect(ca.curve.points[1].medicalOOP).toBeGreaterThan(800);
    expect(ca.curve.points[1].medicalOOP).toBeLessThan(900);
    // MA's ladder continues: 3A at 212% FPL is $103/month, 3C at 320% is $235.
    const ma3a = evaluateCurve(single("MA"), { year: "2026", currentEarnings: 33200, points: [enrollee(23000, 900), enrollee(33200, 3000)] }, "archetype");
    expect(ma3a.curve.points[1].medicalOOP).toBe(1236);
    const ma3c = evaluateCurve(single("MA"), { year: "2026", currentEarnings: 50000, points: [enrollee(23000, 900), enrollee(50000, 6000)] }, "archetype");
    expect(ma3c.curve.points[1].medicalOOP).toBe(2820);
    // A premium already under the cap is left alone.
    const cheap = evaluateCurve(single("MA"), { year: "2026", currentEarnings: 25000, points: [enrollee(23000, 900), enrollee(25000, 300)] }, "archetype");
    expect(cheap.curve.points[1].medicalOOP).toBe(300);
  });

  it("prices Massachusetts' tiers per person on the plan, and caps a premium the federal credit left at $0 too", () => {
    // Family of three at $85,000 = 319% FPL on $26,650: Plan Type 3C, $235 a month for each of
    // the three once the children are off MassHealth (300%), $235 for the parent alone while they are on it.
    const family = answersWith({ state: "MA", childAges: [3, 7], childDisabled: [false, false], annualEarnings: 85000 });
    const kidsOn = enrollee(85000, 9000, { childPrograms: { medicaid: 6000 } });
    const kidsOff = enrollee(85000, 9000, { childPrograms: {} });
    const on = evaluateCurve(family, { year: "2026", currentEarnings: 85000, points: [enrollee(40000, 900), kidsOn] }, "archetype");
    const off = evaluateCurve(family, { year: "2026", currentEarnings: 85000, points: [enrollee(40000, 900), kidsOff] }, "archetype");
    expect(on.curve.points[1].medicalOOP).toBe(235 * 12);
    expect(off.curve.points[1].medicalOOP).toBe(235 * 12 * 3);
    // No federal credit at all — a cheap benchmark against a 9.96% required contribution — and
    // the state still caps the bill: electing "the full amount of APTC available" includes $0.
    const noCredit = evaluateCurve(single("MA", 43000), { year: "2026", currentEarnings: 43000, points: [enrollee(40000, 900), enrollee(43000, 5244, { programs: { aca: 0 } })] }, "archetype");
    expect(noCredit.curve.points[1].medicalOOP).toBe(152 * 12); // $43,000 = 275% FPL: Plan Type 3B
    expect(noCredit.premiumWrap?.state).toBe("MA");
  });
});

describe("per-member state premium help (NJ, WA)", () => {
  // A one-person household: every FPL share below is on the 2025 one-person guideline ($15,650).
  const enrollee = (earnings: number, moop: number, over: PointOver = {}) => pt(earnings, 30000 - moop, { medicalOOP: moop, programs: { aca: 4000 }, ...over });
  const single = (state: string, annualEarnings: number) => answersWith({ state, childAges: [], childDisabled: [], annualEarnings });

  it("pays New Jersey's band amount per person, nets it out of the premium, and steps at the published edges", () => {
    // $40,000 = 256% FPL: the $100 band. $30,000 = 192%: the $40 band. $95,000 = 607%: past the ceiling.
    const ev = evaluateCurve(single("NJ", 40000), { year: "2026", currentEarnings: 40000, points: [enrollee(30000, 2000), enrollee(40000, 3000), enrollee(95000, 9000)] }, "archetype");
    expect(ev.curve.points.map((p) => p.medicalOOP)).toEqual([2000 - 480, 3000 - 1200, 9000]);
    expect(ev.curve.points.map((p) => p.netIncome)).toEqual([28000 + 480, 27000 + 1200, 21000]);
    expect(ev.perMemberPremiumHelp).toMatchObject({ state: "NJ", program: "NJ Health Plan Savings", maxAnnual: 1200 });
    expect(ev.premiumWrap).toBeNull();
    expect(ev.statePremiumAssistance).toBeNull();
  });

  it("counts every person on the plan: a parent whose children are on CHIP is one member, and three once they are not", () => {
    // Family of three at $70,000 (263% FPL on $26,650) and $100,000 (375%): both in the $100 band.
    const family = answersWith({ state: "NJ", childAges: [3, 7], childDisabled: [false, false], annualEarnings: 70000 });
    const onChip = enrollee(70000, 5000, { childPrograms: { chip: 6000 } });
    const offChip = enrollee(100000, 9000, { childPrograms: {} });
    const ev = evaluateCurve(family, { year: "2026", currentEarnings: 70000, points: [onChip, offChip] }, "archetype");
    expect(ev.curve.points.map((p) => p.medicalOOP)).toEqual([5000 - 1200, 9000 - 3600]);
    expect(ev.perMemberPremiumHelp?.maxAnnual).toBe(3600);
  });

  it("never takes the premium below zero: the state's help is capped at what is left after the federal credit", () => {
    const ev = evaluateCurve(single("NJ", 40000), { year: "2026", currentEarnings: 40000, points: [enrollee(40000, 700), enrollee(41000, 800)] }, "archetype");
    expect(ev.curve.points.map((p) => p.medicalOOP)).toEqual([0, 0]);
    expect(ev.curve.points.map((p) => p.netIncome)).toEqual([30000, 30000]);
    expect(ev.perMemberPremiumHelp?.maxAnnual).toBe(800);
  });

  it("pays Washington's $55 a month inside 250% FPL and nothing past it, and stands down where the engine served the amount", () => {
    // $30,000 = 192% FPL; $40,000 = 256%.
    const local = evaluateCurve(single("WA", 30000), { year: "2026", currentEarnings: 30000, points: [enrollee(30000, 2000), enrollee(40000, 3000)] }, "archetype");
    expect(local.curve.points.map((p) => p.medicalOOP)).toEqual([2000 - 660, 3000]);
    expect(local.perMemberPremiumHelp).toMatchObject({ state: "WA", maxAnnual: 660 });
    // The same curve with the engine's own figure on every point: the table is not consulted.
    const served = evaluateCurve(single("WA", 30000), { year: "2026", currentEarnings: 30000, points: [enrollee(30000, 2000, { statePremiumAssistance: 660 }), enrollee(40000, 3000, { statePremiumAssistance: 0 })] }, "archetype");
    expect(served.curve.points.map((p) => p.medicalOOP)).toEqual([2000 - 660, 3000]);
    expect(served.perMemberPremiumHelp).toBeNull();
    expect(served.statePremiumAssistance).toMatchObject({ state: "WA", variable: "wa_cascade_care_savings", maxAnnual: 660 });
  });

  it("leaves a point alone where nobody is buying a marketplace plan, but not one where the federal credit alone is $0", () => {
    // An adult on Medicaid, a point with no premium, and employer coverage: nothing to help with.
    // A premium with no federal credit IS helped — New Jersey pays above 400% FPL and wherever
    // the required contribution already exceeds a cheap benchmark, and the engine does the same.
    const onMedicaid = enrollee(30000, 2000, { programs: { aca: 4000, medicaid: 5000 } });
    const noCredit = enrollee(70000, 2000, { programs: { aca: 0 } }); // 447% FPL: the $50 band, no credit
    const noPremium = enrollee(30000, 0);
    const ev = evaluateCurve(single("NJ", 30000), { year: "2026", currentEarnings: 30000, points: [onMedicaid, noCredit, noPremium] }, "archetype");
    expect(ev.curve.points.map((p) => p.medicalOOP)).toEqual([2000, 2000 - 600, 0]);
    expect(ev.perMemberPremiumHelp?.maxAnnual).toBe(600);
    // Employer coverage is a live-path input (the sweep never sent it), so it is tested on a live curve.
    const esi = evaluateCurve(answersWith({ state: "NJ", childAges: [], childDisabled: [], annualEarnings: 30000, hasEmployerCoverage: true }), { year: "2026", currentEarnings: 30000, points: [enrollee(30000, 2000), enrollee(40000, 3000)] }, "live");
    expect(esi.perMemberPremiumHelp).toBeNull();
  });
});

describe("transitional medical assistance is a §1931 rule", () => {
  // A parent with one child whose own Medicaid ends between `at` and the next point.
  const parentLosesAt = (at: number, state: string) => {
    const p = (earnings: number, net: number, adultMedicaid: number) =>
      pt(earnings, net, { medicalOOP: adultMedicaid > 0 ? 0 : 3000, programs: { medicaid: adultMedicaid + 5000, aca: adultMedicaid > 0 ? 0 : 2000 }, childPrograms: { medicaid: 5000 } });
    const points = [p(at - 1000, 30000, 6000), p(at, 30800, 6000), p(at + 1000, 28600, 0), p(at + 2000, 29400, 0)];
    return evaluateCurve(answersWith({ state, annualEarnings: at }), { year: "2026", currentEarnings: at, points }, "live");
  };
  it("defers a parent's loss in a non-expansion state (Texas, at the state's own low limit)", () => {
    expect(parentLosesAt(6000, "TX").deferred.map((c) => c.deferral?.reason)).toEqual(["transitional_medical_assistance"]);
  });
  it("does not defer a loss at the ACA adult group's 138% line in an expansion state (Arizona)", () => {
    // Two people, 2026 guideline $21,640: 138% is $29,863; the last point with Medicaid is $29,000.
    expect(parentLosesAt(29000, "AZ").deferred).toEqual([]);
  });
  it("defers a §1931 loss well above the adult-group line (DC parents at ~185% FPL)", () => {
    // DC covers parents to 216% FPL under §1931; a loss at $40,000 (185% for
    // two) is not the adult group's line, so TMA follows it. (Connecticut
    // would do the same but its premium wrap removes this synthetic cliff.)
    expect(parentLosesAt(40000, "DC").deferred.map((c) => c.deferral?.reason)).toEqual(["transitional_medical_assistance"]);
  });
});

describe("the state child-care subsidy (policyengine-us #9405)", () => {
  // The live Connecticut probe of 2026-09-15 (single parent, 3-year-old,
  // $9,600 bill): $8,850 of subsidy at $25,000. Whether the model counted it
  // in net income is parse.ts's business (its test); the points arrive here
  // with it counted once, and evaluate must neither add nor remove it.
  const subsidised = (state: string, subsidy: number) =>
    evaluateOn(answersWith({ state, childAges: [3], childDisabled: [false], monthlyChildcare: 800, getsChildcareSubsidy: true, annualEarnings: 25000 }),
      [pt(25000, 34121 + subsidy, { programs: { childcare: subsidy } }), pt(45000, 42953, { programs: { childcare: 0 } })], 25000);

  it("leaves net income as parsed, in a state of either kind", () => {
    expect(subsidised("CT", 8850).curve.points.map((p) => p.netIncome)).toEqual([34121 + 8850, 42953]);
    expect(subsidised("CO", 8913).curve.points.map((p) => p.netIncome)).toEqual([34121 + 8913, 42953]);
  });

  it("names the subsidy on the cliff its end causes, and reports where it ends", () => {
    const ct = subsidised("CT", 8850);
    // $42,971 → $42,953: the subsidy's whole $8,850 leaves over one step.
    expect(ct.analysis.cliffs).toHaveLength(0); // the $20,000 step out-earns it
    const steep = evaluateOn(answersWith({ state: "CT", childAges: [3], childDisabled: [false], monthlyChildcare: 800, getsChildcareSubsidy: true, annualEarnings: 25000 }),
      [pt(25000, 34121 + 8850, { programs: { childcare: 8850 } }), pt(26000, 34500, { programs: { childcare: 0 } })], 25000);
    expect(steep.analysis.cliffs[0].programsLost).toContain("childcare");
    expect(steep.analysis.cliffs[0].breakdown.benefits).toBeCloseTo(8850, 6);
    expect(steep.escape.programEnds.childcare).toBe(25000);
  });
});

describe("LIHEAP boundary (Plan 7)", () => {
  // Texas, one parent, children 3 and 7: 150% of the 2025 guideline for three is $39,975.
  const tx = answersWith({ state: "TX", childAges: [3, 7], childDisabled: [false, false], annualEarnings: 30000 });
  const flat = (top: number) => Array.from({ length: top / 1000 + 1 }, (_, i) => pt(i * 1000, 20000 + i * 800));

  it("is on the evaluation as a boundary — not a cliff, not a program end, not a zone — with the same figures on both paths", () => {
    const live = evaluateOn(tx, flat(150_000), 30000);
    expect(live.liheap).toMatchObject({ component: "heating", earningsLimit: 39975, topBand: { min: 1200, max: 1200 }, servedShare: 0.03 });
    expect(live.analysis.cliffs).toEqual([]);
    expect(live.escape.programEnds).toEqual({});
    expect(live.analysis.dangerZones).toEqual([]);
    // The archetype path reads the swept household — the same shape, so the same limit.
    const offline = evaluateOffline(tx)!;
    expect(offline.liheap?.earningsLimit).toBe(live.liheap?.earningsLimit);
    expect(offline.liheap?.householdIncomeLimit).toBe(39975);
  });

  it("is null when the curve ends below the limit", () => {
    expect(evaluateOn(tx, flat(30_000), 10000).liheap).toBeNull();
  });
});

describe("the energy-assistance toggle (Plan 7, Phase 3)", () => {
  const tx = answersWith({ state: "TX", childAges: [3, 7], childDisabled: [false, false], annualEarnings: 30000 });
  const on = { ...tx, getsEnergyAssistance: true };
  // A curve rising $800 a step: the $1,200 the table pays below $39,975 makes the $39k → $40k step a $400 fall.
  const rising = (top: number, over: (earnings: number) => PointOver = () => ({})) =>
    Array.from({ length: top / 1000 + 1 }, (_, i) => pt(i * 1000, 20000 + i * 800, over(i * 1000)));
  const stepAt = (ev: ReturnType<typeof evaluateOn>, start: number) => ev.analysis.cliffs.find((c) => c.startEarnings === start);
  const benefitsDelta = (ev: ReturnType<typeof evaluateOn>, start: number) => {
    const [a, b] = [ev.curve.points.find((p) => p.earnings === start)!, ev.curve.points.find((p) => p.earnings === start + 1000)!];
    return (a.programs.snap ?? 0) + (a.programs.liheap ?? 0) - (b.programs.snap ?? 0) - (b.programs.liheap ?? 0);
  };

  it("puts Texas's $1,200 into the curve to $39,975 and takes it out at $40,000, where the ordinary cliff math counts it", () => {
    const off = evaluateOn(tx, rising(150_000), 30000);
    const with_ = evaluateOn(on, rising(150_000), 30000);
    const at = (ev: typeof off, e: number) => ev.curve.points.find((p) => p.earnings === e)!;
    expect(at(with_, 39000).programs.liheap).toBe(1200);
    expect(at(with_, 40000).programs.liheap).toBe(0);
    // The staircase below the top band: $1,800 to 50% FPG ($13,325), $1,500 to 75% ($19,988).
    expect(at(with_, 13000).programs.liheap).toBe(1800);
    expect(at(with_, 19000).programs.liheap).toBe(1500);
    expect(at(with_, 20000).programs.liheap).toBe(1200);
    const cliff = stepAt(with_, 39000)!;
    expect(cliff.programsLost).toEqual(["liheap"]);
    expect(cliff.drop).toBe(1200 - 800);
    expect(cliff.breakdown.benefits - (stepAt(off, 39000)?.breakdown.benefits ?? benefitsDelta(off, 39000))).toBe(1200);
    expect(with_.escape.programEnds.liheap).toBe(39000);
    expect(with_.liheap?.counted).toBe(true);
    expect(off.liheap?.counted).toBe(false);
  });

  it("shows one cliff carrying SNAP and energy assistance when the limit lands in the step SNAP ends", () => {
    // $2,000 of SNAP to $39,000, in the money line as PolicyEngine would have it.
    const snapTo39k = (e: number): PointOver => (e <= 39000 ? { programs: { snap: 2000 }, netIncome: 20000 + (e / 1000) * 800 + 2000 } : { programs: { snap: 0 } });
    const off = evaluateOn(tx, rising(150_000, snapTo39k), 30000);
    const with_ = evaluateOn(on, rising(150_000, snapTo39k), 30000);
    expect(stepAt(off, 39000)!.programsLost).toEqual(["snap"]);
    const both = stepAt(with_, 39000)!;
    expect(both.programsLost).toEqual(["snap", "liheap"]);
    expect(both.drop).toBe(2000 + 1200 - 800);
    expect(both.breakdown.benefits).toBe(stepAt(off, 39000)!.breakdown.benefits + 1200);
    expect(with_.analysis.cliffs).toHaveLength(1);
  });

  it("leaves the endpoint's own schedule alone where it served one, and applies the table where it served $0", () => {
    const ma = answersWith({ ...tx, state: "MA", getsEnergyAssistance: true });
    const served = rising(150_000, (e) => ({ programs: { liheap: e <= 83000 ? 814 : 0 } }));
    const ev = evaluateOn(ma, served, 30000);
    expect(ev.curve.points.find((p) => p.earnings === 30000)!.programs.liheap).toBe(814);
    // What the droplet returns on HotGap's payload: the variable, at $0 everywhere.
    const zero = rising(150_000, () => ({ programs: { liheap: 0 } }));
    const table = evaluateOn(ma, zero, 30000);
    expect(table.curve.points.find((p) => p.earnings === 30000)!.programs.liheap).toBe(460);   // 125% FPG band
    expect(table.curve.points.find((p) => p.earnings === 83000)!.programs.liheap).toBe(355);   // the top band, to $83,641
    expect(table.curve.points.find((p) => p.earnings === 84000)!.programs.liheap).toBe(0);
    // Michigan's heating money is already in the curve as the credit: the toggle adds nothing.
    const mi = evaluateOn(answersWith({ ...tx, state: "MI", getsEnergyAssistance: true }), rising(150_000), 30000);
    expect(mi.curve.points.every((p) => (p.programs.liheap ?? 0) === 0)).toBe(true);
    expect(mi.liheap?.counted).toBe(false);
  });

  it("changes nothing with the toggle off: the points, the cliffs and the ends are today's", () => {
    const points = rising(150_000);
    const off = evaluateOn(tx, points, 30000);
    expect(off.curve.points).toEqual(points);
    expect(off.analysis.cliffs).toEqual(analyzeCurve(points, 30000, { hasChildren: true, isAdultGroupLoss: () => false }).cliffs);
    expect(off.escape.programEnds.liheap).toBeUndefined();
  });
});
