// The table twin, the assumed list with its corrections, the SourceNote's
// states and the reach and hours sentences.
import { describe, expect, test } from "vitest";
import type { SummaryJson } from "@hotgap/core";
import { assumedRows, hoursText, incompleteText, provenanceText, reachSourceText, reachText, subText, sweepFor } from "./facts.js";
import { makeEvaluation } from "./fixture.js";
import { sceneOf } from "./model.js";
import { tableRows } from "./table.js";

const year = { unit: "year" };

describe("tableRows", () => {
  test("the peak, the household, the exit, every cliff in the window and safe-from-here, each keep read off the plotted curve", () => {
    const s = sceneOf(makeEvaluation(), year);
    const rows = tableRows(s);
    expect(rows.map((r) => [r.at, r.mark])).toEqual([
      [41_000, "The top of your flat stretch"], [42_000, "A drop"], [43_000, "You now"], [46_000, "Back to even"],
      [55_000, "A drop"], [67_000, "Safe from here"], [72_000, "A drop that waits"],
    ]);
    for (const r of rows) if (r.mark !== "You now") expect(r.keep).toBe(s.lifted[s.idx(r.at)]);
    expect(rows.filter((r) => r.drop).map((r) => r.drop)).toEqual([2500, 9000, 1500]);
  });
  test("a household with no zone has no peak or exit row; no cliffs, no drop rows", () => {
    const rows = tableRows(sceneOf(makeEvaluation({}, 30_000, { snapCliff: false, careCliff: false, deferredCliff: false }), year));
    expect(rows).toEqual([{ at: 30_000, keep: 44_000, mark: "You now" }]);
  });
});

describe("under the answer", () => {
  test("names the largest non-cash part of 'you keep' and the health cost that comes out", () => {
    expect(subText(sceneOf(makeEvaluation(), year))).toBe(
      "You keep more than your pay because help and tax money are part of it. $20,000 of this is child care help. It goes to your day care, not to you. $1,200 a year for your health plan comes out first.");
    expect(subText(sceneOf(makeEvaluation({}, 80_000), year))).toBe("You keep less than your pay because taxes and health costs come out of it. $1,200 a year for your health plan comes out first.");
  });
});

describe("what we assumed", () => {
  test("the household the curve was run for, in the citizen register", () => {
    expect(assumedRows(sceneOf(makeEvaluation(), year)).map((r) => `${r.label}: ${r.text}`)).toEqual([
      "Rent: $1,735 a month. The usual rent in Colorado.",
      "Child care: None. Nobody in the home pays for day care.",
      "Help you get: Food help (SNAP), cash help (TANF cash assistance), a free state health plan (Medicaid) and food help for moms and babies (WIC). We count each as if you get it.",
      "Not counted: Child care help (CCDF child care subsidy), housing help (Housing voucher) and free early learning (Head Start). We count them as if you do not get them.",
      "You: Age 30. A U.S. citizen. No one in the home has a disability.",
      "Other money: Savings: None. No child support, SSDI or unemployment pay.",
      "Hours: Not given. We assume full time.",
    ]);
  });
  test("a rent and a child-care bill the person gave are said as theirs", () => {
    const ev = makeEvaluation({ answers: { ...makeEvaluation().answers, monthlyRent: 1200, monthlyChildcare: 900 } });
    const rows = assumedRows(sceneOf(ev, year)).map((r) => r.text);
    expect(rows[0]).toBe("$1,200 a month. You gave this.");
    expect(rows[1]).toBe("$900 a month for two kids. You gave this.");
  });
  test("the corrections that shaped this household's numbers become rows, and unclaimed help is priced", () => {
    const ev = makeEvaluation({
      coverageGap: { fromEarnings: 4000, toEarnings: 21_000 },
      esi: { tier: "plusOne", annualContribution: 2600 },
      headStart: { stickerValue: 22_000, replacementValue: 15_000, monthlyReplacementCost: 1250, usesStateMarketPrice: true, deferred: true },
      statePremiumAssistance: { state: "CO", variable: "x", program: "Colorado premium assistance", maxAnnual: 960 },
      maTafdc: { status: "applied", linkedBenefitsRecomputed: true, message: "" },
      unclaimed: [{ program: "snap", annual: 3053 }, { program: "wic", annual: 724 }],
    });
    const rows = assumedRows(sceneOf(ev, year)).map((r) => `${r.label}: ${r.text}`);
    expect(rows).toEqual(expect.arrayContaining([
      "Health plan from a job: $2,600 a year comes out of your pay for it.",
      "Head Start: Worth $15,000 a year to you: what day care would cost.",
      "No health plan: From $4,000 a year to $21,000 a year you would have no health plan at all: no Medicaid and no help to buy one. We counted no health plan cost there.",
      "Health plan help: Colorado premium assistance, up to $960 a year. Colorado helps pay for health insurance. We counted it.",
      "Cash help (TANF): We used the state's rule for people already on it. Not the first-year rule.",
      "Help you could get: You said you do not get food help (SNAP) and food help for moms and babies (WIC). At your pay it would be worth about $3,800 a year.",
    ]));
  });
  test("the archetype path describes the swept household, not the person's echoed answers", () => {
    const ev = makeEvaluation({ source: "archetype", answers: { ...makeEvaluation().answers, monthlyRent: null, savings: 5000, age: 52 } });
    const s = sceneOf(ev, year);
    expect(s.modeled.monthlyRent).not.toBeNull();
    expect(s.modeled.age).toBe(30);
    expect(s.modeled.getsChildcareSubsidy).toBe(true);
    const rows = assumedRows(s).map((r) => r.text);
    expect(rows[0]).toMatch(/The usual rent in Colorado\./);
    expect(rows[1]).toMatch(/a month for two kids\. The usual price of day care in Colorado\./);
  });
});

