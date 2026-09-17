// The household as a flat set of flags — the vocabulary the CLI's `--flags`
// and the site's URL query share, so `hotgap curve --zip 94110 --kids 3,7
// --pay 30000 --unit year` and `/?zip=94110&kids=3,7&pay=30000&unit=year`
// are the same household by construction. rawAnswersFromFlags turns either
// into the object validateAnswers judges; nothing here validates.
import { toAnnual, type PayUnit } from "./income.js";

/**
 * Every household flag, with its shape. A boolean flag is present-or-absent;
 * everything else arrives as its raw string. The CLI adds its own
 * (--offline, --json, --help) on top; a page adds none.
 */
export const HOUSEHOLD_FLAGS = {
  state: { type: "string" }, zip: { type: "string" }, county: { type: "string" },
  age: { type: "string" }, married: { type: "boolean" }, "spouse-age": { type: "string" },
  kids: { type: "string" }, "kids-disabled": { type: "string" },
  disabled: { type: "boolean" }, "spouse-disabled": { type: "boolean" },
  rent: { type: "string" }, childcare: { type: "string" },
  earnings: { type: "string" }, pay: { type: "string" }, unit: { type: "string" }, hours: { type: "string" },
  "spouse-earnings": { type: "string" }, ssdi: { type: "string" },
  "child-support": { type: "string" }, unemployment: { type: "string" },
  "head-start": { type: "boolean" }, housing: { type: "boolean" },
  "childcare-subsidy": { type: "boolean" },
  "energy-assistance": { type: "boolean" }, "heat-in-rent": { type: "boolean" },
  "self-employed": { type: "boolean" }, savings: { type: "string" },
  status: { type: "string" }, "spouse-status": { type: "string" },
  "years-in-us": { type: "string" }, "spouse-years-in-us": { type: "string" },
  "no-snap": { type: "boolean" }, "no-tanf": { type: "boolean" }, "no-medicaid": { type: "boolean" }, "no-wic": { type: "boolean" },
  "employer-coverage": { type: "boolean" },
} as const;

export type HouseholdFlagName = keyof typeof HOUSEHOLD_FLAGS;

/** A flag set: booleans present-or-absent, everything else its raw string. */
export type HouseholdFlags = {
  [K in HouseholdFlagName]?: (typeof HOUSEHOLD_FLAGS)[K]["type"] extends "boolean" ? boolean : string;
};

const num = (v: string | undefined): number | undefined => (v === undefined || v === "" ? undefined : Number(v));
/** A comma list flag ("3,7") as its items; empty when absent. */
export const flagList = (v: string | undefined): string[] => (v ? v.split(",").map((s) => s.trim()).filter(Boolean) : []);

/**
 * The raw answers a flag set describes — validateAnswers' input, `zip`
 * passed through for it to resolve. `--pay`/`--unit`/`--hours` annualize
 * here (unit defaults to hour, hours to full time); `--earnings` is already
 * annual. Nothing is checked: a missing pay or a bad unit reaches
 * validateAnswers as a missing `annualEarnings`.
 */
export function rawAnswersFromFlags(f: HouseholdFlags): Record<string, unknown> {
  const childAges = flagList(f.kids).map(Number);
  const disabled = flagList(f["kids-disabled"]);
  const annualEarnings = f.pay !== undefined
    ? toAnnual({ amount: Number(f.pay), unit: (f.unit ?? "hour") as PayUnit, hoursPerWeek: num(f.hours) })
    : num(f.earnings);
  return {
    zip: f.zip,
    state: f.state?.toUpperCase(),
    countyFips: f.county ?? null,
    married: f.married === true,
    age: num(f.age) ?? 30,
    spouseAge: f.married === true ? num(f["spouse-age"]) ?? 30 : null,
    childAges,
    youDisabled: f.disabled === true,
    spouseDisabled: f["spouse-disabled"] === true,
    childDisabled: disabled.length ? disabled.map((x) => x === "1") : childAges.map(() => false),
    monthlyRent: num(f.rent) ?? null,
    monthlyChildcare: num(f.childcare) ?? null,
    annualEarnings,
    spouseAnnualEarnings: num(f["spouse-earnings"]) ?? 0,
    // --hours does double duty: it converts an hourly --pay above, and it is
    // also the household's own weekly hours, which PolicyEngine's
    // Massachusetts dependent-care deduction scales by.
    hoursPerWeek: num(f.hours) ?? null,
    ssdiMonthly: num(f.ssdi) ?? 0,
    childSupportMonthly: num(f["child-support"]) ?? 0,
    unemploymentMonthly: num(f.unemployment) ?? 0,
    getsHeadStart: f["head-start"] === true,
    getsHousing: f.housing === true,
    getsChildcareSubsidy: f["childcare-subsidy"] === true,
    getsEnergyAssistance: f["energy-assistance"] === true,
    heatInRent: f["heat-in-rent"] === true,
    hasEmployerCoverage: f["employer-coverage"] === true,
    selfEmployed: f["self-employed"] === true,
    savings: num(f.savings) ?? 0,
    youStatus: f.status ?? "citizen",
    spouseStatus: f["spouse-status"] ?? "citizen",
    youYearsInUs: num(f["years-in-us"]) ?? null,
    spouseYearsInUs: num(f["spouse-years-in-us"]) ?? null,
    getsSnap: f["no-snap"] !== true,
    getsTanf: f["no-tanf"] !== true,
    getsMedicaid: f["no-medicaid"] !== true,
    getsWic: f["no-wic"] !== true,
  };
}

/**
 * A URL query as flags: a boolean flag is true when present with any value
 * but "0" or "false" (so `?married` and `?married=1` both marry), a string
 * flag is its value, and keys that are not household flags are ignored.
 */
export function flagsFromSearchParams(params: URLSearchParams): HouseholdFlags {
  const flags: Record<string, string | boolean> = {};
  for (const [name, { type }] of Object.entries(HOUSEHOLD_FLAGS)) {
    const value = params.get(name);
    if (value === null) continue;
    if (type === "boolean") {
      if (value !== "0" && value !== "false") flags[name] = true;
    } else if (value !== "") {
      flags[name] = value;
    }
  }
  return flags as HouseholdFlags;
}

/** The inverse: a false boolean or an empty string is left out, so the query carries only what was said. */
export function searchParamsFromFlags(flags: HouseholdFlags): URLSearchParams {
  const params = new URLSearchParams();
  for (const name of Object.keys(HOUSEHOLD_FLAGS) as HouseholdFlagName[]) {
    const value = flags[name];
    if (value === true) params.set(name, "1");
    else if (typeof value === "string" && value !== "") params.set(name, value);
  }
  return params;
}
