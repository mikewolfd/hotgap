// Rendering, in the order a reader meets it (design/PICTURE-FIRST-2026-09-18.md,
// design/inventory.md § The page is its picture): the skeleton's fixed words,
// the AnswerSentence, then the figure — StateTiles, the legend strip, the one
// caution the map on the screen earns, the readout, the selected state's
// provenance and "How to read this map" — and then, behind the three page
// disclosures, the RankStrip, the DataTable, the method and the sources.
// Every word is copy.ts's; every number is read from the summary; nothing is
// typed.
import { CLIFF_MIN, type StateCoverage, type SummaryJson } from "@hotgap/core";
import { coreText, limitWords } from "../lib/copy.js";
import { correctionRows, sourceWord } from "../lib/corrections.js";
import { unmodeledName, unmodeledNote } from "../lib/coverage.js";
import { $, fillText } from "../lib/dom.js";
import { dateWords, esc, listOf, listOfItems, modelLine, money, reachWord } from "../lib/format.js";
import { languageSwitch } from "../lib/lang.js";
import { pageHref, siteNav } from "../lib/nav.js";
import { finePointer, watchScrollEdges } from "../lib/scroll.js";
import { stateName } from "../lib/names.js";
import { answerParts } from "./answer.js";
import { CSV_HEADER } from "./csv.js";
import { copy, t } from "./copy.js";
import { bites, MEASURES, measureByKey, measuresIn, positionAt, rankValue, type Archetype, type Grouped, type Measure, type MeasureKey, type SortKey, type StateRow, tableRows } from "./model.js";
import { TILES, TILE_ORDER } from "./tiles.js";
import { tryItHref } from "./url.js";
import { axisLine, axisPosition, axisSameAsRoad, binsLine, boundaryCite, boundaryCounted, boundaryFacts, classesLine, cliffCountLine, countedLede, deferredLine, divergingLine, floorTail, hatchedLine, householdLabel, householdPhrase, carePriceLine, incompleteNote, keepPhrase, keepShort, keepSpan, keepTick, liheapMethodLine, lowerNote, lowerTitle, noneLine, rankOrdinal, rankRange, roadCliffCountLine, roadCollapse, roadHolds, roadOffAxisLine, roadPosition, roadRateLine, rowLabel, type LowerKey, worstStepLine } from "./words.js";
import { h } from "../lib/dom.js";

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
/** A measure's value as the ranking, the table and the caption print it; null is the bound that has no figure — past the axis, or a road that runs off it. */
const value = (v: number | null, m: Measure): string =>
  v === null ? (m.group === "road" ? copy.roadOffAxis : copy.pastAxis)
    : m.unit === "¢" ? keepShort(v) : m.unit === "$" ? money(v) : String(v);
/** The same figure with the room to say what it is, where a reader meets the measure on the mark itself: the tile and the legend. */
const longValue = (v: number | null, m: Measure): string => (v !== null && m.unit === "¢" ? keepPhrase(v) : value(v, m));
/** A bin bound on the scale, where five labels share the figure's width. */
const tick = (v: number, m: Measure): string => (m.unit === "¢" ? keepTick(v) : value(v, m));
/** Which of the three shapes a measure's words take: a count, a dollar figure, or cents kept per extra dollar. */
const shape = (m: Measure): "count" | "dollars" | "cents" => (m.unit === "" ? "count" : m.unit === "¢" ? "cents" : "dollars");
/** The step a figure names: "$38,000 → $39,000". */
const stepWords = (at: number): string => t("rank.step", { from: money(at), to: money(at + STEP) });
/** A table order's name: "…, most first" for a count, "…, largest first" for dollars, "…, most regressive first" for the keep rate. */
const orderName = (m: Measure): string => t(`table.order.measure.${shape(m)}`, { title: m.title });
/** The id of the table column a measure fills, and of its definition line. */
const colId = (key: string): string => `col${key[0].toUpperCase()}${key.slice(1)}`;
/**
 * The child-care price's footing, in the reader's words, where it is NOT this
 * state's own county price — and null where it is.
 *
 * It qualifies the claim rather than decorating it, so it travels with the
 * claim (inventory.md § Program phrases). Child care ends the worst step on
 * the road in most states on this sweep, and the one state with no cliff at
 * all — New Mexico — is one of two whose child-care price is a national median
 * standing in for a county the source database lacks. A cold reader read "no
 * cliff found" as a finding about New Mexico's rules, found the substitution
 * in the smallest text on the page, and called the pairing the page's least
 * comparable input under its most quotable claim (2026-09-18, B3).
 */
function carePriceFooting(cov: StateCoverage | undefined): string | null {
  const [basis] = (cov?.vintages.childcare?.preschool ?? "").split(" ");
  if (!basis || basis === "county") return null;
  return (copy.detail.care as Record<string, string>)[basis] ?? null;
}
/** How wide a group heading row spans: counted off the table's own head, so adding a column cannot leave a heading short. */
const colspan = (): number => $("colState").parentElement!.children.length;
/**
 * The three columns whose figure is a POINT on the earnings axis, and so
 * carries how many families stand below it (Plan 9). They share one
 * definition, because position means one thing in all three.
 *
 * It rides UNDER the figure rather than in three columns of its own: measured
 * at 1280, three more columns took the table past the page's own column and
 * the whole page scrolled sideways, which the system does not allow. Under
 * the figure is also where it belongs — the same rule that keeps a loss and
 * the programs that cause it in one cell (B3).
 */
const POSITION_COLS = ["colRoadWorstAt", "colBiggestLossAt", "colSafeExit"];
/**
 * POSITION under a figure: "47 in 100". Null — a survey cell the ACS cannot
 * support, or no figure to place — prints nothing at all rather than a zero,
 * because "0 in 100" would read as a finding.
 */
