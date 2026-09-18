// The journalist surface's reading of summary.json: one row per state for a
// household and a measure, the four tile states, the five bins, and the
// order the ranking shows them in. Pure — no DOM, no fetch — so it is the
// part vitest covers directly (model.test.ts).
import { CHILDCARE_MAX_AGE, CLIFF_MIN, type StateCoverage, type StateMetrics, type SummaryJson, type UnmodeledProgram } from "@hotgap/core";
import { fill } from "../lib/copy.js";
import { bites as bitesHousehold, incompleteFor as incompleteForHousehold, unmodeledName, type CareHousehold } from "../lib/coverage.js";
import { money } from "../lib/format.js";
import { copy } from "./copy.js";
import { householdLabel } from "./words.js";

export type Archetype = SummaryJson["archetypes"][number];

export type MeasureKey = "keepRate" | "roadCliffCount" | "roadWorst"
  | "biggestLoss" | "dangerWidth" | "leap" | "safeExit" | "cliffCount" | "deferredCliffCount";

/**
 * The two questions the menu asks (Plan 9). `road` measures describe the
 * stretch from poverty to twice poverty, where the families the tool is for
 * actually are; `axis` measures describe the whole earnings axis, and name
 * the tallest wall wherever it stands. They are two questions, not a ranking
 * of one another, and the `<optgroup>` labels say which is which.
 */
export type MeasureGroup = "road" | "axis";

export interface Measure {
  key: MeasureKey;
  group: MeasureGroup;
  /** The figure's title ("…, by state") and the table caption's phrase. */
  title: string;
  /** The FilterRow option, which may say more than the title. */
  option: string;
  /** "$" dollars, "" a count, "¢" cents kept per extra dollar — the one measure with a meaningful zero. */
  unit: "$" | "" | "¢";
  describe: string;
  /**
   * Which end of the scale the ranking leads with. Every measure but the keep
   * rate counts a loss, so the largest figure is the worst; the keep rate is
   * what a family holds on to, so the SMALLEST — the most negative — is.
   */
  worst: "high" | "low";
}

/* The nine measures pipeline/src/metrics.ts writes, in the FilterRow's order:
   the road's three first, because the road is where the families are, then
   the six whole-axis measures unchanged. Their words are copy's, the cliff
   floor core's. A count has no unit; the keep rate is cents. */
const SPEC: readonly (Pick<Measure, "key" | "group" | "unit"> & Partial<Pick<Measure, "worst">>)[] = [
  { key: "keepRate", group: "road", unit: "¢", worst: "low" },
  { key: "roadCliffCount", group: "road", unit: "" },
  { key: "roadWorst", group: "road", unit: "$" },
  { key: "biggestLoss", group: "axis", unit: "$" },
  { key: "dangerWidth", group: "axis", unit: "$" },
  { key: "leap", group: "axis", unit: "$" },
  { key: "safeExit", group: "axis", unit: "$" },
  { key: "cliffCount", group: "axis", unit: "" },
  { key: "deferredCliffCount", group: "axis", unit: "" },
];
export const MEASURES: readonly Measure[] = SPEC.map(({ key, group, unit, worst }) => {
  const { title, option, describe } = copy.measures[key];
  return { key, group, unit, worst: worst ?? "high", title, option, describe: describe.includes("{floor}") ? fill(describe, { floor: money(CLIFF_MIN) }) : describe };
});

export const measureByKey = (key: string): Measure | undefined => MEASURES.find((m) => m.key === key);

/**
 * What a bare URL shows. The keep rate, because it is the question the page
 * exists to answer — of each extra dollar, what does a family climbing out of
 * poverty keep — and because the measure that used to lead named a cliff above
 * the median family's earnings in 39 states of 50 (Plan 9). Named here rather
 * than taken as MEASURES[0], so reordering the menu cannot move the default
 * every saved link resolves against.
 */
export const DEFAULT_MEASURE: MeasureKey = "keepRate";

/** The measures of one group, in the menu's order — the two `<optgroup>`s, and the two halves of the table. */
export const measuresIn = (group: MeasureGroup): Measure[] => MEASURES.filter((m) => m.group === group);

/**
 * The figure a measure reads off one cell. `roadWorst` is an object in the
 * file and the map plots its drop; everything else is the field itself. A
 * null is a figure the axis (or the road) does not bound — never a zero.
 */
export function valueOf(m: StateMetrics, key: MeasureKey): number | null {
  switch (key) {
    case "keepRate": return m.keepRate;
    case "roadCliffCount": return m.roadCliffCount;
    case "roadWorst": return m.roadWorst?.drop ?? 0;
    default: return m[key] as number | null;
  }
}

/* S10: the household list is the file's, labelled from `married`, `childAges`
   and the id — `-dual-` is the two-earner couple (core/src/archetypes.ts
   `spouseWorks`), and the earner count decides whether the household buys care. */
const worksBoth = (a: Archetype): boolean => a.id.includes("dual");

export const archLabel = (a: Archetype): string => householdLabel(a.married, worksBoth(a), a.childAges);

