// The caseworker surface's reading of one HouseholdEvaluation and its state's
// coverage block (design/caseworker.html's inline script, as pure functions):
// the verdict in the caseworker register, the tiles, the IncompleteMarker
// count, the ThresholdLedger under the one threshold convention, the
// CompareTable rows, the assumed list, the SourceNote and the client sheet.
// The lift and the modeled household are core's (immediateCurve,
// modeledAnswers); the IncompleteMarker rule is lib/coverage.ts's. No DOM,
// no fetch — vitest covers it directly (model.test.ts).
// Every figure is annual (design/inventory.md M5): this reader checks the
// table against the file. Every word is copy.ts's.
import {
  CLIFF_MIN,
  COVERAGE_PROGRAMS,
  DEFERRAL_UNTIL,
  liheapLimitWords,
  modeledAnswers,
  pickArchetypeId,
  REACH_PERCENTILES,
  STATE_NAMES,
  type Cliff,
  type HouseholdAnswers,
  type HouseholdEvaluation,
  type ModelRecord,
  type ProgramId,
  type ReachLadder,
  type StateCoverage,
  type SummaryJson,
} from "@hotgap/core";
import { sceneOf } from "../citizen/model.js";
import { againText, verdictText } from "../citizen/verdict.js";
import { careHousehold, incompleteFor } from "../lib/coverage.js";
import { copy, fmt, programName } from "./copy.js";

export const stateName = (st: string): string => STATE_NAMES[st] ?? st;

/** The axis step between consecutive points ($1,000 on the sweep). */
export const stepOf = (ev: HouseholdEvaluation): number => ev.curve.points[1].earnings - ev.curve.points[0].earnings;
/** The index of an earnings figure on the axis. */
export const indexOf = (ev: HouseholdEvaluation, earnings: number): number =>
  Math.round((earnings - ev.curve.points[0].earnings) / stepOf(ev));
const top = (ev: HouseholdEvaluation): number => ev.curve.points[ev.curve.points.length - 1].earnings;

/** The cliff object `nextCliff`/`worstCliff` name — they are never the same object as a `cliffs` entry (evaluate.ts). */
export const cliffAt = (ev: HouseholdEvaluation, ref: { startEarnings: number } | null): Cliff | null =>
  ref ? ev.analysis.cliffs.find((c) => c.startEarnings === ref.startEarnings) ?? null : null;

/** The household the curve actually models: core's reading (the swept renter on the archetype path), which every sentence about rent, care or take-up describes. */
export const modeled = (ev: HouseholdEvaluation): HouseholdAnswers => modeledAnswers(ev);

export const archetypeOf = (ev: HouseholdEvaluation): string => pickArchetypeId(ev.answers);

/**
 * Whether a what-if's reply is the base's own committed curve again (B1): the
 * sweep varies only a household's shape and pay, so a take-up, rent, savings
 * or status what-if answered by the fallback maps to the same archetype at
 * the same earnings, and a column built from it would subtract the curve
 * from itself and print "+$0". Such a what-if needs the live call.
 */
export const notInSweep = (base: HouseholdEvaluation, ev: HouseholdEvaluation): boolean =>
  ev.source === "archetype" && archetypeOf(ev) === archetypeOf(base) && ev.analysis.currentEarnings === base.analysis.currentEarnings;

// ── Verdict (M2), the caseworker register ───────────────────────────────
export interface Verdict { line: string; sub: string; /** "It happens again…", when more zones lie beyond the household's. */ again: string }

export function verdict(ev: HouseholdEvaluation): Verdict {
  const a = ev.analysis, p = ev.personal, e = ev.escape, v = copy.verdict;
  const next = cliffAt(ev, a.nextCliff);
  const start = p.zone?.startEarnings ?? 0, peak = p.zone?.peakNet ?? 0, exit = p.escapeEarnings ?? 0;
  const again = a.verdict === "in_danger_zone" && !p.raiseIsLowerBound && e.safeExitEarnings !== null && e.safeExitEarnings !== p.escapeEarnings
    ? v.again(exit, e.safeExitEarnings) : "";
  const line = a.verdict === "always_up" ? v.alwaysUp
    : a.verdict === "cliff_ahead" ? v.cliffAhead(next!.endEarnings, next!.drop)
    : a.verdict === "cliff_behind" ? v.cliffBehind
    : p.raiseIsLowerBound ? v.stuck(start, top(ev), peak)
    : v.inZone(start, exit, peak, p.raiseToClear ?? 0);
  const sub = again ? `${again} ${v.safeFrom(e.safeExitEarnings!, e.leap, e.leapIsLowerBound)}`
    : e.safeExitEarnings === null ? v.neverSafe : "";
  return { line, sub, again };
}

