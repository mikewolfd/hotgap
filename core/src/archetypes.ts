import { FEDERAL_MIN_WAGE_FULL_TIME_ANNUAL } from "./policyYear.js";
import { childcareMonthlyFor, stateDefaults } from "./stateDefaults.js";
import type { HouseholdAnswers } from "./types.js";

export interface Archetype {
  id: string;
  married: boolean;
  childAges: number[];
  /**
   * Whether the SECOND adult earns. Always false for a single parent, who has
   * no second adult. It is the axis the `married-dual-*` rows add, and the one
   * thing that decides whether the household buys childcare: every state's
   * CCDF subsidy conditions on every parent working (verified live 2026-09-15
   * — Delaware pays a married couple $13,260 once the spouse works and $0 when
   * they do not), so a couple with a parent at home is charged no care and
   * claims no subsidy, while one with both parents at work is charged both.
   */
  spouseWorks: boolean;
  /**
   * `false` switches the child-care subsidy OFF for a household that still
   * pays the full care bill: the family that pays and is not served, which is
   * most eligible families (CCDF is rationed). Absent means the sweep's own
   * rule — the subsidy is claimed wherever every parent works. It exists for
   * the `-nosub` twin, so a reader can subtract the subsidy's exit from the
   * state's rules; no live household is ever matched to it (fallback.ts).
   */
  subsidy?: false;
}

export const ARCHETYPES: Archetype[] = [
  { id: "single-0", married: false, childAges: [], spouseWorks: false },
  { id: "single-1", married: false, childAges: [3], spouseWorks: false },
  { id: "single-2", married: false, childAges: [3, 7], spouseWorks: false },   // default archetype for state comparisons
  { id: "single-3", married: false, childAges: [1, 4, 9], spouseWorks: false },
  { id: "married-0", married: true, childAges: [], spouseWorks: false },
  { id: "married-1", married: true, childAges: [3], spouseWorks: false },
  { id: "married-2", married: true, childAges: [3, 7], spouseWorks: false },
  { id: "married-3", married: true, childAges: [1, 4, 9], spouseWorks: false },
  // The two-earner couple. Same children as its single-earner twin, so the
  // pair differ in exactly one thing and a reader can subtract them. There is
  // deliberately no `married-dual-0`: a childless couple has no childcare
  // dimension, which is the whole reason these rows exist, and married-0 is
  // already the nearest curve for one (see pickArchetypeId).
  { id: "married-dual-1", married: true, childAges: [3], spouseWorks: true },
  { id: "married-dual-2", married: true, childAges: [3, 7], spouseWorks: true },
  { id: "married-dual-3", married: true, childAges: [1, 4, 9], spouseWorks: true },
  // The default household's twin without child-care help: same children, same
  // care bill, subsidy off (`subsidy: false`). Swept, never picked for a live
  // household (pickArchetypeId skips it); a summary written before the sweep
  // that adds it simply does not list it, and every surface reads the list.
  { id: "single-2-nosub", married: false, childAges: [3, 7], spouseWorks: false, subsidy: false },
];

/** Whether this archetype is a twin with the child-care subsidy forced off — a sweep-only row no live household matches. */
export const isNoSubsidyTwin = (a: Pick<Archetype, "id">): boolean => a.id.endsWith("-nosub");

export const DEFAULT_ARCHETYPE = "single-2";

/** The archetype with this id; an id no sweep builds is a bug, not a null. */
export function archetypeById(id: string): Archetype {
  const found = ARCHETYPES.find((a) => a.id === id);
  if (!found) throw new Error(`no archetype "${id}"`);
  return found;
}

/** The second earner's fixed pay beside the axis: the federal minimum full time, or $0 when nobody else earns. */
export const archetypeSpousePay = (a: Pick<Archetype, "spouseWorks">): number =>
  a.spouseWorks ? FEDERAL_MIN_WAGE_FULL_TIME_ANNUAL : 0;

// Hours a week the second earner works. It is not a pay input — the pay is
// FEDERAL_MIN_WAGE_FULL_TIME_ANNUAL — but the CCDF subsidy has an ACTIVITY
// test as well as an income one, and PolicyEngine reads that off
// `weekly_hours_worked_before_lsr`, which defaults to 0 when nobody sends it.
// A spouse with pay and no hours would be denied the subsidy for not working.
const SPOUSE_HOURS_PER_WEEK = 40;

