import { describe, it, expect } from "vitest";
import {
  ESI_EMPLOYEE_CONTRIBUTION, ESI_FULL_TIME_HOURS, FPL_2025, fpl2025,
  MEDICARE_PART_B_ANNUAL, MEDICARE_PART_B_MONTHLY, SGA_ANNUAL, SGA_MONTHLY,
} from "./policyYear.js";

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

  it("pins all three MEPS-IC 2024 employee contributions, in ascending tier order", () => {
    // AHRQ MEPS-IC 2024 Tables II.C.2 (single), II.E.2 (employee-plus-one) and
    // II.D.2 (family), United States row, all firm sizes.
    expect(ESI_EMPLOYEE_CONTRIBUTION).toEqual({ single: 1_789, plusOne: 4_707, family: 7_216 });
    const { single, plusOne, family } = ESI_EMPLOYEE_CONTRIBUTION;
    expect(single).toBeLessThan(plusOne);
    expect(plusOne).toBeLessThan(family);
  });

  it("pins the ACA full-time hours threshold", () => {
    // 26 U.S.C. 4980H(c)(4)(A): 30 hours of service a week.
    expect(ESI_FULL_TIME_HOURS).toBe(30);
  });

  it("pins the 2026 standard Medicare Part B premium", () => {
    // CMS fact sheet 2025-11-14 and Federal Register CMS-8091-N: $202.90 a
    // month, up $17.90 from 2025's $185.00. The annual figure is 12 of them.
    expect(MEDICARE_PART_B_MONTHLY).toBe(202.90);
    expect(MEDICARE_PART_B_ANNUAL).toBeCloseTo(2_434.80, 2);
    expect(MEDICARE_PART_B_MONTHLY - 17.90).toBeCloseTo(185.00, 2);
  });
});
