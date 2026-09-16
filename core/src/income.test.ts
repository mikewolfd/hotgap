import { describe, it, expect } from "vitest";
import { toAnnual, fromAnnual } from "./income.js";

describe("toAnnual", () => {
  it("converts hourly pay using hours/week × 52", () => {
    expect(toAnnual({ amount: 20, unit: "hour", hoursPerWeek: 40 })).toBe(41600);
  });
  it("defaults hourly to 40 hours/week", () => {
    expect(toAnnual({ amount: 15, unit: "hour" })).toBe(31200);
  });
  it("converts weekly, monthly and yearly", () => {
    expect(toAnnual({ amount: 600, unit: "week" })).toBe(31200);
    expect(toAnnual({ amount: 3000, unit: "month" })).toBe(36000);
    expect(toAnnual({ amount: 50000, unit: "year" })).toBe(50000);
  });
});

describe("fromAnnual", () => {
  it("round-trips hourly", () => {
    expect(fromAnnual(41600, "hour", 40)).toBeCloseTo(20);
  });
  it("round-trips weekly and monthly", () => {
    expect(fromAnnual(31200, "week")).toBe(600);
    expect(fromAnnual(36000, "month")).toBe(3000);
  });
});

