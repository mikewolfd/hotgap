import { DEFAULT_HOURS } from "./income.js";
import { ESI_EMPLOYEE_CONTRIBUTION, fpl2025 } from "./policyYear.js";
import { CHILDCARE_MAX_AGE } from "./stateDefaults.js";
import { statePremiumAssistanceFor } from "./statePremiumAssistance.js";
import { householdSize, YEAR, type HouseholdAnswers } from "./types.js";

export interface AxisSpec {
  /** Top of the earnings sweep, in dollars. */
  max: number;
  /** Dollars between sampled points. */
  step: number;
  /** Number of points, including both endpoints. */
  count: number;
}

/**
 * The earnings axis for one household.
 *
 * The floor is $150,000, not $100,000: 400% of the 2025 poverty line — where
 * the ACA premium subsidy ends, usually the largest cliff on the curve — is
 * $106,600 for a family of three and $128,600 for a family of four, so a
 * $100k axis cut the biggest cliff off the top of its own chart. Above
 * $100,000 of pay the axis follows 1.5× earnings instead.
 *
 * The axis stays at $1,000 steps up to $350,000, which covers every household
 * validateAnswers admits in every state (Alaska, six children: $315,000);
 * beyond that the step widens so a very high earner's request stays near 350
 * points. A wider step raises the cliff-detection
 * floor (see analyze.ts), which is the price of not asking PolicyEngine for
 * 751 points.
 */
export function axisSpec(a: HouseholdAnswers): AxisSpec {
  // The axis must run past the 400%-FPL end of the premium tax credit for this
  // household's size ($106,600 for three, $128,600 for four, $150,600 for five
  // on the 2025 guidelines) with room for the curve to recover, or the
  // biggest cliff sits at the top of its own chart and every safe exit past
  // it reads as "never".
  const pastSubsidyCliff = 4 * fpl2025(a.state, householdSize(a)) + 40_000;
  const wanted = Math.ceil(Math.max(150_000, a.annualEarnings * 1.5, pastSubsidyCliff) / 5000) * 5000;
  const step = Math.max(1000, Math.ceil(wanted / 350_000) * 1000);
  // Round the top up to a whole number of steps: `wanted` is a multiple of
  // $5,000 and `step` need not divide it (a $150,000 earner wants $225,000 at
  // a $2,000 step), and a fractional point count is not a valid axis.
  const max = Math.ceil(wanted / step) * step;
  return { max, step, count: max / step + 1 };
}

type Vars = Record<string, Record<string, number | string | boolean | null>>;
const y = (value: number | string | boolean | null): Record<string, number | string | boolean | null> => ({ [YEAR]: value });

// Asked for on EVERY person, children included. Children used to be asked
// only for medicaid/chip/head_start, so a child's WIC and a disabled child's
// SSI landed in the untracked otherBenefits remainder instead of being named
// (the constant $723 "other" in every stored curve with a child under 5 is
// that child's WIC).
const PERSON_VARS = ["medicaid", "chip", "wic", "ssi"];
const SPM_VARS = ["snap", "tanf", "spm_unit_capped_housing_subsidy", "free_school_meals", "reduced_price_school_meals", "spm_unit_medical_out_of_pocket_expenses"];
// `ctc` is the whole child tax credit and `refundable_ctc` only the refundable
// part; both are requested because a step can move one without the other.
const TAX_VARS = ["eitc", "ctc", "refundable_ctc", "premium_tax_credit"];

export interface PayloadOptions {
  /**
   * Whether a disabled person is also claimed to be disabled *for SSI*.
   * Default true. `fetchSplicedForSSDI` sends false on its above-SGA request:
   * work at substantial gainful activity bars a new disability finding, so a
   * person who keeps `is_ssi_disabled` there is granted SSI (and SSI-linked
   * Medicaid) they could never actually get — OH at $22–24k showed SSI $1,438
   * and Medicaid $11,078 vanishing at $24k as a cliff that does not exist.
   */
  ssiPathway?: boolean;
  /**
   * Ask for the state's modeled premium assistance (statePremiumAssistance.ts).
   * Only an endpoint that has the variable may be asked — the hosted API
   * rejects the request — so client.ts probes first and sets this.
   */
  statePremiumAssistance?: boolean;
  /** The model already carries the parent-limit corrections, so no override is attached (policyOverrides.ts). */
  parentLimitsUpstream?: boolean;
}

