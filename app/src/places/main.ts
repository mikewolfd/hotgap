// The places surface (design/journalist.html made real): the committed run
// read once from /data/summary.json, filtered by household, measure and
// table order, with one selected state whose readout fills beside the map
// and whose corrections open under it. The view lives in the query string
// so a link lands on exactly it.
import "../../../design/tokens.css";
import "./places.css";
import { DEFAULT_ARCHETYPE, provideData, type SummaryJson } from "@hotgap/core";
import { $ } from "../lib/dom.js";
import { copy, t } from "./copy.js";
import { csvFor, csvName } from "./csv.js";
import { archLabel, group, measureByKey, rowsFor, type SortKey, type StateRow } from "./model.js";
import { applySelection, GROUPS, renderCite, renderDetail, renderFigure, renderMethod, renderOnce, renderRank, renderReadout, renderStatic, renderTable, type Scene } from "./render.js";
import { tileNeighbor } from "./tiles.js";
import { parseView, viewQuery, type View } from "./url.js";

async function load(): Promise<SummaryJson> {
  const res = await fetch("/data/summary.json");
  if (!res.ok) throw new Error(t("status.http", { status: res.status }));
  return res.json() as Promise<SummaryJson>;
}

/**
 * The ACS reach ladders, for POSITION — how many families like this one earn
 * less than a figure on the axis (model.ts `positionAt`). Fetched beside the
 * run rather than bundled: 183 KB the other two pages already fetch the same
 * way, against a 384 KB run. A failure is not the page's failure — every
 * position reads null and the figures stand without it — so it is caught here
 * and never reaches the alert line, which is for a run that did not load.
 */
async function loadReach(): Promise<void> {
  try {
    const res = await fetch("/data/reach.json");
    if (res.ok) provideData({ "reach.json": await res.json() });
  } catch { /* positions stay null; nothing else on the page depends on it */ }
}

