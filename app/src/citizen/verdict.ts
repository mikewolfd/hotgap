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
import { keepRate, pointAtOrBelow, type Cliff, type DangerZone } from "@hotgap/core";
import { copy, fill, parts, type Part } from "./copy.js";
import type { Scene } from "./model.js";

/** One shape per curve shape; the suffixed keys are the shapes a timing, a missing exit, a drop already passed, a short dip or a bigger drop further on changes. */
export type VerdictKey = keyof typeof copy.verdict;

/**
 * The cliff the `cliff_ahead` sentence is about. `Scene.next` is the entry of
 * `analysis.cliffs` that `analysis.nextCliff` names; over JSON the re-link can
 * come back empty, and a sentence with an unfilled slot is a thrown error on a
 * person's screen, so the first cliff above the household's pay stands in.
 */
const nextCliff = (s: Scene): Cliff | null => s.next ?? s.cliffs.find((c) => c.endEarnings > s.current) ?? null;

/**
 * The drop the household has already come down inside its own zone — the
 * last cliff landing on (zone start, current pay] — or null at the peak,
 * where nothing has dropped yet and "more pay won't leave you better off
 * until…" is the whole story (design/TASKS.md § Danger-zone sentences).
 */
export function dropBehind(s: Scene): Cliff | null {
  const z = s.zone;
  if (z === null) return null;
  return s.cliffs.filter((c) => c.endEarnings > z.startEarnings && c.endEarnings <= s.current).pop() ?? null;
}

/**
 * What the household keeps of each extra dollar from where it stands (the
 * sampled point at or below its pay, the one every "at your own pay"
 * reading uses) to its exit: core's keepRate over the curve's own points.
 * Null with no exit, or when either end is not a sampled point.
 */
function insideRate(s: Scene): number | null {
  if (s.exit === null) return null;
  const points = s.ev.curve.points;
  return keepRate(points, pointAtOrBelow(points, s.current).earnings, s.exit);
}

/**
 * The zone that opens at this cliff, when it closes again within three
 * steps: a dip the household is ahead of again a little further on, not a
 * permanent cost (design/TASKS.md § Cliff-first verdicts).
 */
function dipZone(s: Scene, c: Cliff): (DangerZone & { endEarnings: number }) | null {
  const z = s.ev.analysis.dangerZones.find((d) => d.startEarnings === c.startEarnings);
  return z && z.endEarnings !== null && z.endEarnings - z.startEarnings <= 3 * s.step ? (z as DangerZone & { endEarnings: number }) : null;
}

/** The bigger drop further up than the one the sentence is about, if any: the second clause names it. */
const worstBeyond = (s: Scene, c: Cliff): Cliff | null =>
  s.worst !== null && s.worst !== c && s.worst.startEarnings > c.startEarnings ? s.worst : null;

