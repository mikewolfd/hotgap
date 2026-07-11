import type { HouseholdAnswers } from "@hotgap/shared";

export const STATES = new Set([
  "AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM",
  "NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA",
  "WV","WI","WY",
]);

export type Validation = { ok: true; value: HouseholdAnswers } | { ok: false; detail: string };

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export function validateAnswers(input: unknown): Validation {
  if (typeof input !== "object" || input === null) return { ok: false, detail: "body must be an object" };
  const a = input as Record<string, unknown>;

  if (typeof a.state !== "string" || !STATES.has(a.state)) return { ok: false, detail: "state" };
  if (typeof a.married !== "boolean") return { ok: false, detail: "married" };
  if (!Array.isArray(a.childAges) || a.childAges.length > 6) return { ok: false, detail: "childAges" };
  if (a.childAges.some((x) => typeof x !== "number" || !Number.isInteger(x) || x < 0 || x > 17))
    return { ok: false, detail: "childAges" };
  const money = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;
  if (a.monthlyRent !== null && !money(a.monthlyRent)) return { ok: false, detail: "monthlyRent" };
  if (a.monthlyChildcare !== null && !money(a.monthlyChildcare)) return { ok: false, detail: "monthlyChildcare" };
  if (!money(a.annualEarnings)) return { ok: false, detail: "annualEarnings" };
  if (!money(a.spouseAnnualEarnings)) return { ok: false, detail: "spouseAnnualEarnings" };

  return {
    ok: true,
    value: {
      state: a.state,
      married: a.married,
      childAges: [...(a.childAges as number[])].sort((x, y) => x - y),
      monthlyRent: a.monthlyRent === null ? null : clamp(a.monthlyRent as number, 0, 10000),
      monthlyChildcare: a.monthlyChildcare === null ? null : clamp(a.monthlyChildcare as number, 0, 8000),
      annualEarnings: clamp(a.annualEarnings as number, 0, 500000),
      spouseAnnualEarnings: a.married ? clamp(a.spouseAnnualEarnings as number, 0, 500000) : 0,
    },
  };
}
