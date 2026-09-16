// The citizen result (design/citizen.html made real): the AnswerSentence,
// the MoneyCurve with its readout, key and caption, the SourceNote, the
// DataTable behind "Show the numbers", the StepList a cliff mark opens, the
// deferred callout, what we assumed, reach, hours and the footer — every
// component design/inventory.md assigns to this surface, rendered from one
// HouseholdEvaluation through the pure modules beside this file.
//
// The seam main.ts and the proofs rely on: mountResult(root, onTryAgain) →
// { clear, loading, render(evaluation, flags, { announce }), error }, with
// [role=status], #answer (tabindex -1), #source[data-source] and the
// [role=alert] callout (app/README.md § The editor).
//
// A render is O(points × programs) once, in sceneOf, then O(points in the
// window) for the line and O(cliffs) for everything else; a chip toggle
// re-renders the whole result from the new evaluation, which is the cheap
// and correct thing at 151–231 points.
import type { Cliff, HouseholdEvaluation, HouseholdFlags, SummaryJson } from "@hotgap/core";
import type { EvaluateResult } from "../editor/api.js";
import { h } from "../lib/dom.js";
import { mountChart, type Chart } from "./chart.js";
import { copy, t } from "./copy.js";
import { assumedRows, hoursText, incompleteText, provenanceText, reachSourceText, reachText, subText, sweepFor, type Sweep } from "./facts.js";
import { sceneOf, type Scene } from "./model.js";
import { stepLoss, stepRows, stepSentence, waitsText } from "./steps.js";
import { tableRows } from "./table.js";
import { againText, verdictParts, verdictText } from "./verdict.js";

export interface Result {
  /** Nothing to show: the page went back to a bare URL. */
  clear(): void;
  loading(count: number): void;
  /** Render an evaluation; `announce` reads the new sentence to the status region for a change made without moving focus. */
  render(ev: HouseholdEvaluation, flags: HouseholdFlags, opts?: { announce?: boolean }): void;
  error(result: Extract<EvaluateResult, { ok: false }>): void;
}

/** The sweep's summary (coverage, vintages, model), fetched once, for the provenance lines; null until it arrives or if it never does. */
let summaryPromise: Promise<SummaryJson | null> | null = null;
function loadSummary(): Promise<SummaryJson | null> {
  return (summaryPromise ??= fetch("/data/summary.json").then((r) => (r.ok ? (r.json() as Promise<SummaryJson>) : null)).catch(() => null));
}

const section = (heading: string, ...body: (Node | null | undefined)[]) => h("section", {}, h("h2", {}, heading), ...body);

