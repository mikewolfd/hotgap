// Where each program ends, under the one convention (design/inventory.md
// § Where a program ends): a program ends at the first pay at which it is
// gone — a cliff's landing point for every program the cliff list names,
// else `programEndsByAge[group][id]` + one axis step for a person-level
// program, else `programEnds[id]` + one step. The ThresholdLedger and the
// StepList are both this walk (audit D8); each surface keeps its own words
// and its own extra fields on top. A program is placed once per holder, and
// once per pay: a cliff that names a program the holder still keeps for a
// while (a halving) carries that fact in its cite or its remainder sentence,
// not in a second row. O(cliffs × programs).
import { COVERAGE_PROGRAMS, DEFERRAL_UNTIL, type Cliff, type HouseholdEvaluation, type ProgramId } from "@hotgap/core";

/** Who holds the program that ends here, as `programEndsByAge` splits it; `household` when it is not split or both halves end together. */
export type Holder = "adults" | "children" | "household";

export interface Threshold {
  /** The first pay at which the program is gone. */
  at: number;
  id: ProgramId;
  holder: Holder;
  /** The cliff whose landing point this is, when the cliff list names the program. */
  cliff: Cliff | null;
  /** When the loss lands, if not with the raise: the cliff's own deferral, or a child's coverage waiting for its renewal whether or not it is a cliff (escape.ts). */
  deferred: string | null;
}

/** The axis step between consecutive points ($1,000 on the sweep). */
export const stepOf = (ev: HouseholdEvaluation): number => ev.curve.points[1].earnings - ev.curve.points[0].earnings;

/** Every program's end, in walk order: the cliffs' programs, then the per-age ends, then the household ends. Callers sort. */
export function thresholds(ev: HouseholdEvaluation): Threshold[] {
  const step = stepOf(ev), { adults, children } = ev.escape.programEndsByAge;
  const holderOf = (id: ProgramId, start: number): Holder => {
    const a = adults[id], c = children[id];
    if (a !== undefined && c === undefined) return "adults";
    if (c !== undefined && a === undefined) return "children";
    if (a === start && c !== start) return "adults";
    if (c === start && a !== start) return "children";
    return "household";
  };
  const out: Threshold[] = [];
  const seen = new Set<string>(), placed = new Set<ProgramId>();
  const place = (t: Threshold): void => { seen.add(`${t.id}|${t.holder}`); placed.add(t.id); out.push(t); };
  const placedAt = (id: ProgramId, at: number): boolean => out.some((t) => t.id === id && t.at === at);
  for (const c of ev.analysis.cliffs) for (const id of c.programsLost) {
    place({ at: c.endEarnings, id, holder: holderOf(id, c.startEarnings), cliff: c, deferred: c.deferral?.until ?? null });
  }
  for (const [holder, ends] of [["adults", adults], ["children", children]] as const) {
    for (const [id, last] of Object.entries(ends) as [ProgramId, number][]) {
      if (seen.has(`${id}|${holder}`) || placedAt(id, last + step)) continue;
      place({ at: last + step, id, holder, cliff: null, deferred: holder === "children" && COVERAGE_PROGRAMS.includes(id) ? DEFERRAL_UNTIL.child_continuous_eligibility : null });
    }
  }
  for (const [id, last] of Object.entries(ev.escape.programEnds) as [ProgramId, number][]) {
    if (!placed.has(id)) place({ at: last + step, id, holder: "household", cliff: null, deferred: null });
  }
  return out;
}
