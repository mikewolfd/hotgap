import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parsePEResponse } from "./parse.js";
import { analyzeCurve } from "./analyze.js";
import { point as pt, type PointOver } from "./testing.js";

const fixture = JSON.parse(
  readFileSync(new URL("../../fixtures/pe-ca-single-1kid-101.json", import.meta.url), "utf8"),
);
const fixturePoints = parsePEResponse(fixture, 101);

describe("analyzeCurve on synthetic curves", () => {
  it("finds no cliffs on a monotonic curve", () => {
    const pts = [pt(0, 10000), pt(10000, 15000), pt(20000, 21000)];
    const a = analyzeCurve(pts, 5000);
    expect(a.cliffs).toHaveLength(0);
    expect(a.dangerZones).toHaveLength(0);
    expect(a.verdict).toBe("always_up");
  });

  it("detects a cliff, its danger zone, and recovery point", () => {
    const pts = [pt(0, 20000), pt(10000, 30000), pt(20000, 22000), pt(30000, 28000), pt(40000, 34000)];
    const a = analyzeCurve(pts, 5000);
    expect(a.cliffs).toHaveLength(1);
    expect(a.cliffs[0]).toMatchObject({ startEarnings: 10000, endEarnings: 20000, drop: 8000 });
    expect(a.dangerZones).toHaveLength(1);
    expect(a.dangerZones[0].startEarnings).toBe(10000);
    expect(a.dangerZones[0].endEarnings).toBe(40000); // first point with net > 30000
    expect(a.verdict).toBe("cliff_ahead");
    expect(a.nextCliff?.startEarnings).toBe(10000);
  });

  it("reports in_danger_zone with escape earnings when current sits underwater", () => {
    const pts = [pt(0, 20000), pt(10000, 30000), pt(20000, 22000), pt(30000, 28000), pt(40000, 34000)];
    const a = analyzeCurve(pts, 25000);
    expect(a.verdict).toBe("in_danger_zone");
    expect(a.escapeEarnings).toBe(40000);
  });

  it("reports cliff_behind when all cliffs are below current earnings", () => {
    const pts = [pt(0, 20000), pt(10000, 30000), pt(20000, 22000), pt(30000, 40000), pt(40000, 46000)];
    const a = analyzeCurve(pts, 35000);
    expect(a.verdict).toBe("cliff_behind");
  });

  it("interpolates currentNet linearly between points", () => {
    const pts = [pt(0, 0), pt(10000, 10000)];
    expect(analyzeCurve(pts, 5000).currentNet).toBe(5000);
  });

  it("reports in_danger_zone for cumulative erosion even when no single step is a cliff", () => {
    // Each step drops < CLIFF_MIN (no cliffs), but the cumulative drop from the
    // running max exceeds CLIFF_MIN, opening a zone that never recovers.
    const pts = [pt(0, 30000), pt(10000, 29900), pt(20000, 29850), pt(30000, 29750), pt(40000, 29600)];
    const a = analyzeCurve(pts, 25000);
    expect(a.cliffs).toHaveLength(0);
    expect(a.verdict).toBe("in_danger_zone");
  });
});

