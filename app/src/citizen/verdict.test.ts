// The AnswerSentence: one shape per verdict, the honest stuck branch, every
// pay figure in the person's unit, the keyed slots (design/inventory.md M2, M5).
import { describe, expect, test } from "vitest";
import { makeEvaluation, makeSfEvaluation } from "./fixture.js";
import { sceneOf } from "./model.js";
import { againText, keepNextText, verdictKey, verdictParts, verdictText } from "./verdict.js";

const year = { unit: "year" };

describe("verdict shapes", () => {
  test("in a zone, at the peak (no drop behind yet): exit and leap from personal, not the whole-curve escape", () => {
    // $41,500 is past the $41,000 peak and short of the $42,000 landing: nothing has dropped yet.
    const s = sceneOf(makeEvaluation({}, 41_500), year);
    expect(verdictKey(s)).toBe("in_danger_zone");
    // One sentence, two clauses, and only the two figures that answer the question: the exit and the leap
    // (design/inventory.md § Verdict catalog — the pay and the money kept left this sentence on 2026-09-18).
    expect(verdictText(s)).toBe("More pay won't leave you better off until you're past $46,000 — $4,500 more than you make now.");
  });
  test("in a zone, past a drop: the drop, the rate to the exit, and the peak the exit gets back to (design/TASKS.md § Danger-zone sentences)", () => {
    const s = sceneOf(makeEvaluation(), year);
    expect(verdictKey(s)).toBe("in_danger_zone:inside");
    // $43,000 → $46,000 gains $2,400: 80¢ a dollar; the peak it gets back to is the zone's start.
    expect(verdictText(s)).toBe("Your pay is past a drop at $42,000. From here to $46,000 you keep about 80¢ of each extra dollar; at $46,000 you're back to what you'd have kept at $41,000.");
    expect(s.exit).toBe(46_000);
    // The whole curve's safe exit is $74,000 (the deferred $72k step counts since 2026-09-17 and opens the last zone;
    // it was $67,000 with that step lifted out); the sentence names the household's own $46,000 and says where it
    // happens again — from the NEXT zone's start ($54,000), read off dangerZones, never assumed to abut the exit.
    expect(s.safeExit).toBe(74_000);
    expect(s.otherZones.map((z) => z.startEarnings)).toEqual([54_000, 71_000]);
    expect(againText(s)).toBe("Further up, between $54,000 and $74,000, there are 2 more stretches where a raise doesn't leave you better off.");
  });
  test("the San Francisco household, past its food-help drop: 20¢ a dollar from $30,000 to $43,000", () => {
    const s = sceneOf(makeSfEvaluation(), year);
    expect(s.zone?.startEarnings).toBe(28_000);
    expect(s.zone?.peakNet).toBe(44_985);
    expect(s.currentNet).toBe(42_797);
    expect(s.exit).toBe(43_000);
    expect(verdictKey(s)).toBe("in_danger_zone:inside");
    expect(verdictText(s)).toBe("Your pay is past a drop at $29,000. From here to $43,000 you keep about 20¢ of each extra dollar; at $43,000 you're back to what you'd have kept at $28,000.");
  });
  test("cliff ahead: the next-stretch rate first, then the cliff at the step's landing point, the drop about-rounded", () => {
    const s = sceneOf(makeEvaluation({}, 38_000, { careCliff: false, deferredCliff: false }), year);
    expect(s.next?.endEarnings).toBe(42_000);
    expect(s.worst).toBe(s.next);
    expect(verdictKey(s)).toBe("cliff_ahead");
    expect(verdictText(s)).toBe("Of the next $10,000 you earn you'd keep about $4,700. Nothing drops sharply until $42,000; past it you'd lose about $2,500 a year.");
    expect(againText(s)).toBeNull();
  });
  test("cliff ahead with a bigger drop further on: named, with its company when the cliff has a position", () => {
    const at = sceneOf(makeEvaluation({}, 38_000), year);
    expect(at.worst?.endEarnings).toBe(55_000);
    expect(verdictKey(at)).toBe("cliff_ahead:worstAt");
    expect(verdictText(at)).toBe("Of the next $10,000 you earn you'd keep about $4,700. Nothing drops sharply until $42,000; past it you'd lose about $2,500 a year, and the biggest drop is at $55,000.");
    const far = sceneOf(makeEvaluation({}, 38_000, { positions: { 54_000: 82 } }), year);
    expect(verdictKey(far)).toBe("cliff_ahead:worst");
    expect(verdictText(far)).toBe("Of the next $10,000 you earn you'd keep about $4,700. Nothing drops sharply until $42,000; past it you'd lose about $2,500 a year, and the biggest drop is at $55,000, past what 8 in 10 families like yours earn.");
  });
  test("a dip is not a permanent cost: a zone that closes within three steps says when the household is ahead again", () => {
    const s = sceneOf(makeEvaluation({}, 50_000, { snapCliff: false, careCliff: false, deferredCliff: false, dipAt: 63_000 }), year);
    expect(s.next?.endEarnings).toBe(63_000);
    expect(verdictKey(s)).toBe("cliff_ahead:dip");
    expect(verdictText(s)).toBe("Of the next $10,000 you earn you'd keep about $8,000. At $63,000 you'd dip by about $900, and be ahead again by $65,000.");
    // Five steps wide ($41,000–$46,000) is not a dip.
    expect(verdictKey(sceneOf(makeEvaluation({}, 38_000, { careCliff: false, deferredCliff: false }), year))).toBe("cliff_ahead");
  });
  test("cliff behind and always up open with the next-stretch rate too", () => {
    const behind = sceneOf(makeEvaluation({}, 80_000), year);
    expect(verdictKey(behind)).toBe("cliff_behind");
    expect(verdictText(behind)).toBe(`Of the next $10,000 you earn you'd keep about $8,000. The worst of it is behind you — from $${behind.worst!.endEarnings.toLocaleString("en-US")} up, more pay means more money.`);
    const up = sceneOf(makeEvaluation({}, 30_000, { snapCliff: false, careCliff: false, deferredCliff: false }), year);
    expect(verdictKey(up)).toBe("always_up");
    expect(verdictText(up)).toBe("Of the next $10,000 you earn you'd keep about $8,000. Every raise leaves you better off — we checked every step up to $150,000 and nothing drops.");
    expect(againText(up)).toBeNull();
  });
  test("with less than a step of axis left there is no next stretch: the shape's own sentence stands alone", () => {
    const s = sceneOf(makeEvaluation({}, 150_000), year);
    expect(s.ev.personal.keepNext).toBeNull();
    expect(verdictText(s)).toBe("The worst of it is behind you — from $55,000 up, more pay means more money.");
  });
  test("stuck: a zone that runs off the axis names the top of the range and invents no exit", () => {
    const s = sceneOf(makeEvaluation({}, 60_500, { careCliff: false, stuckAt: 61_000 }), year);
    expect(verdictKey(s)).toBe("in_danger_zone:stuck");
    expect(verdictText(s)).toBe("More pay won't leave you better off anywhere we looked, right up to $150,000.");
    expect(againText(s)).toBeNull();
  });
  test("stuck past a drop: the drop, and that nothing on the axis gets back to the peak", () => {
    const s = sceneOf(makeEvaluation({}, 60_000, { stuckAt: 61_000 }), year);
    expect(verdictKey(s)).toBe("in_danger_zone:stuck:inside");
    expect(verdictText(s)).toBe("Your pay is past a drop at $55,000, and nowhere we looked, up to $150,000, gets you back to what you'd have kept at $54,000.");
    expect(againText(s)).toBeNull();
  });
});

