import { STATE_MIN_WAGE } from "./states.js";

// Standard full-time work year: 40 hours × 52 weeks. Minimum wage is used ONLY
// to contextualize where a cliff falls in real-world terms — never as a model
// input, and never to filter or dim a cliff.
export const FULL_TIME_HOURS_PER_YEAR = 2080;

/** The state's July-2026 minimum wage in $/hour, or null when we don't have it. */
export function minWageFor(state: string): number | null {
  return STATE_MIN_WAGE[state] ?? null;
}

/** Annual earnings from full-time (2,080-hour) work at a given hourly wage. */
export function fullTimeEarningsAt(wage: number): number {
  return wage * FULL_TIME_HOURS_PER_YEAR;
}

/** Hours per week needed to earn `annualEarnings` at `wage` $/hour. */
export function hoursPerWeekAt(annualEarnings: number, wage: number): number {
  return annualEarnings / wage / 52;
}

export interface MinWageContext {
  wage: number;
  fullTimeEarnings: number;
  // Whole hours a week at minimum wage that `annualDollars` represents, or
  // null when it exceeds full-time minimum-wage earnings (the hours would top
  // a 40-hour week, so "N hours a week" stops being a meaningful framing).
  hoursPerWeek: number | null;
}

/** Real-world framing for a dollar amount on the earnings axis, or null for an unknown state. */
export function minWageContext(state: string, annualDollars: number): MinWageContext | null {
  const wage = minWageFor(state);
  if (wage === null) return null;
  const fullTimeEarnings = fullTimeEarningsAt(wage);
  const hoursPerWeek = annualDollars > fullTimeEarnings ? null : Math.max(1, Math.round(hoursPerWeekAt(annualDollars, wage)));
  return { wage, fullTimeEarnings, hoursPerWeek };
}
