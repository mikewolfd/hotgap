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
  it("resolves a ZIP to the state and county, and reports a ZIP it cannot place in core's own words", () => {
    const { state: _state, ...noState } = good;
    const sf = validateAnswers({ ...noState, zip: "94110" });
    expect(sf.ok && [sf.value.state, sf.value.countyFips]).toEqual(["CA", "06075"]);
    // A given county wins over the ZIP's; a given state must agree with it.
    const la = validateAnswers({ ...good, zip: "94110", countyFips: "06037" });
    expect(la.ok && la.value.countyFips).toBe("06037");
    expect(validateAnswers({ ...good, state: "NY", zip: "94110" })).toEqual({ ok: false, detail: "ZIP 94110 is in CA, not NY" });
    expect(validateAnswers({ ...noState, zip: "00000" })).toEqual({ ok: false, detail: "no state for ZIP 00000" });
    expect(validateAnswers({ ...good, zip: 94110 })).toEqual({ ok: false, detail: "zip" });
  });
  it("keeps a county in the household's state and rejects one from another state", () => {
    const base = { state: "CA", married: false, age: 30, spouseAge: null, childAges: [], youDisabled: false, spouseDisabled: false, childDisabled: [], monthlyRent: null, monthlyChildcare: null, annualEarnings: 1, spouseAnnualEarnings: 0 };
    const la = validateAnswers({ ...base, countyFips: "06037" });
    expect(la.ok && la.value.countyFips).toBe("06037");
    expect(validateAnswers({ ...base, countyFips: "36061" })).toEqual({ ok: false, detail: "countyFips" });
    const shapeless = validateAnswers({ ...base, countyFips: "6037" });
    expect(shapeless.ok && shapeless.value.countyFips).toBeNull();
  });

  it("defaults the new inputs — citizen, wages, no savings, every entitlement taken up — and checks them when given", () => {
    const v = validateAnswers(good);
    expect(v.ok && v.value).toMatchObject({ youStatus: "citizen", spouseStatus: "citizen", youYearsInUs: null, selfEmployed: false, savings: 0, getsSnap: true, getsTanf: true, getsMedicaid: true, getsWic: true });
    expect(validateAnswers({ ...good, youStatus: "martian" })).toEqual({ ok: false, detail: "youStatus" });
    expect(validateAnswers({ ...good, youStatus: "lpr", youYearsInUs: 2.5 })).toEqual({ ok: false, detail: "youYearsInUs" });
    expect(validateAnswers({ ...good, savings: -1 })).toEqual({ ok: false, detail: "savings" });
    expect(validateAnswers({ ...good, getsSnap: "no" })).toEqual({ ok: false, detail: "getsSnap" });
    const lpr = validateAnswers({ ...good, youStatus: "lpr", youYearsInUs: 3, selfEmployed: true, savings: 25000, getsSnap: false });
    expect(lpr.ok && lpr.value).toMatchObject({ youStatus: "lpr", youYearsInUs: 3, selfEmployed: true, savings: 25000, getsSnap: false, getsTanf: true });
    // Years in the US mean nothing for a citizen, so they are dropped; a spouse's status is dropped when unmarried.
    const citizenYears = validateAnswers({ ...good, youYearsInUs: 3, spouseStatus: "undocumented" });
    expect(citizenYears.ok && citizenYears.value).toMatchObject({ youYearsInUs: null, spouseStatus: "citizen" });
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

  it("defaults the non-wage monthly incomes to 0 for old clients that omit them", () => {
    const r = validateAnswers(good);
    expect(r.ok).toBe(true);
    if (r.ok) expect([r.value.ssdiMonthly, r.value.childSupportMonthly, r.value.unemploymentMonthly]).toEqual([0, 0, 0]);
  });

  it("accepts non-wage monthly incomes, clamped to $20,000 a month", () => {
    const r = validateAnswers({ ...good, ssdiMonthly: 1500, childSupportMonthly: 400, unemploymentMonthly: 99_999 });
    expect(r.ok).toBe(true);
    if (r.ok) expect([r.value.ssdiMonthly, r.value.childSupportMonthly, r.value.unemploymentMonthly]).toEqual([1500, 400, 20000]);
  });

  it("rejects a negative or non-numeric non-wage income by name", () => {
    expect(validateAnswers({ ...good, ssdiMonthly: -1 })).toEqual({ ok: false, detail: "ssdiMonthly" });
    expect(validateAnswers({ ...good, childSupportMonthly: "some" })).toEqual({ ok: false, detail: "childSupportMonthly" });
    expect(validateAnswers({ ...good, unemploymentMonthly: null })).toEqual({ ok: false, detail: "unemploymentMonthly" });
  });

  describe("hoursPerWeek", () => {
    it("defaults to null when absent or explicitly null", () => {
      const absent = validateAnswers(good);
      expect(absent.ok && absent.value.hoursPerWeek).toBeNull();
      const explicit = validateAnswers({ ...good, hoursPerWeek: null });
      expect(explicit.ok && explicit.value.hoursPerWeek).toBeNull();
    });
    it("accepts a whole week between 1 and 80", () => {
      for (const hoursPerWeek of [1, 35, 40, 80]) {
        const r = validateAnswers({ ...good, hoursPerWeek });
        expect(r.ok && r.value.hoursPerWeek, String(hoursPerWeek)).toBe(hoursPerWeek);
      }
    });
    it("rejects zero, a fraction, and more hours than a week of work", () => {
      for (const hoursPerWeek of [0, -1, 37.5, 81, "40"]) {
        expect(validateAnswers({ ...good, hoursPerWeek }), String(hoursPerWeek)).toEqual({ ok: false, detail: "hoursPerWeek" });
      }
    });
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
