// Rendering: the AnswerSentence, the tiles, the coverage notice
// (IncompleteMarker), CorrectionsApplied, the DropLedger and BreakdownBars,
// the ThresholdLedger, the CompareTable, the assumed list with the
// SourceNote, and the client sheet. Every string is copy.ts's or comes from
// the evaluation and the coverage block through model.ts; nothing is typed
// here. Each function is O(its rows).
//
// Since 2026-09-18 the page is its picture (design/inventory.md § The page is
// its picture), so these functions fill two kinds of place: what is always on
// the screen — the answer, and any caution — and what sits inside one of the
// five named disclosures. Which is which is the skeleton's decision
// (caseworker.html), not this module's; the one rule it enforces is that a
// caution goes to the notices and a fact goes behind a press.
import { CLIFF_MIN, type CorrectionNote, type HouseholdEvaluation, type ReachLadder, type StateCoverage, type SummaryJson } from "@hotgap/core";
import { catalog, coreText, deferralUntil, limitWords, type Params } from "../lib/copy.js";
import { correctionRows, sourceWord } from "../lib/corrections.js";
import { $, fillText, h as el } from "../lib/dom.js";
import { esc, listOf, listOfItems, lossFigure, money as usd, signedMoney } from "../lib/format.js";
import { programName } from "../lib/names.js";
import { copy, t } from "./copy.js";
import {
  againLine, answerParts, assumed, cite, columnSub, compareNote, compareRows, handout, incompleteHere, incompleteStates, ledgerNote, ledgerRows,
  modeled, onTheWay, reachSentence, sourceLine, stateName, tiles, type Provenance,
} from "./model.js";

/** The page's fixed words — headings, captions, column heads — from copy.ts into the skeleton, once. */
export function renderStatic(): void {
  const P = copy.page;
  /* The tab's own name: the skeleton's <title> is English so a page has one before the catalog is in (places/render.ts does the same). */
  document.title = copy.pageTitle;
  fillText({
    pageTitle: P.title, skip: P.skip, readout: P.readoutHint, chartKeys: `${P.readoutHint} ${P.readoutKeys}`,
    howToSummary: P.howTo, stepsHeading: P.stepsHeading, drops: P.dropsHeading, dropsCaption: P.dropsCaption,
    colEarnings: P.dropsCols.earnings, colDrop: P.dropsCols.drop, colLost: P.dropsCols.lost, colDriver: P.dropsCols.driver,
    bdFootnote: P.breakdownFootnote, ledger: P.ledgerHeading, ledgerCaption: P.ledgerCaption,
    lColEarnings: P.ledgerCols.earnings, lColProgram: P.ledgerCols.program, lColWho: P.ledgerCols.who,
    compare: P.compareHeading, compareCaption: P.compareCaption, compareEmpty: P.compareEmpty,
    assumptionsHeading: P.assumptionsHeading, reachHeading: P.reachHeading, sourcesHeading: P.sourcesHeading,
    estimates: P.estimates, retrySource: copy.status.tryAgain,
  });
}

/**
 * AnswerSentence (#1): one sentence, as the figure's own caption, each dollar
 * figure wearing the key of the mark it names. The zones beyond this one and
 * the tiles go where a counselor looks second — at the head of *What this
 * family faces, step by step*.
 */
export function renderAnswer(ev: HouseholdEvaluation, cell: ReachLadder | null): void {
  $("answer").replaceChildren(...answerParts(ev).map((p) => ("slot" in p && p.key ? el("span", { class: p.key }, p.text) : p.text)));
  const again = againLine(ev);
  $("again").textContent = again;
  $("again").hidden = again === "";
  $("tiles").innerHTML = tiles(ev, cell).map((t) =>
    `<div class="tile"><span class="lab">${esc(t.label)}</span><span class="val hg-figure">${esc(t.value)}</span><span class="sub">${esc(t.sub)}</span></div>`).join("");
  $("reachNote").textContent = reachSentence(ev);
}

/**
 * IncompleteMarker (#16): from coverage[state].unmodeled[] and every state's
 * block — the count is rendered, never typed. The caution states go to the
 * notices, where nothing hides them; a state the model completes is
 * provenance, not a warning, and sits in *Where these numbers come from*
 * (§ The page is its picture: nothing that warns hides — and nothing that
 * does not warn is allowed to cost the reader the first screen).
 */
