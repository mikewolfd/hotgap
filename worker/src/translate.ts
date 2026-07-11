import { YEAR, type HouseholdAnswers } from "@hotgap/shared";

export const AXIS_COUNT = 101;

export function axisMax(annualEarnings: number): number {
  return Math.max(100_000, Math.ceil((annualEarnings * 1.5) / 5000) * 5000);
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

  const people: Record<string, Vars> = { you };
  if (a.married) {
    people.spouse = { age: y(a.spouseAge), employment_income: y(a.spouseAnnualEarnings) };
    for (const v of PERSON_VARS) people.spouse[v] = y(null);
    applyDisability(people.spouse, a.spouseDisabled);
  }
  a.childAges.forEach((age, i) => {
    const child: Vars = { age: y(age), medicaid: y(null), chip: y(null), head_start: y(null), early_head_start: y(null) };
    applyDisability(child, a.childDisabled[i] ?? false);
    people[`child${i + 1}`] = child;
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
