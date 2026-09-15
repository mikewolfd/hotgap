import { ESI_EMPLOYEE_CONTRIBUTION, fpl2025 } from "./policyYear.js";
import { esiTier, householdSize, YEAR, type HouseholdAnswers } from "./types.js";

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

export function buildPEPayload(a: HouseholdAnswers, opts: PayloadOptions = {}): { household: object } {
  const ssiPathway = opts.ssiPathway ?? true;
  const you: Vars = { age: y(a.age) };
  for (const v of PERSON_VARS) you[v] = y(null);
  if (a.monthlyRent !== null) you.rent = y(a.monthlyRent * 12);
  // Massachusetts scales its TAFDC dependent-care deduction by
  // `weekly_hours_worked_before_lsr`, which defaults to 0 when nobody sends
  // it, so the deduction was always zero for every household.
  if (a.hoursPerWeek !== null) you.weekly_hours_worked_before_lsr = y(a.hoursPerWeek);
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
    const esiPremium = ESI_EMPLOYEE_CONTRIBUTION[esiTier(a)];
    you.has_esi = y(true);
    you.offered_aca_disqualifying_esi = y(true);
    you.employer_sponsored_insurance_premiums = y(esiPremium);
  }

  const people: Record<string, Vars> = { you };
  if (a.married) {
    people.spouse = { age: y(a.spouseAge), employment_income: y(a.spouseAnnualEarnings) };
    for (const v of PERSON_VARS) people.spouse[v] = y(null);
    // Only a spouse with earnings works the hours; a stay-at-home spouse at 40
    // hours a week would be a different household.
    if (a.hoursPerWeek !== null && a.spouseAnnualEarnings > 0) people.spouse.weekly_hours_worked_before_lsr = y(a.hoursPerWeek);
    applyDisability(people.spouse, a.spouseDisabled, ssiPathway);
  }
  // Enrollment flags like `is_enrolled_in_head_start` do NOT work in
  // PolicyEngine. Take-up "off" instead forces the program's dollar value to
  // 0 as an input; "on" leaves it null so PolicyEngine computes it (verified
  // live 2026-07-11).
  const hsValue = a.getsHeadStart ? null : 0;
  a.childAges.forEach((age, i) => {
    const child: Vars = { age: y(age), early_head_start: y(hsValue), head_start: y(hsValue) };
    for (const v of PERSON_VARS) child[v] = y(null);
    applyDisability(child, a.childDisabled[i] ?? false, ssiPathway);
    people[`child${i + 1}`] = child;
  });

  const members = Object.keys(people);
  const spmVars: Vars = { childcare_expenses: y((a.monthlyChildcare ?? 0) * 12) };
  if (a.state === "MA" && a.childAges.length > 0) {
    for (const v of ["ma_tafdc", "ma_tafdc_payment_standard", "ma_tafdc_non_financial_eligible", "ma_tafdc_countable_unearned_income", "ma_tafdc_dependent_care_deduction"]) spmVars[v] = y(null);
    for (const person of Object.values(people)) {
      person.ma_tafdc_clothing_allowance = y(null);
      person.ma_tafdc_infant_benefit = y(null);
    }
  }
  for (const v of SPM_VARS) spmVars[v] = y(null);
  if (!a.getsHousing) spmVars.spm_unit_capped_housing_subsidy = y(0);
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
      axes: [[{ name: "employment_income", min: 0, max: axis.max, count: axis.count, period: YEAR }]],
    },
  };
}
