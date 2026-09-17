// The table twin, the assumed list with its corrections, the SourceNote's
// states and the reach and hours sentences.
import { describe, expect, test } from "vitest";
import type { SummaryJson } from "@hotgap/core";
import { assumedRows, boundaryText, hoursText, incompleteText, provenanceText, reachSourceText, reachText, subText, sweepFor, whoText } from "./facts.js";
import { makeEvaluation } from "./fixture.js";
import { sceneOf } from "./model.js";
import { tableRows } from "./table.js";

const year = { unit: "year" };

describe("tableRows", () => {
  test("the peak, the household, the exit, every cliff in the window and safe-from-here, each keep read off the plotted curve", () => {
    const s = sceneOf(makeEvaluation(), year);
    const rows = tableRows(s);
    // The deferred $72k step counts (2026-09-17), so it opens the last zone and safe-from-here moves from $67k to $74k.
    expect(rows.map((r) => [r.at, r.mark])).toEqual([
      [41_000, "The top of your flat stretch"], [42_000, "A drop"], [43_000, "You now"], [46_000, "Back to even"],
      [55_000, "A drop"], [72_000, "A drop that waits"], [74_000, "Safe from here"],
    ]);
    for (const r of rows) if (r.mark !== "You now") expect(r.keep).toBe(s.net[s.idx(r.at)]);
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
      "Help you get: Food help (SNAP), cash help (TANF cash assistance), a free state health plan (Medicaid), and food help for moms and babies (WIC). We count each as if you get it.",
      "Not counted: Child care help (CCDF child care subsidy), housing help (Housing voucher), free early learning (Head Start), and help with heating bills (LIHEAP energy assistance). We count them as if you do not get them.",
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
      "Health plan help: Colorado premium assistance, up to $960 a year. It helps pay for health insurance. We counted it.",
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
    vintages: { model: { endpoint: "engine", version: "2.6.2" }, rent: { publisher: "HUD", vintage: "FY2026 revised schedule (effective 2025-10-01)" },
      county: { publisher: "", vintage: "" }, childcare: { preschool: "county 2018" }, reach: { basis: "", vintages: ["2024-1yr"], growthFactor: 1.07 } },
  } },
} as unknown as SummaryJson;

describe("SourceNote", () => {
  test("live: the household's own numbers; the rent vintage only when the rent is the state's typical one", () => {
    const s = sceneOf(makeEvaluation(), year);
    expect(provenanceText(s, null)).toBe("Source: HotGap, from PolicyEngine with 2026 rules. These are your own numbers. Money kept is what is left after taxes and health-plan premiums.");
    expect(provenanceText(s, sweepFor(summary, "CO"))).toBe("Source: HotGap, from PolicyEngine with 2026 rules. These are your own numbers. Rent: HUD Fair Market Rents, FY2026 revised schedule (effective 2025-10-01). Money kept is what is left after taxes and health-plan premiums.");
    const own = sceneOf(makeEvaluation({ answers: { ...makeEvaluation().answers, monthlyRent: 1200 } }), year);
    expect(provenanceText(own, sweepFor(summary, "CO"))).not.toMatch(/Rent:/);
  });
  test("archetype: the sweep's model and stamp produced the numbers, and the child-care price vintage applies", () => {
    const s = sceneOf(makeEvaluation({ source: "archetype" }), year);
    expect(provenanceText(s, sweepFor(summary, "CO"))).toBe("Source: HotGap, from policyengine-us 2.6.2 with 2026 rules. Sweep of Sep 16, 2026. Rent: HUD Fair Market Rents, FY2026 revised schedule (effective 2025-10-01). Child care price: county 2018, grown to 2026 dollars. Money kept is what is left after taxes and health-plan premiums.");
    expect(provenanceText(s, null)).toBe("Source: HotGap, from PolicyEngine. Rules for 2026. Money kept is what is left after taxes and health-plan premiums.");
  });
  test("the child-care gap counts for a child through CHILDCARE_MAX_AGE with paid care, the one rule every surface uses (audit D7)", () => {
    const withCare = { ...summary, coverage: { CO: { ...summary.coverage!.CO, unmodeled: [{ program: "Child-care subsidy (CCDF)", note: "" }] } } } as SummaryJson;
    const ev = (ages: number[], care: number | null) => makeEvaluation({ answers: { ...makeEvaluation().answers, childAges: ages, childDisabled: ages.map(() => false), monthlyChildcare: care } });
    expect(incompleteText(sceneOf(ev([7], 900), year), sweepFor(withCare, "CO"))).toMatch(/Child-care subsidy/);
    expect(incompleteText(sceneOf(ev([12], 900), year), sweepFor(withCare, "CO"))).toMatch(/Child-care subsidy/);
    expect(incompleteText(sceneOf(ev([13], 900), year), sweepFor(withCare, "CO"))).toBeNull();
    expect(incompleteText(sceneOf(ev([7], null), year), sweepFor(withCare, "CO"))).toBeNull();
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
    expect(whoText(sceneOf(makeEvaluation(), year))).toBe("A parent with 2 kids, ages 3 and 7, in Colorado.");
    expect(whoText(sceneOf(makeEvaluation({ answers: { ...makeEvaluation().answers, childAges: [], childDisabled: [], married: true } }), year))).toBe("A couple with no kids, in Colorado.");
    expect(reachText(sceneOf(makeEvaluation({ reach: { current: 3, safeExit: null } }), year))).toMatch(/^Fewer than 1 in 10/);
    expect(reachText(sceneOf(makeEvaluation({ reach: { current: 97, safeExit: null } }), year))).toMatch(/^Almost all/);
    expect(reachText(sceneOf(makeEvaluation({ reach: { current: null, safeExit: null } }), year))).toBeNull();
    expect(reachSourceText(sceneOf(makeEvaluation(), year), sweepFor(summary, "CO"))).toBe("From U.S. Census Bureau survey data (ACS 2024, 1-year). Grown to 2026 dollars.");
  });
  test("hours: the state's minimum wage and full-time pay at it, to $500", () => {
    expect(hoursText(sceneOf(makeEvaluation(), year))).toBe("Colorado's lowest legal pay is $15.16 an hour. Full-time work at that pay is about $31,500 a year.");
    expect(hoursText(sceneOf(makeEvaluation({ minWage: null }), year))).toBeNull();
  });
});

describe("EligibilityBoundary (#23)", () => {
  const boundary = (over = {}) => ({
    component: "heating" as const, earningsLimit: 39_975, householdIncomeLimit: 39_975, limit: { kind: "fpg" as const, pct: 150 },
    topBand: { min: 1200, max: 1200 }, shape: "staircase" as const, servedShare: 0.03, upstream: null, counted: false,
    sources: { limits: "https://liheapch.acf.gov/delivery/income_eligibility.htm", amounts: null, served: null }, readOn: "2026-09-16", note: "", ...over,
  });
  /* The paragraph as the page prints it: the facts, then the invitation when there is one. */
  const said = (b: ReturnType<typeof boundaryText>) => (b ? b.facts + (b.invite ? ` ${b.invite}` : "") : null);
  test("says the three facts and invites the toggle as its own sentence; a range, a flat figure or an unread amount; the served share as families in ten", () => {
    const tx = boundaryText(sceneOf(makeEvaluation({ liheap: boundary() }), year))!;
    expect(tx.facts).toBe("Above $40,000 a year, you can no longer apply for help with heating bills in Colorado. It is called LIHEAP. It is worth $1,200 a winter if you get it. Fewer than 1 in 10 families who could get it here do.");
    expect(tx.invite).toBe("If you get it, turn it on to see it in your line.");
    expect(said(boundaryText(sceneOf(makeEvaluation({ liheap: boundary({ topBand: { min: 355, max: 430 }, servedShare: 0.18 }) }), year))))
      .toContain("It is worth $355 to $430 a winter if you get it. About 2 in 10 families who could get it here do.");
    expect(said(boundaryText(sceneOf(makeEvaluation({ liheap: boundary({ servedShare: 0.85 }) }), year)))).toContain("About 9 in 10 families who could get it here do.");
    expect(said(boundaryText(sceneOf(makeEvaluation({ liheap: boundary({ servedShare: 0.96 }) }), year)))).toContain("Almost all families who could get it here do.");
    expect(said(boundaryText(sceneOf(makeEvaluation({ liheap: boundary({ topBand: null, servedShare: null }) }), year))))
      .toContain("We could not read what it pays. We do not know how many families who could get it here do.");
    expect(boundaryText(sceneOf(makeEvaluation({ liheap: null }), year))).toBeNull();
  });
  test("where the state pays its heating help as a credit already in the line (Michigan), says so, names no worth and invites nothing; the take-up list leaves it out (review B1)", () => {
    const mi = boundary({ earningsLimit: 29_315, limit: { kind: "fpg" as const, pct: 110 }, topBand: { min: 1, max: 2205 }, shape: "taper" as const, servedShare: 0.85, upstream: { variable: "mi_home_heating_credit", counted: "state credit" as const } });
    const s = sceneOf(makeEvaluation({ liheap: mi }), year);
    expect(boundaryText(s)).toEqual({ facts: "Help with heating bills in Colorado is a tax credit. It is already in your line. It gets smaller as you earn more and runs out above $29,500 a year. About 9 in 10 families who could get it here do.", invite: null });
    const rows = assumedRows(s).map((r) => r.text);
    expect(rows.find((t) => t.startsWith("Child care help"))).toBe("Child care help (CCDF child care subsidy), housing help (Housing voucher), and free early learning (Head Start). We count them as if you do not get them.");
    expect(rows.join(" ")).not.toContain("heating");
    // The toggle on adds nothing there, so the list still does not say heating help is counted as if got.
    const on = sceneOf(makeEvaluation({ liheap: mi, answers: { ...makeEvaluation().answers, getsEnergyAssistance: true } }), year);
    expect(assumedRows(on).map((r) => r.text).join(" ")).not.toContain("heating");
  });
  test("with the toggle on, says only that it was counted, and the tick leaves the picture", () => {
    const s = sceneOf(makeEvaluation({ liheap: boundary({ counted: true }) }), year);
    expect(said(boundaryText(s))).toMatch(/^You said you get help with heating bills \(LIHEAP\)\. We put it in your line: about \$\d[\d,]* a year, up to \$40,000 a year\.$/);
    // The tick marks a limit the household has NOT crossed; counted, there is no limit left to mark.
    // It is no longer a question of a window: since the curve scrolls, the whole axis is the picture.
    expect(s.boundaryOnAxis).toBe(false);
    expect(sceneOf(makeEvaluation({ liheap: boundary() }), year).boundaryOnAxis).toBe(true);
  });
});
