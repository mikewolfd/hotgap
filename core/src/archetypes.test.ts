import { describe, it, expect } from "vitest";
import { ARCHETYPES, DEFAULT_ARCHETYPE, answersFor, archetypeById } from "./archetypes.js";
import { FEDERAL_MIN_WAGE_FULL_TIME_ANNUAL } from "./policyYear.js";
import { childcareMonthlyFor, stateDefaults } from "./stateDefaults.js";
import { STATE_CODES } from "./states.js";

describe("ARCHETYPES", () => {
  it("defines exactly 11 archetypes: single/married crossed with 0-3 kids, plus a dual-earner couple at 1-3 kids", () => {
    expect(ARCHETYPES).toHaveLength(11);
    expect(ARCHETYPES.map((a) => a.id)).toEqual([
      "single-0", "single-1", "single-2", "single-3",
      "married-0", "married-1", "married-2", "married-3",
      "married-dual-1", "married-dual-2", "married-dual-3",
    ]);
  });

  it("has no childless dual-earner couple: no children, no childcare bill, nothing for the row to add", () => {
    expect(ARCHETYPES.find((a) => a.id === "married-dual-0")).toBeUndefined();
  });

  it("gives each dual-earner archetype the same children as its single-earner twin", () => {
    for (const kids of [1, 2, 3]) {
      const twin = archetypeById(`married-${kids}`);
      const dual = archetypeById(`married-dual-${kids}`);
      expect(dual.childAges, `married-dual-${kids}`).toEqual(twin.childAges);
      expect(dual.married).toBe(true);
      expect(dual.spouseWorks).toBe(true);
      expect(twin.spouseWorks).toBe(false);
    }
  });

  it("defaults to single-2 (a single parent with two kids)", () => {
    expect(DEFAULT_ARCHETYPE).toBe("single-2");
    const def = ARCHETYPES.find((a) => a.id === DEFAULT_ARCHETYPE);
    expect(def).toMatchObject({ married: false, childAges: [3, 7] });
  });
});

