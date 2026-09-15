import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { analyzeCurve } from "./analyze.js";
import { PolicyEngineError } from "./client.js";
import { evaluateCurve, evaluateHousehold, evaluateOffline } from "./evaluate.js";
import { parsePEResponse } from "./parse.js";
import { validateAnswers } from "./validate.js";
import { ESI_EMPLOYEE_CONTRIBUTION, fpl2025, MEDICARE_PART_B_ANNUAL } from "./policyYear.js";
import { reachForArchetype } from "./reachLookup.js";
import { stateDefaults } from "./stateDefaults.js";
import type { CurvePoint, CurveResponse, HouseholdAnswers, ProgramId } from "./types.js";

const fixture = readFileSync(new URL("../../fixtures/pe-ca-single-1kid-101.json", import.meta.url), "utf8");
const fixturePoints = parsePEResponse(JSON.parse(fixture), 101);

function answersWith(over: Partial<Record<string, unknown>> = {}): HouseholdAnswers {
  const v = validateAnswers({
    state: "CA", married: false, age: 30, spouseAge: null, childAges: [5],
    youDisabled: false, spouseDisabled: false, childDisabled: [false],
    monthlyRent: 1500, monthlyChildcare: null, annualEarnings: 30000, spouseAnnualEarnings: 0,
    ...over,
  });
  if (!v.ok) throw new Error(v.detail);
  return v.value;
}

const answers = answersWith();
const respond = (fn: () => Response) => (async () => fn()) as unknown as typeof fetch;

