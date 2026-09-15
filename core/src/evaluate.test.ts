import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { analyzeCurve } from "./analyze.js";
import { PolicyEngineError } from "./client.js";
import { evaluateCurve, evaluateHousehold, evaluateOffline } from "./evaluate.js";
import { parsePEResponse } from "./parse.js";
import { validateAnswers } from "./validate.js";
import { ESI_EMPLOYEE_CONTRIBUTION, fpl2025 } from "./policyYear.js";
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

  it("agrees with analyzeCurve called directly", () => {
    const direct = analyzeCurve(fixturePoints, 30000);
    expect(ev.analysis.verdict).toBe(direct.verdict);
    expect(ev.analysis.cliffs).toEqual(direct.cliffs);
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
      programs: { snap: 0, medicaid: 0, chip: 0, eitc: 0, ctc: 0, aca: 0, tanf: 0, housing: 0, wic: 0, ssi: 0, headstart: 0, schoolmeals: 0 },
      childPrograms: {}, otherBenefits: 0, coverageGap: false,
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
    const ev = evaluateOffline(answersWith({ annualEarnings: 150000 }))!;
    expect(ev.source).toBe("archetype");
    expect(ev.curve.currentEarnings).toBe(100000);
    expect(ev.curve.points).toHaveLength(101);
    expect(ev.analysis.currentEarnings).toBe(100000);
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
    expect(ev.curve.points).toEqual(fixturePoints);
    // The CA single-1 archetype is a different household (no rent, 3-year-old),
    // so a live result must not coincide with it point for point.
    expect(ev.curve.points).not.toEqual(evaluateOffline(answers)!.curve.points);
  });
});

const ZERO = { snap: 0, medicaid: 0, chip: 0, eitc: 0, ctc: 0, aca: 0, tanf: 0, housing: 0, wic: 0, ssi: 0, headstart: 0, schoolmeals: 0 };
// `programs` arrives as a sparse patch over ZERO, so it cannot be the full
// Record the CurvePoint field is.
type PointOver = Partial<Omit<CurvePoint, "programs">> & { programs?: Partial<Record<ProgramId, number>> };
const pt = (earnings: number, netIncome: number, over: PointOver = {}): CurvePoint => ({
  earnings, netIncome, medicalOOP: 0, childPrograms: {}, otherBenefits: 0, coverageGap: false,
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

  it("counts spouse pay and non-wage income against the poverty line", () => {
    // Same $10k of the householder's earnings, but $15k of child support puts
    // the household over the line for two — no gap.
    const withSupport = answersWith({ state: "TX", annualEarnings: 10000, childSupportMonthly: 1250 });
    expect(evaluateOn(withSupport, [gapPoint(10000), gapPoint(25000)]).coverageGap).toBeNull();
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
    expect(ev.curve.points[1].medicalOOP).toBe(ESI_EMPLOYEE_CONTRIBUTION.family);
    // The phantom premium comes back into the money line, the real one goes out.
    expect(ev.curve.points[1].netIncome).toBe(40000 + 5000 - ESI_EMPLOYEE_CONTRIBUTION.family);
  });

  it("uses the single rate for a childless unmarried household", () => {
    const single = answersWith({ hasEmployerCoverage: true, childAges: [], childDisabled: [] });
    const ev = evaluateOn(single, [pt(0, 20000), pt(30000, 40000, { medicalOOP: 5000 })]);
    expect(ev.curve.points[1].medicalOOP).toBe(ESI_EMPLOYEE_CONTRIBUTION.single);
  });

  it("charges nothing where there is no job and nothing where PolicyEngine charged no premium", () => {
    // medicalOOP 0 for an ESI household means Medicaid or CHIP is covering
    // them at that income; inventing a payroll deduction there would draw a
    // cliff the size of the contribution at the first dollar of pay.
    const ev = evaluateOn(esiAnswers, [pt(0, 20000, { medicalOOP: 0 }), pt(30000, 40000, { medicalOOP: 0 })]);
    expect(ev.curve.points.map((p) => p.netIncome)).toEqual([20000, 40000]);
    expect(ev.curve.points.every((p) => p.medicalOOP === 0)).toBe(true);
  });

  it("leaves a household without employer coverage alone", () => {
    const ev = evaluateOn(answersWith(), [pt(0, 20000), pt(30000, 40000, { medicalOOP: 5000 })]);
    expect(ev.curve.points[1]).toMatchObject({ medicalOOP: 5000, netIncome: 40000 });
  });
});

describe("Head Start (finding 9)", () => {
  const points = () => [pt(0, 40000, { programs: { headstart: 22285 }, childPrograms: { headstart: 22285 } }), pt(30000, 45000)];

  it("revalues the slot at the childcare it replaces", () => {
    const a = answersWith({ getsHeadStart: true, monthlyChildcare: 600 });
    const ev = evaluateOn(a, points());
    expect(ev.curve.points[0].programs.headstart).toBe(7200);
    expect(ev.curve.points[0].childPrograms.headstart).toBe(7200);
    expect(ev.curve.points[0].netIncome).toBe(40000 - (22285 - 7200));
    expect(ev.headStart).toEqual({ stickerValue: 22285, replacementValue: 7200, deferred: true });
  });

  it("is worth nothing to a family that buys no childcare", () => {
    const ev = evaluateOn(answersWith({ getsHeadStart: true, monthlyChildcare: null }), points());
    expect(ev.curve.points[0].programs.headstart).toBe(0);
    expect(ev.curve.points[0].netIncome).toBe(40000 - 22285);
    expect(ev.headStart).toEqual({ stickerValue: 22285, replacementValue: 0, deferred: true });
  });

  it("never revalues upward past the sticker", () => {
    const ev = evaluateOn(answersWith({ getsHeadStart: true, monthlyChildcare: 8000 }), points());
    expect(ev.curve.points[0].programs.headstart).toBe(22285);
    expect(ev.curve.points[0].netIncome).toBe(40000);
  });

  it("reports nothing for a family that does not get Head Start", () => {
    expect(evaluateOn(answersWith(), points()).headStart).toBeNull();
    expect(evaluateOn(answersWith({ getsHeadStart: true }), [pt(0, 40000), pt(30000, 45000)]).headStart).toBeNull();
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

describe("reach uses householder-plus-spouse earnings", () => {
  it("places a two-earner household by the pair's combined pay", () => {
    const points = [pt(0, 20000), pt(30000, 40000)];
    const solo = evaluateOn(answersWith({ married: true, spouseAge: 30, annualEarnings: 30000 }), points, 30000);
    const pair = evaluateOn(answersWith({ married: true, spouseAge: 30, annualEarnings: 30000, spouseAnnualEarnings: 45000 }), points, 30000);
    expect(pair.reach.current!).toBeGreaterThan(solo.reach.current!);
  });
});