export function renderCoverage(ev: HouseholdEvaluation, cov: StateCoverage | undefined, summary: SummaryJson | null): void {
  const st = stateName(ev.answers.state), C = copy.coverage;
  $("coverageHeading").textContent = t("page.coverageHeading", { state: st });
  $("correctionsHeading").textContent = t("page.correctionsHeading", { state: st });
  const swatch = `<span class="hg-swatch hg-swatch--incomplete hg-hatch-incomplete" aria-hidden="true"></span>`;
  const caution = $("incomplete"), quiet = $("coverage");
  const warn = (html: string) => { caution.innerHTML = html; caution.hidden = false; quiet.innerHTML = ""; };
  if (!cov) {
    warn(`<p><strong>${esc(t("coverage.unknown", { state: st }))}</strong> ${esc(summary ? C.noBlock : C.notLoaded)}</p>`);
    return;
  }
  /* Against the household the curve models (an archetype curve is the swept renter, not the flags typed). */
  const h = modeled(ev);
  const mine = incompleteHere(cov, h);
  const states = summary ? incompleteStates(summary, h) : [];
  const elsewhere = t("coverage.elsewhere", { n: states.length, states: listOfItems(states) });
  if (mine.length) {
    warn(`<p>${swatch} <strong>${esc(t("coverage.incomplete", { state: st }))}</strong> ${esc(t("coverage.incompleteBody", { programs: listOf(mine) }))}</p>`);
    return;
  }
  caution.hidden = true;
  caution.innerHTML = "";
  quiet.innerHTML = `<p><strong>${esc(t("coverage.complete", { state: st }))}</strong> ${esc(C.completeBody)}` +
    (states.length ? ` ${esc(elsewhere)} ${swatch} ${esc(C.elsewhereAfterMark)}` : "") + `</p>`;
}

/** CorrectionsApplied (#18): coverage[state].corrections, applies === true; the rest named as checked. */
export function renderCorrections(cov: StateCoverage | undefined): void {
  const C = copy.corrections, c = cov?.corrections;
  const rows = correctionRows(c);
  /* The office, the note and the mockup say TAFDC for Massachusetts's row (review N10). */
  const program = (r: { program: string; note: string }) => (c?.maTafdc.applies && r.note === coreText(c.maTafdc.message, c.maTafdc.note) ? C.tafdc : r.program);
  $("corrections").innerHTML = rows.length
    ? rows.map((r) => `<li><span class="hg-rows__at">${esc(program(r))}</span><p>` +
        (r.source ? `<span class="hg-tag">${esc(sourceWord(r.source))}</span> ` : "") +
        `<span class="hg-cite">${esc(r.note)}${r.href ? ` <a href="${esc(r.href)}">${esc(C.source)}</a>` : ""}</span></p></li>`).join("")
    : `<li><span class="hg-rows__at">${esc(cov ? C.none : C.unknown)}</span><p class="hg-cite">${esc(cov ? C.noneBody : C.unknownBody)}</p></li>`;
  const rest: string[] = [];
  const checked = (program: string, n: CorrectionNote, overrides?: Params) => rest.push(t("corrections.checked", { program, note: coreText(n.message, n.note, overrides) }));
  if (c) {
    if (!c.maTafdc.applies) checked(C.tafdcChecked, c.maTafdc);
    if (!c.premiumAssistance.applies) checked(c.premiumAssistance.program ?? C.premiumHelp, c.premiumAssistance);
    if (!c.childcareSubsidy.applies) checked(programName("childcare"), c.childcareSubsidy);
    if (!c.coverageGap.applies) checked(C.coverageGap, c.coverageGap);
    if (c.liheap && !c.liheap.applies) checked(programName("liheap"), c.liheap, cov?.liheap ? { limit: limitWords(cov.liheap.limit) } : undefined);
  }
  $("correctionsRest").textContent = rest.length ? t("corrections.rest", { items: rest.join(" ") }) : "";
}

/**
 * DropLedger (#8): every cliff as a row whose button selects it.
 *
 * This pass briefly put each cliff's position — how many families like this
 * one already earn more — on every row, so the fourth cliff would be as
 * defensible as the two the tiles carry. Two readers stopped on it: a parent
 * said she did not need to be ranked while she was sitting there, and a
 * counselor said the percentile was for her and not for them. Ten rows of it
 * was nine too many; the two facts a counselor reads out keep theirs on the
 * tiles, where they are one press away and not in front of the family.
 */
