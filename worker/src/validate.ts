import type { HouseholdAnswers } from "@hotgap/shared";

export const STATES = new Set([
  "AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM",
  "NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA",
  "WV","WI","WY",
]);

export type Validation = { ok: true; value: HouseholdAnswers } | { ok: false; detail: string };

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

const age16to110 = (v: unknown): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= 16 && v <= 110;

export function validateAnswers(input: unknown): Validation {
  if (typeof input !== "object" || input === null) return { ok: false, detail: "body must be an object" };
  const a = input as Record<string, unknown>;

  if (typeof a.state !== "string" || !STATES.has(a.state)) return { ok: false, detail: "state" };
  if (typeof a.married !== "boolean") return { ok: false, detail: "married" };
  if (!age16to110(a.age)) return { ok: false, detail: "age" };
  if (a.married && !age16to110(a.spouseAge)) return { ok: false, detail: "spouseAge" };
  if (!Array.isArray(a.childAges) || a.childAges.length > 6) return { ok: false, detail: "childAges" };
  if (a.childAges.some((x) => typeof x !== "number" || !Number.isInteger(x) || x < 0 || x > 17))
    return { ok: false, detail: "childAges" };
  if (typeof a.youDisabled !== "boolean") return { ok: false, detail: "youDisabled" };
  if (a.married && typeof a.spouseDisabled !== "boolean") return { ok: false, detail: "spouseDisabled" };
  // Old clients may not send childDisabled at all; default to all-false rather
  // than rejecting. If it IS present, it must line up 1:1 with childAges.
  const childAges = a.childAges as number[];
  const childDisabledRaw: unknown = a.childDisabled === undefined ? childAges.map(() => false) : a.childDisabled;
  if (!Array.isArray(childDisabledRaw) || childDisabledRaw.length !== childAges.length) {
    return { ok: false, detail: "childDisabled" };
  }
  if (childDisabledRaw.some((x) => typeof x !== "boolean")) return { ok: false, detail: "childDisabled" };
  const money = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;
  if (a.monthlyRent !== null && !money(a.monthlyRent)) return { ok: false, detail: "monthlyRent" };
  if (a.monthlyChildcare !== null && !money(a.monthlyChildcare)) return { ok: false, detail: "monthlyChildcare" };
  if (!money(a.annualEarnings)) return { ok: false, detail: "annualEarnings" };
  if (!money(a.spouseAnnualEarnings)) return { ok: false, detail: "spouseAnnualEarnings" };

  // Sort ages and their matching disabled flags together (as pairs) so the
  // permutation applied to childAges is mirrored onto childDisabled, then
  // split the sorted pairs back into two parallel arrays.
  const sortedPairs = childAges
    .map((age, i) => [age, childDisabledRaw[i] as boolean] as const)
    .sort(([x], [y]) => x - y);

  return {
    ok: true,
    value: {
      state: a.state,
      married: a.married,
      age: a.age as number,
      spouseAge: a.married ? (a.spouseAge as number) : null,
      childAges: sortedPairs.map(([age]) => age),
      youDisabled: a.youDisabled,
      spouseDisabled: a.married ? (a.spouseDisabled as boolean) : false,
      childDisabled: sortedPairs.map(([, disabled]) => disabled),
      monthlyRent: a.monthlyRent === null ? null : clamp(a.monthlyRent as number, 0, 10000),
      monthlyChildcare: a.monthlyChildcare === null ? null : clamp(a.monthlyChildcare as number, 0, 8000),
      annualEarnings: clamp(a.annualEarnings as number, 0, 500000),
      spouseAnnualEarnings: a.married ? clamp(a.spouseAnnualEarnings as number, 0, 500000) : 0,
      getsHeadStart: a.getsHeadStart === true,
      getsHousing: a.getsHousing === true,
      hasEmployerCoverage: a.hasEmployerCoverage === true,
      countyFips: typeof a.countyFips === "string" && /^\d{5}$/.test(a.countyFips) ? a.countyFips : null,
    },
  };
}
