// The citizen result, minimal on purpose: the verdict sentence (the catalog
// in design/inventory.md § Verdict catalog, slots in the person's own unit)
// and the SourceNote (§ SourceNote, with its archetype state). The citizen
// surface proper — the curve, the StepList, reach — mounts here in place of
// this; the seam it keeps is `render(evaluation, flags)`.
import { DEFAULT_HOURS, type HouseholdEvaluation, type HouseholdFlags, type PayUnit } from "@hotgap/core";
import type { EvaluateResult } from "../editor/api.js";
import { money, payPhrase } from "../lib/format.js";

const text = {
  loading: (count: number) => `Doing the math… We check your help at ${count} pay levels. This can take a few seconds.`,
  errorTitle: "We could not get your answer.",
  errors: {
    timeout: "The math service did not reply. Your answers were not saved. Please try again in a minute.",
    rate_limited: "You have asked a few times in a row. Please wait a minute and try again.",
    busy: "The math service is busy right now. Please try again in a few seconds.",
    other: "The math service did not reply. Your answers were not saved. Please try again in a minute.",
  },
  tryAgain: "Try again",
  sourceLive: "Estimates only. These are your own numbers, from public rules. A caseworker decides real benefits.",
  sourceArchetype: "We could not get your exact numbers right now. These are numbers for a family like yours in your state.",
  clamped: (top: string) => `Your pay is above the range we checked. These numbers are for ${top}, the top of that range.`,
};

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

export interface Result {
  /** Nothing to show: the page went back to a bare URL. */
  clear(): void;
  loading(count: number): void;
  render(ev: HouseholdEvaluation, flags: HouseholdFlags): void;
  error(result: Extract<EvaluateResult, { ok: false }>): void;
}

export function mountResult(root: HTMLElement, onTryAgain: () => void): Result {
  const status = document.createElement("p");
  status.className = "hg-source";
  status.setAttribute("role", "status");
  const answer = document.createElement("p");
  answer.className = "answer";
  answer.id = "answer";
  answer.tabIndex = -1;
  const source = document.createElement("p");
  source.className = "hg-source";
  source.id = "source";
  const retry = document.createElement("button");
  retry.type = "button";
  retry.className = "hg-button hg-button--small";
  retry.textContent = text.tryAgain;
  retry.addEventListener("click", onTryAgain);
  const alert = document.createElement("div");
  alert.className = "hg-callout hg-callout--caution";
  alert.setAttribute("role", "alert");
  alert.hidden = true;
  root.append(status, answer, source, alert);

  return {
    clear() {
      status.textContent = "";
      answer.textContent = "";
      source.replaceChildren();
      delete source.dataset.source;
      alert.hidden = true;
    },
    loading(count) {
      alert.hidden = true;
      status.textContent = text.loading(count);
    },
    render(ev, flags) {
      status.textContent = "";
      alert.hidden = true;
      const unit = (flags.unit ?? "hour") as PayUnit;
      answer.textContent = verdictSentence(ev, unit, flags.hours ? Number(flags.hours) : undefined);
      const clamped = ev.analysis.currentEarnings !== ev.answers.annualEarnings;
      source.replaceChildren(
        ev.source === "live" ? text.sourceLive : text.sourceArchetype,
        ...(clamped ? [" ", text.clamped(payPhrase(ev.analysis.currentEarnings, unit))] : []),
        ...(ev.source === "archetype" ? [retry] : []),
      );
      source.dataset.source = ev.source;
    },
    error(result) {
      status.textContent = "";
      const body = result.error === "timeout" ? text.errors.timeout
        : result.error === "rate_limited" ? text.errors.rate_limited
        : result.error === "busy" ? text.errors.busy : text.errors.other;
      const strong = document.createElement("strong");
      strong.textContent = text.errorTitle;
      alert.replaceChildren(strong, " ", body, " ", retry);
      alert.hidden = false;
    },
  };
}
