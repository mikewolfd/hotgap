import { type CurveChartLabels } from "@hotgap/design-system";
import { t, type StringKey } from "../strings/t.js";
import { formatDollars } from "./narration.js";
import { STATE_NAMES } from "./states.js";
import { minWageFor, fullTimeEarningsAt, hoursPerWeekAt, formatWagePerHour } from "./minWage.js";

// Plain-language chart copy, passed to the DS `CurveChart` via its `labels` prop
// so every user-facing chart string stays in en.json and stays gate-checked — the
// DS component never gets to show its built-in English. Built per-render (not a
// module const) because `cardHours` depends on the household's state minimum wage.
//
// Shared by both doors: the personal result page and the places drill-down.
export function makeChartLabels(state: string): CurveChartLabels {
  const stateName = STATE_NAMES[state] ?? state;
  const wage = minWageFor(state);
  const fullTime = wage !== null ? fullTimeEarningsAt(wage) : null;

  return {
    title: t("result.chart.title"),
    alt: t("result.chart.alt"),
    xLabel: (unit) => t("result.chart.xLabel", { unit }),
    yLabel: t("result.chart.yLabel"),
    youAreHere: t("result.chart.youAreHere"),
    dangerZone: t("result.chart.dangerZone"),
    dropHint: t("chart.drop.hint"),
    close: t("chart.drop.card.close"),
    markerLabel: (pay, amount) => t("chart.drop.marker.label", { pay, amount }),
    cardAmount: (pay, amount) => t("chart.drop.card.amount", { pay, amount }),
    cardLose: t("chart.drop.card.lose"),
    cardNone: t("chart.drop.card.none"),
    programLabel: (id) => t(`program.${id}` as StringKey),
    // "About N hours a week at minimum wage in <state>." Shown ONLY when a drop
    // sits at or below full-time minimum-wage earnings — above that the hours
    // count would exceed a 40-hour week (and can top the 168 hours a week has),
    // so the line is omitted and the reference line orients the high end instead.
    cardHours: (earnings) => {
      if (wage === null || fullTime === null || earnings > fullTime) return null;
      const hours = Math.max(1, Math.round(hoursPerWeekAt(earnings, wage)));
      return hours === 1
        ? t("chart.minWage.hoursOne", { state: stateName })
        : t("chart.minWage.hours", { hours, state: stateName });
    },
  };
}

// The full-time-minimum-wage reference line for the chart: a dashed vertical
// marker at full-time-minimum earnings, plus a below-chart note pairing it with
// the number. Returns undefined when we have no wage for the state (the chart
// then simply draws no reference line).
export function minWageLineFor(state: string): { earnings: number; label: string } | undefined {
  const wage = minWageFor(state);
  if (wage === null) return undefined;
  const earnings = fullTimeEarningsAt(wage);
  return {
    earnings,
    label: t("chart.minWage.line", { wage: formatWagePerHour(wage), income: formatDollars(earnings) }),
  };
}
