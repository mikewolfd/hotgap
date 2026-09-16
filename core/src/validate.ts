import { FIPS_TO_USPS, STATE_CODES } from "./states.js";
import { IMMIGRATION_STATUSES, type HouseholdAnswers, type ImmigrationStatus } from "./types.js";

const STATES = new Set(STATE_CODES);

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
  // Non-wage monthly income. Old clients send none of these, so `undefined`
  // means 0 rather than a rejection; anything else present must be real money.
  const monthly = (v: unknown): number | null =>
    v === undefined ? 0 : money(v) ? clamp(v, 0, 20000) : null;
  const ssdiMonthly = monthly(a.ssdiMonthly);
  const childSupportMonthly = monthly(a.childSupportMonthly);
  const unemploymentMonthly = monthly(a.unemploymentMonthly);
  if (ssdiMonthly === null) return { ok: false, detail: "ssdiMonthly" };
  if (childSupportMonthly === null) return { ok: false, detail: "childSupportMonthly" };
  if (unemploymentMonthly === null) return { ok: false, detail: "unemploymentMonthly" };
  // Hours a week actually worked. Optional — most callers never ask — but a
  // present value must be a whole workable week: PolicyEngine's Massachusetts
  // dependent-care deduction scales by it, so 0 and 100 are both wrong answers
  // rather than harmless ones.
  if (a.hoursPerWeek !== undefined && a.hoursPerWeek !== null &&
      !(typeof a.hoursPerWeek === "number" && Number.isInteger(a.hoursPerWeek) && a.hoursPerWeek >= 1 && a.hoursPerWeek <= 80)) {
    return { ok: false, detail: "hoursPerWeek" };
  }

  // Immigration status: citizen unless said otherwise; years in the US only
  // for a present, whole, plausible number.
  const status = (v: unknown, field: string): ImmigrationStatus | string =>
    v === undefined ? "citizen" : (IMMIGRATION_STATUSES as readonly unknown[]).includes(v) ? (v as ImmigrationStatus) : field;
  const youStatus = status(a.youStatus, "youStatus");
  const spouseStatus = a.married ? status(a.spouseStatus, "spouseStatus") : "citizen";
  if (!(IMMIGRATION_STATUSES as readonly string[]).includes(youStatus)) return { ok: false, detail: "youStatus" };
  if (!(IMMIGRATION_STATUSES as readonly string[]).includes(spouseStatus)) return { ok: false, detail: "spouseStatus" };
  const years = (v: unknown): number | null | false =>
    v === undefined || v === null ? null : typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 100 ? v : false;
  const youYearsInUs = years(a.youYearsInUs);
  const spouseYearsInUs = a.married ? years(a.spouseYearsInUs) : null;
  if (youYearsInUs === false) return { ok: false, detail: "youYearsInUs" };
  if (spouseYearsInUs === false) return { ok: false, detail: "spouseYearsInUs" };
  if (a.selfEmployed !== undefined && typeof a.selfEmployed !== "boolean") return { ok: false, detail: "selfEmployed" };
  if (a.savings !== undefined && !money(a.savings)) return { ok: false, detail: "savings" };
  for (const flag of ["getsSnap", "getsTanf", "getsMedicaid", "getsWic"] as const) {
    if (a[flag] !== undefined && typeof a[flag] !== "boolean") return { ok: false, detail: flag };
  }
  // A county FIPS starts with its state's two digits; a county in another
  // state would put PolicyEngine's ACA rating area in the wrong state.
  const countyFips = typeof a.countyFips === "string" && /^\d{5}$/.test(a.countyFips) ? a.countyFips : null;
  if (countyFips !== null && FIPS_TO_USPS[countyFips.slice(0, 2)] !== a.state) return { ok: false, detail: "countyFips" };

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
      youStatus: youStatus as ImmigrationStatus,
      spouseStatus: spouseStatus as ImmigrationStatus,
      youYearsInUs: youStatus === "citizen" ? null : youYearsInUs,
      spouseYearsInUs: spouseStatus === "citizen" ? null : spouseYearsInUs,
      childAges: sortedPairs.map(([age]) => age),
      youDisabled: a.youDisabled,
      spouseDisabled: a.married ? (a.spouseDisabled as boolean) : false,
      childDisabled: sortedPairs.map(([, disabled]) => disabled),
      monthlyRent: a.monthlyRent === null ? null : clamp(a.monthlyRent as number, 0, 10000),
      monthlyChildcare: a.monthlyChildcare === null ? null : clamp(a.monthlyChildcare as number, 0, 8000),
      annualEarnings: clamp(a.annualEarnings as number, 0, 500000),
      spouseAnnualEarnings: a.married ? clamp(a.spouseAnnualEarnings as number, 0, 500000) : 0,
      selfEmployed: a.selfEmployed === true,
      savings: a.savings === undefined ? 0 : clamp(a.savings as number, 0, 10_000_000),
      hoursPerWeek: (a.hoursPerWeek as number | null | undefined) ?? null,
      getsHeadStart: a.getsHeadStart === true,
      getsHousing: a.getsHousing === true,
      getsChildcareSubsidy: a.getsChildcareSubsidy === true,
      getsSnap: a.getsSnap !== false,
      getsTanf: a.getsTanf !== false,
      getsMedicaid: a.getsMedicaid !== false,
      getsWic: a.getsWic !== false,
      hasEmployerCoverage: a.hasEmployerCoverage === true,
      countyFips,
      ssdiMonthly,
      childSupportMonthly,
      unemploymentMonthly,
    },
  };
}
