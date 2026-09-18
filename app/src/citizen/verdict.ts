// AnswerSentence (#1): ONE sentence per curve shape from the catalog
// (design/inventory.md § Verdict catalog, M2), wired to the household's own
// zone, never the whole-curve escape. Each dollar figure the sentence names
// carries the key of the mark it names, so the sentence doubles as the
// chart's key: {exit} and {leap} the exit rule and the bracket, {wage} the
// cliff dot. The caseworker's client sheet opens with verdictText and
// againText from the same scene (audit D4): one catalog, one sentence, on
// both surfaces.
//
// Rewritten 2026-09-18 to the desk rule (design/README.md § Where the
// personas conflict, 1): written the way a good caseworker says it across
// the desk, then cut to what helps. The old shape opened by repeating the
// question ("You are paid $30,000 a year. You keep $45,283.") and a reader
// stopped at sentence two.
import type { Cliff } from "@hotgap/core";
import { copy, fill, parts } from "./copy.js";
import type { Scene } from "./model.js";
import { phrase } from "./programs.js";

/** One shape per curve shape; the two suffixed keys are the shapes a timing or a missing exit changes. */
export type VerdictKey = keyof typeof copy.verdict;

/**
 * The cliff the `cliff_ahead` sentence is about. `Scene.next` is the entry of
 * `analysis.cliffs` that `analysis.nextCliff` names; over JSON the re-link can
 * come back empty, and a sentence with an unfilled slot is a thrown error on a
 * person's screen, so the first cliff above the household's pay stands in.
 */
const nextCliff = (s: Scene): Cliff | null => s.next ?? s.cliffs.find((c) => c.endEarnings > s.current) ?? null;

export function verdictKey(s: Scene): VerdictKey {
  const v = s.ev.analysis.verdict;
  /* No exit reads as stuck: the sentence would otherwise name a pay that does not exist. */
  if (v === "in_danger_zone") return s.stuck || s.exit === null ? "in_danger_zone:stuck" : "in_danger_zone";
  /* A cliff the rules defer says so in four words, because the sentence names that cliff
     and would otherwise be wrong about when it lands (inventory.md § Verdict catalog). */
  if (v === "cliff_ahead") return nextCliff(s)?.deferral ? "cliff_ahead:waits" : "cliff_ahead";
  return v;
}

/**
 * The slot values for this scene's shape, every pay figure in the person's
 * unit. One sentence per shape means one set of slots per shape: `fill`
 * throws on an argument nothing asked for, which is what keeps this honest.
 *
 * The household's own pay and the money it keeps left these sentences on
 * 2026-09-18: the pay is what the person typed and the ScenarioBar still says
 * it, and what they keep is the direct label at their own diamond
 * (`charts.md` § Direct labels, 1).
 */
function verdictSlots(s: Scene): Record<string, string> {
  const { m } = s;
  switch (verdictKey(s)) {
    case "always_up":
    case "in_danger_zone:stuck":
      return { top: m.pay(s.top) };
    case "cliff_ahead":
    case "cliff_ahead:waits": {
      // The threshold is the step's landing point (§ Where a program ends).
      const c = nextCliff(s)!;
      return { wage: m.pay(c.endEarnings), drop: m.about(c.drop) };
    }
    case "cliff_behind":
      return { wage: m.pay((s.worst ?? s.cliffs[s.cliffs.length - 1]).endEarnings) };
    default:
      // The leap is the difference of the two rounded figures the sentence
      // names, so it adds up in every unit ($45,000 − $38,000 = $7,000).
      return { exit: m.pay(s.exit!), leap: m.diff(s.current, s.exit!) };
  }
}

/** The mark each slot is keyed to (a class on the span), or none. */
const SLOT_KEY: Record<string, string> = {
  wage: "hg-amt hg-amt--cliff", exit: "hg-amt hg-amt--gap", leap: "hg-amt hg-amt--gap",
};

export type VerdictPart = { text: string } | { slot: string; text: string; key: string | null };

/**
 * The sentence as parts, so a renderer can wrap each slot in its key. One
 * sentence, up to two clauses, and nothing appended: a deferred loss is
 * marked on the picture — the hollow dot, the dashed stub, the word *later*
 * and its money — and carries its rule on the step row (citizen review B1,
 * answered in the place B1 asked for).
 */
export function verdictParts(s: Scene): VerdictPart[] {
  return parts(copy.verdict[verdictKey(s)], verdictSlots(s)).map((p) => ("slot" in p ? { ...p, key: SLOT_KEY[p.slot] ?? null } : p));
}

export const verdictText = (s: Scene): string => verdictParts(s).map((p) => p.text).join("");

/**
 * A cliff at or past this share of families like the household counts as
 * "beyond its reach" for `againText`'s company clause (Plan 9 § Citizen).
 */
const FAR_POSITION = 80;

/**
 * When further zones lie beyond the household's (charts.md § 1 rule 2):
 * "It happens again from {start of the next zone} to {safe exit}", or, with
 * several, how many times between the first's start and the safe exit. The
 * zones are read off analysis.dangerZones, never assumed to abut the exit.
 *
 * Framed by company (Plan 9 § Citizen): among the cliffs from that first
 * further zone on, the first whose `position` is at or past `FAR_POSITION`
 * adds a clause naming it and how many families like this one, in tenths,
 * already stand past it — omitted where none qualifies, or every position
 * on the stretch is null (never read null as "not far").
 */
export function againText(s: Scene): string | null {
  if (s.zone === null || s.stuck || s.exit === null || s.safeExit === null || s.safeExit === s.exit) return null;
  const beyond = s.otherZones.filter((z) => z.startEarnings >= s.exit!);
  if (!beyond.length) return null;
  const slots = { from: s.m.pay(beyond[0].startEarnings), to: s.m.pay(s.safeExit) };
  let out = beyond.length === 1 ? fill(copy.again, slots) : fill(copy.againMany, { n: beyond.length, ...slots });
  const far = s.cliffs.find((c) => c.startEarnings >= beyond[0].startEarnings && c.position !== null && c.position >= FAR_POSITION);
  if (far) out += fill(copy.beyondReach, { at: s.m.pay(far.startEarnings), n: Math.round((far.position ?? 0) / 10) });
  return out;
}

/**
 * Your keep rate on the next stretch (Plan 9 § Citizen), from
 * `personal.keepNext`: `over` and `kept` are both money in the person's own
 * pay unit (app/README.md § Keep rate). A cliff inside the stretch — the
 * citizen's own next cliff, `s.next`, which can sit past the $10,000 window
 * — is named in the existing program phrase, at the pay it ends (the one
 * convention, design/inventory.md § Where a program ends); short of that, a
 * stretch keeping under 10¢ on the dollar is a flat stretch, not a cliff.
 * Null `keepNext` (less than one step of axis left) says nothing.
 */
export function keepNextText(s: Scene): string | null {
  const next = s.ev.personal.keepNext;
  if (next === null) return null;
  const { over, kept: rate } = next;
  // `over` is a pay level; what is kept out of it is a change and takes the finer step, so $400 kept is not "$0".
  const slots = { over: s.m.pay(over), kept: s.m.change(rate * over) };
  if (s.next && s.next.startEarnings < s.current + over) {
    const id = s.next.programsLost[0];
    return fill(copy.keepNext.cliff, { ...slots, phrase: id ? phrase(id) : copy.chart.someHelp, wage: s.m.pay(s.next.endEarnings) });
  }
  return fill(rate < 0.10 ? copy.keepNext.plateau : copy.keepNext.base, slots);
}