// `is_disabled: true` alone does not unlock SSI in PolicyEngine — only
// `is_ssi_disabled: true` does (verified live 2026-07-11). We set both on any
// person marked disabled so SSI/SSDI-related cliffs are modeled. Non-disabled
// people get neither key at all (omitted, not `false`) so payloads — and
// therefore cache keys — stay canonical between otherwise-identical requests.
function applyDisability(person: Vars, disabled: boolean, ssiPathway: boolean): void {
  if (!disabled) return;
  person.is_disabled = y(true);
  if (ssiPathway) person.is_ssi_disabled = y(true);
}

/**
 * The childcare bill, and whether PolicyEngine is allowed to subsidize it.
 *
 * `childcare_expenses` is NOT an input: upstream defines it as
 * `pre_subsidy_childcare_expenses - child_care_subsidies`. Forcing it — which
 * is what HotGap did until now — leaves the pre-subsidy figure at $0, so every
 * state's CCDF formula has no provider charge to reimburse and returns $0.
 * That, not a missing variable, is why the July probe found nothing: verified
 * live 2026-09-15, a Colorado single parent with a 3-year-old and a
 * $9,600 bill gets $0 with the bill sent as `childcare_expenses` and $9,450
 * with the same bill sent as `spm_unit_pre_subsidy_childcare_expenses`
 * (docs/upstream/evidence/childcare-co-legacy-childcare-expenses.json).
 *
 * The subsidy is RATIONED — CCDF reaches roughly one in six eligible children
 * and most states run a waiting list — so it follows the same rule as Head
 * Start and a housing voucher: off unless the household says it has it. "Off"
 * here is the old payload exactly, so a household that does not claim the
 * subsidy gets byte-identical output to before, and the archetype sweep (which
 * reports no childcare at all) is untouched.
 *
 * Attendance is an ASSUMPTION, stated: full-day, full-week care (8 hours a day,
 * 5 days a week, 20 days a month), matching the full-day preschool price
 * `stateDefaults` already uses to value a Head Start slot. It is not a
 * gate but it does change the number — Colorado pays the whole $9,600 bill
 * without it and $9,450/$8,913/$7,513 with it, because the rate ceiling and
 * copay only bind once care has a duration (childcare-co-no-attendance.json).
 * Colorado's output is byte-identical with and without
 * `meets_ccdf_activity_test` or `weekly_hours_worked_before_lsr`
 * (childcare-co-no-activity-test.json, childcare-co-no-hours.json); other
 * states gate on one or the other, so both are sent (below, and in
 * buildPEPayload).
 */
function applyChildcareSubsidy(spmVars: Vars, people: Record<string, Vars>, a: HouseholdAnswers): void {
  const annual = (a.monthlyChildcare ?? 0) * 12;
  if (!a.getsChildcareSubsidy) {
    spmVars.childcare_expenses = y(annual);
    return;
  }
  spmVars.spm_unit_pre_subsidy_childcare_expenses = y(annual);
  // Let upstream compute what the family is left paying, so SNAP's
  // dependent-care deduction and the CDCC run on the net bill, not the gross.
  spmVars.childcare_expenses = y(null);
  // The AGGREGATE, not `<st>_child_care_subsidies`: one name in every state,
  // it spans the states whose own variable is defined per MONTH (CA, MA, …),
  // and 13 states' per-state variables are not in the deployed model at all —
  // asking for `ny_child_care_subsidies` is a 400 (childcare-ny-base.json).
  spmVars.child_care_subsidies = y(null);
  // Upstream's own switch for "the parents are in an approved activity"
  // (its docstring: use it for activities not individually modeled). Most
  // states also read the work hours sent above; Nevada reads only this, so
  // without it a working parent's $12,000 bill drew $0 there on 2.5.0.
  // Claiming the subsidy is claiming the activity. Verified 2026-09-15 that
  // it changes nothing in CO, TX, CA, MA, MD, NY, IL, WA or OH.
  spmVars.meets_ccdf_activity_test = y(true);
  for (const [name, person] of Object.entries(people)) {
    if (name === "you" || name === "spouse") continue;
    const age = (person.age as Record<string, number>)[YEAR];
    // A child past CCDF's age limit is in no care. Every younger child,
    // schoolchildren included, is sent full-time attendance: the NDCP price
    // stateDefaults charges for a school-age child is its FULL-TIME weekly
    // rate (it publishes no part-day one), and the states' formulas pay
    // part-day rates below about five or six hours a day — CA, IL, MA, OH and
    // NY paid $5,000–7,000 a year less for a 7-year-old at three hours than
    // at eight (2.5.0, 2026-09-16) — so a part-day schedule against a
    // full-time bill would understate the subsidy against the very bill it
    // offsets. Bill and attendance are kept on the same footing.
    if (age > CHILDCARE_MAX_AGE) continue;
    person.childcare_hours_per_day = y(8);
    person.childcare_days_per_week = y(5);
    person.childcare_attending_days_per_month = y(20);
    Object.assign(person, childcareProviderType(a.state, age));
  }
}