// ── StatTiles (#2) ──────────────────────────────────────────────────────
export interface Tile { label: string; value: string; sub: string }

/** Reach's margin is the 90% MoE of the ladder point the percentile sits on (reach.json), never a probability. */
export function tiles(ev: HouseholdEvaluation, cell: ReachLadder | null): Tile[] {
  const a = ev.analysis, p = ev.personal, t = copy.tiles;
  const out: Tile[] = [{ label: t.net, value: fmt.money(a.currentNet), sub: t.netSub(a.currentEarnings) }];
  if (a.verdict === "in_danger_zone") out.push({
    label: t.raise, value: p.raiseIsLowerBound ? t.atLeast(p.raiseToClear ?? 0) : fmt.money(p.raiseToClear ?? 0),
    sub: p.raiseIsLowerBound ? t.raiseNotFound(top(ev)) : t.raiseTo(p.escapeEarnings ?? 0),
  });
  if (a.worstCliff) out.push({ label: t.drop, value: fmt.money(a.worstCliff.drop), sub: t.dropAt(a.worstCliff.startEarnings, a.worstCliff.endEarnings) });
  const pct = ev.reach.current;
  if (pct !== null && cell) {
    /* The ladder point at or below the percentile: the ladder is sampled at REACH_PERCENTILES. */
    const above = REACH_PERCENTILES.findIndex((q) => q > pct);
    const i = above < 0 ? REACH_PERCENTILES.length - 1 : Math.max(0, above - 1);
    out.push({ label: t.reach, value: fmt.ordinal(Math.round(pct)), sub: t.reachSub(cell.moe[i], cell.n) });
  }
  return out;
}

// ── IncompleteMarker (#16): the one rule is lib/coverage.ts's ────────────
export const incompleteHere = (cov: StateCoverage | undefined, a: HouseholdAnswers): string[] =>
  incompleteFor(cov, careHousehold(a)).map((u) => u.program);

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
  /** EligibilityBoundary (#23): a limit the household never crossed, tagged *if you apply*; never a cliff. */
  boundary?: true;
  /** The state pays its heating help as a tax credit already in net income (Michigan): the row is where it tapers out, untagged (liheap review B1). */
  credit?: true;
}

