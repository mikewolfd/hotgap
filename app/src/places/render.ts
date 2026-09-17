// Rendering: the skeleton's fixed words, the figure (StateTiles, legend, the
// state readout, SourceNote), the RankStrip, the DataTable, the method
// panel's per-view sentences, and the selected state's detail
// (CorrectionsApplied, IncompleteMarker, otherBenefits, SourceNote). Every
// word is copy.ts's; every number is read from the summary; nothing is typed.
import { CLIFF_MIN, type StateCoverage, type SummaryJson } from "@hotgap/core";
import { coreText, limitWords } from "../lib/copy.js";
import { correctionRows } from "../lib/corrections.js";
import { unmodeledName, unmodeledNote } from "../lib/coverage.js";
import { $, fillText } from "../lib/dom.js";
import { dateWords, esc, listOf, listOfItems, modelLine, money } from "../lib/format.js";
import { stateName } from "../lib/names.js";
import { CSV_HEADER } from "./csv.js";
import { copy, t } from "./copy.js";
import { bites, MEASURES, type Archetype, type Grouped, type Measure, type SortKey, type StateRow, tableRows } from "./model.js";
import { TILES, TILE_ORDER } from "./tiles.js";
import { axisLine, binsLine, boundaryCite, boundaryCounted, boundaryFacts, classesLine, cliffCountLine, countedLede, deferredLine, floorTail, hatchedLine, householdLabel, incompleteNote, liheapMethodLine, lowerNote, lowerTitle, noneLine, rankOrdinal, rankRange, rowLabel, stepLine, worstStepLine } from "./words.js";

/** Everything one render pass reads. */
export interface Scene {
  summary: SummaryJson;
  arch: Archetype;
  archLabel: string;
  measure: Measure;
  rows: StateRow[];
  g: Grouped;
  sel: string | null;
}

const name = stateName;
/** A measure's value as the map, the ranking and the caption print it; null is past the axis. */
const value = (v: number | null, m: Measure): string => (v === null ? copy.pastAxis : m.unit === "$" ? money(v) : String(v));
const isCount = (m: Measure): boolean => m.unit === "";
/** The step a figure names: "$38,000 → $39,000". */
const stepWords = (at: number): string => t("rank.step", { from: money(at), to: money(at + STEP) });
/** A table order's name: "…, most first" for a count, "…, largest first" for dollars. */
const orderName = (m: Measure): string => t(`table.order.measure.${isCount(m) ? "count" : "dollars"}`, { title: m.title });
/** The sweep's $1,000 between points, the width of the step a figure names ("$38,000 → $39,000"); core's axisSpec at the archetypes' earnings. */
const STEP = 1000;

/**
 * The one reader of copy's notation: `[text](url "title")` becomes a link,
 * `**strong**` and `*em*` their elements, everything else is escaped. A
 * sentence with a link stays one message.
 */
