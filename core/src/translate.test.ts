import { describe, it, expect } from "vitest";
import { buildPEPayload, axisSpec } from "./translate.js";
import { ESI_EMPLOYEE_CONTRIBUTION } from "./policyYear.js";
import type { HouseholdAnswers } from "./index.js";

const base: HouseholdAnswers = {
  state: "CA", married: false, age: 30, spouseAge: null, childAges: [5],
  youDisabled: false, spouseDisabled: false, childDisabled: [false],
  monthlyRent: 1500, monthlyChildcare: null,
  annualEarnings: 30000, spouseAnnualEarnings: 0, hoursPerWeek: null,
  getsHeadStart: false, getsHousing: false, hasEmployerCoverage: false,
  countyFips: null,
  ssdiMonthly: 0, childSupportMonthly: 0, unemploymentMonthly: 0,
};

describe("axisSpec", () => {
  it("floors the axis at $150k so the 400%-FPL subsidy cliff fits on it", () => {
    // 400% FPL is $106,600 for three and $128,600 for four (2025 guidelines):
    // the old $100k axis cut the biggest cliff off the top of its own chart.
    expect(axisSpec({ ...base, annualEarnings: 30000 })).toEqual({ max: 150_000, step: 1000, count: 151 });
    expect(axisSpec({ ...base, annualEarnings: 90000 })).toEqual({ max: 150_000, step: 1000, count: 151 });
  });

  it("runs past the 400%-FPL subsidy cliff for larger households", () => {
    // Four people: 400% FPL = $128,600 → axis to $170,000; five: $150,600 → $195,000.
    expect(axisSpec({ ...base, married: true, spouseAge: 30, childAges: [3, 7], childDisabled: [false, false] })).toEqual({ max: 170_000, step: 1000, count: 171 });
    expect(axisSpec({ ...base, married: true, spouseAge: 30, childAges: [1, 4, 9], childDisabled: [false, false, false] })).toEqual({ max: 195_000, step: 1000, count: 196 });
  });

  it("scales to 1.5× pay with a wider step, keeping the request near 250 points", () => {
    // $150k × 1.5 = $225,000 still fits under the $250,000 cap at $1,000 steps.
    expect(axisSpec({ ...base, annualEarnings: 150_000 })).toEqual({ max: 225_000, step: 1000, count: 226 });
    // $300k × 1.5 = $450,000 is not a whole number of $2,000 steps — the top
    // rounds up rather than asking for a fractional count.
    expect(axisSpec({ ...base, annualEarnings: 300_000 })).toEqual({ max: 450_000, step: 2000, count: 226 });
    expect(axisSpec({ ...base, annualEarnings: 500_000 })).toEqual({ max: 750_000, step: 3000, count: 251 });
    // The largest household validateAnswers admits, in the state with the highest guidelines, still gets $1,000 steps.
    expect(axisSpec({ ...base, state: "AK", married: true, spouseAge: 30, childAges: [1, 2, 3, 4, 5, 6], childDisabled: Array(6).fill(false) })).toEqual({ max: 315_000, step: 1000, count: 316 });
    // Alaska's guidelines are higher: a five-person household still gets $1,000 steps.
    expect(axisSpec({ ...base, state: "AK", married: true, spouseAge: 30, childAges: [1, 4, 9], childDisabled: [false, false, false] })).toEqual({ max: 230_000, step: 1000, count: 231 });
  });

  it("always yields a whole number of steps and both endpoints", () => {
    for (const annualEarnings of [0, 1, 12_345, 99_999, 150_001, 333_333, 500_000]) {
      const { max, step, count } = axisSpec({ ...base, annualEarnings });
      expect(max % step).toBe(0);
      expect(count).toBe(max / step + 1);
      expect(Number.isInteger(count)).toBe(true);
      expect(max).toBeGreaterThanOrEqual(150_000);
    }
  });
});

