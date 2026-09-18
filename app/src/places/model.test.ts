import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { StateCoverage, StateMetrics, SummaryJson, UnmodeledProgram } from "@hotgap/core";
import { ARCHETYPES, STATE_CODES, answersFor } from "@hotgap/core";
import { capitalize, numberWords } from "../lib/format.js";
import { copy, t } from "./copy.js";
import { archLabel, bins, DEFAULT_MEASURE, divergingBins, group, incompleteFor, MEASURES, measureByKey, measuresIn, paysForCare, rowsFor, tableRows, valueOf } from "./model.js";
import { axisLine, axisPosition, boundaryCite, boundaryCounted, boundaryFacts, cliffCountLine, countedLede, deferredLine, householdPhrase, keepPhrase, keepShort, keepTick, liheapMethodLine, lowerNote, lowerTitle, noneLine, rankRange, roadCliffCountLine, roadCollapse, roadHolds, roadOffAxisLine, roadPosition, roadRateLine, rowLabel, servedLine, worstStepLine } from "./words.js";

/* A hand-sized sweep that exercises every tile state at once. */
const metrics = (over: Partial<StateMetrics> = {}): StateMetrics => ({
  biggestLoss: 1000, biggestLossAt: 30000, biggestLossPrograms: ["medicaid"], dangerWidth: 5000, cliffCount: 3, deferredCliffCount: 1, safeExit: 60000, leap: 20000, leapIsLowerBound: false, axisTop: 150000,
  keepRate: -0.1, roadLo: 27000, roadHi: 55000, roadCliffCount: 1, roadWorst: { drop: 1000, at: 30000, programs: ["medicaid"] }, biggestLossPosition: 60, ...over,
});
const liheap: UnmodeledProgram = { program: "LIHEAP", note: "never reaches net income", scope: "all" };
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
  vintages: { model: null, rent: { publisher: "HUD", vintage: "FY2026" }, county: { publisher: "Census", vintage: "V2024", fips: "00000", name: "Any County" }, childcare: { preschool: "county 2018" }, reach: { basis: "", vintages: ["2024-1yr"], growthFactor: 1 } },
});
const single1 = { id: "single-1", married: false, childAges: [3] };
const married1 = { id: "married-1", married: true, childAges: [3] };
const fixture: SummaryJson = {
  generated: "2026-09-16T19:37:52.231Z", year: "2026", model: { endpoint: "127.0.0.1:8099", version: "2.5.0" },
  archetypes: [single1, married1],
  states: {
    AA: { "single-1": metrics({ biggestLoss: 9000 }), "married-1": metrics({ biggestLoss: 9000 }) },          // shaded, the top
    BB: { "single-1": metrics({ biggestLoss: 3000 }), "married-1": metrics({ biggestLoss: 3000 }) },          // shaded
    CC: { "single-1": metrics({ cliffCount: 0, biggestLoss: 0, biggestLossAt: null, biggestLossPrograms: [], dangerWidth: 0, safeExit: 0, leap: 0 }), "married-1": metrics() }, // none for single-1
    DD: { "single-1": metrics({ safeExit: null, biggestLoss: 500 }), "married-1": metrics({ safeExit: null }) }, // null exit, flag false (NE today)
    EE: { "single-1": metrics({ leapIsLowerBound: true, biggestLoss: 12000 }), "married-1": metrics() },       // lower-bound leap
    FF: { "single-1": metrics({ biggestLoss: 20000 }), "married-1": metrics({ biggestLoss: 20000 }) },        // incomplete: premium program
    GG: { "single-1": metrics({ biggestLoss: 100 }), "married-1": metrics({ biggestLoss: 100 }) },            // child-care gap: bites single-1 only
  },
  coverage: {
    AA: coverage(), BB: coverage(), CC: coverage(), DD: coverage(), EE: coverage(),
    FF: coverage([{ program: "FF Premium Savings", note: "no upstream variable", scope: "state" }, liheap]),
    GG: coverage([{ program: "Child-care subsidy (CCDF)", note: "the engine paid $0", scope: "state" }, liheap]),
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
    // The pipeline's own test for a household that buys care: a positive
    // child-care bill under the state's defaults, i.e. any child through 12.
    for (const a of ARCHETYPES) expect(paysForCare(a)).toBe((answersFor("CA", a).monthlyChildcare ?? 0) > 0);
    expect(paysForCare({ id: "x", married: false, childAges: [12] })).toBe(true);
    expect(paysForCare({ id: "x", married: false, childAges: [13] })).toBe(false);
  });
});