const positionUnder = (n: number | null): string => (n === null ? "" : `<small>${esc(t("table.position", { n: Math.round(n) }))}</small>`);
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
    skip: copy.skip, wordmark: copy.wordmark, status: copy.status.loading,
    archLabel: copy.filters.household, metricLabel: copy.filters.measure, csvBtn: copy.filters.csv,
    figDesc: copy.figure.description, readout: copy.readout.empty, rankBins: copy.rank.bins,
    /* The three page disclosures carry the contract's names; the figure's two
       are named for what is inside them (§ The page is its picture). */
    tableHeading: copy.panels.everything, sourcesHeading: copy.panels.sources,
    howToHeading: copy.howTo.heading, figKeyboard: copy.howTo.keyboard,
    sortLabel: copy.table.order.label, sortHint: copy.table.order.hint, colState: C.state,
    colKeepRate: C.keepRate, colRoadCliffCount: C.roadCliffCount, colRoadWorst: C.roadWorst, colRoadWorstAt: C.roadWorstAt,
    colBiggestLoss: C.biggestLoss, colBiggestLossAt: C.biggestLossAt,
    colDangerWidth: C.dangerWidth, colLeap: C.leap, colSafeExit: C.safeExit,
    colCliffCount: C.cliffCount, colDeferredCliffCount: C.deferredCliffCount, colFigures: C.figures,
    tableNote: copy.table.note, methodHeading: copy.method.heading, excludesHeading: copy.method.excludes.heading,
  });
  /* The glossary sentence carries its emphases, so it goes through rich(). It
     used to stand above the map as half of a two-paragraph standfirst; it is
     the same sentence, one press away inside "How to read this map", where a
     reader who wants a definition looks for one. */
  $("glossary").innerHTML = rich(t("lede.glossary", { floor: money(CLIFF_MIN) }));
  /* One sentence per column where the headers are (rerun S3): the measures'
     own `describe`, the two step columns' and the flag's; each header points
     at its line. The road's three lead, as they do in the menu and the table. */
  type Def = { id: string; term: string; def: string; heads?: string[] };
  const measureDef = (key: MeasureKey): Def => { const m = measureByKey(key)!; return { id: colId(key), term: m.title, def: m.describe }; };
  const defs: Def[] = [
    measureDef("keepRate"), measureDef("roadCliffCount"), measureDef("roadWorst"),
    { id: "colRoadWorstAt", term: C.roadWorstAt, def: copy.table.defs.roadWorstAt },
    measureDef("biggestLoss"), { id: "colBiggestLossAt", term: C.biggestLossAt, def: copy.table.defs.biggestLossAt },
    measureDef("dangerWidth"), measureDef("leap"), measureDef("safeExit"), measureDef("cliffCount"), measureDef("deferredCliffCount"),
    /* Position says one thing under three figures and shares one definition,
       so a reader meets what it is (and is not) once rather than three times;
       each of the three columns points at it as a SECOND description, after
       its own. */
    { id: "position", term: copy.table.defs.positionTerm, def: copy.table.defs.position, heads: [] },
    { id: "colFigures", term: C.figures, def: copy.table.defs.figures },
    /* The two cell words the cold read could not look up: they are printed IN
       the table and were explained four thousand pixels below it, never in the
       list a careful reader consults (places keep-rate read, S3). */
    { id: "pastAxis", term: copy.table.defs.pastAxisTerm, def: copy.table.defs.pastAxis, heads: [] },
    { id: "lowerBound", term: copy.table.defs.lowerBoundTerm, def: copy.table.defs.lowerBound, heads: [] },
  ];
  $("defs").setAttribute("aria-label", copy.table.defs.label);
  $("lang").replaceWith(languageSwitch());
  $("nav").replaceWith(siteNav("places"));
  $("wordmark").setAttribute("href", pageHref("citizen"));
  $("defs").innerHTML = defs.map((d) => `<dt>${esc(d.term)}</dt><dd id="def-${d.id}">${esc(d.def)}</dd>`).join("");
  for (const d of defs) for (const head of d.heads ?? [d.id]) $(head).setAttribute("aria-describedby", `def-${d.id}`);
  for (const head of POSITION_COLS) $(head).setAttribute("aria-describedby", `${$(head).getAttribute("aria-describedby")} def-position`);
  $("pastAxisNote").innerHTML = rich(copy.method.pastAxisCaution);
  /* Two groups, two questions (Plan 9): the road out of poverty, where the
     families the tool is for actually are, and the whole curve, which names
     the tallest wall wherever it stands. The `<optgroup>` labels are copy. */
  const options = (ms: Measure[], label: (m: Measure) => string) => ms.map((m) => `<option value="${m.key}">${esc(label(m))}</option>`).join("");
  const grouped = (label: (m: Measure) => string) => (["road", "axis"] as const)
    .map((g) => `<optgroup label="${esc(copy.filters.groups[g])}">${options(measuresIn(g), label)}</optgroup>`).join("");
  $<HTMLSelectElement>("metric").innerHTML = grouped((m) => m.option);
  $<HTMLSelectElement>("sort").innerHTML = `<option value="state">${esc(copy.table.order.state)}</option>` + grouped(orderName);
}

