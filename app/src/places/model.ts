// The journalist surface's reading of summary.json: one row per state for a
// household and a measure, the four tile states, the five bins, and the
// order the ranking shows them in. Pure — no DOM, no fetch — so it is the
// part vitest covers directly (model.test.ts).
import { CHILDCARE_MAX_AGE, CLIFF_MIN, FEDERAL_MIN_WAGE_FULL_TIME_ANNUAL, isNoSubsidyTwin, reachAtEarnings, type StateCoverage, type StateMetrics, type SummaryJson, type UnmodeledProgram } from "@hotgap/core";
import { fill } from "../lib/copy.js";
import { bites as bitesHousehold, incompleteFor as incompleteForHousehold, unmodeledName, type CareHousehold } from "../lib/coverage.js";
import { money } from "../lib/format.js";
import { copy } from "./copy.js";
import { householdLabel } from "./words.js";

export type Archetype = SummaryJson["archetypes"][number];

export type MeasureKey = "keepRate" | "roadWorst" | "deepestFall" | "netAtRoadLo" | "netAtRoadHi"
  | "biggestLoss" | "dangerWidth" | "leap" | "safeExit";

/**
 * The measures that LEFT the menu (blind reviews R5, R6, 2026-09-26), and the
 * kept measure each one's old links now open on. The three counts rewarded the
 * sampling step rather than the state — a $1,000 grid counts $216 notches a
 * $2,000 one misses — and the deferred count ranked a cushion as a harm, so
 * none of them is shaded or ranked any more; all three stay as table columns
 * and in the CSV, where they describe a state. A `?measure=` or `?sort=`
 * written before that still lands on the nearest question the menu still
 * asks: the road's count on the road's worst loss, the two whole-curve counts
 * on the biggest loss at any pay.
 */
export type CountKey = "roadCliffCount" | "cliffCount" | "deferredCliffCount";
export const RETIRED_MEASURES: Readonly<Record<CountKey, MeasureKey>> = {
  roadCliffCount: "roadWorst",
  cliffCount: "biggestLoss",
  deferredCliffCount: "biggestLoss",
};

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
  /**
   * THE measure's name, and its only one (blind reviews R9/M6, 2026-09-26):
   * the menu option, the legend's title, the ranking's heading, the table's
   * column header and the phrase the readout and the answer use. The page
   * used to call one figure "Cents kept of each extra dollar" in the menu,
   * "Keep rate on the road out of poverty" in the legend and "Keep rate" in
   * the table, and a reader could not tell they were one thing.
   */
  name: string;
  /** The legend's plain cue — "darker = loses more" — beside the step widths (M16). */
  cue: string;
  /** "$" dollars, "¢" cents kept per extra dollar — the one measure with a meaningful zero. */
  unit: "$" | "¢";
  describe: string;
  /**
   * Which end of the scale the ranking leads with. Every measure but three
   * counts a loss, so the largest figure is the worst; the keep rate and the
   * two money-kept levels are what a family holds on to, so the SMALLEST is.
   */
  worst: "high" | "low";
}

/* The nine measures the menu offers, in its order: the road's five first,
   because the road is where the families are — the keep rate, the road's
   worst single loss, its deepest fall (R3: a figure with no top to sit on,
   so a wall a step either side of twice poverty reads the same), then the
   two LEVELS beside that slope (net income at each end of the road: a keep
   rate says raises add up, not how much the family has) — then the four
   whole-axis measures. The three counts the pipeline also writes are table
   columns, not measures (RETIRED_MEASURES). Their words are copy's; the
   keep rate is cents, everything else dollars. */
const SPEC: readonly (Pick<Measure, "key" | "group" | "unit"> & Partial<Pick<Measure, "worst">>)[] = [
  { key: "keepRate", group: "road", unit: "¢", worst: "low" },
  { key: "roadWorst", group: "road", unit: "$" },
  { key: "deepestFall", group: "road", unit: "$" },
  { key: "netAtRoadLo", group: "road", unit: "$", worst: "low" },
  { key: "netAtRoadHi", group: "road", unit: "$", worst: "low" },
  { key: "biggestLoss", group: "axis", unit: "$" },
  { key: "dangerWidth", group: "axis", unit: "$" },
  { key: "leap", group: "axis", unit: "$" },
  { key: "safeExit", group: "axis", unit: "$" },
];
/** The two levels: net income at each end of the road, the money the family has beside the rate it keeps at. */
export const isLevel = (key: MeasureKey): key is "netAtRoadLo" | "netAtRoadHi" => key === "netAtRoadLo" || key === "netAtRoadHi";

