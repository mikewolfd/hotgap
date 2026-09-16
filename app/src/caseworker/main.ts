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
import { axisSpec, countyName, pickArchetypeId, provideData, rawAnswersFromFlags, reachCell, validateAnswers, type HouseholdEvaluation, type HouseholdFlags, type SummaryJson } from "@hotgap/core";
import { evaluate, type EvaluateResult } from "../editor/api.js";
import { hasAnswers, mountEditor } from "../editor/index.js";
import { mountChart } from "./chart.js";
import { chartLabel, curveTitle, sourceLine, unclaimedNote, type Provenance } from "./model.js";
import { $, renderAssumed, renderBreakdown, renderCompare, renderCorrections, renderCoverage, renderDrops, renderHandout, renderLedger, renderVerdict, syncDrops, type Column } from "./render.js";
import { applyDiff, diffFlags, sameDiff, whatIfLabel, type Diff } from "./scenarios.js";
import { pageQuery, parsePage } from "./url.js";

const text = {
  loading: (count: number) => `Evaluating… net income is checked at ${count} pay levels. A household not seen before takes a few seconds.`,
  errorTitle: "The evaluation did not come back.",
  errors: {
    rate_limited: "Too many evaluations in a minute. Wait a minute and try again.",
    busy: "The engine is busy. Try again in a few seconds.",
    other: "The engine did not reply. Nothing was saved. Try again in a minute.",
  },
  tryAgain: "Try again",
  whatIfHint: "Press a take-up chip, or change a value, to add a what-if beside the base household.",
  added: (label: string) => `What-if added: ${label}. It is evaluated beside the base under Compare; the chips show the base.`,
  already: (label: string) => `${label} is already compared.`,
  computing: "computing",
};

interface WhatIf { diff: Diff; ev: HouseholdEvaluation | null; pending: string; seq: number }

const errorText = (r: Extract<EvaluateResult, { ok: false }>): string =>
  r.error === "bad_input" && r.detail ? `not a household: ${r.detail}` : r.error === "rate_limited" ? text.errors.rate_limited : r.error === "busy" ? text.errors.busy : text.errors.other;

// ── Data the page reads beside the evaluation ──────────────────────────
const fetchJson = async <T>(url: string): Promise<T | null> => {
  try { const res = await fetch(url); return res.ok ? (await res.json()) as T : null; } catch { return null; }
};
const summaryP = fetchJson<SummaryJson>("/data/summary.json");
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

const editor = mountEditor($("app"), {
  onSubmit: (flags) => void runBase(flags, { submitted: true, push: true }),
  onChange: (flags) => { if (baseFlags) addWhatIf(flags); },
  /* The screen's other exit: the household it holds becomes a what-if of the base (or the base, when there is none yet). */
  altSubmit: { label: "Add as a what-if", onSubmit: (flags) => { if (baseFlags) { addWhatIf(flags); editor.close(); } else void runBase(flags, { submitted: true, push: true }); } },
  /* Edits left on the screen are not a base: the chips always show the base, so a press is one change from it. */
  onClose: () => { if (baseFlags) editor.setFlags(baseFlags); },
  actions: [
    { label: "Add a what-if", short: "What-if", onClick: () => {
      if (!baseFlags) { editor.open(); return; }   /* the screen itself asks for the household */
      editor.setNote(text.whatIfHint);
      editor.openInputs();
    } },
    { label: "Print the client sheet", short: "Print", primary: true, onClick: () => window.print() },
  ],
});
const chart = mountChart(
  { wrap: $("chartWrap"), svg: $("curve") as unknown as SVGSVGElement, marks: $("marks"), readout: $("readout"), key: $("key"), cap: $("curveCap") },
  { select, close: closeSelection },
);
const content = $("content");
const status = $("status");
const alert = $("alert");

/* One selection model (M6): a cliff mark, a DropLedger row and the BreakdownBars share `selected`. */
function select(i: number, announce?: string, opts: { moveCursor?: boolean } = {}): void {
  if (!baseEv) return;
  selected = i;
  chart.setSelected(i, opts);
  if (announce) chart.say(announce);
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
  strong.textContent = text.errorTitle;
  const retry = document.createElement("button");
  retry.type = "button"; retry.className = "hg-button hg-button--small"; retry.textContent = text.tryAgain;
  retry.addEventListener("click", () => { if (baseFlags) void runBase(baseFlags, { submitted: false, push: false }); });
  alert.replaceChildren(strong, " ", errorText(r), " ", retry);
  alert.hidden = false;
}

