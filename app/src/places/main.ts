// The places surface (design/journalist.html made real): the committed run
// read once from /data/summary.json, filtered by household, measure and
// table order, with one selected state whose readout fills beside the map
// and whose corrections open under it. The view lives in the query string
// so a link lands on exactly it.
import "../../../design/tokens.css";
import "./places.css";
import { DEFAULT_ARCHETYPE, provideData, type SummaryJson } from "@hotgap/core";
import stateDefaultsJson from "@hotgap/core/data/state-defaults.json";
import { $ } from "../lib/dom.js";
import { mountFooter } from "../lib/footer.js";
import { finePointer } from "../lib/scroll.js";
import { copy, t } from "./copy.js";
import { curveOrder, loadCurves, renderCurves, renderStateCurve, type Curves } from "./curves.js";
import { csvFor, csvName } from "./csv.js";
import { archLabel, group, measureByKey, rowsFor, twinOf, type SortKey, type StateRow } from "./model.js";
import { applySelection, GROUPS, renderAnswer, renderCite, renderDetail, renderFigure, renderMethod, renderOnce, renderRank, renderReadout, renderStatic, renderTable, type Scene } from "./render.js";
import { tileNeighbor } from "./tiles.js";
import { parseView, viewQuery, type View } from "./url.js";

/* The swept household's rent and care bill (core `answersFor`), which the
   holds line under the answer and the link to the household tool both read:
   24 KB, bundled the way the citizen page bundles it (citizen/facts.ts). */
provideData({ "state-defaults.json": stateDefaultsJson });

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
  /** The current household's curves, once they arrive; a later household's load overtakes an earlier one's. */
  let curves: Curves | null = null;
  const drawCurves = () => {
    const arch = scene.arch;
    curves = null;
    renderStateCurve(null, arch, null);
    void loadCurves(arch.id).then((c) => {
      if (scene.arch !== arch) return;
      curves = c;
      renderCurves(c, arch, view.state, curveOrder(scene.g, scene.measure));
      renderStateCurve(c, arch, view.state);
    });
  };

  renderOnce(summary);
  mountFooter(summary);

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
    /* The household's no-subsidy twin, on the same measure, for the answer's pair (R2). */
    const twin = twinOf(arches, arch);
    scene = { summary, arch, archLabel: archLabel(arch), measure, rows, g: group(rows, measure), sel: view.state, twinRows: twin ? rowsFor(summary, twin, measure) : null };
    renderAnswer(scene);
    renderFigure(scene);
    renderReadout(scene);
    renderRank(scene);
    tableOrder = renderTable(scene, view.sort);
    renderMethod(scene);
    renderDetail(scene);
    swipeHint();
    drawCurves();
  };

  /* Selecting a state rebuilds nothing but the readout under the map and the
     state's own block under that, and moves nothing: the readout IS the map's
     caption, the control keeps aria-current and focus stays on it (rerun S1 —
     the jump to a block ~1,200px down read as leaving the page and cost a
     scroll-back per state compared). Since the picture-first pass there is
     nowhere to jump to: the block is the next thing inside the figure. */
  const select = (st: string) => {
    view = { ...view, state: st };
    scene.sel = st;
    applySelection(st);
    renderReadout(scene);
    renderDetail(scene);
    renderStateCurve(curves, scene.arch, st);
    writeUrl(true);
  };

  /* The table's scroller says when there is more to the side (S10): the
     system draws the edge fade; the words are this page's. Re-read when the
     column changes width, which the observer sees and a resize event may not. */
  const scroller = $("scroller");
  /* The same measurement answers two questions: whether to say there is more
     to the side, and whether the table fits its column — which decides whether
     the scroller may open and let the header stick to the viewport
     (places.css). Measured rather than assumed from the width, because a
     language with longer words makes the same thirteen columns wider. */
  const swipeHint = () => {
    const fits = scroller.scrollWidth <= scroller.clientWidth;
    if (fits) { delete scroller.dataset.more; scroller.dataset.fits = ""; } else { scroller.dataset.more = finePointer() ? copy.table.scroll : copy.table.swipe; delete scroller.dataset.fits; }
  };
  // Next frame, not inside the delivery: the hint changes the scroller's own height.
  new ResizeObserver(() => requestAnimationFrame(swipeHint)).observe(scroller);
  /* A scroller inside a closed disclosure measures zero, so the first real
     measurement is the one taken when the disclosure opens. The observer sees
     that too, but only after layout; asking again on toggle means the swipe
     words and the sticky header are right on the first frame a reader sees. */
  $("everything").addEventListener("toggle", () => requestAnimationFrame(swipeHint));

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

/* Paper wants every disclosure open: a closed <details> prints nothing, and on
   paper there is nobody to press anything. So the printed page is the whole
   page — the map and its key, every state ranked, the table, the method, the
   sources — in the order the screen puts them, which is the proof that folding
   is not deleting (design/inventory.md § The page is its picture). */
addEventListener("beforeprint", () => { for (const d of document.querySelectorAll<HTMLDetailsElement>("details.hg-disclosure")) { d.dataset.wasOpen = String(d.open); d.open = true; } });
addEventListener("afterprint", () => { for (const d of document.querySelectorAll<HTMLDetailsElement>("details.hg-disclosure")) { d.open = d.dataset.wasOpen === "true"; delete d.dataset.wasOpen; } });

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
