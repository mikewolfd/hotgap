import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parsePEResponse, analyzeCurve, type CurvePoint, type ProgramId } from "@hotgap/shared";
import { narrate, formatWage, formatDollars, formatAgeList } from "./narration.js";

const ZERO_PROGRAMS: Record<ProgramId, number> = {
  snap: 0, medicaid: 0, chip: 0, eitc: 0, ctc: 0, aca: 0,
  tanf: 0, housing: 0, wic: 0, ssi: 0, headstart: 0, schoolmeals: 0,
};
function pt(earnings: number, netIncome: number): CurvePoint {
  return { earnings, netIncome, programs: { ...ZERO_PROGRAMS } };
}

const fixture = JSON.parse(
  readFileSync(new URL("../../../fixtures/pe-ca-single-1kid-101.json", import.meta.url), "utf8"),
);
const points = parsePEResponse(fixture, 101);

describe("formatWage", () => {
  it("formats each unit with rounding", () => {
    expect(formatWage(41600, { unit: "hour", hoursPerWeek: 40 })).toBe("$20 an hour");
    expect(formatWage(40560, { unit: "hour", hoursPerWeek: 40 })).toBe("$19.50 an hour");
    expect(formatWage(36000, { unit: "month" })).toBe("$3,000 a month");
    expect(formatWage(36200, { unit: "year" })).toBe("$36,000 a year");
  });
});

describe("formatDollars", () => {
  it("rounds to the nearest hundred", () => {
    expect(formatDollars(21956.57)).toBe("$22,000");
  });
});

// Finding 5: the places-door kids stepper must surface each archetype's
// actual child ages (derived from ARCHETYPES), not just a bare kid count.
describe("formatAgeList", () => {
  it("returns an empty string for no ages", () => {
    expect(formatAgeList([])).toBe("");
  });
  it("returns a single age as-is", () => {
    expect(formatAgeList([3])).toBe("3");
  });
  it("joins two ages with 'and'", () => {
    expect(formatAgeList([3, 7])).toBe("3 and 7");
  });
  it("joins three or more ages with commas and a trailing 'and'", () => {
    expect(formatAgeList([1, 4, 9])).toBe("1, 4, and 9");
  });
});

// ADAPTATION (see task-10-report.md for full justification): the brief's draft
// used currentEarnings=20000 and assumed `analysis.nextCliff` would be the big
// $30k Head Start cliff (drop ~$21,956.57 -> the exact number the formatDollars
// test above already uses). On the real fixture that assumption is false: at
// $20k there is a SMALLER, earlier cliff at $23k->$24k (TANF phases out,
// drop ~$1,660.88), and `nextCliff` picks the FIRST cliff at/after current
// earnings, not the worst one. That smaller cliff also opens a danger zone
// spanning $23k-$28k. So we use currentEarnings=29000: past the TANF cliff's
// recovery zone (verdict is not "in_danger_zone"), and still before the $30k
// cliff, so `nextCliff` is genuinely the Head Start/EITC/ACA cliff at $30k --
// matching the exact scenario ($14.50/hr, ~$22,000 drop) the brief intended.
describe("narrate on the CA fixture at $29k (real next cliff: $30k Head Start)", () => {
  const n = narrate(analyzeCurve(points, 29000), { unit: "hour", hoursPerWeek: 40 });
  it("picks the cliff_ahead headline with the cliff wage", () => {
    expect(n.headline).toContain("Watch out");
    expect(n.headline).toContain("$14.50 an hour"); // 30000/(40*52) = 14.42 -> 14.50
  });
  it("mentions the size of the drop in the body", () => {
    expect(n.body).toContain("$22,000");
  });
  it("lists Head Start among the why-items with a lostNear wage", () => {
    const headstart = n.whyItems.find((w) => w.programLabel.includes("Head Start"));
    expect(headstart).toBeDefined();
    expect(headstart!.lostNear).toContain("$14.50 an hour");
  });
  it("lists Medicaid as a current-value why-item with no lostNear (it phases out earlier, without a net-income cliff)", () => {
    const med = n.whyItems.find((w) => w.programLabel.includes("Medicaid"));
    expect(med).toBeDefined();
    expect(med!.lostNear).toBeNull();
    expect(med!.currentValue).not.toBe("$0");
  });
  it("caps why-items at 5", () => {
    expect(n.whyItems.length).toBeLessThanOrEqual(5);
  });
});

// Documents the true behavior at $20k (see adaptation note above): the
// nearer, smaller TANF cliff is what actually routes the headline here.
describe("narrate on the CA fixture at $20k (real next cliff: the smaller $23k TANF cliff)", () => {
  const n = narrate(analyzeCurve(points, 20000), { unit: "hour", hoursPerWeek: 40 });
  it("routes the headline to the nearer $23k cliff, not the bigger $30k one", () => {
    expect(n.headline).toContain("Watch out");
    expect(n.headline).toContain("$11 an hour"); // 23000/(40*52) = 11.06 -> 11.00
  });
});

describe("narrate verdict routing", () => {
  it("uses always_up strings when there are no cliffs", () => {
    const flat = points.map((p, i) => ({ ...p, netIncome: 10000 + i * 500 }));
    const n = narrate(analyzeCurve(flat, 20000), { unit: "year" });
    expect(n.headline).toContain("Good news");
  });
});

// Finding 4: an in_danger_zone verdict with no escapeEarnings means the sweep
// never found a spot where net income recovers. The body must not claim a
// recovery ("once pay gets past X, earning more helps again") in that case.
describe("narrate on a synthetic danger zone that DOES recover", () => {
  const syntheticPoints = [pt(0, 10000), pt(10000, 15000), pt(20000, 14500), pt(30000, 15200)];
  const analysis = analyzeCurve(syntheticPoints, 20000);
  it("is in_danger_zone with a non-null escapeEarnings", () => {
    expect(analysis.verdict).toBe("in_danger_zone");
    expect(analysis.escapeEarnings).toBe(30000);
  });
  it("names the wage where the sweep found recovery", () => {
    const n = narrate(analysis, { unit: "year" });
    expect(n.headline).toContain("tough spot");
    expect(n.body).toContain("$30,000 a year");
  });
});

describe("narrate on a synthetic danger zone that NEVER recovers", () => {
  const syntheticPoints = [pt(0, 10000), pt(10000, 15000), pt(20000, 14500), pt(30000, 14200)];
  const analysis = analyzeCurve(syntheticPoints, 20000);
  it("is in_danger_zone with a null escapeEarnings", () => {
    expect(analysis.verdict).toBe("in_danger_zone");
    expect(analysis.escapeEarnings).toBeNull();
  });
  it("uses the honest 'stuck' body instead of asserting a recovery the data never showed", () => {
    const n = narrate(analysis, { unit: "year" });
    expect(n.headline).toContain("tough spot");
    expect(n.body).toContain("come out ahead again");
    expect(n.body).not.toContain("helps again");
    expect(n.body).not.toContain("past");
  });
});

// Finding 4 also touches cliff_behind indirectly (both are "good news"
// verdicts that must stay distinguishable): confirm the headline text.
describe("narrate on a synthetic curve where the only cliff is behind current earnings", () => {
  const syntheticPoints = [pt(0, 10000), pt(10000, 8000), pt(20000, 15000), pt(30000, 16000)];
  const analysis = analyzeCurve(syntheticPoints, 25000);
  it("is cliff_behind", () => {
    expect(analysis.verdict).toBe("cliff_behind");
  });
  it('uses the "Good news from here on." headline', () => {
    const n = narrate(analysis, { unit: "year" });
    expect(n.headline).toBe("Good news from here on.");
  });
});