describe("cliff attribution", () => {
  it("splits a drop into benefits, credits, premiums and other, summing to the drop", () => {
    const pts = [
      pt(10000, 30000, { programs: { snap: 3000, eitc: 2000 }, otherBenefits: 500, medicalOOP: 0 }),
      pt(11000, 24000, { programs: { snap: 0, eitc: 1000 }, otherBenefits: 0, medicalOOP: 1200 }),
    ];
    const [c] = analyzeCurve(pts, 0).cliffs;
    expect(c.drop).toBe(6000);
    expect(c.breakdown.benefits).toBe(3500);   // snap 3000 + untracked remainder 500
    expect(c.breakdown.credits).toBe(1000);    // eitc 2000 -> 1000
    expect(c.breakdown.premiums).toBe(1200);
    // The residual absorbs taxes and the step's own wage gain, so the four
    // shares always add back to the drop exactly.
    const { benefits, credits, premiums, other } = c.breakdown;
    expect(benefits + credits + premiums + other).toBeCloseTo(c.drop, 9);
    expect(other).toBe(300);
  });

  it("keeps coverage sticker values out of the breakdown while still naming the loss", () => {
    // A child ages off Medicaid: a real event worth reporting, but the sticker
    // value is not cash and is not inside netIncome, so it explains no dollars.
    const pts = [
      pt(10000, 30000, { programs: { medicaid: 12000, snap: 1000 } }),
      pt(11000, 29000, { programs: { medicaid: 0, snap: 0 } }),
    ];
    const [c] = analyzeCurve(pts, 0).cliffs;
    expect(c.programsLost).toContain("medicaid");
    expect(c.breakdown.benefits).toBe(1000);
    expect(c.breakdown.credits).toBe(0);
    expect(c.breakdown.benefits + c.breakdown.credits + c.breakdown.premiums + c.breakdown.other).toBeCloseTo(c.drop, 9);
  });

  it("names a program lost only at a notch, never on a phase-down", () => {
    const pts = [
      pt(10000, 30000, { programs: { snap: 3000, eitc: 2000, tanf: 2000, wic: 50 } }),
      pt(11000, 25000, { programs: { snap: 2400, eitc: 0, tanf: 900, wic: 0 } }),
    ];
    const [c] = analyzeCurve(pts, 0).cliffs;
    // snap tapered 20% — not a loss. eitc switched off, tanf lost more than
    // half. wic never cleared PROGRAM_END_MIN, so its going to 0 is nothing.
    expect(c.programsLost).toEqual(["eitc", "tanf"]);
  });

  it("never counts the premium tax credit as a credit: it only reaches net income through the premium", () => {
    // A pure 400%-FPL step: the credit ends, the net premium rises by the same
    // amount, and PolicyEngine's own net income actually rose $704.
    const before = pt(106000, 50000, { medicalOOP: 500, programs: { aca: 6000 } });
    const after = pt(107000, 44704, { medicalOOP: 6500, programs: { aca: 0 } });
    const c = analyzeCurve([before, after], 0).cliffs[0];
    expect(c.breakdown).toEqual({ benefits: 0, credits: 0, premiums: 6000, other: -704 });
    expect(c.programsLost).toEqual(["aca"]); // the credit really did end
    expect(c.driver).toBe("premiums");
  });

  it("names a program only when its loss explains a real share of the drop", () => {
    // SNAP $300 → $0 is a notch, but 4% of a fall that was all premium.
    const before = pt(40000, 60000, { medicalOOP: 0, programs: { snap: 300 } });
    const after = pt(41000, 53153, { medicalOOP: 7216, programs: { snap: 0 } });
    const c = analyzeCurve([before, after], 0).cliffs[0];
    expect(c.programsLost).toEqual([]);
    expect(c.driver).toBe("premiums");
    expect(c.breakdown.benefits).toBe(300);
  });

  it("reports a zero breakdown when a drop is all tax and wage effects", () => {
    const pts = [pt(10000, 30000), pt(11000, 29000)];
    const [c] = analyzeCurve(pts, 0).cliffs;
    expect(c.breakdown).toEqual({ benefits: 0, credits: 0, premiums: 0, other: 1000 });
    expect(c.programsLost).toEqual([]);
  });
});

