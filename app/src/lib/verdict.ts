// The verdict catalog in the citizen register (design/inventory.md M2): one
// sentence shape per curve shape, every pay figure in the person's own unit
// (M5), wired to `evaluation.personal`. The citizen answer and the
// caseworker's printed client sheet say the same sentence from the same
// objects, so it lives here rather than in either page (the copy in
// app/src/citizen/result.ts is the one to retire in favour of this).
import { DEFAULT_HOURS, type HouseholdEvaluation, type PayUnit } from "@hotgap/core";
import { money, payPhrase } from "./format.js";

interface Slots { pay: string; kept: string; wage?: string; drop?: string; exit?: string; leap?: string; top: string }

const VERDICT = {
  always_up: (s: Slots) => `You are paid ${s.pay}. You keep about ${s.kept}. When you earn more, you keep more. We did not find a spot where more pay leaves you with less.`,
  cliff_ahead: (s: Slots) => `You are paid ${s.pay}. You keep about ${s.kept}. Near ${s.wage}, more pay can mean less money: past it you would keep about ${s.drop} less a year. People call this a benefits cliff.`,
  in_danger_zone: (s: Slots) => `You are paid ${s.pay}. You keep about ${s.kept}. More pay does not add to that until you are paid ${s.exit}: a raise of ${s.leap}.`,
  "in_danger_zone:stuck": (s: Slots) => `You are paid ${s.pay}. You keep about ${s.kept}. More pay does not add to that in the pay range we checked, up to ${s.top}. We did not find a spot where you come out ahead again.`,
  cliff_behind: (s: Slots) => `You are paid ${s.pay}. You keep about ${s.kept}. The big drop is below your pay now. From here, more pay means more for you.`,
};

/** The one sentence for this evaluation's curve shape, every pay figure in the person's unit. */
export function verdictSentence(ev: HouseholdEvaluation, unit: PayUnit, hoursPerWeek = DEFAULT_HOURS): string {
  const a = ev.analysis;
  const inUnit = (annual: number) => payPhrase(annual, unit, hoursPerWeek);
  // The threshold is the step's landing point (design/inventory.md § Where a
  // program ends), read off the real cliff list by the step nextCliff names.
  const next = a.nextCliff ? a.cliffs.find((c) => c.startEarnings === a.nextCliff!.startEarnings) ?? a.nextCliff : null;
  const slots: Slots = {
    pay: inUnit(a.currentEarnings),
    kept: `${money(Math.round(a.currentNet / 100) * 100)} a year`,
    wage: next ? inUnit(next.endEarnings) : undefined,
    drop: next ? money(next.drop) : undefined,
    exit: ev.personal.escapeEarnings === null ? undefined : inUnit(ev.personal.escapeEarnings),
    leap: ev.personal.raiseToClear === null ? undefined : inUnit(ev.personal.raiseToClear),
    top: inUnit(ev.curve.points[ev.curve.points.length - 1].earnings),
  };
  const shape = a.verdict === "in_danger_zone" && ev.personal.raiseIsLowerBound ? "in_danger_zone:stuck" : a.verdict;
  return VERDICT[shape](slots);
}
