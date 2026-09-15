import { describe, it, expect } from "vitest";
import { ESI_EMPLOYEE_CONTRIBUTION, FPL_2025, fpl2025, SGA_ANNUAL, SGA_MONTHLY } from "./policyYear.js";

describe("fpl2025", () => {
  // Every figure below is read straight off ASPE's 2025 detailed table
  // (90 FR 5108), so this test is the pin on the ladder arithmetic: the file
  // stores a base and an increment, and these are the published rows.
  it("reproduces the published 48-contiguous ladder", () => {
    expect([1, 2, 3, 4, 5].map((n) => fpl2025("TX", n))).toEqual([15_650, 21_150, 26_650, 32_150, 37_650]);
  });

  it("reproduces the published Alaska and Hawaii ladders", () => {
    expect([1, 2, 3, 4].map((n) => fpl2025("AK", n))).toEqual([19_550, 26_430, 33_310, 40_190]);
    expect([1, 2, 3, 4].map((n) => fpl2025("HI", n))).toEqual([17_990, 24_320, 30_650, 36_980]);
  });

  it("gives every other state the contiguous ladder and never goes below a household of one", () => {
    expect(fpl2025("NY", 3)).toBe(FPL_2025.contiguous.base + 2 * FPL_2025.contiguous.perPerson);
    expect(fpl2025("CA", 0)).toBe(fpl2025("CA", 1));
  });
});

describe("hand-held annual constants", () => {
  it("pins 2026 substantial gainful activity, non-blind", () => {
    // ssa.gov/oact/cola/sga.html, confirmed 2026-09-14.
    expect(SGA_MONTHLY).toBe(1690);
    expect(SGA_ANNUAL).toBe(20_280);
  });

  it("pins the MEPS-IC 2024 employee contributions, family above single", () => {
    // AHRQ MEPS-IC 2024 Tables II.C.2 and II.D.2, United States row.
    expect(ESI_EMPLOYEE_CONTRIBUTION).toEqual({ single: 1_789, family: 7_216 });
  });
});
