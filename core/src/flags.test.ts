import { describe, expect, it } from "vitest";
import { flagsFromSearchParams, HOUSEHOLD_FLAGS, rawAnswersFromFlags, searchParamsFromFlags } from "./flags.js";
import { validateAnswers } from "./validate.js";

describe("rawAnswersFromFlags", () => {
  it("is the CLI's household: pay annualized by unit and hours, kids and their flags paired, take-up off, entitlements on", () => {
    const v = validateAnswers(rawAnswersFromFlags({ zip: "94110", kids: "7,3", "kids-disabled": "0,1", pay: "18.27", hours: "30", married: true, "spouse-earnings": "12000", "no-wic": true }));
    expect(v.ok && v.value).toMatchObject({
      state: "CA", countyFips: "06075", married: true, age: 30, spouseAge: 30,
      childAges: [3, 7], childDisabled: [true, false],
      annualEarnings: 18.27 * 30 * 52, hoursPerWeek: 30, spouseAnnualEarnings: 12000,
      getsHeadStart: false, getsChildcareSubsidy: false, getsSnap: true, getsWic: false,
      monthlyRent: null, monthlyChildcare: null,
    });
  });
  it("takes --earnings as annual and --unit year/month as given", () => {
    expect(rawAnswersFromFlags({ state: "tx", earnings: "30000" })).toMatchObject({ state: "TX", annualEarnings: 30000 });
    expect(rawAnswersFromFlags({ state: "TX", pay: "2500", unit: "month" })).toMatchObject({ annualEarnings: 30000 });
    expect(rawAnswersFromFlags({ state: "TX", pay: "30000", unit: "year" })).toMatchObject({ annualEarnings: 30000 });
  });
  it("leaves a missing pay for validateAnswers to name", () => {
    expect(validateAnswers(rawAnswersFromFlags({ state: "TX" }))).toEqual({ ok: false, detail: "annualEarnings" });
  });
});

describe("flags ⇄ URL query", () => {
  it("round-trips, writing only what was said", () => {
    const flags = flagsFromSearchParams(new URLSearchParams("zip=94110&kids=3%2C7&pay=30000&unit=year&married&housing=1&disabled=0&rent="));
    expect(flags).toEqual({ zip: "94110", kids: "3,7", pay: "30000", unit: "year", married: true, housing: true });
    expect(searchParamsFromFlags(flags).toString()).toBe("zip=94110&married=1&kids=3%2C7&pay=30000&unit=year&housing=1");
    expect(flagsFromSearchParams(searchParamsFromFlags(flags))).toEqual(flags);
  });
  it("ignores keys that are not household flags", () => {
    expect(flagsFromSearchParams(new URLSearchParams("state=CA&offline=1&utm_source=x"))).toEqual({ state: "CA" });
    expect(Object.keys(HOUSEHOLD_FLAGS)).not.toContain("offline");
  });
});
