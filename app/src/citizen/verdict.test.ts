// The AnswerSentence: one shape per verdict, the honest stuck branch, every
// pay figure in the person's unit, the keyed slots (design/inventory.md M2, M5).
import { describe, expect, test } from "vitest";
import { makeEvaluation } from "./fixture.js";
import { sceneOf } from "./model.js";
import { againText, keepNextText, verdictKey, verdictParts, verdictText } from "./verdict.js";

const year = { unit: "year" };

describe("verdict shapes", () => {
  test("in a zone: exit and leap from personal, not the whole-curve escape", () => {
    const s = sceneOf(makeEvaluation(), year);
    expect(verdictKey(s)).toBe("in_danger_zone");
    expect(verdictText(s)).toBe("You are paid $43,000 a year. You keep $51,100. More pay does not add to that until you are paid $46,000: a raise of $3,000. At $72,000, your kids' free state health plan stops: about $1,500 a year. But not that day. Kids keep it to their next yearly check, up to 12 months later.");
    // The whole curve's safe exit is $74,000 (the deferred $72k step counts since 2026-09-17 and opens the last zone;
    // it was $67,000 with that step lifted out); the sentence names the household's own $46,000 and says where it
    // happens again — from the NEXT zone's start ($54,000), read off dangerZones, never assumed to abut the exit.
    expect(s.safeExit).toBe(74_000);
    expect(s.otherZones.map((z) => z.startEarnings)).toEqual([54_000, 71_000]);
    expect(againText(s)).toBe("It happens 2 more times, between $54,000 and $74,000.");
  });
  test("cliff ahead: the threshold is the step's landing point, the drop about-rounded", () => {
    const s = sceneOf(makeEvaluation({}, 38_000), year);
    expect(verdictText(s)).toMatch(/^You are paid \$38,000 a year\. You keep \$50,400\. Near \$42,000, more pay can mean less money: past it you would keep about \$2,500 less a year\. People call this a benefits cliff\. At \$72,000,/);
    expect(againText(s)).toBeNull();
  });
  test("cliff behind and always up", () => {
    expect(verdictText(sceneOf(makeEvaluation({}, 80_000), year))).toMatch(/^You are paid \$80,000 a year\. You keep \$68,600\. The big drop is below your pay now\./);
    const up = sceneOf(makeEvaluation({}, 30_000, { snapCliff: false, careCliff: false, deferredCliff: false }), year);
    expect(verdictKey(up)).toBe("always_up");
    expect(verdictText(up)).toMatch(/When you earn more, you keep more\./);
    expect(againText(up)).toBeNull();
  });
  test("stuck: a zone that runs off the axis names the top of the range and invents no exit", () => {
    const s = sceneOf(makeEvaluation({}, 60_000, { stuckAt: 61_000 }), year);
    expect(verdictKey(s)).toBe("in_danger_zone:stuck");
    expect(verdictText(s)).toMatch(/^You are paid \$60,000 a year\. You keep \$54,900\. More pay does not add to that in the pay range we checked, up to \$150,000\. We did not find a spot where you come out ahead again\./);
    expect(againText(s)).toBeNull();
  });
});

describe("the person's unit (M5)", () => {
  test("hourly: every pay figure to $0.25 an hour, the leap the difference of the rounded figures, money kept yearly", () => {
    const ev = makeEvaluation({ answers: { ...makeEvaluation().answers, hoursPerWeek: 35 } });
    const s = sceneOf(ev, { unit: "hour", hours: "35" });
    // 43,000 / (35 × 52) = 23.63 → $23.75; 46,000 → 25.27 → $25.25; the leap is $1.50, not $3,000 / 1,820 rounded.
    expect(verdictText(s)).toMatch(/^You are paid \$23\.75 an hour\. You keep \$51,100\. More pay does not add to that until you are paid \$25\.25 an hour: a raise of \$1\.50 an hour\. At \$39\.50 an hour,/);
  });
  test("monthly: to $50 a month, the unit said on every figure", () => {
    const s = sceneOf(makeEvaluation(), { unit: "month" });
    expect(verdictText(s)).toMatch(/^You are paid \$3,600 a month\. You keep \$51,100\. More pay does not add to that until you are paid \$3,850 a month: a raise of \$250 a month\. At \$6,000 a month,/);
  });
  test("yearly: 'a year' is said once, on the pay", () => {
    expect(verdictText(sceneOf(makeEvaluation(), year))).not.toMatch(/\$46,000 a year/);
  });
});

test("the keyed slots follow the marks: kept → the line, exit and leap → the exit rule, wage → the cliff dot", () => {
  const keys = (s: ReturnType<typeof sceneOf>) => Object.fromEntries(verdictParts(s).flatMap((p) => ("slot" in p ? [[p.slot, p.key]] : [])));
  expect(keys(sceneOf(makeEvaluation(), year))).toEqual({ pay: "amt", kept: "amt amt-keep", exit: "amt amt-gap", leap: "amt amt-gap", at: "amt", phrase: null, drop: null });
  expect(keys(sceneOf(makeEvaluation({}, 38_000), year))).toEqual({ pay: "amt", kept: "amt amt-keep", wage: "amt amt-cliff", drop: null, at: "amt", phrase: null });
});

