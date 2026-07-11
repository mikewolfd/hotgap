import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parsePEResponse, analyzeCurve } from "@hotgap/shared";
import { narrate, formatWage, formatDollars } from "./narration.js";

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