describe("the person's unit (M5)", () => {
  test("hourly: every pay figure to $0.25 an hour, the leap the difference of the rounded figures, money kept yearly", () => {
    const ev = makeEvaluation({ answers: { ...makeEvaluation().answers, hoursPerWeek: 35 } }, 41_500);
    const s = sceneOf(ev, { unit: "hour", hours: "35" });
    // 41,500 / (35 × 52) = 22.80 → $22.75; 46,000 → 25.27 → $25.25; the leap is $2.50, not $4,500 / 1,820 rounded.
    expect(verdictText(s)).toBe("More pay won't leave you better off until you're past $25.25 an hour — $2.50 an hour more than you make now.");
    // Past the drop, every pay figure in the unit too; the rate is cents on the dollar in any unit.
    const inside = sceneOf(makeEvaluation({ answers: { ...makeEvaluation().answers, hoursPerWeek: 35 } }), { unit: "hour", hours: "35" });
    expect(verdictText(inside)).toBe("Your pay is past a drop at $23.00 an hour. From here to $25.25 an hour you keep about 80¢ of each extra dollar; at $25.25 an hour you're back to what you'd have kept at $22.50 an hour.");
  });
  test("monthly: to $50 a month, the unit said on every figure", () => {
    const s = sceneOf(makeEvaluation({}, 41_500), { unit: "month" });
    expect(verdictText(s)).toBe("More pay won't leave you better off until you're past $3,850 a month — $400 a month more than you make now.");
  });
  test("yearly: 'a year' is said once, on the pay", () => {
    expect(verdictText(sceneOf(makeEvaluation(), year))).not.toMatch(/\$46,000 a year/);
  });
});

