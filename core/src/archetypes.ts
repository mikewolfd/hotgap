import { stateDefaults } from "./stateDefaults.js";
import type { HouseholdAnswers } from "./types.js";

export interface Archetype { id: string; married: boolean; childAges: number[] }

export const ARCHETYPES: Archetype[] = [
  { id: "single-0", married: false, childAges: [] },
  { id: "single-1", married: false, childAges: [3] },
  { id: "single-2", married: false, childAges: [3, 7] },   // default archetype for state comparisons
  { id: "single-3", married: false, childAges: [1, 4, 9] },
  { id: "married-0", married: true, childAges: [] },
  { id: "married-1", married: true, childAges: [3] },
  { id: "married-2", married: true, childAges: [3, 7] },
  { id: "married-3", married: true, childAges: [1, 4, 9] },
];

export const DEFAULT_ARCHETYPE = "single-2";

/**
 * The swept household: a typical renter in the state's largest county.
 *
 * Rent and county are no longer null. A null rent is not "unknown" to
 * PolicyEngine, it is $0 — no SNAP excess-shelter deduction, so every swept
 * cell understated SNAP by $1–3k — and a null county is the state's default
 * ACA rating area, identical for CT and IL and for CO and IN, so a
 * premium-driven ranking partly ranked that default. Both now come from
 * stateDefaults (HUD FY2026 FMR, Census Vintage 2024). Childcare stays $0:
 * the archetype reports no childcare expense, and inventing one would inflate
 * its dependent-care deduction. With no bill there is nothing for the CCDF
 * child-care subsidy to reimburse either, so `getsChildcareSubsidy` is off
 * and every swept curve is unchanged by it.
 */
// WORKAROUND (partly) — the county below sidesteps PolicyEngine's default
// rating area, which is identical for CT/IL and CO/IN (policyengine-us #9480);
// sending a real county stays right even after that is fixed.
export function answersFor(state: string, a: Archetype): HouseholdAnswers {
  const defaults = stateDefaults(state);
  return {
    state,
    countyFips: defaults.countyFips,
    married: a.married,
    childAges: a.childAges,
    childDisabled: a.childAges.map(() => false),
    monthlyRent: defaults.monthlyRent,
    monthlyChildcare: 0,
    annualEarnings: 0,          // the axis varies earnings; this only sets the axis floor
    spouseAnnualEarnings: 0,
    hoursPerWeek: null,
    age: 30,
    spouseAge: a.married ? 30 : null,
    youDisabled: false,
    spouseDisabled: false,
    getsHeadStart: false,
    getsHousing: false,
    getsChildcareSubsidy: false,
    hasEmployerCoverage: false,
    ssdiMonthly: 0,
    childSupportMonthly: 0,
    unemploymentMonthly: 0,
  };
}
