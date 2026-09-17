// The one walk both ledgers are (audit D8), on the citizen fixture: the
// cliff list first, then the per-age ends one step past their last pay, then
// the household ends; a program once per holder and once per pay.
import { describe, expect, test } from "vitest";
import { makeEvaluation } from "../citizen/fixture.js";
import { stepOf, thresholds } from "./thresholds.js";

const rows = (ev: ReturnType<typeof makeEvaluation>) => thresholds(ev).map((t) => [t.at, t.id, t.holder, t.cliff !== null, t.deferred !== null]);

describe("thresholds", () => {
  test("cliff landing points first, then programEndsByAge + step, then programEnds + step; the step is read off the points", () => {
    const ev = makeEvaluation();
    expect(stepOf(ev)).toBe(1000);
    expect(rows(ev)).toEqual([
      [42_000, "snap", "household", true, false],          // the $41k → $42k cliff
      [55_000, "childcare", "household", true, false],
      [72_000, "medicaid", "children", true, true],         // the deferred cliff: the children's Medicaid, the cliff's own until
      [38_000, "medicaid", "adults", false, false],         // the parent's, one step past the last pay it is held, no cliff
      [58_000, "eitc", "household", false, false],          // programEnds.eitc is 57,000, the LAST pay it is received
    ]);
  });
  test("a child's coverage ending without a cliff still waits for the renewal", () => {
    const ev = makeEvaluation({}, 43_000, { deferredCliff: false, chipEndsAt: 80_000 });
    expect(rows(ev)).toContainEqual([81_000, "chip", "children", false, true]);
  });
  test("a program the cliff list names is not placed again at its holder's later end: a halving carries that fact in the cite, not a second row", () => {
    const ev = makeEvaluation({}, 43_000, { deferredCliff: false });
    // The $41k cliff also names Medicaid, which the parent alone holds and keeps until $45k.
    ev.analysis.cliffs[0] = { ...ev.analysis.cliffs[0], programsLost: ["snap", "medicaid"] };
    ev.escape.programEndsByAge = { adults: { medicaid: 45_000 }, children: {} };
    const medicaid = rows(ev).filter((r) => r[1] === "medicaid");
    expect(medicaid).toEqual([[42_000, "medicaid", "adults", true, false]]);
  });
  test("a household-level program named on a cliff is not placed again from programEnds", () => {
    const ev = makeEvaluation({}, 43_000, { snapTail: true });
    expect(ev.escape.programEnds.snap).toBe(50_000);
    expect(rows(ev).filter((r) => r[1] === "snap")).toEqual([[42_000, "snap", "household", true, false]]);
  });
});
