import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { StateCoverage, StateMetrics, SummaryJson } from "@hotgap/core";
import { ARCHETYPES, DEFAULT_ARCHETYPE, STATE_CODES } from "@hotgap/core";
import { capitalize, word } from "./format.js";
import { archLabel, bins, correctionRows, group, incompleteFor, MEASURES, measureByKey, paysForCare, PREFERRED_HOUSEHOLD, rowsFor, tableRows } from "./model.js";

/* A hand-sized sweep that exercises every tile state at once. */
const metrics = (over: Partial<StateMetrics> = {}): StateMetrics => ({
  biggestLoss: 1000, dangerWidth: 5000, cliffCount: 3, deferredCliffCount: 1, safeExit: 60000, leap: 20000, leapIsLowerBound: false, ...over,
});
const liheap = { program: "LIHEAP", note: "never reaches net income" };
const coverage = (unmodeled: StateCoverage["unmodeled"] = [liheap]): StateCoverage => ({
  corrections: {
    policyOverrides: [],
    maTafdc: { applies: false, note: "" },
    premiumAssistance: { applies: false, source: "none", program: null, note: "" },
    childcareSubsidy: { applies: false, source: "in net income", note: "" },
    coverageGap: { applies: false, note: "" },
  },
  unmodeled,
  otherBenefits: [],
  vintages: { model: null, rent: { publisher: "HUD", vintage: "FY2026" }, county: { publisher: "Census", vintage: "V2024" }, childcare: { preschool: "county 2018" }, reach: { basis: "", vintages: ["2024-1yr"], growthFactor: 1 } },
});
const single1 = { id: "single-1", married: false, childAges: [3] };
const married1 = { id: "married-1", married: true, childAges: [3] };
const fixture: SummaryJson = {
  generated: "2026-09-16T19:37:52.231Z", year: "2026", model: { endpoint: "127.0.0.1:8099", version: "2.5.0" },
  archetypes: [single1, married1],
  states: {
    AA: { "single-1": metrics({ biggestLoss: 9000 }), "married-1": metrics({ biggestLoss: 9000 }) },          // shaded, the top
    BB: { "single-1": metrics({ biggestLoss: 3000 }), "married-1": metrics({ biggestLoss: 3000 }) },          // shaded
    CC: { "single-1": metrics({ cliffCount: 0, biggestLoss: 0, dangerWidth: 0, safeExit: 0, leap: 0 }), "married-1": metrics() }, // none for single-1
    DD: { "single-1": metrics({ safeExit: null, biggestLoss: 500 }), "married-1": metrics({ safeExit: null }) }, // null exit, flag false (NE today)
    EE: { "single-1": metrics({ leapIsLowerBound: true, biggestLoss: 12000 }), "married-1": metrics() },       // lower-bound leap
    FF: { "single-1": metrics({ biggestLoss: 20000 }), "married-1": metrics({ biggestLoss: 20000 }) },        // incomplete: premium program
    GG: { "single-1": metrics({ biggestLoss: 100 }), "married-1": metrics({ biggestLoss: 100 }) },            // child-care gap: bites single-1 only
  },
  coverage: {
    AA: coverage(), BB: coverage(), CC: coverage(), DD: coverage(), EE: coverage(),
    FF: coverage([{ program: "FF Premium Savings", note: "no upstream variable" }, liheap]),
    GG: coverage([{ program: "Child-care subsidy (CCDF)", note: "the engine paid $0" }, liheap]),
  },
};
const loss = measureByKey("biggestLoss")!;

describe("archLabel and paysForCare on core's own archetypes", () => {
  it("labels every archetype from married, childAges and the id, and only paying households can be bitten by a child-care gap", () => {
    const labels = Object.fromEntries(ARCHETYPES.map((a) => [a.id, archLabel(a)]));
    expect(labels["single-0"]).toBe("1 adult, no children");
    expect(labels["single-2"]).toBe("1 adult, 2 children (3 and 7)");
    expect(labels["married-3"]).toBe("2 adults, one working, 3 children (1, 4, 9)");
    expect(labels["married-dual-1"]).toBe("2 adults, both working, 1 child (3)");
    expect(new Set(Object.values(labels)).size).toBe(ARCHETYPES.length);
    for (const a of ARCHETYPES) expect(paysForCare(a)).toBe(a.childAges.some((age) => age < 6) && (!a.married || a.spouseWorks));
  });
  it("prefers the household core prefers — the one id repeated on this side of the browser seam", () => {
    expect(PREFERRED_HOUSEHOLD).toBe(DEFAULT_ARCHETYPE);
    expect(ARCHETYPES.some((a) => a.id === PREFERRED_HOUSEHOLD)).toBe(true);
  });
});

describe("counts in words", () => {
  it("spells the counts the lede uses and falls back to digits beyond ninety-nine", () => {
    expect(word(ARCHETYPES.length)).toBe("eleven");
    expect(capitalize(word(STATE_CODES.length))).toBe("Fifty-one");
    expect([word(0), word(20), word(40), word(99), word(100), word(1.5)]).toEqual(["zero", "twenty", "forty", "ninety-nine", "100", "1.5"]);
  });
});

