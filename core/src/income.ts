export type PayUnit = "hour" | "week" | "month" | "year";
export const PAY_UNITS: readonly PayUnit[] = ["hour", "week", "month", "year"];
export interface Pay { amount: number; unit: PayUnit; hoursPerWeek?: number }

/** Full-time: what an hourly wage is annualized over, and what an earner is assumed to work when unasked. */
export const DEFAULT_HOURS = 40;

export function toAnnual(pay: Pay): number {
  switch (pay.unit) {
    case "hour": return pay.amount * (pay.hoursPerWeek ?? DEFAULT_HOURS) * 52;
    case "week": return pay.amount * 52;
    case "month": return pay.amount * 12;
    case "year": return pay.amount;
  }
}

export function fromAnnual(annual: number, unit: PayUnit, hoursPerWeek = DEFAULT_HOURS): number {
  switch (unit) {
    case "hour": return annual / (hoursPerWeek * 52);
    case "week": return annual / 52;
    case "month": return annual / 12;
    case "year": return annual;
  }
}
