// The scene: everything the citizen components read, derived once from one
// HouseholdEvaluation (core/src/evaluate.ts) and the flags that carry the
// person's pay unit. Pure — no DOM — so the verdict, the rows, the table and
// the chart geometry can be tested from a fixture. O(points × programs)
// once per evaluation; nothing here is repeated per component.
import {
  DEFAULT_HOURS, modeledAnswers, PAY_UNITS, PROGRAM_END_MIN, PROGRAM_IDS, STATE_NAMES,
  type Cliff, type DangerZone, type HouseholdAnswers, type HouseholdEvaluation, type HouseholdFlags, type LiheapBoundary, type PayUnit, type ProgramId,
} from "@hotgap/core";
import { windowFor } from "../lib/chart/geometry.js";
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
  /** The curve's net income per point — the one line every figure describes (a deferred loss counts, 2026-09-17). */
  net: number[];
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
  /** The cliffs a federal rule defers to a later renewal: counted like the rest, badged (Cliff.deferral says when). */
  deferred: Cliff[];
  /** The largest drop: the one direct label, the one "biggest" row. */
  worst: Cliff | null;
  next: Cliff | null;
  /**
   * Where the citizen chart is scrolled to first, in annual dollars — the
   * part of the curve that answers the question. Since 2026-09-17 it is a
   * position, not a crop: the chart draws the whole axis either way.
   */
  window: [number, number];
  /** Where energy assistance stops (EligibilityBoundary #23), when it lies on the axis; drawn as a tick only while the toggle is off. */
  boundary: LiheapBoundary | null;
  boundaryOnAxis: boolean;
  /** The household the curve was actually run for: the person's own on the live path, the swept archetype otherwise (S6). */
  modeled: HouseholdAnswers;
  clamped: boolean;
  /** The first pay at which each program appears, from the points (context for a StepList row). */
  starts: Partial<Record<ProgramId, number[]>>;
  remains(c: Cliff): Remainder[];
}

/* Where the curve is scrolled to first, and the margin it carries: the rule
   is both doors' now, so it lives in lib/chart/geometry.ts (audit D10). */
export { WINDOW_MARGIN, windowFor } from "../lib/chart/geometry.js";

export function sceneOf(ev: HouseholdEvaluation, flags: HouseholdFlags): Scene {
  const points = ev.curve.points;
  const step = points[1].earnings - points[0].earnings;
  const top = points[points.length - 1].earnings;
  const idx = (e: number) => Math.round((e - points[0].earnings) / step);
  const net = points.map((p) => p.netIncome);
  const a = ev.analysis;
  const deferred = a.cliffs.filter((c) => c.deferral !== null);
  const zone = ev.personal.zone;
  const stuck = zone !== null && ev.personal.raiseIsLowerBound;
  /* The worst and next cliff as the ENTRIES of `a.cliffs` they name, not as
     `a.worstCliff`/`a.nextCliff` themselves. The page compares cliffs by
     identity — the StepList's "This is the biggest drop.", the chart's one
     direct label, a mark's open row — and the evaluation reaches this module
     over JSON (`POST /api/evaluate`), where those two fields come back as
     separate objects that are equal to an entry without being it. In process
     the reference holds, so every unit test passes either way and only the
     live page shows the label missing; the caseworker already re-links, in
     `caseworker/model.ts` cliffAt. Deferred cliffs are in the running, which
     is the owner's rule of 2026-09-17. */
  const sameStep = (c: Cliff, r: Cliff | null) => r !== null && c.startEarnings === r.startEarnings && c.endEarnings === r.endEarnings;
  const worst = a.cliffs.find((c) => sameStep(c, a.worstCliff)) ?? null;
  const next = a.cliffs.find((c) => sameStep(c, a.nextCliff)) ?? null;
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
    ev, pay, m: moneyFor(pay), net, idx, earningsAt: (i) => points[i].earnings,
    currentNet: a.currentNet,
    state: ev.answers.state, stateName: STATE_NAMES[ev.answers.state] ?? ev.answers.state,
    safeExit: ev.escape.safeExitEarnings,
    otherZones: a.dangerZones.filter((z) => z.startEarnings !== zone?.startEarnings),
    cliffs: a.cliffs, deferred,
    window,
    boundary: ev.liheap,
    boundaryOnAxis: ev.liheap !== null && !ev.liheap.counted && ev.liheap.earningsLimit <= top,
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
