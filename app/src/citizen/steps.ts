// StepList (#6): one row per threshold, from the one walk of the cliff list
// and escape.programEnds (lib/thresholds.ts, the ledger's too — design/
// inventory.md § Where a program ends): a program ends at the first pay at
// which it is gone. A row is the card a cliff mark opens (M6). Pure: rows and
// sentences, no DOM.
import { COVERAGE_PROGRAMS, type Cliff, type DeferralReason, type ProgramId } from "@hotgap/core";
import { capitalize, listOf } from "../lib/format.js";
import { thresholds } from "../lib/thresholds.js";
import { copy, fill, t } from "./copy.js";
import type { Scene } from "./model.js";
import { called, NAMES_ITS_GROUP, noun, phrase } from "./programs.js";

type Group = "adults" | "children";

export interface StepRow {
  /** The first pay at which what this row names is gone; the row's id is `step-{at}`. */
  at: number;
  cliff: Cliff | null;
  /** The cliff's own programs first (`onCliff`), then any that end here without one. */
  programs: { id: ProgramId; group: Group | null; onCliff: boolean }[];
  /** Above current pay the tense is "would" (W1). */
  future: boolean;
  /**
   * The rule under which the row's loss lands at a renewal, not with the
   * raise — the DeferredBadge (#10) and its clause: a deferred cliff's own
   * reason, or a child's Medicaid or CHIP ending without a cliff (42 CFR
   * 435.926 gives children 12 months of continuous eligibility, and
   * core/src/escape.ts says any front end that shows that threshold has to
   * say so). The loss itself counts like any other (2026-09-17).
   */
  waits: DeferralReason | null;
}

/** A child's coverage ending waits for the next renewal whether or not it is a cliff. */
const childCoverageWaits = (p: { id: ProgramId; group: Group | null }): boolean =>
  p.group === "children" && (COVERAGE_PROGRAMS as ProgramId[]).includes(p.id);

/**
 * The rows, sorted by pay: the thresholds grouped by the pay they land at,
 * plus a row for a cliff that names no program. A cliff's program names its
 * group only when the program ends twice (once per group) — "Your own …" /
 * "Your kids' …" — a program that ends without a cliff always names who
 * held it. O(cliffs × programs).
 */
export function stepRows(s: Scene): StepRow[] {
  const byAge = s.ev.escape.programEndsByAge;
  const split = (id: ProgramId) => byAge.adults[id] !== undefined && byAge.children[id] !== undefined;   // one program, two endings
  const rows = new Map<number, StepRow>();
  const rowAt = (at: number): StepRow => rows.get(at) ?? rows.set(at, { at, cliff: null, programs: [], future: at > s.current, waits: null }).get(at)!;
  for (const c of s.cliffs) rowAt(c.endEarnings).cliff = c;
  for (const t of thresholds(s.ev)) {
    const group = t.holder === "household" || (t.cliff && !split(t.id)) ? null : t.holder;
    rowAt(t.at).programs.push({ id: t.id, group, onCliff: t.cliff !== null });
  }
  for (const r of rows.values()) r.waits = r.cliff?.deferral?.reason ?? (r.programs.some(childCoverageWaits) ? "child_continuous_eligibility" : null);
  return [...rows.values()].sort((a, b) => a.at - b.at);
}

/** The row's sentence: what ends (and what starts, and what goes on), composed from the phrase table (M3). */
export function stepSentence(s: Scene, r: StepRow): string {
  const byAge = s.ev.escape.programEndsByAge;
  const split = (id: ProgramId) => byAge.adults[id] !== undefined && byAge.children[id] !== undefined;
  // A phrase that already names who holds it takes the plain template, not "Your kids' … for kids".
  const ends = ({ id, group }: StepRow["programs"][number]) => group && !NAMES_ITS_GROUP.has(id)
    ? fill(copy.steps[r.future ? "wouldEndGroup" : "endsGroup"][group], { noun: noun(id), name: called(id) })
    : t(r.future ? "steps.wouldEnd" : "steps.ends", { Phrase: capitalize(phrase(id)), name: called(id) });
  // The cliff's own programs, then — for a deferred cliff — when the loss
  // lands (the badge's clause, from Cliff.deferral), which belongs to them
  // and not to a program that merely ends at the same pay; those follow,
  // each child's coverage ending with its own clause, because it waits for
  // the next renewal on its own.
  let out = r.programs.filter((p) => p.onCliff).map(ends).join(" ");
  if (!r.programs.length && r.cliff) out += copy.steps[r.future ? "wouldSmaller" : "smaller"][r.cliff.driver];
  if (r.cliff?.deferral) out += t(`steps.waits.${r.cliff.deferral.reason}`);
  out += r.programs.filter((p) => !p.onCliff).map((p) => " " + ends(p) + (childCoverageWaits(p) ? t("steps.waits.child_continuous_eligibility") : "")).join("");
  for (const [id, ats] of Object.entries(s.starts) as [ProgramId, number[]][]) {
    if (ats.includes(r.at) && !r.programs.some((p) => p.id === id)) out += t(r.future ? "steps.wouldStart" : "steps.starts", { phrase: phrase(id), name: called(id) });
  }
  // A split program's remainder is the other group's row.
  const rem = r.cliff ? s.remains(r.cliff).filter((x) => !split(x.id)) : [];
  if (rem.length) {
    out += t("steps.remains", { until: s.m.pay(rem[0].until), list: listOf(rem.map((x) => t("steps.remainsItem", { amount: s.m.money(x.amount), phrase: phrase(x.id) }))) });
  }
  return out.trim();
}

/** The loss line under the sentence, or null for a row that is not a cliff: a deferred loss is counted like any other, its timing is in the sentence. */
export function stepLoss(s: Scene, r: StepRow): string | null {
  if (!r.cliff) return null;
  return t(r.future ? "steps.wouldLoss" : "steps.loss", { drop: s.m.about(r.cliff.drop) }) + (r.cliff === s.worst ? t("steps.biggest") : "");
}

/** The first deferred cliff at or above the person's pay: the answer's timing clause names it (design/REVIEW-citizen B1; M2). */
export const waitingAhead = (s: Scene): Cliff | null => s.deferred.find((c) => c.startEarnings >= s.current) ?? null;