export function rich(text: string): string {
  return esc(text)
    .replace(/\[([^\]]+)\]\(([^)\s]+)(?: &quot;([^&]*)&quot;)?\)/g, (_, t: string, href: string, title?: string) => `<a href="${href}"${title ? ` title="${title}"` : ""}>${t}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

/** The page's fixed words, from copy.ts into the skeleton, once, before the data is in. */
export function renderStatic(): void {
  document.title = copy.pageTitle;
  const C = copy.table.cols;
  fillText({
    skip: copy.skip, wordmark: copy.wordmark, title: copy.title, ledeFigure: copy.lede.figure, status: copy.status.loading,
    archLabel: copy.filters.household, metricLabel: copy.filters.measure, csvBtn: copy.filters.csv,
    figDesc: copy.figure.description, readout: copy.readout.empty, rankTitle: copy.rank.heading, rankBins: copy.rank.bins,
    sortLabel: copy.table.order.label, sortHint: copy.table.order.hint, colState: C.state, colBiggestLoss: C.biggestLoss, colBiggestLossAt: C.biggestLossAt,
    colDangerWidth: C.dangerWidth, colLeap: C.leap, colSafeExit: C.safeExit, colCliffCount: C.cliffCount, colDeferredCliffCount: C.deferredCliffCount, colFigures: C.figures,
    tableNote: copy.table.note, methodHeading: copy.method.heading, excludesHeading: copy.method.excludes.heading,
  });
  $("glossary").innerHTML = rich(t("lede.glossary", { floor: money(CLIFF_MIN) }));
  /* One sentence per column where the headers are (rerun S3): the measures'
     own `describe`, the step's and the flag's; each header points at its line. */
  const measureDefs = MEASURES.map((m): [string, string, string] => [`col${m.key[0].toUpperCase()}${m.key.slice(1)}`, m.title, m.describe]);
  const defs: [string, string, string][] = [
    measureDefs[0], ["colBiggestLossAt", C.biggestLossAt, copy.table.defs.biggestLossAt], ...measureDefs.slice(1),
    ["colFigures", C.figures, copy.table.defs.figures],
  ];
  $("defs").setAttribute("aria-label", copy.table.defs.label);
  $("defs").innerHTML = defs.map(([id, term, def]) => `<dt>${esc(term)}</dt><dd id="def-${id}">${esc(def)}</dd>`).join("");
  for (const [id] of defs) $(id).setAttribute("aria-describedby", `def-${id}`);
  $("pastAxisNote").innerHTML = rich(copy.method.pastAxisCaution);
  $<HTMLSelectElement>("metric").innerHTML = MEASURES.map((m) => `<option value="${m.key}">${esc(m.option)}</option>`).join("");
  $<HTMLSelectElement>("sort").innerHTML = `<option value="state">${esc(copy.table.order.state)}</option>` +
    MEASURES.map((m) => `<option value="${m.key}">${esc(orderName(m))}</option>`).join("");
}

/** Everything that is the same for every view, once the data is in: the counted lede, the household list, the method panel. */
export function renderOnce(summary: SummaryJson): void {
  const states = Object.keys(summary.states);
  $<HTMLSelectElement>("arch").innerHTML = summary.archetypes.map((a) => `<option value="${a.id}">${esc(householdLabel(a.married, a.id.includes("dual"), a.childAges))}</option>`).join("");
  $("ledeCount").textContent = countedLede(states.length, summary.archetypes.length, states.includes("DC"));
  $("table").textContent = t("table.heading", { n: states.length });
  /* The axis in dollars for the selected household (rerun N9) follows the axis bullet; renderMethod fills it per view. */
  const M = copy.method.items;
  const items = [t("method.items.engine", { year: summary.year }), M.money, t("method.items.household", { year: summary.year }), M.takeUp, M.deferred, M.corrections,
    t("method.items.download", { columns: listOfItems([...CSV_HEADER]) })].map((text) => `<li>${rich(text)}</li>`);
  items.splice(1, 0, `<li id="axisLine"></li>`);
  $("methodList").innerHTML = items.join("");
  /* A gap every state shares is listed once here, never under a state (S8): the `all` entries, one per program. */
  const coverage = summary.coverage ?? {};
  const everywhere = new Map<string, string>();
  for (const st of states) for (const u of coverage[st]?.unmodeled ?? []) if (u.scope === "all" && !everywhere.has(unmodeledName(u))) everywhere.set(unmodeledName(u), unmodeledNote(u));
  /* EligibilityBoundary (#23), once for the page: the served range across the
     blocks, its two states named, and the states where the money is counted. */
  const served = states.flatMap((st) => { const s = coverage[st]?.liheap?.servedShare; return s === null || s === undefined ? [] : [{ state: name(st), share: s }]; }).sort((a, z) => a.share - z.share);
  const counted = states.flatMap((st) => { const c = coverage[st]?.corrections.liheap; return c?.source === "in net income" ? [{ state: name(st), program: c.program }] : []; });
  const liheap = served.length ? [liheapMethodLine(served[0], served[served.length - 1], counted)] : [];
  $("excludes").innerHTML = [copy.method.excludes.inputs, copy.method.excludes.alaskaHawaii, ...liheap, ...[...everywhere].map(([program, note]) => t("method.excludes.everywhere", { program, note }))]
    .map((text) => `<li>${rich(text)}</li>`).join("") + `<li id="unmodSummary"></li>`;
  $("methodSrc").textContent = t("method.source", { date: dateWords(summary.generated), model: modelLine(summary.model) });
}

/* A control's two attributes: `aria-current` says it is the selected state,
   `tabindex="0"` that it is its group's one tab stop — the selected control
   when there is one, the group's first otherwise. Never the same thing:
   the first row on load is a tab stop, not a selection. */
const control = (st: string, sel: string | null, tabbable: string | undefined): string =>
  `${st === sel ? ` aria-current="true"` : ""} tabindex="${st === tabbable ? 0 : -1}"`;

/* The tile's own sentence, for the hover title and the accessible name. */
function tileTitle(r: StateRow, measure: Measure): string {
  const state = name(r.st);
  switch (r.kind) {
    case "incomplete": return t("figure.tile.incomplete", { state, programs: listOf(r.incomplete.map(unmodeledName)) });
    case "none": return t("figure.tile.none", { state });
    case "past": return t("figure.tile.past", { state });
    default: return t("figure.tile.value", { state, value: value(r.value, measure) });
  }
}

/** The figure box: title, sub, the 51 tiles, the ramp scale, the legend and the SourceNote. O(states). */
export function renderFigure(s: Scene): void {
  const { summary, measure, g } = s;
  $("figTitle").textContent = t("figure.title", { measure: measure.title });
  $("figSub").textContent = t("figure.sub", { household: s.archLabel, describe: measure.describe });
  const bins = g.bins.kind === "steps"
    ? t("figure.bins.steps", { lo: value(g.bins.lo, measure), hi: value(g.bins.hi, measure) })
    : classesLine(g.bins.classes.length, g.bins.lo, g.bins.hi);
  /* One class holding nine comparable states in ten explains a near-monochrome map (N11). */
  const share = g.bins.classes.map((c) => g.ranked.filter((r) => g.bins.index(r.value as number) === c.ramp).length);
  const big = share.findIndex((n) => g.ranked.length && n / g.ranked.length >= 0.9);
  const oneClass = big < 0 ? null : g.bins.kind === "classes"
    ? (g.bins.classes[big].lo === g.bins.classes[big].hi
      ? (g.bins.classes[big].lo === 0 ? t("figure.oneClass.countNone", { n: share[big], total: g.ranked.length }) : t("figure.oneClass.countValue", { n: share[big], total: g.ranked.length, value: g.bins.classes[big].lo }))
      : t("figure.oneClass.countRange", { n: share[big], total: g.ranked.length, lo: g.bins.classes[big].lo, hi: g.bins.classes[big].hi }))
    : t("figure.oneClass.dollars", { n: share[big], total: g.ranked.length, lo: value(g.bins.classes[big].lo, measure), hi: value(g.bins.classes[big].hi, measure) });
  $("figSrc").textContent = [
    t("figure.source", { year: summary.year, model: modelLine(summary.model), date: dateWords(summary.generated) }),
    binsLine(bins, g.ranked.length, g.none.length, g.past.length),
    oneClass,
    g.incomplete.length ? hatchedLine(g.incomplete.length, g.programs) : null,
  ].filter((x): x is string => x !== null).join(" ");

  /* Map: one button per state, placed by the cartogram. The selected tile is
     the grid's one tab stop (roving tabindex); when nothing is selected, the
     first tile in reading order is. */
  const byState = new Map(s.rows.map((r) => [r.st, r]));
  const tabbable = s.sel ?? TILE_ORDER.find((st) => byState.has(st));
  const tiles: string[] = [];
  for (const st of TILE_ORDER) {
    const r = byState.get(st);
    if (!r) continue;
    const [row, col] = TILES[st];
    let cls = "tile", style = `grid-row:${row};grid-column:${col}`;
    if (r.kind === "incomplete") cls += " hg-tile--incomplete hg-hatch-incomplete";
    else if (r.kind === "none") cls += " hg-tile--none";
    else if (r.kind === "past") cls += " hg-tile--past";
    else {
      const i = g.bins.index(r.value as number);
      /* Label ink chosen by the fill — the one place text may sit on a colour.
         --ink to bin index 1, --surface from index 2 (S3): the floor is 5.16:1
         light / 4.51:1 dark on bin 1 and 5.37:1 / 5.41:1 on bin 2. */
      style += `;background:var(--loss-${i + 1});color:var(--${i >= 2 ? "surface" : "ink"})`;
    }
    const title = tileTitle(r, measure);
    tiles.push(`<button type="button" class="${cls}" data-st="${st}" style="${style}" ` +
      `title="${esc(title)}" aria-label="${esc(title)}"${control(st, s.sel, tabbable)}>${st}</button>`);
  }
  $("grid").innerHTML = tiles.join("");

  /* The scale draws the classes that exist: five steps with their six bounds
     between them, or a count's classes each labelled with what it holds (S5). */
  const { classes } = g.bins;
  $("scale").innerHTML = classes.map((c) => `<span class="sw" style="background:var(--loss-${c.ramp + 1})"></span>`).join("");
  const labels = $("scaleLabels");
  labels.classList.toggle("classes", g.bins.kind === "classes");
  labels.style.setProperty("--n", String(classes.length));
  labels.innerHTML = g.bins.kind === "steps"
    ? `<span>${value(g.bins.lo, measure)}</span>` + classes.map((c) => `<span>${value(c.hi, measure)}</span>`).join("")
    : classes.map((c) => `<span>${c.lo === c.hi ? c.lo : `${c.lo}–${c.hi}`}</span>`).join("");

  /* The legend outside the ramp: one entry per tile state present, drawn with
     the tile's class, so the entry IS the mark. */
  const legend: string[] = [];
  if (g.none.length) legend.push(`<li><i class="hg-swatch hg-swatch--none"></i>${esc(t("figure.legend.none", { n: g.none.length }))}</li>`);
  if (g.past.length) legend.push(`<li><i class="hg-swatch hg-swatch--past"></i>${esc(t("figure.legend.past", { n: g.past.length }))}</li>`);
  if (g.incomplete.length) legend.push(`<li><i class="hg-swatch hg-swatch--incomplete hg-hatch-incomplete"></i>${esc(t("figure.legend.incomplete", { programs: listOf(g.programs), n: g.incomplete.length }))}</li>`);
  $("legend").innerHTML = legend.join("");
}

/**
 * The state's sentences (B3, B4; rerun B2): the selected measure's figure
 * leads in its own sentence — on the one-step loss that is the worst step
 * itself, with the programs it ends — then the worst step as a second line
 * where it is not the measure, then the county the household rents in. A
 * state with no cliff says what the model found instead, up to the axis it
 * was swept to (rerun S6). The readout under the map and the first lines of
 * the detail block are the same sentences; bold on the state and the figure
 * is the readout's own mark (`.hg-readout b`). Every figure is the row's.
 */
function stateLines(r: StateRow, measure: Measure, cov: StateCoverage | undefined, marked: boolean): string[] {
  const { m } = r;
  const b = (text: string) => (marked ? `<b>${esc(text)}</b>` : esc(text));
  const county = cov?.vintages.county.name ?? null;
  const st = b(name(r.st)), top = money(m.axisTop), renter = esc(county ? t("readout.renter.county", { county }) : copy.readout.renter.unknown);
  const missing = r.incomplete.map(unmodeledName);
  if (m.cliffCount === 0 || m.biggestLossAt === null) return [`${noneLine(st, money(STEP), money(CLIFF_MIN), top, m.deferredCliffCount)} ${renter}`];
  const step = esc(stepWords(m.biggestLossAt)), loss = b(money(m.biggestLoss));
  if (measure.key === "biggestLoss") return [`${stepLine(st, loss, step, m.biggestLossPrograms, missing.map(esc))} ${renter}`];
  const lead = measure.key === "dangerWidth" ? (m.safeExit === null ? t("readout.measure.dangerWidthOpen", { state: st, width: b(money(m.dangerWidth)), top }) : t("readout.measure.dangerWidth", { state: st, width: b(money(m.dangerWidth)) }))
    : measure.key === "leap" ? (m.leapIsLowerBound ? t("readout.measure.leapAtLeast", { state: st, leap: b(money(m.leap)), top }) : t("readout.measure.leap", { state: st, leap: b(money(m.leap)) }))
    : measure.key === "safeExit" ? (m.safeExit === null ? t("readout.measure.safeExitPast", { state: st, top }) : t("readout.measure.safeExit", { state: st, exit: b(money(m.safeExit)) }))
    : measure.key === "cliffCount" ? cliffCountLine(st, m.cliffCount, m.deferredCliffCount)
    : deferredLine(st, m.deferredCliffCount, m.cliffCount);
  const worst = worstStepLine(money(m.biggestLoss), step, m.biggestLossPrograms, missing.map(esc));
  return [lead + (missing.length ? ` ${esc(floorTail(missing))}` : ""), `${worst} ${renter}`];
}

/** The readout beside the map: the selected state's sentences with a link to its block, or how to select one. O(1). */
export function renderReadout(s: Scene): void {
  const el = $("readout");
  const r = s.sel ? s.rows.find((x) => x.st === s.sel) : undefined;
  if (!r) { el.textContent = copy.readout.empty; return; }
  el.innerHTML = `${stateLines(r, s.measure, s.summary.coverage?.[r.st], true).join("<br>")} <a href="#stateTitle">${esc(copy.readout.details)}</a>`;
}

/**
 * The ranked strip: the lower-bound rows first under their own heading (B1),
 * sharing the top ranks the way a tie shares one rank (rerun B1), then the
 * comparable states on a shared axis with their rank counted on from there
 * (N3), then the two lifted-out blocks. On the one-step loss each row also
 * says where its step begins (rerun S5). Each row is a control (S2): the
 * tile is sized to its square, so the ranked list beside the map is the
 * 44px control on a phone, and it is one tab stop with the arrow keys moving
 * by row, like the table. O(states).
 */
export function renderRank(s: Scene): void {
  const { measure, g } = s;
  const R = copy.rank;
  const span = (g.bins.hi - g.bins.lo) || 1;
  const order = [...g.past, ...g.ranked, ...g.none, ...g.incomplete];
  const tabbable = s.sel ?? order[0]?.st;
  const withAt = measure.key === "biggestLoss";
  const rankRow = (r: StateRow, inner: string, v: string, n?: string) => {
    const at = withAt && r.m.biggestLossAt !== null ? t("rank.at", { value: money(r.m.biggestLossAt) }) : "";
    return `<li><button type="button" class="hg-row-btn" data-st="${r.st}" aria-label="${esc(rowLabel(n ?? "", name(r.st), v, at || undefined))}"` +
      `${control(r.st, s.sel, tabbable)}>${n === undefined ? "" : `<span class="n">${esc(n)}</span>`}<span class="st">${r.st}</span>` +
      `<span class="track">${inner}</span><span class="v">${esc(v)}${at ? ` <small class="at">${esc(at)}</small>` : ""}</span></button></li>`;
  };
  $("rank").classList.toggle("with-at", withAt);

  /* Lower-bound rows lead, under a heading that says what they are and that
     they share ranks 1–n (B1): the leap's floor is a figure, a safe exit
     past the axis is not. The mark is the tile's own — a dashed square at
     the right edge, because "beyond" is a place on the axis. The note under
     them says why the ranks are shared and the one thing the data lets a
     reader say about the worst: the largest measured figure, and how the
     largest floor stands to it. */
  const n = g.past.length;
  $("lowerGroup").hidden = n === 0;
  const lowerKey = measure.key === "leap" ? "leap" : "safeExit";
  $("lowerTitle").textContent = lowerTitle(lowerKey, n);
  $("rankLower").innerHTML = g.past.map((r) => rankRow(r, `<span class="past"></span>`,
    measure.key === "leap" && r.value !== null ? t("rank.atLeast", { value: value(r.value, measure) }) : copy.pastAxis, rankRange(n))).join("");
  const top = g.ranked[0] ? { state: name(g.ranked[0].st), v: value(g.ranked[0].value, measure) } : null;
  $("lowerNote").textContent = n === 0 ? "" : lowerNote(lowerKey, n, top,
    measure.key === "leap" ? { state: name(g.past[0].st), v: value(g.past[0].value, measure), reaches: (g.past[0].value ?? 0) >= (g.ranked[0]?.value ?? 0) } : undefined);

  /* Competition ranking (N3): equal values share a rank, and the next rank
     skips — twelve states at 1 are all first, and the first 0 is thirteenth.
     The count starts after the lower-bound group, which holds ranks 1–n. */
  let rank = 0;
  $("rank").innerHTML = g.ranked.map((r, i) => {
    if (i === 0 || r.value !== g.ranked[i - 1].value) rank = n + i + 1;
    return rankRow(r, `<span class="dot" style="left:${(((r.value as number) - g.bins.lo) / span) * 100}%;` +
      `background:var(--loss-${g.bins.index(r.value as number) + 1})"></span>`, value(r.value, measure), rankOrdinal(rank));
  }).join("");
  $("rankAxis").innerHTML = `<span>${value(g.bins.lo, measure)}</span><span>${value(g.bins.hi, measure)}</span>`;

  /* Lifted out, each into its own labelled block — never a tail of the list,
     where "last" reads as "smallest". */
  $("noneGroup").hidden = g.none.length === 0;
  $("noneTitle").textContent = t("rank.none.heading", { n: g.none.length });
  $("rankNone").innerHTML = g.none.map((r) => rankRow(r, "", R.none.value)).join("");
  $("noneNote").textContent = t("rank.none.note", { floor: money(CLIFF_MIN) });

  $("incGroup").hidden = g.incomplete.length === 0;
  $("incTitle").textContent = t("rank.incomplete.heading", { n: g.incomplete.length });
  $("rankInc").innerHTML = g.incomplete.map((r) => rankRow(r, `<span class="incomplete-mark hg-hatch-incomplete"></span>`, R.incomplete.value)).join("");
  $("incNote").textContent = g.incomplete.length ? incompleteNote(g.incomplete.length, g.programs) : "";
}

