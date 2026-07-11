import {
  fromAnnual, roundTo,
  type CurveAnalysis, type CurvePoint, type EscapeAnalysis, type PayUnit, type ProgramId,
} from "@hotgap/shared";
import { t, type StringKey } from "../strings/t.js";

export interface PayContext { unit: PayUnit; hoursPerWeek?: number }
export interface WhyItem { programLabel: string; lostNear: string | null; currentValue: string }
// healthCostLine: what the household pays for health coverage at their
// CURRENT pay (SPM medical out-of-pocket, already subtracted into
// netIncome) — null when that cost is $0, so the after-health adjustment is
// never silently hidden but also never invented where there's nothing to say.
export interface Narration { headline: string; body: string; whyItems: WhyItem[]; healthCostLine: string | null }
export interface EscapeThreshold { label: string; wage: string }
// reachLine: the "reach" feasibility signal (Plan 5) -- how common the
// safe-exit income already is among real households of this archetype. This
// is a CROSS-SECTIONAL fact ("N% of families like this already earn that
// much"), never a probability of any one household getting there. Both
// narrateEscape and narratePlacesEscape take an optional reach context; when
// the caller omits it entirely, reachLine stays null (existing call sites
// that don't care about reach see no behavior change).
export interface EscapeNarration {
  safeLine: string | null;
  leapLine: string | null;
  thresholds: EscapeThreshold[];
  reachLine: string | null;
}
// pct: where the safe-exit income falls among real households of this
// archetype (see reachLookup.ts), or null when there's no trustworthy cell
// for it -- reachLine omits silently in that case rather than showing a
// shaky number.
export interface ReachContext { pct: number | null }
export interface PersonalReachContext extends ReachContext { stateName: string }

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function formatDollars(n: number): string {
  return money.format(roundTo(n, 100));
}

// Renders an archetype's child ages as a plain-language list ("3 and 7",
// "1, 4, and 9") so the places-door kids picker can say what the ages
// actually are instead of just a bare count — derived from ARCHETYPES at
// call time rather than hardcoded per kid-count string.
export function formatAgeList(ages: number[]): string {
  if (ages.length === 0) return "";
  if (ages.length === 1) return String(ages[0]);
  if (ages.length === 2) return `${ages[0]} and ${ages[1]}`;
  return `${ages.slice(0, -1).join(", ")}, and ${ages[ages.length - 1]}`;
}

export function formatWage(annual: number, ctx: PayContext): string {
  switch (ctx.unit) {
    case "hour": {
      const w = roundTo(fromAnnual(annual, "hour", ctx.hoursPerWeek), 0.25);
      const s = Number.isInteger(w) ? money.format(w) : `$${w.toFixed(2)}`;
      return t("unit.hour", { amount: s });
    }
    case "month":
      return t("unit.month", { amount: money.format(roundTo(fromAnnual(annual, "month"), 50)) });
    case "year":
      return t("unit.year", { amount: money.format(roundTo(annual, 500)) });
  }
}

// The sample point nearest to `earnings` — program steps (and the health
// cost that rides along with them, e.g. losing Medicaid for paid ACA
// coverage) change at discrete pay levels, not smoothly, so "nearest point"
// tells the story better than a smoothed interpolation would.
function nearestPoint(points: CurvePoint[], earnings: number): CurvePoint {
  return points.reduce((a, b) =>
    Math.abs(b.earnings - earnings) < Math.abs(a.earnings - earnings) ? b : a,
  );
}

export function narrate(analysis: CurveAnalysis, ctx: PayContext): Narration {
  const v = analysis.verdict;
  const params: Record<string, string> = {};
  if (analysis.nextCliff) {
    params.wage = formatWage(analysis.nextCliff.startEarnings, ctx);
    params.drop = formatDollars(analysis.nextCliff.drop);
  } else if (analysis.worstCliff) {
    params.wage = formatWage(analysis.worstCliff.startEarnings, ctx);
    params.drop = formatDollars(analysis.worstCliff.drop);
  }
  if (analysis.escapeEarnings !== null) params.escape = formatWage(analysis.escapeEarnings, ctx);

  // In a danger zone, "escape" is only meaningful if the sweep actually found
  // pay where net income recovers. When escapeEarnings is null, we checked
  // every point we sampled and never found that spot — claiming "once pay
  // gets past X, earning more helps again" would be asserting a recovery the
  // data does not support. Route to a body that says so honestly instead.
  const stuckInZone = v === "in_danger_zone" && analysis.escapeEarnings === null;
  const bodyKey: StringKey = stuckInZone
    ? "result.verdict.in_danger_zone.body_stuck"
    : (`result.verdict.${v}.body` as StringKey);

  const headline = t(`result.verdict.${v}` as StringKey, pick(params, HEADLINE_PARAMS[v]));
  const body = t(bodyKey, pick(params, stuckInZone ? [] : BODY_PARAMS[v]));

  const currentPoint = nearestPoint(analysis.points, analysis.currentEarnings);
  const lost = new Set<ProgramId>(analysis.nextCliff?.programsLost ?? []);
  const candidates = (Object.entries(currentPoint.programs) as [ProgramId, number][])
    // Deliberate floor, not a bug: values under $50/year are noise for this audience, not meaningful benefits.
    .filter(([id, value]) => value > 50 || lost.has(id))
    .sort((a, b) => Number(lost.has(b[0])) - Number(lost.has(a[0])) || b[1] - a[1])
    .slice(0, 5);

  const whyItems: WhyItem[] = candidates.map(([id, value]) => ({
    programLabel: t(`program.${id}` as StringKey),
    lostNear: lost.has(id) && analysis.nextCliff
      ? formatWage(analysis.nextCliff.startEarnings, ctx)
      : null,
    currentValue: formatDollars(value),
  }));

  // Surfaces the health cost the household actually pays at THIS pay (the
  // transparency half of the health-adjusted curve — see Plan 4): the
  // adjustment is folded into netIncome everywhere, so it must never be
  // silent. formatDollars (not formatWage): like the leap, this is an annual
  // cost figure, not a wage rate at a point on the chart. Null (no line)
  // when the cost is $0, rather than claiming a cost that isn't there.
  const healthCostLine = currentPoint.medicalOOP > 0
    ? t("escape.healthCost", { amount: formatDollars(currentPoint.medicalOOP) })
    : null;

  return { headline, body, whyItems, healthCostLine };
}