function main(summary: SummaryJson): void {
  const arches = summary.archetypes;
  const states = Object.keys(summary.states).sort();
  const domain = {
    households: arches.map((a) => a.id),
    states,
    // core's default, when the run carries it; the file's first archetype otherwise.
    defaultHousehold: arches.some((a) => a.id === DEFAULT_ARCHETYPE) ? DEFAULT_ARCHETYPE : arches[0].id,
  };
  let view: View = parseView(location.search, domain);
  let scene: Scene;
  /** The table's rows in the order shown — what the CSV and the row keys walk. */
  let tableOrder: StateRow[] = [];

  renderOnce(summary);

  const syncControls = () => {
    $<HTMLSelectElement>("arch").value = view.household;
    $<HTMLSelectElement>("metric").value = view.measure;
    $<HTMLSelectElement>("sort").value = view.sort;
  };
  /* The address of this view, for the bar and the Cite line: the page's own
     origin and path, never typed. Filter changes replace the entry (N1,
     declined: history spam makes Back useless for leaving); selecting a
     state pushes one, so Back from a shared deep link returns to the
     unselected view — the one undo a person expects. */
  const viewUrl = () => `${location.origin}${location.pathname}${viewQuery(view)}`;
  const writeUrl = (push = false) => {
    history[push ? "pushState" : "replaceState"](null, "", viewQuery(view));
    renderCite(summary, viewUrl());
  };

  /* A full pass: O(states log states) for the ranking and the table's order, O(states) for the rest. */
  const render = () => {
    const arch = arches.find((a) => a.id === view.household)!;
    const measure = measureByKey(view.measure)!;
    const rows = rowsFor(summary, arch, measure);
    scene = { summary, arch, archLabel: archLabel(arch), measure, rows, g: group(rows, measure), sel: view.state };
    renderFigure(scene);
    renderReadout(scene);
    renderRank(scene);
    tableOrder = renderTable(scene, view.sort);
    renderMethod(scene);
    renderDetail(scene);
    swipeHint();
  };

  /* Selecting a state rebuilds nothing but the readout and the detail block,
     and moves nothing: the readout beside the map is the answer, the control
     keeps aria-current and focus stays on it (rerun S1 — the jump to the
     block, ~1,200px down, read as leaving the page and cost a scroll-back
     per state compared). The readout's "Details below" link is the opt-in
     jump: it scrolls the block into view and hands focus to its heading. */
  const select = (st: string) => {
    view = { ...view, state: st };
    scene.sel = st;
    applySelection(st);
    renderReadout(scene);
    renderDetail(scene);
    writeUrl(true);
  };
  $("readout").addEventListener("click", (e) => {
    if (!(e.target as HTMLElement).closest('a[href="#stateTitle"]')) return;
    e.preventDefault();
    const heading = $("stateTitle");
    heading.scrollIntoView({ block: "start" });
    heading.focus();
  });

  /* The table's scroller says when there is more to the side (S10): the
     system draws the edge fade; the words are this page's. Re-read when the
     column changes width, which the observer sees and a resize event may not. */
  const scroller = $("scroller");
  const swipeHint = () => {
    if (scroller.scrollWidth > scroller.clientWidth) scroller.dataset.more = copy.table.swipe; else delete scroller.dataset.more;
  };
  // Next frame, not inside the delivery: the hint changes the scroller's own height.
  new ResizeObserver(() => requestAnimationFrame(swipeHint)).observe(scroller);

  syncControls();
  render();
  renderCite(summary, viewUrl());
  $("main").hidden = false;

  const onChange = (id: string, apply: (value: string) => void) =>
    $<HTMLSelectElement>(id).addEventListener("change", (e) => { apply((e.target as HTMLSelectElement).value); writeUrl(); });
  onChange("arch", (household) => { view = { ...view, household }; render(); });
  onChange("metric", (measure) => { view = { ...view, measure: measure as View["measure"] }; render(); });
  onChange("sort", (sort) => { view = { ...view, sort: sort as SortKey }; tableOrder = renderTable(scene, view.sort); });
  /* Back from a pushed selection: the view the URL names, rendered whole. */
  window.addEventListener("popstate", () => {
    view = parseView(location.search, domain);
    syncControls();
    render();
  });

  /* The controls: a tile, a rank row and a table row are all buttons that
     select their state; each group is one tab stop with a roving tabindex
     (N5), and the arrow keys move focus — on the map by geography, in the
     lists by row. */
  const stateOf = (e: Event): HTMLButtonElement | null => (e.target as HTMLElement).closest<HTMLButtonElement>("button[data-st]");
  const moveFocus = (from: HTMLButtonElement, to: HTMLButtonElement | null | undefined, e: KeyboardEvent) => {
    if (!to) return;
    e.preventDefault();
    from.tabIndex = -1; to.tabIndex = 0; to.focus();
  };
  for (const id of GROUPS) {
    $(id).addEventListener("click", (e) => { const b = stateOf(e); if (b) select(b.dataset.st as string); });
    $(id).addEventListener("keydown", (e) => {
      const b = stateOf(e); if (!b) return;
      if (id === "grid") {
        const next = tileNeighbor(b.dataset.st as string, e.key);
        if (next) moveFocus(b, $(id).querySelector<HTMLButtonElement>(`[data-st="${next}"]`), e);
        return;
      }
      const btns = [...$(id).querySelectorAll<HTMLButtonElement>("button[data-st]")];
      const i = btns.indexOf(b);
      const to = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: btns.length - 1 }[e.key];
      if (to !== undefined) moveFocus(b, btns[to], e);
    });
  }

  $("csvBtn").addEventListener("click", () => {
    const url = URL.createObjectURL(new Blob([csvFor(summary, scene.arch, tableOrder)], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = csvName(scene.arch, summary.generated);
    a.click();
    URL.revokeObjectURL(url);
  });
}

renderStatic();
/* Both files before the first render, so no figure is drawn without its
   positions and then redrawn with them. */
Promise.all([load(), loadReach()]).then(([summary]) => {
  $("status").hidden = true;
  main(summary);
}).catch((err: unknown) => {
  const status = $("status");
  status.setAttribute("role", "alert");
  status.textContent = t("status.failed", { reason: err instanceof Error ? err.message : String(err) });
});
