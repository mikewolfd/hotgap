// The caseworker surface's reading of one HouseholdEvaluation and its state's
// coverage block (design/caseworker.html's inline script, as pure functions):
// the lift, the verdict in the caseworker register, the tiles, the
// IncompleteMarker test, the ThresholdLedger under the one threshold
// convention, the CompareTable rows, the assumed list, the SourceNote and the
// client sheet. No DOM, no fetch — vitest covers it directly (model.test.ts).
// Every figure is annual (design/inventory.md M5): this reader checks the
// table against the file.
import {
  ARCHETYPES,
  answersFor,
  CHILDCARE_MAX_AGE,
  COVERAGE_PROGRAMS,
  DEFERRAL_UNTIL,
  pickArchetypeId,
  STATE_NAMES,
  type Cliff,
  type HouseholdAnswers,
  type HouseholdEvaluation,
  type ProgramId,
  type ReachLadder,
  type StateCoverage,
  type SummaryJson,
  type UnmodeledProgram,
} from "@hotgap/core";
import { dateOf, list, modelLine, reachWord } from "../places/format.js";
import { money } from "../lib/format.js";
import { programName, programPhrase } from "../lib/programs.js";
import { verdictSentence } from "../lib/verdict.js";

/** "−$25,449": a loss, with a true minus. */
export const neg = (n: number): string => `−${money(Math.abs(n))}`;
/** "+$1,590" / "−$875": a signed share. */
export const signed = (n: number): string => `${n < 0 ? "−" : "+"}${money(Math.abs(n))}`;
export const ordinal = (n: number): string => { const s = ["th", "st", "nd", "rd"], v = n % 100; return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]); };
export const stateName = (st: string): string => STATE_NAMES[st] ?? st;

/** The axis step between consecutive points ($1,000 on the sweep). */
export const stepOf = (ev: HouseholdEvaluation): number => ev.curve.points[1].earnings - ev.curve.points[0].earnings;
export const earningsOf = (ev: HouseholdEvaluation): number[] => ev.curve.points.map((p) => p.earnings);
/** The index of an earnings figure on the axis. */
export const indexOf = (ev: HouseholdEvaluation, earnings: number): number =>
  Math.round((earnings - ev.curve.points[0].earnings) / stepOf(ev));

/**
 * THE LIFT (design/charts.md § 1): analysis.dangerZones, the verdict and
 * `personal` describe the curve with deferred drops removed; curve.points do
 * not. Plot this line. O(points × deferred).
 */
export function lifted(ev: HouseholdEvaluation): number[] {
  const net = ev.curve.points.map((p) => p.netIncome);
  for (const d of ev.deferred) for (let k = indexOf(ev, d.startEarnings) + 1; k < net.length; k++) net[k] += d.drop;
  return net;
}

/** The cliff object `nextCliff`/`worstCliff` name — they are never the same object as a `cliffs` entry (evaluate.ts). */
export const cliffAt = (ev: HouseholdEvaluation, ref: { startEarnings: number } | null): Cliff | null =>
  ref ? ev.analysis.cliffs.find((c) => c.startEarnings === ref.startEarnings) ?? null : null;

/**
 * The household the curve actually models. Live: the answers as given. An
 * archetype curve is the swept household's — the state's typical renter
 * (answersFor) — not the flags the caller typed, and every sentence about
 * rent, care or take-up has to say so.
 */
export const modeled = (ev: HouseholdEvaluation): HouseholdAnswers =>
  ev.source === "live" ? ev.answers : answersFor(ev.answers.state, ARCHETYPES.find((a) => a.id === pickArchetypeId(ev.answers))!);

export const archetypeOf = (ev: HouseholdEvaluation): string => pickArchetypeId(ev.answers);

// ── Verdict (M2), the caseworker register ───────────────────────────────
export interface Verdict { line: string; sub: string; /** "It happens again…", when more zones lie beyond the household's. */ again: string }

