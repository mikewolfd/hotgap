// The journalist page's sentences that have variants, composed from copy.ts
// in the one shape (lib/copy.ts): the code picks the variant — a plural
// category, a select the data names — and hands every figure formatted.
// Pure, no DOM; model.test.ts pins the sentences here. Where a message is
// several sentences, they are joined with a space in the order the reader
// meets them; a list is Intl's.
import { LIHEAP_VINTAGE, type LiheapShape, type ModelRecord, type ProgramId } from "@hotgap/core";
import { pluralKey } from "../lib/copy.js";
import { dayWords, listOf, listOfItems, modelLine, numberWords } from "../lib/format.js";
import { programName } from "../lib/programs.js";
import { servedTenths } from "../lib/served.js";
import { copy, t } from "./copy.js";

const one = (n: number) => pluralKey(n);
/** "3 and 7" for two children, "1, 4, 9" for more (the label's own form, kept from the first review). */
const agesList = (ages: number[]): string => (ages.length === 2 ? listOf(ages.map(String)) : listOfItems(ages.map(String)));

/** The household as the reader knows it (S10 of the first review): "1 adult, 2 children (3 and 7)". */
export function householdLabel(married: boolean, bothWork: boolean, ages: number[]): string {
  const H = copy.household, n = ages.length;
  const adults = !married ? H.adults.single : bothWork ? H.adults.bothWork : H.adults.oneWorks;
  const children = n === 0 ? H.children.none : t(`household.children.${one(n)}`, { n, ages: agesList(ages) });
  return t("household.line", { adults, children });
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
export const rankRange = (n: number): string => t(`rank.range.${one(n)}`, n === 1 ? {} : { n });
export const rankOrdinal = (n: number): string => t("rank.ordinal", { n });
export const rowLabel = (rank: string, state: string, value: string, at?: string): string =>
  at ? t("rank.row.withAt", { rank, state, value, at }) : t("rank.row.plain", { rank, state, value });

/** The lower-bound group's heading: it leads the order and shares ranks 1–n (B1). */
export const lowerTitle = (key: "leap" | "safeExit", n: number): string => t(`rank.lower.${key}.${one(n)}`, n === 1 ? {} : { n });

/** Why the ranks are shared, and the one thing the data lets a reader say about the worst. */
export function lowerNote(key: "leap" | "safeExit", n: number, top: { state: string; v: string } | null, floor?: { state: string; v: string; reaches: boolean }): string {
  const lead = t(`rank.lower.note.${key}.${one(n)}`);
  if (!top) return lead;
  const tail = key === "leap" && floor
    ? t(`rank.lower.note.leapTop.${floor.reaches ? "reaches" : "larger"}`, { topState: top.state, topValue: top.v, floorState: floor.state, ...(floor.reaches ? {} : { floorValue: floor.v }) })
    : t("rank.lower.note.safeExitTop", { topState: top.state, topValue: top.v });
  return `${lead} ${tail}`;
}

export const incompleteNote = (n: number, programs: string[]): string =>
  t(`rank.incomplete.note.${one(n)}${cap(one(programs.length))}`, { programs: listOf(programs) });
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

// ── The state's sentences (B3, B4; rerun B2) ─────────────────────────────
const programs = (ids: readonly ProgramId[]) => listOf(ids.map(programName));
const missingKey = (missing: string[]) => cap(one(missing.length));

/** The one-step loss as the leading sentence: the step, the programs it ends, and — for a hatched state — why the figure is a floor. */
export function stepLine(state: string, loss: string, step: string, ids: readonly ProgramId[], missing: string[]): string {
  const p = ids.length ? one(ids.length) : "none";
  return missing.length
    ? t(`readout.floor.${p}${missingKey(missing)}`, { state, loss, step, ...(ids.length ? { programs: programs(ids) } : {}), missing: listOf(missing) })
    : t(`readout.step.${p}`, { state, loss, step, ...(ids.length ? { programs: programs(ids) } : {}) });
}
/** The worst step as the second line, under another measure's sentence. */
export function worstStepLine(loss: string, step: string, ids: readonly ProgramId[], missing: string[]): string {
  const p = ids.length ? one(ids.length) : "none";
  return missing.length
    ? t(`readout.worstStepFloor.${p}${missingKey(missing)}`, { loss, step, ...(ids.length ? { programs: programs(ids) } : {}), missing: listOf(missing) })
    : t(`readout.worstStep.${p}`, { loss, step, ...(ids.length ? { programs: programs(ids) } : {}) });
}
export const cliffCountLine = (state: string, n: number, deferred: number): string =>
  t(`readout.measure.cliffCount.${one(n)}${deferred === 0 ? "None" : "Some"}`, { state, ...(n === 1 ? {} : { n }), ...(deferred === 0 ? {} : { deferred }) });
export const deferredLine = (state: string, deferred: number, n: number): string =>
  t(`readout.measure.deferred.${deferred === 0 ? "none" : one(deferred)}${cap(one(n))}`, { state, ...(n === 1 && deferred === 0 ? {} : { n }), ...(deferred > 1 ? { deferred } : {}) });
export const floorTail = (missing: string[]): string => t(`readout.measure.floorTail.${one(missing.length)}`, { missing: listOf(missing) });
/** What the model found instead of a cliff (rerun S6). */
export const noneLine = (state: string, step: string, floor: string, top: string, deferred: number): string =>
  deferred ? t(`readout.noneDeferred.${one(deferred)}`, { state, step, floor, top, ...(deferred === 1 ? {} : { deferred }) }) : t("readout.none", { state, step, floor, top });

// ── The figure box and the method ────────────────────────────────────────
export const hatchedLine = (n: number, programs: string[]): string =>
  t(`figure.hatched.${one(n)}${cap(one(programs.length))}`, { ...(n === 1 ? {} : { n }), programs: listOf(programs) });
export const binsLine = (bins: string, comparable: number, none: number, past: number): string =>
  t(`figure.binsLine.${none && past ? "nonePast" : none ? "none" : past ? "past" : "plain"}`, { bins, comparable, ...(none ? { none } : {}), ...(past ? { past } : {}) });
export const classesLine = (n: number, lo: number, hi: number): string => t(`figure.bins.classes.${one(n)}`, { n: numberWords(n), lo, hi });
/** The axis the selected household was swept to, in dollars (rerun N9), with the states whose guidelines lengthen it. */
export const axisLine = (household: string, top: string, exceptions: { state: string; top: string }[]): string =>
  exceptions.length
    ? t("method.axis.exceptions", { household, top, exceptions: listOfItems(exceptions.map((e) => t("method.exception", e))) })
    : t("method.axis.plain", { household, top });
/** The model as a label a spreadsheet can carry (N8). */
export const modelLabel = (model: ModelRecord | null | undefined): string =>
  model?.version ? t("csv.modelLabel.hosted", { model: modelLine(model) }) : model ? t("csv.modelLabel.publicApi", { endpoint: model.endpoint }) : modelLine(model);
