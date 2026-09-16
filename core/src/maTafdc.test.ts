import { describe, it, expect } from "vitest";
import { maTafdcGrant, correctMaTafdc, type MaTafdcInputs } from "./maTafdc.js";
import { answersFor, archetypeById } from "./archetypes.js";
import { evaluateCurve } from "./evaluate.js";
import { point as pt } from "./testing.js";

const inputs: MaTafdcInputs = {
  paymentStandard: 14280, nonFinancialEligible: true, unearnedIncome: 0,
  dependentCareDeduction: 0, clothingAllowance: 0, infantBenefit: 0, duplicatedTanf: 0, engineUsedCorrectedGrant: false,
};
const answers = answersFor("MA", archetypeById("married-3"));
const point = (earnings: number, tanf: number) => pt(earnings, earnings + tanf, { programs: { tanf, snap: 1000 }, maTafdc: inputs });

describe("Massachusetts ongoing-recipient TAFDC", () => {
  it("uses the published five-person standard and a 50% taper after one earner's $200 deduction", () => {
    expect(maTafdcGrant(0, 0, inputs)).toBe(14280);
    expect(maTafdcGrant(2400, 0, inputs)).toBe(14280);
    // Whole monthly dollars, annualized; no $9,880 cliff at $27,000.
    expect(maTafdcGrant(24000, 0, inputs)).toBe(3480);
    expect(maTafdcGrant(26000, 0, inputs)).toBe(2472);
    expect(maTafdcGrant(27000, 0, inputs)).toBe(1980);
    expect(maTafdcGrant(30960, 0, inputs)).toBe(0);
    expect(maTafdcGrant(30000, 0, { ...inputs, paymentStandard: 13800 })).toBe(0);
  });

  it("caps each earner's deduction at their earnings and deducts unearned income without the 50% disregard", () => {
    expect(maTafdcGrant(12000, 12000, inputs)).toBe(4680);
    expect(maTafdcGrant(0, 24000, inputs)).toBe(3480);
    expect(maTafdcGrant(1200, 24000, inputs)).toBe(3480);
    expect(maTafdcGrant(24000, 0, { ...inputs, unearnedIncome: 1200 })).toBe(2280);
    expect(maTafdcGrant(24000, 0, { ...inputs, dependentCareDeduction: 1200 })).toBe(4680);
  });

  it("retains non-financial ineligibility and the $10 minimum monthly payment", () => {
    expect(maTafdcGrant(0, 0, { ...inputs, nonFinancialEligible: false, clothingAllowance: 1500 })).toBe(0);
    expect(maTafdcGrant(30720, 0, inputs)).toBe(120);
    expect(maTafdcGrant(30744, 0, inputs)).toBe(0);
  });

  it("budgets the September clothing allowance for one month, including beyond the ordinary grant limit", () => {
    const withClothing = { ...inputs, clothingAllowance: 1500 };
    expect(maTafdcGrant(0, 0, withClothing)).toBe(15780);
    expect(maTafdcGrant(24000, 0, withClothing)).toBe(4980);
    expect(maTafdcGrant(30960, 0, withClothing)).toBe(1500);
    expect(maTafdcGrant(33360, 0, withClothing)).toBe(1400);
    expect(maTafdcGrant(66960, 0, withClothing)).toBe(0);
  });

  it("replaces TANF and its net-income contribution before analysis, leaving linked benefits labeled approximate", () => {
    const points = [point(25000, 10130), point(26000, 9880), point(27000, 0)];
    const original = structuredClone(points);
    const ev = evaluateCurve(answers, { year: "2026", currentEarnings: 26000, points }, "live");
    expect(ev.curve.points.map((p) => p.programs.tanf)).toEqual([2976, 2472, 1980]);
    expect(ev.curve.points[1].netIncome).toBe(28472);
    expect(ev.curve.points.map((p) => p.programs.snap)).toEqual([1000, 1000, 1000]);
    expect(ev.analysis.cliffs).toHaveLength(0);
    expect(ev.maTafdc).toMatchObject({ status: "applied", message: expect.stringContaining("approximate") });
    expect(points).toEqual(original);
    expect(correctMaTafdc(answers, ev.curve.points).points).toEqual(ev.curve.points);
  });

  it("uses the archetype's spouse income offline, never the caller's own", () => {
    const curve = { year: "2026", currentEarnings: 26000, points: [point(25000, 10130), point(26000, 9880)] };
    // A caller with a working spouse is read against the DUAL-earner archetype,
    // whose spouse earns $15,080 — not against the $40,000 they reported, and
    // not against a married archetype whose spouse earns nothing. TAFDC counts
    // a spouse's wages, so which of the two it is changes the grant.
    const dual = answersFor("MA", archetypeById("married-dual-3"));
    const personal = evaluateCurve({ ...answers, spouseAnnualEarnings: 40000 }, curve, "archetype");
    expect(personal.curve.points).toEqual(evaluateCurve(dual, curve, "archetype").curve.points);
    // Their own figure changes nothing: $40,000 and $90,000 give one answer.
    expect(evaluateCurve({ ...answers, spouseAnnualEarnings: 90000 }, curve, "archetype").curve.points)
      .toEqual(personal.curve.points);
    // And it is a different answer from the single-earner archetype's.
    expect(personal.curve.points).not.toEqual(evaluateCurve(answers, curve, "archetype").curve.points);
  });

  it("removes TANF's duplicate from both net income and otherBenefits exactly once", () => {
    const raw = point(26000, 9880);
    raw.netIncome += 9880;
    raw.otherBenefits = 9880 + 1446;
    raw.maTafdc = { ...inputs, duplicatedTanf: 9880 };
    const corrected = correctMaTafdc(answers, [raw]).points;
    expect(corrected[0].netIncome).toBe(26000 + 2472);
    expect(corrected[0].otherBenefits).toBe(1446);
    expect(corrected[0].maTafdc?.duplicatedTanf).toBe(0);
    expect(correctMaTafdc(answers, corrected).points).toEqual(corrected);
    expect(raw.maTafdc.duplicatedTanf).toBe(9880);
  });

  it("flags old Massachusetts curves without guessing, and leaves other states and childless households alone", () => {
    const { maTafdc: _, ...old } = point(26000, 9880);
    const result = correctMaTafdc(answers, [old]);
    expect(result.points).toEqual([old]);
    expect(result.correction?.status).toBe("unavailable");
    expect(correctMaTafdc({ ...answers, state: "CA" }, [old]).correction).toBeNull();
    expect(correctMaTafdc({ ...answers, childAges: [] }, [old]).correction).toBeNull();
  });
});