/* A measure's definition with its slots filled: on the keep rate the road's
   span, and on the two levels the end of the road they are read at — the
   generic words where no household is named yet (the level's "({lo})"
   dropped), its dollars once one is (`describeFor`). */
const describeWith = (key: MeasureKey, span: string, ends?: { lo: number; hi: number }): string => {
  const describe = copy.measures[key].describe;
  if (isLevel(key)) return ends ? fill(describe, key === "netAtRoadLo" ? { lo: money(ends.lo) } : { hi: money(ends.hi) }) : describe.replace(/\s*\(\{(lo|hi)\}\)/g, "");
  return describe.includes("{span}") ? fill(describe, { span }) : describe;
};
export const MEASURES: readonly Measure[] = SPEC.map(({ key, group, unit, worst }) => {
  const { name, cue } = copy.measures[key];
  return { key, group, unit, worst: worst ?? "high", name, cue, describe: describeWith(key, copy.measures.keepRate.span.plain) };
});

/**
 * The three pipeline counts that are table columns and CSV fields but not
 * measures (RETIRED_MEASURES): each column's one-sentence definition, the
 * cliff floor (core's) filled in.
 */
export const countDefinition = (key: CountKey): string =>
  fill((copy.table.defs as Record<string, string>)[key], key === "deferredCliffCount" ? {} : { floor: money(CLIFF_MIN) });

/** The value most of the rows share — the modal figure, ties to the one met first. */
export function modal(values: readonly number[]): number | null {
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best: number | null = null, n = 0;
  for (const [v, c] of counts) if (c > n) { best = v; n = c; }
  return best;
}

/**
 * The road's span for the household these rows are, in dollars (TASKS: name
 * the road's span in the measure): `roadLo` and `roadHi` read off the rows,
 * the modal pair, because Alaska and Hawaii are on their own higher poverty
 * guidelines and every other state shares one. Null where no row has a road.
 */
export function roadSpan(rows: readonly StateRow[]): { lo: number; hi: number; differs: boolean } | null {
  const withRoad = rows.filter((r) => r.m.roadLo !== null && r.m.roadHi !== null);
  const lo = modal(withRoad.map((r) => r.m.roadLo as number)), hi = modal(withRoad.map((r) => r.m.roadHi as number));
  if (lo === null || hi === null) return null;
  return { lo, hi, differs: withRoad.some((r) => r.m.roadLo !== lo || r.m.roadHi !== hi) };
}

/**
 * A measure's definition for the household the rows are: the keep rate names
 * its road in dollars — "from the poverty line ($27,000) to just past twice it
 * ($55,000)" — and says where the road is longer; every other measure's words
 * do not depend on the household and come back as they are.
 */
export function describeFor(measure: Measure, rows: readonly StateRow[], spousePay: number | null = null): string {
  /* On a two-earner row the road is set on family earnings but printed as this earner's pay (road.ts, R4): the
     second earner's fixed pay is on top of every figure, and the definition says so. */
  const dual = spousePay ? fill(copy.measures.keepRate.span.dual, { spouse: money(spousePay) }) : "";
  if (isLevel(measure.key)) {
    const ends = roadSpan(rows);
    return (ends === null ? measure.describe : describeWith(measure.key, "", ends)) + dual;
  }
  if (measure.key !== "keepRate") return measure.describe;
  const span = roadSpan(rows);
  const S = copy.measures.keepRate.span;
  return describeWith("keepRate", (span === null ? S.plain : fill(span.differs ? S.akHi : S.same, { lo: money(span.lo), hi: money(span.hi) })) + dual);
}

export const measureByKey = (key: string): Measure | undefined => MEASURES.find((m) => m.key === key);

