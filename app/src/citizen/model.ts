// The scene: everything the citizen components read, derived once from one
// HouseholdEvaluation (core/src/evaluate.ts) and the flags that carry the
// person's pay unit. Pure — no DOM — so the verdict, the rows, the table and
// the chart geometry can be tested from a fixture. O(points × programs)
// once per evaluation; nothing here is repeated per component.
import {
  DEFAULT_HOURS, immediateCurve, modeledAnswers, PAY_UNITS, PROGRAM_END_MIN, PROGRAM_IDS, STATE_NAMES,
  type Cliff, type DangerZone, type HouseholdAnswers, type HouseholdEvaluation, type HouseholdFlags, type LiheapBoundary, type PayUnit, type ProgramId,
} from "@hotgap/core";
import { money, moneyAbout, payFigure, payPhrase, payRounded, unitFigure, unitPhrase } from "../lib/format.js";

/** The unit the person gave and the hours an hourly figure converts through. */
export interface Pay { unit: PayUnit; hours: number }

export function payOf(ev: HouseholdEvaluation, flags: HouseholdFlags): Pay {
  const unit = (PAY_UNITS as readonly string[]).includes(flags.unit ?? "") ? (flags.unit as PayUnit) : "hour";
  return { unit, hours: ev.answers.hoursPerWeek ?? DEFAULT_HOURS };
}

/**
 * Money in the citizen register, bound to one pay unit (M5). `pay` says the
 * unit unless the page is annual, where "a year" is said once per sentence;
 * `payUnit` always says it. Money kept is always yearly and exact.
 */
export interface Money {
  pay(annual: number): string;
  payUnit(annual: number): string;
  /** A difference of two rounded figures, so a sentence adds up in every unit. */
  diff(fromAnnual: number, toAnnual: number, withUnit?: boolean): string;
  money(n: number): string;
  about(n: number): string;
}

function moneyFor({ unit, hours }: Pay): Money {
  const withUnit = unit !== "year";
  return {
    pay: (a) => (withUnit ? payPhrase(a, unit, hours) : payFigure(a, unit, hours)),
    payUnit: (a) => payPhrase(a, unit, hours),
    diff: (a, b, say = withUnit) => unitFigure(payRounded(b, unit, hours) - payRounded(a, unit, hours), unit) + (say ? ` ${unitPhrase(unit)}` : ""),
    money,
    about: moneyAbout,
  };
}

/** What is left of a program named on a cliff at the cliff's landing point, and the first pay at which it is gone. */
export interface Remainder { id: ProgramId; amount: number; until: number }

export interface Scene {
  ev: HouseholdEvaluation;
  pay: Pay;
  m: Money;
  /** Axis step and the last swept pay. */
  step: number;
  top: number;
  /** The REAL curve's net income per point, and the same with deferred drops lifted out (charts.md § The lift: core's immediateCurve). */
  net: number[];
  lifted: number[];
  idx(earnings: number): number;
  earningsAt(i: number): number;
  current: number;
  currentNet: number;
  state: string;
  stateName: string;
  /** The household's own zone (personal.zone), the exit, and whether the zone runs off the axis. */
  zone: DangerZone | null;
  stuck: boolean;
  exit: number | null;
  safeExit: number | null;
  otherZones: DangerZone[];
  cliffs: Cliff[];
  /** Cliffs that land now, and the ones a federal rule defers to a renewal. */
  immediate: Cliff[];
  deferred: Cliff[];
  /** The largest immediate drop: the one direct label, the one "biggest" row. */
  worst: Cliff | null;
  next: Cliff | null;
  /** The crop the citizen chart shows, in annual dollars, and the cliffs inside it. */
  window: [number, number];
  inWindow: Cliff[];
  /** Where energy assistance stops (EligibilityBoundary #23), when it lies on the axis; drawn as a tick only while the toggle is off. */
  boundary: LiheapBoundary | null;
  boundaryInWindow: boolean;
  /** The household the curve was actually run for: the person's own on the live path, the swept archetype otherwise (S6). */
  modeled: HouseholdAnswers;
  clamped: boolean;
  /** The first pay at which each program appears, from the points (context for a StepList row). */
  starts: Partial<Record<ProgramId, number[]>>;
  remains(c: Cliff): Remainder[];
}

/** The context the crop carries around what it must show: a third before, two thirds after, where the climb back is. */
export const WINDOW_MARGIN = 30_000;

