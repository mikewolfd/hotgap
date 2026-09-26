// The journalist page's sentences that have variants, composed from copy.ts
// in the one shape (lib/copy.ts): a count is handed to its plural message
// and the locale's rule chooses the branch; a select the data names is the
// code's pick; every figure arrives formatted. Pure, no DOM; model.test.ts
// pins the sentences here. Where a message is several sentences, they are
// joined with a space in the order the reader meets them; a list is Intl's.
import { keepRateWords, LIHEAP_VINTAGE, type LiheapShape, type ModelRecord, type ProgramId } from "@hotgap/core";
import { bind, catalog } from "../lib/copy.js";
import { dayWords, listOf, listOfItems, modelLine, money, numberWords } from "../lib/format.js";
import { programName } from "../lib/names.js";
import { servedTenths } from "../lib/served.js";
import { copy, t } from "./copy.js";

/** The sentences core writes, in the active language (`core.*`, app/README.md § Keep rate) — the road's own, which every surface says the same way. */
const ct = bind(catalog.core);

// ── The keep rate (Plan 9) ───────────────────────────────────────────────
/* The sign word and the rounding are core's `keepRateWords`, never this
   page's: the map, the citizen answer and the caseworker sheet cannot word
   or round one rate three ways. What is this page's is how much room the
   phrase gets — the whole phrase where a reader meets the measure for the
   first time, the short form in a ranked row or a table cell, and a signed
   tick on the scale, where five labels share the figure's width. */

/** "keeps 30¢ of each extra dollar" — core's own phrase, for the legend and the tile. */
export const keepPhrase = (rate: number): string => ct("road.rate", keepRateWords(rate));
/** "keeps 30¢" — the ranked row's value and the table's cell. */
export const keepShort = (rate: number): string => t("keep.short", keepRateWords(rate));
/** "+30¢", "−56¢", "0¢" — a bin bound on the scale. */
export const keepTick = (rate: number): string => t("keep.tick", keepRateWords(rate));
/** "35¢" — a bin's width, which is a distance and takes no sign: it is the same step either side of zero. */
export const keepSpan = (rate: number): string => t("keep.span", { cents: keepRateWords(rate).cents });
/** Where the road's collapse is also the tallest wall on the whole curve, said once rather than printed twice. */
export const axisSameAsRoad = (): string => copy.readout.axisSameAsRoad;

// ── The road, as the readout leads with it ───────────────────────────────
/* The sentences in the order a reader meets them: what the household keeps
   of each extra dollar walking from the poverty line to twice it, said again
   in dollars; what "money kept" counts; the biggest single loss on the road
   and how many families like it are standing below it; and a larger drop
   just past the road's top, where there is one. The RATE is core's own
   phrase, so the citizen answer and the caseworker sheet say it the same way;
   the rest is this page's, in this page's one name for each thing. */

/**
 * "**Ohio** — **loses 42¢ of each extra dollar** climbing out of poverty."
 *
 * core's `road.sentence` says the same thing with the household inside it —
 * "Ohio — a single parent of two children who earns their way from poverty to
 * twice poverty ends up 42¢ poorer for every extra dollar" — and that is right
 * on a surface where nothing else has said whose curve this is. Here the
 * answer sentence two inches above has just said it, in the same breath as the
 * national count, so the readout was spending fourteen words re-stating the
 * frame it sits under. The RATE is still core's own phrase (`road.rate`,
 * through `keepPhrase`), so the map, the citizen answer and the caseworker
 * sheet cannot word or round one rate three ways; only the frame is this
 * page's, because only this page has already supplied it.
 *
 * THE LEVEL RIDES BESIDE THE SLOPE (Level beside slope, 2026-09-26): a keep
 * rate says raises add up, not how much the family has, and across the states
 * the two are only weakly related — Wisconsin's family has $80,163 at the poverty
 * line and loses on the road, New Mexico's has $61,905 and keeps 30¢. So the
 * sentence names what the household has at both ends, in dollars; without
 * them (a file written before the levels) it is the rate alone
 * (`readout.road.rateOnly`).
 *
 * …AND SAYS THE RATE AGAIN IN DOLLARS (blind review M17, 2026-09-26): "loses
 * 105¢ of each extra dollar" read as a typo, so the sentence goes on — "a
 * raise of $28,000 leaves the family $29,362 poorer" — from the road's own two
 * ends. `raise` is the road's span, `diff` the change in what the family
 * keeps, unsigned: `change` carries the sign.
 */