/**
 * Evaluate the base household and render everything; then re-ask every
 * what-if of it. `submitted` closes the screen and moves focus to the
 * verdict; `push` adds a history entry (a submit does, a landing or a retry
 * replaces — the query is re-serialized in flag order, so a landing URL
 * rarely equals its own rewrite).
 */
async function runBase(flags: HouseholdFlags, { submitted, push }: { submitted: boolean; push: boolean }): Promise<void> {
  const v = validateAnswers(rawAnswersFromFlags(flags));
  if (!v.ok) { editor.showError(v.detail); return; }
  baseFlags = flags;
  writeUrl(push);
  const id = ++latest;
  baseInFlight = true;
  alert.hidden = true;
  status.textContent = text.loading(axisSpec(v.value).count);
  const r = await evaluate(flags);
  if (id !== latest) return;
  baseInFlight = false;
  if (!r.ok) {
    /* The page is the new household's or nothing's: what was rendered belonged to the old one. */
    baseEv = null; content.hidden = true;
    if (r.error === "bad_input" && r.detail) editor.showError(r.detail); else showError(r);
    return;
  }
  if (!(await renderAll(r.evaluation, flags, id))) return;
  status.textContent = "";
  if (submitted) { editor.close(); $("verdictLine").focus(); }
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
  renderVerdict(ev, reachCell(ev.answers.state, pickArchetypeId(ev.answers)));
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
  $("retrySource").hidden = ev.source !== "archetype";
  renderHandout(ev, summary);
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
  if (whatIfs.some((w) => sameDiff(w.diff, diff))) { editor.setNote(text.already(label)); return; }
  whatIfs.push({ diff, ev: null, pending: text.computing, seq: 0 });
  editor.setNote(`${text.added(label)} ${baseEv ? unclaimedNote(baseEv) : ""}`.trim());
  writeUrl(false);
  renderCompareTable();
  /* With the base still computing, runBase asks every what-if once it lands. */
  if (baseEv && !baseInFlight) void runWhatIf(whatIfs.length - 1);
}

async function runWhatIf(i: number): Promise<void> {
  const w = whatIfs[i];
  if (!w || !baseFlags) return;
  const seq = ++w.seq;
  w.ev = null; w.pending = text.computing;
  renderCompareTable();
  const flags = applyDiff(baseFlags, w.diff);
  const v = validateAnswers(rawAnswersFromFlags(flags));
  const r: EvaluateResult = v.ok ? await evaluate(flags) : { ok: false, error: "bad_input", detail: v.detail };
  if (w.seq !== seq || !whatIfs.includes(w)) return;
  if (r.ok) { w.ev = r.evaluation; w.pending = ""; } else w.pending = errorText(r);
  renderCompareTable();
}

function removeWhatIf(i: number): void {
  whatIfs.splice(i, 1);
  writeUrl(false);
  renderCompareTable();
  $("compare").focus();
}

function renderCompareTable(): void {
  if (!baseEv || !baseFlags) return;
  const cols: Column[] = [
    { title: "Now", ev: baseEv },
    ...whatIfs.map((w, i) => ({ title: whatIfLabel(w.diff, applyDiff(baseFlags!, w.diff)), ev: w.ev, pending: w.pending, index: i })),
  ];
  renderCompare(baseEv, cols, { remove: removeWhatIf, retry: (i) => void runWhatIf(i) });
}

// ── Start ───────────────────────────────────────────────────────────────
$("retrySource").addEventListener("click", () => { if (baseFlags) void runBase(baseFlags, { submitted: false, push: false }); });
const theme = $<HTMLButtonElement>("themeBtn");
theme.addEventListener("click", () => {
  const dark = document.documentElement.getAttribute("data-theme") === "dark";
  document.documentElement.setAttribute("data-theme", dark ? "light" : "dark");
  theme.textContent = dark ? "Dark" : "Light";
});

function start(): void {
  latest++;   /* whatever was in flight belongs to the URL we left */
  baseInFlight = false;
  const page = parsePage(location.search);
  editor.setFlags(page.base);
  whatIfs = page.whatIfs.map((diff) => ({ diff, ev: null, pending: text.computing, seq: 0 }));
  if (hasAnswers(editor.flags)) void runBase(editor.flags, { submitted: true, push: false });
  else { baseFlags = null; baseEv = null; content.hidden = true; status.textContent = ""; editor.open(); }
}
addEventListener("popstate", start);
start();
