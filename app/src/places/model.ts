// The journalist surface's reading of summary.json: one row per state for a
// household and a measure, the four tile states, the five bins, and the
// order the ranking shows them in. Pure — no DOM, no fetch — so it is the
// part vitest covers directly (model.test.ts).
import { CHILDCARE_MAX_AGE, type StateCoverage, type StateMetrics, type SummaryJson, type UnmodeledProgram } from "@hotgap/core";
import { copy } from "./copy.js";

export type Archetype = SummaryJson["archetypes"][number];

export type MeasureKey = "biggestLoss" | "dangerWidth" | "leap" | "safeExit" | "cliffCount" | "deferredCliffCount";

export interface Measure {
  key: MeasureKey;
  /** The figure's title ("…, by state") and the table caption's phrase. */
  title: string;
  /** The FilterRow option, which may say more than the title. */
  option: string;
  unit: "$" | "";
  describe: string;
}

/* The six measures pipeline/src/metrics.ts writes, in the FilterRow's order; their words are copy's. A count has no unit. */
const COUNTS: ReadonlySet<MeasureKey> = new Set(["cliffCount", "deferredCliffCount"]);
export const MEASURES: readonly Measure[] = (Object.keys(copy.measures) as MeasureKey[]).map((key) => ({ key, unit: COUNTS.has(key) ? "" : "$", ...copy.measures[key] }));

export const measureByKey = (key: string): Measure | undefined => MEASURES.find((m) => m.key === key);

/* S10: the household list is the file's, labelled from `married`, `childAges`
   and the id — `-dual-` is the two-earner couple (core/src/archetypes.ts
   `spouseWorks`), and the earner count decides whether the household buys care. */
const worksBoth = (a: Archetype): boolean => a.id.includes("dual");

export const archLabel = (a: Archetype): string => copy.household(a.married, worksBoth(a), a.childAges);

/* A missing child-care subsidy can only move a household that pays for care:
   a child of child-care age (through core's CHILDCARE_MAX_AGE — the sweep
   prices school-age care too) and every parent working (a single parent, or
   a dual-earner couple; the single-earner couple has a parent at home and no
   bill). The same test the pipeline uses to flag a state's subsidy as
   unmodeled (build.ts: the archetypes whose monthlyChildcare is > 0). */
export const paysForCare = (a: Archetype): boolean => a.childAges.some((age) => age <= CHILDCARE_MAX_AGE) && (!a.married || worksBoth(a));

/* IncompleteMarker (B1): keyed off coverage[state].unmodeled[], never a list
   kept here. A gap every state shares (scope "all": LIHEAP) cannot make one
   state's figures a floor beside another's and is not a reason to hatch; the
   child-care entry (coverage.ts writes "Child-care subsidy (CCDF)") bites only
   a household that pays for care; a state premium program bites every one. */
export const bites = (u: UnmodeledProgram, a: Archetype): boolean =>
  u.scope !== "all" && (!/child.?care/i.test(u.program) || paysForCare(a));

export const incompleteFor = (cov: StateCoverage | undefined, a: Archetype): UnmodeledProgram[] =>
  (cov?.unmodeled ?? []).filter((u) => bites(u, a));

/* The four tile states, in precedence: incomplete (the figure is a floor,
   whatever it says), none (cliffCount === 0), past (a null value, or the leap
   flagged as a lower bound on the two measures it bounds), shaded. */
export type TileKind = "shaded" | "none" | "past" | "incomplete";

export interface StateRow {
  st: string;
  m: StateMetrics;
  value: number | null;
  kind: TileKind;
  incomplete: UnmodeledProgram[];
}

/** One row per state, in postal-code order, for this household and measure. O(states). */
export function rowsFor(summary: SummaryJson, a: Archetype, measure: Measure): StateRow[] {
  const coverage = summary.coverage ?? {};
  const bounded = measure.key === "leap" || measure.key === "safeExit";
  const rows: StateRow[] = [];
  for (const st of Object.keys(summary.states).sort()) {
    const m = summary.states[st][a.id];
    if (!m) continue; // a sweep that skipped this cell leaves a visible hole, never a fabricated row
    const value = m[measure.key];
    const incomplete = incompleteFor(coverage[st], a);
    const none = m.cliffCount === 0;
    const past = !none && (value === null || (bounded && m.leapIsLowerBound));
    const kind: TileKind = incomplete.length ? "incomplete" : none ? "none" : past ? "past" : "shaded";
    rows.push({ st, m, value, kind, incomplete });
  }
  return rows;
}

export interface BinClass {
  /** The ramp step (0–4) this class is drawn with. */
  ramp: number;
  lo: number;
  hi: number;
}

