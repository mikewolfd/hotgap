import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parsePEResponse, type CurvePoint } from "@hotgap/shared";
import { stateMetrics } from "./metrics.js";

const fixture = JSON.parse(
  readFileSync(new URL("../../fixtures/pe-ca-single-1kid-101.json", import.meta.url), "utf8"),
);
const fixturePoints = parsePEResponse(fixture, 101);

const flat = (earnings: number, netIncome: number): CurvePoint => ({
  earnings, netIncome, programs: { snap: 0, medicaid: 0, chip: 0, eitc: 0, ctc: 0, aca: 0, tanf: 0, housing: 0, wic: 0, ssi: 0, headstart: 0, schoolmeals: 0 },
});

describe("stateMetrics on the committed CA fixture", () => {
  // Pinned in the plan: the CA single-parent-one-kid fixture's biggest single
  // drop rounds to $21,957, with at least two cliffs and a nonzero danger
  // width. This fixture isn't one of the 8 archetypes — it only pins the math.
  it("computes biggestLoss, cliffCount, and dangerWidth", () => {
    const m = stateMetrics(fixturePoints);
    expect(m.biggestLoss).toBe(21957);
    expect(m.cliffCount).toBeGreaterThanOrEqual(2);
    expect(m.dangerWidth).toBeGreaterThan(0);
  });
});

describe("stateMetrics on synthetic curves", () => {
  it("reports zero loss and zero danger width for a monotonic curve", () => {
    const pts = [flat(0, 10000), flat(50000, 15000), flat(100000, 21000)];
    expect(stateMetrics(pts)).toEqual({ biggestLoss: 0, dangerWidth: 0, cliffCount: 0 });
  });

  it("measures dangerWidth to the axis max when the zone never recovers", () => {
    const pts = [flat(0, 20000), flat(50000, 30000), flat(100000, 22000)];
    const m = stateMetrics(pts);
    expect(m.biggestLoss).toBe(8000);
    expect(m.cliffCount).toBe(1);
    expect(m.dangerWidth).toBe(50000); // from the $50k peak to the $100k axis end
  });
});