describe("evaluateCurve", () => {
  const curve: CurveResponse = { year: "2026", currentEarnings: 30000, points: fixturePoints };
  const ev = evaluateCurve(answers, curve, "live");

  it("keeps the real cliffs, defers the Head Start one, and reads the verdict from the immediate curve", () => {
    // Just past the Head Start step, against the corrected curve (California's
    // premium wrap zeroes the net premium through 150% FPL, which adds a small
    // real cliff where it ends).
    const at31k = evaluateCurve(answers, { year: "2026", currentEarnings: 31000, points: fixturePoints }, "live");
    const direct = analyzeCurve(at31k.curve.points, 31000, { hasChildren: true });
    // Every cliff on the real curve is still reported…
    expect(at31k.analysis.cliffs.map((c) => [c.startEarnings, Math.round(c.drop)])).toEqual(direct.cliffs.map((c) => [c.startEarnings, Math.round(c.drop)]));
    // …but the $30k Head Start loss lands at the next program year, so it is
    // listed as deferred and lifted out of the zones: the trough that ran to
    // $74k on the raw reading ends at $34k, where only the real step at $31k
    // (California's $0 band ending at 150% FPL, capped at the next tier's
    // 3.19% of income) still has to be recovered.
    expect(at31k.deferred.map((c) => [c.startEarnings, c.deferral?.reason])).toEqual([[30000, "head_start_program_year"]]);
    const zoneFrom30k = (zones: { startEarnings: number; endEarnings: number | null }[]) => zones.find((z) => z.startEarnings === 30000)!.endEarnings;
    expect(zoneFrom30k(direct.dangerZones)).toBe(74000);
    expect(zoneFrom30k(at31k.analysis.dangerZones)).toBe(34000);
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
    const flat = (earnings: number, netIncome: number): CurvePoint => ({
      earnings, netIncome, medicalOOP: 0,
      programs: { snap: 0, medicaid: 0, chip: 0, eitc: 0, ctc: 0, aca: 0, tanf: 0, housing: 0, wic: 0, ssi: 0, headstart: 0, schoolmeals: 0, childcare: 0 },
      childPrograms: {}, otherBenefits: 0, stateCredits: 0, totalCtc: 0, coverageGap: false,
    });
    const points = [flat(0, 10000), flat(10000, 15000), flat(20000, 21000)];
    const safe = evaluateCurve(answers, { year: "2026", currentEarnings: 10000, points }, "live");
    expect(safe.escape.safeExitEarnings).toBe(0);
    expect(safe.reach.safeExit).toBeNull();
    expect(safe.reach.current).toBeTypeOf("number");
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

const ZERO = { snap: 0, medicaid: 0, chip: 0, eitc: 0, ctc: 0, aca: 0, tanf: 0, housing: 0, wic: 0, ssi: 0, headstart: 0, schoolmeals: 0, childcare: 0 };
// `programs` arrives as a sparse patch over ZERO, so it cannot be the full
// Record the CurvePoint field is.
type PointOver = Partial<Omit<CurvePoint, "programs">> & { programs?: Partial<Record<ProgramId, number>> };
const pt = (earnings: number, netIncome: number, over: PointOver = {}): CurvePoint => ({
  earnings, netIncome, medicalOOP: 0, childPrograms: {}, otherBenefits: 0, stateCredits: 0, totalCtc: 0, coverageGap: false,
  ...over,
  programs: { ...ZERO, ...(over.programs ?? {}) },
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

describe("deferred losses stay out of the headline", () => {
  // The same shape three times: a $18,000 fall at $20,000 that the curve only
  // climbs back out of at $50,000. Whether that is a hole the household has to
  // leap depends entirely on whether the loss arrives with the raise.
  const withCliff = (over: PointOver, after: PointOver = {}) => [
    pt(0, 40000, over), pt(10000, 45000, over), pt(20000, 27000, after),
    pt(30000, 33000, after), pt(40000, 39000, after), pt(50000, 46000, after),
  ];
  // The same household if the loss simply never happened.
  const noCliff = [pt(0, 40000), pt(10000, 45000), pt(20000, 45000), pt(30000, 51000), pt(40000, 57000), pt(50000, 64000)];

  it("gives a Head Start household the leap it would have without Head Start", () => {
    const a = answersWith({ getsHeadStart: true, monthlyChildcare: 1200, annualEarnings: 10000 });
    const hs = { programs: { headstart: 12000 }, childPrograms: { headstart: 12000 } };
    const ev = evaluateOn(a, withCliff(hs), 10000);
    const control = evaluateOn(answersWith({ annualEarnings: 10000 }), noCliff, 10000);
    expect(ev.escape.leap).toBe(control.escape.leap);
    expect(ev.escape.leap).toBe(0);
    expect(ev.escape.safeExitEarnings).toBe(0);
    expect(ev.personal.zone).toBeNull();
    // Still reported, in full, with what carries them past it.
    expect(ev.deferred).toHaveLength(1);
    expect(ev.deferred[0]).toMatchObject({ startEarnings: 10000, endEarnings: 20000, drop: 18000 });
    expect(ev.deferred[0].deferral).toEqual({
      reason: "head_start_program_year",
      until: expect.stringContaining("45 CFR 1302.12(j)(1)"),
    });
    expect(ev.analysis.cliffs).toContain(ev.deferred[0]);
    // The verdict describes the year of the raise, not the renewal after it.
    expect(ev.analysis.verdict).toBe("always_up");
    expect(ev.analysis.worstCliff).toBeNull();
  });

  it("defers a child's CHIP end by the 12-month continuous-eligibility rule", () => {
    const covered = { programs: { chip: 4000 }, childPrograms: { chip: 4000 } };
    const ev = evaluateOn(answersWith({ annualEarnings: 30000 }), withCliff(covered, { medicalOOP: 5000 }), 30000);
    expect(ev.deferred.map((c) => c.deferral!.reason)).toEqual(["child_continuous_eligibility"]);
    expect(ev.escape.leap).toBe(0);
    expect(ev.analysis.verdict).toBe("always_up");
  });

  it("defers a parent's Medicaid end in a non-expansion state by transitional Medical Assistance", () => {
    // Texas, one parent one child: the parent is cut off far below the child.
    const tx = answersWith({ state: "TX", annualEarnings: 30000 });
    const covered = { programs: { medicaid: 15000, chip: 3000 }, childPrograms: { medicaid: 6000, chip: 3000 } };
    const after = { programs: { medicaid: 6000, chip: 3000 }, childPrograms: { medicaid: 6000, chip: 3000 }, medicalOOP: 5000 };
    const ev = evaluateOn(tx, withCliff(covered, after), 30000);
    expect(ev.deferred.map((c) => c.deferral!.reason)).toEqual(["transitional_medical_assistance"]);
    expect(ev.deferred[0].deferral!.until).toContain("42 U.S.C. 1396r-6");
    expect(ev.escape.leap).toBe(0);
    // A childless adult in the same state gets no §1925 continuation, so the
    // same fall is immediate and the leap comes back.
    const childless = answersWith({ state: "TX", childAges: [], childDisabled: [], annualEarnings: 30000 });
    const soloCovered = { programs: { medicaid: 9000 } };
    const soloAfter = { programs: {}, medicalOOP: 5000 };
    const solo = evaluateOn(childless, withCliff(soloCovered, soloAfter), 30000);
    expect(solo.deferred).toEqual([]);
    expect(solo.escape.leap).toBe(40000);
  });

  it("keeps an immediate cliff in the headline while neutralizing the deferred one below it", () => {
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
    expect(ev.analysis.worstCliff).toMatchObject({ startEarnings: 30000, drop: 5000, programsLost: ["snap"] });
    // The immediate curve lifts everything above the deferred step by its drop,
    // so the SNAP dip above it is still a dip and still opens a zone.
    expect(ev.analysis.dangerZones).toEqual([{ startEarnings: 30000, endEarnings: 50000, peakNet: 51000 }]);
    expect(ev.escape.leap).toBe(20000);
    // …and the money line at this household's own pay is the REAL curve's, not
    // the counterfactual's: they really are $18,000 below what the lift says.
    expect(ev.analysis.currentNet).toBe(30500);
  });

  it("will not excuse a parent's Medicaid end on a curve that cannot say who held it", () => {
    // Committed curves swept before childPrograms existed. Treating the split
    // as empty would hand every child's Medicaid to the parent and then excuse
    // the cliff under §1925 — the same conflation the coverage-gap guard
    // refuses to make. Excusing a cliff is the strong claim, so it is withheld.
    const covered = { programs: { medicaid: 15000 } };
    const after = { programs: {}, medicalOOP: 5000 };
    const legacy = withCliff(covered, after).map((p) => {
      const { childPrograms: _, ...rest } = p;
      return rest as unknown as CurvePoint;
    });
    const ev = evaluateCurve(answersWith({ annualEarnings: 30000 }), { year: "2026", currentEarnings: 30000, points: legacy }, "archetype");
    expect(ev.deferred).toEqual([]);
    expect(ev.escape.leap).toBe(40000);
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
    expect(ev.personal).toEqual({ zone: null, escapeEarnings: null, raiseToClear: null, raiseIsLowerBound: false });
  });

  it("gives a lower bound when the zone never recovers inside the axis", () => {
    const open = [pt(0, 20000), pt(10000, 30000), pt(20000, 22000), pt(30000, 25000), pt(40000, 26000)];
    const ev = evaluateOn(answersWith({ annualEarnings: 25000 }), open, 25000);
    expect(ev.personal.escapeEarnings).toBeNull();
    expect(ev.personal.raiseIsLowerBound).toBe(true);
    expect(ev.personal.raiseToClear).toBe(15000); // to the top of the sweep, at least
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
    const ZERO = { snap: 0, medicaid: 0, chip: 0, eitc: 0, ctc: 0, aca: 0, tanf: 0, housing: 0, wic: 0, ssi: 0, headstart: 0, schoolmeals: 0, childcare: 0 };
    const p = (earnings: number, subsidy: number): CurvePoint => ({
      earnings, netIncome: 40000, medicalOOP: 0, programs: { ...ZERO, headstart: 20000, childcare: subsidy }, childPrograms: { headstart: 20000 }, otherBenefits: 0, stateCredits: 0, totalCtc: 0, coverageGap: false,
    });
    const a = answersWith({ getsHeadStart: true, getsChildcareSubsidy: true, monthlyChildcare: 800, childAges: [3], childDisabled: [false] });
    const alone = evaluateCurve(a, { year: "2026", currentEarnings: 20000, points: [p(20000, 0), p(30000, 0)] }, "live");
    const both = evaluateCurve(a, { year: "2026", currentEarnings: 20000, points: [p(20000, 9000), p(30000, 9000)] }, "live");
    const valued = (ev: ReturnType<typeof evaluateCurve>) => ev.curve.points[0].netIncome - 40000 + 20000; // net change vs the $20k sticker
    expect(valued(both)).toBe(Math.max(0, valued(alone) - 9000));
  });
});

describe("state premium wraps", () => {
  const ZEROS = { snap: 0, medicaid: 0, chip: 0, eitc: 0, ctc: 0, aca: 0, tanf: 0, housing: 0, wic: 0, ssi: 0, headstart: 0, schoolmeals: 0, childcare: 0 };
  const enrollee = (earnings: number, moop: number): CurvePoint => ({
    earnings, netIncome: 30000 - moop, medicalOOP: moop, programs: { ...ZEROS, aca: 4000 }, childPrograms: {}, otherBenefits: 0, stateCredits: 0, totalCtc: 0, coverageGap: false,
  });
  const single = (state: string) => answersWith({ state, childAges: [], childDisabled: [], annualEarnings: 23000 });

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
});

describe("transitional medical assistance is a §1931 rule", () => {
  const ZEROS = { snap: 0, medicaid: 0, chip: 0, eitc: 0, ctc: 0, aca: 0, tanf: 0, housing: 0, wic: 0, ssi: 0, headstart: 0, schoolmeals: 0, childcare: 0 };
  // A parent with one child whose own Medicaid ends between `at` and the next point.
  const parentLosesAt = (at: number, state: string) => {
    const p = (earnings: number, net: number, adultMedicaid: number): CurvePoint => ({
      earnings, netIncome: net, medicalOOP: adultMedicaid > 0 ? 0 : 3000, programs: { ...ZEROS, medicaid: adultMedicaid + 5000, aca: adultMedicaid > 0 ? 0 : 2000 }, childPrograms: { medicaid: 5000 }, otherBenefits: 0, stateCredits: 0, totalCtc: 0, coverageGap: false,
    });
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
  // The live Connecticut and Colorado probes of 2026-09-15: the same household
  // (single parent, 3-year-old, $9,600 bill) gets ~$8,900 of subsidy in both
  // states, but only Colorado's reaches household_net_income.
  const subsidised = (state: string, subsidy: number) =>
    evaluateOn(answersWith({ state, childAges: [3], childDisabled: [false], monthlyChildcare: 800, getsChildcareSubsidy: true, annualEarnings: 25000 }),
      [pt(25000, 34121, { programs: { childcare: subsidy } }), pt(45000, 42953, { programs: { childcare: 0 } })], 25000);

  it("adds the money in a state PolicyEngine leaves it out of", () => {
    const ct = subsidised("CT", 8850);
    expect(ct.curve.points[0].netIncome).toBe(34121 + 8850);
    expect(ct.curve.points[1].netIncome).toBe(42953);
  });

  it("does NOT add it again where household_state_benefits already carried it", () => {
    expect(subsidised("CO", 8913).curve.points[0].netIncome).toBe(34121);
  });

  it("names the subsidy on the cliff its end causes, and reports where it ends", () => {
    const ct = subsidised("CT", 8850);
    // $42,971 → $42,953: the subsidy's whole $8,850 leaves over one step.
    expect(ct.analysis.cliffs).toHaveLength(0); // the $20,000 step out-earns it
    const steep = evaluateOn(answersWith({ state: "CT", childAges: [3], childDisabled: [false], monthlyChildcare: 800, getsChildcareSubsidy: true, annualEarnings: 25000 }),
      [pt(25000, 34121, { programs: { childcare: 8850 } }), pt(26000, 34500, { programs: { childcare: 0 } })], 25000);
    expect(steep.analysis.cliffs[0].programsLost).toContain("childcare");
    expect(steep.analysis.cliffs[0].breakdown.benefits).toBeCloseTo(8850, 6);
    expect(steep.escape.programEnds.childcare).toBe(25000);
  });

  it("is a no-op on a curve with no subsidy on it — every archetype", () => {
    const plain = evaluateOn(answersWith({ state: "CT" }), [pt(0, 20000), pt(30000, 40000)]);
    expect(plain.curve.points.map((p) => p.netIncome)).toEqual([20000, 40000]);
  });
});