/** Whether this state's heating help is a counted state credit, from the evaluation's boundary or the sweep's block. */
export const liheapCredit = (ev: HouseholdEvaluation, cov: StateCoverage | undefined): boolean =>
  (ev.liheap?.upstream ?? cov?.liheap?.upstream)?.counted === "state credit";

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
  // Where energy assistance stops, with the toggle off: the earner's own pay at the state's limit, not a step of the axis.
  if (ev.liheap && !ev.liheap.counted) out.push({ at: ev.liheap.earningsLimit, id: "liheap", group: "Household", deferred: null, boundary: true, ...(liheapCredit(ev, undefined) ? { credit: true as const } : {}) });
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
  const pts = ev.curve.points, i = indexOf(ev, r.at), before = i - 1, p = series(ev, r), s: string[] = [], L = copy.ledger;
  const h = modeled(ev);
  const b = ev.liheap;
  if (r.id === "liheap" && b) {
    const limit = cov?.liheap?.limitKind ?? liheapLimitWords(b.limit);
    if (r.credit) return L.liheapCredit({ program: cov?.corrections.liheap?.program ?? null, limit, servedShare: b.servedShare, heatInRent: h.heatInRent, readOn: b.readOn });
    if (r.boundary) return L.liheapBoundary({ limit, band: b.topBand ? L.liheapBand(b.topBand.min, b.topBand.max) : null, servedShare: b.servedShare, readOn: b.readOn });
    if (r.cliff) return L.liheapCounted(pts[before].programs.liheap ?? 0, limit);
  }
  if (r.cliff) {
    const left = p ? p[i] : 0;
    if (left > 0) {
      const goneAt = p!.findIndex((v, k) => k > i && v <= 0);
      s.push(L.continues(left, programName(r.id), r.at, goneAt > 0 ? pts[goneAt].earnings : null));
    }
    if (r.id === "childcare" && p) s.push(L.careWorth(p[before], pts[before].earnings, h.monthlyChildcare ?? 0, h.childAges.length, cov?.vintages.childcare.preschool, ev.curve.year));
    if (r.id === "medicaid" && !r.cliff.deferral) s.push(L.medicaidEnds(r.cliff.breakdown.premiums));
    if (r.id === "aca") {
      const spaBefore = pts[before].statePremiumAssistance ?? 0, spaAt = pts[i].statePremiumAssistance ?? 0;
      s.push(L.acaEnds(r.cliff.breakdown.premiums, spaBefore > 0 && spaAt === 0 && ev.statePremiumAssistance ? { program: ev.statePremiumAssistance.program, amount: spaBefore } : null));
    }
  } else {
    const kidsChip = pts[i].childPrograms.chip ?? 0;
    if (r.id === "medicaid" && r.group === "Children" && kidsChip > 0) s.push(L.toChip(kidsChip, r.at));
    if (r.id === "eitc") s.push(L.eitc(CLIFF_MIN));
    if (r.id === "chip" && pts[i].programs.aca > pts[before].programs.aca) s.push(L.chipEnds(pts[i].programs.aca - pts[before].programs.aca));
  }
  if (r.deferred) s.push(L.deferredUntil(r.deferred));
  return s.join(" ");
}

/** The ledger's footnote: cash benefits, child coverage, the coverage gap and the state's premium help — what the coverage block says, never copy. */
export function ledgerNote(ev: HouseholdEvaluation, cov: StateCoverage | undefined): string {
  const e = ev.escape, step = stepOf(ev), s: string[] = [], L = copy.ledger;
  s.push(e.benefitsEndEarnings === null ? L.cashNever : L.cashEnds(e.benefitsEndEarnings + step));
  if (e.childCoverageEndEarnings !== null) s.push(L.childCoverageEnds(e.childCoverageEndEarnings + step));
  if (cov) {
    const c = cov.corrections, pa = c.premiumAssistance;
    s.push(c.coverageGap.applies ? L.gapApplies(c.coverageGap.note) : L.gapNone(c.coverageGap.note));
    s.push(pa.source === "modeled" ? L.premiumModeled(pa.program ?? "", ev.statePremiumAssistance?.maxAnnual ?? 0)
      : pa.source === "ladder" ? L.premiumLadder(pa.program ?? "")
      : pa.program ? L.premiumUnmodeled(pa.program) : L.premiumNone);
  }
  return s.join(" ");
}

// ── The chart's words ───────────────────────────────────────────────────
export const cliffSentence = (c: Cliff): string =>
  copy.chart.cliff(c.startEarnings, c.endEarnings, c.drop, c.programsLost.map(programName), c.driver, c.deferral?.until ?? null);

export const curveTitle = (ev: HouseholdEvaluation): string => copy.chart.title(ev.curve.points[0].earnings, top(ev));

/** The chart wrapper's aria-label: the shape in words. */
export function chartLabel(ev: HouseholdEvaluation): string {
  const a = ev.analysis, p = ev.personal, w = cliffAt(ev, a.worstCliff);
  return copy.chart.label({
    from: ev.curve.points[0].earnings, to: top(ev), zones: a.dangerZones.length,
    own: p.zone ? { start: p.zone.startEarnings, exit: p.raiseIsLowerBound ? null : p.escapeEarnings, raise: p.raiseIsLowerBound ? null : p.raiseToClear } : null,
    worst: w ? { drop: w.drop, at: w.startEarnings, lost: w.programsLost.map(programName) } : null,
    safe: ev.escape.safeExitEarnings,
  });
}

// ── CompareTable (#12) ──────────────────────────────────────────────────
export interface CompareRow { label: string; cell: (ev: HouseholdEvaluation) => string; money?: boolean }