/** A key from a link: a menu measure as itself, a retired one as the measure its links now open on (RETIRED_MEASURES), anything else undefined. */
export const resolveMeasure = (key: string | null): MeasureKey | undefined =>
  key === null ? undefined : measureByKey(key)?.key ?? (RETIRED_MEASURES as Readonly<Record<string, MeasureKey>>)[key];

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
    case "roadWorst": return m.roadWorst?.drop ?? 0;
    /* A summary written before these fields existed has none: null, a road with no figure, never a zero. */
    case "deepestFall": return m.deepestFall ?? null;
    case "netAtRoadLo": return m.netAtRoadLo ?? null;
    case "netAtRoadHi": return m.netAtRoadHi ?? null;
    default: return m[key];
  }
}

/**
 * The measures that are a figure for every state, cliff or no cliff: the keep
 * rate, the deepest fall (0 is a measured "never dipped") and the two levels.
 * They are never lifted out of the scale as "no cliff".
 */
const alwaysMeasured = (key: MeasureKey): boolean => key === "keepRate" || key === "deepestFall" || isLevel(key);

/* S10: the household list is the file's, labelled from `married`, `childAges`
   and the id — `-dual-` is the two-earner couple (core/src/archetypes.ts
   `spouseWorks`), and the earner count decides whether the household buys care. */
const worksBoth = (a: Archetype): boolean => a.id.includes("dual");
/* The `-nosub` twin (core's `isNoSubsidyTwin`): the same household with the child-care subsidy off, labelled as such. */
const noSubsidy = (a: Archetype): boolean => isNoSubsidyTwin(a);

/** The second earner's fixed pay on a two-earner row, which every road figure sits on top of; null where one adult earns. */
export const spousePayOf = (a: Archetype): number | null => (worksBoth(a) ? FEDERAL_MIN_WAGE_FULL_TIME_ANNUAL : null);

export const archLabel = (a: Archetype): string => householdLabel(a.married, worksBoth(a), a.childAges, noSubsidy(a));

/**
 * The Household menu's order: the file's, with each `-nosub` twin moved to
 * sit right after the household it is the twin of (R16), so "1 adult, 2
 * children (3 and 7), no child-care help" is read beside the family it
 * differs from in exactly one thing. O(households²), eleven of them.
 */
export function menuOrder(archetypes: readonly Archetype[]): Archetype[] {
  const twins = archetypes.filter(noSubsidy);
  return archetypes.filter((a) => !noSubsidy(a)).flatMap((a) => [a, ...twins.filter((tw) => tw.id === `${a.id}-nosub`)])
    .concat(twins.filter((tw) => !archetypes.some((a) => `${a.id}-nosub` === tw.id)));
}

/** A household's no-subsidy twin in this file, or null where the run carries none (every household but single-2 today). */
export const twinOf = (archetypes: readonly Archetype[], a: Archetype): Archetype | null =>
  archetypes.find((x) => x.id === `${a.id}-nosub`) ?? null;

/* A missing child-care subsidy can only move a household that pays for care:
   a child of child-care age (through core's CHILDCARE_MAX_AGE — the sweep
   prices school-age care too) and every parent working (a single parent, or
   a dual-earner couple; the single-earner couple has a parent at home and no
   bill). The same test the pipeline uses to flag a state's subsidy as
   unmodeled (build.ts: the archetypes whose monthlyChildcare is > 0). */
export const paysForCare = (a: Archetype): boolean => a.childAges.some((age) => age <= CHILDCARE_MAX_AGE) && (!a.married || worksBoth(a));

/**
 * POSITION: of families like this one in this state, the share (0–100)
 * earning less than a figure on the axis — the fact that says whether a cliff
 * is one anybody stands at (Plan 9). Cross-sectional: how many families
 * already earn less, never a family's odds of getting there.
 *
 * The lookup is core's (`reachAtEarnings`), including the part that is easy to
 * get wrong: the axis varies the householder's own pay while the ACS ladder's
 * yardstick is householder PLUS spouse, so the swept spouse's wages are added
 * back before the lookup. The archetype's spouse earns what core's own sweep
 * gives them — a federal minimum wage year on the two-earner rows, nothing on
 * the rest — and the summary's archetype record carries the earner count in
 * its id, which `worksBoth` reads.
 *
 * Null, never 0, where the page has not been handed `reach.json`, where the
 * PUMS cell is missing or suppressed, or where there is no figure to place.
 */