describe("counts in words (lib/format.ts numberWords)", () => {
  it("spells the counts the lede uses and falls back to digits beyond ninety-nine", () => {
    expect(numberWords(ARCHETYPES.length)).toBe("eleven");
    expect(capitalize(numberWords(STATE_CODES.length))).toBe("Fifty-one");
    expect([0, 20, 40, 99, 100, 1.5].map(numberWords)).toEqual(["zero", "twenty", "forty", "ninety-nine", "100", "1.5"]);
    // The states counted as a reader counts them (rerun N11): fifty and DC when DC is in the file, a plain count otherwise.
    expect(countedLede(STATE_CODES.length, ARCHETYPES.length, true)).toMatch(/^Fifty states and the District of Columbia, eleven household shapes, one earnings scale/);
    expect(countedLede(50, ARCHETYPES.length, false)).toMatch(/^Fifty states, eleven household shapes/);
  });
});

describe("the measures, from copy", () => {
  it("are the nine pipeline keys in the FilterRow's order, the road's three first, the counts without a unit, each option naming its own referent (S2)", () => {
    expect(MEASURES.map((m) => m.key)).toEqual(["keepRate", "roadCliffCount", "roadWorst", "biggestLoss", "dangerWidth", "leap", "safeExit", "cliffCount", "deferredCliffCount"]);
    expect(MEASURES.map((m) => m.unit)).toEqual(["¢", "", "$", "$", "$", "$", "$", "", ""]);
    // Two groups, two questions: the road out of poverty, and the whole curve.
    expect(measuresIn("road").map((m) => m.key)).toEqual(["keepRate", "roadCliffCount", "roadWorst"]);
    expect(measuresIn("axis").map((m) => m.key)).toEqual(["biggestLoss", "dangerWidth", "leap", "safeExit", "cliffCount", "deferredCliffCount"]);
    expect(MEASURES.every((m) => (m.worst === "low") === (m.key === "keepRate"))).toBe(true);
    expect(DEFAULT_MEASURE).toBe("keepRate");
    for (const m of MEASURES) expect(m.option, m.key).not.toMatch(/\b(it|that stretch|of those)\b/i);
    expect(measureByKey("keepRate")!.describe).toMatch(/poorer than it started/);
    expect(measureByKey("roadWorst")!.title).toBe("Where the road collapses");
    expect(measureByKey("leap")!.option).toContain("worst danger zone");
    expect(measureByKey("deferredCliffCount")!.describe).toMatch(/Head Start.*Medicaid.*Transitional Medical Assistance/);
    // dangerWidth is every zone's width added together (pipeline/src/metrics.ts); the widest one's width is the leap.
    // The label must say "total", never "the worst zone", which is the leap's definition.
    expect(measureByKey("dangerWidth")!.title).toBe("Total width of the danger zones");
    expect(measureByKey("dangerWidth")!.describe).toMatch(/added together/);
    expect(measureByKey("dangerWidth")!.describe).not.toMatch(/widest|worst/);
  });
});

