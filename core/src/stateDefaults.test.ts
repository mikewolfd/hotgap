import { describe, it, expect } from "vitest";
import { readData } from "./data.js";
import { stateDefaults } from "./stateDefaults.js";
import { FIPS_TO_USPS, STATE_CODES } from "./states.js";

const json = readData<{ read: string; sources: Record<string, Record<string, string>>; states: Record<string, unknown> }>("state-defaults.json")!;

describe("state-defaults.json", () => {
  it("covers exactly the 51 states the package models", () => {
    expect(Object.keys(json.states).sort()).toEqual([...STATE_CODES].sort());
  });

  it("names every county in its own state (a county FIPS starts with the state's two digits)", () => {
    for (const state of STATE_CODES) {
      const { countyFips } = stateDefaults(state);
      expect(countyFips, state).toMatch(/^\d{5}$/);
      expect(FIPS_TO_USPS[countyFips.slice(0, 2)], state).toBe(state);
    }
  });

  it("puts rent and childcare in ranges a real household could pay", () => {
    for (const state of STATE_CODES) {
      const { monthlyRent, monthlyChildcarePreschool, monthlyChildcareInfant, monthlyChildcareToddler, monthlyChildcareSchoolAge } = stateDefaults(state);
      // Younger is dearer on the NDCP's bands: infant ≥ toddler ≥ preschool in every state. The school-age
      // rate is a full-time rate for a child in school and runs above preschool in four states (AK, DC, NJ, WY),
      // so it is only held to the same sane range as the rest.
      expect(monthlyChildcareInfant, state).toBeGreaterThanOrEqual(monthlyChildcareToddler);
      expect(monthlyChildcareToddler, state).toBeGreaterThanOrEqual(monthlyChildcarePreschool);
      expect(monthlyChildcareSchoolAge, state).toBeGreaterThanOrEqual(150); // Hawaii publishes $202 for wraparound care
      expect(monthlyChildcareSchoolAge, state).toBeLessThanOrEqual(3500);
      expect(monthlyRent, state).toBeGreaterThanOrEqual(500);
      expect(monthlyRent, state).toBeLessThanOrEqual(4000);
      expect(monthlyChildcarePreschool, state).toBeGreaterThanOrEqual(300);
      expect(monthlyChildcarePreschool, state).toBeLessThanOrEqual(3500);
      expect(Number.isInteger(monthlyRent), state).toBe(true);
      expect(Number.isInteger(monthlyChildcarePreschool), state).toBe(true);
    }
  });

  it("carries the publisher, file, vintage and date read for every source", () => {
    expect(json.read).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    for (const column of ["monthlyRent", "countyFips", "monthlyChildcare"]) {
      const source = json.sources[column];
      expect(source, column).toBeDefined();
      expect(source.publisher, column).toBeTruthy();
      expect(source.url, column).toMatch(/^https:\/\/[\w.-]*\.gov\//);
      expect(source.vintage, column).toBeTruthy();
    }
  });

  it("holds nothing but the county, the rent and the four childcare bands in a row", () => {
    for (const row of Object.values(json.states)) {
      expect(Object.keys(row as object).sort()).toEqual(["countyFips", "monthlyChildcareInfant", "monthlyChildcarePreschool", "monthlyChildcareSchoolAge", "monthlyChildcareToddler", "monthlyRent"]);
    }
  });
});

describe("stateDefaults", () => {
  it("returns the state's largest county with its rent", () => {
    // Los Angeles County: HUD FY2026 revised two-bedroom FMR.
    expect(stateDefaults("CA")).toMatchObject({ countyFips: "06037", monthlyRent: 2903 });
    expect(stateDefaults("DC").countyFips).toBe("11001");
  });

  it("throws for a state it does not know", () => {
    expect(() => stateDefaults("ZZ")).toThrow(/ZZ/);
    expect(() => stateDefaults("PR")).toThrow();
  });
});