export const positionAt = (st: string, a: Archetype, earnings: number | null): number | null =>
  reachAtEarnings({ state: st, married: a.married, childAges: a.childAges, spouseAnnualEarnings: worksBoth(a) ? FEDERAL_MIN_WAGE_FULL_TIME_ANNUAL : 0 }, earnings);

/* IncompleteMarker (B1): keyed off coverage[state].unmodeled[], never a list
   kept here, under the one rule every surface reads (lib/coverage.ts) — the
   swept household's care bill is the archetype reading above. The child-care
   gap is a MISSING SUBSIDY, so the twin that claims none cannot be missing
   it: it is read as a household with nothing for that gap to move. */
const careOf = (a: Archetype): CareHousehold => ({ childAges: a.childAges, paysForCare: paysForCare(a) && !noSubsidy(a) });
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
 * The deepest fall and the two levels are the same kind of figure — how far
 * the family dips, what it has, cliff or no cliff — and are never lifted out
 * as "none" either (`alwaysMeasured`).
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
    const none = !past && !alwaysMeasured(measure.key) && zeroCliffs;
    const kind: TileKind = incomplete.length ? "incomplete" : past ? "past" : none ? "none" : "shaded";
    rows.push({ st, m, value, kind, incomplete });
  }
  return rows;
}

export interface BinClass {
  /** The ramp step this class is drawn with, 0-based: 0–4 on a sequential scale, 0–5 on a diverging one, where the losing arm can reach the loss ramp's sixth step. Step 0 is the one nearest the page's own ground, which is what the tile-label ink keys on. */
  ramp: number;
  /** Which ramp: the plum loss ramp, or the keep ramp — above zero on a diverging scale, and the whole of a level's scale (R14). */
  hue: "loss" | "keep";
  lo: number;
  hi: number;
}

export interface Bins {
  lo: number;
  hi: number;
  /**
   * "steps": five equal-width steps of a dollar measure, labelled by their
   * bounds. "diverging": equal-width steps either side of zero, zero a bin edge.
   */
  kind: "steps" | "diverging";
  /** One entry per swatch on the scale, in scale order — lightest first, or most-losing first when the scale diverges. */
  classes: BinClass[];
  /** Which class (an index into `classes`) a comparable value falls in. */
  index: (v: number) => number;
  /** Where zero sits on the scale, 0–1, on a diverging scale only: the hinge the strip's bars start from. */
  zero?: number;
  /** A diverging scale's two arms: each one's step width (null where no state falls on that side) and how many steps it was given. */
  width?: { down: number | null; up: number | null; nDown: number; nUp: number };
}

/* Bins across the OBSERVED range of the COMPARABLE states. Binning from 0
   would spend four of five bins on empty space for a measure whose floor is
   $53,000; binning over incomplete states would move the bounds using
   numbers that are known to be wrong; binning over a no-cliff state would
   put a measurement of zero at the bottom of a scale of losses (B4). Both
   bounds are always printed.

   A dollar measure takes five equal-width steps. (The counts that took
   classes of whole numbers left the menu with R5/R6, and their branch with
   them.)

   A measure with a MEANINGFUL ZERO diverges (charts.md § 2): see
   `divergingBins`.

   A dollar measure whose LOW end is the worst — the two money-kept levels —
   is money the family HAS, so it is drawn on the KEEP ramp, darkest where the
   family keeps most (blind review R14, 2026-09-26): a loss ramp colouring a
   level made its mid-tone read as a loss to a reader who had just left the
   keep-rate map. The ranking still leads with the lowest figure; the bins
   caption and the legend's cue say which end is dark (`figure.bins.stepsLow`,
   `measures.netAtRoadLo.cue`). */
export function bins(values: number[], unit: Measure["unit"], worst: Measure["worst"] = "high"): Bins {
  let lo = Infinity, hi = -Infinity;
  for (const v of values) { if (v < lo) lo = v; if (v > hi) hi = v; }
  if (!values.length) lo = hi = 0;
  if (unit === "¢") return divergingBins(lo, hi);
  const step = (hi - lo) / 5;
  const hue = worst === "low" ? "keep" : "loss";
  return {
    lo, hi, kind: "steps",
    classes: Array.from({ length: 5 }, (_, i) => ({ ramp: i, hue, lo: Math.round(lo + step * i), hi: Math.round(lo + step * (i + 1)) })),
    index: (v) => (step ? Math.min(4, Math.max(0, Math.floor((v - lo) / step))) : 0),
  };
}

