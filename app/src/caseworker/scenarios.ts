// A what-if is the same household with one answer changed: the base flags
// plus a diff — the flags that differ, with null for an answer the what-if
// removes. The diff is what the URL carries (url.ts) and what the compare
// column is named after; the what-if's own flags are always rebuilt from
// the base, so changing the base re-asks every what-if of the new one.
import { HOUSEHOLD_FLAGS, PAY_UNITS, type HouseholdFlagName, type HouseholdFlags, type PayUnit } from "@hotgap/core";
import { copy as editorCopy } from "../editor/copy.js";
import { money as usd, payInUnit, shortList, unitFigure } from "../lib/format.js";
import { copy, t } from "./copy.js";

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
  "childcare-subsidy": "childcareSubsidy", "head-start": "headStart", housing: "housing", "energy-assistance": "energyAssistance", "heat-in-rent": "heatInRent", "employer-coverage": "employerCoverage",
  "self-employed": "selfEmployed", disabled: "disabled", "spouse-disabled": "spouseDisabled",
  "no-snap": "snap", "no-tanf": "tanf", "no-medicaid": "medicaid", "no-wic": "wic",
};
const TOGGLES = new Set<HouseholdFlagName>(["childcare-subsidy", "head-start", "housing", "energy-assistance", "heat-in-rent", "employer-coverage", "self-employed", "disabled", "spouse-disabled"]);
const INVERTED = new Set<HouseholdFlagName>(["no-snap", "no-tanf", "no-medicaid", "no-wic"]);
const MONTHLY = new Set<HouseholdFlagName>(["rent", "childcare", "ssdi", "child-support", "unemployment"]);
const YEARLY = new Set<HouseholdFlagName>(["earnings", "spouse-earnings"]);

/** The control's name for a flag: its chip's, else the copy's name for a dialog field. */
const flagName = (f: HouseholdFlagName): string => {
  const key = CHIP_OF[f];
  return (key ? copy.editor.chips[key] : undefined) ?? (copy.whatIf.names as Record<string, string>)[f] ?? f;
};

/**
 * The tag a what-if's line carries on the picture (design/charts.md § A
 * what-if is a second line): the answer that changed, in the fewest words
 * that name it — the pay itself for a pay what-if, otherwise the control's
 * own name, which is already the shortest name the office uses. A diff that
 * moved several answers is tagged by the first; the column's full name is in
 * the comparison and in the line's key entry, one press away.
 *
 * It is a tag, not the identity: the lines are told apart by their dashes
 * too, so a tag the collision rule has to drop costs a reader the name and
 * not the distinction.
 */
export function whatIfTag(diff: Diff, flags: HouseholdFlags): string {
  const W = copy.whatIf;
  const moved = diff.state ?? diff.zip;
  if (moved) return moved.toUpperCase();
  for (const [f, v] of Object.entries(diff) as [HouseholdFlagName, string | boolean | null][]) {
    if (f === "married") return v === true ? W.married : W.single;
    if (f === "pay" && v !== null && v !== false) {
      /* The figure alone, in the unit it was typed in: "a year" is three more characters on a picture
         whose whole x axis is pay, and the column's name says the unit in full. */
      const unit = (PAY_UNITS as readonly string[]).includes(flags.unit ?? "") ? (flags.unit as PayUnit) : "hour";
      return unitFigure(Number(v), unit);
    }
    return flagName(f);
  }
  return "";
}

/** A what-if's name from its diff, against the flags it was applied to: "CCDF subsidy on", "Pay $55,000 a year", "Married". */
export function whatIfLabel(diff: Diff, flags: HouseholdFlags): string {
  const W = copy.whatIf, parts: string[] = [];
  const toggled = (label: string, on: boolean) => t(`whatIf.toggled.${on ? "on" : "off"}`, { label });
  /* The screen swaps a ZIP for a state (or back): one move, one part. */
  const moved = diff.state ?? diff.zip;
  if (moved) parts.push(t("whatIf.place", { where: moved.toUpperCase() }));
  for (const [f, v] of Object.entries(diff) as [HouseholdFlagName, string | boolean | null][]) {
    if (f === "zip" || f === "state") { if (!moved) parts.push(t("whatIf.cleared", { label: flagName(f) })); continue; }
    if (f === "married") { parts.push(v === true ? W.married : W.single); continue; }
    if (TOGGLES.has(f)) { parts.push(toggled(flagName(f), v === true)); continue; }
    if (INVERTED.has(f)) { parts.push(toggled(flagName(f), v !== true)); continue; }
    const label = flagName(f);
    if (v === null || v === false) { parts.push(t("whatIf.cleared", { label })); continue; }
    const s = String(v);
    if (f === "pay") {
      const unit = (PAY_UNITS as readonly string[]).includes(flags.unit ?? "") ? (flags.unit as PayUnit) : "hour";
      parts.push(t("whatIf.pay", { pay: payInUnit(Number(s), unit) }));
    } else if (MONTHLY.has(f)) parts.push(t("whatIf.monthly", { label, amount: usd(Number(s)) }));
    else if (YEARLY.has(f)) parts.push(t("whatIf.yearly", { label, amount: usd(Number(s)) }));
    else if (f === "savings") parts.push(t("whatIf.figure", { label, amount: usd(Number(s)) }));
    else if (f === "kids") parts.push(t("whatIf.children", { ages: shortList(s.split(",")) }));
    else if (f === "status" || f === "spouse-status") parts.push(t("whatIf.valued", { label, value: (editorCopy.status as Record<string, string>)[s] ?? s }));
    else parts.push(t("whatIf.valued", { label, value: s }));
  }
  return parts.join(", ");
}
