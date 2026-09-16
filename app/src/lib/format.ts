// Money and pay figures in the citizen register (design/inventory.md M5, W6):
// every pay figure in the unit the person gave, rounded to a step that
// unit is spoken in, and said as a phrase. Shared by the editor's chips and
// any surface that quotes a pay figure.
import { DEFAULT_HOURS, fromAnnual, type PayUnit } from "@hotgap/core";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const usdCents = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });

/** Whole dollars, "$1,234". */
export const money = (n: number): string => usd.format(Math.round(n));

/** The step each unit is spoken in: $0.25 an hour, $10 a week, $50 a month, $500 a year. */
const STEP: Record<PayUnit, number> = { hour: 0.25, week: 10, month: 50, year: 500 };
const PHRASE: Record<PayUnit, string> = { hour: "an hour", week: "a week", month: "a month", year: "a year" };

/** "an hour", "a week", "a month", "a year". */
export const unitPhrase = (unit: PayUnit): string => PHRASE[unit];

/** An annual figure in the person's own unit, rounded to that unit's step: "$14.50 an hour", "$30,000 a year". */
export function payPhrase(annual: number, unit: PayUnit, hoursPerWeek: number = DEFAULT_HOURS): string {
  const inUnit = fromAnnual(annual, unit, hoursPerWeek);
  const rounded = Math.round(inUnit / STEP[unit]) * STEP[unit];
  return `${unit === "hour" ? usdCents.format(rounded) : usd.format(rounded)} ${PHRASE[unit]}`;
}