/**
 * The full table — the text equivalent, and the thing a reporter copies.
 * Sorted by a measure, the lifted-out groups get a heading row each, so a
 * lower bound is never read as the smallest value (B1); an incomplete row
 * carries its caveat in its own cells (S5) and a short mark in the state
 * cell, on screen at any width (S10). O(states); the order is `tableRows`'.
 */
export function renderTable(s: Scene, sort: SortKey): StateRow[] {
  const T = copy.table;
  const rows = tableRows(s.summary, s.arch, sort);
  const sortMeasure = sort === "state" ? null : MEASURES.find((m) => m.key === sort)!;
  const tabbable = s.sel ?? rows[0]?.st;
  const order = sortMeasure ? t(`table.byMeasure.${isCount(sortMeasure) ? "count" : "dollars"}`, { title: sortMeasure.title.toLowerCase() }) : T.byState;
  $("tabCap").innerHTML = `<span>${esc(t("table.caption", { household: s.archLabel.toLowerCase(), order, year: s.summary.year, date: dateWords(s.summary.generated) }))}</span>`;
  const heading = (text: string) => `<tr class="group"><th colspan="9"><span>${esc(text)}</span></th></tr>`;
  const headingFor = (r: StateRow, prev: StateRow | undefined): string => {
    if (!sortMeasure || r.kind === prev?.kind || r.kind === "shaded") return "";
    const n = rows.filter((x) => x.kind === r.kind).length;
    return r.kind === "past" ? heading(lowerTitle(sortMeasure.key === "leap" ? "leap" : "safeExit", n))
      : r.kind === "none" ? heading(t("rank.none.heading", { n })) : heading(t("rank.incomplete.heading", { n }));
  };
  /* A no-cliff cell prints "none" for every dollar measure, never $0 (B4).
     The Figures cell carries the child-care subsidy's footing where HotGap
     added it (rerun S4), so Ohio and Texas read on their footing without a click. */
  $("tbody").innerHTML = rows.map((r, i) => {
    const { m } = r, none = r.kind === "none", missing = r.incomplete.map(unmodeledName);
    const floor = (v: string) => (missing.length ? t("rank.floor", { value: v }) : v);
    const cell = (v: number) => (none ? T.none : floor(money(v)));
    const figures = esc(missing.length ? t("table.floor", { programs: listOf(missing) }) : T.complete) +
      (s.summary.coverage?.[r.st]?.corrections.childcareSubsidy.source === "added by HotGap" ? `<small>${esc(T.subsidyAdded)}</small>` : "");
    return headingFor(r, rows[i - 1]) + `<tr>` +
      `<th scope="row"><button class="hg-row-btn" type="button" data-st="${r.st}" aria-label="${esc(name(r.st))}"` +
      `${control(r.st, s.sel, tabbable)}>${r.st}${missing.length ? `<span class="flag-mark" aria-hidden="true">${esc(T.floorMark)}</span>` : ""}</button></th>` +
      `<td class="num">${cell(m.biggestLoss)}</td>` +
      `<td class="num">${none || m.biggestLossAt === null ? T.none : esc(stepWords(m.biggestLossAt))}</td>` +
      `<td class="num">${cell(m.dangerWidth)}</td>` +
      `<td class="num">${none ? T.none : floor(m.leapIsLowerBound ? t("rank.atLeast", { value: money(m.leap) }) : money(m.leap))}</td>` +
      `<td class="num">${none ? T.none : m.safeExit === null ? `<span aria-describedby="pastAxisNote">${esc(copy.pastAxis)}</span>` : floor(money(m.safeExit))}</td>` +
      `<td class="num">${floor(String(m.cliffCount))}</td><td class="num">${floor(String(m.deferredCliffCount))}</td>` +
      `<td class="flag${missing.length ? " no" : ""}">${figures}</td></tr>`;
  }).join("");
  return rows;
}

