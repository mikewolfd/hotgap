import { describe, it, expect } from "vitest";
import { toAnnual, fromAnnual, roundTo } from "./income.js";

describe("toAnnual", () => {
  it("converts hourly pay using hours/week × 52", () => {
    expect(toAnnual({ amount: 20, unit: "hour", hoursPerWeek: 40 })).toBe(41600);
  });
  it("defaults hourly to 40 hours/week", () => {
    expect(toAnnual({ amount: 15, unit: "hour" })).toBe(31200);
  });
  it("converts monthly and yearly", () => {
    expect(toAnnual({ amount: 3000, unit: "month" })).toBe(36000);
    expect(toAnnual({ amount: 50000, unit: "year" })).toBe(50000);
  });
});

describe("fromAnnual", () => {
  it("round-trips hourly", () => {
    expect(fromAnnual(41600, "hour", 40)).toBeCloseTo(20);
  });
  it("round-trips monthly", () => {
    expect(fromAnnual(36000, "month")).toBe(3000);
  });
});

describe("roundTo", () => {
  it("rounds to the nearest step", () => {
    expect(roundTo(21956, 100)).toBe(22000);
    expect(roundTo(19.4, 0.5)).toBe(19.5);
  });
});
