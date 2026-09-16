// Rendering: the verdict and tiles, the coverage notice (IncompleteMarker),
// CorrectionsApplied, the DropLedger and BreakdownBars, the ThresholdLedger,
// the CompareTable, the assumed list with the SourceNote, and the client
// sheet. Every string comes from the evaluation or the coverage block
// through model.ts; nothing is typed. Each function is O(its rows).
import { CLIFF_MIN, type HouseholdEvaluation, type ReachLadder, type StateCoverage, type SummaryJson } from "@hotgap/core";
import { money } from "../lib/format.js";
import { programName } from "../lib/programs.js";
import { esc, list } from "../places/format.js";
import { correctionRows } from "../places/model.js";
import {
  assumed, cite, columnSub, compareNote, compareRows, handout, incompleteHere, incompleteStates, ledgerNote, ledgerRows,
  modeled, neg, signed, sourceLine, stateName, tiles, verdict, type Provenance,
} from "./model.js";

export const $ = <T extends HTMLElement = HTMLElement>(id: string): T => document.getElementById(id) as T;

export function renderVerdict(ev: HouseholdEvaluation, cell: ReachLadder | null): void {
  const v = verdict(ev);
  $("verdictLine").textContent = v.line;
  $("verdictSub").textContent = v.sub;
  $("tiles").innerHTML = tiles(ev, cell).map((t) =>
    `<div class="tile"><span class="lab">${esc(t.label)}</span><span class="val hg-figure">${esc(t.value)}</span><span class="sub">${esc(t.sub)}</span></div>`).join("");
}

/** IncompleteMarker (#16): from coverage[state].unmodeled[] and every state's block — the count is rendered, never typed. */
export function renderCoverage(ev: HouseholdEvaluation, cov: StateCoverage | undefined, summary: SummaryJson | null): void {
  const st = stateName(ev.answers.state);
  for (const el of document.querySelectorAll(".stateName")) el.textContent = st;
  const swatch = `<span class="hg-swatch hg-swatch--incomplete hg-hatch-incomplete" aria-hidden="true"></span>`;
  if (!cov) {
    $("coverage").innerHTML = `<div class="hg-callout hg-callout--caution"><p><strong>Coverage unknown for ${esc(st)}.</strong> ` +
      (summary ? "The sweep on this site recorded no coverage block for this state, so nothing here can say what the model leaves out."
        : "The weekly sweep's summary did not load, so nothing here can say what the model leaves out. Reload to try again.") + `</p></div>`;
    return;
  }
  /* Against the household the curve models (an archetype curve is the swept renter, not the flags typed). */
  const h = modeled(ev);
  const mine = incompleteHere(cov, h);
  const states = summary ? incompleteStates(summary, h) : [];
  $("coverage").innerHTML = mine.length
    ? `<div class="hg-callout hg-callout--caution"><p>${swatch} <strong>Figures incomplete in ${esc(st)}.</strong> ` +
      `The model cannot compute ${esc(list(mine))} here, so a cliff this household would meet is missing from this curve. ` +
      `Every figure on this page is a floor, not a measurement. Do not read this household as better off than one in a state the model can complete.</p></div>`
    : `<div class="hg-callout"><p><strong>Figures complete for ${esc(st)}.</strong> Nothing this household would hold is unmodelled here.` +
      (states.length ? ` In ${states.length} state${states.length === 1 ? "" : "s"} (${states.join(", ")}) this line would carry the ${swatch} mark and every figure on the page would be a floor.` : "") + `</p></div>`;
}