describe("the boundary's sentences, from copy through words.ts (#23)", () => {
  it("says the served share as the citizen hears it with the figure a reporter quotes, a null share or amount in words, the worth by the schedule's shape, and never types a vintage", () => {
    expect(servedLine(0.03)).toBe("Fewer than 1 in 10 income-eligible households were served in FY2024 (3%).");
    expect(servedLine(0.22)).toBe("About 2 in 10 income-eligible households were served in FY2024 (22%).");
    expect(servedLine(0.85)).toBe("About 9 in 10 income-eligible households were served in FY2024 (85%).");
    expect(boundaryFacts({ limit: "150% of the poverty guideline", worth: { lo: "$1,200", hi: null, shape: "staircase" }, share: 0.03 }))
      .toBe("Stops at 150% of the poverty guideline, the heating limit for FY2026. Worth $1,200 a winter if received, at that top income band. Fewer than 1 in 10 income-eligible households were served in FY2024 (3%).");
    expect(boundaryFacts({ limit: "60% of state median income", worth: { lo: "$318", hi: "$495", shape: "notch" }, share: 0.18 })).toContain("Worth $318 to $495 a winter if received, flat to the limit. About 2 in 10");
    expect(boundaryFacts({ limit: "110% of the poverty guideline", worth: { lo: "$1", hi: "$2,205", shape: "taper" }, share: 0.85 })).toContain("Worth $1 to $2,205 a winter if received; the amount tapers toward the limit. About 9 in 10");
    expect(boundaryFacts({ limit: "60% of state median income", worth: { lo: "$375", hi: "$1,400", shape: "points" }, share: null }))
      .toBe("Stops at 60% of state median income, the heating limit for FY2026. Worth $375 to $1,400 a winter if received, at that top income band. The share of income-eligible households served is not published for FY2024.");
    expect(boundaryFacts({ limit: "150% of the poverty guideline", worth: null, share: 0.1 })).toContain("The state's matrix prints no amount at that band. About 1 in 10");
    // A whole sentence (the render joins it with a space), no longer a fragment with a leading space.
    expect(boundaryCounted("Michigan", "Home Heating Credit")).toBe("Paid as the Home Heating Credit, which is counted in every figure for Michigan.");
    expect(boundaryCite({ limits: "https://liheapch.acf.gov/delivery/income_eligibility.htm", amounts: "https://liheapch.acf.gov/docs/2026/x.pdf", served: "https://liheappm.acf.gov/p.pdf", readOn: "2026-09-16" }))
      .toBe("Limit and amount: [liheapch.acf.gov](https://liheapch.acf.gov/delivery/income_eligibility.htm). Households served: [liheappm.acf.gov](https://liheappm.acf.gov/p.pdf). Read Sep 16, 2026.");
    expect(boundaryCite({ limits: "https://liheapch.acf.gov/delivery/income_eligibility.htm", amounts: "https://liheapch.acf.gov/tables/benefits.htm", served: null, readOn: "2026-09-16" }))
      .toBe("Limit and amount: [liheapch.acf.gov](https://liheapch.acf.gov/delivery/income_eligibility.htm). Read Sep 16, 2026.");
    expect(boundaryCite({ limits: "https://a.gov/limits", amounts: "https://b.gov/amounts", served: null, readOn: "2026-09-16" }))
      .toBe("Limit: [a.gov](https://a.gov/limits). Amount: [b.gov](https://b.gov/amounts). Read Sep 16, 2026.");
    expect(copy.detail.liheap.footing).toEqual({ boundary: "not counted", inNetIncome: "in net income" });
  });
  it("names the served range and the counted states once for the page, from the blocks", () => {
    const line = liheapMethodLine({ state: "Texas", share: 0.03 }, { state: "Michigan", share: 0.85 }, [{ state: "Michigan", program: "Home Heating Credit" }]);
    expect(line).toMatch(/^Energy assistance \(LIHEAP\) is in no figure on this page, except in Michigan, where it is paid as the Home Heating Credit and counted\. It is a block grant, not an entitlement: in FY2024 the states served between 3% \(Texas\) and 85% \(Michigan\)/);
    expect(liheapMethodLine({ state: "Texas", share: 0.03 }, { state: "Michigan", share: 0.85 }, [])).toMatch(/^Energy assistance \(LIHEAP\) is in no figure on this page\. It is a block grant/);
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
  it("orders the lower-bound group by its floor, largest first, so the strongest claim leads (rerun B1)", () => {
    const leap = measureByKey("leap")!;
    const three: SummaryJson = { ...fixture, states: { ...fixture.states,
      HH: { "single-1": metrics({ leapIsLowerBound: true, leap: 90000 }), "married-1": metrics() },
      II: { "single-1": metrics({ leapIsLowerBound: true, leap: 30000 }), "married-1": metrics() } },
      coverage: { ...fixture.coverage, HH: coverage(), II: coverage() } };
    expect(group(rowsFor(three, single1, leap), leap).past.map((r) => [r.st, r.value])).toEqual([["HH", 90000], ["II", 30000], ["EE", 20000]]);
    // A safe exit past the axis has no floor to sort by: postal order.
    const exit = measureByKey("safeExit")!;
    expect(group(rowsFor(three, single1, exit), exit).past.map((r) => r.st)).toEqual(["DD", "EE", "HH", "II"]);
    expect(tableRows(three, single1, "leap").slice(0, 3).map((r) => r.st)).toEqual(["HH", "II", "EE"]);
  });
  it("bins over the comparable states only: none and incomplete never set a bound", () => {
    const g = group(rowsFor(fixture, single1, loss), loss);
    expect(g.ranked.map((r) => r.st)).toEqual(["EE", "AA", "BB", "DD"]);
    expect(g.bins.lo).toBe(500);
    expect(g.bins.hi).toBe(12000);
    expect(g.none.map((r) => r.st)).toEqual(["CC"]);
    expect(g.incomplete.map((r) => r.st)).toEqual(["FF", "GG"]);
    expect(g.programs).toEqual(["FF Premium Savings", "Child-care subsidy (CCDF)"]);
  });
  it("a dollar measure takes five equal-width steps with printed bounds; an empty set is all zeros", () => {
    const b = bins([10, 20, 30, 40, 50], "$");
    expect(b.kind).toBe("steps");
    expect(b.classes.map((c) => c.hi)).toEqual([18, 26, 34, 42, 50]);
    expect(b.classes.map((c) => c.ramp)).toEqual([0, 1, 2, 3, 4]);
    expect([10, 18, 26, 34, 50].map(b.index)).toEqual([0, 1, 2, 3, 4]);
    expect(bins([7], "$").index(7)).toBe(0);
    expect(bins([], "$")).toMatchObject({ lo: 0, hi: 0, classes: Array.from({ length: 5 }, (_, i) => ({ ramp: i, hue: "loss", lo: 0, hi: 0 })) });
  });
  it("a count takes classes of whole numbers, never a repeated bound, spread over the ramp (S5)", () => {
    // Deferred cliffs on the 2026-09-16 sweep: every state has 0 or 1.
    const two = bins([0, 1, 0, 1], "");
    expect(two).toMatchObject({ kind: "classes", lo: 0, hi: 1 });
    expect(two.classes).toEqual([{ ramp: 0, hue: "loss", lo: 0, hi: 0 }, { ramp: 4, hue: "loss", lo: 1, hi: 1 }]);
    // `index` names the CLASS, and the class carries its ramp step and its ramp.
    expect([0, 1].map(two.index)).toEqual([0, 1]);
    expect([0, 1].map((v) => two.classes[two.index(v)].ramp)).toEqual([0, 4]);
    // Sixteen distinct counts fit four classes of four, not six of three.
    const wide = bins([4, 19], "");
    expect(wide.classes.map((c) => [c.lo, c.hi, c.ramp])).toEqual([[4, 7, 0], [8, 11, 1], [12, 15, 3], [16, 19, 4]]);
    expect([4, 7, 8, 12, 19].map(wide.index)).toEqual([0, 0, 1, 2, 3]);
    // Exactly five values are five classes of one; one value is one class.
    expect(bins([2, 6], "").classes.map((c) => [c.lo, c.hi, c.ramp])).toEqual([[2, 2, 0], [3, 3, 1], [4, 4, 2], [5, 5, 3], [6, 6, 4]]);
    expect(bins([3, 3], "").classes).toEqual([{ ramp: 0, hue: "loss", lo: 3, hi: 3 }]);
    expect(bins([], "").classes).toEqual([{ ramp: 0, hue: "loss", lo: 0, hi: 0 }]);
  });
  it("a measure with a meaningful zero diverges: zero is always a bin edge, each arm cut over its own reach (charts.md § 2)", () => {
    const bounds = (b: ReturnType<typeof divergingBins>) => [b.classes[0].lo, ...b.classes.map((c) => c.hi)];
    // The committed sweep's single-2 range. Six classes split in proportion to
    // how far each arm reaches — four plum, two keep — each arm over its own
    // range: one shared width would give the short arm a single class and
    // paint half the map one flat colour, and cutting both arms the same
    // number of ways flattened the long one instead.
    const d = divergingBins(-1.0486, 0.3042);
    expect(d.kind).toBe("diverging");
    expect(d.classes.map((c) => c.hue)).toEqual(["loss", "loss", "loss", "loss", "keep", "keep"]);
    const w = 1.0486 / 4, u = 0.3042 / 2;
    expect(bounds(d)).toEqual([-1.0486, -3 * w, -2 * w, -w, 0, u, 0.3042]);
    expect(bounds(d)).toContain(0);
    expect(d.classes.map((c) => c.ramp)).toEqual([4, 3, 1, 0, 0, 4]);
    expect([d.width!.nDown, d.width!.nUp]).toEqual([4, 2]);
    expect(d.width!.down).toBeCloseTo(w, 10);
    expect(d.width!.up).toBeCloseTo(u, 10);
    // The two states the old split drew alike now fall in different classes,
    // and the two a cent apart on the short arm fall in the same one.
    expect(d.index(-0.42)).not.toBe(d.index(-0.67));
    expect(d.index(0.20)).toBe(d.index(0.21));
    // Every set of values puts zero on a bound, including one that never
    // crosses it — and then the scale runs from zero, not from the lowest
    // state, which is the one place this page bins from zero on purpose.
    for (const [lo, hi] of [[-1.42, 0.348], [0.269, 0.571], [-0.08, 0.335], [-0.3, -0.05], [0, 0]] as const) {
      const b = divergingBins(lo, hi);
      expect(bounds(b), `${lo}..${hi}`).toContain(0);
      expect(b.classes.length, `${lo}..${hi}`).toBeLessThanOrEqual(6);
      expect(b.classes.every((c) => c.ramp >= 0 && c.ramp <= 4)).toBe(true);
      // Monotone: every class's bounds rise left to right, losing arm first.
      expect(bounds(b)).toEqual([...bounds(b)].sort((x, z) => x - z));
      // Every state on the scale falls in a class of the arm its sign names.
      for (const v of [lo, hi, (lo + hi) / 2]) expect(b.classes[b.index(v)].hue, `${v}`).toBe(v < 0 ? "loss" : "keep");
    }
    // All on one side: the whole scale is that arm, from zero, at the ramp's
    // own depth — five steps, not six, because a ramp has five.
    const up = divergingBins(0.269, 0.571);
    expect(up.classes.every((c) => c.hue === "keep")).toBe(true);
    expect(up.classes.length).toBe(5);
    expect(up.classes.map((c) => c.ramp)).toEqual([0, 1, 2, 3, 4]);
    expect([up.lo, up.zero, up.width!.down]).toEqual([0, 0, null]);
    const dn = divergingBins(-0.3, -0.05);
    expect(dn.classes.every((c) => c.hue === "loss")).toBe(true);
    expect(dn.classes.length).toBe(5);
    expect([dn.hi, dn.zero, dn.width!.up]).toEqual([0, 1, null]);
    // A value on a bound belongs to the class nearer zero, and zero itself to the keep arm.
    expect(d.classes[d.index(0)].hue).toBe("keep");
    expect(d.index(-w)).toBe(3);
    expect(d.index(-1.0486)).toBe(0);
    expect(d.index(0.3042)).toBe(5);
  });
  it("orders the table by state, or by one measure: its lower-bound rows first (B1), then its ranking, then none and incomplete", () => {
    expect(tableRows(fixture, single1, "state").map((r) => r.st)).toEqual(["AA", "BB", "CC", "DD", "EE", "FF", "GG"]);
    // Safe exit: DD and EE run past the axis and lead; AA and BB rank; CC has no cliff; FF and GG are incomplete.
    expect(tableRows(fixture, single1, "safeExit").map((r) => r.st)).toEqual(["DD", "EE", "AA", "BB", "CC", "FF", "GG"]);
    // The leap: only EE's is a lower bound; DD's is a plain figure and ranks.
    expect(tableRows(fixture, single1, "leap").map((r) => r.st)).toEqual(["EE", "AA", "BB", "DD", "CC", "FF", "GG"]);
    // A dollar measure nothing bounds: the ranking alone, largest first.
    expect(tableRows(fixture, single1, "biggestLoss").map((r) => r.st)).toEqual(["EE", "AA", "BB", "DD", "CC", "FF", "GG"]);
  });
});

describe("the sentences, from copy through words.ts", () => {
  it("a lower-bound group shares ranks 1–n the way a tie shares one rank, and the note names the largest measured figure (rerun B1)", () => {
    expect(rankRange(12)).toBe("1–12");
    expect(rankRange(1)).toBe("1.");
    expect(lowerTitle("leap", 12)).toBe("Ranks 1–12 shared — at least this much; the exact size runs past the axis (12)");
    expect(lowerTitle("leap", 1)).toMatch(/^Rank 1 — /);
    expect(lowerTitle("safeExit", 3)).toBe("Ranks 1–3 shared — past the top of the axis; no safe exit found on the scale (3)");
    expect(lowerNote("leap", 12, { state: "Wisconsin", v: "$129,000" }, { state: "Colorado", v: "$129,000", reaches: true }))
      .toBe("Any of these could need the largest raise — the axis ends before the worst zone closes — so they share the top ranks the way a tie does. The largest measured leap is Wisconsin's $129,000; Colorado's is at least as large.");
    expect(lowerNote("leap", 2, { state: "Wisconsin", v: "$76,000" }, { state: "New York", v: "$55,000", reaches: false })).toMatch(/New York's is at least \$55,000 and may be larger\.$/);
    expect(lowerNote("leap", 2, null, { state: "New York", v: "$55,000", reaches: false })).not.toMatch(/measured/);
    expect(lowerNote("safeExit", 3, { state: "Vermont", v: "$148,000" })).toBe("None of these had closed the last danger zone by the top of the axis, so any could be the highest; they share the top ranks the way a tie does. The highest measured safe exit is Vermont's $148,000.");
    expect(rowLabel("32.", "Ohio", "$12,062", "at $38,000")).toBe("32. Ohio: $12,062, at $38,000");
    expect(rowLabel("1–12", "Colorado", "≥ $129,000")).toBe("1–12 Colorado: ≥ $129,000");
  });
  it("the readout leads with the selected measure in its own sentence, then the worst step (rerun B2), and a no-cliff state says what was found up to the axis (S6)", () => {
    expect(t("readout.measure.safeExit", { state: "Ohio", exit: "$110,000" })).toBe("Ohio — no danger zone left above $110,000.");
    expect(t("readout.measure.safeExitPast", { state: "Nebraska", top: "$150,000" })).toBe("Nebraska — no safe exit found: the last danger zone had not closed by $150,000, the top of the axis.");
    expect(t("readout.measure.leap", { state: "Ohio", leap: "$47,000" })).toBe("Ohio — a raise of $47,000 clears the worst danger zone.");
    expect(t("readout.measure.leapAtLeast", { state: "Maryland", leap: "$53,000", top: "$150,000" })).toBe("Maryland — a raise of at least $53,000 to clear the worst danger zone, which runs past $150,000, the top of the axis.");
    expect(t("readout.measure.dangerWidth", { state: "Ohio", width: "$57,000" })).toBe("Ohio — $57,000 of earnings lie inside danger zones.");
    expect(t("readout.measure.dangerWidthOpen", { state: "Nebraska", width: "$74,000", top: "$150,000" })).toMatch(/^Nebraska — at least \$74,000 of earnings lie inside danger zones; the last one had not closed by \$150,000/);
    expect(cliffCountLine("Ohio", 10, 0)).toBe("Ohio — 10 cliffs on this household's curve, none deferred.");
    expect(cliffCountLine("Colorado", 14, 1)).toBe("Colorado — 14 cliffs on this household's curve, and 1 more deferred to a later renewal.");
    expect(cliffCountLine("Alabama", 1, 0)).toMatch(/^Alabama — 1 cliff on/);
    expect(deferredLine("Ohio", 0, 10)).toBe("Ohio — no cliff deferred to a later renewal; all 10 land with the raise.");
    expect(deferredLine("Colorado", 1, 14)).toBe("Colorado — 1 cliff deferred to a later renewal, on top of 14 that land with the raise.");
    expect(deferredLine("Alabama", 0, 1)).toBe("Alabama — no cliff deferred to a later renewal; its one cliff lands with the raise.");
    expect(worstStepLine("$12,062", "$38,000 → $39,000", ["childcare"], [])).toBe("Largest single loss anywhere on the curve: $12,062 at $38,000 → $39,000, when CCDF child care subsidy ends.");
    expect(worstStepLine("$12,062", "$38,000 → $39,000", ["snap", "wic"], ["X Premium Savings"])).toBe("Largest single loss anywhere on the curve: at least $12,062 at $38,000 → $39,000, when SNAP and WIC end; a floor, because X Premium Savings is not modelled.");
    expect(noneLine("New Mexico", "$1,000", "$200", "$150,000", 0)).toBe("New Mexico — no cliff found: no $1,000 step of earnings on this household's curve cut net income by $200 or more, up to $150,000.");
    expect(noneLine("Nowhere", "$1,000", "$200", "$150,000", 1)).toMatch(/no cliff lands with the raise: .* 1 cliff is deferred to a later renewal\.$/);
  });
  it("the readout's road lead is core's own sentences, the household said as a sentence names it, and the position a sentence of its own", () => {
    expect(householdPhrase(false, false, [3, 7])).toBe("a single parent of two children");
    /* Every branch ends in the noun the road sentence's relative clause
       attaches to: "a one-earner couple with no children who earns their way"
       read as the children earning it. */
    expect(householdPhrase(false, false, [])).toBe("a childless single adult");
    expect(householdPhrase(true, false, [3])).toBe("a one-earner couple with one child");
    expect(householdPhrase(true, true, [1, 4, 9])).toBe("a two-earner couple with three children");
    /* The readout's rate line is the page's frame around core's own phrase
       since the picture-first pass: the answer sentence above it has already
       named the household and the climb, so the readout says the state and the
       rate and stops (design/REVIEW-picture-first-places-2026-09-18.md). The
       sign word and the rounding are still core's. */
    expect(roadRateLine("Missouri", -0.5632)).toBe("Missouri — loses 56¢ of each extra dollar climbing out of poverty.");
    expect(roadRateLine("New Mexico", 0.3042)).toBe("New Mexico — keeps 30¢ of each extra dollar climbing out of poverty.");
    expect(roadRateLine("Ohio", -0.42, (x) => `<b>${x}</b>`)).toBe("Ohio — <b>loses 42¢ of each extra dollar</b> climbing out of poverty.");
    expect(roadCollapse("$40,000", "$16,428", ["childcare"]))
      .toBe("The road collapses at $40,000, where CCDF child care subsidy ends and the family loses $16,428 in one step.");
    expect(roadCollapse("$54,000", "$3,513", ["snap", "wic"])).toBe("The road collapses at $54,000, where SNAP and WIC end and the family loses $3,513 in one step.");
    expect(roadCollapse("$54,000", "$3,513", [])).toBe("The road collapses at $54,000, where the family loses $3,513 in one step; no single program explains the drop.");
    expect(roadHolds("$1,000", "$27,000", "$55,000", "$200"))
      .toBe("The road does not collapse: no $1,000 step of earnings between $27,000 and $55,000 cut net income by $200 or more.");
    /* The state is the readout line's own subject and is named at its head, so
       the position sentence no longer says it twice. */
    expect(roadPosition(47)).toBe("47 in 100 families like this earn less than that.");
    expect(axisPosition(87)).toBe("87 in 100 families like this earn less than that.");
    expect(roadCliffCountLine("Missouri", 7)).toBe("Missouri — 7 cliffs on the road out of poverty.");
    expect(roadCliffCountLine("Alabama", 1)).toBe("Alabama — 1 cliff on the road out of poverty.");
    expect(roadOffAxisLine("Nowhere")).toMatch(/^Nowhere — this household's road out of poverty/);
    // The whole-axis worst is now labelled for what it is, and last.
    expect(worstStepLine("$10,370", "$118,000 → $119,000", ["aca"], []))
      .toBe("Largest single loss anywhere on the curve: $10,370 at $118,000 → $119,000, when Premium tax credit ends.");
  });
  it("the axis line names the common top and the exceptions in dollars (rerun N9)", () => {
    expect(axisLine("1 adult, 2 children (3 and 7)", "$150,000", [{ state: "Alaska", top: "$175,000" }, { state: "Hawaii", top: "$165,000" }]))
      .toBe("For 1 adult, 2 children (3 and 7) the axis runs from $0 to $150,000 ($175,000 in Alaska, $165,000 in Hawaii); a figure that runs past the axis runs past that.");
    expect(axisLine("h", "$150,000", [])).toBe("For h the axis runs from $0 to $150,000; a figure that runs past the axis runs past that.");
  });
});

describe("the committed sweep", () => {
  const summary = JSON.parse(readFileSync(new URL("../../../core/data/summary.json", import.meta.url), "utf8")) as SummaryJson;
  const single2 = summary.archetypes.find((a) => a.id === "single-2")!;
  it("for the leap, the lower-bound states precede the largest exact leap (B1), the largest floor first; for one-step loss the order is the ranking", () => {
    const leap = tableRows(summary, single2, "leap");
    const lower = leap.filter((r) => r.kind === "past").map((r) => r.st);
    expect(lower.length).toBeGreaterThan(0);
    expect(leap.slice(0, lower.length).map((r) => r.st)).toEqual(lower);
    const floors = leap.slice(0, lower.length).map((r) => r.m.leap);
    expect(floors).toEqual([...floors].sort((a, z) => z - a));
    // The reviewer's case (rerun B1): 1 adult, 3 children — Colorado's leap is a floor, so it leads the table
    // whatever it says. Since deferred losses count (2026-09-17) the deferred step at the top of Wisconsin's
    // curve pushed its safe exit $162,000 → $163,000 and so its exact leap $129,000 → $130,000, which is $1,000
    // past Colorado's floor: the floor no longer ties the largest exact leap, but it still outranks every other
    // one and still leads, which is the rule the group exists for.
    const single3 = summary.archetypes.find((a) => a.id === "single-3")!;
    const g3 = group(rowsFor(summary, single3, measureByKey("leap")!), measureByKey("leap")!);
    expect([g3.past[0].st, g3.past[0].value]).toEqual(["CO", 129_000]);
    expect([g3.ranked[0].st, g3.ranked[0].value]).toEqual(["WI", 130_000]);
    expect(g3.past[0].value!).toBeGreaterThan(g3.ranked[1].value!);
    expect(tableRows(summary, single3, "leap")[0].st).toBe("CO");
    const largestExact = leap.find((r) => r.kind === "shaded")!;
    for (const st of lower) expect(leap.findIndex((r) => r.st === st)).toBeLessThan(leap.indexOf(largestExact));
    const loss = tableRows(summary, single2, "biggestLoss");
    expect(loss.filter((r) => r.kind === "past")).toEqual([]);
    const g = group(rowsFor(summary, single2, measureByKey("biggestLoss")!), measureByKey("biggestLoss")!);
    expect(loss.map((r) => r.st)).toEqual([...g.ranked, ...g.none, ...g.incomplete].map((r) => r.st));
  });
  it("a state whose worst zone closes but whose last zone runs off the axis has an exact leap and no safe exit (S9)", () => {
    const rows = rowsFor(summary, single2, measureByKey("safeExit")!);
    const split = rows.filter((r) => r.m.safeExit === null && !r.m.leapIsLowerBound && r.m.cliffCount > 0);
    expect(split.length).toBeGreaterThan(0);
    for (const r of split) {
      expect(r.kind).toBe("past");
      expect(rowsFor(summary, single2, measureByKey("leap")!).find((x) => x.st === r.st)!.kind).toBe("shaded");
    }
  });
  it("yields a row for every state on every measure and archetype, with no NaN bin", () => {
    for (const a of summary.archetypes) for (const m of MEASURES) {
      const rows = rowsFor(summary, a, m);
      expect(rows.map((r) => r.st)).toEqual([...STATE_CODES].sort());
      const g = group(rows, m);
      expect(g.ranked.length + g.past.length + g.none.length + g.incomplete.length).toBe(rows.length);
      for (const r of g.ranked) expect(g.bins.classes[g.bins.index(r.value as number)]).toBeDefined();
      // "No cliff" is the whole-axis fact on an axis measure and the road's on a road measure.
      for (const r of g.none) expect(m.group === "road" ? r.m.roadCliffCount : r.m.cliffCount).toBe(0);
    }
  });
  it("the keep rate ranks the most regressive states first, bins them on the losing arm, and keeps New Mexico on the top keeping step", () => {
    const keep = measureByKey("keepRate")!;
    const g = group(rowsFor(summary, single2, keep), keep);
    // Rank 1 is the lowest rate, not the highest: a state that takes back more
    // than the raise is more regressive than one that takes back less.
    expect(g.ranked.slice(0, 5).map((r) => r.st)).toEqual(["WI", "CO", "NJ", "OR", "NV"]);
    /* Ordered by the figure the page PRINTS, so two states a reader sees as
       equal are equal here and keep postal order between them — Ohio and North
       Carolina both print "loses 42¢" and the ranking may not claim otherwise
       (the cold read's B2). Whole cents, ascending, ties intact. */
    const cents = g.ranked.map((r) => Math.round((r.value as number) * 100));
    expect(cents).toEqual([...cents].sort((a, z) => a - z));
    const tied = g.ranked.filter((r) => Math.round((r.value as number) * 100) === -42).map((r) => r.st);
    expect(tied).toEqual(["NC", "OH"]);
    expect(g.ranked[g.ranked.length - 1].st).toBe("NM");
    // Every state is comparable on this measure: a state with no cliff still
    // has a keep rate, so New Mexico is shaded and binned, never lifted out.
    expect(g.none).toEqual([]);
    expect(g.past).toEqual([]);
    expect(g.ranked.length + g.incomplete.length).toBe(51);
    const arm = (st: string) => g.bins.classes[g.bins.index(summary.states[st][single2.id].keepRate!)];
    for (const st of ["WI", "CO", "NJ", "OR"]) expect(arm(st).hue, st).toBe("loss");
    expect(arm("WI").ramp).toBe(4);
    // New Mexico keeps the most, so it sits on the keep arm's top step.
    expect(arm("NM")).toEqual(g.bins.classes[g.bins.classes.length - 1]);
    expect(arm("NM").hue).toBe("keep");
    expect(valueOf(summary.states.NM[single2.id], "keepRate")).toBeCloseTo(0.3042, 4);
  });
  it("the road's two lifted-out groups are its own facts: no cliff on the road, and a road that runs off the axis", () => {
    const count = measureByKey("roadCliffCount")!, worst = measureByKey("roadWorst")!;
    const g = group(rowsFor(summary, single2, count), count);
    expect(g.none.map((r) => r.st)).toContain("NM");
    for (const r of g.none) expect(r.m.roadCliffCount).toBe(0);
    for (const r of g.ranked) expect(r.m.roadCliffCount).toBeGreaterThan(0);
    // Where the road collapses plots the worst road cliff's drop.
    const gw = group(rowsFor(summary, single2, worst), worst);
    expect(gw.ranked[0].value).toBe(summary.states[gw.ranked[0].st][single2.id].roadWorst!.drop);
    expect(valueOf(summary.states.MO[single2.id], "roadWorst")).toBe(16_428);
    // No cell of the committed sweep has a road off its axis, so the path is
    // pinned on a synthetic one: keepRate null is what says the road is gone.
    const off: SummaryJson = { ...fixture, states: { ...fixture.states,
      JJ: { "single-1": metrics({ keepRate: null, roadLo: null, roadHi: null, roadCliffCount: 0, roadWorst: null }), "married-1": metrics() } },
      coverage: { ...fixture.coverage, JJ: coverage() } };
    for (const m of [measureByKey("keepRate")!, count, worst]) {
      const rows = rowsFor(off, single1, m);
      expect(rows.find((r) => r.st === "JJ")!.kind, m.key).toBe("past");
      expect(group(rows, m).past.map((r) => r.st), m.key).toEqual(["JJ"]);
    }
    // On a whole-axis measure the same cell is an ordinary row: the road is not its subject.
    expect(rowsFor(off, single1, loss).find((r) => r.st === "JJ")!.kind).toBe("shaded");
    expect(lowerTitle("road", 1)).toBe("The road runs off the axis (1)");
    expect(lowerNote("road", 1, null)).toMatch(/^This household's road out of poverty falls outside/);
  });
  it("says a rate the way core words it, in the room each place has", () => {
    const mo = summary.states.MO[single2.id].keepRate!;
    expect(keepShort(mo)).toBe("loses 56¢");
    expect(keepPhrase(mo)).toBe("loses 56¢ of each extra dollar");
    expect(keepTick(mo)).toBe("−56¢");
    const nm = summary.states.NM[single2.id].keepRate!;
    expect(keepShort(nm)).toBe("keeps 30¢");
    expect(keepPhrase(nm)).toBe("keeps 30¢ of each extra dollar");
    expect(keepTick(nm)).toBe("+30¢");
    // Zero keeps nothing and loses nothing, and says so.
    expect(keepShort(0)).toBe("keeps 0¢");
    expect(keepTick(0)).toBe("0¢");
  });
});
