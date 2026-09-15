import { describe, it, expect } from "vitest";
import { FIPS_TO_USPS, STATE_CODES, STATE_MIN_WAGE, STATE_NAMES } from "./states.js";

describe("STATE_CODES", () => {
  it("lists all 50 states plus DC, uppercase and unique", () => {
    expect(STATE_CODES).toHaveLength(51);
    expect(new Set(STATE_CODES).size).toBe(51);
    expect(STATE_CODES.every((s) => /^[A-Z]{2}$/.test(s))).toBe(true);
  });
});

describe("FIPS_TO_USPS", () => {
  it("maps well-known FIPS codes to their USPS abbreviation", () => {
    expect(FIPS_TO_USPS["06"]).toBe("CA");
    expect(FIPS_TO_USPS["48"]).toBe("TX");
    expect(FIPS_TO_USPS["11"]).toBe("DC");
  });

  it("covers exactly the states HotGap names, in both directions", () => {
    expect(new Set(Object.values(FIPS_TO_USPS))).toEqual(new Set(STATE_CODES));
    expect(Object.keys(FIPS_TO_USPS)).toHaveLength(51);
  });
});

describe("STATE_MIN_WAGE", () => {
  it("has a wage at or above the federal floor for every state, and no extras", () => {
    expect(Object.keys(STATE_MIN_WAGE).sort()).toEqual([...STATE_CODES].sort());
    for (const [code, wage] of Object.entries(STATE_MIN_WAGE)) expect(wage, code).toBeGreaterThanOrEqual(7.25);
  });
});
