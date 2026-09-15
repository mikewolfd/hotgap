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
    // A working parent of a young child pays for care, so a $0 bill is not the
    // neutral default — it is the one that hides the childcare cliff. Each
    // child under 6 is charged the state's center-based preschool price; a
    // 6-year-old is in school. Infant care really costs more than a
    // preschooler's, so a household with a baby is understated here.
    //
    // Only the sole-earner households buy it. These married archetypes have
    // one earner and a spouse at home, who is the childcare. Charging them for
    // care AND denying them the subsidy — which every state conditions on all
    // parents working — is the one combination that is wrong both ways, and it
    // was costing them up to $34,000 a year of expense with nothing against it.
    // The consequence is that no married row on the map shows a childcare
    // cliff, which is true of a single-earner couple and not true of a
    // two-earner one. A dual-earner couple is the household that cliff bites
    // hardest, and it is not among the eight archetypes.
    monthlyChildcare: a.married ? 0 : defaults.monthlyChildcarePreschool * a.childAges.filter((age) => age < 6).length,
    annualEarnings: 0,          // the axis varies earnings; this only sets the axis floor
    spouseAnnualEarnings: 0,
    hoursPerWeek: null,
    age: 30,
    spouseAge: a.married ? 30 : null,
    youDisabled: false,
    spouseDisabled: false,
    getsHeadStart: false,
    getsHousing: false,
    // Unlike Head Start and a housing voucher, the child-care subsidy is ON
    // for the sweep. Those default off because the personal door answers "what
    // happens to YOU", and assuming a rationed program a household may not
    // receive inflates their own numbers. The sweep answers a different
    // question — how rough are this state's rules — and its exit is the
    // largest cliff most parents of young children face, so a map that omits
    // it understates every state. The personal default stays off.
    getsChildcareSubsidy: !a.married,
    hasEmployerCoverage: false,
    ssdiMonthly: 0,
    childSupportMonthly: 0,
    unemploymentMonthly: 0,
  };
}