export function renderDrops(ev: HouseholdEvaluation, onSelect: (i: number) => void): void {
  const rows = $("dropRows"), D = copy.drops;
  rows.innerHTML = ev.analysis.cliffs.map((c) =>
    `<tr><td><button class="hg-row-btn" type="button">${esc(t("drops.range", { from: usd(c.startEarnings), to: usd(c.endEarnings) }))}</button></td>` +
    `<td class="num money">${esc(lossFigure(c.drop))}</td>` +
    `<td>${c.programsLost.length ? esc(listOfItems(c.programsLost.map(programName))) : `<span class="unnamed">${esc(D.noneNamed)}</span>`}` +
    (c.deferral ? ` <span class="hg-badge">${esc(D.deferred)}</span><span class="hg-cite">${esc(t("drops.until", { when: deferralUntil(c.deferral.reason) }))}</span>` : "") + `</td>` +
    `<td>${esc(t(`drops.drivers.${c.driver}`))}</td></tr>`).join("");
  rows.querySelectorAll<HTMLButtonElement>("button").forEach((b, i) => b.addEventListener("click", () => onSelect(i)));
  $("dropsEmpty").textContent = t("drops.empty", { min: usd(CLIFF_MIN) });
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
  const host = $("bdBars"), B = copy.breakdown;
  if (selected === null) {
    $("bdTitle").textContent = B.idle;
    host.innerHTML = `<p class="footnote">${esc(B.idleBody)}</p>`;
    return;
  }
  const c = ev.analysis.cliffs[selected];
  $("bdTitle").textContent = t("breakdown.title", { drop: usd(c.drop), from: usd(c.startEarnings), to: usd(c.endEarnings) });
  const parts: [string, number][] = [[B.parts.benefits, c.breakdown.benefits], [B.parts.credits, c.breakdown.credits], [B.parts.premiums, c.breakdown.premiums], [B.parts.other, c.breakdown.other]];
  const max = Math.max(...parts.map((p) => Math.abs(p[1])), 1);
  host.innerHTML = `<div class="bd-row bd-axis" aria-hidden="true"><span class="bd-track"><span>${esc(B.offsets)}</span><span>${esc(B.adds)}</span></span></div>` +
    parts.map(([label, v]) => {
      const w = (Math.abs(v) / max) * 50;
      return `<div class="bd-row"><span class="bd-label">${esc(label)}</span><span class="bd-val">${esc(signedMoney(v))}</span><span class="bd-track"><span class="bd-zero"></span>` +
        `<span class="bd-fill${v < 0 ? " neg" : ""}" style="left:${v < 0 ? 50 - w : 50}%;width:${w}%;background:var(--loss-${v < 0 ? 2 : 4})"></span></span></div>`;
    }).join("") +
    `<p class="footnote bd-sum">${esc(t("breakdown.sum", { drop: usd(c.drop), driver: t(`drops.drivers.${c.driver}`) }))}</p>`;
}

/** ThresholdLedger (#7): every program's end, its cite from the curve and the coverage block. */
export function renderLedger(ev: HouseholdEvaluation, cov: StateCoverage | undefined): void {
  const L = copy.ledger;
  $("ledgerRows").innerHTML = ledgerRows(ev).map((r) => {
    const note = cite(ev, r, cov);
    return `<tr${r.boundary ? ` data-boundary="${r.credit ? "credit" : "true"}"` : ""}><td class="num money">${esc(usd(r.at))}</td><td>${esc(programName(r.id))}` +
      (r.boundary && !r.credit ? ` <span class="hg-tag">${esc(L.ifYouApply)}</span>` : "") +
      (r.deferred ? ` <span class="hg-badge">${esc(L.deferred)}</span>` : "") +
      (note ? `<span class="hg-cite">${esc(note)}</span>` : "") + `</td><td class="who">${esc(L.who[r.group])}</td></tr>`;
  }).join("");
  $("ledgerNote").textContent = ledgerNote(ev, cov);
}

/** One column of the CompareTable: the base, or a what-if that is evaluated, still computing, failed, or one the sweep cannot answer. */
export interface Column {
  title: string;
  ev: HouseholdEvaluation | null;
  state: "computing" | "ok" | "failed" | "unanswered";
  /** A failed column's sentence, shown beside Try again in the footer (review S6). */
  reason: string;
  /** Present on a what-if: it can be removed or, without an evaluation, retried. */
  index?: number;
}