export function mountResult(root: HTMLElement, onTryAgain: () => void): Result {
  const status = h("p", { class: "hg-source", role: "status" });
  const answer = h("p", { class: "answer", id: "answer", tabindex: "-1" });
  const again = h("p", { class: "answer-sub", hidden: true });
  const sub = h("p", { class: "answer-sub" });
  const alert = h("div", { class: "hg-callout hg-callout--caution", role: "alert", hidden: true });
  const body = h("div", { class: "page" });
  root.append(h("section", { class: "band" }, h("div", { class: "page" }, status, answer, again, sub, alert)), body);

  const retryButton = () => {
    const b = h("button", { type: "button", class: "hg-button hg-button--small" }, t("tryAgain"));
    b.addEventListener("click", onTryAgain);
    return b;
  };

  let chart: Chart | null = null;
  let scene: Scene | null = null;
  let summary: SummaryJson | null = null;
  /** The nodes the sweep's summary refines once it arrives. */
  let provenance: { source: Text; reach: HTMLElement; incomplete: HTMLElement } | null = null;

  function renderProvenance(): void {
    if (!scene || !provenance) return;
    const sweep: Sweep | null = sweepFor(summary, scene.state);
    provenance.source.data = provenanceText(scene, sweep);
    provenance.reach.textContent = reachSourceText(scene, sweep);
    const incomplete = incompleteText(scene, sweep);
    provenance.incomplete.hidden = incomplete === null;
    if (incomplete !== null) provenance.incomplete.replaceChildren(h("strong", {}, t("incomplete.lead")), incomplete);
  }

  function clearBody(): void {
    chart?.destroy();
    chart = null;
    scene = null;
    provenance = null;
    body.replaceChildren();
  }

  return {
    clear() {
      status.textContent = "";
      answer.textContent = "";
      again.hidden = true;
      sub.textContent = "";
      alert.hidden = true;
      clearBody();
    },
    loading(count) {
      alert.hidden = true;
      status.classList.remove("hg-visually-hidden");
      status.textContent = t("loading", { count });
    },
    render(ev, flags, { announce = false } = {}) {
      alert.hidden = true;
      clearBody();
      const s = (scene = sceneOf(ev, flags));
      const { m } = s;

      /* AnswerSentence (#1): each figure carries the key of the mark it names. */
      answer.replaceChildren(...verdictParts(s).map((p) => ("slot" in p && p.key ? h("span", { class: p.key }, p.text) : p.text)));
      // The new sentence is read out for a change made without moving focus;
      // it is already on the page in display size, so the region is not shown twice.
      status.classList.toggle("hg-visually-hidden", announce);
      status.textContent = announce ? verdictText(s) : "";
      const againLine = againText(s);
      again.hidden = againLine === null;
      again.textContent = againLine ?? "";
      sub.textContent = subText(s);

      /* MoneyCurve (#3) with its readout, key, caption and the SourceNote (#17). */
      const figure = h("figure");
      let open: number | null = null;
      const closeRow = (refocus: boolean) => {
        if (open === null) return;
        const row = body.querySelector(`#step-${open}`);
        row?.removeAttribute("aria-current");
        row?.querySelector(".hg-button")?.remove();
        chart?.setOpen(null);
        const was = open;
        open = null;
        if (refocus) chart?.focusMark(was);
      };
      const openRow = (cliff: Cliff) => {
        closeRow(false);
        open = cliff.endEarnings;
        chart?.setOpen(open);
        const row = body.querySelector<HTMLElement>(`#step-${open}`);
        if (!row) return;
        row.setAttribute("aria-current", "true");
        const close = h("button", { type: "button", class: "hg-button hg-button--small" }, t("steps.close"));
        close.addEventListener("click", () => closeRow(true));
        row.querySelector("p")?.append(close);
        row.scrollIntoView({ block: "nearest" });
      };
      chart = mountChart(figure, s, { onActivate: openRow, onEscape: () => closeRow(true) });
      const sourceText = document.createTextNode("");
      const source = h("p", { class: "hg-source", id: "source", "data-source": ev.source });
      if (ev.source === "archetype") {
        source.append(t("source.archetype"), retryButton());
        if (s.clamped) source.append(t("source.clamped", { top: m.payUnit(s.current) }));
        source.append(h("br"));
      }
      source.append(sourceText);
      figure.append(source);

      /* DataTable (#15): the marks as numbers. */
      const rows = tableRows(s);
      const table = h("table", { class: "hg-table", id: "numbers" },
        h("caption", {}, t("table.caption")),
        h("thead", {}, h("tr", {}, h("th", { scope: "col", class: "num" }, t("table.pay")), h("th", { scope: "col", class: "num" }, t("table.keep")),
          h("th", { scope: "col", class: "num" }, t("table.drop")), h("th", { scope: "col" }, t("table.mark")))),
        h("tbody", {}, ...rows.map((r) => h("tr", {}, h("td", { class: "num" }, m.money(r.at)), h("td", { class: "num money" }, m.money(r.keep)),
          h("td", { class: "num" }, r.drop ? "−" + m.money(r.drop) : ""), h("td", {}, r.mark)))));
      const numbers = h("details", { class: "hg-disclosure" }, h("summary", {}, t("table.show")), h("div", { class: "hg-scroll-x" }, table));

      /* StepList (#6): one row per threshold; a row is the card a mark opens (M6). */
      const steps = stepRows(s);
      const stepList = h("ul", { class: "hg-rows", id: "steps" }, ...steps.map((r) => {
        const p = h("p");
        if (r.cliff?.deferral) p.append(h("span", { class: "hg-badge" }, t("steps.waitsBadge")), " ");
        p.append(stepSentence(s, r));
        const loss = stepLoss(s, r);
        if (loss) p.append(" ", h("span", { class: "hg-rows__loss" }, loss));
        return h("li", { id: `step-${r.at}` }, h("span", { class: "hg-rows__at" }, m.pay(r.at)), p);
      }));
      const waits = waitsText(s);
      const waitsBox = waits && h("div", { class: "hg-callout hg-callout--note" }, h("h3", {}, waits.head), ...waits.body.map((x) => h("p", {}, x)), h("p", {}, waits.foot));
      const incomplete = h("div", { class: "hg-callout hg-callout--caution", id: "incomplete", hidden: true });

      /* What we assumed (S6), reach, hours, footer. */
      const assumed = h("ul", { class: "hg-rows assumed" }, ...assumedRows(s).map((f) => h("li", {}, h("span", { class: "hg-rows__at" }, f.label), h("p", {}, f.text))));
      const reach = reachText(s);
      const reachSource = h("p", { class: "hg-source" });
      const hours = hoursText(s);
      const theme = h("button", { type: "button", class: "hg-button hg-no-print", id: "themeBtn" });
      const isDark = () => getComputedStyle(document.documentElement).colorScheme.includes("dark");
      const nameTheme = () => { theme.textContent = isDark() ? t("theme.light") : t("theme.dark"); };
      nameTheme();
      theme.addEventListener("click", () => { document.documentElement.setAttribute("data-theme", isDark() ? "light" : "dark"); nameTheme(); });

      body.append(...([
        figure, numbers,
        section(t("steps.heading"), steps.length ? stepList : h("p", {}, t("steps.none")), waitsBox),
        incomplete,
        section(t("assumed.heading"), assumed),
        reach ? section(t("reach.heading"), h("p", {}, reach), h("p", {}, t("reach.note")), reachSource) : null,
        hours ? section(t("hours.heading"), h("p", {}, hours)) : null,
        h("footer", {},
          h("p", {}, h("strong", {}, t("footer.estimates")), t("footer.caseworker")),
          h("p", {}, t("footer.assumed", { year: ev.curve.year })),
          h("p", {}, t("footer.noAdvice")),
          h("p", { class: "hg-no-print" }, theme)),
      ] as (Node | null)[]).filter((n): n is Node => n !== null));
      provenance = { source: sourceText, reach: reachSource, incomplete };
      renderProvenance();
      if (!summary) void loadSummary().then((json) => { summary = json; renderProvenance(); });
    },
    error(result) {
      status.textContent = "";
      const detail = result.error === "rate_limited" ? copy.errors.rate_limited : result.error === "busy" ? copy.errors.busy : copy.errors.other;
      alert.replaceChildren(h("strong", {}, t("errorTitle")), " ", detail, " ", retryButton());
      alert.hidden = false;
    },
  };
}

/* Paper wants the numbers open: a closed <details> prints nothing. */
addEventListener("beforeprint", () => { for (const d of document.querySelectorAll<HTMLDetailsElement>("details.hg-disclosure")) { d.dataset.wasOpen = String(d.open); d.open = true; } });
addEventListener("afterprint", () => { for (const d of document.querySelectorAll<HTMLDetailsElement>("details.hg-disclosure")) { d.open = d.dataset.wasOpen === "true"; delete d.dataset.wasOpen; } });
