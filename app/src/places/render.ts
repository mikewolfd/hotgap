// Rendering: the figure (StateTiles, legend, SourceNote), the RankStrip, the
// DataTable, the method panel's per-view sentences, and the selected state's
// detail (CorrectionsApplied, IncompleteMarker, otherBenefits, SourceNote).
// Every string here is read from the summary; nothing is typed.
import { CLIFF_MIN, STATE_NAMES, type SummaryJson } from "@hotgap/core";
import { $ } from "../lib/dom.js";
import { capitalize, dateWords as dateOf, esc, listOf as list, modelLine, money, reachWord } from "../lib/format.js";
import { fmt, word } from "./format.js";
import { correctionRows } from "../lib/corrections.js";
import { bites, type Archetype, type Grouped, type Measure, type SortKey, type StateRow, tableRows } from "./model.js";
import { TILES, TILE_ORDER } from "./tiles.js";

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

const name = (st: string): string => STATE_NAMES[st] ?? st;

/* The tile's own sentence, for the hover title and the accessible name. */
function tileTitle(r: StateRow, measure: Measure): string {
  switch (r.kind) {
    case "incomplete": return `${name(r.st)}: ${list(r.incomplete.map((u) => u.program))} not modelled — figures incomplete`;
    case "none": return `${name(r.st)}: no cliff found`;
    case "past": return `${name(r.st)}: ${PAST_AXIS}`;
    default: return `${name(r.st)}: ${fmt(r.value, measure)}`;
  }
}

/* One phrase for the past-the-axis state wherever a value would print (N2);
   the legend and the title say it in full. */
export const PAST_AXIS = "past the axis";

/* A control's two attributes: `aria-current` says it is the selected state,
   `tabindex="0"` that it is its group's one tab stop — the selected control
   when there is one, the group's first otherwise. Never the same thing:
   the first row on load is a tab stop, not a selection. */
const control = (st: string, sel: string | null, tabbable: string | undefined): string =>
  `${st === sel ? ` aria-current="true"` : ""} tabindex="${st === tabbable ? 0 : -1}"`;

/** The figure box: title, sub, the 51 tiles, the ramp scale, the legend and the SourceNote. O(states). */
export function renderFigure(s: Scene): void {
  const { summary, measure, g } = s;
  const incSentence = g.incomplete.length
    ? `${g.incomplete.length === 1 ? "one state is" : `${g.incomplete.length} states are`} hatched: ` +
      `${list(g.programs)} ${g.programs.length === 1 ? "is" : "are"} not modelled there, so ` +
      `${g.incomplete.length === 1 ? "its" : "their"} figures are incomplete and are not shaded or ranked.`
    : "";

  $("figTitle").textContent = `${measure.title}, by state`;
  $("figSub").textContent = `${s.archLabel}. ${measure.describe}`;
  const binsSentence = g.bins.kind === "steps"
    ? `five equal-width steps from ${fmt(g.bins.lo, measure)} to ${fmt(g.bins.hi, measure)}`
    : `${word(g.bins.classes.length)} ${g.bins.classes.length === 1 ? "class" : "classes"} from ${g.bins.lo} to ${g.bins.hi}`;
  $("figSrc").textContent = `HotGap, from PolicyEngine ${summary.year} rules on ${modelLine(summary.model)}. Weekly sweep ` +
    `generated ${dateOf(summary.generated)}. Net income after health-insurance premiums. Estimates only. Bins: ` +
    `${binsSentence} over the ${g.ranked.length} states with a comparable figure` +
    (g.none.length ? `; ${g.none.length} with no cliff found` : "") +
    (g.past.length ? `; ${g.past.length} past the axis` : "") + "." +
    (incSentence ? ` ${capitalize(incSentence)}` : "");

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
    ? `<span>${fmt(g.bins.lo, measure)}</span>` + classes.map((c) => `<span>${fmt(c.hi, measure)}</span>`).join("")
    : classes.map((c) => `<span>${c.lo === c.hi ? c.lo : `${c.lo}–${c.hi}`}</span>`).join("");

  /* The legend outside the ramp: one entry per tile state present, drawn with
     the tile's class, so the entry IS the mark. */
  const legend: string[] = [];
  if (g.none.length) legend.push(`<li><i class="hg-swatch hg-swatch--none"></i>No cliff found (${g.none.length})</li>`);
  if (g.past.length) legend.push(`<li><i class="hg-swatch hg-swatch--past"></i>Runs past the top of the axis (${g.past.length})</li>`);
  if (g.incomplete.length) legend.push(`<li><i class="hg-swatch hg-swatch--incomplete hg-hatch-incomplete"></i>` +
    `${esc(list(g.programs))} not modelled — figures incomplete, not low (${g.incomplete.length})</li>`);
  $("legend").innerHTML = legend.join("");
}

