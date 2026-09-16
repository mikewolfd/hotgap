// StepList (#6): one row per threshold, from the cliff list and
// escape.programEnds under the one convention (design/inventory.md § Where
// a program ends): a program ends at the first pay at which it is gone —
// cliff.endEarnings, or programEnds[id] + one axis step. A row is the card
// a cliff mark opens (M6). Pure: rows and sentences, no DOM.
import type { Cliff, ProgramId } from "@hotgap/core";
import { copy, fill, t } from "./copy.js";
import type { Scene } from "./model.js";
import { called, noun, phrase } from "./programs.js";

type Group = "adults" | "children";

export interface StepRow {
  /** The first pay at which what this row names is gone; the row's id is `step-{at}`. */
  at: number;
  cliff: Cliff | null;
  programs: { id: ProgramId; group: Group | null }[];
  /** Above current pay the tense is "would" (W1). */
  future: boolean;
}

/** The rows, sorted by pay. O(cliffs × programs). */
export function stepRows(s: Scene): StepRow[] {
  const byAge = s.ev.escape.programEndsByAge;
  const ends = s.ev.escape.programEnds;
  const split = (id: ProgramId) => byAge.adults[id] !== undefined && byAge.children[id] !== undefined;   // one program, two endings
  const groupOf = (id: ProgramId, at: number): Group | null =>
    (["adults", "children"] as Group[]).find((g) => byAge[g][id] !== undefined && byAge[g][id]! + s.step === at) ?? null;
  const rows = new Map<number, StepRow>();
  const rowAt = (at: number): StepRow => rows.get(at) ?? rows.set(at, { at, cliff: null, programs: [], future: at > s.current }).get(at)!;
  for (const c of s.cliffs) {
    const r = rowAt(c.endEarnings);
    r.cliff = c;
    for (const id of c.programsLost) r.programs.push({ id, group: split(id) ? groupOf(id, c.endEarnings) : null });
  }
  const placed = new Set(s.cliffs.flatMap((c) => c.programsLost));
  for (const [id, last] of Object.entries(ends) as [ProgramId, number][]) {
    if (split(id)) {
      // Each group's own ending, unless a cliff already names it.
      for (const g of ["adults", "children"] as Group[]) {
        const at = byAge[g][id]! + s.step;
        if (!rowAt(at).programs.some((p) => p.id === id)) rowAt(at).programs.push({ id, group: g });
      }
    } else if (!placed.has(id)) rowAt(last + s.step).programs.push({ id, group: null });
  }
  return [...rows.values()].sort((a, b) => a.at - b.at);
}

/** The row's sentence: what ends (and what starts, and what goes on), composed from the phrase table (M3). */
export function stepSentence(s: Scene, r: StepRow): string {
  const byAge = s.ev.escape.programEndsByAge;
  const split = (id: ProgramId) => byAge.adults[id] !== undefined && byAge.children[id] !== undefined;
  let out = "";
  for (const { id, group } of r.programs) {
    const sentence = group
      ? fill(copy.steps[r.future ? "wouldEndGroup" : "endsGroup"][group], { noun: noun(id), name: called(id) })
      : t(r.future ? "steps.wouldEnd" : "steps.ends", { Phrase: capitalize(phrase(id)), name: called(id) });
    out += (out ? " " : "") + sentence;
  }
  if (!r.programs.length && r.cliff) out += copy.steps[r.future ? "wouldSmaller" : "smaller"][r.cliff.driver];
  for (const [id, ats] of Object.entries(s.starts) as [ProgramId, number[]][]) {
    if (ats.includes(r.at) && !r.programs.some((p) => p.id === id)) out += t(r.future ? "steps.wouldStart" : "steps.starts", { phrase: phrase(id), name: called(id) });
  }
  // A split program's remainder is the other group's row.
  const rem = r.cliff ? s.remains(r.cliff).filter((x) => !split(x.id)) : [];
  if (rem.length) {
    out += t("steps.remains", { until: s.m.pay(rem[0].until), list: rem.map((x) => t("steps.remainsItem", { amount: s.m.money(x.amount), phrase: phrase(x.id) })).join(" and ") });
  }
  if (r.cliff?.deferral) out += t("steps.waitsTail");
  return out;
}

/** The loss line under the sentence, or null for a row that is not a cliff. */
export function stepLoss(s: Scene, r: StepRow): string | null {
  if (!r.cliff) return null;
  const drop = s.m.about(r.cliff.drop);
  if (r.cliff.deferral) return t("steps.laterLoss", { drop });
  return t(r.future ? "steps.wouldLoss" : "steps.loss", { drop }) + (r.cliff === s.worst ? t("steps.biggest") : "");
}

export const capitalize = (x: string): string => x.charAt(0).toUpperCase() + x.slice(1);

/** The deferred callout's sentences, one per deferred cliff, or none. */
export function waitsText(s: Scene): { head: string; body: string[]; foot: string } | null {
  if (!s.deferred.length) return null;
  return {
    head: s.deferred.length > 1 ? t("waits.headMany", { n: s.deferred.length }) : t("waits.head"),
    body: s.deferred.map((c) => fill(copy.waits.reasons[c.deferral!.reason], {
      at: s.m.payUnit(c.endEarnings),
      phrase: c.programsLost.length ? phrase(c.programsLost[0]) : copy.waits.thisHelp,
    })),
    foot: t("waits.foot"),
  };
}
