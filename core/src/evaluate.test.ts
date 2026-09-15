import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { analyzeCurve } from "./analyze.js";
import { PolicyEngineError } from "./client.js";
import { evaluateCurve, evaluateHousehold, evaluateOffline } from "./evaluate.js";
import { parsePEResponse } from "./parse.js";
import { validateAnswers } from "./validate.js";
import type { CurvePoint, CurveResponse, HouseholdAnswers } from "./types.js";

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
    const ev = await evaluateHousehold(answers, { fetchImpl: respond(() => new Response(fixture, { status: 200 })) });
    expect(ev.source).toBe("live");
    expect(ev.curve.points).toHaveLength(101);
    expect(ev.curve.points).toEqual(fixturePoints);
    // The CA single-1 archetype is a different household (no rent, 3-year-old),
    // so a live result must not coincide with it point for point.
    expect(ev.curve.points).not.toEqual(evaluateOffline(answers)!.curve.points);
  });
});