/** The method panel's per-view facts, rendered from the same rows. */
export function renderMethod(s: Scene): void {
  const { g } = s, label = s.archLabel.toLowerCase();
  $("unmodSummary").textContent = g.incomplete.length
    ? t("method.excludes.hatched", { household: label, where: listOf(g.incomplete.map((r) => t("method.excludes.whereItem", { programs: listOf(r.incomplete.map(unmodeledName)), state: name(r.st) }))) })
    : t("method.excludes.nothing", { household: label });
  $("hatchCaution").innerHTML = rich(g.programs.length ? t("method.hatchCaution.some", { programs: listOf(g.programs) }) : copy.method.hatchCaution.none);
  /* The axis this household was swept to, in dollars (rerun N9): the top most
     states share, and the states whose higher guidelines lengthen it. */
  const tops = new Map<number, string[]>();
  for (const r of s.rows) tops.set(r.m.axisTop, [...(tops.get(r.m.axisTop) ?? []), r.st]);
  const [common] = [...tops].sort((a, z) => z[1].length - a[1].length)[0] ?? [0];
  const exceptions = s.rows.filter((r) => r.m.axisTop !== common).map((r) => ({ state: name(r.st), top: money(r.m.axisTop) }));
  $("axisLine").textContent = axisLine(label, money(common), exceptions);
}

