import { describe, it, expect } from "vitest";
import { FULL_TIME_HOURS_PER_YEAR, fullTimeEarningsAt, hoursPerWeekAt, minWageContext, minWageFor } from "./minWage.js";

describe("minWage helpers", () => {
  it("uses a 2,080-hour full-time year", () => {
    expect(FULL_TIME_HOURS_PER_YEAR).toBe(2080);
    expect(fullTimeEarningsAt(7.25)).toBe(15080);
  });

  it("looks up a state's minimum wage, or null when unknown", () => {
    expect(minWageFor("TX")).toBe(7.25);
    expect(minWageFor("CA")).toBe(16.90);
    expect(minWageFor("ZZ")).toBeNull();
  });

  it("computes hours per week to reach an annual figure", () => {
    expect(hoursPerWeekAt(15080, 7.25)).toBeCloseTo(40, 5);
    expect(hoursPerWeekAt(6000, 7.25)).toBeCloseTo(15.9, 1);
  });
});

describe("minWageContext", () => {
  it("frames a small cliff as whole hours a week at the state minimum", () => {
    expect(minWageContext("TX", 6000)).toEqual({ wage: 7.25, fullTimeEarnings: 15080, hoursPerWeek: 16 });
  });
  it("never reports less than one hour", () => {
    expect(minWageContext("TX", 10)!.hoursPerWeek).toBe(1);
  });
  it("gives null hours above full-time minimum-wage earnings, and null for an unknown state", () => {
    expect(minWageContext("CA", 50000)).toEqual({ wage: 16.90, fullTimeEarnings: 35152, hoursPerWeek: null });
    expect(minWageContext("ZZ", 6000)).toBeNull();
  });
});