export function verdict(ev: HouseholdEvaluation): Verdict {
  const a = ev.analysis, p = ev.personal, e = ev.escape;
  const top = ev.curve.points[ev.curve.points.length - 1].earnings;
  const next = cliffAt(ev, a.nextCliff);
  const start = money(p.zone?.startEarnings ?? 0), peak = money(p.zone?.peakNet ?? 0);
  const exit = p.escapeEarnings === null ? "" : money(p.escapeEarnings);
  const again = a.verdict === "in_danger_zone" && !p.raiseIsLowerBound && e.safeExitEarnings !== null && e.safeExitEarnings !== p.escapeEarnings
    ? `It happens again between ${exit} and ${money(e.safeExitEarnings)}.` : "";
  const line = a.verdict === "always_up" ? "No danger zone. Net rises with every step of earnings on the axis."
    : a.verdict === "cliff_ahead" ? `A cliff ahead: at ${money(next!.endEarnings)} net drops ${money(next!.drop)}. Below it, more pay is more money.`
    : a.verdict === "cliff_behind" ? "Past the cliff. The big drop is below current earnings; from here, more pay is more money."
    : p.raiseIsLowerBound
      ? `In a danger zone with no exit on the axis. From ${start} up to ${money(top)} of earnings, net never gets back to the ${peak} it reaches at ${start}.`
      : `In a danger zone. Between ${start} and ${exit} of earnings, net never gets back to the ${peak} it reaches at ${start}. Clear at ${exit}: a raise of ${money(p.raiseToClear ?? 0)}.`;
  const sub = again
    ? `${again} Safe from ${money(e.safeExitEarnings!)}: a raise of ${money(e.leap)}${e.leapIsLowerBound ? " or more" : ""}.`
    : e.safeExitEarnings === null ? "The sweep never found a pay past which no zone remains." : "";
  return { line, sub, again };
}

// ── StatTiles (#2) ──────────────────────────────────────────────────────
export interface Tile { label: string; value: string; sub: string }

/** Reach's margin is the 90% MoE of the ladder point the percentile sits on (reach.json), never a probability. */
export function tiles(ev: HouseholdEvaluation, cell: ReachLadder | null): Tile[] {
  const a = ev.analysis, p = ev.personal, top = ev.curve.points[ev.curve.points.length - 1].earnings;
  const out: Tile[] = [{ label: "Net, after premiums", value: money(a.currentNet), sub: `at ${money(a.currentEarnings)} earned` }];
  if (a.verdict === "in_danger_zone") out.push({
    label: "Raise to clear the zone", value: `${p.raiseIsLowerBound ? "> " : ""}${money(p.raiseToClear ?? 0)}`,
    sub: p.raiseIsLowerBound ? `not found below ${money(top)}` : `to ${money(p.escapeEarnings ?? 0)} earned`,
  });
  if (a.worstCliff) out.push({ label: "Largest single-step drop", value: money(a.worstCliff.drop), sub: `at ${money(a.worstCliff.startEarnings)} → ${money(a.worstCliff.endEarnings)}` });
  const pct = ev.reach.current;
  if (pct !== null && cell) {
    const steps = cell.ladder.length - 1, i = Math.min(steps, Math.floor((pct / 100) * steps));
    out.push({ label: "Reach at current earnings", value: ordinal(Math.round(pct)), sub: `percentile, ±${money(cell.moe[i])} (n = ${cell.n})` });
  }
  return out;
}

// ── IncompleteMarker (#16) ──────────────────────────────────────────────
/**
 * An unmodeled entry counts against a household when it could move its
 * figures: a premium program always, the child-care entry only with a child
 * of care age and paid care, LIHEAP never (design/inventory.md § IncompleteMarker).
 */
export const bitesHousehold = (u: UnmodeledProgram, a: HouseholdAnswers): boolean =>
  u.program !== "LIHEAP" && (!/child.?care/i.test(u.program) || (a.childAges.some((age) => age <= CHILDCARE_MAX_AGE) && (a.monthlyChildcare ?? 0) > 0));

export const incompleteHere = (cov: StateCoverage | undefined, a: HouseholdAnswers): string[] =>
  (cov?.unmodeled ?? []).filter((u) => bitesHousehold(u, a)).map((u) => u.program);

/** Every state whose block would mark this household incomplete — the count is rendered, never typed. */
export const incompleteStates = (summary: SummaryJson, a: HouseholdAnswers): string[] =>
  Object.entries(summary.coverage ?? {}).filter(([, cov]) => incompleteHere(cov, a).length > 0).map(([st]) => st).sort();

// ── ThresholdLedger (#7, S5) ────────────────────────────────────────────
export interface LedgerRow {
  /** The first pay at which the program is gone (§ Where a program ends). */
  at: number;
  id: ProgramId;
  group: "Adult" | "Children" | "Household";
  cliff?: Cliff;
  /** When the loss lands, if not this year. */
  deferred: string | null;
}

