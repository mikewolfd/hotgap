import { describe, it, expect } from "vitest";
import { validateAnswers } from "./validate.js";

const good = {
  state: "CA", married: false, age: 30, spouseAge: null, childAges: [5],
  youDisabled: false, spouseDisabled: false, childDisabled: [false],
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
    expect(validateAnswers({ ...good, childAges: [1, 2, 3, 4, 5, 6, 7], childDisabled: [false, false, false, false, false, false, false] }).ok).toBe(false);
    expect(validateAnswers({ ...good, childAges: [18], childDisabled: [false] }).ok).toBe(false);
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

  describe("age", () => {
    it("requires an integer age between 16 and 110", () => {
      expect(validateAnswers({ ...good, age: 15 }).ok).toBe(false);
      expect(validateAnswers({ ...good, age: 111 }).ok).toBe(false);
      expect(validateAnswers({ ...good, age: 30.5 }).ok).toBe(false);
      const { age, ...noAge } = good;
      expect(validateAnswers(noAge).ok).toBe(false);
    });
    it("accepts the boundary ages 16 and 110", () => {
      expect(validateAnswers({ ...good, age: 16 }).ok).toBe(true);
      expect(validateAnswers({ ...good, age: 110 }).ok).toBe(true);
    });
  });

  describe("spouseAge", () => {
    it("requires an integer 16..110 when married", () => {
      const married = { ...good, married: true, spouseAge: 28, spouseDisabled: false };
      const r = validateAnswers(married);
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value.spouseAge).toBe(28);
      expect(validateAnswers({ ...married, spouseAge: null }).ok).toBe(false);
      expect(validateAnswers({ ...married, spouseAge: 15 }).ok).toBe(false);
      expect(validateAnswers({ ...married, spouseAge: 111 }).ok).toBe(false);
      const { spouseAge, ...noSpouseAge } = married;
      expect(validateAnswers(noSpouseAge).ok).toBe(false);
    });
    it("forces spouseAge to null when unmarried, even if one was sent", () => {
      const r = validateAnswers({ ...good, married: false, spouseAge: 40 });
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value.spouseAge).toBeNull();
    });
  });

  describe("disability flags", () => {
    it("rejects non-boolean youDisabled/spouseDisabled", () => {
      expect(validateAnswers({ ...good, youDisabled: "yes" }).ok).toBe(false);
      expect(validateAnswers({ ...good, married: true, spouseAge: 28, spouseDisabled: "no" }).ok).toBe(false);
    });
    it("accepts spouseDisabled true when married", () => {
      const r = validateAnswers({ ...good, married: true, spouseAge: 28, spouseDisabled: true });
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value.spouseDisabled).toBe(true);
    });
    it("forces spouseDisabled to false when unmarried", () => {
      const r = validateAnswers({ ...good, married: false, spouseDisabled: true });
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value.spouseDisabled).toBe(false);
    });
  });

  describe("childDisabled", () => {
    it("defaults to all-false when absent (old clients)", () => {
      const { childDisabled, ...noChildDisabled } = good;
      const r = validateAnswers(noChildDisabled);
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value.childDisabled).toEqual([false]);
    });
    it("rejects a length mismatch with childAges", () => {
      expect(validateAnswers({ ...good, childAges: [5, 8], childDisabled: [false] }).ok).toBe(false);
    });
    it("rejects non-boolean entries", () => {
      expect(validateAnswers({ ...good, childDisabled: ["yes"] }).ok).toBe(false);
    });
    it("sorts childDisabled with the same permutation as childAges", () => {
      const r = validateAnswers({ ...good, childAges: [10, 3, 7], childDisabled: [true, false, true] });
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.value.childAges).toEqual([3, 7, 10]);
        expect(r.value.childDisabled).toEqual([false, true, true]);
      }
    });
  });

  it("accepts take-up booleans and defaults them to false when absent", () => {
    const r = validateAnswers({
      state: "CA", married: false, childAges: [3], childDisabled: [false],
      monthlyRent: 1500, monthlyChildcare: null, annualEarnings: 30000,
      spouseAnnualEarnings: 0, age: 30, spouseAge: null, youDisabled: false,
      spouseDisabled: false,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.getsHeadStart).toBe(false);
      expect(r.value.getsHousing).toBe(false);
      expect(r.value.hasEmployerCoverage).toBe(false);
    }
  });

  it("preserves take-up booleans when provided", () => {
    const r = validateAnswers({
      state: "CA", married: true, childAges: [], childDisabled: [],
      monthlyRent: null, monthlyChildcare: null, annualEarnings: 40000,
      spouseAnnualEarnings: 20000, age: 30, spouseAge: 30, youDisabled: false,
      spouseDisabled: false, getsHeadStart: true, getsHousing: true, hasEmployerCoverage: true,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.getsHeadStart).toBe(true);
      expect(r.value.getsHousing).toBe(true);
      expect(r.value.hasEmployerCoverage).toBe(true);
    }
  });

  it("accepts a 5-digit countyFips and defaults it to null when absent or malformed", () => {
    const good = { state: "CA", married: false, childAges: [], childDisabled: [], monthlyRent: null, monthlyChildcare: null, annualEarnings: 30000, spouseAnnualEarnings: 0, age: 30, spouseAge: null, youDisabled: false, spouseDisabled: false };
    const a = validateAnswers({ ...good, countyFips: "06075" });
    expect(a.ok).toBe(true); if (a.ok) expect(a.value.countyFips).toBe("06075");
    const b = validateAnswers({ ...good, countyFips: "6075" });
    if (b.ok) expect(b.value.countyFips).toBeNull();
    const c = validateAnswers(good);
    if (c.ok) expect(c.value.countyFips).toBeNull();
  });
});
