import { describe, it, expect } from "vitest";
import { validateAnswers } from "./validate.js";

const good = {
  state: "CA", married: false, childAges: [5],
  monthlyRent: 1500, monthlyChildcare: null,
  annualEarnings: 30000, spouseAnnualEarnings: 0,
};

describe("validateAnswers", () => {
  it("accepts a valid payload and returns a normalized copy", () => {
    const r = validateAnswers(good);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.state).toBe("CA");
  });
  it("rejects unknown state codes", () => {
    expect(validateAnswers({ ...good, state: "ZZ" }).ok).toBe(false);
  });
  it("rejects more than 6 children and out-of-range ages", () => {
    expect(validateAnswers({ ...good, childAges: [1, 2, 3, 4, 5, 6, 7] }).ok).toBe(false);
    expect(validateAnswers({ ...good, childAges: [18] }).ok).toBe(false);
  });
  it("clamps money fields into sane ranges", () => {
    const r = validateAnswers({ ...good, monthlyRent: 99999, annualEarnings: 9_999_999 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.monthlyRent).toBe(10000);
      expect(r.value.annualEarnings).toBe(500000);
    }
  });
  it("rejects non-objects and missing fields", () => {
    expect(validateAnswers(null).ok).toBe(false);
    expect(validateAnswers({}).ok).toBe(false);
    expect(validateAnswers({ ...good, annualEarnings: "lots" }).ok).toBe(false);
  });
  it("zeroes spouse earnings when unmarried", () => {
    const r = validateAnswers({ ...good, spouseAnnualEarnings: 50000 });
    if (r.ok) expect(r.value.spouseAnnualEarnings).toBe(0);
  });
});
