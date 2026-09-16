import { describe, it, expect } from "vitest";
import { buildPEPayload, axisSpec } from "./translate.js";
import { ESI_EMPLOYEE_CONTRIBUTION } from "./policyYear.js";
import type { HouseholdAnswers } from "./index.js";

const base: HouseholdAnswers = {
  state: "CA", married: false, age: 30, spouseAge: null, childAges: [5],
  youDisabled: false, spouseDisabled: false, childDisabled: [false],
  monthlyRent: 1500, monthlyChildcare: null,
  annualEarnings: 30000, spouseAnnualEarnings: 0, hoursPerWeek: null,
  youStatus: "citizen", spouseStatus: "citizen", youYearsInUs: null, spouseYearsInUs: null,
  selfEmployed: false, savings: 0,
  getsHeadStart: false, getsHousing: false, getsChildcareSubsidy: false, hasEmployerCoverage: false,
  getsSnap: true, getsTanf: true, getsMedicaid: true, getsWic: true,
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

  it("sends weekly hours for the earners only, full time when unknown", () => {
    // weekly_hours_worked_before_lsr defaults to 0 when unsent, which
    // policyengine-us 2.5.0 reads as "not working": SNAP's ABAWD rule and two
    // states' child-care activity tests then pay $0 across the whole curve.
    const none = buildPEPayload(base) as any;
    expect(none.household.people.you.weekly_hours_worked_before_lsr["2026"]).toBe(40);

    const solo = buildPEPayload({ ...base, hoursPerWeek: 35 }) as any;
    expect(solo.household.people.you.weekly_hours_worked_before_lsr["2026"]).toBe(35);

    const earningSpouse = buildPEPayload({ ...base, hoursPerWeek: 35, married: true, spouseAge: 30, spouseAnnualEarnings: 20000 }) as any;
    expect(earningSpouse.household.people.spouse.weekly_hours_worked_before_lsr["2026"]).toBe(35);
    const unaskedSpouse = buildPEPayload({ ...base, married: true, spouseAge: 30, spouseAnnualEarnings: 20000 }) as any;
    expect(unaskedSpouse.household.people.spouse.weekly_hours_worked_before_lsr["2026"]).toBe(40);
    // A spouse with no earnings works no hours.
    const idleSpouse = buildPEPayload({ ...base, hoursPerWeek: 35, married: true, spouseAge: 30, spouseAnnualEarnings: 0 }) as any;
    expect(idleSpouse.household.people.spouse.weekly_hours_worked_before_lsr).toBeUndefined();
  });

  it("sends immigration status and the matching SSN card type for non-citizens only", () => {
    const citizen = buildPEPayload(base) as any;
    expect(citizen.household.people.you.immigration_status).toBeUndefined();
    expect(citizen.household.people.you.ssn_card_type).toBeUndefined();
    const lpr = buildPEPayload({ ...base, youStatus: "lpr", youYearsInUs: 3 }) as any;
    expect(lpr.household.people.you.immigration_status).toEqual({ "2026": "LEGAL_PERMANENT_RESIDENT" });
    expect(lpr.household.people.you.ssn_card_type).toEqual({ "2026": "CITIZEN" }); // an SSN valid for work
    expect(lpr.household.people.you.years_since_us_entry).toEqual({ "2026": 3 });
    const daca = buildPEPayload({ ...base, youStatus: "daca" }) as any;
    expect(daca.household.people.you.ssn_card_type).toEqual({ "2026": "NON_CITIZEN_VALID_EAD" });
    expect(daca.household.people.you.years_since_us_entry).toBeUndefined();
    const mixed = buildPEPayload({ ...base, married: true, spouseAge: 30, spouseStatus: "undocumented" }) as any;
    expect(mixed.household.people.you.immigration_status).toBeUndefined();
    expect(mixed.household.people.spouse.immigration_status).toEqual({ "2026": "UNDOCUMENTED" });
    expect(mixed.household.people.spouse.ssn_card_type).toEqual({ "2026": "NONE" });
    expect(mixed.household.people.child1.immigration_status).toBeUndefined(); // children modeled as citizens
  });

  it("sends savings as the householder's bank assets, only when there are any", () => {
    expect((buildPEPayload(base) as any).household.people.you.bank_account_assets).toBeUndefined();
    expect((buildPEPayload({ ...base, savings: 5000 }) as any).household.people.you.bank_account_assets).toEqual({ "2026": 5000 });
  });

  it("varies self_employment_income instead of wages for a self-employed earner", () => {
    const wage = buildPEPayload(base) as any;
    expect(wage.household.axes[0][0].name).toBe("employment_income");
    expect(wage.household.people.you.employment_income).toBeUndefined();
    const self = buildPEPayload({ ...base, selfEmployed: true }) as any;
    expect(self.household.axes[0][0].name).toBe("self_employment_income");
    expect(self.household.people.you.employment_income).toEqual({ "2026": 0 });
  });

  it("turns an entitlement off with PolicyEngine's own take-up switch, and says nothing when it is on", () => {
    const on = buildPEPayload({ ...base, married: true, spouseAge: 30 }) as any;
    expect(on.household.spm_units.spm_unit.takes_up_snap_if_eligible).toBeUndefined();
    expect(on.household.people.you.takes_up_medicaid_if_eligible).toBeUndefined();
    expect(on.household.people.child1.wic).toEqual({ "2026": null });
    const off = buildPEPayload({ ...base, married: true, spouseAge: 30, getsSnap: false, getsTanf: false, getsMedicaid: false, getsWic: false }) as any;
    expect(off.household.spm_units.spm_unit.takes_up_snap_if_eligible).toEqual({ "2026": false });
    expect(off.household.spm_units.spm_unit.takes_up_tanf_if_eligible).toEqual({ "2026": false });
    for (const who of ["you", "spouse", "child1"]) expect(off.household.people[who].takes_up_medicaid_if_eligible, who).toEqual({ "2026": false });
    expect(off.household.people.child1.wic).toEqual({ "2026": 0 });
  });

  it("puts the employer plan's ACA firewall on every covered member, not just the plan holder", () => {
    const p = buildPEPayload({ ...base, married: true, spouseAge: 30, hasEmployerCoverage: true }) as any;
    for (const who of ["you", "spouse", "child1"]) {
      expect(p.household.people[who].has_esi, who).toEqual({ "2026": true });
      expect(p.household.people[who].offered_aca_disqualifying_esi, who).toEqual({ "2026": true });
    }
    expect(p.household.people.spouse.employer_sponsored_insurance_premiums).toBeUndefined();
    const none = buildPEPayload({ ...base, married: true, spouseAge: 30 }) as any;
    expect(none.household.people.spouse.has_esi).toBeUndefined();
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

  it("sends one figure in the inert employer-premium field whatever the household shape", () => {
    // PolicyEngine reads employer_sponsored_insurance_premiums only into CBO
    // market-income additions; the tier a household pays is evaluate.ts's.
    const withKids = buildPEPayload(base) as any;
    const single = buildPEPayload({ ...base, childAges: [], childDisabled: [] }) as any;
    expect(withKids.household.people.you.employer_sponsored_insurance_premiums).toBeUndefined();
    const esi = buildPEPayload({ ...base, hasEmployerCoverage: true }) as any;
    expect(esi.household.people.you.employer_sponsored_insurance_premiums["2026"]).toBe(ESI_EMPLOYEE_CONTRIBUTION.single);
    void single;
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

describe("the child-care subsidy take-up toggle", () => {
  const withKids = { ...base, childAges: [3, 8], childDisabled: [false, false], monthlyChildcare: 800 };
  const spmOf = (a: HouseholdAnswers) =>
    (buildPEPayload(a).household as { spm_units: { spm_unit: Record<string, Record<string, unknown>> } }).spm_units.spm_unit;
  const peopleOf = (a: HouseholdAnswers) =>
    (buildPEPayload(a).household as { people: Record<string, Record<string, Record<string, unknown>>> }).people;

  it("sends the bill as childcare_expenses and asks for no subsidy when take-up is off", () => {
    const spm = spmOf(withKids);
    expect(spm.childcare_expenses).toEqual({ "2026": 9600 });
    expect(spm.spm_unit_pre_subsidy_childcare_expenses).toBeUndefined();
    expect(spm.child_care_subsidies).toBeUndefined();
    expect(peopleOf(withKids).child1.childcare_days_per_week).toBeUndefined();
  });

  it("sends the bill as the PRE-subsidy figure when take-up is on, and lets upstream net it down", () => {
    // childcare_expenses is upstream's `pre_subsidy - subsidies`, so forcing it
    // leaves the pre-subsidy figure at $0 and every state's CCDF formula has no
    // provider charge to reimburse. That is why the July probe found nothing.
    const spm = spmOf({ ...withKids, getsChildcareSubsidy: true });
    expect(spm.spm_unit_pre_subsidy_childcare_expenses).toEqual({ "2026": 9600 });
    expect(spm.childcare_expenses).toEqual({ "2026": null });
    // The aggregate, not `ca_child_care_subsidies`: 13 states' own variables
    // are not in the deployed model and asking for one is a 400.
    expect(spm.child_care_subsidies).toEqual({ "2026": null });
    // Nevada's activity gate reads only this input.
    expect(spm.meets_ccdf_activity_test).toEqual({ "2026": true });
    expect(spmOf(withKids).meets_ccdf_activity_test).toBeUndefined();
  });

  it("assumes full-day, full-week care for every child, and none for the adults", () => {
    const people = peopleOf({ ...withKids, getsChildcareSubsidy: true, married: true, spouseAge: 30 });
    for (const child of ["child1", "child2"]) {
      expect(people[child].childcare_hours_per_day, child).toEqual({ "2026": 8 });
      expect(people[child].childcare_days_per_week, child).toEqual({ "2026": 5 });
      expect(people[child].childcare_attending_days_per_month, child).toEqual({ "2026": 20 });
    }
    expect(people.you.childcare_days_per_week).toBeUndefined();
    expect(people.spouse.childcare_days_per_week).toBeUndefined();
  });

  it("names the provider type where the state's default pays nothing: MA by age, MD a licensed center", () => {
    const ma = peopleOf({ ...withKids, state: "MA", getsChildcareSubsidy: true });
    expect(ma.child1.ma_ccfa_care_provider_type).toEqual({ "2026": "CENTER_BASED_CARE_EARLY_EDUCATION" }); // age 3
    expect(ma.child2.ma_ccfa_care_provider_type).toEqual({ "2026": "CENTER_BASED_CARE_SCHOOL_AGE" }); // age 8
    expect(ma.you.ma_ccfa_care_provider_type).toBeUndefined();
    const md = peopleOf({ ...withKids, state: "MD", getsChildcareSubsidy: true });
    expect(md.child1.md_ccs_provider_type).toEqual({ "2026": "LICENSED_CENTER" });
    expect(md.child2.md_ccs_provider_type).toEqual({ "2026": "LICENSED_CENTER" });
    // Nothing for a state whose default already pays, and nothing at all without take-up.
    const co = peopleOf({ ...withKids, state: "CO", getsChildcareSubsidy: true });
    expect(Object.keys(co.child1).filter((k) => k.includes("provider_type"))).toEqual([]);
    expect(peopleOf({ ...withKids, state: "MA" }).child1.ma_ccfa_care_provider_type).toBeUndefined();
  });

  it("still sends $0 as the pre-subsidy bill for a household that reports no childcare", () => {
    expect(spmOf({ ...base, getsChildcareSubsidy: true }).spm_unit_pre_subsidy_childcare_expenses).toEqual({ "2026": 0 });
  });
});
