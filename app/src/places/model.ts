// The journalist surface's reading of summary.json: one row per state for a
// household and a measure, the four tile states, the five bins, and the
// order the ranking shows them in. Pure — no DOM, no fetch — so it is the
// part vitest covers directly (model.test.ts).
import type { StateCoverage, StateCorrections, StateMetrics, SummaryJson, UnmodeledProgram } from "@hotgap/core";
// A runtime import from core by file: analyze.ts and everything it imports is
// free of node:fs and node:crypto (named in the report for the shell contract).
import { CLIFF_MIN } from "../../../core/src/analyze.js";

export type Archetype = SummaryJson["archetypes"][number];

/* core's DEFAULT_ARCHETYPE. archetypes.ts cannot be imported here — it reaches
   state-defaults.json through node:fs — so the id is repeated, and
   model.test.ts checks the two agree. The page falls back to the file's
   first archetype should this one ever leave the sweep. */
export const PREFERRED_HOUSEHOLD = "single-2";

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

// The six measures pipeline/src/metrics.ts writes, in the FilterRow's order.
export const MEASURES: readonly Measure[] = [
  { key: "biggestLoss", title: "Largest one-step loss", option: "Largest one-step loss ($)", unit: "$",
    describe: "Net income lost in the worst single $1,000 step of earnings." },
  { key: "dangerWidth", title: "Width of the worst danger zone", option: "Width of the worst danger zone ($)", unit: "$",
    describe: "Earnings spanned by the widest stretch where more pay leaves the household no better off." },
  { key: "leap", title: "The leap", option: "The leap — raise needed to clear it ($)", unit: "$",
    describe: "The raise a household must clear in one move to get past that stretch." },
  { key: "safeExit", title: "Safe exit", option: "Safe exit — where the last zone closes ($)", unit: "$",
    describe: "Earnings at which the last danger zone closes." },
  { key: "cliffCount", title: "Number of cliffs", option: "Number of cliffs", unit: "",
    describe: `Steps down of $${CLIFF_MIN} or more anywhere on the curve.` },
  { key: "deferredCliffCount", title: "Deferred cliffs", option: "Of those, deferred to a later renewal", unit: "",
    describe: "Of those, the ones that land at a future renewal, not with the raise." },
];

export const measureByKey = (key: string): Measure | undefined => MEASURES.find((m) => m.key === key);

/* S10: the household list is the file's, labelled from `married`, `childAges`
   and the id — `-dual-` is the two-earner couple (core/src/archetypes.ts
   `spouseWorks`), and the earner count decides whether the household buys care. */
export const worksBoth = (a: Archetype): boolean => a.id.includes("dual");

export function archLabel(a: Archetype): string {
  const adults = !a.married ? "1 adult" : worksBoth(a) ? "2 adults, both working" : "2 adults, one working";
  const n = a.childAges.length;
  const ages = n === 2 ? a.childAges.join(" and ") : a.childAges.join(", ");
  return `${adults}, ${n === 0 ? "no children" : `${n} ${n === 1 ? "child" : "children"} (${ages})`}`;
}

/* core's CHILDCARE_MAX_AGE (stateDefaults.ts): the sweep prices care for every
   child through 12 — school-age care included — and that module reaches
   node:fs, so the number is repeated here and pinned in model.test.ts. */
export const CHILDCARE_MAX_AGE = 12;

/* A missing child-care subsidy can only move a household that pays for care:
   a child of child-care age and every parent working (a single parent, or a
   dual-earner couple; the single-earner couple has a parent at home and no
   bill). The same test the pipeline uses to flag a state's subsidy as
   unmodeled (build.ts: the archetypes whose monthlyChildcare is > 0). */
export const paysForCare = (a: Archetype): boolean => a.childAges.some((age) => age <= CHILDCARE_MAX_AGE) && (!a.married || worksBoth(a));

/* IncompleteMarker (B1): keyed off coverage[state].unmodeled[], never a list
   kept here. LIHEAP never reaches net income and is not a reason to hatch; the
   child-care entry (coverage.ts writes "Child-care subsidy (CCDF)") bites only
   a household that pays for care; a state premium program bites every one. */
export const bites = (u: UnmodeledProgram, a: Archetype): boolean =>
  u.program !== "LIHEAP" && (!/child.?care/i.test(u.program) || paysForCare(a));

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
  const shaded = by("shaded"), past = by("past"), none = by("none"), incomplete = by("incomplete");
  const ranked = shaded.slice().sort((a, z) => (z.value as number) - (a.value as number));
  return {
    ranked, past, none, incomplete,
    bins: bins(shaded.map((r) => r.value as number), measure.unit),
    programs: [...new Set(incomplete.flatMap((r) => r.incomplete.map((u) => u.program)))],
  };
}

export type SortKey = "state" | "measure";

/** The table's order: postal code, or the ranking followed by the lifted-out groups in the rank strip's own order. */
export function tableRows(rows: StateRow[], g: Grouped, sort: SortKey): StateRow[] {
  return sort === "measure" ? [...g.ranked, ...g.past, ...g.none, ...g.incomplete] : rows;
}

/* inventory.md § Program phrases, `name` register (M3) — the ids a correction
   here can name. The journalist surface never uses the citizen phrase. */
export const PROGRAM_NAME = {
  childcare: "CCDF child care subsidy",
  tanf: "TANF cash assistance",
  medicaid: "Medicaid",
  aca: "Premium tax credit",
} as const;

/** A policy override's program, from its parameter path. */
export const overrideProgram = (parameter: string): string =>
  /medicaid\..*parent/.test(parameter) ? `${PROGRAM_NAME.medicaid} — parent income limit`
  : /basic_health_program/.test(parameter) ? "Basic Health Program — expanded-limit states"
  : parameter.split(".").slice(-2).join(" ");

export interface CorrectionRow {
  program: string;
  /** The `source` word for the chip, or null where the correction carries none (coverageGap, maTafdc). */
  source: string | null;
  note: string;
  href?: string;
}

/* CorrectionsApplied (B3): coverage[state].corrections kept to applies === true,
   in one order for the detail block and the CSV. The note is printed as core
   wrote it; the published source it was read from (an override's `source`,
   another correction's `cite`) is the cite's link; core's `code` pointer is
   not a reader's fact and is not shown. */
export function correctionRows(c: StateCorrections | undefined): CorrectionRow[] {
  if (!c) return [];
  const rows: CorrectionRow[] = c.policyOverrides.map((o) => ({ program: overrideProgram(o.parameter), source: "overridden", note: o.note, href: o.source }));
  if (c.maTafdc.applies) rows.push({ program: PROGRAM_NAME.tanf, source: null, note: c.maTafdc.note, href: c.maTafdc.cite });
  if (c.premiumAssistance.applies) rows.push({ program: c.premiumAssistance.program ?? "State premium help", source: c.premiumAssistance.source, note: c.premiumAssistance.note, href: c.premiumAssistance.cite });
  if (c.childcareSubsidy.applies) rows.push({ program: PROGRAM_NAME.childcare, source: c.childcareSubsidy.source, note: c.childcareSubsidy.note });
  if (c.coverageGap.applies) rows.push({ program: `${PROGRAM_NAME.aca} — coverage gap`, source: null, note: c.coverageGap.note });
  return rows;
}
