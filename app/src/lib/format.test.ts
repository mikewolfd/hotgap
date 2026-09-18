import { describe, expect, it } from "vitest";
import { payChangeRounded, payRounded } from "./format.js";

describe("payChangeRounded — a change in pay takes a fifth of the unit's step", () => {
  it("keeps $400 a year as $400, not the $0 the pay-level step would give", () => {
    expect(payChangeRounded(400, "year")).toBe(400);
    expect(payRounded(400, "year")).toBe(500);
    expect(payChangeRounded(430, "year")).toBe(400);
    expect(payChangeRounded(0.04 * 10_000, "month")).toBe(30);
  });
  it("rounds an hourly change to 5¢", () => {
    expect(payChangeRounded(0.05 * 10_000, "hour", 40)).toBeCloseTo(0.25, 6);
    expect(payChangeRounded(0.02 * 10_000, "hour", 40)).toBeCloseTo(0.10, 6);
  });
});
