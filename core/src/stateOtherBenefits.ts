// What the untracked `otherBenefits` remainder — PolicyEngine's
// household_benefits minus the programs HotGap names (parse.ts) — actually is,
// in the states where the committed sweep has one. Traced 2026-09-16 on
// policyengine-us 2.5.0 by re-requesting the swept household with every
// entry of `gov.household.household_benefits` and
// `gov.household.household_state_benefits` that HotGap does not name, and
// reading which one carried the money; the contract suite pins each finding
// (contract/policyengine.contract.test.ts, "otherBenefits is …").
//
// The sweep does not request these variables itself — the remainder is one
// number per point — so a state's entry here is the record of a probe, not
// something the pipeline recomputes. A state whose remainder grows past the
// floor below without a row here is reported as unidentified, and the unit
// test on the committed data fails until someone traces it.

export interface OtherBenefitSource {
  /** The PolicyEngine variable, as named in the household-benefit lists. */
  variable: string;
  /** The request entity it is defined on, so the contract suite can ask for it. */
  entity: "people" | "spm_units" | "tax_units" | "households";
  label: string;
  /** The states whose swept county turns the variable on. */
  states: readonly string[];
}

export const OTHER_BENEFIT_SOURCES: readonly OtherBenefitSource[] = [
  {
    // HUD's Housing Choice Voucher payment, which PolicyEngine models for any
    // income-eligible renter (`takes_up_housing_assistance_if_eligible`
    // defaults to true). HotGap switches the voucher off by forcing
    // `spm_unit_capped_housing_subsidy` to 0 (translate.ts), but the variable
    // inside household_benefits is `housing_assistance`, which is not forced,
    // so the modeled payment reaches net income anyway. It is small because
    // HotGap sends the rent as `rent` (SNAP's shelter deduction), not as
    // `pre_subsidy_rent` (HUD's gross rent), so `hud_gross_rent` is the PHA
    // utility allowance alone and the payment is capped at that allowance
    // minus the tenant's $25 minimum payment: LA County's $249/month
    // zero-bedroom all-electric schedule gives $2,963 a year, Johnson County
    // KS's $208 gives $2,471. Upstream encodes a utility allowance for LA
    // County, four Kansas PHAs and the Texas TDHCA service area only
    // (parameters/gov/hud/utility_allowance), so every other swept county
    // has a $0 gross rent and a $0 payment. Verified 2026-09-16: `hud_hap`
    // $2,963 / $2,471 with `hud_gross_rent` $2,988 / $2,496 in CA / KS, $0
    // and $0 in TX (Harris County) and NY.
    variable: "housing_assistance",
    entity: "spm_units",
    label: "HUD housing assistance payment, modeled by PolicyEngine for an eligible renter — the utility allowance only, since HotGap does not send pre_subsidy_rent",
    states: ["CA", "KS"],
  },
  {
    // New Jersey's ANCHOR renter benefit: a flat $450 a year for a renter
    // under 65 with income at or below $150,000 (N.J.S.A. 54:4-8.67; upstream
    // parameters gov/states/nj/tax/income/credits/anchor/renter). In
    // `gov.household.household_state_benefits` from 2026 as
    // `nj_property_tax_relief`, which also carries Senior Freeze and Stay NJ
    // for an older homeowner. Verified 2026-09-16: $450 at every point of
    // every New Jersey archetype's curve.
    variable: "nj_property_tax_relief",
    entity: "tax_units",
    label: "New Jersey ANCHOR property-tax relief, renter benefit ($450 a year under $150,000 of income)",
    states: ["NJ"],
  },
];

/** The variables known to carry this state's remainder; empty where none has been traced. */
export function otherBenefitSourcesFor(state: string): OtherBenefitSource[] {
  return OTHER_BENEFIT_SOURCES.filter((s) => s.states.includes(state));
}