/** Everything that is the same for every view, once the data is in: the counted lede, the household list, the method panel. */
export function renderOnce(summary: SummaryJson): void {
  const states = Object.keys(summary.states);
  $<HTMLSelectElement>("arch").innerHTML = summary.archetypes.map((a) => `<option value="${a.id}">${esc(householdLabel(a.married, a.id.includes("dual"), a.childAges))}</option>`).join("");
  $("table").textContent = t("table.heading", { n: states.length });
  /* The axis in dollars for the selected household (rerun N9) follows the axis bullet; renderMethod fills it per view. */
  const M = copy.method.items;
  const coverage = summary.coverage ?? {};
  /* The survey behind every POSITION on the page, named from the run's own
     coverage blocks rather than typed: the vintages the states' ladders were
     built on, in words (a state too small for the 1-Year file stands on the
     5-Year one, cell by cell, so there can be two). */
  const reachVintages = [...new Set(states.flatMap((st) => coverage[st]?.vintages.reach?.vintages ?? []))].sort();
  /* The method in the order a reader needs it: what was run, over what axis,
     then the road and the keep rate the page leads with, then what the two
     groups of measures each ask, then what position is and is not, then the
     money line, the household and the caveat that it is a modelled one. */
  const items = [
    t("method.items.engine", { year: summary.year }),
    t("method.items.road", { year: summary.year }), M.keepRate,
    ...(reachVintages.length ? [t("method.items.position", { vintages: listOf(reachVintages.map(reachWord)), year: summary.year })] : []),
    M.money, t("method.items.household", { year: summary.year }), M.modeledFamily, M.takeUp, M.deferred, M.corrections,
  ].map((text) => `<li>${rich(text)}</li>`);
  /* The download's columns are provenance, so they sit with the sources and
     the citation rather than in the method list, where they were the one item
     about a file and not about a rule. */
  $("csvColumns").innerHTML = rich(t("method.items.download", { columns: listOfItems([...CSV_HEADER]) }));
  items.splice(1, 0, `<li id="axisLine"></li>`);
  /* Two per-view items: the axis this household was swept to, and how far up
     the curve the tallest wall stands for it. Both are counted per render. */
  items.splice(4, 0, `<li id="groupsLine"></li>`);
  $("methodList").innerHTML = items.join("");
  /* A gap every state shares is listed once here, never under a state (S8): the `all` entries, one per program. */
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

/**
 * The tile's own sentence, for the hover title and the accessible name. On a
 * road measure the two lifted-out states say what they are on the road: no
 * cliff between poverty and twice poverty, or a road off this cell's axis.
 *
 * Two things a cold reader asked the tile for and got from the table instead
 * (2026-09-18):
 *
 * - **A LEAP THE AXIS BOUNDS SAYS ITS FLOOR.** The tile read "past the axis"
 *   while the ranked row read "≥ $53,000" and the table read the same — three
 *   answers to one question, and the map was the one hiding a figure the rest
 *   of the page was willing to print.
 * - **A SUBSTITUTED CHILD-CARE PRICE TRAVELS WITH THE TILE.** New Mexico is
 *   the best state on the map, the state that sets the top of the scale, and
 *   one of three whose child-care price is a median standing in for a county
 *   the source database lacks — while child care is what ends most of these
 *   cliffs. The footing was a click away in the readout (places review B3);
 *   it is on the tile now, in the same words the table's Figures cell uses.
 */
function tileTitle(r: StateRow, measure: Measure, cov: StateCoverage | undefined): string {
  const state = name(r.st), road = measure.group === "road";
  const care = carePriceFooting(cov);
  const footing = care === null ? "" : ` — ${t("table.carePrice", { care })}`;
  switch (r.kind) {
    case "incomplete": return t("figure.tile.incomplete", { state, programs: listOf(r.incomplete.map(unmodeledName)) }) + footing;
    case "none": return t(road ? "figure.tile.roadNone" : "figure.tile.none", { state }) + footing;
    case "past": return (measure.key === "leap" && r.value !== null
      ? t("figure.tile.leapAtLeast", { state, value: value(r.value, measure) })
      : t(road ? "figure.tile.roadPast" : "figure.tile.past", { state })) + footing;
    default: return t("figure.tile.value", { state, value: longValue(r.value, measure) }) + footing;
  }
}

/**
 * AnswerSentence (#1): the national reading of this view, as the figure's own
 * <figcaption> and so the figure's accessible name. Each keyed figure is
 * underlined in the ink of the tiles it counts, so the sentence doubles as the
 * map's key — the citizen rule, on a map (charts.md § The map is the picture).
 * O(states), in `answerParts`.
 */
export function renderAnswer(s: Scene): void {
  $("answer").replaceChildren(...answerParts(s).map((p) => ("slot" in p && p.key ? h("span", { class: p.key }, p.text) : p.text)));
}

/**
 * The figure: the 51 tiles, the legend strip, the one caution the map on the
 * screen has earned, the estimates line, and the per-view words inside "How to
 * read this map". Everything the map needs is inside the figure and nothing
 * else is (charts.md § The map is the picture). O(states).
 */
export function renderFigure(s: Scene): void {
  const { summary, measure, g } = s;
  const road = measure.group === "road";
  const bins = g.bins.kind === "steps"
    ? t("figure.bins.steps", { lo: value(g.bins.lo, measure), hi: value(g.bins.hi, measure) })
    : g.bins.kind === "diverging"
      ? divergingLine({ ...g.bins.width!, down: g.bins.width!.down == null ? null : keepSpan(g.bins.width!.down), up: g.bins.width!.up == null ? null : keepSpan(g.bins.width!.up) }, tick(g.bins.lo, measure), tick(g.bins.hi, measure))
      : classesLine(g.bins.classes.length, g.bins.lo, g.bins.hi);
  /* One class holding nine comparable states in ten explains a near-monochrome map (N11). */
  const share = g.bins.classes.map((_, i) => g.ranked.filter((r) => g.bins.index(r.value as number) === i).length);
  const big = share.findIndex((n) => g.ranked.length && n / g.ranked.length >= 0.9);
  const oneClass = big < 0 ? null : g.bins.kind === "classes"
    ? (g.bins.classes[big].lo === g.bins.classes[big].hi
      ? (g.bins.classes[big].lo === 0 ? t("figure.oneClass.countNone", { n: share[big], total: g.ranked.length }) : t("figure.oneClass.countValue", { n: share[big], total: g.ranked.length, value: g.bins.classes[big].lo }))
      : t("figure.oneClass.countRange", { n: share[big], total: g.ranked.length, lo: g.bins.classes[big].lo, hi: g.bins.classes[big].hi }))
    : t("figure.oneClass.dollars", { n: share[big], total: g.ranked.length, lo: tick(g.bins.classes[big].lo, measure), hi: tick(g.bins.classes[big].hi, measure) });

  /* The line that never hides, cut to what a reporter needs at a glance: that
     these are estimates, whose rules they are, and which run. The model
     version, the premium adjustment and the bin bounds are a press away —
     under "How to read this map" for the bins, under "Where these numbers come
     from" for the rest — because they answer a question nobody asks first. */
  $("figSrc").textContent = t("figure.source", { year: summary.year, date: dateWords(summary.generated) });
  $("figScope").textContent = `${countedLede(s.rows.length, summary.archetypes.length, s.rows.some((r) => r.st === "DC"))} ${t("figure.sub", { household: s.archLabel })}`;
  $("figMeasure").textContent = t("howTo.measure", { measure: measure.title, describe: measure.describe });
  $("grid").setAttribute("aria-label", t("figure.title", { measure: measure.title }));
  $("binsLine").textContent = [
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
      const c = g.bins.classes[g.bins.index(r.value as number)];
      /* Label ink chosen by the fill — the one place text may sit on a colour.
         The two steps NEAREST the page's own ground take --ink and the rest
         --surface, on either ramp and in either mode (S3), because step 1 is
         the step nearest the ground by construction. Measured floor: 5.16:1
         light / 4.51:1 dark on the last --ink step, 5.37:1 / 5.41:1 on the
         first --surface one. No step's L* may fall in the band where neither
         ink reaches 4.5:1 — 49–53 light, 47–54 dark (charts.md § 2).
         Re-measured 2026-09-24 for every step of both ramps in both modes,
         after a critique read the white labels on the lightest plum (step 3:
         WY, VA, DC, HI, FL on the keep rate) as low: white there is 5.37:1
         light / 5.41:1 dark and dark ink would be 3.24:1 / 2.92:1, so the
         ink each step takes is already the one that passes; the e2e contrast
         check holds every bin to 4.5:1. */
      style += `;background:var(--${c.hue}-${c.ramp + 1});color:var(--${c.ramp >= 2 ? "surface" : "ink"})`;
    }
    const title = tileTitle(r, measure, summary.coverage?.[st]);
    tiles.push(`<button type="button" class="${cls}" data-st="${st}" style="${style}" ` +
      `title="${esc(title)}" aria-label="${esc(title)}"${control(st, s.sel, tabbable)}>${st}</button>`);
  }
  const grid = $("grid");
  grid.innerHTML = tiles.join("");
  /* The map is its own scroller below 550px (places.css § THE TILE IS A 44px
     CONTROL): the class is added here rather than written into the skeleton
     because it is the tiles' behaviour, and it is idempotent.
     IT OPENS AT ITS LEFT EDGE, which is to say nothing sets scrollLeft. A
     centred start was tried and rendered: it hides the whole Pacific column —
     Alaska, Washington, Oregon, California, Hawaii — and it opens the picture
     on an EMPTY first row, because Alaska and Maine are the only tiles in it
     and centring cuts them both off. Left-aligned, the map starts in the
     corner where Alaska is, reads west to east the way the country is drawn,
     keeps California on the first screen, and clips a tile at the right edge,
     which is the same "there is more this way" a clipped column gives every
     wide table on the site. */
  grid.classList.add("hg-scroll-x", "hg-scroll-x--bar");
  watchScrollEdges();   /* its edge fades, and the table scroller's, only where they overflow (lib/scroll.ts) */
  mapSwipeHint(grid);

  /* The scale draws the classes that exist: five steps with their six bounds
     between them, or a count's classes each labelled with what it holds (S5). */
  const { classes } = g.bins;
  /* The swatch where the two arms meet takes a wider gap before it: the hue
     change says which way is which, the gap says where the turn is. */
  $("scale").innerHTML = classes.map((c, i) => `<span class="sw${i > 0 && classes[i - 1].hue !== c.hue ? " sw--hinge" : ""}" style="background:var(--${c.hue}-${c.ramp + 1})"></span>`).join("");
  const labels = $("scaleLabels");
  labels.classList.toggle("classes", g.bins.kind === "classes");
  labels.style.setProperty("--n", String(classes.length));
  /* A diverging scale is labelled by its bounds, like a dollar measure's
     steps — and because zero is one of them, the label that reads "0¢" sits
     exactly where the two ramps meet, which is the whole point of the scale. */
  labels.innerHTML = g.bins.kind === "classes"
    ? classes.map((c) => `<span>${c.lo === c.hi ? c.lo : `${c.lo}–${c.hi}`}</span>`).join("")
    : `<span>${tick(g.bins.lo, measure)}</span>` + classes.map((c) => `<span>${tick(c.hi, measure)}</span>`).join("");

  /* The legend strip inside the figure: only the tile states that are on the
     map right now and NOT on the ramp above it, so it is one line and not a
     lesson — and usually nothing. The diverging ramp's two ends used to be
     repeated here as swatches ("loses 105¢ / keeps 30¢"), directly under the
     bounds that already print them (design critique 2026-09-24: one legend).
     Every tile state, present or not, is drawn again under "How to read this
     map" (places keep-rate read, S9: three of the four had no visible key at
     all). */
  const legend: string[] = [];
  if (g.none.length) legend.push(`<li><i class="hg-swatch hg-swatch--none"></i>${esc(t(road ? "figure.legend.roadNone" : "figure.legend.none", { n: g.none.length }))}</li>`);
  if (g.past.length) legend.push(`<li><i class="hg-swatch hg-swatch--past"></i>${esc(t(road ? "figure.legend.roadPast" : "figure.legend.past", { n: g.past.length }))}</li>`);
  if (g.incomplete.length) legend.push(`<li><i class="hg-swatch hg-swatch--incomplete hg-hatch-incomplete"></i>${esc(t("figure.legend.incomplete", { programs: listOf(g.programs), n: g.incomplete.length }))}</li>`);
  $("legend").innerHTML = legend.join("");

  /* All four tile states, drawn with the tiles' own classes so the key cannot
     drift from the map, whether or not this view has one of each. */
  const K = copy.howTo.key;
  $("keyFull").innerHTML = [
    `<li><i class="hg-swatch" style="background:var(--loss-4)"></i>${esc(K.shaded)}</li>`,
    `<li><i class="hg-swatch hg-swatch--none"></i>${esc(road ? K.roadNone : K.none)}</li>`,
    `<li><i class="hg-swatch hg-swatch--past"></i>${esc(road ? K.roadPast : K.past)}</li>`,
    `<li><i class="hg-swatch hg-swatch--incomplete hg-hatch-incomplete"></i>${esc(K.incomplete)}</li>`,
  ].join("");

  /* Nothing that warns hides (§ The page is its picture). The two boxed
     warnings live inside "How to read this map" in full; the one that is TRUE
     OF THE MAP ON THE SCREEN comes out of it, in one line, because then it is
     not a rule but a caution about the tiles a reader is looking at. A hatched
     state outranks a bounded one: it says a figure is missing, not merely
     open-ended. */
  const caution = g.incomplete.length ? t("caution.hatched", { n: g.incomplete.length, programs: listOf(g.programs) })
    : g.past.length ? t(road ? "caution.roadPast" : "caution.past", { n: g.past.length })
      : null;
  $("mapCaution").hidden = caution === null;
  if (caution !== null) $("mapCaution").innerHTML = rich(caution);
}