export function verdictKey(s: Scene): VerdictKey {
  const v = s.ev.analysis.verdict;
  if (v === "in_danger_zone") {
    const behind = dropBehind(s) !== null;
    /* No exit reads as stuck: the sentence would otherwise name a pay that does not exist. */
    if (s.stuck || s.exit === null) return behind ? "in_danger_zone:stuck:inside" : "in_danger_zone:stuck";
    return behind && insideRate(s) !== null ? "in_danger_zone:inside" : "in_danger_zone";
  }
  if (v === "cliff_ahead") {
    const c = nextCliff(s);
    /* A cliff the rules defer says so in four words, because the sentence names that cliff
       and would otherwise be wrong about when it lands (inventory.md § Verdict catalog). */
    if (c?.deferral) return "cliff_ahead:waits";
    if (c && dipZone(s, c)) return "cliff_ahead:dip";
    const worst = c ? worstBeyond(s, c) : null;
    if (worst) return worst.position !== null ? "cliff_ahead:worst" : "cliff_ahead:worstAt";
    return "cliff_ahead";
  }
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
function verdictSlots(s: Scene, key: VerdictKey): Record<string, string | number> {
  const { m } = s;
  switch (key) {
    case "always_up":
    case "in_danger_zone:stuck":
      return { top: m.pay(s.top) };
    case "in_danger_zone:inside":
      return { wage: m.pay(dropBehind(s)!.endEarnings), exit: m.pay(s.exit!), cents: Math.round(100 * insideRate(s)!), peak: m.pay(s.zone!.startEarnings) };
    case "in_danger_zone:stuck:inside":
      return { wage: m.pay(dropBehind(s)!.endEarnings), top: m.pay(s.top), peak: m.pay(s.zone!.startEarnings) };
    case "cliff_ahead":
    case "cliff_ahead:waits":
    case "cliff_ahead:dip":
    case "cliff_ahead:worst":
    case "cliff_ahead:worstAt": {
      // The threshold is the step's landing point (§ Where a program ends).
      const c = nextCliff(s)!;
      const out: Record<string, string | number> = { wage: m.pay(c.endEarnings), drop: m.about(c.drop) };
      if (key === "cliff_ahead:dip") out.exit = m.pay(dipZone(s, c)!.endEarnings);
      if (key === "cliff_ahead:worst" || key === "cliff_ahead:worstAt") {
        const w = worstBeyond(s, c)!;
        out.worstAt = m.pay(w.endEarnings);
        if (key === "cliff_ahead:worst") out.n = Math.round((w.position ?? 0) / 10);
      }
      return out;
    }
    case "cliff_behind":
      return { wage: m.pay((s.worst ?? s.cliffs[s.cliffs.length - 1]).endEarnings) };
    default:
      // The leap is the difference of the two rounded figures the sentence
      // names, so it adds up in every unit ($45,000 − $38,000 = $7,000).
      return { exit: m.pay(s.exit!), leap: m.diff(s.current, s.exit!) };
  }
}

/** The mark each slot is keyed to (a class on the span), or none: a drop's landing pay → the cliff dot, the exit and the leap → the exit rule. */
const SLOT_KEY: Record<string, string> = {
  wage: "hg-amt hg-amt--cliff", worstAt: "hg-amt hg-amt--cliff", exit: "hg-amt hg-amt--gap", leap: "hg-amt hg-amt--gap",
};

export type VerdictPart = { text: string } | { slot: string; text: string; key: string | null };

/** The shapes that open with the next-stretch rate; the in-zone shapes carry a rate of their own, or say nothing gets the household back. */
const LED: ReadonlySet<VerdictKey> = new Set<VerdictKey>(["always_up", "cliff_ahead", "cliff_ahead:waits", "cliff_ahead:dip", "cliff_ahead:worst", "cliff_ahead:worstAt", "cliff_behind"]);

/**
 * The sentence as parts, so a renderer can wrap each slot in its key.
 * Cliff-first (design/TASKS.md § Cliff-first verdicts): outside a zone the
 * answer opens with what the household keeps of its next stretch of pay,
 * and the cliff is the second sentence — two whole messages joined by a
 * space, the one composition lib/copy.ts allows. With no next stretch (less
 * than a step of axis left) the shape's own sentence stands alone. Nothing
 * else is appended: a deferred loss is marked on the picture — the hollow
 * dot, the dashed stub, the word *later* and its money — and carries its
 * rule on the step row (citizen review B1, answered in the place B1 asked for).
 */
export function verdictParts(s: Scene): VerdictPart[] {
  const key = verdictKey(s);
  const lead = LED.has(key) ? keepNextParts(s) : null;
  const body = parts(copy.verdict[key], verdictSlots(s, key));
  return [...(lead ? [...lead, { text: " " }] : []), ...body].map((p) => ("slot" in p ? { ...p, key: SLOT_KEY[p.slot] ?? null } : p));
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
 * pay unit (app/README.md § Keep rate). Since the cliff-first verdicts it is
 * the answer's first sentence, and the cliff the stretch may cross is named
 * by the sentence after it — so this one says only the figure, and, with no
 * cliff inside the stretch (the citizen's own next cliff, `s.next`, can sit
 * past the $10,000 window), that a stretch keeping under 10¢ on the dollar is
 * a flat stretch. Null `keepNext` (less than one step of axis left) says nothing.
 */
function keepNextParts(s: Scene): Part[] | null {
  const next = s.ev.personal.keepNext;
  if (next === null) return null;
  const { over, kept: rate } = next;
  // `over` is a pay level; what is kept out of it is a change and takes the finer step, so $400 kept is not "$0".
  const slots = { over: s.m.pay(over), kept: s.m.change(rate * over) };
  const cliffInside = s.next !== null && s.next.startEarnings < s.current + over;
  return parts(rate < 0.10 && !cliffInside ? copy.keepNext.plateau : copy.keepNext.base, slots);
}

/** The next-stretch sentence on its own, as the answer opens with it. */
export const keepNextText = (s: Scene): string | null => keepNextParts(s)?.map((p) => p.text).join("") ?? null;
