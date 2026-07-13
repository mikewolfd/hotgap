import type { PayUnit } from "./types.js";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const DEFAULT_HOURS = 40;

const roundTo = (n: number, step: number) => Math.round(n / step) * step;

/** Convert a yearly amount into a display unit (per hour / month / year). */
export function fromAnnual(annual: number, unit: PayUnit, hoursPerWeek = DEFAULT_HOURS): number {
  if (unit === "hour") return annual / (hoursPerWeek * 52);
  if (unit === "month") return annual / 12;
  return annual;
}

/** Convert a display-unit amount back into a yearly amount (exact inverse). */
export function toAnnual(amount: number, unit: PayUnit, hoursPerWeek = DEFAULT_HOURS): number {
  if (unit === "hour") return amount * hoursPerWeek * 52;
  if (unit === "month") return amount * 12;
  return amount;
}

/** A whole-dollar amount, rounded to the nearest $100 (e.g. "$4,200"). */
export function formatDollars(n: number): string {
  return money.format(roundTo(n, 100));
}

/** Yearly pay shown in a chosen unit (e.g. "$14.50 an hour", "$30,000 a year"). */
export function formatWage(annual: number, unit: PayUnit, hoursPerWeek = DEFAULT_HOURS): string {
  switch (unit) {
    case "hour": {
      const w = roundTo(annual / (hoursPerWeek * 52), 0.25);
      const s = Number.isInteger(w) ? money.format(w) : `$${w.toFixed(2)}`;
      return `${s} an hour`;
    }
    case "month":
      return `${money.format(roundTo(annual / 12, 50))} a month`;
    case "year":
      return `${money.format(roundTo(annual, 500))} a year`;
  }
}
