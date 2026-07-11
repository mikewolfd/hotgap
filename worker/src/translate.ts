import { YEAR, type HouseholdAnswers } from "@hotgap/shared";

export const AXIS_COUNT = 101;
const ADULT_AGE = 30;

export function axisMax(annualEarnings: number): number {
  return Math.max(100_000, Math.ceil((annualEarnings * 1.5) / 5000) * 5000);
}

type Vars = Record<string, Record<string, number | string | null>>;
const y = (value: number | string | null): Record<string, number | string | null> => ({ [YEAR]: value });

const PERSON_VARS = ["medicaid", "chip", "wic", "ssi"];
const SPM_VARS = ["snap", "tanf", "spm_unit_capped_housing_subsidy", "free_school_meals", "reduced_price_school_meals"];
const TAX_VARS = ["eitc", "refundable_ctc", "premium_tax_credit"];

export function buildPEPayload(a: HouseholdAnswers): { household: object } {
  const you: Vars = { age: y(ADULT_AGE) };
  for (const v of PERSON_VARS) you[v] = y(null);
  if (a.monthlyRent !== null) you.rent = y(a.monthlyRent * 12);

  const people: Record<string, Vars> = { you };
  if (a.married) {
    people.spouse = { age: y(ADULT_AGE), employment_income: y(a.spouseAnnualEarnings) };
    for (const v of PERSON_VARS) people.spouse[v] = y(null);
  }
  a.childAges.forEach((age, i) => {
    people[`child${i + 1}`] = { age: y(age), medicaid: y(null), chip: y(null), head_start: y(null), early_head_start: y(null) };
  });

  const members = Object.keys(people);
  const spmVars: Vars = { childcare_expenses: y((a.monthlyChildcare ?? 0) * 12) };
  for (const v of SPM_VARS) spmVars[v] = y(null);
  const taxVars: Vars = {};
  for (const v of TAX_VARS) taxVars[v] = y(null);

  return {
    household: {
      people,
      families: { family: { members } },
      marital_units: { marital_unit: { members: a.married ? ["you", "spouse"] : ["you"] } },
      tax_units: { tax_unit: { members, ...taxVars } },
      spm_units: { spm_unit: { members, ...spmVars } },
      households: {
        household: { members, state_name: y(a.state), household_net_income: y(null) },
      },
      axes: [[{ name: "employment_income", min: 0, max: axisMax(a.annualEarnings), count: AXIS_COUNT, period: YEAR }]],
    },
  };
}