/** CorrectionsApplied (#18): coverage[state].corrections, applies === true; the rest named as checked. */
export function renderCorrections(cov: StateCoverage | undefined): void {
  const rows = correctionRows(cov?.corrections);
  $("corrections").innerHTML = rows.length
    ? rows.map((r) => `<li><span class="hg-rows__at">${esc(r.program)}</span><p>` +
        (r.source ? `<span class="hg-tag">${esc(r.source)}</span> ` : "") +
        `<span class="hg-cite">${esc(r.note)}${r.href ? ` <a href="${esc(r.href)}">source</a>` : ""}</span></p></li>`).join("")
    : cov ? `<li><span class="hg-rows__at">None</span><p class="hg-cite">No HotGap-side correction touches this state's numbers.</p></li>`
    : `<li><span class="hg-rows__at">Unknown</span><p class="hg-cite">The coverage block did not load, so the corrections behind these numbers cannot be listed.</p></li>`;
  const c = cov?.corrections, rest: string[] = [];
  if (c) {
    if (!c.maTafdc.applies) rest.push(`TAFDC: ${c.maTafdc.note}`);
    if (!c.premiumAssistance.applies) rest.push(`${c.premiumAssistance.program ?? "State premium help"}: ${c.premiumAssistance.note}`);
    if (!c.childcareSubsidy.applies) rest.push(`${programName("childcare")}: ${c.childcareSubsidy.source}: ${c.childcareSubsidy.note}`);
    if (!c.coverageGap.applies) rest.push(`Coverage gap: ${c.coverageGap.note}`);
  }
  $("correctionsRest").textContent = rest.length ? `Checked and not applying here — ${rest.join(" ")}` : "";
}

/** DropLedger (#8): every cliff as a row whose button selects it. */
export function renderDrops(ev: HouseholdEvaluation, onSelect: (i: number) => void): void {
  const rows = $("dropRows");
  rows.innerHTML = ev.analysis.cliffs.map((c) =>
    `<tr><td><button class="hg-row-btn" type="button">${money(c.startEarnings)} → ${money(c.endEarnings)}</button></td>` +
    `<td class="num money">${neg(c.drop)}</td>` +
    `<td>${c.programsLost.length ? esc(c.programsLost.map(programName).join(", ")) : `<span class="unnamed">none named</span>`}` +
    (c.deferral ? ` <span class="hg-badge">Deferred</span><span class="hg-cite">until ${esc(c.deferral.until)}</span>` : "") + `</td>` +
    `<td>${c.driver}</td></tr>`).join("");
  rows.querySelectorAll<HTMLButtonElement>("button").forEach((b, i) => b.addEventListener("click", () => onSelect(i)));
  $("dropsEmpty").textContent = `No step down of ${money(CLIFF_MIN)} or more anywhere on this curve.`;
  $("dropsEmpty").hidden = ev.analysis.cliffs.length > 0;
}

/** Mark the open row (the row is the card); a press also scrolls it into view, the initial selection does not. */
export function syncDrops(selected: number | null, { scroll = false } = {}): void {
  [...$("dropRows").children].forEach((tr, i) => {
    const b = tr.querySelector("button")!;
    if (i === selected) { b.setAttribute("aria-current", "true"); if (scroll) tr.scrollIntoView({ block: "nearest" }); } else b.removeAttribute("aria-current");
  });
}

/** BreakdownBars (#9): four signed bars from a centre zero; the sum is stated. */
export function renderBreakdown(ev: HouseholdEvaluation, selected: number | null): void {
  const host = $("bdBars");
  if (selected === null) {
    $("bdTitle").textContent = "Where a drop went";
    host.innerHTML = `<p class="footnote">Select a step above, or a mark on the chart.</p>`;
    return;
  }
  const c = ev.analysis.cliffs[selected];
  $("bdTitle").textContent = `Where the ${money(c.drop)} went — ${money(c.startEarnings)} to ${money(c.endEarnings)}`;
  const parts: [string, number][] = [["Benefits", c.breakdown.benefits], ["Credits", c.breakdown.credits], ["Premiums", c.breakdown.premiums], ["Other", c.breakdown.other]];
  const max = Math.max(...parts.map((p) => Math.abs(p[1])), 1);
  host.innerHTML = `<div class="bd-row bd-axis" aria-hidden="true"><span></span><span class="bd-track"><span>offsets the loss</span><span>adds to the loss</span></span><span></span></div>` +
    parts.map(([label, v]) => {
      const w = (Math.abs(v) / max) * 50;
      return `<div class="bd-row"><span>${label}</span><span class="bd-track"><span class="bd-zero"></span>` +
        `<span class="bd-fill${v < 0 ? " neg" : ""}" style="left:${v < 0 ? 50 - w : 50}%;width:${w}%;background:var(--loss-${v < 0 ? 2 : 4})"></span></span>` +
        `<span class="bd-val">${signed(v)}</span></div>`;
    }).join("") +
    `<p class="footnote bd-sum">Sums to ${money(c.drop)}, the drop. Driver: ${c.driver}.</p>`;
}

