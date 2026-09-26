// The caseworker surface (design/caseworker.html made real): the ScenarioBar
// from the editor with this surface's two actions, one household evaluated
// through /api/evaluate and rendered in full — verdict, coverage,
// corrections, curve, drops, ledger — and its what-ifs beside it. A what-if
// is the base with one answer changed: pressing a chip while a base stands
// adds one, evaluated live, and the chips go back to the base so the next
// press is again one change. The comparison lives in the URL (url.ts).
//
// Costs: a what-if is one API call and one CompareTable render, O(rows ×
// scenarios); the body is rendered for the base alone, O(points + cliffs).
// Landing on a link with N what-ifs is 1 + N calls, in parallel.
import "../../../design/tokens.css";
import "./caseworker.css";
import { axisSpec, countyName, pickArchetypeId, provideData, rawAnswersFromFlags, reachCell, searchParamsFromFlags, validateAnswers, type HouseholdEvaluation, type HouseholdFlags, type SummaryJson } from "@hotgap/core";
import { evaluate, type EvaluateResult } from "../editor/api.js";
import { hasAnswers, mountEditor } from "../editor/index.js";
import { mountChart } from "./chart.js";
import { coreText } from "../lib/copy.js";
import { CHIP_ORDER, copy, t } from "./copy.js";
import { chartLabel, curveTitle, notInSweep, sourceLine, stateName, unclaimedNote, type Provenance } from "./model.js";
import { $ } from "../lib/dom.js";
import { mountFooter } from "../lib/footer.js";
import { pageHref } from "../lib/nav.js";
import { renderAnswer, renderAssumed, renderBreakdown, renderCompare, renderCorrections, renderCoverage, renderDrops, renderHandout, renderLedger, renderMasthead, renderStatic, syncDrops, type Column } from "./render.js";
import { applyDiff, diffFlags, sameDiff, whatIfLabel, whatIfTag, type Diff } from "./scenarios.js";
import { pageQuery, parsePage } from "./url.js";

const S = copy.status, W = copy.whatIf;

/** A what-if column's state: the diff, and either its evaluation or why there is none. */
interface WhatIf { diff: Diff; ev: HouseholdEvaluation | null; state: "computing" | "ok" | "failed" | "unanswered"; reason: string; seq: number }
const fresh = (diff: Diff): WhatIf => ({ diff, ev: null, state: "computing", reason: "", seq: 0 });

const errorText = (r: Extract<EvaluateResult, { ok: false }>): string =>
  r.error === "bad_input" && r.detail ? t("status.errors.badInput", { detail: coreText(r.message, r.detail) }) : r.error === "rate_limited" ? S.errors.rate_limited : r.error === "busy" ? S.errors.busy : S.errors.other;

// ── Data the page reads beside the evaluation ──────────────────────────
const fetchJson = async <T>(url: string): Promise<T | null> => {
  try { const res = await fetch(url); return res.ok ? (await res.json()) as T : null; } catch { return null; }
};
const summaryP = fetchJson<SummaryJson>("/data/summary.json");
/* The site footer (lib/footer.ts), its run line filled when the summary lands. */
mountFooter(summaryP);
const reachP = fetchJson<unknown>("/data/reach.json").then((j) => { if (j) provideData({ "reach.json": j }); });
let countyNamesP: Promise<void> | null = null;
/** The county's name for a FIPS code, the 80 KB table fetched on the first ask. */
const countyNameFor = async (fips: string | null): Promise<string | null> => {
  if (!fips) return null;
  countyNamesP ??= fetchJson<unknown>("/data/county-names.json").then((j) => { if (j) provideData({ "county-names.json": j }); });
  await countyNamesP;
  return countyName(fips);
};

// ── State ───────────────────────────────────────────────────────────────
let baseFlags: HouseholdFlags | null = null;
let baseEv: HouseholdEvaluation | null = null;
let whatIfs: WhatIf[] = [];
let selected: number | null = null;
/* The base evaluation that may render: bumped by every run and by a landing, so a stale one never lands. */
let latest = 0;
/* True while the base's evaluation is in flight; a what-if added then waits for it. */
let baseInFlight = false;
/* Whether the last run was a Try again: a still-archetype answer says "still" rather than repeating itself. */
let retriedSource = false;

