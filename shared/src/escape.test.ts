import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parsePEResponse } from "./parse.js";
import { escapeAnalysis, PROGRAM_END_MIN, BENEFITS_END_MIN } from "./escape.js";
import type { CurvePoint } from "./types.js";

const fixture = JSON.parse(
  readFileSync(new URL("../../fixtures/pe-ca-single-1kid-101.json", import.meta.url), "utf8"),
);
const fixturePoints = parsePEResponse(fixture, 101);

const flat = (earnings: number, netIncome: number): CurvePoint => ({
  earnings,
  netIncome,
  medicalOOP: 0,
  programs: { snap: 0, medicaid: 0, chip: 0, eitc: 0, ctc: 0, aca: 0, tanf: 0, housing: 0, wic: 0, ssi: 0, headstart: 0, schoolmeals: 0 },
});

describe("escapeAnalysis on the real CA fixture", () => {
  it("computes verified safe exit, leap, and program thresholds", () => {
    const esc = escapeAnalysis(fixturePoints);
    expect(esc.safeExitEarnings).toBe(91000);
    expect(esc.leap).toBe(45000);
    expect(esc.leapIsLowerBound).toBe(false);
    expect(esc.programEnds.tanf).toBe(23000);
    expect(esc.programEnds.snap).toBe(29000);
    expect(esc.programEnds.headstart).toBe(30000);
    expect(esc.programEnds.ctc).toBe(44000);
    expect(esc.programEnds.eitc).toBe(50000);
    expect(esc.programEnds.medicaid).toBe(57000);
    expect(esc.programEnds.aca).toBe(84000);
    // benefitsEndEarnings is null because schoolmeals continue through the sweep end
    expect(esc.benefitsEndEarnings).toBeNull();
  });
});

describe("escapeAnalysis on synthetic curves", () => {
  it("returns safeExit 0 and leap 0 for a no-zones curve", () => {
    const pts = [flat(0, 10000), flat(10000, 15000), flat(20000, 21000)];
    const esc = escapeAnalysis(pts);
    expect(esc.safeExitEarnings).toBe(0);
    expect(esc.leap).toBe(0);
    expect(esc.leapIsLowerBound).toBe(false);
  });

  it("returns safeExit null with leapIsLowerBound true for a single unrecovered zone", () => {
    // A curve with a single danger zone that doesn't recover
    const pts = [flat(0, 20000), flat(10000, 30000), flat(20000, 22000), flat(30000, 25000), flat(40000, 26000)];
    const esc = escapeAnalysis(pts);
    expect(esc.safeExitEarnings).toBeNull();
    expect(esc.leapIsLowerBound).toBe(true);
    expect(esc.leap).toBe(40000 - 10000); // axisMax - zoneStart = 40000 - 10000 = 30000
  });

  it("omits a program from programEnds if it is still received at the last point", () => {
    // A program that ends at the last point should be omitted
    const pts = [
      { earnings: 0, netIncome: 10000, medicalOOP: 0, programs: { snap: 500, medicaid: 0, chip: 0, eitc: 0, ctc: 0, aca: 0, tanf: 0, housing: 0, wic: 0, ssi: 0, headstart: 0, schoolmeals: 0 } },
      { earnings: 10000, netIncome: 11000, medicalOOP: 0, programs: { snap: 400, medicaid: 0, chip: 0, eitc: 0, ctc: 0, aca: 0, tanf: 0, housing: 0, wic: 0, ssi: 0, headstart: 0, schoolmeals: 0 } },
      { earnings: 20000, netIncome: 12000, medicalOOP: 0, programs: { snap: 200, medicaid: 0, chip: 0, eitc: 0, ctc: 0, aca: 0, tanf: 0, housing: 0, wic: 0, ssi: 0, headstart: 0, schoolmeals: 0 } },
    ];
    const esc = escapeAnalysis(pts);
    // snap is still received at 20000 (last point), so should not appear in programEnds
    expect(esc.programEnds.snap).toBeUndefined();
  });

  it("returns benefitsEndEarnings null for an all-zero programs curve", () => {
    // A curve where all programs are zero throughout
    const pts = [flat(0, 10000), flat(10000, 15000), flat(20000, 21000)];
    const esc = escapeAnalysis(pts);
    expect(esc.benefitsEndEarnings).toBeNull();
  });

  it("correctly identifies when multiple programs have different end points", () => {
    // Create a curve with two programs that end at different points
    const pts = [
      { earnings: 0, netIncome: 10000, medicalOOP: 0, programs: { snap: 300, tanf: 200, medicaid: 0, chip: 0, eitc: 0, ctc: 0, aca: 0, housing: 0, wic: 0, ssi: 0, headstart: 0, schoolmeals: 0 } },
      { earnings: 10000, netIncome: 11000, medicalOOP: 0, programs: { snap: 200, tanf: 200, medicaid: 0, chip: 0, eitc: 0, ctc: 0, aca: 0, housing: 0, wic: 0, ssi: 0, headstart: 0, schoolmeals: 0 } },
      { earnings: 20000, netIncome: 12000, medicalOOP: 0, programs: { snap: 150, tanf: 0, medicaid: 0, chip: 0, eitc: 0, ctc: 0, aca: 0, housing: 0, wic: 0, ssi: 0, headstart: 0, schoolmeals: 0 } },
      { earnings: 30000, netIncome: 13000, medicalOOP: 0, programs: { snap: 0, tanf: 0, medicaid: 0, chip: 0, eitc: 0, ctc: 0, aca: 0, housing: 0, wic: 0, ssi: 0, headstart: 0, schoolmeals: 0 } },
    ];
    const esc = escapeAnalysis(pts);
    expect(esc.programEnds.tanf).toBe(10000); // last point where tanf > PROGRAM_END_MIN
    expect(esc.programEnds.snap).toBe(20000); // last point where snap > PROGRAM_END_MIN
  });
});