/** Rounding slack, so a width that divides its side exactly does not buy a sliver of a class. */
const EPS = 1e-9;

/** How many swatches a diverging scale has in all: two arms share them (charts.md § 2). */
const DIVERGING_CLASSES = 6;

/**
 * The rungs of the ONE lightness axis the two arms share, worst first.
 *
 * Both ramps are cut at the same six luminances, and a class's ramp step is
 * its rung counted from the far end — `--loss-6` is the deepest rung and
 * `--keep-1` the palest — so a scale's classes run 5, 4, 3, 2, 1, 0 from the
 * state that loses most to the state that keeps most, whatever the split.
 * That is the whole fix for the lightness collapse: lightness now carries the
 * WHOLE order and hue carries the sign, instead of both arms spending the
 * same darkness on their own far end (charts.md § the diverging ramp).
 *
 * Only the loss ramp has a sixth step, and only an arm that shares the axis
 * needs it: an arm alone on the scale takes the five rungs its own ramp has.
 */
const rungRamp = (rung: number): number => DIVERGING_CLASSES - rung;

/**
 * The figure a RANK is decided on: the one the page prints.
 *
 * The keep rate is stored to four decimals and printed in whole cents, so
 * ranking on the stored figure gave two states the page shows as equal —
 * Ohio and North Carolina, both "loses 42¢" — the ranks 14 and 15, with no
 * tie mark and no tiebreak a reader could apply (the cold read's B2,
 * 2026-09-18). A ranking must be reproducible from what is on the page, so
 * ties are ties at the precision the reader is given. Every other measure is
 * already printed at its stored precision, and rounds to itself.
 */
export const rankValue = (v: number, m: Measure): number => (m.unit === "¢" ? Math.round(v * 100) : v);

/**
 * The diverging scale, for a measure whose zero means something — on this page
 * only the keep rate, where zero is the line between a family that ends a
 * raise poorer and one that keeps a little of it (charts.md § 2).
 *
 * **Zero is always a bin edge**, and each ARM is binned over its own reach:
 * equal steps from zero out to the furthest state on that side, plum below and
 * the keep ramp above. An arm with no state on it has no classes at all, and
 * the other then takes five — the ramp's own depth.
 *
 * **The two arms partition one lightness axis; they do not each span it**
 * (2026-09-18). Both ramps used to run pale-at-the-hinge to deep-at-the-end,
 * which put the best state in the country and the worst at L* 19.6 and 19.7 —
 * the same darkness — so the map said nothing in greyscale and told a reader
 * who reads depth as severity the opposite of the truth
 * (REVIEW-picture-first-places-2026-09-18 B1). The six classes now take the
 * six rungs of one axis in order, darkest for the state that loses most and
 * palest for the one that keeps most, so lightness carries the whole ranking
 * and hue carries only the sign. See `rungRamp`.
 *
 * The obvious alternative — ONE width for both arms, so that a class's depth
 * means the same distance from zero whichever ramp it is on — was built first
 * and looked wrong on the page. The arms are wildly asymmetric (on the
 * committed sweep a single parent of two loses up to 105¢ and keeps at most
 * 30¢), so a shared width gives the short arm one class: twenty-five states,
 * half the map, painted one flat colour, with New Mexico's 30¢ drawn exactly
 * like a state that keeps a third of a cent. The property it bought is one a
 * reader cannot use anyway — comparing depth ACROSS two hues is not something
 * the eye does reliably — while the resolution it cost is the thing the map is
 * for. So each arm uses its ramp over its own range, and the caption prints
 * both widths so nobody reads a step on one arm as a step on the other.
 *
 * **The six swatches are split in proportion to how far each arm reaches**,
 * at least one each. Cutting both arms the same number of ways was the first
 * try and it flattened the wrong side: three steps over 105¢ of losses put
 * Ohio at −42¢ and Nevada at −67¢ in one class while two states a single cent
 * apart on the keeping side were drawn differently (the cold read's S6,
 * 2026-09-18). Resolution follows the spread now — four plum classes of 26¢
 * and two keep classes of 15¢ on the committed sweep — so the arm with more
 * ground to cover gets more of the scale to cover it with.
 */