/* A missing child-care subsidy can only move a household that pays for care:
   a child of child-care age (through core's CHILDCARE_MAX_AGE — the sweep
   prices school-age care too) and every parent working (a single parent, or
   a dual-earner couple; the single-earner couple has a parent at home and no
   bill). The same test the pipeline uses to flag a state's subsidy as
   unmodeled (build.ts: the archetypes whose monthlyChildcare is > 0). */
export const paysForCare = (a: Archetype): boolean => a.childAges.some((age) => age <= CHILDCARE_MAX_AGE) && (!a.married || worksBoth(a));

/* IncompleteMarker (B1): keyed off coverage[state].unmodeled[], never a list
   kept here, under the one rule every surface reads (lib/coverage.ts) — the
   swept household's care bill is the archetype reading above. */
const careOf = (a: Archetype): CareHousehold => ({ childAges: a.childAges, paysForCare: paysForCare(a) });
export const bites = (u: UnmodeledProgram, a: Archetype): boolean => bitesHousehold(u, careOf(a));
export const incompleteFor = (cov: StateCoverage | undefined, a: Archetype): UnmodeledProgram[] => incompleteForHousehold(cov, careOf(a));

/* The four tile states, in precedence: incomplete (the figure is a floor,
   whatever it says), past (a null value — on a road measure, a road that runs
   off the axis — or the leap flagged as a lower bound on the two measures it
   bounds), none (no cliff to measure), shaded. */
export type TileKind = "shaded" | "none" | "past" | "incomplete";

export interface StateRow {
  st: string;
  m: StateMetrics;
  value: number | null;
  kind: TileKind;
  incomplete: UnmodeledProgram[];
}

/**
 * One row per state, in postal-code order, for this household and measure.
 * O(states).
 *
 * What is lifted out of the ranking depends on the measure's group. On the
 * whole axis, `cliffCount === 0` is the measurement of zero that must never be
 * shaded (B4). On the road, the same fact is `roadCliffCount === 0` — no cliff
 * between poverty and twice poverty — and a road that runs off this cell's
 * axis (`keepRate === null`) is the road group's "past the axis".
 *
 * The keep rate is the exception, and deliberately: it is a measurement for
 * every state whether or not a cliff falls on the road, so New Mexico's 30¢ is
 * a shaded, ranked, binned figure rather than a state lifted out of the scale.
 */
export function rowsFor(summary: SummaryJson, a: Archetype, measure: Measure): StateRow[] {
  const coverage = summary.coverage ?? {};
  const road = measure.group === "road";
  const bounded = measure.key === "leap" || measure.key === "safeExit";
  const rows: StateRow[] = [];
  for (const st of Object.keys(summary.states).sort()) {
    const m = summary.states[st][a.id];
    if (!m) continue; // a sweep that skipped this cell leaves a visible hole, never a fabricated row
    const value = valueOf(m, measure.key);
    const incomplete = incompleteFor(coverage[st], a);
    const zeroCliffs = road ? m.roadCliffCount === 0 : m.cliffCount === 0;
    const past = road ? m.keepRate === null : !zeroCliffs && (value === null || (bounded && m.leapIsLowerBound));
    const none = !past && measure.key !== "keepRate" && zeroCliffs;
    const kind: TileKind = incomplete.length ? "incomplete" : past ? "past" : none ? "none" : "shaded";
    rows.push({ st, m, value, kind, incomplete });
  }
  return rows;
}

export interface BinClass {
  /** The ramp step (0–4) this class is drawn with. */
  ramp: number;
  /** Which ramp: the plum loss ramp, or — on a diverging scale, above zero — the keep ramp. */
  hue: "loss" | "keep";
  lo: number;
  hi: number;
}

export interface Bins {
  lo: number;
  hi: number;
  /**
   * "steps": five equal-width steps of a dollar measure, labelled by their
   * bounds. "classes": runs of whole numbers, labelled by what each holds.
   * "diverging": equal-width steps either side of zero, zero a bin edge.
   */
  kind: "steps" | "classes" | "diverging";
  /** One entry per swatch on the scale, in scale order — lightest first, or most-losing first when the scale diverges. */
  classes: BinClass[];
  /** Which class (an index into `classes`) a comparable value falls in. */
  index: (v: number) => number;
  /** Where zero sits on the scale, 0–1, on a diverging scale only: the hinge the strip's bars start from. */
  zero?: number;
  /** The one step width both sides of a diverging scale are cut to (the outermost class is clipped to the observed end). */
  width?: number;
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
   two ends of any scale are the ramp's two ends (charts.md § 2).

