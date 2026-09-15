import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parsePEResponse } from "./parse.js";
import { analyzeCurve } from "./analyze.js";
import type { CurvePoint, ProgramId } from "./types.js";

const fixture = JSON.parse(
  readFileSync(new URL("../../fixtures/pe-ca-single-1kid-101.json", import.meta.url), "utf8"),
);
const fixturePoints = parsePEResponse(fixture, 101);

const flat = (earnings: number, netIncome: number): CurvePoint => ({
  earnings, netIncome, medicalOOP: 0,
  programs: { snap: 0, medicaid: 0, chip: 0, eitc: 0, ctc: 0, aca: 0, tanf: 0, housing: 0, wic: 0, ssi: 0, headstart: 0, schoolmeals: 0 },
  childPrograms: {}, otherBenefits: 0, coverageGap: false,
});

describe("analyzeCurve on synthetic curves", () => {
  it("finds no cliffs on a monotonic curve", () => {
    const pts = [flat(0, 10000), flat(10000, 15000), flat(20000, 21000)];
    const a = analyzeCurve(pts, 5000);
    expect(a.cliffs).toHaveLength(0);
    expect(a.dangerZones).toHaveLength(0);
    expect(a.verdict).toBe("always_up");
  });

  it("detects a cliff, its danger zone, and recovery point", () => {
    const pts = [flat(0, 20000), flat(10000, 30000), flat(20000, 22000), flat(30000, 28000), flat(40000, 34000)];
    const a = analyzeCurve(pts, 5000);
    expect(a.cliffs).toHaveLength(1);
    expect(a.cliffs[0]).toMatchObject({ startEarnings: 10000, endEarnings: 20000, drop: 8000 });
    expect(a.dangerZones).toHaveLength(1);
    expect(a.dangerZones[0].startEarnings).toBe(10000);
    expect(a.dangerZones[0].endEarnings).toBe(40000); // first point with net > 30000
    expect(a.verdict).toBe("cliff_ahead");
    expect(a.nextCliff?.startEarnings).toBe(10000);
  });

  it("reports in_danger_zone with escape earnings when current sits underwater", () => {
    const pts = [flat(0, 20000), flat(10000, 30000), flat(20000, 22000), flat(30000, 28000), flat(40000, 34000)];
    const a = analyzeCurve(pts, 25000);
    expect(a.verdict).toBe("in_danger_zone");
    expect(a.escapeEarnings).toBe(40000);
  });

  it("reports cliff_behind when all cliffs are below current earnings", () => {
    const pts = [flat(0, 20000), flat(10000, 30000), flat(20000, 22000), flat(30000, 40000), flat(40000, 46000)];
    const a = analyzeCurve(pts, 35000);
    expect(a.verdict).toBe("cliff_behind");
  });

  it("interpolates currentNet linearly between points", () => {
    const pts = [flat(0, 0), flat(10000, 10000)];
    expect(analyzeCurve(pts, 5000).currentNet).toBe(5000);
  });

  it("reports in_danger_zone for cumulative erosion even when no single step is a cliff", () => {
    // Each step drops < CLIFF_MIN (no cliffs), but the cumulative drop from the
    // running max exceeds CLIFF_MIN, opening a zone that never recovers.
    const pts = [flat(0, 30000), flat(10000, 29900), flat(20000, 29850), flat(30000, 29750), flat(40000, 29600)];
    const a = analyzeCurve(pts, 25000);
    expect(a.cliffs).toHaveLength(0);
    expect(a.verdict).toBe("in_danger_zone");
  });
});

const ZERO = { snap: 0, medicaid: 0, chip: 0, eitc: 0, ctc: 0, aca: 0, tanf: 0, housing: 0, wic: 0, ssi: 0, headstart: 0, schoolmeals: 0 };
// `programs` arrives as a sparse patch over ZERO, so it cannot be the full
// Record the CurvePoint field is.
type PointOver = Partial<Omit<CurvePoint, "programs">> & { programs?: Partial<Record<ProgramId, number>> };
const pt = (earnings: number, netIncome: number, over: PointOver = {}): CurvePoint => ({
  ...flat(earnings, netIncome), ...over, programs: { ...ZERO, ...(over.programs ?? {}) },
});

describe("cliff attribution", () => {
  it("splits a drop into benefits, credits, premiums and other, summing to the drop", () => {
    const pts = [
      pt(10000, 30000, { programs: { snap: 3000, eitc: 2000 }, otherBenefits: 500, medicalOOP: 0 }),
      pt(11000, 24000, { programs: { snap: 0, eitc: 1000 }, otherBenefits: 0, medicalOOP: 1200 }),
    ];
    const [c] = analyzeCurve(pts, 0).cliffs;
    expect(c.drop).toBe(6000);
    expect(c.breakdown.benefits).toBe(3500);   // snap 3000 + untracked remainder 500
    expect(c.breakdown.credits).toBe(1000);    // eitc 2000 -> 1000
    expect(c.breakdown.premiums).toBe(1200);
    // The residual absorbs taxes and the step's own wage gain, so the four
    // shares always add back to the drop exactly.
    const { benefits, credits, premiums, other } = c.breakdown;
    expect(benefits + credits + premiums + other).toBeCloseTo(c.drop, 9);
    expect(other).toBe(300);
  });

  it("keeps coverage sticker values out of the breakdown while still naming the loss", () => {
    // A child ages off Medicaid: a real event worth reporting, but the sticker
    // value is not cash and is not inside netIncome, so it explains no dollars.
    const pts = [
      pt(10000, 30000, { programs: { medicaid: 12000, snap: 1000 } }),
      pt(11000, 29000, { programs: { medicaid: 0, snap: 0 } }),
    ];
    const [c] = analyzeCurve(pts, 0).cliffs;
    expect(c.programsLost).toContain("medicaid");
    expect(c.breakdown.benefits).toBe(1000);
    expect(c.breakdown.credits).toBe(0);
    expect(c.breakdown.benefits + c.breakdown.credits + c.breakdown.premiums + c.breakdown.other).toBeCloseTo(c.drop, 9);
  });

  it("names a program lost only at a notch, never on a phase-down", () => {
    const pts = [
      pt(10000, 30000, { programs: { snap: 3000, eitc: 2000, tanf: 2000, wic: 50 } }),
      pt(11000, 25000, { programs: { snap: 2400, eitc: 0, tanf: 900, wic: 0 } }),
    ];
    const [c] = analyzeCurve(pts, 0).cliffs;
    // snap tapered 20% — not a loss. eitc switched off, tanf lost more than
    // half. wic never cleared PROGRAM_END_MIN, so its going to 0 is nothing.
    expect(c.programsLost).toEqual(["eitc", "tanf"]);
  });

  it("reports a zero breakdown when a drop is all tax and wage effects", () => {
    const pts = [pt(10000, 30000), pt(11000, 29000)];
    const [c] = analyzeCurve(pts, 0).cliffs;
    expect(c.breakdown).toEqual({ benefits: 0, credits: 0, premiums: 0, other: 1000 });
    expect(c.programsLost).toEqual([]);
  });
});

describe("analyzeCurve on the real CA fixture", () => {
  it("finds the verified $22k Head Start cliff at $30k earnings", () => {
    const a = analyzeCurve(fixturePoints, 20000);
    expect(a.worstCliff).not.toBeNull();
    expect(a.worstCliff!.startEarnings).toBe(30000);
    expect(a.worstCliff!.drop).toBeGreaterThan(20000);
    expect(a.worstCliff!.programsLost).toContain("headstart");
    expect(a.verdict).toBe("cliff_ahead");
  });
});
