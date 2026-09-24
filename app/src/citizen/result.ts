// The citizen result, picture first (design/PICTURE-FIRST-2026-09-18.md):
// one sentence, then the figure, then everything else behind three named
// disclosures. The sentence is the figure's own <figcaption>, so the answer
// and the picture are one object and nothing stands between the masthead and
// them; the MoneyCurve, its readout, its key and its caption are the figure's
// (chart.ts); the StepList, the boundary and the DataTable are behind "What
// happens at each step"; the assumed rows, reach and the lowest legal pay
// behind "What we assumed about you"; the SourceNote and the estimates footer
// behind "Where these numbers come from".
//
// What never hides (inventory.md § The page is its picture): the status
// region, the archetype notice with its Try again, the incomplete-state
// caution and the error callout. They sit above the figure, and on a page
// where nothing is wrong they are empty and cost nothing.
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
import { flagList, pickArchetypeId, type Cliff, type HouseholdEvaluation, type HouseholdFlags, type SummaryJson } from "@hotgap/core";
import type { EvaluateResult } from "../editor/api.js";
import { h } from "../lib/dom.js";
import { pageHref } from "../lib/nav.js";
import { mountChart, type Chart } from "./chart.js";
import { copy, t } from "./copy.js";
import { assumedRows, boundaryText, creditCounted, hoursText, incompleteText, provenanceText, reachSourceText, reachText, sweepFor, whoText, type Sweep } from "./facts.js";
import { sceneOf, type Scene } from "./model.js";
import { stepLoss, stepRows, stepSentence } from "./steps.js";
import { tableRows } from "./table.js";
import { againText, keepNextText, verdictParts, verdictText } from "./verdict.js";

export interface Result {
  /** Nothing to show: the page went back to a bare URL. */
  clear(): void;
  loading(count: number): void;
  /**
   * Render an evaluation; `announce` reads the new sentence to the status
   * region for a change made without moving focus; `retry` says Try again
   * asked for it, so a still-archetype answer says so and keeps focus there.
   */
  render(ev: HouseholdEvaluation, flags: HouseholdFlags, opts?: { announce?: boolean; retry?: boolean }): void;
  error(result: Extract<EvaluateResult, { ok: false }>): void;
}

/** The sweep's summary (coverage, vintages, model), fetched once, for the provenance lines; null until it arrives or if it never does. */
let summaryPromise: Promise<SummaryJson | null> | null = null;
function loadSummary(): Promise<SummaryJson | null> {
  return (summaryPromise ??= fetch("/data/summary.json").then((r) => (r.ok ? (r.json() as Promise<SummaryJson>) : null)).catch(() => null));
}

/**
 * One of the page's named disclosures: closed by default, open on paper, its
 * content in the DOM throughout. The summary carries the heading, so the
 * page still has an outline for a screen reader that navigates by heading.
 */
const panel = (id: string, heading: string, ...body: (Node | string | null | undefined)[]): HTMLDetailsElement =>
  h("details", { class: "hg-disclosure", id }, h("summary", {}, h("h2", {}, heading)),
    ...body.filter((n): n is Node | string => n !== null && n !== undefined)) as HTMLDetailsElement;

