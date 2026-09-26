// AnswerSentence (#1) for the journalist surface: the national reading of the
// selected measure, in one sentence, from the data.
//
// It is the figure's own <figcaption> and the first thing on the page after
// one line of masthead (design/PICTURE-FIRST-2026-09-18.md; design/inventory.md
// § The page is its picture). What it says is a lede a reporter could file:
// the extreme state and its figure, and how far across the country the thing
// goes — never a claim the rows do not carry.
//
// Three rules it keeps:
//
//   1. **Every figure is read off the same rows the map shades.** The extreme
//      state is `g.ranked[0]`, which is the ranking's own rank 1, so the
//      sentence and the strip can never name different states; the counts are
//      counted here, off `rows`, not carried in copy.
//   2. **The denominator is named once, in full.** "the 50 states and the
//      District of Columbia" — the cold read of 2026-09-18 found the page's
//      own denominator moving between 50 and 51 from line to line, and a
//      reporter cannot use a fraction whose bottom half moves.
//   3. **A measure with nothing to name says so.** Every measure has a
//      no-figure branch, because a household with no cliff anywhere (or a
//      count that is zero in every state) is a real reading of this map and
//      not an empty sentence with a zero in it.
//
// The slot a sentence keys to the loss ramp is the one whose figure is drawn
// on it, so the sentence doubles as the map's key — the citizen rule, on a
// map (design/charts.md § The map is the picture).
import { answersFor, ARCHETYPES, CLIFF_MIN } from "@hotgap/core";
import type { Part } from "../lib/copy.js";
import { listOf, money, numberWords } from "../lib/format.js";
import { stateName } from "../lib/names.js";
import { copy, parts, t } from "./copy.js";
import { paysForCare, type Archetype, type Grouped, type Measure, type StateRow } from "./model.js";
import { householdPhrase, keepPhrase } from "./words.js";

/** What one sentence needs — a subset of render.ts's Scene, so a render pass hands over what it already has. */
export interface AnswerScene {
  arch: Archetype;
  measure: Measure;
  rows: StateRow[];
  g: Grouped;
}

export type AnswerPart = { text: string } | { slot: string; text: string; key: string | null };

/** The sweep's $1,000 between points: the width of the step a figure names. */
const STEP = 1000;

/**
 * The mark a slot is keyed to. Everything a sentence underlines here is drawn
 * on the plum loss ramp; a figure on the keep ramp is left plain, because an
 * underline in loss ink would say the opposite of the tile.
 *
 * A COUNT IS HANDED OVER TWICE, and on purpose: `n` chooses the plural branch
 * and `count` is the figure the branch prints. ICU renders a plural's own
 * selector as a literal, so a `{n}` inside the branch comes back as text and
 * the renderer has nothing to wrap — the count went unkeyed on three measures
 * until this was read off the render. The selector stays a number, the printed
 * figure is a string, which is the shape lib/copy.ts asks for.
 */
const KEYED = "hg-amt hg-amt--cliff";

/** "the 50 states and the District of Columbia", counted off the rows rather than typed. */
function placesPhrase(rows: StateRow[]): string {
  const dc = rows.some((r) => r.st === "DC");
  return t(dc ? "answer.places.withDc" : "answer.places.plain", { n: rows.length - (dc ? 1 : 0) });
}

/** A message and the arguments it takes, with the slots that carry a mark's ink. */
interface Sentence { text: string; args: Record<string, string | number>; keyed?: string[] }

/**
 * Which sentence this view gets, and what fills it. One branch per measure,
 * each with its own "nothing to name" form; `g.ranked[0]` is rank 1 on the
 * strip below, so the two cannot disagree.
 */