export interface RoadLevel { raise: number; netLo: number; netHi: number }
export const roadRateLine = (state: string, rate: number, mark: (text: string) => string = (x) => x, level: RoadLevel | null = null): string => {
  if (level === null) return t("readout.road.rateOnly", { state, rate: mark(keepPhrase(rate)) });
  const diff = level.netHi - level.netLo;
  return t("readout.road.rate", {
    state, rate: mark(keepPhrase(rate)), raise: money(level.raise), diff: mark(money(Math.abs(diff))),
    change: diff < 0 ? "poorer" : diff === 0 ? "same" : "better", netLo: mark(money(level.netLo)), netHi: mark(money(level.netHi)),
  });
};
/**
 * WHAT "MONEY KEPT" COUNTS, said beside the figure (marketing review M3): a
 * poverty-line family "keeping $80,163" reads as absurd until the reader is
 * told what is in it. The words are written for the definition core is moving
 * to — net income after the care bill — and the clause about the subsidy is
 * the data's: it is there only where the level carries child-care help paid
 * to a provider (`childcareAtRoadLo`), and it names the dollars.
 */
export const countedLine = (subsidy: string | null): string =>
  subsidy === null ? copy.readout.road.counted : t("readout.road.countedSubsidy", { subsidy });
/**
 * "The biggest loss on the road is at $54,000: $25,833 in one step, when the
 * CCDF child care subsidy ends." One sentence, in the measure's own name
 * (M17: the road no longer "collapses"), with the programs the step ends
 * counted by the locale's plural — none, one, or several at once
 * (Massachusetts' ends SNAP *and* WIC).
 */
export const roadWorstLine = (at: string, drop: string, ids: readonly ProgramId[]): string =>
  t("readout.road.worst", { n: ids.length, at, drop, programs: programs(ids) });
/**
 * A larger drop just past the road's top (R3 (c)): Minnesota's road ends at
 * $55,000 and keeps 9¢, and its $27,483 child-care exit is the step out of
 * $56,000 — one step past the span the keep rate measures. `holds` says the
 * sentence before it was "nothing on the road", so it turns with "But".
 */
export const pastTopLine = (at: string, drop: string, holds: boolean): string =>
  t("readout.road.pastTop", { holds: holds ? "yes" : "no", at, drop });
/** What the model found instead, where no cliff falls on the road. */
export const roadHolds = (step: string, lo: string, hi: string, floor: string): string => t("readout.road.holds", { step, lo, hi, floor });
/** Who is standing there: the share of families like this earning less than the figure just named. The state is the line's own subject, named at the head of the readout, so the sentence does not say it twice. */
export const roadPosition = (n: number): string => t("readout.road.position", { n });
export const axisPosition = (n: number): string => t("readout.axisPosition", { n });
/** A cell whose road runs off its own axis: there is no rate to say. */
export const roadOffAxisLine = (state: string): string => t("readout.road.offAxis", { state });
/** Where a state's child-care price is not its own county's: the input that qualifies most of these cliffs, said beside them. */
export const carePriceLine = (care: string, state: string): string => t("readout.carePrice", { care, state });

/** "3 and 7" for two children, "1, 4, 9" for more (the label's own form, kept from the first review). */
const agesList = (ages: number[]): string => (ages.length === 2 ? listOf(ages.map(String)) : listOfItems(ages.map(String)));

/** Which of the three shapes a swept household is: one adult, or a couple with one earner or two. */
const shapeOf = (married: boolean, bothWork: boolean): "single" | "bothWork" | "oneWorks" => (!married ? "single" : bothWork ? "bothWork" : "oneWorks");

/** The household as the reader knows it (S10 of the first review): "1 adult, 2 children (3 and 7)". */
export function householdLabel(married: boolean, bothWork: boolean, ages: number[], noSubsidy = false): string {
  const H = copy.household;
  const adults = H.adults[shapeOf(married, bothWork)];
  const children = t("household.children", { n: ages.length, ages: agesList(ages) });
  const line = t("household.line", { adults, children });
  /* The `-nosub` twin: "1 adult, 2 children (3 and 7), no child-care help". */
  return noSubsidy ? t("household.nosub", { line }) : line;
}

/**
 * The same household as a SENTENCE names it — "a single parent of two
 * children" — because the road sentence puts it in the middle of one and the
 * label form ("1 adult, 2 children (3 and 7)") does not read there. Same
 * facts, different grammar; the ages are the label's job, not this one's.
 */
/* The `-nosub` twin: "a single parent of two children without child-care help". */
export function householdPhrase(married: boolean, bothWork: boolean, ages: number[], noSubsidy = false): string {
  const phrase = t(`household.phrase.${shapeOf(married, bothWork)}`, { n: ages.length, words: numberWords(ages.length) });
  return noSubsidy ? t("household.phraseNosub", { phrase }) : phrase;
}

