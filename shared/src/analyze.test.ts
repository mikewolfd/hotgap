import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parsePEResponse } from "./parse.js";
import { analyzeCurve } from "./analyze.js";
import type { CurvePoint } from "./types.js";

const fixture = JSON.parse(
  readFileSync(new URL("../../fixtures/pe-ca-single-1kid-101.json", import.meta.url), "utf8"),
);
const fixturePoints = parsePEResponse(fixture, 101);

const flat = (earnings: number, netIncome: number): CurvePoint => ({
  earnings, netIncome, programs: { snap: 0, medicaid: 0, chip: 0, eitc: 0, ctc: 0, aca: 0, tanf: 0, housing: 0, wic: 0, ssi: 0 },
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
});

describe("analyzeCurve on the real CA fixture", () => {
  it("finds the verified $22k cliff at $30k earnings", () => {
    const a = analyzeCurve(fixturePoints, 20000);
    expect(a.worstCliff).not.toBeNull();
    expect(a.worstCliff!.startEarnings).toBe(30000);
    expect(a.worstCliff!.drop).toBeGreaterThan(20000);
    expect(a.worstCliff!.programsLost.length).toBeGreaterThan(0);
    expect(a.verdict).toBe("cliff_ahead");
  });
});