renderStatic();
const editor = mountEditor($("app"), {
  page: "caseworker",
  onSubmit: (flags) => void runBase(flags, { submitted: true, push: true }),
  onChange: (flags) => { if (baseFlags) addWhatIf(flags); },
  /* The screen's other exit: the household it holds becomes a what-if of the base (or the base, when there is none yet). */
  altSubmit: { label: copy.actions.addAsWhatIf, onSubmit: (flags) => { if (baseFlags) { addWhatIf(flags); editor.close(); } else void runBase(flags, { submitted: true, push: true }); } },
  /* Edits left on the screen are not a base: the chips always show the base, so a press is one change from it. */
  onClose: () => { if (baseFlags) editor.setFlags(baseFlags); },
  /* The caseworker register, and the counselor's order: facts, the take-up toggles, then the rest (review S1, S2). */
  copy: copy.editor,
  order: CHIP_ORDER,
  /* The chips stay behind the summary line's Edit at every width since 2026-09-18: they are the household,
     not the answer (design/inventory.md § The page is its picture), and the figure has to start on the
     first line after the masthead at 1280 as well as at 390. Every press still adds a what-if. */
  collapse: "always",
  actions: [
    /* "Add a what-if" opens the screen led by "Add as a what-if", so it always ends in a what-if (review S3). */
    { label: copy.actions.whatIf, short: copy.actions.whatIfShort, needsAnswers: true, onClick: () => editor.open("pay", { lead: "alt" }) },
    { label: copy.actions.print, short: copy.actions.printShort, primary: true, needsAnswers: true, onClick: () => window.print() },
  ],
});
const chart = mountChart(
  { wrap: $("chartWrap"), gutter: $("curveAxis") as unknown as SVGSVGElement, scroll: $("curveScroll"), hint: $("curveRange"), svg: $("curve") as unknown as SVGSVGElement, marks: $("marks"), readout: $("readout"), key: $("key"), cap: $("curveCap") },
  { select, close: closeSelection },
);
const content = $("content");
const status = $("status");
const alert = $("alert");

/** Open one of the page's named disclosures: a mark, a link or an action reveals the rows it is about. */
const openPanel = (id: string): void => { const d = document.getElementById(id) as HTMLDetailsElement | null; if (d) d.open = true; };

/* One selection model (M6): a cliff mark, a DropLedger row and the BreakdownBars share `selected`. */
function select(i: number, announce?: string, opts: { moveCursor?: boolean } = {}): void {
  if (!baseEv) return;
  selected = i;
  chart.setSelected(i, opts);
  if (announce) chart.say(announce);
  /* The rows are behind a disclosure now: a mark opens it before it opens the row inside it (M6). The
     initial selection is not a press and does not open anything — it would cost the picture the fold. */
  if (opts.moveCursor !== false) openPanel("steps-panel");
  syncDrops(i, { scroll: opts.moveCursor !== false });
  renderBreakdown(baseEv, i);
}
function closeSelection(): void {
  if (selected === null || !baseEv) return;
  const was = selected;
  selected = null;
  chart.setSelected(null); syncDrops(null); renderBreakdown(baseEv, null);
  chart.focusMark(was);   /* focus returns to the mark when its row closes */
}

const writeUrl = (push: boolean): void => {
  if (!baseFlags) return;
  const url = pageQuery({ base: baseFlags, whatIfs: whatIfs.map((w) => w.diff) });
  if (push && url !== location.search) history.pushState(null, "", url); else history.replaceState(null, "", url);
};

function showError(r: Extract<EvaluateResult, { ok: false }>): void {
  status.textContent = "";
  const strong = document.createElement("strong");
  strong.textContent = S.errorTitle;
  const retry = document.createElement("button");
  retry.type = "button"; retry.className = "hg-button hg-button--small"; retry.textContent = S.tryAgain;
  retry.addEventListener("click", () => { if (baseFlags) void runBase(baseFlags, { submitted: false, push: false }); });
  alert.replaceChildren(strong, " ", errorText(r), " ", retry);
  alert.hidden = false;
}

/**
 * Evaluate the base household and render everything; then re-ask every
 * what-if of it. `submitted` closes the screen and, on a submit, moves
 * focus to the verdict — a landing leaves focus where the page starts
 * (review N1); `push` adds a history entry (a submit does, a landing or a
 * retry replaces — the query is re-serialized in flag order, so a landing
 * URL rarely equals its own rewrite).
 */
