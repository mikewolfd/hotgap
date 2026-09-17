// The caseworker surface's reading of one HouseholdEvaluation and its state's
// coverage block (design/caseworker.html's inline script, as pure functions):
// the verdict in the caseworker register, the tiles, the IncompleteMarker
// count, the ThresholdLedger under the one threshold convention, the
// CompareTable rows, the assumed list, the SourceNote and the client sheet.
// The modeled household is core's (modeledAnswers); the IncompleteMarker
// rule is lib/coverage.ts's. No DOM,
// no fetch — vitest covers it directly (model.test.ts).
// Every figure is annual (design/inventory.md M5): this reader checks the
// table against the file. Every word is copy.ts's, every figure formatted
// here through lib/format.ts before it fills a slot (lib/copy.ts).
import {
  CLIFF_MIN,
  liheapLimitWords,
  modeledAnswers,
  pickArchetypeId,
  REACH_PERCENTILES,
  STATE_NAMES,
  type Cliff,
  type HouseholdAnswers,
  type HouseholdEvaluation,
  type ProgramId,
  type ReachLadder,
  type StateCoverage,
  type SummaryJson,
} from "@hotgap/core";
import { sceneOf } from "../citizen/model.js";
import { phrase } from "../citizen/programs.js";
import { againText, verdictText } from "../citizen/verdict.js";
import { pluralKey } from "../lib/copy.js";
import { careHousehold, incompleteFor } from "../lib/coverage.js";
import { dateWords, listOf, lossFigure, modelLine, money as usd, numberWords, ordinal, reachWord, signedMoney } from "../lib/format.js";
import { programName } from "../lib/programs.js";
import { stepOf, thresholds, type Holder } from "../lib/thresholds.js";
import { copy, SERVED_VINTAGE, t } from "./copy.js";

export const stateName = (st: string): string => STATE_NAMES[st] ?? st;
/** A share of eligible households as the whole-number percent the profiles print. */
const pct = (share: number): number => Math.round(share * 100);

/** The index of an earnings figure on the axis. */
export const indexOf = (ev: HouseholdEvaluation, earnings: number): number =>
  Math.round((earnings - ev.curve.points[0].earnings) / stepOf(ev));
const top = (ev: HouseholdEvaluation): number => ev.curve.points[ev.curve.points.length - 1].earnings;

/** The `cliffs` entry a `nextCliff`/`worstCliff` reference names, found by its step (the same object since 2026-09-17; kept for a reference that is not). */
export const cliffAt = (ev: HouseholdEvaluation, ref: { startEarnings: number } | null): Cliff | null =>
  ref ? ev.analysis.cliffs.find((c) => c.startEarnings === ref.startEarnings) ?? null : null;

/** The household the curve actually models: core's reading (the swept renter on the archetype path), which every sentence about rent, care or take-up describes. */
export const modeled = (ev: HouseholdEvaluation): HouseholdAnswers => modeledAnswers(ev);

const archetypeOf = (ev: HouseholdEvaluation): string => pickArchetypeId(ev.answers);

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
  const start = usd(p.zone?.startEarnings ?? 0), peak = usd(p.zone?.peakNet ?? 0), exit = usd(p.escapeEarnings ?? 0);
  const again = a.verdict === "in_danger_zone" && !p.raiseIsLowerBound && e.safeExitEarnings !== null && e.safeExitEarnings !== p.escapeEarnings
    ? t("verdict.again", { exit, safe: usd(e.safeExitEarnings) }) : "";
  const line = a.verdict === "always_up" ? v.alwaysUp
    : a.verdict === "cliff_ahead" ? t("verdict.cliffAhead", { at: usd(next!.endEarnings), drop: usd(next!.drop) })
    : a.verdict === "cliff_behind" ? v.cliffBehind
    : p.raiseIsLowerBound ? t("verdict.stuck", { start, top: usd(top(ev)), peak })
    : t("verdict.inZone", { start, exit, peak, raise: usd(p.raiseToClear ?? 0) });
  const sub = again ? `${again} ${t(`verdict.safeFrom.${e.leapIsLowerBound ? "atLeast" : "exact"}`, { safe: usd(e.safeExitEarnings!), leap: usd(e.leap) })}`
    : e.safeExitEarnings === null ? v.neverSafe : "";
  return { line, sub, again };
}