/**
 * Every program's end, from the cliff list first (the landing point of the
 * step that removes it) and then escape.programEnds + one axis step for a
 * program that ends without a cliff. Sorted by earnings. O(cliffs × programs).
 */
export function ledgerRows(ev: HouseholdEvaluation): LedgerRow[] {
  const step = stepOf(ev), ends = ev.escape, adults = ends.programEndsByAge.adults, children = ends.programEndsByAge.children;
  const who = (id: ProgramId, start: number): LedgerRow["group"] => {
    const a = adults[id], c = children[id];
    if (a !== undefined && c === undefined) return "Adult";
    if (c !== undefined && a === undefined) return "Children";
    if (a === start && c !== start) return "Adult";
    if (c === start && a !== start) return "Children";
    return "Household";
  };
  const seen = new Set<string>(), out: LedgerRow[] = [];
  for (const c of ev.analysis.cliffs) for (const id of c.programsLost) {
    const group = who(id, c.startEarnings);
    seen.add(`${id}|${group}`);
    out.push({ at: c.endEarnings, id, group, cliff: c, deferred: c.deferral?.until ?? null });
  }
  for (const [group, map] of [["Adult", adults], ["Children", children]] as const)
    for (const [id, at] of Object.entries(map) as [ProgramId, number][]) if (!seen.has(`${id}|${group}`)) {
      seen.add(`${id}|${group}`);
      // A child's coverage end is deferred by continuous eligibility whether or not it is a cliff (analyze.ts).
      out.push({ at: at + step, id, group, deferred: group === "Children" && COVERAGE_PROGRAMS.includes(id) ? DEFERRAL_UNTIL.child_continuous_eligibility : null });
    }
  for (const [id, at] of Object.entries(ends.programEnds) as [ProgramId, number][])
    if (![...seen].some((k) => k.startsWith(`${id}|`))) out.push({ at: at + step, id, group: "Household", deferred: null });
  return out.sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
}

/** The series a row is about: the children's share of a person-level program, the adult's (household minus children's), or the household total. */
function series(ev: HouseholdEvaluation, r: LedgerRow): number[] | null {
  const pts = ev.curve.points;
  if (pts[0].programs[r.id] === undefined) return null;
  const child = pts[0].childPrograms[r.id] !== undefined;
  if (r.group === "Children" && child) return pts.map((p) => p.childPrograms[r.id] ?? 0);
  if (r.group === "Adult" && child) return pts.map((p) => p.programs[r.id] - (p.childPrograms[r.id] ?? 0));
  return pts.map((p) => p.programs[r.id]);
}

/** The cite line under a ledger row: what remains, what it was worth, what moved with it — all from the curve. */
export function cite(ev: HouseholdEvaluation, r: LedgerRow, cov: StateCoverage | undefined): string {
  const pts = ev.curve.points, i = indexOf(ev, r.at), before = i - 1, p = series(ev, r), s: string[] = [];
  const h = modeled(ev), year = ev.curve.year;
  if (r.cliff) {
    const left = p ? p[i] : 0;
    if (left > 0) {
      const goneAt = p!.findIndex((v, k) => k > i && v <= 0);
      s.push(`${money(left)} a year of ${programName(r.id)} continues at ${money(r.at)}${goneAt > 0 ? `, none from ${money(pts[goneAt].earnings)}` : ""}.`);
    }
    if (r.id === "childcare" && p) {
      const price = cov?.vintages.childcare.preschool;
      s.push(`Worth ${money(p[before])} a year at ${money(pts[before].earnings)}. Care priced at ${money(h.monthlyChildcare ?? 0)} a month for ${h.childAges.length} ${h.childAges.length === 1 ? "child" : "children"}` +
        (price ? ` (${price} prices, carried to ${year} dollars by the BLS Employment Cost Index).` : "."));
    }
    if (r.id === "medicaid" && !r.cliff.deferral) s.push(`Coverage ends with the raise (no deferral applies); the net premium rises ${money(r.cliff.breakdown.premiums)} in the step.`);
    if (r.id === "aca") {
      const spaBefore = pts[before].statePremiumAssistance ?? 0, spaAt = pts[i].statePremiumAssistance ?? 0;
      s.push(`Net premium rises ${money(r.cliff.breakdown.premiums)} in one step` +
        (spaBefore > 0 && spaAt === 0 && ev.statePremiumAssistance ? `; ${ev.statePremiumAssistance.program} (${money(spaBefore)}) ends with it.` : "."));
    }
  } else {
    const kidsChip = pts[i].childPrograms.chip ?? 0;
    if (r.id === "medicaid" && r.group === "Children" && kidsChip > 0) s.push(`The children move to CHIP: ${money(kidsChip)} a year of coverage from ${money(r.at)}.`);
    if (r.id === "eitc") s.push("Phases out; no step of $200 or more, so it is not a cliff.");
    if (r.id === "chip" && pts[i].programs.aca > pts[before].programs.aca) s.push(`The premium tax credit rises ${money(pts[i].programs.aca - pts[before].programs.aca)} as it ends.`);
  }
  if (r.deferred) s.push(`Crossing this does not end it this year: the loss lands at ${r.deferred}.`);
  return s.join(" ");
}