export function divergingBins(loValue: number, hiValue: number): Bins {
  const lo = Math.min(loValue, 0), hi = Math.max(hiValue, 0);
  const span = -lo + hi;
  const share = span > 0 ? Math.floor((DIVERGING_CLASSES * -lo) / span) : 0;
  const nDown = lo < 0 ? (hi > 0 ? Math.min(5, Math.max(1, share)) : 5) : 0;
  const nUp = hi > 0 ? (lo < 0 ? Math.min(5, Math.max(1, DIVERGING_CLASSES - nDown)) : 5) : 0;
  const down = -lo / (nDown || 1), up = hi / (nUp || 1);
  /* Each arm takes a CONTIGUOUS run of the shared rungs, deepest first, and
     the two runs meet at zero: the losing arm ends on the rung below the
     hinge, the keeping arm starts on the one above it. `i` counts outward
     from zero on each arm, so the rung nearest the hinge is the pale one on
     the losing side and the deep one on the keeping side — the order across
     the whole scale, not within an arm, is what lightness carries now.

     An arm alone on the scale has no partner to leave room for, so it slides
     to the five rungs its own ramp can draw: the losing arm to rungs 6–2,
     which is the sequential ramp exactly, and the keeping arm to rungs 2–6. */
  const loEnd = nUp ? nDown : DIVERGING_CLASSES;
  const upStart = Math.max(nDown, 1);
  const classes: BinClass[] = [];
  for (let i = nDown - 1; i >= 0; i--) classes.push({ ramp: rungRamp(loEnd - i), hue: "loss", lo: -(i + 1) * down, hi: i ? -i * down : 0 });
  for (let i = 0; i < nUp; i++) classes.push({ ramp: rungRamp(upStart + 1 + i), hue: "keep", lo: i * up, hi: (i + 1) * up });
  if (!classes.length) classes.push({ ramp: 2, hue: "keep", lo: 0, hi: 0 });
  /* A value at a boundary falls in the class NEARER zero, on either side, so
     the hinge itself belongs to no loss class: zero keeps nothing and loses
     nothing, and it is drawn on the keep ramp's first step where one exists. */
  const at = (v: number) => (v < 0
    ? nDown - (Math.ceil(-v / down - EPS) || 1)
    : v === 0 ? nDown : nDown + Math.ceil(v / up - EPS) - 1);
  return {
    lo, hi, kind: "diverging", classes,
    index: (v) => Math.min(classes.length - 1, Math.max(0, at(v))),
    zero: (hi - lo ? -lo / (hi - lo) : 0) || 0,
    /** Each arm's step width and how many steps it has: both differ, and the caption says so. */
    width: { down: nDown ? down : null, up: nUp ? up : null, nDown, nUp },
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
     that takes back less, and the ranking leads with it. The comparison is on
     the figure the page PRINTS (`rankValue`), so two states the reader sees as
     equal are equal here; the sort is stable, so they keep postal order. */
  const sign = measure.worst === "low" ? -1 : 1;
  const ranked = shaded.slice().sort((a, z) => sign * (rankValue(z.value as number, measure) - rankValue(a.value as number, measure)));
  const past = measure.key === "leap" ? by("past").sort((a, z) => (z.value as number) - (a.value as number)) : by("past");
  return {
    ranked, past, none, incomplete,
    bins: bins(shaded.map((r) => r.value as number), measure.unit, measure.worst),
    programs: [...new Set(incomplete.flatMap((r) => r.incomplete.map(unmodeledName)))],
  };
}

/**
 * Each ranked row's rank, by competition ranking (N3): equal values share a
 * rank and the next one skips — twelve states at 1 are all first, and the
 * first 0 is thirteenth. The count starts after the lower-bound group, which
 * holds ranks 1–n. A tie is a tie at the precision the page prints
 * (`rankValue`). The rank strip and the curves both read it. O(states).
 */
export function rankNumbers(g: Pick<Grouped, "ranked" | "past">, measure: Measure): number[] {
  let rank = 0;
  return g.ranked.map((r, i) => {
    if (i === 0 || rankValue(r.value as number, measure) !== rankValue(g.ranked[i - 1].value as number, measure)) rank = g.past.length + i + 1;
    return rank;
  });
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
