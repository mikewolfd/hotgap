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