const summary = {
  generated: "2026-09-16T20:15:49.275Z", year: "2026", model: { endpoint: "engine", version: "2.6.2" }, archetypes: [], states: {},
  coverage: { CO: {
    corrections: {} as never, unmodeled: [{ program: "LIHEAP", note: "" }, { program: "Colorado Premium Help", note: "" }], otherBenefits: [],
    vintages: { model: { endpoint: "engine", version: "2.6.2" }, rent: { publisher: "HUD", vintage: "FY2026 (effective 2025-10-01), revised schedule" },
      county: { publisher: "", vintage: "" }, childcare: { preschool: "county 2018" }, reach: { basis: "", vintages: ["2024-1yr"], growthFactor: 1.07 } },
  } },
} as unknown as SummaryJson;

describe("SourceNote", () => {
  test("live: the household's own numbers; the rent vintage only when the rent is the state's typical one", () => {
    const s = sceneOf(makeEvaluation(), year);
    expect(provenanceText(s, null)).toBe("Source: HotGap, from PolicyEngine with 2026 rules. These are your own numbers. Money kept is what is left after taxes and health-plan premiums.");
    expect(provenanceText(s, sweepFor(summary, "CO"))).toBe("Source: HotGap, from PolicyEngine with 2026 rules. These are your own numbers. Rent: HUD Fair Market Rents, FY2026. Money kept is what is left after taxes and health-plan premiums.");
    const own = sceneOf(makeEvaluation({ answers: { ...makeEvaluation().answers, monthlyRent: 1200 } }), year);
    expect(provenanceText(own, sweepFor(summary, "CO"))).not.toMatch(/Rent:/);
  });
  test("archetype: the sweep's model and stamp produced the numbers, and the child-care price vintage applies", () => {
    const s = sceneOf(makeEvaluation({ source: "archetype" }), year);
    expect(provenanceText(s, sweepFor(summary, "CO"))).toBe("Source: HotGap, from policyengine-us 2.6.2 with 2026 rules. Sweep of 2026-09-16. Rent: HUD Fair Market Rents, FY2026. Child care price: county 2018, grown to 2026 dollars. Money kept is what is left after taxes and health-plan premiums.");
    expect(provenanceText(s, null)).toBe("Source: HotGap, from PolicyEngine. Rules for 2026. Money kept is what is left after taxes and health-plan premiums.");
  });
  test("the incomplete notice names every unmodeled program but LIHEAP, and nothing without the sweep", () => {
    const s = sceneOf(makeEvaluation(), year);
    expect(incompleteText(s, sweepFor(summary, "CO"))).toBe(" Colorado has Colorado Premium Help. Our math does not include it. A drop could be missing from this page.");
    expect(incompleteText(s, null)).toBeNull();
    const liheapOnly = { ...summary, coverage: { CO: { ...summary.coverage!.CO, unmodeled: [{ program: "LIHEAP", note: "" }] } } } as SummaryJson;
    expect(incompleteText(s, sweepFor(liheapOnly, "CO"))).toBeNull();
  });
});

describe("reach and hours", () => {
  test("reach is how common the pay is, never odds; the count rounds to tenths", () => {
    expect(reachText(sceneOf(makeEvaluation(), year))).toBe("About 4 in 10 parents like you in Colorado are paid $43,000 a year or less. The count could be off by a few thousand dollars either way.");
    expect(reachText(sceneOf(makeEvaluation({ reach: { current: 3, safeExit: null } }), year))).toMatch(/^Fewer than 1 in 10/);
    expect(reachText(sceneOf(makeEvaluation({ reach: { current: 97, safeExit: null } }), year))).toMatch(/^Almost all/);
    expect(reachText(sceneOf(makeEvaluation({ reach: { current: null, safeExit: null } }), year))).toBeNull();
    expect(reachSourceText(sceneOf(makeEvaluation(), year), sweepFor(summary, "CO"))).toBe("From U.S. Census Bureau survey data, ACS 2024 1-year PUMS. Grown to 2026 dollars.");
  });
  test("hours: the state's minimum wage and full-time pay at it, to $500", () => {
    expect(hoursText(sceneOf(makeEvaluation(), year))).toBe("Colorado's lowest legal pay is $15.16 an hour. Full-time work at that pay is about $31,500 a year.");
    expect(hoursText(sceneOf(makeEvaluation({ minWage: null }), year))).toBeNull();
  });
});
