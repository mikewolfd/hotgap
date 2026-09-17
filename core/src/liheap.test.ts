import { describe, it, expect } from "vitest";
import { heatingLimitFor, LIHEAP_TABLE, LIHEAP_VINTAGE, liheapBoundary, liheapLimitDollars, liheapRow, smiLimit, smiProvenance, type LiheapLimit } from "./liheap.js";
import { fpl2025 } from "./policyYear.js";
import { STATE_CODES } from "./states.js";
import { answersWith, point } from "./testing.js";
import { YEAR, type CurveResponse } from "./types.js";

/** Every percentage a limit can carry, as (base, pct) pairs. */
const pctsOf = (l: LiheapLimit): [string, number][] => (l.kind === "smi-by-size" ? l.pct.map((p): [string, number] => ["smi", p]) : [[l.kind, l.pct]]);

/** A flat curve from $0 to `top` in $1,000 steps. */
const curveTo = (top: number): CurveResponse => ({ year: YEAR, currentEarnings: 0, points: Array.from({ length: top / 1000 + 1 }, (_, i) => point(i * 1000, 20000)) });

describe("LIHEAP table — every state, every row sourced", () => {
  it("has 51 rows, one per state, each with its three publishers and the date read", () => {
    expect(LIHEAP_TABLE.map((r) => r.state).sort()).toEqual([...STATE_CODES].sort());
    for (const r of LIHEAP_TABLE) {
      expect(r.sources.limits, r.state).toBe("https://liheapch.acf.gov/delivery/income_eligibility.htm");
      expect(r.sources.amounts, r.state).toMatch(/^https:\/\/liheapch\.acf\.gov\//);
      if (r.sources.served !== null) expect(r.sources.served, r.state).toMatch(/^https:\/\/liheappm\.acf\.gov\/.*FY2024_.*_Profile\.pdf$/);
      expect(r.readOn, r.state).toBe("2026-09-16");
      expect(r.heating.note.length, r.state).toBeGreaterThan(40);
      // The vintages a surface prints are the ones in the rows' own source URLs: the profiles' year, the matrices' fiscal year.
      if (r.sources.served !== null) expect(r.sources.served, r.state).toContain(`/profiles/${LIHEAP_VINTAGE.served.slice(2)}/${LIHEAP_VINTAGE.served}_`);
      if (r.sources.amounts?.includes("/benefits-matricies/")) expect(r.sources.amounts, r.state).toContain(`/docs/${LIHEAP_VINTAGE.limits.slice(2)}/`);
    }
  });

  it("keeps every limit inside the statute: at least 110% FPG, at most the greater of 150% FPG and 60% SMI", () => {
    for (const r of LIHEAP_TABLE) {
      const limits = [r.heating.limit, ...(r.heating.sizeRules ?? []).map((s) => s.limit), r.cooling, r.crisis].filter((l): l is LiheapLimit => l !== null);
      for (const l of limits) for (const [base, pct] of pctsOf(l)) {
        if (base === "fpg") { expect(pct, r.state).toBeGreaterThanOrEqual(110); expect(pct, r.state).toBeLessThanOrEqual(200); }
        else { expect(pct, r.state).toBeGreaterThanOrEqual(39); expect(pct, r.state).toBeLessThanOrEqual(60); }
      }
      // 200% FPG (IA, SD) is allowed only where it does not exceed 60% SMI for the household — the ceiling is the greater of the two.
      const three = liheapLimitDollars(r.state, heatingLimitFor(r, 3), 3);
      expect(three, r.state).toBeGreaterThanOrEqual(1.1 * fpl2025(r.state, 3) - 1);
      expect(three, r.state).toBeLessThanOrEqual(Math.max(1.5 * fpl2025(r.state, 3), smiLimit(r.state, 3, 60)) + 1);
    }
  });

  it("orders every top band and every staircase", () => {
    for (const r of LIHEAP_TABLE) {
      const { topBand, bands } = r.heating;
      if (topBand) { expect(topBand.min, r.state).toBeGreaterThan(0); expect(topBand.min, r.state).toBeLessThanOrEqual(topBand.max); }
      if (bands) {
        // Each band is at or under the limit, the amounts fall toward the top band's minimum, and the bounds rise.
        let last = 0;
        for (const b of bands) {
          const at = liheapLimitDollars(r.state, b.upto, 3);
          expect(at, r.state).toBeGreaterThan(last);
          expect(at, r.state).toBeLessThan(liheapLimitDollars(r.state, heatingLimitFor(r, 3), 3));
          expect(b.amount, r.state).toBeGreaterThanOrEqual(topBand!.min);
          last = at;
        }
      }
    }
  });

  it("read a served share for at least 40 states, and names each one it could not", () => {
    const present = LIHEAP_TABLE.filter((r) => r.servedShare !== null);
    expect(present.length).toBeGreaterThanOrEqual(40);
    for (const r of present) { expect(r.servedShare!, r.state).toBeGreaterThan(0); expect(r.servedShare!, r.state).toBeLessThanOrEqual(1); }
    const unread = LIHEAP_TABLE.filter((r) => r.servedShare === null).map((r) => r.state);
    expect(unread).toEqual(["HI"]);
    expect(liheapRow("HI").heating.note).toMatch(/404/);
  });

  it("pins the five research states (docs/research/liheap-cliff-2026-09-16.md § 3)", () => {
    const tx = liheapRow("TX");
    expect(tx.heating.limit).toEqual({ kind: "fpg", pct: 150 });
    expect(tx.heating.topBand).toEqual({ min: 1200, max: 1200 });
    expect(tx.heating.bands).toEqual([{ upto: { kind: "fpg", pct: 50 }, amount: 1800 }, { upto: { kind: "fpg", pct: 75 }, amount: 1500 }]);
    expect(tx.servedShare).toBe(0.03);
    const ma = liheapRow("MA");
    expect(ma.heating.limit).toEqual({ kind: "smi", pct: 60 });
    expect(ma.heating.topBand?.min).toBe(355);
    expect(ma.heating.bands?.map((b) => b.amount)).toEqual([500, 460, 425, 390, 390]);
    expect(ma.upstream?.variable).toBe("ma_liheap");
    expect(liheapRow("MO").heating).toMatchObject({ shape: "notch", topBand: { min: 318, max: 495 } });
    expect(liheapRow("IA").heating).toMatchObject({ shape: "points", limit: { kind: "fpg", pct: 200 } });
    expect(liheapRow("MI")).toMatchObject({ heating: { shape: "taper", limit: { kind: "fpg", pct: 110 } }, upstream: { variable: "mi_home_heating_credit", counted: "state credit" }, servedShare: 0.85 });
  });

  it("carries the Clearinghouse's size caveats, Maryland's sliding scale, and the two states on FY2025's SMI table", () => {
    expect(heatingLimitFor(liheapRow("AZ"), 9)).toEqual({ kind: "smi", pct: 60 });
    expect(heatingLimitFor(liheapRow("AZ"), 10)).toEqual({ kind: "fpg", pct: 150 });
    expect(heatingLimitFor(liheapRow("SD"), 6)).toEqual({ kind: "fpg", pct: 200 });
    expect(heatingLimitFor(liheapRow("SD"), 8)).toEqual({ kind: "smi", pct: 60 });
    expect(heatingLimitFor(liheapRow("SD"), 10)).toEqual({ kind: "fpg", pct: 150 });
    expect(heatingLimitFor(liheapRow("OH"), 9)).toEqual({ kind: "smi", pct: 60 });
    const md = liheapRow("MD").heating.limit;
    expect(md.kind).toBe("smi-by-size");
    // One person 39% of SMI, three 41%, eleven or more 60%.
    expect(liheapLimitDollars("MD", md, 1)).toBeCloseTo(smiLimit("MD", 1, 39), 6);
    expect(liheapLimitDollars("MD", md, 3)).toBeCloseTo(smiLimit("MD", 3, 41), 6);
    expect(liheapLimitDollars("MD", md, 12)).toBeCloseTo(smiLimit("MD", 12, 60), 6);
    for (const state of ["SC", "WV"]) expect(liheapRow(state).heating.limit, state).toMatchObject({ kind: "smi", vintage: "FY2025" });
  });
});

describe("smi.json — 60% of state median income by size", () => {
  it("reproduces two independently published figures: Massachusetts' matrix and Missouri's DSS table", () => {
    // MA FY2026 HEAP chart (2025-06-02), household of three, "60% of Estimated State Median Income": $83,641.
    expect(Math.round(smiLimit("MA", 3, 60))).toBe(83641);
    // MO Appendix K, FFY 26, household of three, "60% SMI maximum" monthly: $4,588.
    expect(Math.round(smiLimit("MO", 3, 60) / 12)).toBe(4588);
    // The two states whose FY2026 files still print the FY2025 figures agree with that vintage to the dollar.
    expect(Math.round(smiLimit("SC", 3, 60, "FY2025"))).toBe(49479);
    expect(Math.round(smiLimit("WV", 4, 60, "FY2025"))).toBe(54397);
  });

  it("follows 45 CFR 96.85's ladder and names its pin", () => {
    const four = smiLimit("TX", 4, 60);
    expect(smiLimit("TX", 1, 60) / four).toBeCloseTo(0.52, 9);
    expect(smiLimit("TX", 6, 60) / four).toBeCloseTo(1.32, 9);
    expect(smiLimit("TX", 8, 60) / four).toBeCloseTo(1.38, 9);
    const p = smiProvenance();
    expect(p.fiscalYear).toBe("FY2026");
    expect(p.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(p.acf.href).toMatch(/^https:\/\/acf\.gov\//);
  });
});

describe("liheapBoundary", () => {
  const tx = answersWith({ state: "TX", childAges: [3, 7], childDisabled: [false, false], annualEarnings: 30000 });

  it("puts a Texas single parent of two at $39,975 (150% of the 2025 guideline for three), $1,200 at the top band, 3% served", () => {
    const b = liheapBoundary(tx, curveTo(150_000));
    expect(b).toMatchObject({ component: "heating", earningsLimit: 39975, householdIncomeLimit: 39975, topBand: { min: 1200, max: 1200 }, shape: "staircase", servedShare: 0.03, upstream: null });
    expect(b?.sources.amounts).toMatch(/TX_BenefitMatrix/);
  });

  it("puts Massachusetts at $83,641 (60% SMI), and Maryland's household of three on its 41% rung", () => {
    const ma = liheapBoundary(answersWith({ ...tx, state: "MA" }), curveTo(150_000));
    expect(ma?.householdIncomeLimit).toBe(83641);
    expect(ma?.upstream?.variable).toBe("ma_liheap");
    const md = liheapBoundary(answersWith({ ...tx, state: "MD" }), curveTo(150_000));
    expect(md?.householdIncomeLimit).toBe(Math.round(smiLimit("MD", 3, 41)));
    // A household size that trips the sliding scale's next rung: one person, 39%.
    const one = liheapBoundary(answersWith({ state: "MD", childAges: [], childDisabled: [], annualEarnings: 20000 }), curveTo(150_000));
    expect(one?.householdIncomeLimit).toBe(Math.round(smiLimit("MD", 1, 39)));
  });

  it("subtracts the rest of the household's income from the earner's limit, and is null when the curve ends below the limit", () => {
    const married = answersWith({ ...tx, married: true, spouseAge: 30, spouseAnnualEarnings: 15080, childSupportMonthly: 200 });
    const b = liheapBoundary(married, curveTo(150_000));
    // Four people at 150% FPG: $48,225 of household income, less the spouse's $15,080 and $2,400 of child support.
    expect(b).toMatchObject({ householdIncomeLimit: 48225, earningsLimit: 48225 - 15080 - 2400 });
    expect(liheapBoundary(tx, curveTo(30_000))).toBeNull();
  });
});
