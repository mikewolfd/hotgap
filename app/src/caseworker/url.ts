// The comparison in the query string, so a counselor can send a colleague
// exactly it: the base household as the CLI's flags (app/README.md § URL
// state — `?zip=80903&kids=3,7&pay=38000&unit=year`), then one `whatif=`
// per what-if holding its diff as a mini query string
// (`whatif=pay%3D55000`, `whatif=childcare-subsidy%3D1`; an empty value
// removes the base's answer). Landing on it evaluates the base and every
// what-if.
import { flagsFromSearchParams, HOUSEHOLD_FLAGS, searchParamsFromFlags, type HouseholdFlagName, type HouseholdFlags } from "@hotgap/core";
import { withLang } from "../lib/copy.js";
import type { Diff } from "./scenarios.js";

const WHAT_IF = "whatif";

export interface PageState { base: HouseholdFlags; whatIfs: Diff[] }

/** One what-if's query value back into a diff; anything that is not a household flag is ignored, and an empty diff is dropped by the caller. */
export function parseDiff(value: string): Diff {
  const q = new URLSearchParams(value);
  const d: Diff = {};
  for (const [name, { type }] of Object.entries(HOUSEHOLD_FLAGS) as [HouseholdFlagName, { type: string }][]) {
    const v = q.get(name);
    if (v === null) continue;
    if (type === "boolean") (d as Record<string, unknown>)[name] = v !== "" && v !== "0" && v !== "false" ? true : null;
    else (d as Record<string, unknown>)[name] = v === "" ? null : v;
  }
  return d;
}

export function diffQuery(d: Diff): string {
  const q = new URLSearchParams();
  for (const [f, v] of Object.entries(d)) q.set(f, v === true ? "1" : v === null || v === false ? "" : String(v));
  return q.toString();
}

export function parsePage(search: string): PageState {
  const q = new URLSearchParams(search);
  return { base: flagsFromSearchParams(q), whatIfs: q.getAll(WHAT_IF).map(parseDiff).filter((d) => Object.keys(d).length > 0) };
}

/** The query for a page state, always beginning with "?", the language carried. */
export function pageQuery(s: PageState): string {
  const q = searchParamsFromFlags(s.base);
  for (const d of s.whatIfs) q.append(WHAT_IF, diffQuery(d));
  return `?${withLang(q).toString()}`;
}