/**
 * The ranked strip: comparable states on a shared axis, then the two
 * lifted-out blocks. Each row is a control (S2): the tile is sized to its
 * square, so the ranked list beside the map is the 44px control on a
 * phone, and it is one tab stop with the arrow keys moving by row, like the
 * table. O(states).
 */
export function renderRank(s: Scene): void {
  const { measure, g } = s;
  const span = (g.bins.hi - g.bins.lo) || 1;
  const order = [...g.ranked, ...g.past, ...g.none, ...g.incomplete];
  const tabbable = s.sel ?? order[0]?.st;
  const rankRow = (r: StateRow, inner: string, v: string) =>
    `<li><button type="button" class="hg-row-btn" data-st="${r.st}" aria-label="${esc(`${name(r.st)}: ${v}`)}"` +
    `${control(r.st, s.sel, tabbable)}><span class="st">${r.st}</span>` +
    `<span class="track">${inner}</span><span class="v">${v}</span></button></li>`;
  /* Past-the-axis rows close the list with a hollow dashed mark at the right
     edge, because "beyond" is a place on the axis and "none" and "incomplete"
     are not. */
  $("rank").innerHTML = [...g.ranked, ...g.past].map((r) => r.kind === "past"
    ? rankRow(r, `<span class="past"></span>`, PAST_AXIS)
    : rankRow(r, `<span class="dot" style="left:${(((r.value as number) - g.bins.lo) / span) * 100}%;` +
        `background:var(--loss-${g.bins.index(r.value as number) + 1})"></span>`, fmt(r.value, measure))).join("");
  $("rankAxis").innerHTML = `<span>${fmt(g.bins.lo, measure)}</span><span>${fmt(g.bins.hi, measure)}</span>`;

  /* Lifted out, each into its own labelled block — never a tail of the list,
     where "last" reads as "smallest". */
  $("noneGroup").hidden = g.none.length === 0;
  $("noneTitle").textContent = `No cliff found (${g.none.length})`;
  $("rankNone").innerHTML = g.none.map((r) => rankRow(r, "", "no cliff")).join("");
  $("noneNote").textContent = `No step down of $${CLIFF_MIN} or more anywhere on this household's curve. A measurement of ` +
    `zero, not the smallest loss: these states are left out of the bins.`;

  $("incGroup").hidden = g.incomplete.length === 0;
  $("incTitle").textContent = `Not ranked — figures incomplete (${g.incomplete.length})`;
  $("rankInc").innerHTML = g.incomplete.map((r) => rankRow(r, `<span class="incomplete-mark hg-hatch-incomplete"></span>`, "not comparable")).join("");
  $("incNote").textContent = g.incomplete.length
    ? `${list(g.programs)} ${g.programs.length === 1 ? "is" : "are"} not modelled here, so a real ` +
      `cliff may be missing from ${g.incomplete.length === 1 ? "this curve" : "these curves"}. ` +
      `${g.incomplete.length === 1 ? "This is not a low state; it is an unmeasured one." : "They are not low states; they are unmeasured ones."}`
    : "";
}

