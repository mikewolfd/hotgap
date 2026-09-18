import { afterEach, describe, expect, it, vi } from "vitest";
import { main } from "./cli.js";
import { loadSummary } from "./data.js";
import { evaluateCurve, evaluateOffline } from "./evaluate.js";
import { answersFor, archetypeById } from "./archetypes.js";
import { parsePEResponse } from "./parse.js";
import { readFileSync } from "node:fs";
import { answersWith, point as pt } from "./testing.js";

vi.mock("./evaluate.js", async (original) => ({ ...await original<object>(), evaluateOffline: vi.fn() }));
vi.mock("./data.js", async (original) => ({ ...await original<object>(), loadSummary: vi.fn() }));

const a = answersFor("MA", archetypeById("married-3"));
const raw = JSON.parse(readFileSync(new URL("../../fixtures/pe-ma-married-3kids-11.json", import.meta.url), "utf8"));
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

  it("prints a deferred cliff in the one cliff block with its label row, and labels the refundable CTC", async () => {
    const hs = { programs: { headstart: 12000, ctc: 1500 }, childPrograms: { headstart: 12000 }, totalCtc: 6600 };
    const ca = answersWith({ childAges: [4], monthlyRent: null, monthlyChildcare: 900, annualEarnings: 10000, getsHeadStart: true });
    const points = [
      pt(0, 40000, hs), pt(10000, 45000, hs),
      pt(20000, 27000, { programs: { ctc: 0 }, totalCtc: 6600 }),   // Head Start ends: deferred
      pt(30000, 33000, { programs: { snap: 4000 }, totalCtc: 6600 }),
      pt(40000, 28000, { totalCtc: 0 }),                            // SNAP ends: immediate
      pt(50000, 60000, { totalCtc: 0 }),
    ];
    vi.mocked(evaluateOffline).mockReturnValue(
      evaluateCurve(ca, { year: "2026", currentEarnings: 10000, points }, "live"),
    );
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    expect(await main(["curve", "--state", "CA", "--kids", "4", "--earnings", "10000", "--offline"])).toBe(0);
    const out = log.mock.calls[0][0] as string;
    // One block in axis order — the Head Start cliff first, labelled with when
    // it lands (2026-09-17: counted, never set apart) — then the SNAP cliff.
    expect(out).toContain("lands later, at the end of the next Head Start program year (45 CFR 1302.12(j)(1))");
    expect(out.indexOf("headstart")).toBeLessThan(out.indexOf("lands later"));
    expect(out.indexOf("lands later")).toBeLessThan(out.indexOf("snap"));
    expect(out).not.toContain("later, at the next renewal");
    // …and it drives the verdict: the household at $10,000 stands at the top of the Head Start hole.
    expect(out).toContain("verdict: cliff ahead");
    // Two child-tax-credit numbers, each labeled for what it is.
    expect(out).toContain("ctc (refundable)");
    expect(out).toContain("program ends: ");
    expect(out).toContain("whole child tax credit");
    // The Head Start line quotes the replacement price, not the sticker alone.
    expect(out).toContain("full-day preschool place");
  });

  it("passes --childcare-subsidy through and prints the subsidy like any other program", async () => {
    const ct = answersWith({ state: "CT", childAges: [3], monthlyRent: null, monthlyChildcare: 800, annualEarnings: 25000, getsChildcareSubsidy: true });
    const subsidized = (earnings: number, netIncome: number, childcare: number) => pt(earnings, netIncome, { programs: { childcare } });
    const points = [subsidized(24000, 33000, 8850), subsidized(25000, 34121, 8850), subsidized(26000, 34500, 0), subsidized(27000, 45000, 0)];
    vi.mocked(evaluateOffline).mockReturnValue(
      evaluateCurve(ct, { year: "2026", currentEarnings: 25000, points }, "live"),
    );
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    expect(await main(["curve", "--state", "CT", "--kids", "3", "--childcare", "800", "--childcare-subsidy", "--earnings", "25000", "--offline"])).toBe(0);
    expect(vi.mocked(evaluateOffline).mock.calls[0][0].getsChildcareSubsidy).toBe(true);
    const out = log.mock.calls[0][0] as string;
    expect(out).toContain("childcare");            // the programs-lost column
    expect(out).toContain("program ends: childcare $25,000");
  });

  it("prints the same approximation with the summary rankings", async () => {
    vi.mocked(loadSummary).mockReturnValue({
      generated: "g", year: "2026", archetypes: [], states: { MA: { "married-3": {
        biggestLoss: 0, biggestLossAt: null, biggestLossPrograms: [], dangerWidth: 0, cliffCount: 0, deferredCliffCount: 0, safeExit: 0, leap: 0, leapIsLowerBound: false, axisTop: 150000,
        keepRate: null, roadLo: null, roadHi: null, roadCliffCount: 0, roadWorst: null, biggestLossPosition: null,
        maTafdc: ev.maTafdc!,
      } } },
    });
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    expect(await main(["summary", "--state", "MA"])).toBe(0);
    expect(log.mock.calls.flat()).toContain(ev.maTafdc!.message);
  });

  it("ships the picked states' coverage blocks with the summary JSON", async () => {
    const row = { biggestLoss: 0, dangerWidth: 0, cliffCount: 0, deferredCliffCount: 0, safeExit: 0, leap: 0, leapIsLowerBound: false, axisTop: 150000 };
    const coverage = { CA: { otherBenefits: [{ variable: "housing_assistance" }] }, TX: { otherBenefits: [] } };
    vi.mocked(loadSummary).mockReturnValue({ generated: "g", year: "2026", archetypes: [], states: { CA: { "single-0": row }, TX: { "single-0": row } }, coverage } as never);
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    expect(await main(["summary", "--state", "CA", "--json"])).toBe(0);
    expect(JSON.parse(log.mock.calls[0][0] as string).coverage).toEqual({ CA: coverage.CA });
  });
});