/** ThresholdLedger (#7): every program's end, its cite from the curve and the coverage block. */
export function renderLedger(ev: HouseholdEvaluation, cov: StateCoverage | undefined): void {
  $("ledgerRows").innerHTML = ledgerRows(ev).map((r) => {
    const note = cite(ev, r, cov);
    return `<tr><td class="num money">${money(r.at)}</td><td>${esc(programName(r.id))}` +
      (r.deferred ? ` <span class="hg-badge">Deferred</span>` : "") +
      (note ? `<span class="hg-cite">${esc(note)}</span>` : "") + `</td><td class="who">${r.group}</td></tr>`;
  }).join("");
  $("ledgerNote").textContent = ledgerNote(ev, cov);
}

/** One column of the CompareTable: the base, or a what-if that is evaluated, still computing, or failed. */
export interface Column {
  title: string;
  ev: HouseholdEvaluation | null;
  /** Why there is no evaluation yet: "computing", or the failure to show. */
  pending?: string;
  /** Present on a what-if: it can be removed or, after a failure, retried. */
  index?: number;
}

export function renderCompare(base: HouseholdEvaluation, cols: Column[], on: { remove(i: number): void; retry(i: number): void }): void {
  const what = (c: Column) => c.index !== undefined;
  const cls = (c: Column, more = "") => `class="num${more}${what(c) ? " b" : ""}"`;
  $("compareHead").innerHTML = `<th scope="col"></th>` + cols.map((c) => {
    const sub = c.ev ? columnSub(c.ev) + (c.ev.source === "archetype" ? " · archetype" : "") : c.pending ?? "";
    return `<th scope="col" ${cls(c)}>${esc(c.title)}<br><span class="hg-cite">${esc(sub)}</span></th>`;
  }).join("");
  $("compareRows").innerHTML = compareRows(base).map((r) =>
    `<tr><th scope="row">${esc(r.label)}</th>` + cols.map((c) =>
      `<td ${cls(c, r.money ? " money" : "")}>${c.ev ? esc(r.cell(c.ev)) : c.pending === "computing" ? "…" : "—"}</td>`).join("") + "</tr>").join("");
  /* A what-if's controls live in a footer row, not its header, so a column's announced name stays its name. */
  const foot = $("compareFoot");
  foot.hidden = !cols.some(what);
  foot.innerHTML = foot.hidden ? "" : `<tr class="hg-no-print"><th scope="row">This what-if</th>` + cols.map((c) => `<td ${cls(c)}>` + (what(c)
    ? `<span class="col-actions">` +
      (c.ev === null && c.pending !== "computing" ? `<button type="button" class="hg-button hg-button--small" data-retry="${c.index}">Try again</button>` : "") +
      `<button type="button" class="hg-button hg-button--small" data-remove="${c.index}" aria-label="Remove the what-if ${esc(c.title)}">Remove</button></span>`
    : "") + `</td>`).join("") + "</tr>";
  foot.querySelectorAll<HTMLButtonElement>("[data-remove]").forEach((b) => b.addEventListener("click", () => on.remove(Number(b.dataset.remove))));
  foot.querySelectorAll<HTMLButtonElement>("[data-retry]").forEach((b) => b.addEventListener("click", () => on.retry(Number(b.dataset.retry))));
  $("compareNote").textContent = compareNote(base, cols.flatMap((c) => (c.ev && c.ev !== base ? [c.ev] : [])));
  $("compareEmpty").hidden = cols.length > 1;
}

export function renderAssumed(ev: HouseholdEvaluation, prov: Provenance): void {
  $("assumed").innerHTML = assumed(ev, prov.cov).map((t) => `<li>${esc(t)}</li>`).join("");
  $("sourceNote").textContent = sourceLine(ev, prov);
}

export function renderHandout(ev: HouseholdEvaluation, summary: SummaryJson | null): void {
  const h = handout(ev, summary);
  $("handout").innerHTML = `<h2>${esc(h.title)}</h2>` + h.paragraphs.map((t) => `<p>${esc(t)}</p>`).join("");
}