// Sorted ascending by earnings, capped at 5 — shared by both doors so the
// personal door's "Your path off help" and the places door's drill-down can
// never phrase "when help ends" differently.
function programThresholds(esc: EscapeAnalysis, ctx: PayContext): EscapeThreshold[] {
  return (Object.entries(esc.programEnds) as [ProgramId, number][])
    .sort((a, b) => a[1] - b[1])
    .slice(0, 5)
    .map(([id, earnings]) => ({
      label: t(`program.${id}` as StringKey),
      wage: formatWage(earnings, ctx),
    }));
}

// Builds the "reach" line (Plan 5): omitted entirely (null) whenever the
// caller doesn't supply reach context (existing callers that don't care about
// reach see no behavior change), when safeExitEarnings is 0 (no escape income
// to compare -- already always safe, nothing to reach), or when the archetype
// has no trustworthy PUMS cell (reach.pct is null: small sample or unknown
// state -- the small-sample honesty rule, never shown with a shaky number).
// safeExitEarnings === null (never safe within the sweep) needs no pct at
// all: there's no concrete income to look up, so it gets a static, honest
// top-of-chart line instead of a fabricated percentile.
function buildReachLine(
  safeExitEarnings: number | null,
  reach: ReachContext | undefined,
  neverKey: StringKey,
  lineKey: StringKey,
  extraParams: Record<string, string>,
): string | null {
  if (!reach) return null;
  if (safeExitEarnings === null) return t(neverKey);
  if (safeExitEarnings === 0 || reach.pct === null) return null;
  return t(lineKey, { pct: String(Math.round(reach.pct)), ...extraParams });
}

export function narrateEscape(
  esc: EscapeAnalysis,
  ctx: PayContext,
  reach?: PersonalReachContext,
): EscapeNarration {
  // safeExitEarnings === 0 means every point on the chart is already safe —
  // the always_up verdict headline already says that, so no line here.
  const safeLine =
    esc.safeExitEarnings === null ? t("escape.safeNever")
    : esc.safeExitEarnings > 0 ? t("escape.safe", { wage: formatWage(esc.safeExitEarnings, ctx) })
    : null;

  // The leap is a raise SIZE (a dollar delta the family must clear in one
  // move), not a wage rate at a point on the chart — formatDollars, not
  // formatWage, is the right unit here.
  const leapLine = esc.leap > 0
    ? t(esc.leapIsLowerBound ? "escape.leapMore" : "escape.leap", { amount: formatDollars(esc.leap) })
    : null;

  // extraParams (income/state) are only ever read by buildReachLine once
  // safeExitEarnings is confirmed to be a positive finite number, so the `?? 0`
  // / `?? ""` fallbacks here never actually reach a rendered string.
  const reachLine = buildReachLine(esc.safeExitEarnings, reach, "escape.reachNever", "escape.reach", {
    income: formatDollars(esc.safeExitEarnings ?? 0), state: reach?.stateName ?? "",
  });

  return { safeLine, leapLine, thresholds: programThresholds(esc, ctx), reachLine };
}

// Places-door variant of narrateEscape, for the state drill-down (StatePanel).
// Third-person framing ("this family", "here") instead of the personal
// door's "you", and formatDollars (not formatWage) for the safe-exit and leap
// lines — the drill-down isn't anchored to a real person's pay unit, so a
// plain dollar figure with " a year" baked into the string is the honest
// amount to show. Thresholds still speak in year-unit wages (fixed ctx) and
// reuse the shared escape.ends item string; StatePanel pairs them with its
// own third-person places.panel.endsTitle ("When help ends here:") rather
// than the personal door's "…for you:", to stay consistent with the panel's
// "not your family" framing.
export function narratePlacesEscape(esc: EscapeAnalysis, reach?: ReachContext): EscapeNarration {
  const safeLine =
    esc.safeExitEarnings === null ? t("places.panel.safeNever")
    : esc.safeExitEarnings > 0 ? t("places.panel.safe", { amount: formatDollars(esc.safeExitEarnings) })
    : null;

  const leapLine = esc.leap > 0
    ? t(esc.leapIsLowerBound ? "places.panel.leapMore" : "places.panel.leap", { amount: formatDollars(esc.leap) })
    : null;

  const reachLine = buildReachLine(esc.safeExitEarnings, reach, "places.panel.reachNever", "places.panel.reach", {});

  return { safeLine, leapLine, thresholds: programThresholds(esc, { unit: "year" }), reachLine };
}

const HEADLINE_PARAMS: Record<string, string[]> = {
  always_up: [], cliff_ahead: ["wage"], in_danger_zone: [], cliff_behind: [],
};
const BODY_PARAMS: Record<string, string[]> = {
  always_up: [], cliff_ahead: ["wage", "drop"], in_danger_zone: ["escape"], cliff_behind: [],
};

function pick(obj: Record<string, string>, keys: string[]): Record<string, string> {
  return Object.fromEntries(keys.map((k) => [k, obj[k]]));
}
