import { describe, it, expect } from "vitest";
import { buildPEPayload, axisMax, AXIS_COUNT } from "./translate.js";
import type { HouseholdAnswers } from "@hotgap/shared";

const base: HouseholdAnswers = {
  state: "CA", married: false, age: 30, spouseAge: null, childAges: [5],
  youDisabled: false, spouseDisabled: false, childDisabled: [false],
  monthlyRent: 1500, monthlyChildcare: null,
  annualEarnings: 30000, spouseAnnualEarnings: 0,
  getsHeadStart: false, getsHousing: false, hasEmployerCoverage: false,
  countyFips: null,
};

describe("axisMax", () => {
  it("floors at $100k and scales to 1.5× earnings rounded up to $5k", () => {
    expect(axisMax(30000)).toBe(100000);
    expect(axisMax(90000)).toBe(135000);
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
    expect(p.household.axes[0][0]).toMatchObject({ name: "employment_income", min: 0, max: 100000, count: AXIS_COUNT, period: "2026" });
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
    // spm_unit_capped_housing_subsidy is excluded here: with the take-up
    // default of getsHousing=false in `base`, it's forced to 0, not null
    // (covered by its own tests below).
    for (const v of ["snap", "tanf", "free_school_meals", "reduced_price_school_meals", "spm_unit_medical_out_of_pocket_expenses"])
      expect(p.household.spm_units.spm_unit[v]["2026"]).toBeNull();
    for (const v of ["eitc", "refundable_ctc", "premium_tax_credit"])
      expect(p.household.tax_units.tax_unit[v]["2026"]).toBeNull();
    for (const v of ["medicaid", "chip", "wic", "ssi"])
      expect(p.household.people.you[v]["2026"]).toBeNull();
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
    expect(p.household.people.you.employer_sponsored_insurance_premiums["2026"]).toBe(1700);
  });

  it("uses the family ESI premium when there are kids or a spouse", () => {
    const p = buildPEPayload({ ...base, hasEmployerCoverage: true, childAges: [5] }) as any;
    expect(p.household.people.you.employer_sponsored_insurance_premiums["2026"]).toBe(6500);
  });

  it("adds county_fips to the household only when countyFips is set", () => {
    const withCounty = buildPEPayload({ ...base, countyFips: "06075" }) as any;
    expect(withCounty.household.households.household.county_fips["2026"]).toBe("06075");
    const without = buildPEPayload({ ...base, countyFips: null }) as any;
    expect(without.household.households.household.county_fips).toBeUndefined();
  });
});