/**
 * The crop (charts.md § Phone) is what the picture exists to show: the
 * diamond, the household's zone and its exit, the next cliff, and the
 * curve's biggest drop when it lies within the margin — plus the margin.
 * Never a fixed fraction of the axis (design/REVIEW-citizen B2: a
 * half-axis window spent the picture on the climb and made a $2,400 step
 * two pixels tall). Snapped to the points.
 */
export function windowFor(s: Pick<Scene, "current" | "zone" | "stuck" | "exit" | "next" | "worst" | "top" | "step">): [number, number] {
  const { current, zone, stuck, exit, next, worst, top, step } = s;
  let lo = Math.min(current, zone?.startEarnings ?? current);
  let hi = Math.max(current, stuck || exit === null ? current : exit, next?.endEarnings ?? current);
  if (worst && worst.endEarnings <= hi + WINDOW_MARGIN && worst.startEarnings >= lo - WINDOW_MARGIN) {
    lo = Math.min(lo, worst.startEarnings);
    hi = Math.max(hi, worst.endEarnings);
  }
  lo -= WINDOW_MARGIN / 3;
  hi += (2 * WINDOW_MARGIN) / 3;
  if (lo < 0) { hi -= lo; lo = 0; }
  if (hi > top) { lo = Math.max(0, lo - (hi - top)); hi = top; }
  return [Math.floor(lo / step) * step, Math.ceil(hi / step) * step];
}

export function sceneOf(ev: HouseholdEvaluation, flags: HouseholdFlags): Scene {
  const points = ev.curve.points;
  const step = points[1].earnings - points[0].earnings;
  const top = points[points.length - 1].earnings;
  const idx = (e: number) => Math.round((e - points[0].earnings) / step);
  const net = points.map((p) => p.netIncome);
  const a = ev.analysis;
  const deferred = a.cliffs.filter((c) => c.deferral !== null);
  const immediate = a.cliffs.filter((c) => c.deferral === null);
  const zone = ev.personal.zone;
  const stuck = zone !== null && ev.personal.raiseIsLowerBound;
  const worst = immediate.length ? immediate.reduce((x, y) => (y.drop > x.drop ? y : x)) : null;
  // nextCliff is computed on the lifted curve and is never an entry of
  // cliffs (evaluate.ts); the real cliff is found by its step.
  const next = a.nextCliff ? a.cliffs.find((c) => c.startEarnings === a.nextCliff!.startEarnings) ?? a.nextCliff : null;
  const pay = payOf(ev, flags);
  const base = {
    step, top, current: a.currentEarnings, zone, stuck,
    exit: ev.personal.escapeEarnings, next, worst,
  };
  const window = windowFor(base);

  // O(points × programs), once: where each program first appears.
  const starts: Partial<Record<ProgramId, number[]>> = {};
  for (const id of PROGRAM_IDS) {
    for (let i = 1; i < points.length; i++) {
      if ((points[i].programs[id] ?? 0) > PROGRAM_END_MIN && (points[i - 1].programs[id] ?? 0) <= PROGRAM_END_MIN) (starts[id] ??= []).push(points[i].earnings);
    }
  }
  const ends = ev.escape.programEnds;

  return {
    ...base,
    ev, pay, m: moneyFor(pay), net, lifted: immediateCurve(points, ev.deferred).map((p) => p.netIncome), idx, earningsAt: (i) => points[i].earnings,
    currentNet: a.currentNet,
    state: ev.answers.state, stateName: STATE_NAMES[ev.answers.state] ?? ev.answers.state,
    safeExit: ev.escape.safeExitEarnings,
    otherZones: a.dangerZones.filter((z) => z.startEarnings !== zone?.startEarnings),
    cliffs: a.cliffs, immediate, deferred,
    window, inWindow: a.cliffs.filter((c) => c.startEarnings >= window[0] && c.endEarnings <= window[1]),
    boundary: ev.liheap,
    boundaryInWindow: ev.liheap !== null && !ev.liheap.counted && ev.liheap.earningsLimit >= window[0] && ev.liheap.earningsLimit <= window[1],
    modeled: modeledAnswers(ev), clamped: a.currentEarnings !== ev.answers.annualEarnings,
    starts,
    // programsLost also fires when a program halves in a step (analyze.ts), so
    // some of it can go on past the cliff: what is left, and until when
    // (programEnds is the LAST pay it is received; gone one step later).
    remains: (c) => {
      const at = points[idx(c.endEarnings)];
      const out: Remainder[] = [];
      for (const id of c.programsLost) {
        const amount = at?.programs[id] ?? 0;
        const last = ends[id];
        if (amount > PROGRAM_END_MIN && last !== undefined && last >= c.endEarnings) out.push({ id, amount, until: last + step });
      }
      return out;
    },
  };
}