/** The ledger's footnote: cash benefits, child coverage, the coverage gap and the state's premium help — what the coverage block says, never copy. */
export function ledgerNote(ev: HouseholdEvaluation, cov: StateCoverage | undefined): string {
  const e = ev.escape, step = stepOf(ev), s: string[] = [];
  s.push(e.benefitsEndEarnings === null ? "Cash benefits never end inside this axis." : `The last cash benefit ends at ${money(e.benefitsEndEarnings + step)}.`);
  if (e.childCoverageEndEarnings !== null) s.push(`Child coverage ends at ${money(e.childCoverageEndEarnings + step)}, deferred.`);
  if (cov) {
    const c = cov.corrections, pa = c.premiumAssistance;
    s.push(c.coverageGap.applies ? `Coverage gap band applies: ${c.coverageGap.note}` : `No coverage gap band: ${c.coverageGap.note}`);
    s.push(pa.source === "modeled" ? `${pa.program} is modeled: netted out of the premium, up to ${money(ev.statePremiumAssistance?.maxAnnual ?? 0)} a year.`
      : pa.source === "ladder" ? `${pa.program} is applied from a local ladder.`
      : pa.program ? `${pa.program} exists but is not modeled on this sweep.` : "No state premium help applies.");
  }
  return s.join(" ");
}

// ── The chart's words ───────────────────────────────────────────────────
export const cliffSentence = (c: Cliff): string =>
  `Cliff at ${money(c.startEarnings)} to ${money(c.endEarnings)}: ${neg(c.drop)}. ` +
  (c.programsLost.length ? `${list(c.programsLost.map(programName))} end${c.programsLost.length > 1 ? "" : "s"}. ` : "No program named. ") +
  `Driver: ${c.driver}.` + (c.deferral ? ` Deferred until ${c.deferral.until}.` : "");

export const curveTitle = (ev: HouseholdEvaluation): string =>
  `Net income after premiums, ${money(ev.curve.points[0].earnings)}–${money(ev.curve.points[ev.curve.points.length - 1].earnings)} of earnings`;

/** The chart wrapper's aria-label: the shape in words. */
export function chartLabel(ev: HouseholdEvaluation): string {
  const a = ev.analysis, p = ev.personal, w = cliffAt(ev, a.worstCliff), safe = ev.escape.safeExitEarnings;
  const pts = ev.curve.points;
  return `Net income after premiums against earnings, ${money(pts[0].earnings)} to ${money(pts[pts.length - 1].earnings)}. ` +
    (a.dangerZones.length ? `${a.dangerZones.length} danger zone${a.dangerZones.length > 1 ? "s" : ""}` +
      (p.zone ? `; this household's runs from ${money(p.zone.startEarnings)} to ${p.raiseIsLowerBound ? "the top of the axis" : money(p.escapeEarnings ?? 0)}` +
        (p.raiseIsLowerBound ? "" : `, cleared by a raise of ${money(p.raiseToClear ?? 0)}`) : "") + ". " : "No danger zone. ") +
    (w ? `The largest step down is ${money(w.drop)} at ${money(w.startEarnings)}${w.programsLost.length ? ` where ${list(w.programsLost.map(programName))} end${w.programsLost.length > 1 ? "" : "s"}` : ""}. ` : "") +
    (safe === null ? "No pay on the axis is past every zone." : `Safe from ${money(safe)}.`);
}

// ── CompareTable (#12) ──────────────────────────────────────────────────
export interface CompareRow { label: string; cell: (ev: HouseholdEvaluation) => string; money?: boolean }