// Massachusetts treats a child as school age from this birthday
// (gov.states.ma.eec.ccfa.age_threshold.school_age), the NDCP's line too.
const MA_CCFA_SCHOOL_AGE = 5;

/**
 * The provider-type input two states need before they pay anything
 * (policyengine-us #9485). Every state's rate table is keyed by a provider
 * type, and 49 default it to a licensed center — the care the bill prices.
 * Maryland's defaults to NONE, and Massachusetts's to the school-age center
 * rate, a $0 rate for a child under 5 even though the model derives the
 * child's age category itself. Verified 2026-09-15 on the public API and on
 * policyengine-us 2.5.0: a 3-year-old's $12,000 bill draws $0 → $12,000 in
 * Massachusetts and $0 → $10,556 in Maryland; a school-age child in
 * Massachusetts is unchanged. Remove a state here once its default pays.
 */
function childcareProviderType(state: string, age: number): Vars {
  switch (state) {
    case "MA":
      return { ma_ccfa_care_provider_type: y(age < MA_CCFA_SCHOOL_AGE ? "CENTER_BASED_CARE_EARLY_EDUCATION" : "CENTER_BASED_CARE_SCHOOL_AGE") };
    case "MD":
      return { md_ccs_provider_type: y("LICENSED_CENTER") };
    default:
      return {};
  }
}

/** The person-level variable the curve varies: wages, or self-employment income when the earner said so. */
export function earningsVariable(a: Pick<HouseholdAnswers, "selfEmployed">): "employment_income" | "self_employment_income" {
  return a.selfEmployed ? "self_employment_income" : "employment_income";
}

/**
 * Citizenship as PolicyEngine sees it: `immigration_status` for the benefit
 * rules and `ssn_card_type` for the tax credits' identification tests, which
 * PolicyEngine does not derive from each other. An SSN valid for work comes
 * with lawful permanent residence and the humanitarian statuses; DACA and
 * TPS carry one only alongside a work permit; an undocumented person has
 * none, so no EITC (26 U.S.C. 32(m)) and, from 2025, no refundable child tax
 * credit. Omitted for a citizen so the payload stays byte-identical.
 */
function applyImmigration(person: Vars, status: HouseholdAnswers["youStatus"], yearsInUs: number | null): void {
  if (status === "citizen") return;
  const pe: Record<Exclude<HouseholdAnswers["youStatus"], "citizen">, string> = {
    lpr: "LEGAL_PERMANENT_RESIDENT", refugee: "REFUGEE", asylee: "ASYLEE", deportation_withheld: "DEPORTATION_WITHHELD",
    cuban_haitian_entrant: "CUBAN_HAITIAN_ENTRANT", conditional_entrant: "CONDITIONAL_ENTRANT", paroled_one_year: "PAROLED_ONE_YEAR",
    daca: "DACA", tps: "TPS", undocumented: "UNDOCUMENTED",
  };
  person.immigration_status = y(pe[status]);
  person.ssn_card_type = y(status === "undocumented" ? "NONE" : status === "daca" || status === "tps" ? "NON_CITIZEN_VALID_EAD" : "CITIZEN");
  if (yearsInUs !== null) person.years_since_us_entry = y(yearsInUs);
}