// ── StatTiles (#2) ──────────────────────────────────────────────────────
export interface Tile { label: string; value: string; sub: string }

/** Reach's margin is the 90% MoE of the ladder point the percentile sits on (reach.json), never a probability. */
export function tiles(ev: HouseholdEvaluation, cell: ReachLadder | null): Tile[] {
  const a = ev.analysis, p = ev.personal, T = copy.tiles;
  const out: Tile[] = [{ label: T.net, value: usd(a.currentNet), sub: t("tiles.netSub", { earned: usd(a.currentEarnings) }) }];
  if (a.verdict === "in_danger_zone") out.push({
    label: T.raise, value: p.raiseIsLowerBound ? t("tiles.atLeast", { n: usd(p.raiseToClear ?? 0) }) : usd(p.raiseToClear ?? 0),
    sub: p.raiseIsLowerBound ? t("tiles.raiseNotFound", { top: usd(top(ev)) }) : t("tiles.raiseTo", { exit: usd(p.escapeEarnings ?? 0) }),
  });
  if (a.worstCliff) out.push({ label: T.drop, value: usd(a.worstCliff.drop), sub: t("tiles.dropAt", { from: usd(a.worstCliff.startEarnings), to: usd(a.worstCliff.endEarnings) }) });
  const reach = ev.reach.current;
  if (reach !== null && cell) {
    /* The ladder point at or below the percentile: the ladder is sampled at REACH_PERCENTILES. */
    const above = REACH_PERCENTILES.findIndex((q) => q > reach);
    const i = above < 0 ? REACH_PERCENTILES.length - 1 : Math.max(0, above - 1);
    out.push({ label: T.reach, value: ordinal(Math.round(reach)), sub: t("tiles.reachSub", { moe: usd(cell.moe[i]), n: cell.n }) });
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

const GROUP: Record<Holder, LedgerRow["group"]> = { adults: "Adult", children: "Children", household: "Household" };

/** Every program's end under the one convention (lib/thresholds.ts), plus the LIHEAP boundary row, sorted by earnings then program. */
export function ledgerRows(ev: HouseholdEvaluation): LedgerRow[] {
  const out: LedgerRow[] = thresholds(ev).map((t) => ({ at: t.at, id: t.id, group: GROUP[t.holder], ...(t.cliff ? { cliff: t.cliff } : {}), deferred: t.deferred }));
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

/** The served share as one of two sentences: the profile's percent, or that it was not read. */
const servedSentence = (share: number | null): string =>
  share === null ? t("ledger.liheapServed.unread", { vintage: SERVED_VINTAGE }) : t("ledger.liheapServed.known", { pct: pct(share), vintage: SERVED_VINTAGE });

/** The cite line under a ledger row: what remains, what it was worth, what moved with it — all from the curve. One sentence per fact, joined. */
export function cite(ev: HouseholdEvaluation, r: LedgerRow, cov: StateCoverage | undefined): string {
  const pts = ev.curve.points, i = indexOf(ev, r.at), before = i - 1, p = series(ev, r), s: string[] = [];
  const h = modeled(ev);
  const b = ev.liheap;
  if (r.id === "liheap" && b) {
    const limit = cov?.liheap?.limitKind ?? liheapLimitWords(b.limit);
    if (r.credit) {
      const program = cov?.corrections.liheap?.program ?? null;
      return t("ledger.liheapCredit", {
        paidAs: program ? t("ledger.liheapPaidAs.named", { program, limit }) : t("ledger.liheapPaidAs.unnamed", { limit }),
        served: servedSentence(b.servedShare),
        heat: t(`ledger.liheapHeat.${h.heatInRent ? "inRent" : "notInRent"}`),
        readOn: b.readOn,
      });
    }
    if (r.boundary) {
      const band = b.topBand ? (b.topBand.min === b.topBand.max ? t("ledger.liheapBand.flat", { min: usd(b.topBand.min) }) : t("ledger.liheapBand.range", { min: usd(b.topBand.min), max: usd(b.topBand.max) })) : null;
      const key = `${band ? "band" : "unread"}${b.servedShare === null ? "Unread" : "Known"}`;
      const worthServed = t(`ledger.liheapWorthServed.${key}`, { ...(band ? { band } : {}), ...(b.servedShare === null ? {} : { pct: pct(b.servedShare) }), vintage: SERVED_VINTAGE });
      return t("ledger.liheapBoundary", { limit, worthServed, readOn: b.readOn });
    }
    if (r.cliff) return t("ledger.liheapCounted", { amount: usd(pts[before].programs.liheap ?? 0), limit });
  }
  if (r.cliff) {
    const left = p ? p[i] : 0;
    if (left > 0) {
      const goneAt = p!.findIndex((v, k) => k > i && v <= 0);
      const slots = { left: usd(left), program: programName(r.id), at: usd(r.at) };
      s.push(goneAt > 0 ? t("ledger.continues.closed", { ...slots, goneAt: usd(pts[goneAt].earnings) }) : t("ledger.continues.open", slots));
    }
    if (r.id === "childcare" && p) {
      const price = cov?.vintages.childcare.preschool, n = h.childAges.length;
      const slots = { worth: usd(p[before]), at: usd(pts[before].earnings), monthly: usd(h.monthlyChildcare ?? 0), kids: t(`ledger.kids.${pluralKey(n)}`, { n }) };
      s.push(price ? t("ledger.careWorth.priced", { ...slots, price, year: ev.curve.year }) : t("ledger.careWorth.unpriced", slots));
    }
    if (r.id === "medicaid" && !r.cliff.deferral) {
      const rise = r.cliff.breakdown.premiums;
      s.push(rise > 0 ? t("ledger.medicaidEnds.premium", { premiumRise: usd(rise) }) : t("ledger.medicaidEnds.flat"));
    }
    if (r.id === "aca") {
      const spaBefore = pts[before].statePremiumAssistance ?? 0, spaAt = pts[i].statePremiumAssistance ?? 0, rise = usd(r.cliff.breakdown.premiums);
      s.push(spaBefore > 0 && spaAt === 0 && ev.statePremiumAssistance
        ? t("ledger.acaEnds.withHelp", { premiumRise: rise, program: ev.statePremiumAssistance.program, amount: usd(spaBefore) })
        : t("ledger.acaEnds.alone", { premiumRise: rise }));
    }
  } else {
    const kidsChip = pts[i].childPrograms.chip ?? 0;
    if (r.id === "medicaid" && r.group === "Children" && kidsChip > 0) s.push(t("ledger.toChip", { amount: usd(kidsChip), at: usd(r.at) }));
    if (r.id === "eitc") s.push(t("ledger.eitc", { min: usd(CLIFF_MIN) }));
    if (r.id === "chip" && pts[i].programs.aca > pts[before].programs.aca) s.push(t("ledger.chipEnds", { ptcRise: usd(pts[i].programs.aca - pts[before].programs.aca) }));
  }
  if (r.deferred) s.push(t("ledger.deferredUntil", { when: r.deferred }));
  return s.join(" ");
}

/** The ledger's footnote: cash benefits, child coverage, the coverage gap and the state's premium help — what the coverage block says, never copy. */
export function ledgerNote(ev: HouseholdEvaluation, cov: StateCoverage | undefined): string {
  const e = ev.escape, step = stepOf(ev), s: string[] = [], L = copy.ledger;
  s.push(e.benefitsEndEarnings === null ? L.cashNever : t("ledger.cashEnds", { at: usd(e.benefitsEndEarnings + step) }));
  if (e.childCoverageEndEarnings !== null) s.push(t("ledger.childCoverageEnds", { at: usd(e.childCoverageEndEarnings + step) }));
  if (cov) {
    const c = cov.corrections, pa = c.premiumAssistance;
    s.push(t(c.coverageGap.applies ? "ledger.gapApplies" : "ledger.gapNone", { note: c.coverageGap.note }));
    s.push(pa.source === "modeled" ? t("ledger.premiumModeled", { program: pa.program ?? "", max: usd(ev.statePremiumAssistance?.maxAnnual ?? 0) })
      : pa.source === "ladder" ? t("ledger.premiumLadder", { program: pa.program ?? "" })
      : pa.program ? t("ledger.premiumUnmodeled", { program: pa.program }) : L.premiumNone);
  }
  return s.join(" ");
}

// ── The chart's words ───────────────────────────────────────────────────
/** A cliff mark's sentence: the step and its drop, what ends, the driver, and when the loss lands if not now. */
export function cliffSentence(c: Cliff): string {
  const lost = c.programsLost.map(programName);
  return [
    t("chart.cliff.lead", { from: usd(c.startEarnings), to: usd(c.endEarnings), drop: lossFigure(c.drop) }),
    lost.length ? t(`chart.cliff.lost.${pluralKey(lost.length)}`, { programs: listOf(lost) }) : copy.chart.cliff.lost.none,
    t("chart.cliff.driver", { driver: c.driver }),
    ...(c.deferral ? [t("chart.cliff.deferred", { until: c.deferral.until })] : []),
  ].join(" ");
}

export const curveTitle = (ev: HouseholdEvaluation): string => t("chart.title", { from: usd(ev.curve.points[0].earnings), to: usd(top(ev)) });

/** The chart wrapper's aria-label: the shape in words, one sentence per fact. */
export function chartLabel(ev: HouseholdEvaluation): string {
  const a = ev.analysis, p = ev.personal, w = cliffAt(ev, a.worstCliff), n = a.dangerZones.length;
  const own = p.zone ? t(`chart.label.own.${p.raiseIsLowerBound ? "toTop" : "toExit"}${p.raiseIsLowerBound || p.raiseToClear === null ? "" : "Raise"}`, {
    start: usd(p.zone.startEarnings), ...(p.raiseIsLowerBound ? {} : { exit: usd(p.escapeEarnings ?? 0), ...(p.raiseToClear === null ? {} : { raise: usd(p.raiseToClear) }) }),
  }) : null;
  const lost = w ? w.programsLost.map(programName) : [];
  return [
    t("chart.label.lead", { from: usd(ev.curve.points[0].earnings), to: usd(top(ev)) }),
    n === 0 ? copy.chart.label.zones.none : t(`chart.label.zones.${pluralKey(n)}`, { n }),
    own,
    w ? t(`chart.label.worst.${lost.length ? pluralKey(lost.length) : "none"}`, { drop: usd(w.drop), at: usd(w.startEarnings), ...(lost.length ? { programs: listOf(lost) } : {}) }) : null,
    ev.escape.safeExitEarnings === null ? copy.chart.label.safe.none : t("chart.label.safe.from", { safe: usd(ev.escape.safeExitEarnings) }),
  ].filter((x): x is string => x !== null).join(" ");
}

// ── CompareTable (#12) ──────────────────────────────────────────────────
export interface CompareRow { label: string; cell: (ev: HouseholdEvaluation) => string; money?: boolean }

/** The rows every scenario answers; `base` is the column "Change from now" is measured against. A threshold takes its own curve's step (a wider axis has a wider one). */
export function compareRows(base: HouseholdEvaluation): CompareRow[] {
  const C = copy.compare, R = C.rows;
  return [
    { label: R.net, cell: (ev) => usd(ev.analysis.currentNet), money: true },
    { label: R.change, cell: (ev) => (ev === base ? C.dash : signedMoney(ev.analysis.currentNet - base.analysis.currentNet)) },
    { label: R.inZone, cell: (ev) => (ev.analysis.verdict === "in_danger_zone" ? C.yes : C.no) },
    { label: R.zoneEnds, cell: (ev) => (ev.personal.raiseIsLowerBound ? C.pastAxis : ev.personal.escapeEarnings === null ? C.dash : usd(ev.personal.escapeEarnings)) },
    { label: R.raise, cell: (ev) => (ev.analysis.verdict !== "in_danger_zone" ? C.dash : ev.personal.raiseIsLowerBound ? t("tiles.atLeast", { n: usd(ev.personal.raiseToClear ?? 0) }) : usd(ev.personal.raiseToClear ?? 0)) },
    { label: R.safe, cell: (ev) => (ev.escape.safeExitEarnings === null ? C.pastAxis : usd(ev.escape.safeExitEarnings)) },
    { label: R.drop, cell: (ev) => (ev.analysis.worstCliff ? usd(ev.analysis.worstCliff.drop) : C.none) },
    { label: R.adultMedicaid, cell: (ev) => { const at = ev.escape.programEndsByAge.adults.medicaid; return at === undefined ? C.dash : usd(at + stepOf(ev)); } },
    { label: R.childCoverage, cell: (ev) => (ev.escape.childCoverageEndEarnings === null ? C.pastAxis : usd(ev.escape.childCoverageEndEarnings + stepOf(ev))) },
    { label: R.reach, cell: (ev) => (ev.reach.current === null ? C.dash : ordinal(Math.round(ev.reach.current))) },
  ];
}

/** A column's sub-line: the household shape and earnings the column was evaluated at. */
export const columnSub = (ev: HouseholdEvaluation): string =>
  t("compare.sub", { adults: copy.compare.adults[ev.answers.married ? "two" : "one"], earnings: usd(ev.analysis.currentEarnings) });

export function compareNote(base: HouseholdEvaluation, others: HouseholdEvaluation[], unanswered = 0): string {
  const C = copy.compare, s = [t("compare.reachNote", { state: stateName(base.answers.state) })];
  const other = others.find((o) => archetypeOf(o) !== archetypeOf(base) && o.reach.current !== null && base.reach.current !== null);
  if (other) s.push(t("compare.ladderNote", { other: archetypeOf(other), base: archetypeOf(base) }));
  if (others.some((o) => o.source === "archetype")) s.push(C.archetypeNote);
  if (unanswered) s.push(t(`compare.unansweredNote.${pluralKey(unanswered)}`, unanswered === 1 ? {} : { n: unanswered }));
  return s.join(" ");
}

// ── What the model does not include ─────────────────────────────────────
export function assumed(ev: HouseholdEvaluation, cov: StateCoverage | undefined): string[] {
  const h = modeled(ev), on: string[] = [], off: string[] = [], A = copy.assumed;
  // Heating help is neither assumed nor not where the state pays it as a credit already in net income (liheap review B1): the toggle adds nothing there.
  const takeUp: [boolean, ProgramId][] = [[h.getsSnap, "snap"], [h.getsTanf, "tanf"], [h.getsMedicaid, "medicaid"], [h.getsWic, "wic"],
    [h.getsChildcareSubsidy, "childcare"], [h.getsHeadStart, "headstart"], [h.getsHousing, "housing"], ...(liheapCredit(ev, cov) ? [] : [[h.getsEnergyAssistance, "liheap"] as [boolean, ProgramId]])];
  for (const [gets, id] of takeUp) (gets ? on : off).push(programName(id));
  const facts = [h.youStatus === "citizen" ? A.citizen : t("assumed.status", { status: h.youStatus }), h.savings ? t("assumed.savings", { amount: usd(h.savings) }) : A.noSavings,
    h.selfEmployed ? A.selfEmployed : A.wages, h.hasEmployerCoverage ? A.esi : A.noEsi,
    h.ssdiMonthly || h.childSupportMonthly || h.unemploymentMonthly ? A.otherIncome : A.noOtherIncome];
  const st = stateName(ev.answers.state);
  return [
    A.health, t("assumed.facts", { facts: listOf(facts), age: h.age }),
    off.length ? t("assumed.takeUp.some", { on: listOf(on), off: listOf(off) }) : t("assumed.takeUp.all", { on: listOf(on) }),
    A.annualised,
    ...(cov?.unmodeled ?? []).map((u) => t("assumed.unmodeled", { state: st, program: u.program, note: u.note })),
    // EligibilityBoundary (#23): core's one sentence on why the money is not in net income, verbatim.
    ...(cov?.corrections.liheap ? [t("assumed.liheap", { state: st, note: cov.corrections.liheap.note })] : []),
  ];
}

// ── SourceNote (#17, M4, N9): every fact from the data ──────────────────
export interface Provenance { cov: StateCoverage | undefined; summary: SummaryJson | null; /** The county's name, live only; the archetype has none (M4). */ county: string | null }

export function sourceLine(ev: HouseholdEvaluation, prov: Provenance): string {
  const { cov, summary } = prov, year = ev.curve.year;
  const clamped = ev.analysis.currentEarnings !== ev.answers.annualEarnings ? ev.analysis.currentEarnings : null;
  const id = archetypeOf(ev), generated = summary ? dateWords(summary.generated) : null;
  const curve = ev.source === "archetype"
    ? [generated ? t("source.archetype.dated", { id, generated }) : t("source.archetype.undated", { id }), ...(clamped === null ? [] : [t("source.clamped", { clamped: usd(clamped) })])].join(" ")
    : prov.county ? t("source.live.inPlace", { where: t("source.inPlace", { county: prov.county, state: stateName(ev.answers.state) }) }) : copy.source.live.anywhere;
  const v = cov?.vintages;
  return [
    t("source.lead", { year, curve }),
    v ? t("source.vintages", { rent: t("source.rent", { publisher: v.rent.publisher, vintage: v.rent.vintage }), care: v.childcare.preschool, year,
      reach: t("source.reachVintages", { basis: v.reach.basis, vintages: listOf(v.reach.vintages.map(reachWord)) }) }) : null,
    cov?.otherBenefits.length ? t("source.other", { other: cov.otherBenefits.map((o) => t("source.otherBenefit", { label: o.label, max: usd(o.maxAnnualInSweep) })).join("; ") }) : null,
    t("source.model", { model: modelLine(cov?.vintages.model ?? summary?.model) }),
  ].filter((x): x is string => x !== null).join(" ");
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
  if (cc > 0) p.push(t("handout.careShare", { amount: usd(cc), phrase: phrase("childcare") }));
  if (w) {
    const lost = w.programsLost.map(phrase), slots = { at: usd(w.endEarnings), drop: usd(w.drop) };
    const biggest = lost.length ? t(`handout.biggestDrop.${pluralKey(lost.length)}`, { ...slots, phrases: listOf(lost) }) : t("handout.biggestDrop.none", slots);
    p.push(biggest + (snapEnd && snapEnd.at !== w.endEarnings ? ` ${t("handout.snapEnds", { at: usd(snapEnd.at) })}` : ""));
  }
  if (child !== null && kids) p.push(t("handout.kidsCoverage", { at: usd(child + step) }));
  p.push(H.estimates, summary ? t("handout.printed.dated", { year: ev.curve.year, sweep: dateWords(summary.generated) }) : t("handout.printed.undated", { year: ev.curve.year }));
  const children = kids === 0 ? H.children.none : kids === 1 ? H.children.one : t("handout.children.other", { count: numberWords(kids) });
  return { title: t("handout.title", { state: stateName(ev.answers.state), parents: H.parents[h.married ? "two" : "one"], children }), paragraphs: p };
}

/** What a take-up state means for this household: the programs turned off that would pay at current earnings (evaluation.unclaimed). */
export function unclaimedNote(ev: HouseholdEvaluation): string {
  if (!ev.unclaimed?.length) return "";
  return t("source.unclaimed", { items: listOf(ev.unclaimed.map((u) => t("source.wouldPay", { program: programName(u.program), annual: usd(u.annual) }))), earnings: usd(ev.analysis.currentEarnings) });
}