describe("buildPEPayload", () => {
  it("puts 'you' as the FIRST people key (the axis varies person 0)", () => {
    const p = buildPEPayload(base) as any;
    expect(Object.keys(p.household.people)[0]).toBe("you");
  });

  it("builds a single-parent household with one child and annual rent on 'you'", () => {
    const p = buildPEPayload(base) as any;
    expect(Object.keys(p.household.people)).toEqual(["you", "child1"]);
    expect(p.household.people.you.rent["2026"]).toBe(18000);
    expect(p.household.people.child1.age["2026"]).toBe(5);
    expect(p.household.people.child1.head_start["2026"]).toBe(0);
    expect(p.household.households.household.state_name["2026"]).toBe("CA");
    expect(p.household.spm_units.spm_unit.childcare_expenses["2026"]).toBe(0);
    expect(p.household.axes[0][0]).toMatchObject({ name: "employment_income", min: 0, max: 150000, count: 151, period: "2026" });
  });

  it("adds a spouse with fixed employment income when married", () => {
    const p = buildPEPayload({ ...base, married: true, spouseAnnualEarnings: 20000 }) as any;
    expect(p.household.people.spouse.employment_income["2026"]).toBe(20000);
    expect(p.household.marital_units.marital_unit.members).toEqual(["you", "spouse"]);
    expect(p.household.tax_units.tax_unit.members).toContain("spouse");
  });

  it("omits rent when unknown and includes childcare when given", () => {
    const p = buildPEPayload({ ...base, monthlyRent: null, monthlyChildcare: 800 }) as any;
    expect(p.household.people.you.rent).toBeUndefined();
    expect(p.household.spm_units.spm_unit.childcare_expenses["2026"]).toBe(9600);
  });

  it("requests every display variable as null", () => {
    const p = buildPEPayload(base) as any;
    expect(p.household.households.household.household_net_income["2026"]).toBeNull();
    expect(p.household.households.household.household_refundable_tax_credits["2026"]).toBeNull();
    // Asked for in every state now, not only Massachusetts.
    expect(p.household.households.household.household_state_benefits["2026"]).toBeNull();
    // spm_unit_capped_housing_subsidy is excluded here: with the take-up
    // default of getsHousing=false in `base`, it's forced to 0, not null
    // (covered by its own tests below).
    for (const v of ["snap", "tanf", "free_school_meals", "reduced_price_school_meals", "spm_unit_medical_out_of_pocket_expenses"])
      expect(p.household.spm_units.spm_unit[v]["2026"]).toBeNull();
    for (const v of ["eitc", "ctc", "refundable_ctc", "premium_tax_credit"])
      expect(p.household.tax_units.tax_unit[v]["2026"]).toBeNull();
    for (const v of ["medicaid", "chip", "wic", "ssi"])
      expect(p.household.people.you[v]["2026"]).toBeNull();
  });

  it("asks a CHILD for wic and ssi too, not just medicaid and chip", () => {
    // Until this landed, a child's WIC and a disabled child's SSI were never
    // named: they fell into parse.ts's untracked otherBenefits remainder.
    const p = buildPEPayload({ ...base, childAges: [2, 8], childDisabled: [false, true] }) as any;
    for (const child of ["child1", "child2"])
      for (const v of ["medicaid", "chip", "wic", "ssi"])
        expect(p.household.people[child][v]["2026"], `${child}.${v}`).toBeNull();
  });

  it("declares the tax unit a filer, so the premium tax credit is not zeroed", () => {
    // aca_ptc multiplies by tax_unit_is_filer. A childless couple at $30,000
    // in IL is under the $32,200 joint filing threshold, so PolicyEngine made
    // them a non-filer and charged the full premium with no credit (PTC $0,
    // MOOP $19,870); with the flag, PTC $18,779 and MOOP $1,090 (live
    // 2026-09-15). Anyone taking a marketplace subsidy files a return.
    expect((buildPEPayload(base) as any).household.tax_units.tax_unit.tax_unit_is_filer["2026"]).toBe(true);
    const couple = buildPEPayload({ ...base, married: true, spouseAge: 30, childAges: [], childDisabled: [] }) as any;
    expect(couple.household.tax_units.tax_unit.tax_unit_is_filer["2026"]).toBe(true);
  });

  it("sends weekly hours for the earners only, and omits them when unknown", () => {
    // PolicyEngine's Massachusetts dependent-care deduction scales by
    // weekly_hours_worked_before_lsr, which defaults to 0 when unsent.
    const none = buildPEPayload(base) as any;
    expect(none.household.people.you.weekly_hours_worked_before_lsr).toBeUndefined();

    const solo = buildPEPayload({ ...base, hoursPerWeek: 35 }) as any;
    expect(solo.household.people.you.weekly_hours_worked_before_lsr["2026"]).toBe(35);

    const earningSpouse = buildPEPayload({ ...base, hoursPerWeek: 35, married: true, spouseAge: 30, spouseAnnualEarnings: 20000 }) as any;
    expect(earningSpouse.household.people.spouse.weekly_hours_worked_before_lsr["2026"]).toBe(35);
    // A spouse with no earnings works no hours.
    const idleSpouse = buildPEPayload({ ...base, hoursPerWeek: 35, married: true, spouseAge: 30, spouseAnnualEarnings: 0 }) as any;
    expect(idleSpouse.household.people.spouse.weekly_hours_worked_before_lsr).toBeUndefined();
  });

  it("drops only is_ssi_disabled when the SSI pathway is closed", () => {
    const disabled = { ...base, youDisabled: true, childAges: [8], childDisabled: [true] };
    const on = buildPEPayload(disabled) as any;
    const off = buildPEPayload(disabled, { ssiPathway: false }) as any;
    for (const who of ["you", "child1"]) {
      expect(on.household.people[who].is_ssi_disabled["2026"]).toBe(true);
      expect(off.household.people[who].is_disabled["2026"]).toBe(true);
      expect(off.household.people[who].is_ssi_disabled).toBeUndefined();
      delete on.household.people[who].is_ssi_disabled;
    }
    expect(off).toEqual(on);
  });

  it("puts the real ages on 'you' and the spouse instead of a hardcoded 30", () => {
    const p = buildPEPayload({ ...base, age: 67, married: true, spouseAge: 65, spouseAnnualEarnings: 20000 }) as any;
    expect(p.household.people.you.age["2026"]).toBe(67);
    expect(p.household.people.spouse.age["2026"]).toBe(65);
  });

  it("marks a disabled adult with BOTH is_disabled and is_ssi_disabled", () => {
    const p = buildPEPayload({
      ...base, youDisabled: true, married: true, spouseAge: 40, spouseDisabled: true, spouseAnnualEarnings: 20000,
    }) as any;
    expect(p.household.people.you.is_disabled["2026"]).toBe(true);
    expect(p.household.people.you.is_ssi_disabled["2026"]).toBe(true);
    expect(p.household.people.spouse.is_disabled["2026"]).toBe(true);
    expect(p.household.people.spouse.is_ssi_disabled["2026"]).toBe(true);
  });

  it("marks a disabled child with BOTH is_disabled and is_ssi_disabled", () => {
    const p = buildPEPayload({ ...base, childAges: [8], childDisabled: [true] }) as any;
    expect(p.household.people.child1.is_disabled["2026"]).toBe(true);
    expect(p.household.people.child1.is_ssi_disabled["2026"]).toBe(true);
  });

  it("omits disability keys entirely for non-disabled people (keeps payload canonical for the cache)", () => {
    const p = buildPEPayload({ ...base, married: true, spouseAge: 40, spouseAnnualEarnings: 20000 }) as any;
    expect(p.household.people.you.is_disabled).toBeUndefined();
    expect(p.household.people.you.is_ssi_disabled).toBeUndefined();
    expect(p.household.people.spouse.is_disabled).toBeUndefined();
    expect(p.household.people.spouse.is_ssi_disabled).toBeUndefined();
    expect(p.household.people.child1.is_disabled).toBeUndefined();
    expect(p.household.people.child1.is_ssi_disabled).toBeUndefined();
  });

  it("forces head_start to 0 on each child when the family does not get Head Start", () => {
    const p = buildPEPayload(base) as any;
    expect(p.household.people.child1.head_start["2026"]).toBe(0);
  });

  it("omits the head_start override when the family gets Head Start", () => {
    const p = buildPEPayload({ ...base, getsHeadStart: true }) as any;
    // still requested as an output (null), but not forced to 0 — mirrors the
    // housing-subsidy case below; PolicyEngine needs this requested to
    // compute the Head Start cliff (see live sanity check).
    expect(p.household.people.child1.head_start["2026"]).toBeNull();
  });

  it("forces housing subsidy to 0 when the family does not get housing help", () => {
    const p = buildPEPayload(base) as any;
    expect(p.household.spm_units.spm_unit.spm_unit_capped_housing_subsidy["2026"]).toBe(0);
  });

  it("omits the housing override when the family gets housing help", () => {
    const p = buildPEPayload({ ...base, getsHousing: true }) as any;
    // still requested as an output (null), but not forced to 0
    expect(p.household.spm_units.spm_unit.spm_unit_capped_housing_subsidy["2026"]).toBeNull();
  });

  it("adds employer-coverage inputs on the adult when hasEmployerCoverage", () => {
    // Note: base already has childAges:[5] (used throughout this file), which
    // would trigger the family premium. To exercise the single/no-dependents
    // $1700 branch, this test explicitly overrides to a childless household.
    const p = buildPEPayload({ ...base, childAges: [], childDisabled: [], hasEmployerCoverage: true }) as any;
    expect(p.household.people.you.has_esi["2026"]).toBe(true);
    expect(p.household.people.you.offered_aca_disqualifying_esi["2026"]).toBe(true);
    expect(p.household.people.you.employer_sponsored_insurance_premiums["2026"]).toBe(ESI_EMPLOYEE_CONTRIBUTION.single);
  });

  it("uses the family ESI premium when there are kids or a spouse", () => {
    const p = buildPEPayload({ ...base, hasEmployerCoverage: true, childAges: [5] }) as any;
    expect(p.household.people.you.employer_sponsored_insurance_premiums["2026"]).toBe(ESI_EMPLOYEE_CONTRIBUTION.family);
  });

  it("asks for household_benefits so a cliff can price untracked programs", () => {
    const p = buildPEPayload(base) as any;
    expect(p.household.households.household.household_benefits["2026"]).toBeNull();
  });

  it("annualizes non-wage income onto 'you', omitting each variable when zero", () => {
    // All three variable names verified live against PolicyEngine 2026-09-14.
    const p = buildPEPayload({ ...base, ssdiMonthly: 1500, childSupportMonthly: 400, unemploymentMonthly: 300 }) as any;
    expect(p.household.people.you.social_security_disability["2026"]).toBe(18000);
    expect(p.household.people.you.child_support_received["2026"]).toBe(4800);
    expect(p.household.people.you.unemployment_compensation["2026"]).toBe(3600);
    const none = buildPEPayload(base) as any;
    expect(none.household.people.you.social_security_disability).toBeUndefined();
    expect(none.household.people.you.child_support_received).toBeUndefined();
    expect(none.household.people.you.unemployment_compensation).toBeUndefined();
  });

  it("adds county_fips to the household only when countyFips is set", () => {
    const withCounty = buildPEPayload({ ...base, countyFips: "06075" }) as any;
    expect(withCounty.household.households.household.county_fips["2026"]).toBe("06075");
    const without = buildPEPayload({ ...base, countyFips: null }) as any;
    expect(without.household.households.household.county_fips).toBeUndefined();
  });
});
