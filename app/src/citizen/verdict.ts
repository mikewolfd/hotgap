// AnswerSentence (#1): one sentence per curve shape from the catalog
// (design/inventory.md § Verdict catalog, M2), wired to the household's own
// zone, never the whole-curve escape. Each dollar figure the sentence names
// carries the key of the mark it names, so the sentence doubles as the
// chart's key: {kept} the line, {exit} and {leap} the exit rule and the
// bracket, {wage} the cliff dot. The caseworker's client sheet opens with
// verdictText and againText from the same scene (audit D4): one catalog,
// one sentence, on both surfaces.
import { copy, fill, parts } from "./copy.js";
import type { Scene } from "./model.js";
import { noun, phrase } from "./programs.js";
import { waitingAhead } from "./steps.js";

/** One shape per curve shape; `waits` is the timing clause, keyed by rule, not a shape. */
export type VerdictKey = Exclude<keyof typeof copy.verdict, "waits">;

export function verdictKey(s: Scene): VerdictKey {
  const v = s.ev.analysis.verdict;
  return v === "in_danger_zone" && s.stuck ? "in_danger_zone:stuck" : v;
}

/** The slot values for this scene's shape, every pay figure in the person's unit. */
function verdictSlots(s: Scene): Record<string, string> {
  const { m } = s;
  const key = verdictKey(s);
  const slots: Record<string, string> = { pay: m.payUnit(s.current), kept: m.money(s.currentNet) };
  // The threshold is the step's landing point (§ Where a program ends).
  if (key === "cliff_ahead" && s.next) { slots.wage = m.pay(s.next.endEarnings); slots.drop = m.about(s.next.drop); }
  if (key === "in_danger_zone" && s.exit !== null) {
    slots.exit = m.pay(s.exit);
    // The leap is the difference of the two rounded figures the sentence
    // names, so it adds up in every unit ($45,000 − $38,000 = $7,000).
    slots.leap = m.diff(s.current, s.exit);
  }
  if (key === "in_danger_zone:stuck") slots.top = m.pay(s.top);
  return slots;
}

/** The mark each slot is keyed to (a class on the span), or none. */
const SLOT_KEY: Record<string, string> = {
  pay: "amt", kept: "amt amt-keep", wage: "amt amt-cliff", exit: "amt amt-gap", leap: "amt amt-gap",
};

export type VerdictPart = { text: string } | { slot: string; text: string; key: string | null };

/**
 * The sentence as parts, so a renderer can wrap each slot in its key — with
 * the timing clause when a deferred loss waits at or above the person's pay
 * (B1; M2): its money is already in the figures above (2026-09-17), and the
 * clause says when it lands and under which rule.
 */
export function verdictParts(s: Scene): VerdictPart[] {
  const out: VerdictPart[] = parts(copy.verdict[verdictKey(s)], verdictSlots(s)).map((p) => ("slot" in p ? { ...p, key: SLOT_KEY[p.slot] ?? null } : p));
  const w = waitingAhead(s);
  if (w) {
    const id = w.programsLost[0], reason = w.deferral!.reason;
    // Who loses it follows from the rule that defers it: a child's coverage, a parent's Medicaid, or the household's Head Start.
    const what = !id ? copy.waits.thisHelp
      : reason === "child_continuous_eligibility" ? fill(copy.waits.kids, { noun: noun(id) })
      : reason === "transitional_medical_assistance" ? fill(copy.waits.own, { noun: noun(id) })
      : phrase(id);
    const slots = { at: s.m.pay(w.endEarnings), phrase: what, drop: s.m.about(w.drop) };
    out.push(...parts(copy.verdict.waits[reason], slots).map((p) => ("slot" in p ? { ...p, key: p.slot === "at" ? "amt" : null } : p)));
  }
  return out;
}

export const verdictText = (s: Scene): string => verdictParts(s).map((p) => p.text).join("");

/**
 * When further zones lie beyond the household's (charts.md § 1 rule 2):
 * "It happens again from {start of the next zone} to {safe exit}", or, with
 * several, how many times between the first's start and the safe exit. The
 * zones are read off analysis.dangerZones, never assumed to abut the exit.
 */
export function againText(s: Scene): string | null {
  if (s.zone === null || s.stuck || s.exit === null || s.safeExit === null || s.safeExit === s.exit) return null;
  const beyond = s.otherZones.filter((z) => z.startEarnings >= s.exit!);
  if (!beyond.length) return null;
  const slots = { from: s.m.pay(beyond[0].startEarnings), to: s.m.pay(s.safeExit) };
  return beyond.length === 1 ? fill(copy.again, slots) : fill(copy.againMany, { n: beyond.length, ...slots });
}