describe("rowsFor: the four tile states and their precedence", () => {
  it("classifies each state from the data, never from a list", () => {
    const kinds = Object.fromEntries(rowsFor(fixture, single1, loss).map((r) => [r.st, r.kind]));
    expect(kinds).toEqual({ AA: "shaded", BB: "shaded", CC: "none", DD: "shaded", EE: "shaded", FF: "incomplete", GG: "incomplete" });
  });
  it("a null value is past the axis whatever the flag says, and the flag only bounds leap and safe exit", () => {
    const exit = measureByKey("safeExit")!, leap = measureByKey("leap")!;
    const by = (m: typeof loss) => Object.fromEntries(rowsFor(fixture, single1, m).map((r) => [r.st, r.kind]));
    expect(by(exit).DD).toBe("past");
    expect(by(exit).EE).toBe("past");
    expect(by(leap).EE).toBe("past");
    expect(by(leap).DD).toBe("shaded");
    expect(by(loss).EE).toBe("shaded");
    expect(by(exit).CC).toBe("none");
  });
  it("a child-care gap hatches only a household that pays for care; LIHEAP never hatches", () => {
    expect(incompleteFor(fixture.coverage!.GG, single1).map((u) => u.program)).toEqual(["Child-care subsidy (CCDF)"]);
    expect(incompleteFor(fixture.coverage!.GG, married1)).toEqual([]);
    expect(incompleteFor(fixture.coverage!.AA, single1)).toEqual([]);
    expect(rowsFor(fixture, married1, loss).find((r) => r.st === "GG")!.kind).toBe("shaded");
  });
  it("skips a cell the sweep did not write rather than fabricating one", () => {
    const partial: SummaryJson = { ...fixture, states: { ...fixture.states, ZZ: {} } };
    expect(rowsFor(partial, single1, loss).map((r) => r.st)).not.toContain("ZZ");
  });
});

describe("bins and group", () => {
  it("bins over the comparable states only: none and incomplete never set a bound", () => {
    const g = group(rowsFor(fixture, single1, loss));
    expect(g.ranked.map((r) => r.st)).toEqual(["EE", "AA", "BB", "DD"]);
    expect(g.bins.lo).toBe(500);
    expect(g.bins.hi).toBe(12000);
    expect(g.none.map((r) => r.st)).toEqual(["CC"]);
    expect(g.incomplete.map((r) => r.st)).toEqual(["FF", "GG"]);
    expect(g.programs).toEqual(["FF Premium Savings", "Child-care subsidy (CCDF)"]);
  });
  it("five equal-width bins with printed bounds; an empty set is all zeros", () => {
    const b = bins([10, 20, 30, 40, 50]);
    expect(b.bounds).toEqual([18, 26, 34, 42, 50]);
    expect([10, 18, 26, 34, 50].map(b.index)).toEqual([0, 1, 2, 3, 4]);
    expect(bins([7]).index(7)).toBe(0);
    expect(bins([])).toMatchObject({ lo: 0, hi: 0, bounds: [0, 0, 0, 0, 0] });
  });
  it("orders the table by state, or by the ranking followed by past, none and incomplete", () => {
    const rows = rowsFor(fixture, single1, measureByKey("safeExit")!);
    const g = group(rows);
    expect(tableRows(rows, g, "state").map((r) => r.st)).toEqual(["AA", "BB", "CC", "DD", "EE", "FF", "GG"]);
    expect(tableRows(rows, g, "measure").map((r) => r.st)).toEqual(["AA", "BB", "DD", "EE", "CC", "FF", "GG"]);
  });
});

describe("correctionRows", () => {
  it("keeps only the corrections that apply, in one order, with the source word as the chip", () => {
    const c = coverage().corrections;
    expect(correctionRows(c)).toEqual([]);
    expect(correctionRows(undefined)).toEqual([]);
    const applied = correctionRows({
      ...c,
      policyOverrides: [{ parameter: "gov.hhs.medicaid.eligibility.categories.parent.income_limit.TX", period: "2026", values: {}, source: "https://fhb.hhs.texas.gov/x", note: "parent limit" }],
      childcareSubsidy: { applies: true, source: "added by HotGap", note: "added" },
      coverageGap: { applies: true, note: "gap" },
    });
    expect(applied.map((r) => [r.program, r.source])).toEqual([
      ["Medicaid — parent income limit", "overridden"],
      ["CCDF child care subsidy", "added by HotGap"],
      ["Premium tax credit — coverage gap", null],
    ]);
    expect(applied[0].href).toBe("https://fhb.hhs.texas.gov/x");
  });
});

describe("the committed sweep", () => {
  const summary = JSON.parse(readFileSync(new URL("../../../core/data/summary.json", import.meta.url), "utf8")) as SummaryJson;
  it("yields a row for every state on every measure and archetype, with no NaN bin", () => {
    for (const a of summary.archetypes) for (const m of MEASURES) {
      const rows = rowsFor(summary, a, m);
      expect(rows.map((r) => r.st)).toEqual([...STATE_CODES].sort());
      const g = group(rows);
      expect(g.ranked.length + g.past.length + g.none.length + g.incomplete.length).toBe(rows.length);
      for (const r of g.ranked) expect(Number.isFinite(g.bins.index(r.value as number))).toBe(true);
      for (const r of g.none) expect(r.m.cliffCount).toBe(0);
    }
  });
});
