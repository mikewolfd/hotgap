// AnswerSentence (#1): one sentence per curve shape from the catalog
// (design/inventory.md § Verdict catalog, M2), wired to the household's own
// zone, never the whole-curve escape. Each dollar figure the sentence names
// carries the key of the mark it names, so the sentence doubles as the
// chart's key: {kept} the line, {exit} and {leap} the exit rule and the
// bracket, {wage} the cliff dot.
import { copy, fill, parts } from "./copy.js";
import type { Scene } from "./model.js";

export type VerdictKey = keyof typeof copy.verdict;

export function verdictKey(s: Scene): VerdictKey {
  const v = s.ev.analysis.verdict;
  return v === "in_danger_zone" && s.stuck ? "in_danger_zone:stuck" : v;
}

/** The slot values for this scene's shape, every pay figure in the person's unit. */
export function verdictSlots(s: Scene): Record<string, string> {
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
export const SLOT_KEY: Record<string, string> = {
  pay: "amt", kept: "amt amt-keep", wage: "amt amt-cliff", exit: "amt amt-gap", leap: "amt amt-gap",
};

export type VerdictPart = { text: string } | { slot: string; text: string; key: string | null };

/** The sentence as parts, so a renderer can wrap each slot in its key. */
export const verdictParts = (s: Scene): VerdictPart[] =>
  parts(copy.verdict[verdictKey(s)], verdictSlots(s)).map((p) => ("slot" in p ? { ...p, key: SLOT_KEY[p.slot] ?? null } : p));

export const verdictText = (s: Scene): string => verdictParts(s).map((p) => p.text).join("");

/** "It happens again between {exit} and {safeExit}." when further zones lie beyond the household's (charts.md § 1 rule 2). */
export function againText(s: Scene): string | null {
  if (s.zone === null || s.stuck || s.exit === null || s.safeExit === null || s.safeExit === s.exit) return null;
  return fill(copy.again, { from: s.m.pay(s.exit), to: s.m.pay(s.safeExit) });
}