/** The suggested citation, from the run's facts and the page's own address for this view (N13). */
export function renderCite(summary: SummaryJson, url: string): void {
  $("cite").innerHTML = rich(t("method.cite", { year: summary.year, model: modelLine(summary.model), date: dateWords(summary.generated), url }));
}

const detailRow = (at: string, tag: string | null, note: string, href?: string, title?: string): string =>
  `<li><span class="hg-rows__at">${esc(at)}</span><div>` +
  (tag ? `<span class="hg-tag">${esc(tag)}</span>` : "") +
  `<span class="hg-cite"${title ? ` title="${esc(title)}"` : ""}>${esc(note)}${href ? ` <a href="${esc(href)}">${esc(new URL(href).hostname)}</a>` : ""}</span></div></li>`;


/**
 * The selected state's block: its step sentence (B3), CorrectionsApplied
 * from coverage[state].corrections kept to applies === true with the
 * child-care subsidy's footing stated whatever applies (B2), then the state's
 * own unmodeled[] entries (S8) and otherBenefits[], then the state's
 * SourceNote from vintages and model with the county named (B4). All of it
 * from the file. With nothing selected the block says how to select.
 */
export function renderDetail(s: Scene): void {
  const { summary, sel } = s, D = copy.detail;
  const cov = sel ? summary.coverage?.[sel] : undefined;
  const row = sel ? s.rows.find((r) => r.st === sel) : undefined;
  $("stateStep").hidden = !row;
  if (row) $("stateStep").innerHTML = stateLines(row, s.measure, cov, false).join("<br>");
  if (!sel || !cov) {
    $("stateTitle").textContent = sel ? t("detail.heading", { state: name(sel), n: 0 }) : D.choose;
    $("stateSub").textContent = sel ? D.noBlock : D.chooseSub;
    for (const id of ["corrections", "unmod", "other", "liheap"]) $(id).textContent = "";
    $("unmodTitle").hidden = $("unmod").hidden = $("otherTitle").hidden = $("other").hidden = true;
    $("liheap").hidden = true;
    $("stateSrc").textContent = "";
    return;
  }
  const stateName = name(sel);
  const rows = correctionRows(cov.corrections);
  $("stateTitle").textContent = t("detail.heading", { state: stateName, n: rows.length });
  $("stateSub").textContent = `${t(rows.length ? "detail.changed" : "detail.unchanged", { state: stateName })} ${t(`detail.subsidy.${cov.corrections.childcareSubsidy.source === "added by HotGap" ? "added" : "inNetIncome"}`, { state: stateName })}`;
  $("corrections").innerHTML = rows.map((r) => detailRow(r.program, r.source ?? D.applied, r.note, r.href)).join("");

  const own = cov.unmodeled.filter((u) => u.scope !== "all");
  $("unmodTitle").hidden = $("unmod").hidden = own.length === 0;
  $("unmodTitle").textContent = t("detail.unmodeled", { state: stateName, n: own.length });
  $("unmod").innerHTML = own.map((u) => detailRow(unmodeledName(u), bites(u, s.arch) ? D.incompleteTag : null, unmodeledNote(u))).join("");

  const other = cov.otherBenefits;
  $("otherTitle").hidden = $("other").hidden = other.length === 0;
  $("otherTitle").textContent = t("detail.other", { state: stateName, n: other.length });
  $("other").innerHTML = other.map((o) => detailRow(coreText(o.message, o.label), null, t("detail.otherNote", { max: money(o.maxAnnualInSweep) }), undefined, o.variable ? t("detail.variable", { name: o.variable }) : undefined)).join("");

  /* EligibilityBoundary (#23): one row in the ledger's shape from
     coverage[state].liheap — the program with its footing chip in the name
     column, the three facts as one sentence in the cite register the block's
     other rows use (a row that changed no figure must not outweigh the
     corrections; liheap review S1), in Michigan with the credit core names,
     and the publishers on a second cite line with the day read. Absent on a
     file written before Plan 7, and then the block says nothing. Its own
     list, after the state's other lists, under the block's one heading: a
     boundary is not a correction and is not counted there. */
  const b = cov.liheap, note = cov.corrections.liheap, L = D.liheap;
  const hasBoundary = b !== undefined && note !== undefined;
  $("liheap").hidden = !hasBoundary;
  if (hasBoundary) {
    const counted = note.source === "in net income";
    const facts = boundaryFacts({ limit: limitWords(b.limit), worth: b.topBand ? { lo: money(b.topBand.min), hi: b.topBand.max === b.topBand.min ? null : money(b.topBand.max), shape: b.shape } : null, share: b.servedShare }) +
      (counted ? ` ${boundaryCounted(stateName, note.program)}` : "");
    $("liheap").dataset.footing = note.source;
    $("liheap").innerHTML = `<li><span class="hg-rows__at">${esc(L.program)} <span class="hg-tag">${esc(counted ? L.footing.inNetIncome : L.footing.boundary)}</span></span>` +
      `<div><span class="hg-cite">${esc(facts)}</span><span class="hg-cite">${rich(boundaryCite({ ...b.sources, readOn: b.readOn }))}</span></div></li>`;
  }

  /* SourceNote (#17) from vintages and model, in the inventory's shape, the county named. */
  const v = cov.vintages;
  const [careBasis, careYear] = (v.childcare?.preschool ?? "").split(" ");
  const care = (D.care as Record<string, string>)[careBasis] ?? careBasis ?? D.care.unknown;
  $("stateSrc").textContent = t("detail.source", {
    year: summary.year, rentPublisher: v.rent.publisher, rentVintage: v.rent.vintage,
    county: v.county.name ? t("detail.sourceCounty.named", { county: v.county.name, vintage: v.county.vintage }) : t("detail.sourceCounty.unnamed", { vintage: v.county.vintage }),
    care: careYear ? t("detail.sourceCare.dated", { care, year: careYear }) : t("detail.sourceCare.undated", { care }),
    model: modelLine(v.model ?? summary.model), date: dateWords(summary.generated),
  });
}

/** The three groups of state controls — map, ranking, table — each one tab stop. */
export const GROUPS = ["grid", "rankList", "tbody"] as const;

/**
 * Selection: every control carrying the state takes aria-current, and each
 * group's roving tab stop moves to it (or, with nothing selected, back to
 * the group's first control). Nothing is rebuilt. O(states) per group.
 */
export function applySelection(sel: string | null): void {
  for (const id of GROUPS) {
    const btns = $(id).querySelectorAll<HTMLButtonElement>("button[data-st]");
    const tabbable = [...btns].some((b) => b.dataset.st === sel) ? sel : btns[0]?.dataset.st;
    for (const b of btns) {
      const st = b.dataset.st;
      b.tabIndex = st === tabbable ? 0 : -1;
      if (st === sel) b.setAttribute("aria-current", "true"); else b.removeAttribute("aria-current");
    }
  }
}