export function renderCompare(base: HouseholdEvaluation, cols: Column[], on: { remove(i: number): void; retry(i: number): void }): void {
  const W = copy.whatIf;
  const what = (c: Column) => c.index !== undefined;
  const cls = (c: Column, more = "") => `class="num${more}${what(c) ? " b" : ""}"`;
  /* The header keeps the column's name and shape; a failure's sentence goes to the footer (S6); a shape the sweep cannot answer says so (B1). */
  const sub = (c: Column) => c.ev ? `${columnSub(c.ev)}${c.ev.source === "archetype" ? ` ${W.archetype}` : ""}`
    : c.state === "computing" ? W.computing : c.state === "unanswered" ? W.notInSweep : W.failed;
  $("compareHead").innerHTML = `<th scope="col"></th>` + cols.map((c) =>
    `<th scope="col" ${cls(c)}>${esc(c.title)}<br><span class="hg-cite">${esc(sub(c))}</span></th>`).join("");
  $("compareRows").innerHTML = compareRows(base).map((r) =>
    `<tr><th scope="row">${esc(r.label)}</th>` + cols.map((c) =>
      `<td ${cls(c, `${r.money ? " money" : ""}${r.wrap ? " wrap" : ""}`)}>${c.ev ? esc(r.cell(c.ev)) : c.state === "computing" ? W.ellipsis : W.dash}</td>`).join("") + "</tr>").join("");
  /* A what-if's controls live in a footer row, not its header, so a column's announced name stays its name. */
  const foot = $("compareFoot");
  foot.hidden = !cols.some(what);
  foot.innerHTML = foot.hidden ? "" : `<tr class="hg-no-print"><th scope="row">${esc(W.thisWhatIf)}</th>` + cols.map((c) => `<td ${cls(c)}>` + (what(c)
    ? (c.state === "failed" ? `<span class="hg-cite">${esc(c.reason)}</span>` : "") + `<span class="col-actions">` +
      (c.ev === null && c.state !== "computing" ? `<button type="button" class="hg-button" data-retry="${c.index}">${esc(copy.status.tryAgain)}</button>` : "") +
      `<button type="button" class="hg-button" data-remove="${c.index}" aria-label="${esc(t("whatIf.removeAria", { title: c.title }))}">${esc(W.remove)}</button></span>`
    : "") + `</td>`).join("") + "</tr>";
  foot.querySelectorAll<HTMLButtonElement>("[data-remove]").forEach((b) => b.addEventListener("click", () => on.remove(Number(b.dataset.remove))));
  foot.querySelectorAll<HTMLButtonElement>("[data-retry]").forEach((b) => b.addEventListener("click", () => on.retry(Number(b.dataset.retry))));
  $("compareNote").textContent = compareNote(base, cols.flatMap((c) => (c.ev && c.ev !== base ? [c.ev] : [])), cols.filter((c) => c.state === "unanswered").length);
  $("compareEmpty").hidden = cols.length > 1;
  renderOnTheWay(base, cols);
}

/**
 * On the way (Plan 9): under the table, one short list per pay what-if that
 * changed pay from the base — the cliffs `onTheWay` (model.ts) reads off
 * core's own `cliffsBetween`, each with the DeferredBadge where the cliff
 * carries one and its position as the cite. A toggle what-if (the same pay
 * as the base) gets no list at all, not an empty one (`onTheWay` returns
 * null for it); a pay what-if whose stretch holds no cliff prints the
 * empty line instead of an empty `<ul>`.
 */
function renderOnTheWay(base: HouseholdEvaluation, cols: Column[]): void {
  const OW = copy.compare.onTheWay;
  const sections = cols.flatMap((c) => {
    if (c.index === undefined || !c.ev) return [];
    const items = onTheWay(base, c.ev);
    return items === null ? [] : [{ title: c.title, items }];
  });
  $("onTheWay").innerHTML = sections.map(({ title, items }) => `<div class="on-the-way__col"><h3>${esc(t("compare.onTheWay.heading", { title }))}</h3>` +
    (items.length
      ? `<ul>${items.map((it) => `<li>${esc(it.text)}` +
          (it.deferred ? ` <span class="hg-badge">${esc(copy.drops.deferred)}</span>` : "") +
          (it.position ? `<span class="hg-cite">${esc(it.position)}</span>` : "") + `</li>`).join("")}</ul>`
      : `<p class="footnote">${esc(OW.empty)}</p>`) + `</div>`).join("");
}

/**
 * Paper has no ScenarioBar (review N5), and since the page opens with the
 * answer it has no wordmark either: one print-only line says whose numbers
 * these are, above the sentence, the way the citizen sheet does.
 */
export function renderMasthead(ev: HouseholdEvaluation): void {
  $("masthead").replaceChildren(el("strong", {}, catalog.editor.wordmark), " ",
    t("page.who", { adults: copy.compare.adults[ev.answers.married ? "two" : "one"], state: stateName(ev.answers.state), earnings: usd(ev.analysis.currentEarnings) }));
}

export function renderAssumed(ev: HouseholdEvaluation, prov: Provenance): void {
  $("assumed").innerHTML = assumed(ev, prov.cov).map((t) => `<li>${esc(t)}</li>`).join("");
  $("sourceNote").textContent = sourceLine(ev, prov);
}

export function renderHandout(ev: HouseholdEvaluation, summary: SummaryJson | null): void {
  const h = handout(ev, summary);
  $("handout").innerHTML = `<h2>${esc(h.title)}</h2>` + h.paragraphs.map((t) => `<p>${esc(t)}</p>`).join("");
}