async function runBase(flags: HouseholdFlags, { submitted, push }: { submitted: boolean; push: boolean }): Promise<void> {
  const v = validateAnswers(rawAnswersFromFlags(flags));
  if (!v.ok) { editor.showError(v.detail, v.message); return; }
  baseFlags = flags;
  if (submitted) retriedSource = false;   /* a new household is not a retry of the last one */
  writeUrl(push);
  const id = ++latest;
  baseInFlight = true;
  alert.hidden = true;
  status.textContent = t("status.loading", { count: axisSpec(v.value).count });
  const r = await evaluate(flags);
  if (id !== latest) return;
  baseInFlight = false;
  if (!r.ok) {
    /* The page is the new household's or nothing's: what was rendered belonged to the old one. */
    baseEv = null; content.hidden = true;
    if (r.error === "bad_input" && r.detail) editor.showError(r.detail, r.message); else showError(r);
    return;
  }
  if (!(await renderAll(r.evaluation, flags, id))) return;
  status.textContent = "";
  if (submitted) { editor.close(); if (push) $("answer").focus(); }
  for (let i = 0; i < whatIfs.length; i++) void runWhatIf(i);
}

/** Render one evaluation once the data beside it is in; false when a newer base overtook it meanwhile. */
async function renderAll(ev: HouseholdEvaluation, flags: HouseholdFlags, id: number): Promise<boolean> {
  const [summary, , county] = await Promise.all([summaryP, reachP, countyNameFor(ev.source === "live" ? ev.answers.countyFips : null)]);
  if (id !== latest) return false;
  baseEv = ev;
  const cov = summary?.coverage?.[ev.answers.state];
  const prov: Provenance = { cov, summary, county };
  content.hidden = false;
  renderMasthead(ev);
  renderAnswer(ev, reachCell(ev.answers.state, pickArchetypeId(ev.answers)));
  renderCoverage(ev, cov, summary);
  renderCorrections(cov);
  $("curveTitle").textContent = curveTitle(ev);
  $("chartWrap").setAttribute("aria-label", chartLabel(ev));
  selected = null;   /* a recompute may no longer have the cliff that was open */
  chart.render(ev, sourceLine(ev, prov));
  renderDrops(ev, (i) => select(i));
  renderBreakdown(ev, null);
  /* The largest drop opens first — the row a caseworker defending it reads before the chart. */
  const worst = ev.analysis.cliffs.findIndex((c) => c.startEarnings === ev.analysis.worstCliff?.startEarnings);
  if (worst >= 0) select(worst, undefined, { moveCursor: false });
  renderLedger(ev, cov);
  renderCompareTable();
  renderAssumed(ev, prov);
  $("sourceNote").dataset.source = ev.source;
  /* Whose numbers these are stays in the open (§ The page is its picture: nothing that warns hides): the
     SourceNote's own archetype sentence is provenance and sits with the sources, but a page must never
     quietly show one family's curve as another's. */
  const archetype = ev.source === "archetype";
  $("whose").hidden = !archetype;
  if (archetype) $("whoseText").textContent = t(`page.${retriedSource ? "stillArchetype" : "archetype"}`, { state: stateName(ev.answers.state) });
  renderHandout(ev, summary);
  const toCitizen = $<HTMLAnchorElement>("toCitizen");
  toCitizen.href = pageHref("citizen", searchParamsFromFlags(flags));
  toCitizen.textContent = t("toCitizen");
  if (flags.zip) editor.setCounty(flags.zip, county ?? undefined);
  editor.setNote(unclaimedNote(ev));
  return true;
}

// ── What-ifs ────────────────────────────────────────────────────────────
function addWhatIf(flags: HouseholdFlags): void {
  const diff = diffFlags(baseFlags!, flags);
  /* The chips go back to the base, so the next press is again one change from it; focus stays on the chip. */
  editor.setFlags(baseFlags!);
  if (Object.keys(diff).length === 0) return;
  const label = whatIfLabel(diff, flags);
  if (whatIfs.some((w) => sameDiff(w.diff, diff))) { editor.setNote(t("whatIf.already", { label })); return; }
  whatIfs.push(fresh(diff));
  /* The reply says where the column went and takes the reader there (the mockup's own link to #compare). */
  const note = document.createDocumentFragment();
  const link = document.createElement("a");
  link.href = "#compare"; link.textContent = W.compareLink;
  note.append(`${t("whatIf.added", { label })} `, link, W.addedAfterLink, baseEv ? ` ${unclaimedNote(baseEv)}` : "");
  editor.setNote(note);
  /* A person asked for this comparison, so the disclosure it lands in is open by the time the link is pressed. */
  openPanel("compare-panel");
  writeUrl(false);
  renderCompareTable();
  /* With the base still computing, runBase asks every what-if once it lands. */
  if (baseEv && !baseInFlight) void runWhatIf(whatIfs.length - 1);
}

