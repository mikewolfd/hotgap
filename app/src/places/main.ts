// The places surface (design/journalist.html made real): the committed sweep
// read once from /data/summary.json, filtered by household, measure and
// table order, with one selected state whose corrections open under the map.
// The view lives in the query string so a link lands on exactly it.
import "../../../design/tokens.css";
import "./places.css";
import type { SummaryJson } from "@hotgap/core";
import { csvFor, csvName } from "./csv.js";
import { capitalize, esc, word } from "./format.js";
import { archLabel, group, MEASURES, measureByKey, PREFERRED_HOUSEHOLD, rowsFor, type SortKey, type StateRow } from "./model.js";
import { $, applySelection, renderDetail, renderFigure, renderMethod, renderMethodSource, renderRank, renderTable, type Scene } from "./render.js";
import { tileNeighbor } from "./tiles.js";
import { parseView, viewQuery, type View } from "./url.js";

async function load(): Promise<SummaryJson> {
  const res = await fetch("/data/summary.json");
  if (!res.ok) throw new Error(`summary.json: HTTP ${res.status}`);
  return res.json() as Promise<SummaryJson>;
}

function main(summary: SummaryJson): void {
  const arches = summary.archetypes;
  const states = Object.keys(summary.states).sort();
  let view: View = parseView(location.search, {
    households: arches.map((a) => a.id),
    states,
    defaultHousehold: arches.some((a) => a.id === PREFERRED_HOUSEHOLD) ? PREFERRED_HOUSEHOLD : arches[0].id,
  });
  let scene: Scene;
  /** The table's rows in the order shown — what the CSV and the row keys walk. */
  let tableOrder: StateRow[] = [];

  /* Everything that is the same for every view, once. */
  $<HTMLSelectElement>("arch").innerHTML = arches.map((a) => `<option value="${a.id}">${esc(archLabel(a))}</option>`).join("");
  $<HTMLSelectElement>("metric").innerHTML = MEASURES.map((m) => `<option value="${m.key}">${esc(m.option)}</option>`).join("");
  $("archCount").textContent = word(arches.length);
  $("stateCount").textContent = capitalize(word(states.length));
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
    scene = { summary, arch, archLabel: archLabel(arch), measure, rows, g: group(rows), sel: view.state };
    renderFigure(scene);
    renderRank(scene);
    tableOrder = renderTable(scene, view.sort);
    renderMethod(scene);
    renderDetail(scene);
  };

  /* Selecting a state rebuilds nothing but the detail block. */
  const select = (st: string) => {
    view = { ...view, state: st };
    scene.sel = st;
    applySelection(st);
    renderDetail(scene);
    writeUrl();
  };

  syncControls();
  render();

  const onChange = (id: string, apply: (value: string) => void) =>
    $<HTMLSelectElement>(id).addEventListener("change", (e) => { apply((e.target as HTMLSelectElement).value); writeUrl(); });
  onChange("arch", (household) => { view = { ...view, household }; render(); });
  onChange("metric", (measure) => { view = { ...view, measure: measure as View["measure"] }; render(); });
  onChange("sort", (sort) => { view = { ...view, sort: sort as SortKey }; tableOrder = renderTable(scene, view.sort); });

  /* The controls: a tile and a table row are both buttons that select their
     state; each group is one tab stop with a roving tabindex (N5), and the
     arrow keys move focus — on the map by geography, in the table by row. */
  const stateOf = (e: Event, selector: string): HTMLButtonElement | null =>
    (e.target as HTMLElement).closest<HTMLButtonElement>(selector);
  const moveFocus = (from: HTMLButtonElement, to: HTMLButtonElement | null | undefined, e: KeyboardEvent) => {
    if (!to) return;
    e.preventDefault();
    from.tabIndex = -1; to.tabIndex = 0; to.focus();
  };

  $("grid").addEventListener("click", (e) => { const b = stateOf(e, ".tile"); if (b) select(b.dataset.st as string); });
  $("grid").addEventListener("keydown", (e) => {
    const b = stateOf(e, ".tile"); if (!b) return;
    const next = tileNeighbor(b.dataset.st as string, e.key);
    if (next) moveFocus(b, $("grid").querySelector<HTMLButtonElement>(`[data-st="${next}"]`), e);
  });

  $("tbody").addEventListener("click", (e) => { const b = stateOf(e, ".hg-row-btn"); if (b) select(b.dataset.st as string); });
  $("tbody").addEventListener("keydown", (e) => {
    const b = stateOf(e, ".hg-row-btn"); if (!b) return;
    const btns = [...$("tbody").querySelectorAll<HTMLButtonElement>(".hg-row-btn")];
    const i = btns.indexOf(b);
    const to = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: btns.length - 1 }[e.key];
    if (to !== undefined) moveFocus(b, btns[to], e);
  });

  $("csvBtn").addEventListener("click", () => {
    const url = URL.createObjectURL(new Blob([csvFor(summary, scene.arch, tableOrder)], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = csvName(scene.arch, summary.generated);
    a.click();
    URL.revokeObjectURL(url);
  });

  const theme = $<HTMLButtonElement>("themeBtn");
  theme.addEventListener("click", () => {
    const dark = document.documentElement.getAttribute("data-theme") === "dark";
    document.documentElement.setAttribute("data-theme", dark ? "light" : "dark");
    theme.textContent = dark ? "Dark" : "Light";
  });
}

load().then((summary) => {
  $("status").hidden = true;
  main(summary);
}).catch((err: unknown) => {
  const status = $("status");
  status.setAttribute("role", "alert");
  status.textContent = `We could not load the weekly sweep (${err instanceof Error ? err.message : String(err)}). Reload to try again.`;
});