export function mountResult(root: HTMLElement, onTryAgain: () => void): Result {
  const status = h("p", { class: "hg-source", role: "status" });
  /* Paper has no ScenarioBar: the wordmark and who the numbers are for, print only (S2). */
  const masthead = h("p", { class: "hg-print-only masthead" });
  /* Whose numbers these are (S5, M4) — above the figure, with its own Try again, because a page must never
     quietly show one family's curve as another's. Standing text, so not the status region, which announces. */
  const whose = h("p", { class: "hg-callout hg-callout--caution whose", id: "whose", hidden: true });
  /* IncompleteMarker (#16): what the model cannot compute in this state that could move this household. A
     caution about the picture stays with the picture and never goes behind a disclosure (§ The page is its picture). */
  const incomplete = h("div", { class: "hg-callout hg-callout--caution", id: "incomplete", hidden: true });
  const alert = h("div", { class: "hg-callout hg-callout--caution", role: "alert", hidden: true });
  const body = h("div", { class: "hg-page page" });
  root.append(h("div", { class: "hg-page page notices" }, masthead, status, whose, incomplete, alert), body);

  const retryButton = () => {
    const b = h("button", { type: "button", class: "hg-button hg-button--small" }, t("tryAgain"));
    b.addEventListener("click", onTryAgain);
    return b;
  };

  let chart: Chart | null = null;
  let scene: Scene | null = null;
  let summary: SummaryJson | null = null;
  /** The nodes the sweep's summary refines once it arrives. */
  let provenance: { source: Text; reach: HTMLElement } | null = null;

  function renderProvenance(): void {
    if (!scene) return;
    const sweep: Sweep | null = sweepFor(summary, scene.state);
    if (provenance) {
      provenance.source.data = provenanceText(scene, sweep);
      provenance.reach.textContent = reachSourceText(scene, sweep);
    }
    const text = incompleteText(scene, sweep);
    incomplete.hidden = text === null;
    if (text !== null) incomplete.replaceChildren(h("strong", {}, t("incomplete.lead")), text);
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
      whose.hidden = true;
      incomplete.hidden = true;
      alert.hidden = true;
      clearBody();
    },
    loading(count) {
      alert.hidden = true;
      status.classList.remove("hg-visually-hidden");
      status.textContent = t("loading", { count });
    },
    render(ev, flags, { announce = false, retry = false } = {}) {
      alert.hidden = true;
      clearBody();
      const s = (scene = sceneOf(ev, flags));
      const { m } = s;
      masthead.replaceChildren(h("strong", {}, t("wordmark")), " ", whoText(s));

      // The new sentence is read out for a change made without moving focus;
      // it is already on the page in display size, so the region is not shown twice.
      status.classList.toggle("hg-visually-hidden", announce);
      status.textContent = announce ? verdictText(s) : "";
      /* Whose numbers these are (S5); after a Try again that still could not, it says "still". */
      const archetype = ev.source === "archetype";
      whose.hidden = !archetype;
      let retryBtn: HTMLButtonElement | null = null;
      if (archetype) {
        whose.replaceChildren(t(retry ? "stillArchetype" : "source.archetype"), " ", (retryBtn = retryButton()));
        if (s.clamped) whose.append(" ", t("source.clamped", { top: m.payUnit(s.current) }));
      }

      /* AnswerSentence (#1) as the figure's caption: one sentence, each figure carrying the key of the mark it names. */
      const answer = h("figcaption", { class: "hg-answer", id: "answer", tabindex: "-1" },
        ...verdictParts(s).map((p) => ("slot" in p && p.key ? h("span", { class: p.key }, p.text) : p.text)));

      /* MoneyCurve (#3) with its readout, key, caption and "How to read this picture" (chart.ts). */
      const figure = h("figure", { class: "hg-picture" }, answer);
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
        /* The steps are behind a disclosure now: a mark opens it before it opens the row inside it (M6). */
        const steps = body.querySelector<HTMLDetailsElement>("#steps-panel");
        if (steps) steps.open = true;
        const row = body.querySelector<HTMLElement>(`#step-${open}`);
        if (!row) return;
        row.setAttribute("aria-current", "true");
        const close = h("button", { type: "button", class: "hg-button hg-button--small" }, t("steps.close"));
        close.addEventListener("click", () => closeRow(true));
        row.querySelector("p")?.append(close);
        row.scrollIntoView({ block: "nearest" });
      };
      chart = mountChart(figure, s, { onActivate: openRow, onEscape: () => closeRow(true) });

      /* DataTable (#15): the marks as numbers, inside the steps panel — the same rows, counted. */
      const rows = tableRows(s);
      const table = h("table", { class: "hg-table", id: "numbers" },
        h("caption", {}, t("table.caption")),
        h("thead", {}, h("tr", {}, h("th", { scope: "col", class: "num" }, t("table.pay")), h("th", { scope: "col", class: "num" }, t("table.keep")),
          h("th", { scope: "col", class: "num" }, t("table.drop")), h("th", { scope: "col" }, t("table.mark")))),
        h("tbody", {}, ...rows.map((r) => h("tr", {}, h("td", { class: "num" }, m.pay(r.at)), h("td", { class: "num money" }, m.money(r.keep)),
          h("td", { class: "num" }, r.drop ? t("table.dropCell", { drop: m.money(r.drop) }) : ""), h("td", {}, r.mark)))));
      const numbers = h("details", { class: "hg-disclosure" }, h("summary", {}, t("table.show")), h("div", { class: "hg-scroll-x" }, table));

      /* StepList (#6): one row per threshold; a row is the card a mark opens (M6). A loss that lands at a later renewal
         is a row like any other with the DeferredBadge (#10); its clause is in the sentence. */
      const steps = stepRows(s);
      const stepList = h("ul", { class: "hg-rows", id: "steps" }, ...steps.map((r) => {
        const p = h("p");
        if (r.waits) p.append(h("span", { class: "hg-badge" }, t("steps.waitsBadge")), " ");
        p.append(stepSentence(s, r));
        const loss = stepLoss(s, r);
        if (loss) p.append(" ", h("span", { class: "hg-rows__loss" }, loss));
        return h("li", { id: `step-${r.at}` }, h("span", { class: "hg-rows__at" }, m.pay(r.at)), p);
      }));

      /* EligibilityBoundary (#23): where a program this household may not have stops. Three facts, never a drop, so it
         sits at the end of the steps and not among them; the invitation to the toggle stays off paper (liheap review S2). */
      const boundary = boundaryText(s);
      const boundaryP = boundary
        ? h("p", { class: "boundary", id: "boundary", "data-counted": s.boundary?.counted ? "true" : creditCounted(s) ? "credit" : "false" },
          boundary.facts, ...(boundary.invite ? [" ", h("span", { class: "hg-no-print" }, boundary.invite)] : []))
        : null;

      /* What we assumed (S6), reach, hours. */
      const assumed = h("ul", { class: "hg-rows assumed" }, ...assumedRows(s).map((f) => h("li", {}, h("span", { class: "hg-rows__at" }, f.label), h("p", {}, f.text))));
      const reach = reachText(s);
      const reachSource = h("p", { class: "hg-source" });
      const hours = hoursText(s);

      /* SourceNote (#17), with the archetype state on the line as well as in the notice above the figure. */
      const sourceText = document.createTextNode("");
      const source = h("p", { class: "hg-source", id: "source", "data-source": ev.source }, sourceText);
      const keepNext = keepNextText(s);
      const againLine = againText(s);

      /* The next place to look: this state beside the others, on /places, for the nearest of its eleven households. */
      const household = pickArchetypeId({ married: flags.married === true, childAges: flagList(flags.kids).map(Number), spouseAnnualEarnings: Number(flags["spouse-earnings"] ?? 0) });
      const toPlaces = h("p", { class: "next hg-no-print" },
        h("a", { href: pageHref("places", new URLSearchParams({ household, state: s.state })) }, t("toPlaces", { state: s.stateName })));

      body.append(figure, toPlaces,
        panel("steps-panel", t("steps.heading"),
          h("p", {}, t("steps.lead")),
          keepNext ? h("p", { id: "keep-next" }, keepNext) : null,
          steps.length ? stepList : h("p", {}, t("steps.none")),
          againLine ? h("p", { id: "again" }, againLine) : null,
          boundaryP, numbers),
        panel("assumed-panel", t("assumed.heading"),
          h("p", {}, t("assumed.lead")), assumed,
          reach ? h("h3", {}, t("reach.heading")) : null,
          reach ? h("p", {}, reach) : null,
          reach ? h("p", {}, t("reach.note")) : null,
          reach ? reachSource : null,
          hours ? h("h3", {}, t("hours.heading")) : null,
          hours ? h("p", {}, hours) : null),
        panel("sources-panel", t("source.heading"), source,
          h("p", {}, h("strong", {}, t("footer.estimates")), t("footer.caseworker")),
          h("p", {}, t("footer.assumed", { year: ev.curve.year })),
          h("p", {}, t("footer.noAdvice"))));

      provenance = { source: sourceText, reach: reachSource };
      if (retry) retryBtn?.focus();
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

/* Paper wants every disclosure open: a closed <details> prints nothing, and on
   paper there is nobody to press anything. The figure's own "How to read this
   picture" comes with them, so a printed page carries the key and the caption. */
addEventListener("beforeprint", () => { for (const d of document.querySelectorAll<HTMLDetailsElement>("details.hg-disclosure")) { d.dataset.wasOpen = String(d.open); d.open = true; } });
addEventListener("afterprint", () => { for (const d of document.querySelectorAll<HTMLDetailsElement>("details.hg-disclosure")) { d.open = d.dataset.wasOpen === "true"; delete d.dataset.wasOpen; } });
