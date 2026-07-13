import { describe, it, expect } from "vitest";
import { makeChartLabels, minWageLineFor } from "./chartLabels.js";

describe("makeChartLabels.cardHours", () => {
  it("translates a low drop into 'hours a week at minimum wage in <state>'", () => {
    // $6k/yr at Texas's $7.25 floor ≈ 15.9 → 16 hours a week.
    expect(makeChartLabels("TX").cardHours!(6000)).toBe(
      "That is about 16 hours a week at minimum wage in Texas.",
    );
  });

  it("uses the singular '1 hour' form for a tiny drop", () => {
    // ~$400/yr rounds to 1 hour a week; must not read "1 hours".
    expect(makeChartLabels("TX").cardHours!(400)).toBe(
      "That is about 1 hour a week at minimum wage in Texas.",
    );
  });

  it("still shows exactly at full-time minimum (the 'at or below' boundary)", () => {
    // $15,080 == full-time at $7.25 → 40 hours a week, shown (not null).
    expect(makeChartLabels("TX").cardHours!(15080)).toBe(
      "That is about 40 hours a week at minimum wage in Texas.",
    );
  });

  it("returns null above full-time minimum, where an hours count is nonsensical", () => {
    // $50k > full-time at $7.25 ($15,080) → no line. One dollar past the boundary
    // ($15,081) is likewise hidden.
    expect(makeChartLabels("TX").cardHours!(50000)).toBeNull();
    expect(makeChartLabels("TX").cardHours!(15081)).toBeNull();
  });

  it("returns null for a state with no wage on record", () => {
    expect(makeChartLabels("ZZ").cardHours!(6000)).toBeNull();
  });
});

describe("minWageLineFor", () => {
  it("builds a full-time-minimum reference line naming the wage and the yearly figure", () => {
    const line = minWageLineFor("TX")!;
    expect(line.earnings).toBe(15080);
    expect(line.label).toBe(
      "The dashed line is full-time at minimum wage ($7.25 an hour). That is about $15,100 a year.",
    );
  });

  it("uses the state's own wage (California $16.90)", () => {
    const line = minWageLineFor("CA")!;
    expect(line.label).toContain("$16.90 an hour");
    expect(line.label).toContain("$35,200 a year");
  });

  it("returns undefined for a state with no wage on record", () => {
    expect(minWageLineFor("ZZ")).toBeUndefined();
  });
});