describe("answersFor", () => {
  it("builds the documented household: age-30 adults, not disabled, renting in the state's largest county", () => {
    const single2 = archetypeById("single-2");
    expect(answersFor("CA", single2)).toEqual({
      state: "CA",
      countyFips: "06037",          // Los Angeles County
      married: false,
      childAges: [3, 7],
      childDisabled: [false, false],
      monthlyRent: 2903,            // HUD FY2026 two-bedroom FMR there
      // A preschool place for the 3-year-old and before-and-after-school care for the 7-year-old.
      monthlyChildcare: stateDefaults("CA").monthlyChildcarePreschool + stateDefaults("CA").monthlyChildcareSchoolAge,
      annualEarnings: 0,
      spouseAnnualEarnings: 0,
      hoursPerWeek: null,
      age: 30,
      spouseAge: null,
      youDisabled: false,
      spouseDisabled: false,
      youStatus: "citizen", spouseStatus: "citizen", youYearsInUs: null, spouseYearsInUs: null,
      selfEmployed: false, savings: 0,
      getsSnap: true, getsTanf: true, getsMedicaid: true, getsWic: true,
      getsHeadStart: false,
      getsHousing: false,
      getsChildcareSubsidy: true,   // on for the sweep, off for a personal evaluation
      hasEmployerCoverage: false,
      ssdiMonthly: 0,
      childSupportMonthly: 0,
      unemploymentMonthly: 0,
    });
  });

  it("gives a married archetype a spouse age of 30", () => {
    const married0 = archetypeById("married-0");
    const answers = answersFor("TX", married0);
    expect(answers.married).toBe(true);
    expect(answers.spouseAge).toBe(30);
    expect(answers.childAges).toEqual([]);
  });

  it("marks every child as not disabled, regardless of count", () => {
    const married3 = archetypeById("married-3");
    expect(answersFor("NY", married3).childDisabled).toEqual([false, false, false]);
  });

  it("defaults archetypes to NOT receiving rationed programs (honest baseline)", () => {
    const a = answersFor("CA", archetypeById("single-2"));
    expect(a.getsHeadStart).toBe(false);
    expect(a.getsHousing).toBe(false);
    expect(a.hasEmployerCoverage).toBe(false);
  });

  it("gives every state a real county and rent, never a silent zero", () => {
    // A null rent is not "unknown" to PolicyEngine — it is $0 rent, and so no
    // SNAP shelter deduction; a null county is the state's default ACA rating
    // area, which several states share.
    for (const state of STATE_CODES) {
      const a = answersFor(state, archetypeById("single-2"));
      expect(a.countyFips, state).toBe(stateDefaults(state).countyFips);
      expect(a.monthlyRent, state).toBe(stateDefaults(state).monthlyRent);
    }
  });

  it("charges each child the state's price for their age band, wherever every parent works", () => {
    // single-3 is aged 1, 4 and 9: an infant place, a preschool place, and school-age wraparound care.
    const d = stateDefaults("CA");
    const threeKids = d.monthlyChildcareInfant + d.monthlyChildcarePreschool + d.monthlyChildcareSchoolAge;
    expect(answersFor("CA", archetypeById("single-3")).monthlyChildcare).toBe(threeKids);
    expect(answersFor("CA", archetypeById("single-0")).monthlyChildcare).toBe(0);
    expect(answersFor("CA", archetypeById("married-dual-2")).monthlyChildcare).toBe(d.monthlyChildcarePreschool + d.monthlyChildcareSchoolAge);
    expect(answersFor("CA", archetypeById("married-dual-3")).monthlyChildcare).toBe(threeKids);
    // The bands, on the NDCP's own lines: 0–1 infant, 2 toddler, 3–4 preschool, 5–12 school age, 13+ none.
    expect([0, 1, 2, 3, 4, 5, 12, 13].map((age) => childcareMonthlyFor(d, age))).toEqual([
      d.monthlyChildcareInfant, d.monthlyChildcareInfant, d.monthlyChildcareToddler, d.monthlyChildcarePreschool, d.monthlyChildcarePreschool,
      d.monthlyChildcareSchoolAge, d.monthlyChildcareSchoolAge, 0,
    ]);
  });

  // The subsidy's activity test requires EVERY parent to be working (verified
  // live 2026-09-15: Delaware pays a married couple $13,260 once the spouse
  // works and $0 when they do not), so a couple with a parent at home neither
  // buys care nor claims the subsidy — charging them for one without the other
  // is the combination that is wrong both ways.
  it("buys no care and claims no subsidy for a single-earner couple: a parent is home", () => {
    for (const id of ["married-0", "married-1", "married-2", "married-3"]) {
      const a = answersFor("CA", archetypeById(id));
      expect(a.monthlyChildcare, id).toBe(0);
      expect(a.getsChildcareSubsidy, id).toBe(false);
      expect(a.spouseAnnualEarnings, id).toBe(0);
      expect(a.hoursPerWeek, id).toBeNull();
    }
  });

  it("differs from its single-earner twin in exactly three things: the spouse's pay, their hours, and the childcare bill", () => {
    const co = stateDefaults("CO");
    for (const kids of [1, 2, 3]) {
      const twin = answersFor("CO", archetypeById(`married-${kids}`));
      const dual = answersFor("CO", archetypeById(`married-dual-${kids}`));
      const bill = dual.childAges.reduce((sum, age) => sum + childcareMonthlyFor(co, age), 0);
      expect(dual, `married-dual-${kids}`).toEqual({
        ...twin,
        // Full time at the FEDERAL minimum wage, held national on purpose so
        // the map compares state rules and not state wage floors.
        spouseAnnualEarnings: FEDERAL_MIN_WAGE_FULL_TIME_ANNUAL,
        // The subsidy has an activity test as well as an income one, and
        // PolicyEngine reads it off weekly hours worked.
        hoursPerWeek: 40,
        monthlyChildcare: bill,
        getsChildcareSubsidy: true,
      });
    }
    expect(FEDERAL_MIN_WAGE_FULL_TIME_ANNUAL).toBe(15_080); // $7.25 x 2,080 hours
  });
});
