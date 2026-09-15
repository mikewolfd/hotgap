import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parsePEResponse } from "./parse.js";
import { escapeAnalysis } from "./escape.js";
import type { CurvePoint, ProgramId } from "./types.js";

const fixture = JSON.parse(
  readFileSync(new URL("../../fixtures/pe-ca-single-1kid-101.json", import.meta.url), "utf8"),
);
const fixturePoints = parsePEResponse(fixture, 101);

const flat = (earnings: number, netIncome: number): CurvePoint => ({
  earnings,
  netIncome,
  medicalOOP: 0,
  programs: { snap: 0, medicaid: 0, chip: 0, eitc: 0, ctc: 0, aca: 0, tanf: 0, housing: 0, wic: 0, ssi: 0, headstart: 0, schoolmeals: 0, childcare: 0 },
  childPrograms: {}, otherBenefits: 0, stateCredits: 0, totalCtc: 0, coverageGap: false,
});

describe("escapeAnalysis on the real CA fixture", () => {
  it("computes verified safe exit, leap, and program thresholds", () => {
    const esc = escapeAnalysis(fixturePoints);
    // The last danger zone is the 400%-FPL end of the ACA subsidy ($84k → $91k).
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

const ZERO = { snap: 0, medicaid: 0, chip: 0, eitc: 0, ctc: 0, aca: 0, tanf: 0, housing: 0, wic: 0, ssi: 0, headstart: 0, schoolmeals: 0, childcare: 0 };
// `programs` arrives as a sparse patch over ZERO, so it cannot be the full
// Record the CurvePoint field is.
type PointOver = Partial<Omit<CurvePoint, "programs">> & { programs?: Partial<Record<ProgramId, number>> };
const pt = (earnings: number, over: PointOver = {}): CurvePoint => ({
  ...flat(earnings, 10000 + earnings), ...over, programs: { ...ZERO, ...(over.programs ?? {}) },
});

describe("per-age program ends", () => {
  // A parent and a child on the same program at different limits — CA cuts
  // parents off at 138% FPL and children at 266% — must not average into one
  // household threshold.
  const pts = [
    pt(0, { programs: { medicaid: 18000, chip: 0 }, childPrograms: { medicaid: 7000 } }),
    pt(10000, { programs: { medicaid: 18000, chip: 0 }, childPrograms: { medicaid: 7000 } }),
    pt(20000, { programs: { medicaid: 7000, chip: 0 }, childPrograms: { medicaid: 7000 } }),
    pt(30000, { programs: { medicaid: 0, chip: 1500 }, childPrograms: { chip: 1500 } }),
    pt(40000, { programs: { medicaid: 0, chip: 0 }, childPrograms: {} }),
  ];

  it("splits the person-level programs into adults and children", () => {
    const esc = escapeAnalysis(pts);
    expect(esc.programEnds.medicaid).toBe(20000);        // the household total
    expect(esc.programEndsByAge.adults.medicaid).toBe(10000);
    expect(esc.programEndsByAge.children.medicaid).toBe(20000);
    expect(esc.programEndsByAge.adults.chip).toBeUndefined();
    expect(esc.programEndsByAge.children.chip).toBe(30000);
  });

  it("reports the last earnings at which children hold Medicaid or CHIP", () => {
    // 42 CFR 435.926 / 457.342: crossing this defers the loss to the next
    // renewal, up to 12 months out — it does not end coverage on the spot.
    expect(escapeAnalysis(pts).childCoverageEndEarnings).toBe(30000);
  });

  it("reports no child-coverage end when coverage runs past the top of the axis", () => {
    const stillCovered = pts.map((p) => ({ ...p, childPrograms: { medicaid: 7000 } }));
    expect(escapeAnalysis(stillCovered).childCoverageEndEarnings).toBeNull();
    expect(escapeAnalysis(pts.map((p) => ({ ...p, childPrograms: {} }))).childCoverageEndEarnings).toBeNull();
  });
});

describe("the child tax credit's end is the whole credit's, not the refund's", () => {
  it("reports programEnds.ctc from the total, so a credit turning nonrefundable is not a loss", () => {
    // A rising tax bill absorbs the credit: the refund stops at $30,000 while
    // the family still has all $6,600 of the credit. Reporting the refund's
    // end as "ctc ends" told them they had lost it.
    const pts = [
      pt(0, { programs: { ctc: 3000 }, totalCtc: 6600 }),
      pt(10000, { programs: { ctc: 3000 }, totalCtc: 6600 }),
      pt(20000, { programs: { ctc: 1500 }, totalCtc: 6600 }),
      pt(30000, { programs: { ctc: 0 }, totalCtc: 6600 }),
      pt(40000, { programs: { ctc: 0 }, totalCtc: 0 }),
    ];
    expect(escapeAnalysis(pts).programEnds.ctc).toBe(30000);
    // Every other program still reads its own series.
    expect(escapeAnalysis(pts).programEnds.eitc).toBeUndefined();
  });

  it("falls back to the refundable series on a curve swept before `ctc` was asked for", () => {
    const pts = [
      pt(0, { programs: { ctc: 3000 }, totalCtc: 3000 }),
      pt(10000, { programs: { ctc: 3000 }, totalCtc: 3000 }),
      pt(20000, { programs: { ctc: 0 }, totalCtc: 0 }),
    ];
    expect(escapeAnalysis(pts).programEnds.ctc).toBe(10000);
  });
});

describe("benefitsEndEarnings counts money only", () => {
  it("ignores coverage sticker values", () => {
    // Medicaid alone, worth $18k on paper, is not a dollar the family receives.
    const pts = [pt(0, { programs: { medicaid: 18000 } }), pt(10000, { programs: { medicaid: 18000 } }), pt(20000, { programs: { medicaid: 0 } })];
    expect(escapeAnalysis(pts).benefitsEndEarnings).toBeNull();
  });

  it("counts cash, credits, and the untracked remainder", () => {
    const cash = [pt(0, { programs: { snap: 3000 } }), pt(10000, { programs: { snap: 3000 } }), pt(20000, {})];
    expect(escapeAnalysis(cash).benefitsEndEarnings).toBe(10000);
    const credits = [pt(0, { programs: { eitc: 3000 } }), pt(10000, { programs: { eitc: 3000 } }), pt(20000, {})];
    expect(escapeAnalysis(credits).benefitsEndEarnings).toBe(10000);
    const untracked = [pt(0, { otherBenefits: 3000 }), pt(10000, { otherBenefits: 3000 }), pt(20000, {})];
    expect(escapeAnalysis(untracked).benefitsEndEarnings).toBe(10000);
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
      { earnings: 0, netIncome: 10000, medicalOOP: 0, programs: { snap: 500, medicaid: 0, chip: 0, eitc: 0, ctc: 0, aca: 0, tanf: 0, housing: 0, wic: 0, ssi: 0, headstart: 0, schoolmeals: 0, childcare: 0 } , childPrograms: {}, otherBenefits: 0, stateCredits: 0, totalCtc: 0, coverageGap: false },
      { earnings: 10000, netIncome: 11000, medicalOOP: 0, programs: { snap: 400, medicaid: 0, chip: 0, eitc: 0, ctc: 0, aca: 0, tanf: 0, housing: 0, wic: 0, ssi: 0, headstart: 0, schoolmeals: 0, childcare: 0 } , childPrograms: {}, otherBenefits: 0, stateCredits: 0, totalCtc: 0, coverageGap: false },
      { earnings: 20000, netIncome: 12000, medicalOOP: 0, programs: { snap: 200, medicaid: 0, chip: 0, eitc: 0, ctc: 0, aca: 0, tanf: 0, housing: 0, wic: 0, ssi: 0, headstart: 0, schoolmeals: 0, childcare: 0 } , childPrograms: {}, otherBenefits: 0, stateCredits: 0, totalCtc: 0, coverageGap: false },
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
      { earnings: 0, netIncome: 10000, medicalOOP: 0, programs: { snap: 300, tanf: 200, medicaid: 0, chip: 0, eitc: 0, ctc: 0, aca: 0, housing: 0, wic: 0, ssi: 0, headstart: 0, schoolmeals: 0, childcare: 0 } , childPrograms: {}, otherBenefits: 0, stateCredits: 0, totalCtc: 0, coverageGap: false },
      { earnings: 10000, netIncome: 11000, medicalOOP: 0, programs: { snap: 200, tanf: 200, medicaid: 0, chip: 0, eitc: 0, ctc: 0, aca: 0, housing: 0, wic: 0, ssi: 0, headstart: 0, schoolmeals: 0, childcare: 0 } , childPrograms: {}, otherBenefits: 0, stateCredits: 0, totalCtc: 0, coverageGap: false },
      { earnings: 20000, netIncome: 12000, medicalOOP: 0, programs: { snap: 150, tanf: 0, medicaid: 0, chip: 0, eitc: 0, ctc: 0, aca: 0, housing: 0, wic: 0, ssi: 0, headstart: 0, schoolmeals: 0, childcare: 0 } , childPrograms: {}, otherBenefits: 0, stateCredits: 0, totalCtc: 0, coverageGap: false },
      { earnings: 30000, netIncome: 13000, medicalOOP: 0, programs: { snap: 0, tanf: 0, medicaid: 0, chip: 0, eitc: 0, ctc: 0, aca: 0, housing: 0, wic: 0, ssi: 0, headstart: 0, schoolmeals: 0, childcare: 0 } , childPrograms: {}, otherBenefits: 0, stateCredits: 0, totalCtc: 0, coverageGap: false },
    ];
    const esc = escapeAnalysis(pts);
    expect(esc.programEnds.tanf).toBe(10000); // last point where tanf > PROGRAM_END_MIN
    expect(esc.programEnds.snap).toBe(20000); // last point where snap > PROGRAM_END_MIN
  });
});