/** The rows every scenario answers; `base` is the column "Change from now" is measured against. A threshold takes its own curve's step (a wider axis has a wider one). */
export function compareRows(base: HouseholdEvaluation): CompareRow[] {
  const C = copy.compare, R = C.rows, $ = fmt.money;
  return [
    { label: R.net, cell: (ev) => $(ev.analysis.currentNet), money: true },
    { label: R.change, cell: (ev) => (ev === base ? C.dash : fmt.signed(ev.analysis.currentNet - base.analysis.currentNet)) },
    { label: R.inZone, cell: (ev) => (ev.analysis.verdict === "in_danger_zone" ? C.yes : C.no) },
    { label: R.zoneEnds, cell: (ev) => (ev.personal.raiseIsLowerBound ? C.pastAxis : ev.personal.escapeEarnings === null ? C.dash : $(ev.personal.escapeEarnings)) },
    { label: R.raise, cell: (ev) => (ev.analysis.verdict !== "in_danger_zone" ? C.dash : ev.personal.raiseIsLowerBound ? copy.tiles.atLeast(ev.personal.raiseToClear ?? 0) : $(ev.personal.raiseToClear ?? 0)) },
    { label: R.safe, cell: (ev) => (ev.escape.safeExitEarnings === null ? C.pastAxis : $(ev.escape.safeExitEarnings)) },
    { label: R.drop, cell: (ev) => (ev.analysis.worstCliff ? $(ev.analysis.worstCliff.drop) : C.none) },
    { label: R.adultMedicaid, cell: (ev) => { const at = ev.escape.programEndsByAge.adults.medicaid; return at === undefined ? C.dash : $(at + stepOf(ev)); } },
    { label: R.childCoverage, cell: (ev) => (ev.escape.childCoverageEndEarnings === null ? C.pastAxis : $(ev.escape.childCoverageEndEarnings + stepOf(ev))) },
    { label: R.reach, cell: (ev) => (ev.reach.current === null ? C.dash : fmt.ordinal(Math.round(ev.reach.current))) },
  ];
}

/** A column's sub-line: the household shape and earnings the column was evaluated at. */
export const columnSub = (ev: HouseholdEvaluation): string => copy.compare.sub(ev.answers.married, ev.analysis.currentEarnings);

export function compareNote(base: HouseholdEvaluation, others: HouseholdEvaluation[], unanswered = 0): string {
  const C = copy.compare, s = [C.reachNote(stateName(base.answers.state))];
  const other = others.find((o) => archetypeOf(o) !== archetypeOf(base) && o.reach.current !== null && base.reach.current !== null);
  if (other) s.push(C.ladderNote(archetypeOf(other), archetypeOf(base)));
  if (others.some((o) => o.source === "archetype")) s.push(C.archetypeNote);
  if (unanswered) s.push(C.unansweredNote(unanswered));
  return s.join(" ");
}

// ── What the model does not include ─────────────────────────────────────
export function assumed(ev: HouseholdEvaluation, cov: StateCoverage | undefined): string[] {
  const h = modeled(ev), on: string[] = [], off: string[] = [], A = copy.assumed;
  // Heating help is neither assumed nor not where the state pays it as a credit already in net income (liheap review B1): the toggle adds nothing there.
  const takeUp: [boolean, ProgramId][] = [[h.getsSnap, "snap"], [h.getsTanf, "tanf"], [h.getsMedicaid, "medicaid"], [h.getsWic, "wic"],
    [h.getsChildcareSubsidy, "childcare"], [h.getsHeadStart, "headstart"], [h.getsHousing, "housing"], ...(liheapCredit(ev, cov) ? [] : [[h.getsEnergyAssistance, "liheap"] as [boolean, ProgramId]])];
  for (const [gets, id] of takeUp) (gets ? on : off).push(programName(id));
  const facts = [h.youStatus === "citizen" ? A.citizen : A.status(h.youStatus), h.savings ? A.savings(h.savings) : A.noSavings,
    h.selfEmployed ? A.selfEmployed : A.wages, h.hasEmployerCoverage ? A.esi : A.noEsi,
    h.ssdiMonthly || h.childSupportMonthly || h.unemploymentMonthly ? A.otherIncome : A.noOtherIncome];
  const st = stateName(ev.answers.state);
  return [
    A.health, A.facts(facts, h.age), A.takeUp(on, off), A.annualised,
    ...(cov?.unmodeled ?? []).map((u) => A.unmodeled(st, u.program, u.note)),
    // EligibilityBoundary (#23): core's one sentence on why the money is not in net income, verbatim.
    ...(cov?.corrections.liheap ? [A.liheap(st, cov.corrections.liheap.note)] : []),
  ];
}