test("the keyed slots follow the marks: exit and leap → the exit rule, a drop's landing pay → the cliff dot", () => {
  const keys = (s: ReturnType<typeof sceneOf>) => Object.fromEntries(verdictParts(s).flatMap((p) => ("slot" in p ? [[p.slot, p.key]] : [])));
  expect(keys(sceneOf(makeEvaluation({}, 41_500), year))).toEqual({ exit: "hg-amt hg-amt--gap", leap: "hg-amt hg-amt--gap" });
  expect(keys(sceneOf(makeEvaluation(), year))).toEqual({ wage: "hg-amt hg-amt--cliff", exit: "hg-amt hg-amt--gap", cents: null, peak: null });
  expect(keys(sceneOf(makeEvaluation({}, 38_000), year))).toEqual({ over: null, kept: null, wage: "hg-amt hg-amt--cliff", drop: null, worstAt: "hg-amt hg-amt--cliff" });
});

describe("a deferred cliff the sentence itself names (B1, M2)", () => {
  test("the cliff the sentence is about waits, so the sentence says so in four words — and stays one sentence", () => {
    // The Head Start shape: the deferred step starts at the person's pay, so it is the next cliff and its drop is the sentence's.
    const s = sceneOf(makeEvaluation({}, 71_000), year);
    expect(s.deferred[0].startEarnings).toBe(71_000);
    expect(s.next).toBe(s.deferred[0]);
    expect(verdictKey(s)).toBe("cliff_ahead:waits");
    expect(verdictText(s)).toBe("Of the next $10,000 you earn you'd keep about $5,700. Nothing drops sharply until $72,000; past it you'd lose about $1,500 a year, though not right away.");
  });
  test("a deferred cliff the sentence does NOT name adds nothing: the picture marks it and the step row carries the rule", () => {
    // $43,000 sits in a zone whose sentence names the exit; the $72,000 deferred step is above it and used to
    // append a second and third sentence here (citizen review B1). It is now a hollow dot, a dashed stub, the
    // word "later" and its money on the chart, and a badged row under "What happens at each step".
    const s = sceneOf(makeEvaluation(), year);
    expect(s.deferred.some((c) => c.startEarnings >= s.current)).toBe(true);
    expect(verdictText(s)).toBe("Your pay is past a drop at $42,000. From here to $46,000 you keep about 80¢ of each extra dollar; at $46,000 you're back to what you'd have kept at $41,000.");
  });
  test("no deferred cliff at all, no hedge", () => {
    expect(verdictText(sceneOf(makeEvaluation({}, 80_000), year))).not.toMatch(/not right away/);
    expect(verdictText(sceneOf(makeEvaluation({}, 43_000, { deferredCliff: false }), year))).not.toMatch(/not right away/);
  });
});