/** The full table — the text equivalent, and the thing a reporter copies. O(states); the order is `tableRows`'. */
export function renderTable(s: Scene, sort: SortKey): StateRow[] {
  const rows = tableRows(s.rows, s.g, sort);
  const tabbable = s.sel ?? rows[0]?.st;
  $("tabCap").textContent = `All six measures for ${s.archLabel.toLowerCase()}, ` +
    `${sort === "measure" ? `by ${s.measure.title.toLowerCase()}, largest first` : "by state"}. ` +
    `PolicyEngine ${s.summary.year} rules, sweep of ${dateOf(s.summary.generated)}.`;
  /* A no-cliff cell prints "none" for every dollar measure, never $0 (B4). */
  $("tbody").innerHTML = rows.map((r) => {
    const { m } = r, none = r.kind === "none";
    const cell = (v: number) => (none ? "none" : money(v));
    return `<tr class="${r.kind === "incomplete" ? "incomplete" : ""}">` +
      `<th scope="row"><button class="hg-row-btn" type="button" data-st="${r.st}" aria-label="${esc(name(r.st))}"` +
      `${control(r.st, s.sel, tabbable)}>${r.st}</button></th>` +
      `<td class="num">${cell(m.biggestLoss)}</td>` +
      `<td class="num">${cell(m.dangerWidth)}</td>` +
      `<td class="num">${none ? "none" : (m.leapIsLowerBound ? "&ge; " : "") + money(m.leap)}</td>` +
      `<td class="num">${none ? "none" : m.safeExit === null ? PAST_AXIS : money(m.safeExit)}</td>` +
      `<td class="num">${m.cliffCount}</td><td class="num">${m.deferredCliffCount}</td>` +
      `<td class="flag${r.incomplete.length ? " no" : ""}">${r.incomplete.length
        ? `incomplete: ${esc(list(r.incomplete.map((u) => u.program)))} not modelled`
        : "complete"}</td></tr>`;
  }).join("");
  return rows;
}

/** The method panel's per-view facts, rendered from the same rows. */
export function renderMethod(s: Scene): void {
  const { g } = s, label = s.archLabel.toLowerCase();
  $("unmodSummary").textContent = g.incomplete.length
    ? `A program the engine cannot compute in a state is listed under the map for that state ` +
      `and hatches it on every measure it could move. For ${label} today that is ` +
      `${list(g.incomplete.map((r) => `${r.incomplete.map((u) => u.program).join(" and ")} in ${name(r.st)}`))}.`
    : `Nothing the engine cannot compute would move this household's figures in any state, so ` +
      `no state is hatched for ${label}.`;
  $("hatchCaution").innerHTML = `<strong>Hatched is not low.</strong> A program the model cannot ` +
    `compute in a state${g.programs.length ? ` — today ${esc(list(g.programs))}` : ""} — is missing ` +
    `from every figure for it, so its numbers are floors, not measurements. Do not write that ` +
    `those states are gentler; the only honest claim is that this model cannot yet say. The flag ` +
    `is read from the sweep's coverage record, not from a list kept here, so a state drops off ` +
    `it the day the engine starts modelling the program.`;
}

/** The sweep-wide provenance under the method panel, once, at load. */
export function renderMethodSource(summary: SummaryJson): void {
  const coverage = summary.coverage ?? {};
  const states = Object.keys(summary.states);
  const reachAll = [...new Set(states.flatMap((st) => coverage[st]?.vintages.reach.vintages ?? []))].sort().reverse();
  const fiveYr = states.filter((st) => (coverage[st]?.vintages.reach.vintages ?? []).some((x) => x.includes("5yr")));
  $("methodSrc").textContent = `Sweep generated ${dateOf(summary.generated)} on ${modelLine(summary.model)}. Reach ladders: U.S. Census ` +
    `Bureau ${list(reachAll.map(reachWord))}${fiveYr.length ? ` (the 5-year file in ${fiveYr.length} states ` +
    `whose cells the 1-year cannot support)` : ""}, grown to ${summary.year} dollars by the BLS Employment Cost ` +
    `Index. Licence: AGPL-3.0-only. Estimates only — a caseworker decides real benefits.`;
}

