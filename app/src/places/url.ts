// The view a journalist is looking at, as a query string, so a link lands on
// exactly it: ?household=<archetype id>&measure=<measure key>&sort=<"state"
// or a measure key>&state=<postal code>. Every key is written once anything changes,
// never only the ones that differ from a default — a default can move with
// the sweep, and a link to "the default household" would then move with it.
import { searchParamsFromFlags } from "@hotgap/core";
import { withLang } from "../lib/copy.js";
import { DEFAULT_MEASURE, measureByKey, type MeasureKey, type SortKey } from "./model.js";

export interface View {
  household: string;
  measure: MeasureKey;
  sort: SortKey;
  /** The open state, or null when none is selected. */
  state: string | null;
}

export interface ViewDomain {
  households: readonly string[];
  states: readonly string[];
  defaultHousehold: string;
}

/** Read a query string; anything unknown or missing falls back to the default rather than failing. */
export function parseView(search: string, d: ViewDomain): View {
  const q = new URLSearchParams(search);
  const household = q.get("household");
  const measureKey = q.get("measure");
  const sort = q.get("sort");
  const state = q.get("state");
  /* Every `?measure=` ever written still resolves: the six whole-axis keys are
     unchanged and the three road keys are new, so an old link lands on exactly
     the measure it named, and only a bare URL takes the new default. */
  const measure = measureKey && measureByKey(measureKey) ? (measureKey as MeasureKey) : DEFAULT_MEASURE;
  return {
    household: household && d.households.includes(household) ? household : d.defaultHousehold,
    measure,
    /* `sort=` is a measure key or "state" (N2); links written before the six
       orders existed said `sort=measure`, "this measure", and still land there. */
    sort: sort === "measure" ? measure : sort && measureByKey(sort) ? (sort as MeasureKey) : "state",
    state: state && d.states.includes(state) ? state : null,
  };
}

/** The query string for a view, always beginning with "?", the language carried. */
export function viewQuery(v: View): string {
  const q = new URLSearchParams({ household: v.household, measure: v.measure, sort: v.sort });
  if (v.state) q.set("state", v.state);
  return "?" + withLang(q).toString();
}

/**
 * The household tool for a state and a household's shape: the state, the
 * children's ages and, for a couple, `married` — core's own flag vocabulary
 * (`searchParamsFromFlags`), so the tool opens with those answers filled in
 * and asks for the rest. The language travels with it.
 */
export function tryItHref(state: string, household: { married: boolean; childAges: readonly number[] }): string {
  return `/?${withLang(searchParamsFromFlags({ state, kids: household.childAges.join(","), married: household.married }))}`;
}
