// A what-if is the same household with one answer changed: the base flags
// plus a diff — the flags that differ, with null for an answer the what-if
// removes. The diff is what the URL carries (url.ts) and what the compare
// column is named after; the what-if's own flags are always rebuilt from
// the base, so changing the base re-asks every what-if of the new one.
import { HOUSEHOLD_FLAGS, PAY_UNITS, type HouseholdFlagName, type HouseholdFlags, type PayUnit } from "@hotgap/core";
import { copy as citizen } from "../editor/copy.js";
import { copy } from "./copy.js";

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

/* One name per control (review S1): a what-if column is named by the chip
   it came from, so the chip, the note and the column agree. */
type ChipKey = keyof typeof copy.editor.chips;
const CHIP_OF: Partial<Record<HouseholdFlagName, ChipKey>> = {
  zip: "where", state: "where", county: "where", kids: "household", "kids-disabled": "kidsDisabled",
  age: "age", "spouse-age": "spouseAge", "spouse-earnings": "spousePay", rent: "rent", childcare: "childcare",
  ssdi: "ssdi", "child-support": "childSupport", unemployment: "unemployment", savings: "savings",
  status: "status", "spouse-status": "spouseStatus",
  "childcare-subsidy": "childcareSubsidy", "head-start": "headStart", housing: "housing", "employer-coverage": "employerCoverage",
  "self-employed": "selfEmployed", disabled: "disabled", "spouse-disabled": "spouseDisabled",
  "no-snap": "snap", "no-tanf": "tanf", "no-medicaid": "medicaid", "no-wic": "wic",
};
const TOGGLES = new Set<HouseholdFlagName>(["childcare-subsidy", "head-start", "housing", "employer-coverage", "self-employed", "disabled", "spouse-disabled"]);
const INVERTED = new Set<HouseholdFlagName>(["no-snap", "no-tanf", "no-medicaid", "no-wic"]);
const MONTHLY = new Set<HouseholdFlagName>(["rent", "childcare", "ssdi", "child-support", "unemployment"]);
const YEARLY = new Set<HouseholdFlagName>(["earnings", "spouse-earnings"]);

/** The control's name for a flag: its chip's, else the copy's name for a dialog field. */
export const flagName = (f: HouseholdFlagName): string => {
  const key = CHIP_OF[f];
  return (key ? copy.editor.chips[key] : undefined) ?? copy.whatIf.names[f] ?? f;
};

/** A what-if's name from its diff, against the flags it was applied to: "CCDF subsidy on", "Pay $55,000 a year", "Married". */
export function whatIfLabel(diff: Diff, flags: HouseholdFlags): string {
  const W = copy.whatIf, parts: string[] = [];
  /* The screen swaps a ZIP for a state (or back): one move, one part. */
  const moved = diff.state ?? diff.zip;
  if (moved) parts.push(W.place(moved.toUpperCase()));
  for (const [f, v] of Object.entries(diff) as [HouseholdFlagName, string | boolean | null][]) {
    if (f === "zip" || f === "state") { if (!moved) parts.push(W.cleared(flagName(f))); continue; }
    if (f === "married") { parts.push(v === true ? W.married : W.single); continue; }
    if (TOGGLES.has(f)) { parts.push(W.toggled(flagName(f), v === true)); continue; }
    if (INVERTED.has(f)) { parts.push(W.toggled(flagName(f), v !== true)); continue; }
    const label = flagName(f);
    if (v === null || v === false) { parts.push(W.cleared(label)); continue; }
    const s = String(v);
    if (f === "pay") {
      const unit = (PAY_UNITS as readonly string[]).includes(flags.unit ?? "") ? (flags.unit as PayUnit) : "hour";
      parts.push(W.payOf(Number(s), unit));
    } else if (MONTHLY.has(f)) parts.push(W.monthly(label, Number(s)));
    else if (YEARLY.has(f)) parts.push(W.yearly(label, Number(s)));
    else if (f === "savings") parts.push(W.figure(label, Number(s)));
    else if (f === "kids") parts.push(W.children(s.split(",")));
    else if (f === "status" || f === "spouse-status") parts.push(W.valued(label, citizen.status[s] ?? s));
    else parts.push(W.valued(label, s));
  }
  return parts.join(", ");
}
