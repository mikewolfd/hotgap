import { describe, it, expect } from "vitest";
import { FIPS_TO_USPS } from "./fips.js";
import { STATE_NAMES } from "./states.js";

describe("FIPS_TO_USPS", () => {
  it("has exactly 51 entries (50 states + DC)", () => {
    expect(Object.keys(FIPS_TO_USPS)).toHaveLength(51);
  });

  it("maps well-known FIPS codes to their USPS abbreviation", () => {
    expect(FIPS_TO_USPS["06"]).toBe("CA");
    expect(FIPS_TO_USPS["48"]).toBe("TX");
    expect(FIPS_TO_USPS["11"]).toBe("DC");
    expect(FIPS_TO_USPS["36"]).toBe("NY");
  });

  it("every value is a known 2-letter state/DC code with a display name", () => {
    for (const usps of Object.values(FIPS_TO_USPS)) {
      expect(usps).toMatch(/^[A-Z]{2}$/);
      expect(STATE_NAMES[usps]).toBeTruthy();
    }
  });

  it("every USPS code in STATE_NAMES is reachable from some FIPS code", () => {
    const reached = new Set(Object.values(FIPS_TO_USPS));
    for (const usps of Object.keys(STATE_NAMES)) {
      expect(reached.has(usps)).toBe(true);
    }
  });
});