/**
 * The swept household: a typical renter in the state's largest county.
 *
 * Rent and county are no longer null. A null rent is not "unknown" to
 * PolicyEngine, it is $0 — no SNAP excess-shelter deduction, so every swept
 * cell understated SNAP by $1–3k — and a null county is the state's default
 * ACA rating area, identical for CT and IL and for CO and IN, so a
 * premium-driven ranking partly ranked that default. Both now come from
 * stateDefaults (HUD FY2026 FMR, Census Vintage 2024).
 *
 * ONE EARNER MOVES. The axis varies `annualEarnings` — the householder's own
 * pay — and holds the spouse's fixed, so a `married-*` curve answers "what
 * happens to a one-pay couple as that pay rises" and a `married-dual-*` curve
 * answers "what happens to a two-pay couple as the SECOND earner's pay rises",
 * with the first held at $15,080. Those are different questions and both are
 * real: the second is the raise a spouse who went back to work is offered, and
 * it is the one that crosses a childcare-subsidy exit with a full bill still
 * to pay. Neither is "a couple's household income rising", which would need
 * both pays to move together and is not what any curve here shows.
 */
// WORKAROUND (partly) — the county below sidesteps PolicyEngine's default
// rating area, which is identical for CT/IL and CO/IN (policyengine-us #9480);
// sending a real county stays right even after that is fixed.
export function answersFor(state: string, a: Archetype): HouseholdAnswers {
  const defaults = stateDefaults(state);
  // Every parent in this household works, which is both what makes the
  // childcare bill real and what the subsidy's activity test requires.
  const everyParentWorks = !a.married || a.spouseWorks;
  return {
    state,
    countyFips: defaults.countyFips,
    married: a.married,
    childAges: a.childAges,
    childDisabled: a.childAges.map(() => false),
    monthlyRent: defaults.monthlyRent,
    // A working parent pays for care, so a $0 bill is not the neutral default
    // — it is the one that hides the childcare cliff. Each child through 12 is
    // charged the state's center-based price for their age band: infant,
    // toddler, preschool, or — for a child in school — the school-age rate,
    // the before-and-after-school care a working parent still buys (a
    // 7-year-old cost nothing here before 2026-09-16).
    //
    // Only the households where every parent works buy it. A single-earner
    // couple's spouse IS the childcare; charging them for care AND denying
    // them the subsidy — which every state conditions on all parents working —
    // is the one combination wrong both ways, and it was costing them up to
    // $34,000 a year of expense with nothing against it.
    monthlyChildcare: everyParentWorks
      ? a.childAges.reduce((sum, age) => sum + childcareMonthlyFor(defaults, age), 0)
      : 0,
    annualEarnings: 0,          // the axis varies earnings; this only sets the axis floor
    spouseAnnualEarnings: archetypeSpousePay(a),
    hoursPerWeek: a.spouseWorks ? SPOUSE_HOURS_PER_WEEK : null,
    age: 30,
    spouseAge: a.married ? 30 : null,
    youDisabled: false,
    spouseDisabled: false,
    youStatus: "citizen",
    spouseStatus: "citizen",
    youYearsInUs: null,
    spouseYearsInUs: null,
    selfEmployed: false,
    savings: 0,
    getsSnap: true,
    getsTanf: true,
    getsMedicaid: true,
    getsWic: true,
    getsHeadStart: false,
    getsHousing: false,
    // Unlike Head Start and a housing voucher, the child-care subsidy is ON
    // for the sweep. Those default off because the personal door answers "what
    // happens to YOU", and assuming a rationed program a household may not
    // receive inflates their own numbers. The sweep answers a different
    // question — how rough are this state's rules — and its exit is the
    // largest cliff most parents of young children face, so a map that omits
    // it understates every state. The personal default stays off.
    getsChildcareSubsidy: everyParentWorks && a.subsidy !== false,
    // Energy assistance stays off for the sweep, like housing and Head Start:
    // the map shows where it stops (liheap.ts), not a benefit most eligible
    // households never receive.
    getsEnergyAssistance: false,
    heatInRent: false,
    hasEmployerCoverage: false,
    ssdiMonthly: 0,
    childSupportMonthly: 0,
    unemploymentMonthly: 0,
  };
}