describe("attribution per person-group", () => {
  it("names a program a parent loses while the children keep it", () => {
    // The household total falls from $12,000 to $6,000 — exactly half, so the
    // household test's \"loses more than half\" bar is not cleared and the
    // parent's end went unnamed. 94 of 271 adult Medicaid ends on cliff steps
    // in the 2026-09 sweep were this shape.
    const pts = [
      pt(50000, 40000, { programs: { medicaid: 12000 }, childPrograms: { medicaid: 6000 } }),
      pt(51000, 38000, { programs: { medicaid: 6000 }, childPrograms: { medicaid: 6000 }, medicalOOP: 2500 }),
    ];
    const [c] = analyzeCurve(pts, 0).cliffs;
    expect(c.programsLost).toEqual(["medicaid"]);
  });

  it("names it the same way when the children lose it and the parent keeps it", () => {
    const pts = [
      pt(50000, 40000, { programs: { medicaid: 12000 }, childPrograms: { medicaid: 6000 } }),
      pt(51000, 38000, { programs: { medicaid: 6000 }, childPrograms: {}, medicalOOP: 2500 }),
    ];
    expect(analyzeCurve(pts, 0).cliffs[0].programsLost).toEqual(["medicaid"]);
  });

  it("still catches a household total two people each hold below the floor", () => {
    // Neither group clears PROGRAM_END_MIN on its own, so only the household
    // total can see this one — which is why it stays in the list.
    const pts = [
      pt(50000, 40000, { programs: { wic: 160 }, childPrograms: { wic: 80 } }),
      pt(51000, 39600, { programs: { wic: 0 }, childPrograms: {} }),
    ];
    expect(analyzeCurve(pts, 0).cliffs[0].programsLost).toEqual(["wic"]);
  });

  it("keeps the share rule on the group's own loss, not the household's", () => {
    // The parent's $500 of Medicaid is 17% of a $3,000 fall: a real end, but
    // not what the money did, so it is not named.
    const pts = [
      pt(50000, 40000, { programs: { medicaid: 6500 }, childPrograms: { medicaid: 6000 } }),
      pt(51000, 37000, { programs: { medicaid: 6000 }, childPrograms: { medicaid: 6000 }, medicalOOP: 3200 }),
    ];
    const [c] = analyzeCurve(pts, 0).cliffs;
    expect(c.programsLost).toEqual([]);
    expect(c.driver).toBe("premiums");
  });
});

describe("state refundable credits in the breakdown", () => {
  it("counts a state credit ending as credits, not as an unexplained residual", () => {
    // Colorado's state child tax credit and family affordability credit sit in
    // household_refundable_tax_credits, inside net income, alongside the
    // federal pair (verified live 2026-09-15).
    const pts = [
      pt(26000, 40000, { programs: { eitc: 2000 }, stateCredits: 3000 }),
      pt(27000, 38800, { programs: { eitc: 2000 }, stateCredits: 1800 }),
    ];
    const [c] = analyzeCurve(pts, 0).cliffs;
    expect(c.breakdown).toEqual({ benefits: 0, credits: 1200, premiums: 0, other: 0 });
    expect(c.driver).toBe("credits");
  });

  it("still sums to the drop exactly with a state credit in play", () => {
    const pts = [
      pt(26000, 40000, { programs: { eitc: 2000, snap: 1000 }, stateCredits: 3000, medicalOOP: 100 }),
      pt(27000, 34000, { programs: { eitc: 1000, snap: 0 }, stateCredits: 0, medicalOOP: 900 }),
    ];
    const { breakdown, drop } = analyzeCurve(pts, 0).cliffs[0];
    expect(breakdown.credits).toBe(4000);
    expect(breakdown.benefits + breakdown.credits + breakdown.premiums + breakdown.other).toBeCloseTo(drop, 9);
  });

  it("leaves the nonrefundable part of the CTC out of credits entirely", () => {
    // The whole credit is flat at $6,600 while the refundable part falls: a
    // rising tax bill absorbed it. That is a tax effect, never a credit loss.
    const pts = [
      pt(44000, 40000, { programs: { ctc: 1200 }, totalCtc: 6600 }),
      pt(45000, 39200, { programs: { ctc: 0 }, totalCtc: 6600 }),
    ];
    const [c] = analyzeCurve(pts, 0).cliffs;
    expect(c.breakdown.credits).toBe(1200);
    expect(c.breakdown.other).toBe(-400);
    expect(c.breakdown.benefits + c.breakdown.credits + c.breakdown.premiums + c.breakdown.other).toBeCloseTo(c.drop, 9);
  });
});