/** The rows every scenario answers; `base` is the column "Change from now" is measured against. */
export function compareRows(base: HouseholdEvaluation): CompareRow[] {
  const step = stepOf(base);
  const adultMedicaid = (ev: HouseholdEvaluation) => ev.escape.programEndsByAge.adults.medicaid;
  return [
    { label: "Net after premiums", cell: (ev) => money(ev.analysis.currentNet), money: true },
    { label: "Change from now", cell: (ev) => (ev === base ? "—" : signed(ev.analysis.currentNet - base.analysis.currentNet)) },
    { label: "In a danger zone", cell: (ev) => (ev.analysis.verdict === "in_danger_zone" ? "Yes" : "No") },
    { label: "Zone ends at", cell: (ev) => (ev.personal.raiseIsLowerBound ? "past the axis" : ev.personal.escapeEarnings === null ? "—" : money(ev.personal.escapeEarnings)) },
    { label: "Raise still needed", cell: (ev) => (ev.analysis.verdict !== "in_danger_zone" ? "—" : `${ev.personal.raiseIsLowerBound ? "> " : ""}${money(ev.personal.raiseToClear ?? 0)}`) },
    { label: "Safe from", cell: (ev) => (ev.escape.safeExitEarnings === null ? "past the axis" : money(ev.escape.safeExitEarnings)) },
    { label: "Largest drop", cell: (ev) => (ev.analysis.worstCliff ? money(ev.analysis.worstCliff.drop) : "none") },
    { label: "Adult Medicaid ends", cell: (ev) => { const at = adultMedicaid(ev); return at === undefined ? "—" : money(at + step); } },
    { label: "Child coverage ends", cell: (ev) => (ev.escape.childCoverageEndEarnings === null ? "past the axis" : money(ev.escape.childCoverageEndEarnings + step)) },
    { label: "Reach at these earnings", cell: (ev) => (ev.reach.current === null ? "—" : ordinal(Math.round(ev.reach.current))) },
  ];
}

/** A column's sub-line: the household shape and earnings the column was evaluated at. */
export const columnSub = (ev: HouseholdEvaluation): string => `${ev.answers.married ? "2 adults" : "1 adult"}, ${money(ev.analysis.currentEarnings)}`;

export function compareNote(base: HouseholdEvaluation, others: HouseholdEvaluation[]): string {
  const st = stateName(base.answers.state);
  const s = [`Reach is the share of households of the same shape in ${st} earning at or below this figure — it says how common the pay is, never the odds of getting there.`];
  const other = others.find((o) => archetypeOf(o) !== archetypeOf(base) && o.reach.current !== null && base.reach.current !== null);
  if (other) s.push(`A column whose household shape differs sits on its own ladder (${archetypeOf(other)} against ${archetypeOf(base)}), which is why the same pay can sit at a different percentile there.`);
  const arche = others.find((o) => o.source === "archetype");
  if (arche) s.push("A column marked archetype is the committed sweep for a household of that shape in this state, not this family's own live call.");
  return s.join(" ");
}

// ── What the model does not include ─────────────────────────────────────
export function assumed(ev: HouseholdEvaluation, cov: StateCoverage | undefined): string[] {
  const h = modeled(ev), on: string[] = [], off: string[] = [];
  const takeUp: [boolean, ProgramId][] = [[h.getsSnap, "snap"], [h.getsTanf, "tanf"], [h.getsMedicaid, "medicaid"], [h.getsWic, "wic"],
    [h.getsChildcareSubsidy, "childcare"], [h.getsHeadStart, "headstart"], [h.getsHousing, "housing"]];
  for (const [gets, id] of takeUp) (gets ? on : off).push(programName(id));
  const facts = [h.youStatus === "citizen" ? "a citizen" : `status: ${h.youStatus}`, h.savings ? `${money(h.savings)} in savings` : "no savings",
    h.selfEmployed ? "self-employed" : "wages, not self-employment", h.hasEmployerCoverage ? "employer coverage offered" : "no employer coverage",
    h.ssdiMonthly || h.childSupportMonthly || h.unemploymentMonthly ? "other income as entered" : "no other income"];
  const st = stateName(ev.answers.state);
  return [
    "Health cost is premiums only — no deductibles, copays or other out-of-pocket spending.",
    `Assumed for this curve: ${list(facts)}; aged ${h.age}.`,
    `Take-up assumed for ${list(on)}${off.length ? `; not for ${list(off)}` : ""}.`,
    "Annualised current-rule scenarios, not prorated calendar-year benefit totals.",
    ...(cov?.unmodeled ?? []).map((u) => `Not modelled in ${st}: ${u.program}. ${u.note}`),
  ];
}