function sentenceFor(s: AnswerScene): Sentence {
  const { measure, rows, g } = s;
  const A = copy.answer;
  const places = placesPhrase(rows);
  const floor = money(CLIFF_MIN);
  const top = g.ranked[0];
  const name = (r: StateRow) => stateName(r.st);
  const household = householdPhrase(s.arch.married, s.arch.id.includes("dual"), s.arch.childAges, s.arch.id.endsWith("-nosub"));

  switch (measure.key) {
    case "keepRate": {
      const rated = rows.filter((r) => r.m.keepRate !== null);
      const bad = rated.filter((r) => (r.m.keepRate as number) < 0).length;
      /* The boundary sensitivity (road.ts `keepRateToLine`): of those, the
         states still negative measured to exactly twice poverty, without the
         road's one-step allowance — the ones whose loss is not one exit sitting
         on the line. Counted within `bad`, so the clause is "of them". */
      const strict = rated.filter((r) => (r.m.keepRate as number) < 0 && (r.m.keepRateToLine ?? 0) < 0).length;
      const edgeArgs = { strict, strictCount: String(strict) };
      /* The extreme is the ranking's own first row: lowest rate first, because
         `worst` is "low" on this measure. With none rated there is no map. */
      const edge = g.ranked[0] ?? rated[0];
      if (bad === 0) {
        return { text: A.keepRate.none, args: { places, household, state: name(edge), value: keepPhrase(edge.m.keepRate as number) } };
      }
      if (bad === rated.length) {
        return { text: A.keepRate.all, args: { places, household, state: name(edge), value: keepPhrase(edge.m.keepRate as number), ...edgeArgs }, keyed: ["value"] };
      }
      return { text: A.keepRate.some, args: { places, household, bad, ...edgeArgs }, keyed: ["bad"] };
    }
    case "roadCliffCount": {
      /* THE COMPLEMENT, not the share. "{some} of {places}" printed "50 of the
         50 states and the District of Columbia" on this run — a numerator and
         a denominator that read as the same number, in the sentence whose
         whole job is a fraction a reporter can quote. The states with NONE are
         also the more interesting count, and there is never more than one way
         to read it. */
      const miss = rows.filter((r) => r.m.roadCliffCount === 0).length;
      if (!top || (top.value as number) === 0) return { text: A.roadCliffCount.none, args: { places, floor } };
      return { text: A.roadCliffCount.some, args: { places, state: name(top), n: top.value as number, count: String(top.value), miss }, keyed: ["count"] };
    }
    case "roadWorst": {
      if (!top || !top.m.roadWorst) return { text: A.roadWorst.none, args: { places, floor } };
      const w = top.m.roadWorst;
      return { text: A.roadWorst.some, args: { state: name(top), drop: money(w.drop), at: money(w.at), to: money(w.at + STEP) }, keyed: ["drop"] };
    }
    /* The two levels: what the household has at an end of the road. The
       ranking leads with the LOWEST figure (`worst: "low"`), so the state that
       keeps least is `g.ranked[0]` and the one that keeps most the last row.
       Every rated state has a figure; a road off the axis is "past". */
    case "netAtRoadLo":
    case "netAtRoadHi": {
      const best = g.ranked[g.ranked.length - 1]; /* never empty where a road is on the axis, which it is in every swept cell */
      return { text: A[measure.key].some, args: { household, state: name(top), value: money(top.value as number), best: name(best), bestValue: money(best.value as number) }, keyed: ["value"] };
    }
    case "biggestLoss": {
      const miss = rows.filter((r) => r.m.cliffCount === 0).length;
      if (!top || top.m.biggestLossAt === null) return { text: A.biggestLoss.none, args: { places, floor } };
      return { text: A.biggestLoss.some, args: { places, miss, state: name(top), drop: money(top.value as number), at: money(top.m.biggestLossAt), to: money(top.m.biggestLossAt + STEP) }, keyed: ["drop"] };
    }
    case "dangerWidth":
      if (!top || (top.value as number) === 0) return { text: A.dangerWidth.none, args: { places } };
      return { text: A.dangerWidth.some, args: { state: name(top), width: money(top.value as number) }, keyed: ["width"] };
    case "leap":
      if (!top || (top.value as number) === 0) return { text: A.leap.none, args: { places } };
      return { text: A.leap.some, args: { state: name(top), leap: money(top.value as number) }, keyed: ["leap"] };
    case "safeExit":
      if (!top) return { text: A.safeExit.none, args: { places } };
      /* A state whose last danger zone never closed has no exit to compare,
         and there are three on the committed sweep: the sentence says how many
         rather than letting the highest MEASURED exit stand as the highest. */
      if (g.past.length) return { text: A.safeExit.open, args: { n: g.past.length, state: name(top), exit: money(top.value as number) }, keyed: ["exit"] };
      return { text: A.safeExit.some, args: { state: name(top), exit: money(top.value as number) }, keyed: ["exit"] };
    case "cliffCount":
      if (!top || (top.value as number) === 0) return { text: A.cliffCount.none, args: { places, floor } };
      return { text: A.cliffCount.some, args: { state: name(top), n: top.value as number, count: String(top.value) }, keyed: ["count"] };
    default:
      if (!top || (top.value as number) === 0) return { text: A.deferredCliffCount.none, args: { places } };
      return { text: A.deferredCliffCount.some, args: { state: name(top), n: top.value as number, count: String(top.value) }, keyed: ["count"] };
  }
}