async function runWhatIf(i: number): Promise<void> {
  const w = whatIfs[i];
  if (!w || !baseFlags) return;
  const seq = ++w.seq;
  w.ev = null; w.state = "computing"; w.reason = "";
  renderCompareTable();
  const flags = applyDiff(baseFlags, w.diff);
  const v = validateAnswers(rawAnswersFromFlags(flags));
  const r: EvaluateResult = v.ok ? await evaluate(flags) : { ok: false, error: "bad_input", detail: v.detail, message: v.message };
  if (w.seq !== seq || !whatIfs.includes(w)) return;
  if (!r.ok) { w.state = "failed"; w.reason = errorText(r); }
  else if (baseEv && notInSweep(baseEv, r.evaluation)) { w.state = "unanswered"; w.reason = W.notInSweep; }   /* B1: the fallback's curve is the base's own */
  else { w.ev = r.evaluation; w.state = "ok"; }
  renderCompareTable();
}

function removeWhatIf(i: number): void {
  const [w] = whatIfs.splice(i, 1);
  editor.setNote(t("whatIf.removed", { label: whatIfLabel(w.diff, applyDiff(baseFlags!, w.diff)) }));
  writeUrl(false);
  renderCompareTable();
  $("compare").focus();
}

/**
 * The comparison, in both of the places it now lives: as lines on the
 * picture, which is where a counselor sees it first, and as the table behind
 * *Compare the what-ifs*, which is where she reads the figures off. One
 * source for both, so a column and its line can never disagree.
 */
function renderCompareTable(): void {
  if (!baseEv || !baseFlags) return;
  const cols: Column[] = [
    { title: W.now, ev: baseEv, state: "ok", reason: "" },
    ...whatIfs.map((w, i) => ({ title: whatIfLabel(w.diff, applyDiff(baseFlags!, w.diff)), ev: w.ev, state: w.state, reason: w.reason, index: i })),
  ];
  renderCompare(baseEv, cols, { remove: removeWhatIf, retry: (i) => void runWhatIf(i) });
  /* Only an answered what-if is a line: a column still computing, failed, or outside the sweep has no curve to draw. */
  chart.setWhatIfs(whatIfs.flatMap((w) => (w.ev
    ? [{ tag: whatIfTag(w.diff, applyDiff(baseFlags!, w.diff)), earnings: w.ev.curve.points.map((p) => p.earnings), net: w.ev.curve.points.map((p) => p.netIncome), at: w.ev.analysis.currentEarnings }]
    : [])));
}

/* Paper wants every disclosure open: a closed <details> prints nothing, and on paper there is nobody to
   press anything. The figure's own "How to read this picture" comes with them, so a printed page carries
   the key and the caption (design/inventory.md § The page is its picture). */
addEventListener("beforeprint", () => { for (const d of document.querySelectorAll<HTMLDetailsElement>("details.hg-disclosure")) { d.dataset.wasOpen = String(d.open); d.open = true; } });
addEventListener("afterprint", () => { for (const d of document.querySelectorAll<HTMLDetailsElement>("details.hg-disclosure")) { d.open = d.dataset.wasOpen === "true"; delete d.dataset.wasOpen; } });

// ── Start ───────────────────────────────────────────────────────────────
$("retrySource").addEventListener("click", () => { if (baseFlags) { retriedSource = true; void runBase(baseFlags, { submitted: false, push: false }); } });

function start(): void {
  latest++;   /* whatever was in flight belongs to the URL we left */
  baseInFlight = false;
  const page = parsePage(location.search);
  editor.setFlags(page.base);
  whatIfs = page.whatIfs.map(fresh);
  if (hasAnswers(editor.flags)) void runBase(editor.flags, { submitted: true, push: false });
  else { baseFlags = null; baseEv = null; content.hidden = true; status.textContent = ""; editor.open(); }
}
addEventListener("popstate", start);
start();
