import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parsePEResponse, PEParseError, PERSON_LEVEL_PROGRAMS } from "./parse.js";
import { CASH_PROGRAMS } from "./types.js";

const fixture = JSON.parse(
  readFileSync(new URL("../../fixtures/pe-ca-single-1kid-101.json", import.meta.url), "utf8"),
);

describe("parsePEResponse", () => {
  const maFixture = JSON.parse(readFileSync(new URL("../../docs/upstream/evidence/local-ma-tafdc.response.json", import.meta.url), "utf8"));

  it("retains Massachusetts calculation inputs from a recorded live sweep", () => {
    const points = parsePEResponse(maFixture, 11);
    expect(points[2].programs.tanf).toBe(9880);
    expect(points[2].maTafdc).toEqual({
      paymentStandard: 14280, nonFinancialEligible: true, unearnedIncome: 0,
      dependentCareDeduction: 0, clothingAllowance: 1500, infantBenefit: 0,
      duplicatedTanf: 9880, engineUsedCorrectedGrant: false
    });
    expect(points[3].programs.tanf).toBe(0);
    // Inputs survive even where upstream's faulty financial test ends TANF.
    expect(points[3].maTafdc?.nonFinancialEligible).toBe(true);
  });

  it("rejects incomplete, non-finite or malformed Massachusetts inputs", () => {
    const body = structuredClone(maFixture);
    body.result.spm_units.spm_unit.ma_tafdc_non_financial_eligible["2026"] = [true];
    expect(() => parsePEResponse(body, 11)).toThrow(PEParseError);
    body.result.spm_units.spm_unit.ma_tafdc_non_financial_eligible["2026"] = true;
    expect(parsePEResponse(body, 11)[0].maTafdc?.nonFinancialEligible).toBe(true);
    body.result.spm_units.spm_unit.ma_tafdc_payment_standard["2026"][0] = NaN;
    expect(() => parsePEResponse(body, 11)).toThrow(PEParseError);
    delete body.result.spm_units.spm_unit.ma_tafdc_countable_unearned_income;
    expect(() => parsePEResponse(body, 11)).toThrow(PEParseError);
  });

  it("produces one point per axis step with reconstructed earnings", () => {
    const points = parsePEResponse(fixture, 101);
    expect(points).toHaveLength(101);
    expect(points[0].earnings).toBe(0);
    expect(points[100].earnings).toBe(100000);
    expect(points[30].earnings).toBe(30000);
  });

  it("net income is PolicyEngine's net minus medical out-of-pocket, with the ACA subsidy left in", () => {
    const points = parsePEResponse(fixture, 101);
    const raw = Object.values(fixture.result.households as Record<string, Record<string, Record<string, number[]>>>)[0].household_net_income["2026"];
    expect(points[30].netIncome + points[30].medicalOOP).toBeCloseTo(raw[30], 6);
    expect(points[30].netIncome).toBeCloseTo(55660.81, 1);
    expect(points[31].netIncome).toBeCloseTo(33572.16, 1);
    // The premium tax credit is reported as the `aca` program, never subtracted.
    expect(points[30].programs.aca).toBeGreaterThan(6000);
    expect(points[0].programs.snap).toBeGreaterThan(0);
    expect(points[100].programs.snap).toBe(0);
  });

  it("sums person-level programs across people", () => {
    const points = parsePEResponse(fixture, 101);
    const raw = fixture.result.people;
    const youMed = raw["you"].medicaid["2026"][0];
    const kidMed = raw["your first dependent"].medicaid["2026"][0];
    expect(points[0].programs.medicaid).toBeCloseTo(youMed + kidMed, 1);
  });

  it("subtracts MOOP only — the premium tax credit is not in household_net_income, so it must not be subtracted again", () => {
    const pts = parsePEResponse(fixture, 101);
    const raw = fixture.result.households["your household"].household_net_income["2026"];
    const moop = fixture.result.spm_units["your spm_unit"].spm_unit_medical_out_of_pocket_expenses["2026"];
    const ptc = fixture.result.tax_units["your tax unit"].premium_tax_credit["2026"];
    const i = 50;
    expect(ptc[i]).toBeGreaterThan(1000); // only meaningful where a subsidy exists
    expect(pts[i].netIncome).toBeCloseTo(raw[i] - moop[i], 2);
  });

  it("splits person-level programs into the children's share by AGE, not by key name", () => {
    const points = parsePEResponse(fixture, 101);
    const raw = fixture.result.people;
    // The recorded payload names the child "your first dependent"; translate.ts
    // names it "child1". Neither name is what the split is keyed on.
    expect(Object.keys(raw)).toContain("your first dependent");
    const youMed = raw["you"].medicaid["2026"][0];
    const kidMed = raw["your first dependent"].medicaid["2026"][0];
    expect(points[0].childPrograms.medicaid).toBeCloseTo(kidMed, 1);
    expect(points[0].programs.medicaid - (points[0].childPrograms.medicaid ?? 0)).toBeCloseTo(youMed, 1);
    // Head Start belongs entirely to the child, so the household total and the
    // children's total are the same number wherever it is paid.
    const hs = points.findIndex((p) => p.programs.headstart > 0);
    expect(points[hs].childPrograms.headstart).toBeCloseTo(points[hs].programs.headstart, 6);
    expect(PERSON_LEVEL_PROGRAMS).toEqual(["medicaid", "chip", "wic", "ssi", "headstart"]);
  });

  it("reports no untracked benefits when household_benefits is absent (the July fixture predates it)", () => {
    expect(fixture.result.households["your household"].household_benefits).toBeUndefined();
    const points = parsePEResponse(fixture, 101);
    expect(points.every((p) => p.otherBenefits === 0)).toBe(true);
    expect(points.every((p) => p.coverageGap === false)).toBe(true);
  });

  it("computes otherBenefits as household_benefits minus the tracked cash programs", () => {
    const tracked = parsePEResponse(fixture, 101).map((p) =>
      CASH_PROGRAMS.reduce((sum, id) => sum + (p.programs[id] ?? 0), 0),
    );
    const withBenefits = (values: number[]) => {
      const body = JSON.parse(JSON.stringify(fixture));
      body.result.households["your household"].household_benefits = { "2026": values };
      return parsePEResponse(body, 101);
    };
    expect(withBenefits(tracked.map((c) => c + 3000)).every((p) => Math.abs(p.otherBenefits - 3000) < 1e-6)).toBe(true);
    // Verified live 2026-09-14: for a household whose only benefits are the
    // tracked ones the two are equal to the dollar, so any negative remainder
    // is float noise and floors at 0 rather than becoming a negative benefit.
    expect(withBenefits(tracked.map((c) => c - 1e-9)).every((p) => p.otherBenefits === 0)).toBe(true);
  });

  it("computes stateCredits as the refundable credits the federal EITC and CTC do not explain", () => {
    // Verified live 2026-09-15 against a Colorado single parent of three: at
    // $25,000, household_refundable_tax_credits $21,648 less eitc $7,997 and
    // refundable_ctc $3,375 is $10,276 of Colorado credits. The shape is
    // reproduced here on the committed CA fixture so the test needs no network.
    const base = parsePEResponse(fixture, 101);
    const withState = (extra: number) => {
      const body = JSON.parse(JSON.stringify(fixture));
      body.result.households["your household"].household_refundable_tax_credits = {
        "2026": base.map((p) => p.programs.eitc + p.programs.ctc + extra),
      };
      return parsePEResponse(body, 101);
    };
    expect(withState(10_276).every((p) => Math.abs(p.stateCredits - 10_276) < 1e-6)).toBe(true);
    // Float noise around a difference that is zero in most states floors at 0
    // rather than becoming a negative credit.
    expect(withState(-1e-9).every((p) => p.stateCredits === 0)).toBe(true);
    // Absent from the July fixture, which never asked for the variable.
    expect(fixture.result.households["your household"].household_refundable_tax_credits).toBeUndefined();
    expect(base.every((p) => p.stateCredits === 0)).toBe(true);
  });

  it("keeps the whole child tax credit apart from the refundable part, and falls back to it", () => {
    const body = JSON.parse(JSON.stringify(fixture));
    const refundable = body.result.tax_units["your tax unit"].refundable_ctc["2026"] as number[];
    body.result.tax_units["your tax unit"].ctc = { "2026": refundable.map(() => 6600) };
    const pts = parsePEResponse(body, 101);
    expect(pts.every((p) => p.totalCtc === 6600)).toBe(true);
    expect(pts[60].programs.ctc).toBeLessThan(6600);
    // The July fixture predates the request; the refundable series is all it knows.
    expect(fixture.result.tax_units["your tax unit"].ctc).toBeUndefined();
    const old = parsePEResponse(fixture, 101);
    expect(old.every((p) => p.totalCtc === p.programs.ctc)).toBe(true);
  });

  it("throws PEParseError on an error-status body", () => {
    expect(() => parsePEResponse({ status: "error", message: "nope" }, 101)).toThrow(PEParseError);
  });

  it("throws PEParseError when arrays are missing or wrong length", () => {
    expect(() => parsePEResponse({ status: "ok", result: {} }, 101)).toThrow(PEParseError);
  });

  it("broadcasts a forced-scalar program override across all points (take-up off)", () => {
    // A take-up override (e.g. head_start:0) comes back from PolicyEngine as a
    // scalar, not a per-axis array; parse must hold it constant across points.
    const body: any = JSON.parse(JSON.stringify(fixture));
    body.result.spm_units["your spm_unit"].spm_unit_capped_housing_subsidy = { "2026": 0 };
    const pts = parsePEResponse(body, 101);
    expect(pts).toHaveLength(101);
    expect(pts.every((p) => p.programs.housing === 0)).toBe(true);
  });

});

