import { describe, it, expect } from "vitest";
import { ARCHETYPES, DEFAULT_ARCHETYPE, answersFor } from "./archetypes.js";

describe("ARCHETYPES", () => {
  it("defines exactly 8 archetypes: single/married crossed with 0-3 kids", () => {
    expect(ARCHETYPES).toHaveLength(8);
    expect(ARCHETYPES.map((a) => a.id)).toEqual([
      "single-0", "single-1", "single-2", "single-3",
      "married-0", "married-1", "married-2", "married-3",
    ]);
  });

  it("defaults the map to single-2 (a single parent with two kids)", () => {
    expect(DEFAULT_ARCHETYPE).toBe("single-2");
    const def = ARCHETYPES.find((a) => a.id === DEFAULT_ARCHETYPE);
    expect(def).toMatchObject({ married: false, childAges: [3, 7] });
  });
});

describe("answersFor", () => {
  it("builds the documented household: age-30 adults, not disabled, no rent, no childcare", () => {
    const single2 = ARCHETYPES.find((a) => a.id === "single-2")!;
    expect(answersFor("CA", single2)).toEqual({
      state: "CA",
      married: false,
      childAges: [3, 7],
      childDisabled: [false, false],
      monthlyRent: null,
      monthlyChildcare: 0,
      annualEarnings: 0,
      spouseAnnualEarnings: 0,
      age: 30,
      spouseAge: null,
      youDisabled: false,
      spouseDisabled: false,
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
});
