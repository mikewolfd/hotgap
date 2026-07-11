import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parsePEResponse, analyzeCurve, escapeAnalysis, type CurvePoint, type ProgramId } from "@hotgap/shared";
import { narrate, narrateEscape, narratePlacesEscape, formatWage, formatDollars, formatAgeList } from "./narration.js";

const ZERO_PROGRAMS: Record<ProgramId, number> = {
  snap: 0, medicaid: 0, chip: 0, eitc: 0, ctc: 0, aca: 0,
  tanf: 0, housing: 0, wic: 0, ssi: 0, headstart: 0, schoolmeals: 0,
};
function pt(earnings: number, netIncome: number): CurvePoint {
  return { earnings, netIncome, medicalOOP: 0, programs: { ...ZERO_PROGRAMS } };
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

// ADAPTATION, re-verified against the health-adjusted (Plan 4) fixture: the
// brief's draft used currentEarnings=20000 and assumed `analysis.nextCliff`
// would be the big $30k Head Start cliff. On the real fixture that
// assumption is false: at $20k there is a SMALLER, earlier cliff at
// $23k->$24k (TANF phases out, drop ~$1,660.88), and `nextCliff` picks the
// FIRST cliff at/after current earnings, not the worst one. That smaller
// cliff also opens a danger zone spanning $23k-$28k. So we use
// currentEarnings=29000, past the TANF cliff's recovery zone (verdict is not
// "in_danger_zone").
//
// Plan 4 update: folding real medical out-of-pocket costs into netIncome
// makes a NEW, small cliff visible right at $29k->$30k that did not exist
// before. At $30k this household loses Medicaid and must instead carry real
// ACA premiums/OOP (medicalOOP jumps from $0 to ~$1,090), on top of losing
// the last of SNAP and some EITC -- a combined drop of ~$988 that clears
// CLIFF_MIN. So `nextCliff` from $29k now finds THIS cliff first, not the
// bigger $30k->$31k Head Start/EITC/ACA-eligibility cliff (still
// `worstCliff`, drop ~$22,089 -- see analyze.test.ts). This is the intended
// effect of Plan 4: losing Medicaid, previously invisible in net income, now
// shows up as a real cliff.
describe("narrate on the CA fixture at $29k (real next cliff: the new $29k->$30k Medicaid health-cost cliff)", () => {
  const n = narrate(analyzeCurve(points, 29000), { unit: "hour", hoursPerWeek: 40 });
  it("picks the cliff_ahead headline with the cliff wage", () => {
    expect(n.headline).toContain("Watch out");
    expect(n.headline).toContain("$14 an hour"); // 29000/(40*52) = 13.94 -> rounds to 14.00
  });
  it("mentions the size of the drop in the body", () => {
    expect(n.body).toContain("$1,000"); // drop ~$988.12 rounds to nearest $100
  });
  it("lists Medicaid among the why-items with a lostNear wage (losing it now costs real money via health-adjusted net income)", () => {
    const medicaid = n.whyItems.find((w) => w.programLabel.includes("Medicaid"));
    expect(medicaid).toBeDefined();
    expect(medicaid!.lostNear).toContain("$14 an hour");
  });
  it("lists Head Start as a current-value why-item with no lostNear (its own bigger cliff is one step further, at $30k)", () => {
    const headstart = n.whyItems.find((w) => w.programLabel.includes("Head Start"));
    expect(headstart).toBeDefined();
    expect(headstart!.lostNear).toBeNull();
    expect(headstart!.currentValue).not.toBe("$0");
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

// Plan 4: the health-adjusted curve subtracts the real cost of health
// coverage (SPM medical out-of-pocket) from netIncome everywhere -- narrate()
// must surface that cost explicitly at the household's current pay, not just
// fold it in silently. Uses the same real CA fixture and nearest-point logic
// as the $29k/$20k describes above.
describe("narrate healthCostLine (Plan 4: the health cost surfaced explicitly)", () => {
  it("is null while the household is still on Medicaid (medicalOOP is $0 at this pay)", () => {
    const n = narrate(analyzeCurve(points, 20000), { unit: "hour", hoursPerWeek: 40 });
    expect(n.healthCostLine).toBeNull();
  });

  it("names the real cost of health coverage once the household pays for it (at $30k, medicalOOP ~$1,090 rounds to $1,100)", () => {
    const n = narrate(analyzeCurve(points, 30000), { unit: "hour", hoursPerWeek: 40 });
    expect(n.healthCostLine).toContain("$1,100 a year");
    expect(n.healthCostLine).toMatch(/health coverage/i);
  });

  it("is null when the exact point's medicalOOP is 0, even with cliffs/programs present (mkPoint's default of 0)", () => {
    const n = narrate(analyzeCurve([pt(0, 10000), pt(10000, 8000), pt(20000, 15000)], 5000), { unit: "year" });
    expect(n.healthCostLine).toBeNull();
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

// ADAPTATION: the plan's context note counted 6 programEnds entries on this
// fixture (tanf/snap/headstart/eitc/medicaid/aca) and expected only aca
// dropped by the max-5 cap. The real fixture's escapeAnalysis() also phases
// out ctc (child tax credit) at 44000 -- a 7th entry the plan's note didn't
// account for. Sorted ascending that inserts BEFORE eitc/medicaid, so the
// top-5 cap actually drops the two HIGHEST entries, medicaid and aca, not
// just aca. Verified directly against escapeAnalysis(points).programEnds
// (see shared/src/escape.test.ts's own pins for tanf/snap/headstart/eitc,
// which this does not contradict -- it only asserts the ADDITIONAL ctc entry
// and the resulting top-5 slice).
describe("narrateEscape on the real CA fixture", () => {
  const esc = escapeAnalysis(points);
  const n = narrateEscape(esc, { unit: "hour", hoursPerWeek: 40 });

  it("names the safe-exit wage (91000/2080 = 43.75 -> rounds to $43.75/hr)", () => {
    expect(n.safeLine).toContain("$43.75 an hour");
  });

  it("names the leap in dollars (45000, not wage-rounded)", () => {
    expect(n.leapLine).toContain("$45,000");
    expect(n.leapLine).not.toContain("more than");
  });

  it("lists thresholds ascending, capped at 5, dropping the two highest (medicaid, aca)", () => {
    expect(n.thresholds).toHaveLength(5);
    expect(n.thresholds[0].label).toContain("TANF");
    expect(n.thresholds.some((th) => th.label.includes("insurance"))).toBe(false); // aca dropped
    expect(n.thresholds.some((th) => th.label.includes("Medicaid"))).toBe(false); // medicaid dropped too
  });

  it("orders thresholds by ascending earnings", () => {
    const wages = n.thresholds.map((th) => th.wage);
    // tanf(23000) < snap(29000) < headstart(30000) < ctc(44000) < eitc(50000)
    expect(wages[0]).toBe("$11 an hour"); // 23000/2080 = 11.058 -> rounds to $11.00
    expect(wages[4]).toBe("$24 an hour"); // 50000/2080 = 24.038 -> rounds to $24.00
  });
});

describe("narrateEscape branch coverage", () => {
  it("returns null safeLine when safeExitEarnings is 0 (always-up verdict already says it)", () => {
    const n = narrateEscape(
      { safeExitEarnings: 0, leap: 0, leapIsLowerBound: false, programEnds: {}, benefitsEndEarnings: null },
      { unit: "year" },
    );
    expect(n.safeLine).toBeNull();
    expect(n.leapLine).toBeNull();
    expect(n.thresholds).toHaveLength(0);
  });

  it("uses the honest safeNever line when safeExitEarnings is null", () => {
    const n = narrateEscape(
      { safeExitEarnings: null, leap: 20000, leapIsLowerBound: true, programEnds: {}, benefitsEndEarnings: null },
      { unit: "year" },
    );
    expect(n.safeLine).toContain("did not find a fully safe spot");
  });

  it("uses the leapMore variant ('at least') when leapIsLowerBound is true", () => {
    const n = narrateEscape(
      { safeExitEarnings: null, leap: 20000, leapIsLowerBound: true, programEnds: {}, benefitsEndEarnings: null },
      { unit: "year" },
    );
    expect(n.leapLine).toContain("at least $20,000");
    expect(n.leapLine).not.toContain("more than");
  });

  it("returns null leapLine when leap is 0", () => {
    const n = narrateEscape(
      { safeExitEarnings: 0, leap: 0, leapIsLowerBound: false, programEnds: {}, benefitsEndEarnings: null },
      { unit: "year" },
    );
    expect(n.leapLine).toBeNull();
  });
});

// Task 24: the places-door drill-down (StatePanel) speaks the same
// escapeAnalysis fields with different, third-person copy and dollar (not
// wage) amounts for safe/leap — thresholds stay identical to narrateEscape's
// (same t() keys, fixed year unit).
describe("narratePlacesEscape", () => {
  it("names the safe-exit amount in dollars, not a wage rate", () => {
    const n = narratePlacesEscape({
      safeExitEarnings: 74000, leap: 46000, leapIsLowerBound: false, programEnds: {}, benefitsEndEarnings: null,
    });
    expect(n.safeLine).toContain("$74,000");
    expect(n.safeLine).toContain("fully safe here");
  });

  it("uses the honest safeNever line when safeExitEarnings is null", () => {
    const n = narratePlacesEscape({
      safeExitEarnings: null, leap: 20000, leapIsLowerBound: true, programEnds: {}, benefitsEndEarnings: null,
    });
    expect(n.safeLine).toContain("still hits rough spots here");
  });

  it("returns null safeLine when safeExitEarnings is 0", () => {
    const n = narratePlacesEscape({
      safeExitEarnings: 0, leap: 0, leapIsLowerBound: false, programEnds: {}, benefitsEndEarnings: null,
    });
    expect(n.safeLine).toBeNull();
    expect(n.leapLine).toBeNull();
  });

  it("names the leap in dollars, one-move framing", () => {
    const n = narratePlacesEscape({
      safeExitEarnings: 74000, leap: 46000, leapIsLowerBound: false, programEnds: {}, benefitsEndEarnings: null,
    });
    expect(n.leapLine).toContain("$46,000");
    expect(n.leapLine).toContain("in one move");
    expect(n.leapLine).not.toContain("more than");
  });

  it("uses the leapMore variant ('at least') when leapIsLowerBound is true", () => {
    const n = narratePlacesEscape({
      safeExitEarnings: null, leap: 20000, leapIsLowerBound: true, programEnds: {}, benefitsEndEarnings: null,
    });
    expect(n.leapLine).toContain("at least $20,000");
    expect(n.leapLine).not.toContain("more than");
  });

  it("lists thresholds in year-unit wages, ascending, capped at 5", () => {
    const n = narratePlacesEscape({
      safeExitEarnings: 74000, leap: 46000, leapIsLowerBound: false,
      programEnds: { tanf: 23000, snap: 29000 }, benefitsEndEarnings: null,
    });
    expect(n.thresholds).toEqual([
      { label: "cash help (TANF)", wage: "$23,000 a year" },
      { label: "food help (SNAP)", wage: "$29,000 a year" },
    ]);
  });
});
