export type PayUnit = "hour" | "month" | "year";
export interface Pay { amount: number; unit: PayUnit; hoursPerWeek?: number }

const DEFAULT_HOURS = 40;

export function toAnnual(pay: Pay): number {
  switch (pay.unit) {
    case "hour": return pay.amount * (pay.hoursPerWeek ?? DEFAULT_HOURS) * 52;
    case "month": return pay.amount * 12;
    case "year": return pay.amount;
  }
}

export function fromAnnual(annual: number, unit: PayUnit, hoursPerWeek = DEFAULT_HOURS): number {
  switch (unit) {
    case "hour": return annual / (hoursPerWeek * 52);
    case "month": return annual / 12;
    case "year": return annual;
  }
}

export function roundTo(n: number, step: number): number {
  return Math.round(n / step) * step;
}