export function buildPEPayload(a: HouseholdAnswers, opts: PayloadOptions = {}): { household: object } {
  const ssiPathway = opts.ssiPathway ?? true;
  const you: Vars = { age: y(a.age) };
  for (const v of PERSON_VARS) you[v] = y(null);
  applyImmigration(you, a.youStatus, a.youYearsInUs);
  // Liquid assets on the householder; SNAP sums them over the unit. Omitted
  // when zero so the payload, and the cache key built from it, stay canonical.
  if (a.savings > 0) you.bank_account_assets = y(a.savings);
  // A self-employed earner's wages are zero by construction; the axis below
  // then varies self_employment_income instead.
  if (a.selfEmployed) you.employment_income = y(0);
  if (a.monthlyRent !== null) you.rent = y(a.monthlyRent * 12);
  // Hours are an ASSUMPTION when unasked: full time. `weekly_hours_worked_before_lsr`
  // defaults to 0 when unsent, and from policyengine-us 2.5.0 that zero is
  // read as "not working": SNAP's ABAWD rule (ages 18–64 and parents whose
  // youngest is 14+, after P.L. 119-21) pays $0 at every point of the curve,
  // and Maryland's and Massachusetts's child-care activity tests fail. The
  // hosted 1.764.6 model read the same zero leniently, which hid all of it
  // (verified 2026-09-15: TX childless adult at $12k, SNAP $1,473 hosted vs
  // $0 on 2.5.0 with hours unsent, $1,478 with 30). The curve is about pay
  // from work, so its earner works; the $0-pay point carries the same
  // boundary assumption rent and the child-care bill already do. Massachusetts
  // also scales its TAFDC dependent-care deduction by these hours.
  you.weekly_hours_worked_before_lsr = y(a.hoursPerWeek ?? DEFAULT_HOURS);
  applyDisability(you, a.youDisabled, ssiPathway);
  // Non-wage income, annualized onto the householder. All three names verified
  // live 2026-09-14; all three land inside household_benefits, so they also
  // show up in a point's otherBenefits (see parse.ts). Omitted when zero so
  // the payload — and the cache key built from it — stays canonical.
  if (a.childSupportMonthly > 0) you.child_support_received = y(a.childSupportMonthly * 12);
  if (a.unemploymentMonthly > 0) you.unemployment_compensation = y(a.unemploymentMonthly * 12);
  if (a.ssdiMonthly > 0) you.social_security_disability = y(a.ssdiMonthly * 12);
  if (a.hasEmployerCoverage) {
    // Employer coverage requires all three inputs together to disqualify ACA
    // subsidies (verified live 2026-07-11). Only the two flags do any work:
    // the premium figure is inert — $6,500 and $13,000 produce byte-identical
    // output (verified live 2026-09-14) — and PolicyEngine documents the
    // variable as the EMPLOYER-paid premium, not the employee's share. We send
    // the MEPS-IC employee contribution because that is the figure the money
    // line uses (evaluate.ts); if the variable ever starts doing work, switch
    // this to the MEPS total premium minus that contribution.
    // Inert upstream (see the comment above); the tier the household actually
    // pays is evaluate.ts's esiTierAt, so this field carries one figure only.
    const esiPremium = ESI_EMPLOYEE_CONTRIBUTION.single;
    you.has_esi = y(true);
    you.offered_aca_disqualifying_esi = y(true);
    you.employer_sponsored_insurance_premiums = y(esiPremium);
  }
  // The plan reaches the spouse and children too (evaluate.ts charges the
  // plus-one and family tiers), so the ACA firewall applies to them as well:
  // without these flags PolicyEngine kept computing a premium credit for the
  // rest of the family, and "ACA ends" could appear on a household that was
  // never on the marketplace. Medicaid and CHIP for the children are
  // untouched by the flags (verified 2026-09-16, both endpoints).
  const esiFlags: Vars = a.hasEmployerCoverage ? { has_esi: y(true), offered_aca_disqualifying_esi: y(true) } : {};

  const people: Record<string, Vars> = { you };
  if (a.married) {
    people.spouse = { age: y(a.spouseAge), employment_income: y(a.spouseAnnualEarnings), ...esiFlags };
    for (const v of PERSON_VARS) people.spouse[v] = y(null);
    applyImmigration(people.spouse, a.spouseStatus, a.spouseYearsInUs);
    // Only a spouse with earnings works the hours; a stay-at-home spouse at 40
    // hours a week would be a different household.
    if (a.spouseAnnualEarnings > 0) people.spouse.weekly_hours_worked_before_lsr = y(a.hoursPerWeek ?? DEFAULT_HOURS);
    applyDisability(people.spouse, a.spouseDisabled, ssiPathway);
  }
  // Enrollment flags like `is_enrolled_in_head_start` do NOT work in
  // PolicyEngine. Take-up "off" instead forces the program's dollar value to
  // 0 as an input; "on" leaves it null so PolicyEngine computes it (verified
  // live 2026-07-11).
  const hsValue = a.getsHeadStart ? null : 0;
  a.childAges.forEach((age, i) => {
    const child: Vars = { age: y(age), early_head_start: y(hsValue), head_start: y(hsValue), ...esiFlags };
    for (const v of PERSON_VARS) child[v] = y(null);
    // WIC has no take-up switch upstream; like Head Start, "off" forces the value.
    if (!a.getsWic) child.wic = y(0);
    applyDisability(child, a.childDisabled[i] ?? false, ssiPathway);
    people[`child${i + 1}`] = child;
  });
  // The entitlements a household says it does not get. PolicyEngine's own
  // take-up switches, so everything downstream — SNAP's dependent-care
  // deduction, the premium credit a Medicaid-eligible adult cannot have —
  // follows. Omitted when on (the default) so nothing changes for anyone
  // else; verified on both endpoints 2026-09-16.
  if (!a.getsMedicaid) for (const person of Object.values(people)) person.takes_up_medicaid_if_eligible = y(false);

  const members = Object.keys(people);
  const spmVars: Vars = {};
  if (!a.getsSnap) spmVars.takes_up_snap_if_eligible = y(false);
  if (!a.getsTanf) spmVars.takes_up_tanf_if_eligible = y(false);
  applyChildcareSubsidy(spmVars, people, a);
  if (a.state === "MA" && a.childAges.length > 0) {
    for (const v of ["ma_tafdc", "ma_tafdc_payment_standard", "ma_tafdc_non_financial_eligible", "ma_tafdc_countable_unearned_income", "ma_tafdc_dependent_care_deduction"]) spmVars[v] = y(null);
    for (const person of Object.values(people)) {
      person.ma_tafdc_clothing_allowance = y(null);
      person.ma_tafdc_infant_benefit = y(null);
    }
  }
  for (const v of SPM_VARS) spmVars[v] = y(null);
  if (!a.getsHousing) {
    spmVars.spm_unit_capped_housing_subsidy = y(0);
    // Not the same variable: `household_benefits` reads `housing_assistance`,
    // the HUD payment PolicyEngine makes to any income-eligible renter because
    // `takes_up_housing_assistance_if_eligible` defaults true, and forcing the
    // capped subsidy to 0 leaves that untouched. It leaked into otherBenefits
    // in the sweep — $2,963/yr for a Los Angeles adult, $2,471 in Johnson
    // County, Kansas (only where upstream encodes a PHA utility allowance,
    // since HotGap sends the rent as SNAP's `rent`, not HUD's
    // `pre_subsidy_rent`). Traced 2026-09-16; core/src/stateOtherBenefits.ts
    // carried the label until this switch closed it.
    spmVars.takes_up_housing_assistance_if_eligible = y(false);
  } else {
    // A voucher holder's rent is what HUD's payment standard is measured
    // against; SNAP's `rent` is the other input and is sent regardless.
    if (a.monthlyRent !== null) you.pre_subsidy_rent = y(a.monthlyRent * 12);
  }
  // WORKAROUND — remove when upstream stops zeroing the credit for non-filers
  // who take APTC (policyengine-us #9479).
  // `aca_ptc` multiplies by `tax_unit_is_filer`, which PolicyEngine derives
  // from the filing thresholds — so a childless couple past the end of the
  // EITC but under the $32,200 joint threshold is "not a filer" and gets no
  // premium credit while still being charged the full premium (IL couple at
  // $30,000, verified live 2026-09-15: PTC $0, MOOP $19,870, after-health
  // income $6,914; with this flag PTC $18,779, MOOP $1,090, $25,694). Anyone
  // claiming a premium tax credit files a return, so say so.
  const taxVars: Vars = { tax_unit_is_filer: y(true) };
  for (const v of TAX_VARS) taxVars[v] = y(null);
  const assistance = statePremiumAssistanceFor(a.state);
  if (opts.statePremiumAssistance && assistance) taxVars[assistance.variable] = y(null);

  const householdVars: {
    members: string[];
    state_name: ReturnType<typeof y>;
    household_net_income: ReturnType<typeof y>;
    household_benefits: ReturnType<typeof y>;
    household_state_benefits: ReturnType<typeof y>;
    household_refundable_tax_credits: ReturnType<typeof y>;
    county_fips?: ReturnType<typeof y>;
  } = {
    members,
    state_name: y(a.state),
    household_net_income: y(null),
    // Asked for so a cliff can report what it cost even when the program that
    // caused it is one HotGap does not name (parse.ts's otherBenefits).
    household_benefits: y(null),
    // State benefits used to be asked for only in Massachusetts; every state
    // has some, and a cliff driven by one of them was otherwise unexplained.
    household_state_benefits: y(null),
    // The refundable credits that ARE inside household_net_income, so a step
    // in net income can be attributed to them rather than guessed at.
    household_refundable_tax_credits: y(null),
  };
  if (a.countyFips) householdVars.county_fips = y(a.countyFips);

  const axis = axisSpec(a);
  return {
    household: {
      people,
      families: { family: { members } },
      marital_units: { marital_unit: { members: a.married ? ["you", "spouse"] : ["you"] } },
      tax_units: { tax_unit: { members, ...taxVars } },
      spm_units: { spm_unit: { members, ...spmVars } },
      households: {
        household: householdVars,
      },
      axes: [[{ name: earningsVariable(a), min: 0, max: axis.max, count: axis.count, period: YEAR }]],
    },
  };
}
