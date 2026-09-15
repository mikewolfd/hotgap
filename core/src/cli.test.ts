import { afterEach, describe, expect, it, vi } from "vitest";
import { main } from "./cli.js";
import { loadSummary } from "./data.js";
import { evaluateCurve, evaluateOffline } from "./evaluate.js";
import { ARCHETYPES, answersFor } from "./archetypes.js";
import { parsePEResponse } from "./parse.js";
import { readFileSync } from "node:fs";
import { validateAnswers } from "./validate.js";
import type { CurvePoint, ProgramId } from "./types.js";

vi.mock("./evaluate.js", async (original) => ({ ...await original<object>(), evaluateOffline: vi.fn() }));
vi.mock("./data.js", async (original) => ({ ...await original<object>(), loadSummary: vi.fn() }));

const a = answersFor("MA", ARCHETYPES.find((a) => a.id === "married-3")!);
const raw = JSON.parse(readFileSync(new URL("../../docs/upstream/evidence/local-ma-tafdc.response.json", import.meta.url), "utf8"));
const ev = evaluateCurve(a, { year: "2026", currentEarnings: 26000, points: parsePEResponse(raw, 11) }, "archetype");

afterEach(() => vi.restoreAllMocks());

describe("CLI correction notices", () => {
  it("prints the MA approximation in the curve report and keeps JSON machine-readable", async () => {
    vi.mocked(evaluateOffline).mockReturnValue(ev);
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const args = ["curve", "--state", "MA", "--married", "--kids", "1,4,9", "--earnings", "26000", "--offline"];
    expect(await main(args)).toBe(0);
    expect(log.mock.calls[0][0]).toContain(ev.maTafdc!.message);
    log.mockClear();
    expect(await main([...args, "--json"])).toBe(0);
    expect(log).toHaveBeenCalledTimes(1);
    expect(JSON.parse(log.mock.calls[0][0]).maTafdc.status).toBe("applied");
  });

  it("stores --hours as the household's weekly hours, whatever the pay unit", async () => {
    // --hours converts an hourly --pay, and is also PolicyEngine's
    // weekly_hours_worked_before_lsr, which Massachusetts' dependent-care
    // deduction scales by — so it is no longer rejected alongside --unit month.
    vi.mocked(evaluateOffline).mockReturnValue(ev);
    vi.spyOn(console, "log").mockImplementation(() => {});
    expect(await main(["curve", "--state", "MA", "--pay", "2200", "--unit", "month", "--hours", "30", "--offline"])).toBe(0);
    expect(vi.mocked(evaluateOffline).mock.calls[0][0]).toMatchObject({ annualEarnings: 26400, hoursPerWeek: 30 });
    expect(vi.mocked(evaluateOffline).mock.calls[0][0].hoursPerWeek).toBe(30);
  });

  it("leaves hoursPerWeek null when --hours is not given", async () => {
    vi.mocked(evaluateOffline).mockReturnValue(ev);
    vi.spyOn(console, "log").mockImplementation(() => {});
    expect(await main(["curve", "--state", "MA", "--earnings", "26000", "--offline"])).toBe(0);
    expect(vi.mocked(evaluateOffline).mock.calls[0][0].hoursPerWeek).toBeNull();
  });

  it("prints deferred cliffs in their own block, and labels the refundable CTC", async () => {
    const ZERO = { snap: 0, medicaid: 0, chip: 0, eitc: 0, ctc: 0, aca: 0, tanf: 0, housing: 0, wic: 0, ssi: 0, headstart: 0, schoolmeals: 0 };
    type PointOver = Partial<Omit<CurvePoint, "programs">> & { programs?: Partial<Record<ProgramId, number>> };
    const pt = (earnings: number, netIncome: number, over: PointOver = {}): CurvePoint => ({
      earnings, netIncome, medicalOOP: 0, childPrograms: {}, otherBenefits: 0,
      stateCredits: 0, totalCtc: 0, coverageGap: false, ...over,
      programs: { ...ZERO, ...(over.programs ?? {}) },
    });
    const hs = { programs: { headstart: 12000, ctc: 1500 }, childPrograms: { headstart: 12000 }, totalCtc: 6600 };
    const ca = validateAnswers({
      state: "CA", married: false, age: 30, spouseAge: null, childAges: [4], childDisabled: [false],
      youDisabled: false, spouseDisabled: false, monthlyRent: null, monthlyChildcare: 900,
      annualEarnings: 10000, spouseAnnualEarnings: 0, getsHeadStart: true,
    });
    if (!ca.ok) throw new Error(ca.detail);
    const points = [
      pt(0, 40000, hs), pt(10000, 45000, hs),
      pt(20000, 27000, { programs: { ctc: 0 }, totalCtc: 6600 }),   // Head Start ends: deferred
      pt(30000, 33000, { programs: { snap: 4000 }, totalCtc: 6600 }),
      pt(40000, 28000, { totalCtc: 0 }),                            // SNAP ends: immediate
      pt(50000, 60000, { totalCtc: 0 }),
    ];
    vi.mocked(evaluateOffline).mockReturnValue(
      evaluateCurve(ca.value, { year: "2026", currentEarnings: 10000, points }, "live"),
    );
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    expect(await main(["curve", "--state", "CA", "--kids", "4", "--earnings", "10000", "--offline"])).toBe(0);
    const out = log.mock.calls[0][0] as string;
    expect(out).toContain("later, at the next renewal");
    expect(out).toContain("45 CFR 1302.12(j)(1)");
    // The immediate block is above it and holds only the SNAP cliff.
    expect(out.indexOf("snap")).toBeLessThan(out.indexOf("later, at the next renewal"));
    expect(out.indexOf("headstart")).toBeGreaterThan(out.indexOf("later, at the next renewal"));
    // Two child-tax-credit numbers, each labeled for what it is.
    expect(out).toContain("ctc (refundable)");
    expect(out).toContain("program ends: ");
    expect(out).toContain("whole child tax credit");
    // The Head Start line quotes the replacement price, not the sticker alone.
    expect(out).toContain("full-day preschool place");
  });

  it("prints the same approximation with the summary rankings", async () => {
    vi.mocked(loadSummary).mockReturnValue({
      generated: "g", year: "2026", archetypes: [], states: { MA: { "married-3": {
        biggestLoss: 0, dangerWidth: 0, cliffCount: 0, deferredCliffCount: 0, safeExit: 0, leap: 0, leapIsLowerBound: false,
        maTafdc: ev.maTafdc!,
      } } },
    });
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    expect(await main(["summary", "--state", "MA"])).toBe(0);
    expect(log.mock.calls.flat()).toContain(ev.maTafdc!.message);
  });
});
