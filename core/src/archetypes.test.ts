import { describe, it, expect } from "vitest";
import { ARCHETYPES, DEFAULT_ARCHETYPE, answersFor } from "./archetypes.js";
import { stateDefaults } from "./stateDefaults.js";
import { STATE_CODES } from "./states.js";

describe("ARCHETYPES", () => {
  it("defines exactly 8 archetypes: single/married crossed with 0-3 kids", () => {
    expect(ARCHETYPES).toHaveLength(8);
    expect(ARCHETYPES.map((a) => a.id)).toEqual([
      "single-0", "single-1", "single-2", "single-3",
      "married-0", "married-1", "married-2", "married-3",
    ]);
  });

  it("defaults to single-2 (a single parent with two kids)", () => {
    expect(DEFAULT_ARCHETYPE).toBe("single-2");
    const def = ARCHETYPES.find((a) => a.id === DEFAULT_ARCHETYPE);
    expect(def).toMatchObject({ married: false, childAges: [3, 7] });
  });
});

describe("answersFor", () => {
  it("builds the documented household: age-30 adults, not disabled, renting in the state's largest county", () => {
    const single2 = ARCHETYPES.find((a) => a.id === "single-2")!;
    expect(answersFor("CA", single2)).toEqual({
      state: "CA",
      countyFips: "06037",          // Los Angeles County
      married: false,
      childAges: [3, 7],
      childDisabled: [false, false],
      monthlyRent: 2903,            // HUD FY2026 two-bedroom FMR there
      monthlyChildcare: 0,
      annualEarnings: 0,
      spouseAnnualEarnings: 0,
      hoursPerWeek: null,
      age: 30,
      spouseAge: null,
      youDisabled: false,
      spouseDisabled: false,
      getsHeadStart: false,
      getsHousing: false,
      hasEmployerCoverage: false,
      ssdiMonthly: 0,
      childSupportMonthly: 0,
      unemploymentMonthly: 0,
    });
  });

  it("gives a married archetype a spouse age of 30", () => {
    const married0 = ARCHETYPES.find((a) => a.id === "married-0")!;
    const answers = answersFor("TX", married0);
    expect(answers.married).toBe(true);
    expect(answers.spouseAge).toBe(30);
    expect(answers.childAges).toEqual([]);
  });

  it("marks every child as not disabled, regardless of count", () => {
    const married3 = ARCHETYPES.find((a) => a.id === "married-3")!;
    expect(answersFor("NY", married3).childDisabled).toEqual([false, false, false]);
  });

  it("defaults archetypes to NOT receiving rationed programs (honest baseline)", () => {
    const a = answersFor("CA", ARCHETYPES.find((x) => x.id === "single-2")!);
    expect(a.getsHeadStart).toBe(false);
    expect(a.getsHousing).toBe(false);
    expect(a.hasEmployerCoverage).toBe(false);
  });

  it("gives every state a real county and rent, never a silent zero", () => {
    // A null rent is not "unknown" to PolicyEngine — it is $0 rent, and so no
    // SNAP shelter deduction; a null county is the state's default ACA rating
    // area, which several states share.
    for (const state of STATE_CODES) {
      const a = answersFor(state, ARCHETYPES.find((x) => x.id === "single-2")!);
      expect(a.countyFips, state).toBe(stateDefaults(state).countyFips);
      expect(a.monthlyRent, state).toBe(stateDefaults(state).monthlyRent);
    }
  });

  it("leaves childcare at $0 — the archetype reports no childcare expense", () => {
    expect(answersFor("CA", ARCHETYPES.find((x) => x.id === "single-3")!).monthlyChildcare).toBe(0);
  });
});