export interface Bins {
  lo: number;
  hi: number;
  /** "steps": five equal-width steps of a dollar measure, labelled by their bounds. "classes": runs of whole numbers, labelled by what each holds. */
  kind: "steps" | "classes";
  /** One entry per swatch on the scale, lightest first. */
  classes: BinClass[];
  /** The ramp step (0–4) a comparable value is drawn with. */
  index: (v: number) => number;
}

/* Bins across the OBSERVED range of the COMPARABLE states. Binning from 0
   would spend four of five bins on empty space for a measure whose floor is
   $53,000; binning over incomplete states would move the bounds using
   numbers that are known to be wrong; binning over a no-cliff state would
   put a measurement of zero at the bottom of a scale of losses (B4). Both
   bounds are always printed.

   A dollar measure takes five equal-width steps. A count takes classes of
   whole numbers (S5): five steps over a range of 0 to 1 printed the scale
   "0 0 0 1 1 1", which is not a sentence. The class width is the smallest
   whole number that fits the range in five classes or fewer, the classes
   that exist are the swatches, and they are spread over the ramp so the
   two ends of any scale are the ramp's two ends (charts.md § 2). */
export function bins(values: number[], unit: Measure["unit"]): Bins {
  let lo = Infinity, hi = -Infinity;
  for (const v of values) { if (v < lo) lo = v; if (v > hi) hi = v; }
  if (!values.length) lo = hi = 0;
  if (unit === "$") {
    const step = (hi - lo) / 5;
    return {
      lo, hi, kind: "steps",
      classes: Array.from({ length: 5 }, (_, i) => ({ ramp: i, lo: Math.round(lo + step * i), hi: Math.round(lo + step * (i + 1)) })),
      index: (v) => (step ? Math.min(4, Math.max(0, Math.floor((v - lo) / step))) : 0),
    };
  }
  const width = Math.max(1, Math.ceil((hi - lo + 1) / 5));
  const n = Math.ceil((hi - lo + 1) / width);
  const ramp = (i: number) => (n === 1 ? 0 : Math.round((i * 4) / (n - 1)));
  return {
    lo, hi, kind: "classes",
    classes: Array.from({ length: n }, (_, i) => ({ ramp: ramp(i), lo: lo + i * width, hi: Math.min(hi, lo + (i + 1) * width - 1) })),
    index: (v) => ramp(Math.min(n - 1, Math.max(0, Math.floor((v - lo) / width)))),
  };
}

export interface Grouped {
  /** Shaded rows, largest value first — the ranking. */
  ranked: StateRow[];
  /** Rows the axis bounds: they lead the ranking and share its top ranks (B1). On the leap, largest floor first; a safe exit past the axis has no floor, so postal order. */
  past: StateRow[];
  none: StateRow[];
  incomplete: StateRow[];
  bins: Bins;
  /** The programs that hatch a state on this view, from the data, for the legend and the prose. */
  programs: string[];
}

/** Split the rows into the ranking and the three lifted-out groups, and bin the comparable values. O(states log states). */
export function group(rows: StateRow[], measure: Measure): Grouped {
  const by = (kind: TileKind) => rows.filter((r) => r.kind === kind);
  const shaded = by("shaded"), none = by("none"), incomplete = by("incomplete");
  const ranked = shaded.slice().sort((a, z) => (z.value as number) - (a.value as number));
  const past = measure.key === "leap" ? by("past").sort((a, z) => (z.value as number) - (a.value as number)) : by("past");
  return {
    ranked, past, none, incomplete,
    bins: bins(shaded.map((r) => r.value as number), measure.unit),
    programs: [...new Set(incomplete.flatMap((r) => r.incomplete.map((u) => u.program)))],
  };
}

/** The table's order: postal code, or one measure's ranking. Carried in the URL as `sort=`. */
export type SortKey = "state" | MeasureKey;

/**
 * The table's rows in the order the control names (N2): postal code, or one
 * measure's own grouping — its lower-bound rows first (B1), then its ranking
 * largest-first, then the states with no cliff, then the incomplete ones.
 * The rows for the sort measure are recomputed here, because `past` depends
 * on the measure while `none` and `incomplete` do not. O(states log states).
 */
export function tableRows(summary: SummaryJson, a: Archetype, sort: SortKey): StateRow[] {
  const measure = sort === "state" ? MEASURES[0] : measureByKey(sort)!;
  const rows = rowsFor(summary, a, measure);
  if (sort === "state") return rows;
  const g = group(rows, measure);
  return [...g.past, ...g.ranked, ...g.none, ...g.incomplete];
}