   A measure with a MEANINGFUL ZERO diverges (charts.md § 2): see
   `divergingBins`. */
export function bins(values: number[], unit: Measure["unit"]): Bins {
  let lo = Infinity, hi = -Infinity;
  for (const v of values) { if (v < lo) lo = v; if (v > hi) hi = v; }
  if (!values.length) lo = hi = 0;
  if (unit === "¢") return divergingBins(lo, hi);
  if (unit === "$") {
    const step = (hi - lo) / 5;
    return {
      lo, hi, kind: "steps",
      classes: Array.from({ length: 5 }, (_, i) => ({ ramp: i, hue: "loss", lo: Math.round(lo + step * i), hi: Math.round(lo + step * (i + 1)) })),
      index: (v) => (step ? Math.min(4, Math.max(0, Math.floor((v - lo) / step))) : 0),
    };
  }
  const width = Math.max(1, Math.ceil((hi - lo + 1) / 5));
  const n = Math.ceil((hi - lo + 1) / width);
  const ramp = (i: number) => (n === 1 ? 0 : Math.round((i * 4) / (n - 1)));
  return {
    lo, hi, kind: "classes",
    classes: Array.from({ length: n }, (_, i) => ({ ramp: ramp(i), hue: "loss", lo: lo + i * width, hi: Math.min(hi, lo + (i + 1) * width - 1) })),
    index: (v) => Math.min(n - 1, Math.max(0, Math.floor((v - lo) / width))),
  };
}

/** Rounding slack, so a width that divides its side exactly does not buy a sliver of a class. */
const EPS = 1e-9;

/**
 * The diverging scale, for a measure whose zero means something — on this page
 * only the keep rate, where zero is the line between a family that ends a
 * raise poorer and one that keeps a little of it (charts.md § 2).
 *
 * Three properties, in this order:
 *
 * 1. **Zero is always a bin edge.** The span is stretched to include zero
 *    (`min(lo, 0)` to `max(hi, 0)`), so a scale whose states all keep starts
 *    at zero rather than at the lowest state — the one place this page bins
 *    from zero rather than over the observed range, because here zero is the
 *    fact the reader is looking for and not an empty corner of the scale.
 * 2. **One width, both sides.** A class's depth means the same distance from
 *    zero whichever ramp it is on, so 35¢ lost and 35¢ kept are the same step
 *    of their ramps and a reader can compare across the hinge.
 * 3. **Five swatches at most** (charts.md § 2). The width is the longer side
 *    divided by as many classes as fit: the most that side can take while the
 *    shorter side's classes still leave five or fewer in total.
 *
 * Below zero the classes are the plum loss ramp, above it the keep ramp, each
 * lightest next to zero and deepest at its end. A side with one class alone
 * takes the ramp's middle step rather than its lightest, or "keeps something"
 * would be drawn in the palest tint the ramp has.
 */
export function divergingBins(loValue: number, hiValue: number): Bins {
  const lo = Math.min(loValue, 0), hi = Math.max(hiValue, 0);
  const down = -lo, up = hi;
  const long = Math.max(down, up), short = Math.min(down, up);
  let width = long || 1;
  for (let k = 5; k >= 1; k--) {
    const w = long / k;
    if (w > 0 && k + Math.ceil(short / w - EPS) <= 5) { width = w; break; }
  }
  const nDown = Math.ceil(down / width - EPS), nUp = Math.ceil(up / width - EPS);
  /* Spread over the ramp so the two ends of a side are the ramp's two ends
     (charts.md § 2); `i` counts outward from zero, so the lightest step is
     always the one against the hinge. */
  const ramp = (i: number, n: number) => (n === 1 ? 2 : Math.round((i * 4) / (n - 1)));
  const classes: BinClass[] = [];
  for (let i = nDown - 1; i >= 0; i--) classes.push({ ramp: ramp(i, nDown), hue: "loss", lo: Math.max(lo, -(i + 1) * width), hi: i ? -i * width : 0 });
  for (let i = 0; i < nUp; i++) classes.push({ ramp: ramp(i, nUp), hue: "keep", lo: i * width, hi: Math.min(hi, (i + 1) * width) });
  if (!classes.length) classes.push({ ramp: 2, hue: "keep", lo: 0, hi: 0 });
  /* A value at a boundary falls in the class NEARER zero, on either side, so
     the hinge itself belongs to no loss class: zero keeps nothing and loses
     nothing, and it is drawn on the keep ramp's first step where one exists. */
  const at = (v: number) => (v < 0
    ? nDown - (Math.ceil(-v / width - EPS) || 1)
    : v === 0 ? nDown : nDown + Math.ceil(v / width - EPS) - 1);
  return {
    lo, hi, kind: "diverging", classes,
    index: (v) => Math.min(classes.length - 1, Math.max(0, at(v))),
    zero: (hi - lo ? -lo / (hi - lo) : 0) || 0,
    width,
  };
}

export interface Grouped {
  /** Shaded rows, worst first — the ranking. Largest value, or smallest where the measure's worst end is the low one (the keep rate). */
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
  /* Rank 1 is the worst state, which on the keep rate is the lowest figure:
     a state that takes back more than the raise is more regressive than one
     that takes back less, and the ranking leads with it. */
  const sign = measure.worst === "low" ? -1 : 1;
  const ranked = shaded.slice().sort((a, z) => sign * ((z.value as number) - (a.value as number)));
  const past = measure.key === "leap" ? by("past").sort((a, z) => (z.value as number) - (a.value as number)) : by("past");
  return {
    ranked, past, none, incomplete,
    bins: bins(shaded.map((r) => r.value as number), measure.unit),
    programs: [...new Set(incomplete.flatMap((r) => r.incomplete.map(unmodeledName)))],
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
