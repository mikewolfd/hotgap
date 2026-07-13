import { describe, it, expect } from "vitest";
import {
  FULL_TIME_HOURS_PER_YEAR, minWageFor, fullTimeEarningsAt, hoursPerWeekAt, formatWagePerHour,
} from "./minWage.js";
import { STATE_NAMES, STATE_MIN_WAGE } from "./states.js";

describe("minWage helpers", () => {
  it("uses a 2,080-hour full-time year", () => {
    expect(FULL_TIME_HOURS_PER_YEAR).toBe(2080);
  });

  it("looks up a state's minimum wage, or null when unknown", () => {
    expect(minWageFor("TX")).toBe(7.25);
    expect(minWageFor("CA")).toBe(16.90);
    expect(minWageFor("ZZ")).toBeNull();
  });

  it("computes full-time earnings at a wage", () => {
    expect(fullTimeEarningsAt(7.25)).toBe(15080);
    expect(fullTimeEarningsAt(16.90)).toBeCloseTo(35152, 0);
  });

  it("computes hours per week to reach an annual figure", () => {
    // Full-time minimum earnings is exactly 40 hours/week by construction.
    expect(hoursPerWeekAt(15080, 7.25)).toBeCloseTo(40, 5);
    // A $6k/yr dead-zone cliff is ~16 hours a week at the federal floor.
    expect(hoursPerWeekAt(6000, 7.25)).toBeCloseTo(15.9, 1);
  });

  it("formats an hourly wage with cents", () => {
    expect(formatWagePerHour(7.25)).toBe("$7.25");
    expect(formatWagePerHour(14)).toBe("$14.00");
    expect(formatWagePerHour(16.9)).toBe("$16.90");
  });
});

describe("STATE_MIN_WAGE data", () => {
  it("has a positive wage for every state HotGap names, and no extras", () => {
    expect(Object.keys(STATE_MIN_WAGE).sort()).toEqual(Object.keys(STATE_NAMES).sort());
    for (const [code, wage] of Object.entries(STATE_MIN_WAGE)) {
      // Never below the federal floor — the effective minimum for covered work.
      expect(wage, code).toBeGreaterThanOrEqual(7.25);
    }
  });
});