/** The counted lede sentence, the states counted as a reader counts them (rerun N11). */
export const countedLede = (states: number, households: number, withDc: boolean): string =>
  withDc ? t("lede.counted.withDc", { states: capitalizeWords(states - 1), households: numberWords(households) })
    : t("lede.counted.plain", { states: capitalizeWords(states), households: numberWords(households) });
const capitalizeWords = (n: number): string => { const w = numberWords(n); return w[0].toUpperCase() + w.slice(1); };

// ── EligibilityBoundary (#23) ────────────────────────────────────────────
/** The served share as the citizen hears it, with the figure a reporter quotes; null says it was not published. */
export function servedLine(share: number | null): string {
  if (share === null) return t("detail.liheap.served.unread", { vintage: LIHEAP_VINTAGE.served });
  const s = servedTenths(share), pct = Math.round(share * 100);
  return s.kind === "some" ? t("detail.liheap.served.some", { n: s.n, vintage: LIHEAP_VINTAGE.served, pct }) : t(`detail.liheap.served.${s.kind}`, { vintage: LIHEAP_VINTAGE.served, pct });
}

/** The three facts, one sentence each: the limit in words, the worth by the schedule's shape, the share served. */
export function boundaryFacts(p: { limit: string; worth: { lo: string; hi: string | null; shape: LiheapShape | null } | null; share: number | null }): string {
  const worth = p.worth === null ? copy.detail.liheap.worth.unread
    : t(`detail.liheap.worth.${p.worth.hi === null ? "flat" : "range"}${p.worth.shape === "taper" ? "Taper" : p.worth.shape === "notch" ? "Notch" : "Other"}`, { lo: p.worth.lo, ...(p.worth.hi === null ? {} : { hi: p.worth.hi }) });
  return [t("detail.liheap.limit", { limit: p.limit, vintage: LIHEAP_VINTAGE.limits }), worth, servedLine(p.share)].join(" ");
}

/** Michigan: the money is in every figure, as the credit core names. */
export const boundaryCounted = (state: string, program: string): string => t("detail.liheap.counted", { state, program });

/** The publishers behind the row's figures, linked by host, with the day they were read. */
export function boundaryCite(p: { limits: string; amounts: string | null; served: string | null; readOn: string }): string {
  const link = (url: string) => t("detail.liheap.cite.link", { host: new URL(url).hostname, url });
  const sameHost = p.amounts !== null && new URL(p.amounts).hostname === new URL(p.limits).hostname;
  return [
    sameHost ? t("detail.liheap.cite.limitAndAmount", { host: link(p.limits) }) : t("detail.liheap.cite.limit", { host: link(p.limits) }),
    ...(!sameHost && p.amounts ? [t("detail.liheap.cite.amount", { host: link(p.amounts) })] : []),
    ...(p.served ? [t("detail.liheap.cite.served", { host: link(p.served) })] : []),
    t("detail.liheap.cite.readOn", { readOn: dayWords(p.readOn) }),
  ].join(" ");
}

/** Once for the page (the method): the served range with its two states, and the states where the money is counted. */
export function liheapMethodLine(lo: { state: string; share: number }, hi: { state: string; share: number }, counted: { state: string; program: string }[]): string {
  const L = copy.method.excludes.liheap;
  const lead = counted.length
    ? t("method.excludes.liheap.counted", { states: listOf(counted.map((c) => c.state)), programs: listOf([...new Set(counted.map((c) => t("method.excludes.liheap.the", { program: c.program })))]) })
    : L.none;
  return `${lead} ${t("method.excludes.liheap.grant", { vintage: LIHEAP_VINTAGE.served, loPct: Math.round(lo.share * 100), loState: lo.state, hiPct: Math.round(hi.share * 100), hiState: hi.state })}`;
}

// ── The ranked strip ─────────────────────────────────────────────────────
/** "1–12" — the rank range a lower-bound group shares, the way a tie shares one rank (rerun B1); "1." when it is one state. */
export const rankRange = (n: number): string => t("rank.range", { n });
export const rankOrdinal = (n: number): string => t("rank.ordinal", { n });
export const rowLabel = (rank: string, state: string, value: string, at?: string): string =>
  at ? t("rank.row.withAt", { rank, state, value, at }) : t("rank.row.plain", { rank, state, value });

/** Which bound lifted a row out of the ranking: the axis, from above or below — or, on a road measure, a road that runs off the axis entirely. */
export type LowerKey = "leap" | "safeExit" | "road";

/** The lower-bound group's heading: it leads the order and shares ranks 1–n (B1). */
export const lowerTitle = (key: LowerKey, n: number): string => t(`rank.lower.${key}`, { n });

