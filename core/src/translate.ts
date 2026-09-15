import { ESI_EMPLOYEE_CONTRIBUTION } from "./policyYear.js";
import { YEAR, type HouseholdAnswers } from "./types.js";

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
 * The step grows with the axis so a request stays near 151 points whatever the
 * household earns; a wider step raises the cliff-detection floor (see
 * analyze.ts), which is the price of not asking PolicyEngine for 751 points.
 */
export function axisSpec(a: HouseholdAnswers): AxisSpec {
  const wanted = Math.max(150_000, Math.ceil((a.annualEarnings * 1.5) / 5000) * 5000);
  const step = Math.max(1000, Math.ceil(wanted / 150_000) * 1000);
  // Round the top up to a whole number of steps: `wanted` is a multiple of
  // $5,000 and `step` need not divide it (a $150,000 earner wants $225,000 at
  // a $2,000 step), and a fractional point count is not a valid axis.
  const max = Math.ceil(wanted / step) * step;
  return { max, step, count: max / step + 1 };
}

type Vars = Record<string, Record<string, number | string | boolean | null>>;
const y = (value: number | string | boolean | null): Record<string, number | string | boolean | null> => ({ [YEAR]: value });

const PERSON_VARS = ["medicaid", "chip", "wic", "ssi"];
const SPM_VARS = ["snap", "tanf", "spm_unit_capped_housing_subsidy", "free_school_meals", "reduced_price_school_meals", "spm_unit_medical_out_of_pocket_expenses"];
const TAX_VARS = ["eitc", "refundable_ctc", "premium_tax_credit"];

// `is_disabled: true` alone does not unlock SSI in PolicyEngine — only
// `is_ssi_disabled: true` does (verified live 2026-07-11). We set both on any
// person marked disabled so SSI/SSDI-related cliffs are modeled. Non-disabled
// people get neither key at all (omitted, not `false`) so payloads — and
// therefore cache keys — stay canonical between otherwise-identical requests.
function applyDisability(person: Vars, disabled: boolean): void {
  if (!disabled) return;
  person.is_disabled = y(true);
  person.is_ssi_disabled = y(true);
}

export function buildPEPayload(a: HouseholdAnswers): { household: object } {
  const you: Vars = { age: y(a.age) };
  for (const v of PERSON_VARS) you[v] = y(null);
  if (a.monthlyRent !== null) you.rent = y(a.monthlyRent * 12);
  applyDisability(you, a.youDisabled);
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
    const esiPremium = ESI_EMPLOYEE_CONTRIBUTION[a.married || a.childAges.length > 0 ? "family" : "single"];
    you.has_esi = y(true);
    you.offered_aca_disqualifying_esi = y(true);
    you.employer_sponsored_insurance_premiums = y(esiPremium);
  }

  const people: Record<string, Vars> = { you };
  if (a.married) {
    people.spouse = { age: y(a.spouseAge), employment_income: y(a.spouseAnnualEarnings) };
    for (const v of PERSON_VARS) people.spouse[v] = y(null);
    applyDisability(people.spouse, a.spouseDisabled);
  }
  // Enrollment flags like `is_enrolled_in_head_start` do NOT work in
  // PolicyEngine. Take-up "off" instead forces the program's dollar value to
  // 0 as an input; "on" leaves it null so PolicyEngine computes it (verified
  // live 2026-07-11).
  const hsValue = a.getsHeadStart ? null : 0;
  a.childAges.forEach((age, i) => {
    const child: Vars = { age: y(age), medicaid: y(null), chip: y(null), early_head_start: y(hsValue) };
    child.head_start = y(hsValue);
    applyDisability(child, a.childDisabled[i] ?? false);
    people[`child${i + 1}`] = child;
  });

  const members = Object.keys(people);
  const spmVars: Vars = { childcare_expenses: y((a.monthlyChildcare ?? 0) * 12) };
  for (const v of SPM_VARS) spmVars[v] = y(null);
  if (!a.getsHousing) spmVars.spm_unit_capped_housing_subsidy = y(0);
  const taxVars: Vars = {};
  for (const v of TAX_VARS) taxVars[v] = y(null);

  const householdVars: {
    members: string[];
    state_name: ReturnType<typeof y>;
    household_net_income: ReturnType<typeof y>;
    household_benefits: ReturnType<typeof y>;
    county_fips?: ReturnType<typeof y>;
  } = {
    members,
    state_name: y(a.state),
    household_net_income: y(null),
    // Asked for so a cliff can report what it cost even when the program that
    // caused it is one HotGap does not name (parse.ts's otherBenefits).
    household_benefits: y(null),
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