/**
 * The state's sentences (B3, B4; rerun B2; Plan 9), in three lines and always
 * in this order, whatever measure is selected:
 *
 * 1. **The road out of poverty.** What this household keeps of each extra
 *    dollar walking from the poverty line to twice it, where that road
 *    collapses, and how many families like it earn less than the collapse.
 *    This leads on every measure, because it is the question the page exists
 *    to answer and the one a reader can act on.
 * 2. **The selected measure's own sentence**, where the measure is not the
 *    keep rate (line 1 is its sentence), not where the road collapses (line 1
 *    carries it) and not the one-step loss (line 3 is its sentence).
 * 3. **The whole-axis worst, labelled and last**, with its own position. It is
 *    a true fact about the rules and it stays; it is not the answer, and on
 *    the committed sweep it names a cliff above the median family's earnings
 *    in 39 states of 50.
 *
 * A state with no cliff anywhere says what the model found instead, up to the
 * axis it was swept to (rerun S6). Bold on the state and the figures is the
 * readout's own mark (`.hg-readout b`). Every figure is the row's, and every
 * position the reach ladder's.
 *
 * Two things left these lines in the picture-first pass, both because they
 * were being said twice. **The county** is provenance and is named in the
 * state's own source line, one press below, so "Renter, Franklin County." went
 * with it. **The whole block no longer repeats the readout**: the readout is
 * the map's caption and says the findings; the block under it says only where
 * the numbers came from. The child-care price's footing stays here, because it
 * qualifies the claim rather than sourcing it and a caution does not hide
 * (§ The page is its picture; places keep-rate read, B3).
 */
