// A what-if is the same household with one answer changed: the base flags
// plus a diff — the flags that differ, with null for an answer the what-if
// removes. The diff is what the URL carries (url.ts) and what the compare
// column is named after; the what-if's own flags are always rebuilt from
// the base, so changing the base re-asks every what-if of the new one.
import { HOUSEHOLD_FLAGS, PAY_UNITS, type HouseholdFlagName, type HouseholdFlags, type PayUnit } from "@hotgap/core";
import { copy } from "../editor/copy.js";
import { money, unitPhrase } from "../lib/format.js";

/** The answers a what-if changes; null removes the base's answer (a toggle off, a figure cleared). */
export type Diff = { [K in HouseholdFlagName]?: HouseholdFlags[K] | null };

const FLAG_NAMES = Object.keys(HOUSEHOLD_FLAGS) as HouseholdFlagName[];

/** What `next` changed from `base`, flag by flag. O(flags). */
export function diffFlags(base: HouseholdFlags, next: HouseholdFlags): Diff {
  const d: Diff = {};
  for (const f of FLAG_NAMES) {
    if (base[f] === next[f]) continue;
    (d as Record<string, unknown>)[f] = next[f] ?? null;
  }
  return d;
}

export function applyDiff(base: HouseholdFlags, diff: Diff): HouseholdFlags {
  const out: HouseholdFlags = { ...base };
  for (const [f, v] of Object.entries(diff) as [HouseholdFlagName, string | boolean | null][]) {
    if (v === null || v === false) delete out[f];
    else (out as Record<string, string | boolean>)[f] = v;
  }
  return out;
}

export const sameDiff = (a: Diff, b: Diff): boolean => {
  const ka = Object.keys(a).sort(), kb = Object.keys(b).sort();
  return ka.length === kb.length && ka.every((k, i) => k === kb[i] && a[k as HouseholdFlagName] === b[k as HouseholdFlagName]);
};

/* The caseworker register for a changed answer (design/inventory.md M3
   names; the citizen chip labels live in editor/copy.ts). A take-up flag
   reads "{name} on/off"; an inverted one ("no-snap") reads the program. */
const TOGGLE: Partial<Record<HouseholdFlagName, string>> = {
  "childcare-subsidy": "CCDF subsidy", "head-start": "Head Start", housing: "Housing voucher", "employer-coverage": "Employer coverage",
  "self-employed": "Self-employed", disabled: "Disabled", "spouse-disabled": "Spouse disabled",
};
const INVERTED: Partial<Record<HouseholdFlagName, string>> = { "no-snap": "SNAP", "no-tanf": "TANF", "no-medicaid": "Medicaid", "no-wic": "WIC" };
const VALUE: Partial<Record<HouseholdFlagName, string>> = {
  zip: "ZIP", state: "State", county: "County", age: "Age", "spouse-age": "Spouse's age", kids: "Children", "kids-disabled": "Kids with a disability",
  rent: "Rent", childcare: "Child care", earnings: "Earnings", pay: "Pay", unit: "Pay unit", hours: "Hours a week", "spouse-earnings": "Spouse's pay",
  ssdi: "SSDI", "child-support": "Child support", unemployment: "Unemployment pay", savings: "Savings", status: "Status", "spouse-status": "Spouse's status",
  "years-in-us": "Years in the US", "spouse-years-in-us": "Spouse's years in the US",
};
const MONTHLY = new Set<HouseholdFlagName>(["rent", "childcare", "ssdi", "child-support", "unemployment"]);
const YEARLY = new Set<HouseholdFlagName>(["earnings", "spouse-earnings", "savings"]);

/** A what-if's name from its diff, against the flags it was applied to: "CCDF subsidy on", "Pay $55,000 a year", "Married". */
export function whatIfLabel(diff: Diff, flags: HouseholdFlags): string {
  const parts: string[] = [];
  /* The screen swaps a ZIP for a state (or back): one move, one part. */
  const moved = diff.state ?? diff.zip;
  if (moved) parts.push(`Place ${moved.toUpperCase()}`);
  for (const [f, v] of Object.entries(diff) as [HouseholdFlagName, string | boolean | null][]) {
    if (f === "zip" || f === "state") { if (!moved) parts.push(`${VALUE[f]} cleared`); continue; }
    if (f === "married") { parts.push(v === true ? "Married" : "Single"); continue; }
    if (TOGGLE[f]) { parts.push(`${TOGGLE[f]} ${v === true ? "on" : "off"}`); continue; }
    if (INVERTED[f]) { parts.push(`${INVERTED[f]} ${v === true ? "off" : "on"}`); continue; }
    const label = VALUE[f] ?? f;
    if (v === null || v === false) { parts.push(`${label} cleared`); continue; }
    const s = String(v);
    if (f === "pay") {
      const unit = (PAY_UNITS as readonly string[]).includes(flags.unit ?? "") ? (flags.unit as PayUnit) : "hour";
      parts.push(`Pay ${unit === "hour" ? `$${Number(s).toFixed(2)}` : money(Number(s))} ${unitPhrase(unit)}`);
    } else if (MONTHLY.has(f)) parts.push(`${label} ${money(Number(s))} a month`);
    else if (YEARLY.has(f)) parts.push(`${label} ${money(Number(s))}${f === "savings" ? "" : " a year"}`);
    else if (f === "kids") parts.push(`Children ${s.split(",").join(" & ")}`);
    else if (f === "status" || f === "spouse-status") parts.push(`${label} ${copy.status[s] ?? s}`);
    else parts.push(`${label} ${s}`);
  }
  return parts.join(", ");
}