// ── SourceNote (#17, M4, N9): every fact from the data ──────────────────
export interface Provenance { cov: StateCoverage | undefined; summary: SummaryJson | null; /** The county's name, live only; the archetype has none (M4). */ county: string | null }

/** N9: the model that produced the numbers, from the file, not the one installed. */
export const modelLine = (m: ModelRecord | null | undefined): string =>
  m?.version ? copy.source.modelVersion(m.version) : m ? copy.source.modelEndpoint(m.endpoint) : copy.source.modelUnknown;

export function sourceLine(ev: HouseholdEvaluation, prov: Provenance): string {
  const { cov, summary } = prov, S = copy.source;
  const clamped = ev.analysis.currentEarnings !== ev.answers.annualEarnings ? ev.analysis.currentEarnings : null;
  const curve = ev.source === "archetype"
    ? S.archetype(archetypeOf(ev), summary ? fmt.date(summary.generated) : null, clamped)
    : S.live(prov.county ? S.inPlace(prov.county, stateName(ev.answers.state)) : null);
  const v = cov?.vintages;
  return S.line({
    year: ev.curve.year, curve,
    vintages: v ? { rent: `${v.rent.publisher} ${v.rent.vintage}`, care: v.childcare.preschool, reach: S.reachVintages(v.reach.basis, v.reach.vintages) } : null,
    other: cov?.otherBenefits.length ? cov.otherBenefits.map((o) => S.otherBenefit(o.label, o.maxAnnualInSweep)).join("; ") : null,
    model: modelLine(cov?.vintages.model ?? summary?.model),
  });
}

// ── The client sheet (citizen register, from the same objects) ──────────
/**
 * The sheet opens with the citizen page's own answer for this household
 * (design/inventory.md M2, review S8): the catalog's sentence and its
 * "again" line from the citizen's scene, so the two surfaces cannot say
 * different things to the same family — including the deferred clause the
 * catalog carries (TODO(system) 16). Yearly figures: the sheet is printed
 * for a client whose own unit the caseworker's flags carry, but the paper
 * says a year, as it always has.
 */
export function handout(ev: HouseholdEvaluation, summary: SummaryJson | null): { title: string; paragraphs: string[] } {
  const a = ev.analysis, step = stepOf(ev), h = modeled(ev), H = copy.handout;
  const w = cliffAt(ev, a.worstCliff);
  const cc = ev.curve.points[indexOf(ev, a.currentEarnings)].programs.childcare ?? 0;
  const kids = h.childAges.length;
  const snapEnd = ledgerRows(ev).find((r) => r.id === "snap"), child = ev.escape.childCoverageEndEarnings;
  const scene = sceneOf(ev, { unit: "year" }), again = againText(scene);
  const p: string[] = [verdictText(scene) + (again ? ` ${again}` : "")];
  if (cc > 0) p.push(H.careShare(cc));
  if (w) p.push(H.biggestDrop(w.endEarnings, w.programsLost, w.drop) + (snapEnd && snapEnd.at !== w.endEarnings ? ` ${H.snapEnds(snapEnd.at)}` : ""));
  if (child !== null && kids) p.push(H.kidsCoverage(child + step));
  p.push(H.estimates, H.printed(ev.curve.year, summary ? fmt.date(summary.generated) : null));
  return { title: H.title(stateName(ev.answers.state), h.married, kids), paragraphs: p };
}

/** What a take-up state means for this household: the programs turned off that would pay at current earnings (evaluation.unclaimed). */
export function unclaimedNote(ev: HouseholdEvaluation): string {
  if (!ev.unclaimed?.length) return "";
  return copy.source.unclaimed(ev.unclaimed.map((u) => copy.source.wouldPay(programName(u.program), u.annual)), ev.analysis.currentEarnings);
}