function stateLines(r: StateRow, measure: Measure, arch: Archetype, cov: StateCoverage | undefined, marked: boolean): string[] {
  const { m } = r;
  const b = (text: string) => (marked ? `<b>${esc(text)}</b>` : esc(text));
  const plain = name(r.st), st = b(plain), top = money(m.axisTop);
  const missing = r.incomplete.map(unmodeledName);
  const lines: string[] = [];

  /* 1. The road. Off this cell's axis there is no rate to say, and the line
     says that rather than a figure nothing stands behind. */
  if (m.keepRate === null) lines.push(esc(roadOffAxisLine(plain)));
  else {
    const road = [roadRateLine(st, m.keepRate, (text) => b(text))];
    if (m.roadWorst) {
      road.push(roadCollapse(b(money(m.roadWorst.at)), b(money(m.roadWorst.drop)), m.roadWorst.programs));
      const at = positionAt(r.st, arch, m.roadWorst.at);
      if (at !== null) road.push(esc(roadPosition(Math.round(at))));
    } else if (m.cliffCount > 0 && m.roadLo !== null && m.roadHi !== null) {
      /* Only where the curve has a cliff SOMEWHERE is "the road holds" news.
         With none anywhere, line 3 says the stronger thing and this would
         only repeat it in a shorter range. */
      road.push(esc(roadHolds(money(STEP), money(m.roadLo), money(m.roadHi), money(CLIFF_MIN))));
    }
    lines.push(road.join(" "));
  }

  /* 2. The selected measure, where line 1 or line 3 is not already its sentence. */
  const lead = measure.key === "keepRate" || measure.key === "roadWorst" || measure.key === "biggestLoss" ? null
    : measure.key === "roadCliffCount" ? roadCliffCountLine(st, m.roadCliffCount)
      : m.cliffCount === 0 ? null
        : measure.key === "dangerWidth" ? (m.safeExit === null ? t("readout.measure.dangerWidthOpen", { state: st, width: b(money(m.dangerWidth)), top }) : t("readout.measure.dangerWidth", { state: st, width: b(money(m.dangerWidth)) }))
          : measure.key === "leap" ? (m.leapIsLowerBound ? t("readout.measure.leapAtLeast", { state: st, leap: b(money(m.leap)), top }) : t("readout.measure.leap", { state: st, leap: b(money(m.leap)) }))
            : measure.key === "safeExit" ? (m.safeExit === null ? t("readout.measure.safeExitPast", { state: st, top }) : t("readout.measure.safeExit", { state: st, exit: b(money(m.safeExit)) }))
              : measure.key === "cliffCount" ? cliffCountLine(st, m.cliffCount, m.deferredCliffCount)
                : deferredLine(st, m.deferredCliffCount, m.cliffCount);
  if (lead !== null) lines.push(lead + (missing.length ? ` ${esc(floorTail(missing))}` : ""));

  /* 3. The whole axis, last, with who is standing below it — or, where the
     road's own collapse is already the tallest wall on the curve, one sentence
     saying so rather than the same figure printed twice. */
  /* An incomplete state keeps the long form, because the floor caveat rides on it. */
  const sameCliff = !missing.length && m.roadWorst !== null && m.roadWorst.at === m.biggestLossAt && m.roadWorst.drop === m.biggestLoss;
  /* The child-care price's footing closes the block where it is not this
     state's own county price: the input that qualifies most of these cliffs. */
  const care = carePriceFooting(cov);
  const tail = care === null ? "" : ` ${esc(carePriceLine(care, plain))}`;
  if (m.cliffCount === 0 || m.biggestLossAt === null) lines.push(`${noneLine(st, money(STEP), money(CLIFF_MIN), top, m.deferredCliffCount)}${tail}`);
  else if (sameCliff) lines.push(`${esc(axisSameAsRoad())}${tail}`);
  else {
    const worst = worstStepLine(b(money(m.biggestLoss)), esc(stepWords(m.biggestLossAt)), m.biggestLossPrograms, missing.map(esc));
    const at = m.biggestLossPosition;
    lines.push([worst, at === null ? null : esc(axisPosition(Math.round(at)))].filter((x): x is string => x !== null).join(" ") + tail);
  }
  return lines;
}