/** Why the ranks are shared, and the one thing the data lets a reader say about the worst. */
export function lowerNote(key: LowerKey, n: number, top: { state: string; v: string } | null, floor?: { state: string; v: string; reaches: boolean }): string {
  const lead = t(`rank.lower.note.${key}`, { n });
  /* A road off the axis is not a bound on a figure — there is no figure —
     so there is nothing to say about the largest one. */
  if (key === "road" || !top) return lead;
  const tail = key === "leap" && floor
    ? t(`rank.lower.note.leapTop.${floor.reaches ? "reaches" : "larger"}`, { topState: top.state, topValue: top.v, floorState: floor.state, ...(floor.reaches ? {} : { floorValue: floor.v }) })
    : t("rank.lower.note.safeExitTop", { topState: top.state, topValue: top.v });
  return `${lead} ${tail}`;
}

/** `n` states, `m` programs: two counts, one nested plural. */
export const incompleteNote = (n: number, programs: string[]): string =>
  t("rank.incomplete.note", { n, m: programs.length, programs: listOf(programs) });

// ── The state's sentences (B3, B4; rerun B2) ─────────────────────────────
const programs = (ids: readonly ProgramId[]) => listOf(ids.map(programName));

/** The one-step loss as the leading sentence: the step, the programs it ends (`n`), and — for a hatched state — why the figure is a floor (`m` programs missing). */
export function stepLine(state: string, loss: string, step: string, ids: readonly ProgramId[], missing: string[]): string {
  return missing.length
    ? t("readout.floor", { n: ids.length, m: missing.length, state, loss, step, programs: programs(ids), missing: listOf(missing) })
    : t("readout.step", { n: ids.length, state, loss, step, programs: programs(ids) });
}
/**
 * The whole-axis worst as the LAST line, labelled for what it is (Plan 9).
 * It used to lead; measured on the committed sweep it names a cliff above the
 * median family's earnings in 39 states of 50, so it is a fact about the rules
 * and not an answer to what happens to a family climbing out of poverty. The
 * road leads now, and this follows it with the share of families below it.
 */
export function worstStepLine(loss: string, step: string, ids: readonly ProgramId[], missing: string[]): string {
  return missing.length
    ? t("readout.worstStepFloor", { n: ids.length, m: missing.length, loss, step, programs: programs(ids), missing: listOf(missing) })
    : t("readout.worstStep", { n: ids.length, loss, step, programs: programs(ids) });
}
export const floorTail = (missing: string[]): string => t("readout.measure.floorTail", { n: missing.length, missing: listOf(missing) });
/** What the model found instead of a cliff (rerun S6). */
export const noneLine = (state: string, step: string, floor: string, top: string, deferred: number): string =>
  deferred ? t("readout.noneDeferred", { state, step, floor, top, deferred }) : t("readout.none", { state, step, floor, top });

// ── The figure box and the method ────────────────────────────────────────
/** `n` states hatched, `m` programs unmodelled. */
export const hatchedLine = (n: number, programs: string[]): string => t("figure.hatched", { n, m: programs.length, programs: listOf(programs) });
export const binsLine = (bins: string, comparable: number, none: number, past: number): string =>
  t(`figure.binsLine.${none && past ? "nonePast" : none ? "none" : past ? "past" : "plain"}`, { bins, comparable, ...(none ? { none } : {}), ...(past ? { past } : {}) });
/**
 * The diverging scale's bounds: each arm's own step and the two ends
 * (charts.md § 2). Both widths are printed because they differ — each arm is
 * cut over its own reach — and a reader must not take a step on one arm for a
 * step on the other. With states on one side only there is one width to name.
 */
export const divergingLine = (arms: { down: string | null; up: string | null; nDown: number; nUp: number }, lo: string, hi: string): string =>
  arms.down !== null && arms.up !== null
    ? t("figure.bins.diverging", { down: numberWords(arms.nDown), downWidth: arms.down, up: numberWords(arms.nUp), upWidth: arms.up, lo, hi })
    : t("figure.bins.divergingOneSide", { n: numberWords(arms.nDown || arms.nUp), width: (arms.down ?? arms.up)!, lo, hi });
/** The axis the selected household was swept to, in dollars (rerun N9), with the states whose guidelines lengthen it. */
export const axisLine = (household: string, top: string, exceptions: { state: string; top: string }[]): string =>
  exceptions.length
    ? t("method.axis.exceptions", { household, top, exceptions: listOfItems(exceptions.map((e) => t("method.exception", e))) })
    : t("method.axis.plain", { household, top });
/** The model as a label a spreadsheet can carry (N8). */
export const modelLabel = (model: ModelRecord | null | undefined): string =>
  model?.version ? t("csv.modelLabel.hosted", { model: modelLine(model) }) : model ? t("csv.modelLabel.publicApi", { endpoint: model.endpoint }) : modelLine(model);
