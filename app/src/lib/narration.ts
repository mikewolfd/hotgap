import {
  fromAnnual, roundTo,
  type CurveAnalysis, type PayUnit, type ProgramId,
} from "@hotgap/shared";
import { t, type StringKey } from "../strings/t.js";

export interface PayContext { unit: PayUnit; hoursPerWeek?: number }
export interface WhyItem { programLabel: string; lostNear: string | null; currentValue: string }
export interface Narration { headline: string; body: string; whyItems: WhyItem[] }

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function formatDollars(n: number): string {
  return money.format(roundTo(n, 100));
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

function interpolateAt(analysis: CurveAnalysis, earnings: number): Record<ProgramId, number> {
  // programs at the sample point nearest to earnings (program steps, not slopes, drive the story)
  const nearest = analysis.points.reduce((a, b) =>
    Math.abs(b.earnings - earnings) < Math.abs(a.earnings - earnings) ? b : a,
  );
  return nearest.programs;
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
  if (v === "in_danger_zone" && analysis.escapeEarnings === null) {
    // never recovers in the sweep — reuse the zone start as the reference wage
    params.escape = formatWage(analysis.points[analysis.points.length - 1].earnings, ctx);
  }

  const headline = t(`result.verdict.${v}` as StringKey, pick(params, HEADLINE_PARAMS[v]));
  const body = t(`result.verdict.${v}.body` as StringKey, pick(params, BODY_PARAMS[v]));

  const current = interpolateAt(analysis, analysis.currentEarnings);
  const lost = new Set<ProgramId>(analysis.nextCliff?.programsLost ?? []);
  const candidates = (Object.entries(current) as [ProgramId, number][])
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

  return { headline, body, whyItems };
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