/**
 * The readout UNDER the map, inside the figure: the selected state's sentences
 * as the map's own caption. It used to carry a "Details below" link to a block
 * roughly twelve hundred pixels away (rerun S1); the block is now the next
 * thing in the figure, closed, so there is nowhere to send anybody. O(1).
 */
export function renderReadout(s: Scene): void {
  const el = $("readout");
  const r = s.sel ? s.rows.find((x) => x.st === s.sel) : undefined;
  if (!r) { el.textContent = copy.readout.empty; return; }
  el.innerHTML = stateLines(r, s.measure, s.arch, s.summary.coverage?.[r.st], true).join("<br>") +
    `<br><a class="tryIt" href="${esc(tryItHref(r.st, s.arch))}">${esc(copy.readout.tryIt)}</a>`;
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
  /* "Ranked" was the whole label, and a cold reader could not tell whether
     rank 1 was the best state or the worst — on this page the difference
     between "Ohio is 14th from the bottom" and "14th from the top" (places
     keep-rate read, S4). It says the measure and the direction now, in the
     same words the table's order control uses. */
  $("rankTitle").textContent = t("rank.headingBy", { order: orderName(measure) });
  const span = (g.bins.hi - g.bins.lo) || 1;
  const order = [...g.past, ...g.ranked, ...g.none, ...g.incomplete];
  const tabbable = s.sel ?? order[0]?.st;
  /**
   * Three measures name a POINT on the earnings axis rather than a size: the
   * worst step, the road's collapse and the safe exit. Those rows carry where
   * the point is and how many families like this stand below it (Plan 9) —
   * the fact that decides whether a figure is one anybody meets. A width, a
   * count and the keep rate name no single point, so they carry neither.
   */
  const pointOf = (m: StateRow["m"]): number | null =>
    measure.key === "biggestLoss" ? m.biggestLossAt
      : measure.key === "roadWorst" ? m.roadWorst?.at ?? null
        : measure.key === "safeExit" ? m.safeExit : null;
  const withAt = measure.key === "biggestLoss" || measure.key === "roadWorst" || measure.key === "safeExit";
  const rankRow = (r: StateRow, inner: string, v: string, n?: string) => {
    const point = withAt ? pointOf(r.m) : null;
    /* The safe exit's own value IS the earnings, so its row says the position alone. */
    const where = point === null || measure.key === "safeExit" ? null : t("rank.at", { value: money(point) });
    const share = point === null ? null
      : measure.key === "biggestLoss" ? r.m.biggestLossPosition : positionAt(r.st, s.arch, point);
    const at = [where, share === null ? null : t("rank.position", { n: Math.round(share) })].filter((x): x is string => x !== null).join(" · ");
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
  const road = measure.group === "road";
  $("lowerGroup").hidden = n === 0;
  const lowerKey: LowerKey = road ? "road" : measure.key === "leap" ? "leap" : "safeExit";
  $("lowerTitle").textContent = lowerTitle(lowerKey, n);
  $("rankLower").innerHTML = g.past.map((r) => rankRow(r, `<span class="past"></span>`,
    measure.key === "leap" && r.value !== null ? t("rank.atLeast", { value: value(r.value, measure) }) : road ? copy.roadOffAxis : copy.pastAxis, rankRange(n))).join("");
  const top = g.ranked[0] ? { state: name(g.ranked[0].st), v: value(g.ranked[0].value, measure) } : null;
  $("lowerNote").textContent = n === 0 ? "" : lowerNote(lowerKey, n, top,
    measure.key === "leap" ? { state: name(g.past[0].st), v: value(g.past[0].value, measure), reaches: (g.past[0].value ?? 0) >= (g.ranked[0]?.value ?? 0) } : undefined);

  /* Competition ranking (N3): equal values share a rank, and the next rank
     skips — twelve states at 1 are all first, and the first 0 is thirteenth.
     The count starts after the lower-bound group, which holds ranks 1–n.

     A diverging measure's mark is a BAR from zero, not a dot on a scale: the
     quantity is signed, so what a reader has to see is which side of the
     hinge a state is on and how far from it — a losing state's bar runs left
     from zero, a keeping state's right. The hinge itself is one rule down
     the strip, at `--zero` (places.css). */
  const zero = g.bins.zero ?? 0;
  const pos = (v: number) => ((v - g.bins.lo) / span) * 100;
  $("rank").classList.toggle("diverging", g.bins.kind === "diverging");
  $("rank").style.setProperty("--zero", `${zero * 100}%`);
  let rank = 0;
  $("rank").innerHTML = g.ranked.map((r, i) => {
    /* A tie is a tie at the precision the page prints (model.ts `rankValue`). */
    if (i === 0 || rankValue(r.value as number, measure) !== rankValue(g.ranked[i - 1].value as number, measure)) rank = n + i + 1;
    const v = r.value as number, c = g.bins.classes[g.bins.index(v)];
    const fill = `background:var(--${c.hue}-${c.ramp + 1})`;
    const mark = g.bins.kind === "diverging"
      ? `<span class="bar" style="inset-inline-start:${Math.min(pos(v), zero * 100)}%;width:${Math.abs(pos(v) - zero * 100)}%;${fill}"></span>`
      : `<span class="dot" style="inset-inline-start:${pos(v)}%;${fill}"></span>`;
    return rankRow(r, mark, value(r.value, measure), rankOrdinal(rank));
  }).join("");
  /* The bounds stand over the track they bound, on the rows' own grid, and on
     a diverging scale zero stands over the hinge the bars hang off. */
  const axis = $("rankAxis"), diverging = g.bins.kind === "diverging";
  axis.style.setProperty("--v", withAt ? "10.2rem" : "5.4rem");
  axis.style.setProperty("--zero", `${zero * 100}%`);
  axis.classList.toggle("rank-axis--diverging", diverging);
  axis.innerHTML = `<span class="ends"><span>${tick(g.bins.lo, measure)}</span>` +
    (diverging ? `<span class="zero">${tick(0, measure)}</span>` : "") +
    `<span>${tick(g.bins.hi, measure)}</span></span>`;

  /* Lifted out, each into its own labelled block — never a tail of the list,
     where "last" reads as "smallest". */
  $("noneGroup").hidden = g.none.length === 0;
  $("noneTitle").textContent = t(road ? "rank.none.roadHeading" : "rank.none.heading", { n: g.none.length });
  $("rankNone").innerHTML = g.none.map((r) => rankRow(r, "", road ? R.none.roadValue : R.none.value)).join("");
  $("noneNote").textContent = t(road ? "rank.none.roadNote" : "rank.none.note", { floor: money(CLIFF_MIN) });

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
  const order = sortMeasure ? t(`table.byMeasure.${shape(sortMeasure)}`, { title: sortMeasure.title.toLowerCase() }) : T.byState;
  $("tabCap").innerHTML = `<span>${esc(t("table.caption", { household: s.archLabel.toLowerCase(), order, year: s.summary.year, date: dateWords(s.summary.generated) }))}</span>`;
  const heading = (text: string) => `<tr class="group"><th colspan="${colspan()}"><span>${esc(text)}</span></th></tr>`;
  const headingFor = (r: StateRow, prev: StateRow | undefined): string => {
    if (!sortMeasure || r.kind === prev?.kind || r.kind === "shaded") return "";
    const n = rows.filter((x) => x.kind === r.kind).length;
    const road = sortMeasure.group === "road";
    return r.kind === "past" ? heading(lowerTitle(road ? "road" : sortMeasure.key === "leap" ? "leap" : "safeExit", n))
      : r.kind === "none" ? heading(t(road ? "rank.none.roadHeading" : "rank.none.heading", { n }))
        : heading(t("rank.incomplete.heading", { n }));
  };
  /* A no-cliff cell prints "none" for every dollar measure, never $0 (B4) —
     and the two "no cliff" facts are different facts: the whole-axis columns
     are empty when the curve holds anywhere, the road's when it holds between
     poverty and twice poverty. Both are read from the row's own metrics, not
     from the tile state, which follows whichever measure is selected.
     The Figures cell carries the child-care subsidy's footing where HotGap
     added it (rerun S4), so Ohio and Texas read on their footing without a click. */
  $("tbody").innerHTML = rows.map((r, i) => {
    const { m } = r, none = m.cliffCount === 0, noRoadCliff = m.roadCliffCount === 0, missing = r.incomplete.map(unmodeledName);
    const floor = (v: string) => (missing.length ? t("rank.floor", { value: v }) : v);
    const cell = (v: number) => (none ? T.none : floor(money(v)));
    /* The Figures cell is where a reader compares footings down the column
       without a click (rerun S4): whether HotGap added the child-care subsidy,
       and — since the cold read — whether the state's child-care PRICE is its
       own county's or a median standing in for one. Both qualify the same
       program, which ends the worst step on the road in most states. */
    const cov = s.summary.coverage?.[r.st], care = carePriceFooting(cov);
    const figures = esc(missing.length ? t("table.floor", { programs: listOf(missing) }) : T.complete) +
      (cov?.corrections.childcareSubsidy.source === "added by HotGap" ? `<small>${esc(T.subsidyAdded)}</small>` : "") +
      (care === null ? "" : `<small>${esc(t("table.carePrice", { care }))}</small>`);
    return headingFor(r, rows[i - 1]) + `<tr>` +
      `<th scope="row"><button class="hg-row-btn" type="button" data-st="${r.st}" aria-label="${esc(name(r.st))}"` +
      `${control(r.st, s.sel, tabbable)}>${r.st}${missing.length ? `<span class="flag-mark" aria-hidden="true">${esc(T.floorMark)}</span>` : ""}</button></th>` +
      `<td class="num">${m.keepRate === null ? esc(copy.roadOffAxis) : floor(keepShort(m.keepRate))}</td>` +
      `<td class="num">${m.keepRate === null ? T.none : floor(String(m.roadCliffCount))}</td>` +
      `<td class="num">${noRoadCliff || !m.roadWorst ? T.none : floor(money(m.roadWorst.drop))}</td>` +
      `<td class="num">${m.roadWorst ? esc(stepWords(m.roadWorst.at)) + positionUnder(positionAt(r.st, s.arch, m.roadWorst.at)) : T.none}</td>` +
      `<td class="num">${cell(m.biggestLoss)}</td>` +
      /* The whole-axis worst's position is the pipeline's own field, not a
         second derivation of it: one number, one place it is computed. */
      `<td class="num">${none || m.biggestLossAt === null ? T.none : esc(stepWords(m.biggestLossAt)) + positionUnder(m.biggestLossPosition)}</td>` +
      `<td class="num">${cell(m.dangerWidth)}</td>` +
      `<td class="num">${none ? T.none : floor(m.leapIsLowerBound ? t("rank.atLeast", { value: money(m.leap) }) : money(m.leap))}</td>` +
      `<td class="num">${none ? T.none : m.safeExit === null ? `<span aria-describedby="pastAxisNote">${esc(copy.pastAxis)}</span>` : floor(money(m.safeExit)) + positionUnder(positionAt(r.st, s.arch, m.safeExit))}</td>` +
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
  /* "that wall sits above the median family's earnings in 39 states of 50" was
     TYPED, and it is a fact about one household in eleven: on the committed
     sweep the same count is 39 for a single parent of two and 3 for a
     two-earner couple with two. Counted here, per household, off the same
     positions the table prints. */
  const placed = s.rows.filter((r) => r.m.biggestLossPosition !== null);
  $("groupsLine").innerHTML = rich(t("method.items.groups", { n: placed.filter((r) => (r.m.biggestLossPosition as number) > 50).length, total: placed.length }));
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
 * The selected state's block — WHERE ITS NUMBERS COME FROM, and nothing else:
 * CorrectionsApplied from coverage[state].corrections kept to applies === true
 * with the child-care subsidy's footing stated whatever applies (B2), the
 * state's own unmodeled[] entries (S8) and otherBenefits[], the
 * EligibilityBoundary row, and the state's SourceNote with the county named
 * (B4). All of it from the file.
 *
 * It is the figure's second disclosure (§ The page is its picture), closed,
 * directly under the readout that names the state, and it is absent until one
 * is selected — so it never asks a reader to choose something before they know
 * there is anything to choose. It no longer repeats the readout's sentences
 * above it, which is what the cold read met twice ("the same paragraph repeats
 * verbatim").
 */
export function renderDetail(s: Scene): void {
  const { summary, sel } = s, D = copy.detail;
  const cov = sel ? summary.coverage?.[sel] : undefined;
  $("statePanel").hidden = !sel;
  if (!sel) return;
  $("stateTitle").textContent = t("detail.wherefrom", { state: name(sel) });
  if (!cov) {
    $("corrTitle").textContent = t("detail.heading", { state: name(sel), n: 0 });
    $("stateSub").textContent = D.noBlock;
    for (const id of ["corrections", "unmod", "other", "liheap"]) $(id).textContent = "";
    $("unmodTitle").hidden = $("unmod").hidden = $("otherTitle").hidden = $("other").hidden = true;
    $("liheap").hidden = true;
    $("stateSrc").textContent = "";
    return;
  }
  const stateName = name(sel);
  const rows = correctionRows(cov.corrections);
  $("corrTitle").textContent = t("detail.heading", { state: stateName, n: rows.length });
  $("stateSub").textContent = `${t(rows.length ? "detail.changed" : "detail.unchanged", { state: stateName })} ${t(`detail.subsidy.${cov.corrections.childcareSubsidy.source === "added by HotGap" ? "added" : "inNetIncome"}`, { state: stateName })}`;
  $("corrections").innerHTML = rows.map((r) => detailRow(r.program, r.source ? sourceWord(r.source) : D.applied, r.note, r.href)).join("");

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
  /* REACH RETURNS to this page (Plan 8 removed it as unused; position made it
     load-bearing again): the state's own ladder vintages, where its figures'
     "families earning less" comes from. */
  const reach = v.reach?.vintages.length
    ? ` ${t("detail.sourceReach", { vintages: listOf(v.reach.vintages.map(reachWord)), year: summary.year })}`
    : "";
  $("stateSrc").textContent = t("detail.source", {
    year: summary.year, rentPublisher: v.rent.publisher, rentVintage: v.rent.vintage,
    county: v.county.name ? t("detail.sourceCounty.named", { county: v.county.name, vintage: v.county.vintage }) : t("detail.sourceCounty.unnamed", { vintage: v.county.vintage }),
    care: careYear ? t("detail.sourceCare.dated", { care, year: careYear }) : t("detail.sourceCare.undated", { care }),
    model: modelLine(v.model ?? summary.model), date: dateWords(summary.generated),
  }) + reach;
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
  revealTile(sel);
}

/**
 * THE MAP SAYS IT SCROLLS, in the page's own four words, and only while it
 * does. A thumb reader on 2026-09-19 concluded that Maine is not on this map:
 * the top row is Alaska and then white space to the screen's edge, so the one
 * wordless cue a swiping figure has — a tile clipped at the edge — is absent
 * in exactly the row she was searching. "No scrollbar at rest, no arrow, and
 * not one word telling me to swipe."
 *
 * The line sits OUTSIDE the scroller, the way `.hg-chart__hint` does on the
 * curve, because `.hg-scroll-x`'s own `data-more` draws a block INSIDE the
 * scroller — right for a table, and inside a twelve-column grid it would be a
 * thirteenth cell. The words are the table's own (`table.swipe`, already in
 * both catalogs), so this adds no string to translate; it appears only where
 * the map overflows, so no desktop width gains a word, and it is measured
 * rather than assumed from the width, because a longer language makes the
 * same twelve columns wider.
 */
function mapSwipeHint(grid: HTMLElement): void {
  let line = document.querySelector<HTMLElement>(".mapSwipe");
  if (!line) {
    line = h("p", { class: "mapSwipe hg-source", "aria-hidden": "true" });
    grid.after(line);
  }
  const el = line;
  /* Next frame: the first render happens while `#main` is still hidden, where
     a scroller measures zero and every map would look like it fits. */
  requestAnimationFrame(() => {
    el.textContent = finePointer() ? copy.table.scroll : copy.table.swipe;
    el.hidden = grid.scrollWidth <= grid.clientWidth + 1;
  });
}

/**
 * A selected tile is brought inside the map's own scroller, and nothing else
 * moves. Where the map swipes, a tile at the edge is half a tile: a thumb
 * reader tapped the four visible pixels of New York, got New York, and then
 * read its answer beside a square whose selection ring was cut in half by the
 * screen edge (REVIEW-touch, the thumb reader). The page's own scroll is left
 * alone on purpose — `scrollIntoView` would take the vertical with it, and the
 * readout is directly under the map already (main.ts § Selecting a state).
 */
function revealTile(sel: string | null): void {
  const grid = $("grid");
  const el = sel && grid.querySelector<HTMLElement>(`.tile[data-st="${sel}"]`);
  if (!el || grid.scrollWidth <= grid.clientWidth) return;
  const t = el.getBoundingClientRect(), g = grid.getBoundingClientRect(), edge = 8;
  if (t.left < g.left + edge) grid.scrollLeft -= g.left + edge - t.left;
  else if (t.right > g.right - edge) grid.scrollLeft += t.right - (g.right - edge);
}
