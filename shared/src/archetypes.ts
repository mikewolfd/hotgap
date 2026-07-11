import type { HouseholdAnswers } from "./types.js";

export interface Archetype { id: string; married: boolean; childAges: number[] }

export const ARCHETYPES: Archetype[] = [
  { id: "single-0", married: false, childAges: [] },
  { id: "single-1", married: false, childAges: [3] },
  { id: "single-2", married: false, childAges: [3, 7] },   // default on the map
  { id: "single-3", married: false, childAges: [1, 4, 9] },
  { id: "married-0", married: true, childAges: [] },
  { id: "married-1", married: true, childAges: [3] },
  { id: "married-2", married: true, childAges: [3, 7] },
  { id: "married-3", married: true, childAges: [1, 4, 9] },
];

export const DEFAULT_ARCHETYPE = "single-2";

export function answersFor(state: string, a: Archetype): HouseholdAnswers {
  return {
    state,
    married: a.married,
    childAges: a.childAges,
    childDisabled: a.childAges.map(() => false),
    monthlyRent: null,
    monthlyChildcare: 0,
    annualEarnings: 0,          // the axis varies earnings; this only sets axisMax=100k
    spouseAnnualEarnings: 0,
    age: 30,
    spouseAge: a.married ? 30 : null,
    youDisabled: false,
    spouseDisabled: false,
  };
}
