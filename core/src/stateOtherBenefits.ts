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
// test on the committed data fails until someone traces it. The first trace
// (2026-09-16) found a leak rather than a benefit: PolicyEngine's HUD voucher
// payment reaching CA and KS households that had said they have no voucher,
// because HotGap forced the wrong variable. That is closed in translate.ts
// (`takes_up_housing_assistance_if_eligible`), so it has no row here.

import { coded, type Coded } from "./messages.js";

export interface OtherBenefitSource {
  /** The PolicyEngine variable, as named in the household-benefit lists. */
  variable: string;
  /** The request entity it is defined on, so the contract suite can ask for it. */
  entity: "people" | "spm_units" | "tax_units" | "households";
  /** What the money is, for a reader: rendered from `coverage.otherBenefits.<variable>` in messages/en.json, and the code beside it. */
  label: string;
  message: Coded;
  /** The states whose swept county turns the variable on. */
  states: readonly string[];
}

export const OTHER_BENEFIT_SOURCES: readonly OtherBenefitSource[] = [
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
    label: coded("coverage.otherBenefits.nj_property_tax_relief").text,
    message: coded("coverage.otherBenefits.nj_property_tax_relief").message,
    states: ["NJ"],
  },
];

/** The variables known to carry this state's remainder; empty where none has been traced. */
export function otherBenefitSourcesFor(state: string): OtherBenefitSource[] {
  return OTHER_BENEFIT_SOURCES.filter((s) => s.states.includes(state));
}