describe("the timing clause (B1, M2)", () => {
  test("a deferred loss at the person's own pay is in the answer's figures and its clause says when it lands", () => {
    // The Head Start shape: the deferred step starts at the person's pay, so it is the next cliff and its drop is the sentence's.
    const s = sceneOf(makeEvaluation({}, 71_000), year);
    expect(s.deferred[0].startEarnings).toBe(71_000);
    expect(s.next).toBe(s.deferred[0]);
    expect(verdictText(s)).toBe("You are paid $71,000 a year. You keep $63,700. Near $72,000, more pay can mean less money: past it you would keep about $1,500 less a year. People call this a benefits cliff. At $72,000, your kids' free state health plan stops: about $1,500 a year. But not that day. Kids keep it to their next yearly check, up to 12 months later.");
  });
  test("no deferred cliff at or above the pay, no clause", () => {
    expect(verdictText(sceneOf(makeEvaluation({}, 80_000), year))).not.toMatch(/But not that day/);
    expect(verdictText(sceneOf(makeEvaluation({}, 43_000, { deferredCliff: false }), year))).not.toMatch(/But not that day/);
  });
});

describe("your keep rate on the next stretch (Plan 9 § Citizen)", () => {
  test("no cliff in the stretch, kept 10¢ or more: the plain sentence, both figures from personal.keepNext", () => {
    const s = sceneOf(makeEvaluation(), year);   // current $43,000: the SNAP cliff is behind it, the care cliff at $54,000 is past the $10,000 window
    expect(s.ev.personal.keepNext).toEqual({ over: 10_000, kept: 0.8 });
    expect(s.next?.startEarnings).toBe(54_000);   // past current + over ($53,000): not named
    expect(keepNextText(s)).toBe("Of the next $10,000 you earn, you keep about $8,000.");
  });
  test("a cliff inside the stretch is named at the pay it ends, in the existing program phrase, whatever the kept rate", () => {
    const s = sceneOf(makeEvaluation({}, 38_000), year);   // the SNAP cliff, $41,000 → $42,000, sits inside $38,000–$48,000
    expect(s.next?.startEarnings).toBe(41_000);
    expect(keepNextText(s)).toBe("Of the next $10,000 you earn, you keep about $4,700, because food help ends at $42,000.");
  });
  test("no cliff and kept under 10¢: a flat stretch, not a plain sentence", () => {
    const s = sceneOf(makeEvaluation({}, 90_000, { plateau: [90_000, 130_000] }), year);
    expect(s.next).toBeNull();
    expect(s.ev.personal.keepNext?.kept).toBeLessThan(0.10);
    expect(keepNextText(s)).toBe("Of the next $10,000 you earn, you keep about $400. That is a flat stretch: more pay, little more money.");
  });
  test("null keepNext (less than one step of axis left) says nothing", () => {
    expect(sceneOf(makeEvaluation({}, 150_000), year).ev.personal.keepNext).toBeNull();
    expect(keepNextText(sceneOf(makeEvaluation({}, 150_000), year))).toBeNull();
  });
  test("both figures in the person's own pay unit (M5), not always annual", () => {
    const ev = makeEvaluation({ answers: { ...makeEvaluation().answers, hoursPerWeek: 35 } });
    const s = sceneOf(ev, { unit: "hour", hours: "35" });
    // $10,000 / (35 × 52) = $5.49 → $5.50 (pay-level step); $8,000 → $4.40 an hour exactly (the change step is 5¢, so no rounding up to $4.50) an hour.
    expect(keepNextText(s)).toBe("Of the next $5.50 an hour you earn, you keep about $4.40 an hour.");
  });
});

describe("far cliffs framed by company (Plan 9 § Citizen)", () => {
  test("the existing line is unchanged when no cliff beyond the household's own zone has a position (the fixture leaves every position null)", () => {
    const s = sceneOf(makeEvaluation(), year);
    expect(s.cliffs.every((c) => c.position === null)).toBe(true);
    expect(againText(s)).toBe("It happens 2 more times, between $54,000 and $74,000.");
  });
  test("the first cliff at or past FAR_POSITION, from the first further zone on, adds the company clause", () => {
    const s = sceneOf(makeEvaluation({}, 43_000, { positions: { 71_000: 82 } }), year);
    expect(againText(s)).toBe("It happens 2 more times, between $54,000 and $74,000. The ones past $71,000 are beyond what 8 in 10 families like yours earn.");
  });
  test("a position short of 80 does not qualify: the clause stays off", () => {
    const s = sceneOf(makeEvaluation({}, 43_000, { positions: { 71_000: 50 } }), year);
    expect(againText(s)).toBe("It happens 2 more times, between $54,000 and $74,000.");
  });
  test("a cliff before the further zones does not count, even past FAR_POSITION", () => {
    const s = sceneOf(makeEvaluation({}, 43_000, { positions: { 41_000: 95 } }), year);   // the SNAP cliff, behind the household's own zone
    expect(againText(s)).toBe("It happens 2 more times, between $54,000 and $74,000.");
  });
});