const detailRow = (at: string, tag: string | null, note: string, href?: string): string =>
  `<li><span class="hg-rows__at">${esc(at)}</span><div>` +
  (tag ? `<span class="hg-tag">${esc(tag)}</span>` : "") +
  `<span class="hg-cite">${esc(note)}${href ? ` <a href="${esc(href)}">${esc(new URL(href).hostname)}</a>` : ""}</span></div></li>`;

const CARE_WORD: Record<string, string> = { county: "county price", stateMedianCounty: "state median county price", nationalMedian: "national median price" };

/**
 * The selected state's block: CorrectionsApplied (B3) from
 * coverage[state].corrections kept to applies === true, then unmodeled[] and
 * otherBenefits[], then the state's SourceNote from vintages and model. All
 * of it from the file. With nothing selected the block says how to select.
 */
export function renderDetail(s: Scene): void {
  const { summary, sel } = s;
  const cov = sel ? summary.coverage?.[sel] : undefined;
  const lists = ["corrections", "unmod", "other"] as const;
  if (!sel || !cov) {
    $("stateTitle").textContent = sel ? `Corrections applied in ${name(sel)}` : "Corrections applied — choose a state";
    $("stateSub").textContent = sel
      ? "This sweep recorded no coverage block for this state."
      : "Select a state on the map or in the table to read what HotGap changed on top of PolicyEngine before its figures were read.";
    for (const id of lists) $(id).textContent = "";
    $("unmodTitle").hidden = $("unmod").hidden = $("otherTitle").hidden = $("other").hidden = true;
    $("stateSrc").textContent = "";
    return;
  }
  const stateName = name(sel);
  const rows = correctionRows(cov.corrections);
  $("stateTitle").textContent = `Corrections applied in ${stateName} (${rows.length})`;
  $("stateSub").textContent = rows.length
    ? `What HotGap changed on top of PolicyEngine before any figure for ${stateName} was read.`
    : `PolicyEngine's own figures for ${stateName} stand as served; HotGap changed nothing on top of them.`;
  $("corrections").innerHTML = rows.map((r) => detailRow(r.program, r.source, r.note, r.href)).join("");

  $("unmodTitle").hidden = $("unmod").hidden = false;
  $("unmodTitle").textContent = `Not modelled in ${stateName} (${cov.unmodeled.length})`;
  $("unmod").innerHTML = cov.unmodeled.map((u) => detailRow(u.program, bites(u, s.arch) ? "figures incomplete" : null, u.note)).join("");

  const other = cov.otherBenefits;
  $("otherTitle").hidden = $("other").hidden = other.length === 0;
  $("otherTitle").textContent = `Also in ${stateName}'s net income (${other.length})`;
  $("other").innerHTML = other.map((o) => detailRow(o.label, null,
    `${o.variable ? `PolicyEngine variable ${o.variable}; ` : ""}up to ${money(o.maxAnnualInSweep)} a year on this sweep.`)).join("");

  /* SourceNote (#17) from vintages and model, in the inventory's shape. */
  const v = cov.vintages;
  const [careBasis, careYear] = (v.childcare?.preschool ?? "not recorded").split(" ");
  $("stateSrc").textContent = `Estimates only. Rules: ${summary.year}. Rent: ${v.rent.publisher}; ${v.rent.vintage}. ` +
    `County: ${v.county.vintage}. Child-care price: ` +
    `${CARE_WORD[careBasis] ?? careBasis}${careYear ? `, ${careYear} study` : ""}, carried to ${summary.year} dollars by ` +
    `the BLS Employment Cost Index. Reach: ${list(v.reach.vintages.map(reachWord))}. Model: ${modelLine(v.model ?? summary.model)}. ` +
    `Sweep generated ${dateOf(summary.generated)}.`;
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