describe("the state child-care subsidy", () => {
  // Two points, and only the variables parsePEResponse insists on. The numbers
  // are the live Colorado and Connecticut probes of 2026-09-15 at $25,000 and
  // $45,000 (docs/upstream/evidence/childcare-co-full.json, childcare-ct-full.json).
  const body = (state: string, subsidy: [number, number], benefits: [number, number]) => ({
    status: "ok",
    result: {
      axes: [[{ min: 25000, max: 45000, count: 2 }]],
      households: {
        h: {
          state_name: { "2026": state },
          household_net_income: { "2026": [45226, 45928] },
          household_benefits: { "2026": benefits },
        },
      },
      spm_units: {
        s: {
          snap: { "2026": [1553, 0] }, tanf: { "2026": [0, 0] },
          spm_unit_capped_housing_subsidy: { "2026": [0, 0] },
          free_school_meals: { "2026": [0, 0] }, reduced_price_school_meals: { "2026": [0, 0] },
          spm_unit_medical_out_of_pocket_expenses: { "2026": [0, 3169] },
          child_care_subsidies: { "2026": subsidy },
        },
      },
      tax_units: { t: { eitc: { "2026": [0, 0] }, refundable_ctc: { "2026": [0, 0] }, premium_tax_credit: { "2026": [0, 0] } } },
      people: { you: { age: { "2026": [30, 30] } }, child1: { age: { "2026": [3, 3] } } },
    },
  });

  it("reads the subsidy as programs.childcare in either kind of state", () => {
    // Colorado: household_benefits carries SNAP + the subsidy.
    const co = parsePEResponse(body("CO", [8913, 0], [10466, 0]), 2);
    expect(co[0].programs.childcare).toBe(8913);
    // Connecticut: same variable, same value, but household_benefits is SNAP alone.
    const ct = parsePEResponse(body("CT", [8850, 0], [2577, 0]), 2);
    expect(ct[0].programs.childcare).toBe(8850);
  });

  it("takes it out of the untracked remainder where net income counted it, and nowhere else", () => {
    // CO is one of the 23 states in `gov.household.household_state_benefits`,
    // so the subsidy IS inside household_benefits: naming it must leave 0 over.
    expect(parsePEResponse(body("CO", [8913, 0], [10466, 0]), 2)[0].otherBenefits).toBe(0);
    // CT is not, so household_benefits never held it. Subtracting it anyway
    // would eat $8,850 of somebody else's untracked benefit — here, a $3,000
    // one that must survive intact.
    expect(parsePEResponse(body("CT", [8850, 0], [4553, 0]), 2)[0].otherBenefits).toBe(3000);
  });

  it("is simply absent — not an error — on a curve that never asked for it", () => {
    const b = body("CT", [0, 0], [2577, 0]);
    delete (b.result.spm_units.s as Record<string, unknown>).child_care_subsidies;
    const points = parsePEResponse(b, 2);
    expect(points[0].programs.childcare).toBeUndefined();
    // …and such a body does not even need to carry a state.
    delete (b.result.households.h as Record<string, unknown>).state_name;
    expect(parsePEResponse(b, 2)[0].otherBenefits).toBe(1024);
  });

  it("refuses to guess the state when there IS a subsidy to place", () => {
    const b = body("CT", [8850, 0], [2577, 0]);
    delete (b.result.households.h as Record<string, unknown>).state_name;
    expect(() => parsePEResponse(b, 2)).toThrow(PEParseError);
  });
});
