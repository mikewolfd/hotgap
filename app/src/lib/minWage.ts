import { STATE_MIN_WAGE } from "./states.js";

// Standard full-time work year: 40 hours × 52 weeks. Minimum wage is used ONLY to
// contextualize where a cliff falls in real-world terms — never as a model input.
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

/** "$7.25" — hourly wage with cents, for the reference-line note copy. */
export function formatWagePerHour(wage: number): string {
  return `$${wage.toFixed(2)}`;
}
