// The AnswerSentence: one shape per verdict, the honest stuck branch, every
// pay figure in the person's unit, the keyed slots (design/inventory.md M2, M5).
import { describe, expect, test } from "vitest";
import { makeEvaluation } from "./fixture.js";
import { sceneOf } from "./model.js";
import { againText, verdictKey, verdictParts, verdictText } from "./verdict.js";

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
