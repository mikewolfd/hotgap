import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parsePEResponse, PEParseError } from "./parse.js";

const fixture = JSON.parse(
  readFileSync(new URL("../../fixtures/pe-ca-single-1kid-101.json", import.meta.url), "utf8"),
);

describe("parsePEResponse", () => {
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