describe("your keep rate on the next stretch (Plan 9 § Citizen)", () => {
  test("no cliff in the stretch, kept 10¢ or more: the plain sentence, both figures from personal.keepNext", () => {
    const s = sceneOf(makeEvaluation(), year);   // current $43,000: the SNAP cliff is behind it, the care cliff at $54,000 is past the $10,000 window
    expect(s.ev.personal.keepNext).toEqual({ over: 10_000, kept: 0.8 });
    expect(s.next?.startEarnings).toBe(54_000);   // past current + over ($53,000): not named
    expect(keepNextText(s)).toBe("Of the next $10,000 you earn you'd keep about $8,000.");
  });
  test("a cliff inside the stretch is left to the sentence after it, which names it", () => {
    const s = sceneOf(makeEvaluation({}, 38_000), year);   // the SNAP cliff, $41,000 → $42,000, sits inside $38,000–$48,000
    expect(s.next?.startEarnings).toBe(41_000);
    expect(keepNextText(s)).toBe("Of the next $10,000 you earn you'd keep about $4,700.");
    expect(verdictText(s)).toMatch(/^Of the next \$10,000 you earn you'd keep about \$4,700\. Nothing drops sharply until \$42,000;/);
  });
  test("no cliff and kept under 10¢: a flat stretch, not a plain sentence — and it opens the answer", () => {
    const s = sceneOf(makeEvaluation({}, 90_000, { plateau: [90_000, 130_000] }), year);
    expect(s.next).toBeNull();
    expect(s.ev.personal.keepNext?.kept).toBeLessThan(0.10);
    expect(keepNextText(s)).toBe("Of the next $10,000 you earn you'd keep about $400 — that's a flat stretch: more pay, barely more money.");
    expect(verdictText(s).startsWith(keepNextText(s)!)).toBe(true);
  });
  test("null keepNext (less than one step of axis left) says nothing", () => {
    expect(sceneOf(makeEvaluation({}, 150_000), year).ev.personal.keepNext).toBeNull();
    expect(keepNextText(sceneOf(makeEvaluation({}, 150_000), year))).toBeNull();
  });
  test("both figures in the person's own pay unit (M5), not always annual", () => {
    const ev = makeEvaluation({ answers: { ...makeEvaluation().answers, hoursPerWeek: 35 } });
    const s = sceneOf(ev, { unit: "hour", hours: "35" });
    // $10,000 / (35 × 52) = $5.49 → $5.50 (pay-level step); $8,000 → $4.40 an hour exactly (the change step is 5¢, so no rounding up to $4.50) an hour.
    expect(keepNextText(s)).toBe("Of the next $5.50 an hour you earn you'd keep about $4.40 an hour.");
  });
});

describe("far cliffs framed by company (Plan 9 § Citizen)", () => {
  test("the existing line is unchanged when no cliff beyond the household's own zone has a position (the fixture leaves every position null)", () => {
    const s = sceneOf(makeEvaluation(), year);
    expect(s.cliffs.every((c) => c.position === null)).toBe(true);
    expect(againText(s)).toBe("Further up, between $54,000 and $74,000, there are 2 more stretches where a raise doesn't leave you better off.");
  });
  test("the first cliff at or past FAR_POSITION, from the first further zone on, adds the company clause", () => {
    const s = sceneOf(makeEvaluation({}, 43_000, { positions: { 71_000: 82 } }), year);
    expect(againText(s)).toBe("Further up, between $54,000 and $74,000, there are 2 more stretches where a raise doesn't leave you better off. Those far drops start at $71,000, and 8 in 10 families like yours earn less than that.");
  });
  test("the clause says how many earn LESS than where the far drops start — never \"10 in 10\" (policy review R12)", () => {
    const s = sceneOf(makeEvaluation({}, 43_000, { positions: { 71_000: 96 } }), year);
    expect(againText(s)).toBe("Further up, between $54,000 and $74,000, there are 2 more stretches where a raise doesn't leave you better off. Those far drops start at $71,000, and almost all families like yours earn less than that.");
  });
  test("a position short of 80 does not qualify: the clause stays off", () => {
    const s = sceneOf(makeEvaluation({}, 43_000, { positions: { 71_000: 50 } }), year);
    expect(againText(s)).toBe("Further up, between $54,000 and $74,000, there are 2 more stretches where a raise doesn't leave you better off.");
  });
  test("a cliff before the further zones does not count, even past FAR_POSITION", () => {
    const s = sceneOf(makeEvaluation({}, 43_000, { positions: { 41_000: 95 } }), year);   // the SNAP cliff, behind the household's own zone
    expect(againText(s)).toBe("Further up, between $54,000 and $74,000, there are 2 more stretches where a raise doesn't leave you better off.");
  });
});