describe("deferred cliffs", () => {
  const coverage = (over: PointOver) => pt(50000, 40000, over);
  const after = (over: PointOver) => pt(51000, 34000, over);

  it("defers a Head Start end to the end of the program year", () => {
    const pts = [
      coverage({ programs: { headstart: 12000 }, childPrograms: { headstart: 12000 } }),
      after({ programs: {}, childPrograms: {} }),
    ];
    const [c] = analyzeCurve(pts, 0).cliffs;
    expect(c.programsLost).toEqual(["headstart"]);
    expect(c.deferral?.reason).toBe("head_start_program_year");
    expect(c.deferral?.until).toContain("45 CFR 1302.12(j)(1)");
    expect(c.deferral?.complete).toBe(true);
  });

  it("defers a child's Medicaid or CHIP end by 12-month continuous eligibility", () => {
    const pts = [
      coverage({ programs: { chip: 4000 }, childPrograms: { chip: 4000 } }),
      after({ programs: {}, childPrograms: {}, medicalOOP: 6000 }),
    ];
    const [c] = analyzeCurve(pts, 0).cliffs;
    expect(c.deferral?.reason).toBe("child_continuous_eligibility");
    expect(c.deferral?.until).toContain("42 CFR 435.926");
  });

  it("defers a parent's Medicaid end only when there is a child to make it a 1931 family", () => {
    const pts = [
      coverage({ programs: { medicaid: 9000 } }),
      after({ programs: {}, medicalOOP: 6000 }),
    ];
    expect(analyzeCurve(pts, 0, { hasChildren: true }).cliffs[0].deferral?.reason)
      .toBe("transitional_medical_assistance");
    // A childless adult losing expansion Medicaid gets no §1925 continuation.
    expect(analyzeCurve(pts, 0, { hasChildren: false }).cliffs[0].deferral).toBeNull();
    expect(analyzeCurve(pts, 0).cliffs[0].deferral).toBeNull();
  });

  it("defers a premium jump that is a deferred coverage end with no program named", () => {
    // The parent's $500 of Medicaid is too small a share of the fall to be
    // named, but it is the whole reason the premium appeared.
    const pts = [
      coverage({ programs: { medicaid: 500 }, medicalOOP: 0 }),
      after({ programs: {}, medicalOOP: 6000 }),
    ];
    const [c] = analyzeCurve(pts, 0, { hasChildren: true }).cliffs;
    expect(c.programsLost).toEqual([]);
    expect(c.driver).toBe("premiums");
    expect(c.deferral?.reason).toBe("transitional_medical_assistance");
  });

  it("labels a cliff that also loses something the household feels this month, without treating the whole drop as later", () => {
    const pts = [
      coverage({ programs: { headstart: 12000, snap: 3000 }, childPrograms: { headstart: 12000 } }),
      after({ programs: { snap: 0 }, childPrograms: {} }),
    ];
    const [c] = analyzeCurve(pts, 0, { hasChildren: true }).cliffs;
    expect(c.programsLost).toEqual(["snap", "headstart"]);
    expect(c.deferral?.reason).toBe("head_start_program_year");
    expect(c.deferral?.complete).toBe(false);
  });

  it("leaves an ordinary cliff undeferred", () => {
    const pts = [coverage({ programs: { snap: 4000 } }), after({ programs: {} })];
    expect(analyzeCurve(pts, 0, { hasChildren: true }).cliffs[0].deferral).toBeNull();
  });
});

describe("analyzeCurve on the real CA fixture", () => {
  it("finds the verified $22k Head Start cliff at $30k earnings", () => {
    const a = analyzeCurve(fixturePoints, 20000);
    expect(a.worstCliff).not.toBeNull();
    expect(a.worstCliff!.startEarnings).toBe(30000);
    expect(a.worstCliff!.drop).toBeGreaterThan(20000);
    expect(a.worstCliff!.programsLost).toContain("headstart");
    expect(a.verdict).toBe("cliff_ahead");
  });
});
