// The places surface (design/journalist.html made real): the committed sweep
// read once from /data/summary.json, filtered by household, measure and
// table order, with one selected state whose corrections open under the map.
// The view lives in the query string so a link lands on exactly it.
import "../../../design/tokens.css";
import "./places.css";
import { DEFAULT_ARCHETYPE, type SummaryJson } from "@hotgap/core";
import { $ } from "../lib/dom.js";
import { capitalize, esc } from "../lib/format.js";
import { csvFor, csvName } from "./csv.js";
import { word } from "./format.js";
import { archLabel, group, MEASURES, measureByKey, rowsFor, type SortKey, type StateRow } from "./model.js";
import { applySelection, GROUPS, renderDetail, renderFigure, renderMethod, renderMethodSource, renderRank, renderTable, type Scene } from "./render.js";
import { tileNeighbor } from "./tiles.js";
import { parseView, viewQuery, type View } from "./url.js";

async function load(): Promise<SummaryJson> {
  const res = await fetch("/data/summary.json");
  if (!res.ok) throw new Error(`the data file answered HTTP ${res.status}`);
  return res.json() as Promise<SummaryJson>;
}

function main(summary: SummaryJson): void {
  const arches = summary.archetypes;
  const states = Object.keys(summary.states).sort();
  let view: View = parseView(location.search, {
    households: arches.map((a) => a.id),
    states,
    // core's default, when the sweep carries it; the file's first archetype otherwise.
    defaultHousehold: arches.some((a) => a.id === DEFAULT_ARCHETYPE) ? DEFAULT_ARCHETYPE : arches[0].id,
  });
  let scene: Scene;
  /** The table's rows in the order shown — what the CSV and the row keys walk. */
  let tableOrder: StateRow[] = [];

  /* Everything that is the same for every view, once. The counted sentence
     of the lede is written whole, from the data (S6): a skeleton with holes
     is not a sentence. */
  $<HTMLSelectElement>("arch").innerHTML = arches.map((a) => `<option value="${a.id}">${esc(archLabel(a))}</option>`).join("");
  $<HTMLSelectElement>("metric").innerHTML = MEASURES.map((m) => `<option value="${m.key}">${esc(m.option)}</option>`).join("");
  $("ledeCount").textContent = `${capitalize(word(states.length))} sets of rules, ${word(arches.length)} household shapes, one axis. `;
  $("tableCount").textContent = String(states.length);
  for (const el of document.querySelectorAll(".year")) el.textContent = summary.year;
  renderMethodSource(summary);

  const syncControls = () => {
    $<HTMLSelectElement>("arch").value = view.household;
    $<HTMLSelectElement>("metric").value = view.measure;
    $<HTMLSelectElement>("sort").value = view.sort;
  };
  /* The URL is left as it came until something changes; then every key is written. */
  const writeUrl = () => history.replaceState(null, "", viewQuery(view));

  /* A full pass: O(states log states) for the ranking, O(states) for the rest. */
  const render = () => {
    const arch = arches.find((a) => a.id === view.household)!;
    const measure = measureByKey(view.measure)!;
    const rows = rowsFor(summary, arch, measure);
    scene = { summary, arch, archLabel: archLabel(arch), measure, rows, g: group(rows, measure), sel: view.state };
    renderFigure(scene);
    renderRank(scene);
    tableOrder = renderTable(scene, view.sort);
    renderMethod(scene);
    renderDetail(scene);
  };

  /* Selecting a state rebuilds nothing but the detail block. From the
     table, a viewport or more below the block it drives, the page also takes
     the reader there and hands focus to its heading (S1) — the rule a chart
     mark follows when it opens its row (charts.md § M6); the row keeps
     aria-current, so the table's tab stop is still that row on the way back. */
  const select = (st: string, from: (typeof GROUPS)[number]) => {
    view = { ...view, state: st };
    scene.sel = st;
    applySelection(st);
    renderDetail(scene);
    writeUrl();
    if (from === "tbody") {
      const heading = $("stateTitle");
      heading.scrollIntoView({ block: "start" });
      heading.focus();
    }
  };

  syncControls();
  render();
  $("main").hidden = false;

  const onChange = (id: string, apply: (value: string) => void) =>
    $<HTMLSelectElement>(id).addEventListener("change", (e) => { apply((e.target as HTMLSelectElement).value); writeUrl(); });
  onChange("arch", (household) => { view = { ...view, household }; render(); });
  onChange("metric", (measure) => { view = { ...view, measure: measure as View["measure"] }; render(); });
  onChange("sort", (sort) => { view = { ...view, sort: sort as SortKey }; tableOrder = renderTable(scene, view.sort); });

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
    $(id).addEventListener("click", (e) => { const b = stateOf(e); if (b) select(b.dataset.st as string, id); });
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

load().then((summary) => {
  $("status").hidden = true;
  main(summary);
}).catch((err: unknown) => {
  const status = $("status");
  status.setAttribute("role", "alert");
  status.textContent = `We could not load the weekly sweep: ${err instanceof Error ? err.message : String(err)}. Reload to try again.`;
});
