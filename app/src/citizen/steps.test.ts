// StepList rows under the one threshold convention (design/inventory.md
// § Where a program ends): a cliff's row is at endEarnings; a program that
// ends without a cliff is at programEnds + one step; a person-level program
// splits by who loses it; above current pay the tense is "would".
import { describe, expect, test } from "vitest";
import { makeEvaluation } from "./fixture.js";
import { sceneOf } from "./model.js";
import { stepLoss, stepRows, stepSentence } from "./steps.js";

const year = { unit: "year" };
const rowsOf = (s: ReturnType<typeof sceneOf>) => stepRows(s).map((r) => ({ at: r.at, sentence: stepSentence(s, r), loss: stepLoss(s, r) }));

describe("stepRows", () => {
  test("one row per threshold, sorted, the cliff's landing point or programEnds + step", () => {
    const s = sceneOf(makeEvaluation(), year);
    expect(s.ev.escape.programEnds.eitc).toBe(57_000);           // the LAST pay it is received…
    expect(rowsOf(s)).toEqual([
      { at: 38_000, sentence: "Your own free state health plan ends — it's called Medicaid.", loss: null },
      { at: 42_000, sentence: "Food help ends — it's called SNAP.", loss: "You keep about $2,500 less." },
      { at: 55_000, sentence: "Child care help would end — it's called the CCDF child care subsidy.", loss: "You'd keep about $9,000 less. This is the biggest drop." },
      { at: 58_000, sentence: "A tax break for workers would end — it's called the Earned Income Tax Credit (EITC).", loss: null },   // …so the row is one step later
      // The deferred row counts its loss like any other (2026-09-17); its clause says when it lands.
      { at: 72_000, sentence: "Your kids' free state health plan would end — it's called Medicaid. It doesn't end that day: your kids keep it until their next yearly check, up to 12 months later.", loss: "You'd keep about $1,500 less." },
    ]);
  });
  test("a split program gets one row per group; the cliff row takes the group whose end it is", () => {
    const s = sceneOf(makeEvaluation(), year);
    const medicaid = stepRows(s).filter((r) => r.programs.some((p) => p.id === "medicaid"));
    expect(medicaid.map((r) => [r.at, r.programs[0].group])).toEqual([[38_000, "adults"], [72_000, "children"]]);
    expect(medicaid[1].cliff?.deferral?.reason).toBe("child_continuous_eligibility");
    expect(medicaid[1].waits).toBe("child_continuous_eligibility");
  });
  test("the biggest drop still says so when the evaluation has been over the wire", () => {
    /* The page reads an evaluation from `POST /api/evaluate`, so `worstCliff`
       arrives as its own object rather than the `cliffs` entry it names, and
       everything that compares by identity — this line, the chart's one direct
       label — goes quiet without a single test failing. So the round trip is
       pinned here: in process the reference holds and this test proves nothing,
       which is the point of doing it through JSON. */
    const wire = JSON.parse(JSON.stringify(makeEvaluation()));
    const s = sceneOf(wire, year);
    expect(s.cliffs).toContain(s.worst);        /* toContain is identity on objects, which is the whole question */
    expect(s.cliffs).toContain(s.next);
    expect(s.worst?.endEarnings).toBe(55_000);
    expect(stepLoss(s, stepRows(s).find((r) => r.at === 55_000)!)).toBe("You'd keep about $9,000 less. This is the biggest drop.");
  });
  test("a deferred cliff that is the biggest drop says so, like any other", () => {
    const s = sceneOf(makeEvaluation({}, 43_000, { snapCliff: false, careCliff: false }), year);
    expect(s.worst?.deferral?.reason).toBe("child_continuous_eligibility");
    expect(stepLoss(s, stepRows(s).find((r) => r.at === 72_000)!)).toBe("You'd keep about $1,500 less. This is the biggest drop.");
  });
  test("a cliff with no nameable program says what got smaller, by driver", () => {
    const s = sceneOf(makeEvaluation({}, 60_000, { stuckAt: 61_000 }), year);
    const row = stepRows(s).find((r) => r.at === 61_000)!;
    expect(row.cliff?.driver).toBe("other");
    expect(stepSentence(s, row)).toBe("Other money would get smaller here.");
  });
  test("what is left of a lost program is said with the first pay at which it is gone", () => {
    // SNAP halves at $42k (programsLost names it) and $1,200 goes on to $50k: gone at $51k, one step past programEnds.
    const s = sceneOf(makeEvaluation({}, 43_000, { snapTail: true }), year);
    expect(s.ev.escape.programEnds.snap).toBe(50_000);
    expect(s.remains(s.cliffs[0])).toEqual([{ id: "snap", amount: 1200, until: 51_000 }]);
    expect(stepSentence(s, stepRows(s).find((r) => r.at === 42_000)!)).toBe("Food help ends — it's called SNAP. Some of it carries on to $51,000: $1,200 of food help.");
  });
  test("a start is mentioned on the row at the same pay", () => {
    // The premium credit starts at $39k; give that pay a row by ending a program there.
    const ev = makeEvaluation();
    ev.escape.programEnds.wic = 38_000;
    const s = sceneOf(ev, year);
    expect(stepSentence(s, stepRows(s).find((r) => r.at === 39_000)!)).toBe("Food help for moms and babies ends — it's called WIC. Then help paying for health insurance starts — it's called the Premium tax credit.");
  });
  test("the badge's clause follows the deferred cliff's own programs, not one that merely ends at the same pay", () => {
    const ev = makeEvaluation();
    ev.escape.programEnds.wic = 71_000;   // WIC ends at $72k too, without a cliff
    const s = sceneOf(ev, year);
    expect(stepSentence(s, stepRows(s).find((r) => r.at === 72_000)!)).toBe(
      "Your kids' free state health plan would end — it's called Medicaid. It doesn't end that day: your kids keep it until their next yearly check, up to 12 months later. Food help for moms and babies would end — it's called WIC.");
  });
  test("a parent's Medicaid ending is listed even when the children's runs past the axis and the household total never ends", () => {
    const s = sceneOf(makeEvaluation({}, 43_000, { deferredCliff: false }), year);
    expect(s.ev.escape.programEnds.medicaid).toBeUndefined();
    expect(s.ev.escape.programEndsByAge.adults.medicaid).toBe(37_000);
    const row = stepRows(s).find((r) => r.at === 38_000)!;
    expect(row.programs).toEqual([{ id: "medicaid", group: "adults", onCliff: false }]);
    expect(row.waits).toBeNull();
    expect(stepSentence(s, row)).toBe("Your own free state health plan ends — it's called Medicaid.");
  });
  test("a child's coverage ending that is not a cliff still waits for the next renewal (escape.ts childCoverageEndEarnings)", () => {
    const s = sceneOf(makeEvaluation({}, 43_000, { deferredCliff: false, chipEndsAt: 80_000 }), year);
    expect(s.cliffs.some((c) => c.endEarnings === 81_000)).toBe(false);
    const row = stepRows(s).find((r) => r.at === 81_000)!;
    expect(row.waits).toBe("child_continuous_eligibility");
    expect(stepSentence(s, row)).toBe("A health plan for kids would end — it's called CHIP. It doesn't end that day: your kids keep it until their next yearly check, up to 12 months later.");
    expect(stepLoss(s, row)).toBeNull();
  });
  test("the tense turns to 'would' above current pay", () => {
    const s = sceneOf(makeEvaluation({}, 80_000), year);
    expect(rowsOf(s).map((r) => r.sentence)).toEqual(expect.arrayContaining([expect.stringMatching(/^Child care help ends —/)]));
    expect(rowsOf(s).every((r) => !/would/.test(r.sentence) || r.at > 80_000)).toBe(true);
  });
});