/** The sentence as parts, so the renderer can underline each keyed figure in the ink of the tiles it counts. */
export function answerParts(s: AnswerScene): AnswerPart[] {
  const sentence = sentenceFor(s);
  const keyed = new Set(sentence.keyed ?? []);
  return parts(sentence.text, sentence.args).map((p: Part) => ("slot" in p ? { ...p, key: keyed.has(p.slot) ? KEYED : null } : p));
}

/** The same sentence as text — for the figure's accessible name and for a proof that reads it once. */
export const answerText = (s: AnswerScene): string => answerParts(s).map((p) => p.text).join("");

/** The programs the holds line can name, in the order it names them: the subsidy first, because it is the one a reader cannot assume. */
const HOLDS: readonly ["childcare" | "snap" | "tanf" | "medicaid" | "wic", "getsChildcareSubsidy" | "getsSnap" | "getsTanf" | "getsMedicaid" | "getsWic"][] = [
  ["childcare", "getsChildcareSubsidy"], ["snap", "getsSnap"], ["tanf", "getsTanf"], ["medicaid", "getsMedicaid"], ["wic", "getsWic"],
];

/**
 * THE HOLDS LINE under the answer (TASKS: say what the family holds): the
 * household the number is true of, from core's own `answersFor` — the rent it
 * pays, the care it buys and the programs it is counted as getting — so "a
 * single parent of two children" arrives with the facts that make it the
 * swept household rather than any one. The flags do not vary by state, so
 * any state the run carries answers for all of them. Null for an archetype
 * core no longer sweeps (an old file), which has no answers to read.
 */
export function holdsText(arch: Archetype, states: readonly string[]): string | null {
  const shape = ARCHETYPES.find((a) => a.id === arch.id);
  const [state] = states;
  if (!shape || !state) return null;
  const answers = answersFor(state, shape);
  const pays = paysForCare(arch);
  /* The subsidy is named only beside the bill it pays: the sweep sends the flag for a childless adult too, where it does nothing. */
  const programs = HOLDS.filter(([id, flag]) => answers[flag] && (id !== "childcare" || pays)).map(([id]) => copy.answer.holdsProgram[id]);
  const n = arch.childAges.length;
  /* The care bill is the archetype's (model.ts `paysForCare`, the rule core's
     `monthlyChildcare > 0` follows): every parent works and a child is of
     child-care age. */
  const care = pays
    ? t("answer.holdsCare", { kids: t("answer.holdsKids", { n, words: numberWords(n) }) })
    : copy.answer.holdsNoCare;
  return t("answer.holds", { care, programs: listOf(programs) });
}