// ── SourceNote (#17, M4, N9): every fact from the data ──────────────────
export interface Provenance { cov: StateCoverage | undefined; summary: SummaryJson | null; /** The county's name, live only; the archetype has none (M4). */ county: string | null }

export function sourceLine(ev: HouseholdEvaluation, prov: Provenance): string {
  const { cov, summary } = prov;
  const m = cov?.vintages.model ?? summary?.model ?? null;
  const clamped = ev.analysis.currentEarnings !== ev.answers.annualEarnings
    ? ` Pay is above the modeled range — evaluated at ${money(ev.analysis.currentEarnings)}, the top of the sweep.` : "";
  const where = ev.source === "live" && prov.county ? ` in ${prov.county}, ${stateName(ev.answers.state)}` : "";
  const curve = ev.source === "archetype"
    ? `committed archetype sweep (${archetypeOf(ev)})${summary ? `, generated ${dateOf(summary.generated)}` : ""} — not this family's own live call.${clamped}`
    : `live PolicyEngine call for this household${where}.`;
  const v = cov?.vintages;
  return `Estimates only — a caseworker decides real benefits. Rules: ${ev.curve.year}. Curve: ${curve}` +
    (v ? ` Rent: ${v.rent.publisher} ${v.rent.vintage} Child-care price: ${v.childcare.preschool}, carried to ${ev.curve.year} dollars by the BLS Employment Cost Index. ` +
      `Reach: ${v.reach.basis} Vintages used: ${list(v.reach.vintages.map(reachWord))}.` : "") +
    (cov?.otherBenefits.length ? ` Other state benefits in the remainder: ${cov.otherBenefits.map((o) => `${o.label} (up to ${money(o.maxAnnualInSweep)})`).join("; ")}.` : "") +
    ` Model: ${modelLine(m)}.`;
}

// ── The client sheet (citizen register, from the same objects) ──────────
export function handout(ev: HouseholdEvaluation, summary: SummaryJson | null): { title: string; paragraphs: string[] } {
  const a = ev.analysis, step = stepOf(ev), h = modeled(ev);
  const w = cliffAt(ev, a.worstCliff);
  const cc = ev.curve.points[indexOf(ev, a.currentEarnings)].programs.childcare ?? 0;
  const kids = h.childAges.length;
  const snapEnd = ledgerRows(ev).find((r) => r.id === "snap"), child = ev.escape.childCoverageEndEarnings;
  const p: string[] = [];
  const { again } = verdict(ev);
  p.push(verdictSentence(ev, "year") + (again ? ` ${again}` : ""));
  if (cc > 0) p.push(`${money(cc)} of what you keep is ${programPhrase("childcare")} paid straight to your day care.`);
  if (w) p.push(`The biggest drop is at ${money(w.endEarnings)} of pay: ${w.programsLost.length ? `${list(w.programsLost.map(programPhrase))} end${w.programsLost.length > 1 ? "" : "s"}` : "your tax break shrinks"} and you keep ${money(w.drop)} less.` +
    (snapEnd && snapEnd.at !== w.endEarnings ? ` ${capitalize(programPhrase("snap"))} ends at ${money(snapEnd.at)}.` : ""));
  if (child !== null && kids) p.push(`Your kids' health plan ends at ${money(child + step)} of pay — but not that year. It ends at their next yearly check, up to 12 months later.`);
  p.push("These are estimates. A case worker decides real help.");
  p.push(`Printed from HotGap. ${ev.curve.year} rules.${summary ? ` Sweep of ${dateOf(summary.generated)}.` : ""}`);
  const count = (n: number) => ["no", "one", "two", "three"][n] ?? String(n);
  return { title: `For the client — ${stateName(ev.answers.state)}, ${h.married ? "two parents" : "one parent"}, ${count(kids)} ${kids === 1 ? "child" : "children"}`, paragraphs: p };
}

const capitalize = (s: string): string => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** What a take-up state means for this household: the programs turned off that would pay at current earnings (evaluation.unclaimed). */
export function unclaimedNote(ev: HouseholdEvaluation): string {
  if (!ev.unclaimed?.length) return "";
  return `Off for this household: ${list(ev.unclaimed.map((u) => `${programName(u.program)} would pay ${money(u.annual)} a year`))} at ${money(ev.analysis.currentEarnings)}.`;
}
