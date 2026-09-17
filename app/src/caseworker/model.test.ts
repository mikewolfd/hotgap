// The pure model against the committed Colorado sweep — the household
// design/caseworker.html froze (single parent, kids 3 and 7, $38,000),
// evaluated offline through core, so every expected figure below is one the
// mockup's audit screenshots carry and a reader can check against the file.
import { evaluateOffline, loadSummary, rawAnswersFromFlags, reachCell, validateAnswers, type HouseholdEvaluation, type UnmodeledProgram } from "@hotgap/core";
import { describe, expect, it } from "vitest";
import { fmt } from "./copy.js";
import {
  assumed, bitesHousehold, chartLabel, cite, cliffSentence, compareNote, compareRows, handout, incompleteHere, incompleteStates, ledgerNote, ledgerRows,
  lifted, modeled, notInSweep, sourceLine, tiles, unclaimedNote, verdict,
} from "./model.js";

const answers = (flags: Record<string, string | boolean>) => {
  const v = validateAnswers(rawAnswersFromFlags(flags));
  if (!v.ok) throw new Error(v.detail);
  return v.value;
};
const co = evaluateOffline(answers({ state: "CO", kids: "3,7", earnings: "38000" }))!;
const summary = loadSummary();
const cov = summary.coverage!.CO;
const prov = { cov, summary, county: null };

describe("figures, through Intl in the locale", () => {
  it("prints a loss with a true minus, a share with its sign, an ordinal, a list and a date", () => {
    expect(fmt.loss(25449.4)).toBe("−$25,449");
    expect(fmt.signed(-874.6)).toBe("−$875");
    expect(fmt.signed(383)).toBe("+$383");
    expect([1, 2, 3, 4, 11, 12, 13, 21, 40, 51, 83, 100].map(fmt.ordinal)).toEqual(["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "40th", "51st", "83rd", "100th"]);
    expect(fmt.list(["SNAP"])).toBe("SNAP");
    expect(fmt.list(["SNAP", "WIC"])).toBe("SNAP and WIC");
    expect(fmt.list(["SNAP", "WIC", "TANF"])).toBe("SNAP, WIC, and TANF");
    expect(fmt.date("2026-09-16T16:13:51.445Z")).toBe("Sep 16, 2026");
  });
});

describe("the lift", () => {
  it("is the real curve when nothing is deferred, and lifts every point past a deferred step", () => {
    expect(lifted(co)).toEqual(co.curve.points.map((p) => p.netIncome));
    const deferred = { ...co.analysis.cliffs[0], deferral: { reason: "child_continuous_eligibility" as const, until: "later" } };
    const ev: HouseholdEvaluation = { ...co, deferred: [deferred] };
    const at = co.curve.points.findIndex((p) => p.earnings === deferred.startEarnings);
    const l = lifted(ev);
    expect(l[at]).toBe(co.curve.points[at].netIncome);
    expect(l[at + 1]).toBeCloseTo(co.curve.points[at + 1].netIncome + deferred.drop, 6);
  });
});

describe("the verdict, caseworker register", () => {
  it("names the household's own zone, its peak, the exit and the raise, then the zones beyond it", () => {
    const v = verdict(co);
    expect(v.line).toBe("In a danger zone. Between $36,000 and $45,000 of earnings, net never gets back to the $84,732 it reaches at $36,000. Clear at $45,000: a raise of $7,000.");
    expect(v.again).toBe("It happens again between $45,000 and $119,000.");
    expect(v.sub).toBe("It happens again between $45,000 and $119,000. Safe from $119,000: a raise of $73,000.");
  });
  it("has a sentence for every curve shape", () => {
    const shape = (patch: Partial<HouseholdEvaluation["analysis"]>, personal: Partial<HouseholdEvaluation["personal"]> = {}) =>
      verdict({ ...co, analysis: { ...co.analysis, ...patch }, personal: { ...co.personal, ...personal } }).line;
    expect(shape({ verdict: "always_up" })).toMatch(/^No danger zone/);
    expect(shape({ verdict: "cliff_behind" })).toMatch(/^Past the cliff/);
    expect(shape({ verdict: "cliff_ahead", nextCliff: { startEarnings: 54000 } as never })).toBe("A cliff ahead: at $55,000 net drops $25,449. Below it, more pay is more money.");
    expect(shape({}, { raiseIsLowerBound: true })).toMatch(/^In a danger zone with no exit on the axis\. From \$36,000 up to \$150,000/);
  });
});

describe("the tiles", () => {
  it("are net, the raise, the largest drop and reach with its margin from the cell", () => {
    const t = tiles(co, reachCell("CO", "single-2"));
    expect(t.map((x) => [x.label, x.value, x.sub])).toEqual([
      ["Net, after premiums", "$84,371", "at $38,000 earned"],
      ["Raise to clear the zone", "$7,000", "to $45,000 earned"],
      ["Largest single-step drop", "$25,449", "at $54,000 → $55,000"],
      ["Reach at current earnings", "40th", "percentile, ±$8,000 (n = 393)"],
    ]);
  });
  it("drops the reach tile without a cell, and says when the raise is a floor", () => {
    expect(tiles(co, null).map((x) => x.label)).not.toContain("Reach at current earnings");
    const stuck = tiles({ ...co, personal: { ...co.personal, raiseIsLowerBound: true, raiseToClear: 112000 } }, null)[1];
    expect(stuck.value).toBe("> $112,000");
    expect(stuck.sub).toBe("not found below $150,000");
  });
});

describe("IncompleteMarker", () => {
  const liheap: UnmodeledProgram = { program: "LIHEAP", note: "" };
  const premium: UnmodeledProgram = { program: "NJ Health Plan Savings", note: "" };
  const care: UnmodeledProgram = { program: "Child-care subsidy (CCDF)", note: "" };
  it("bites on a premium program always, on child care only with a paying young child, on LIHEAP never", () => {
    expect(bitesHousehold(liheap, co.answers)).toBe(false);
    expect(bitesHousehold(premium, co.answers)).toBe(true);
    expect(bitesHousehold(care, { ...co.answers, monthlyChildcare: 1000 })).toBe(true);
    expect(bitesHousehold(care, { ...co.answers, monthlyChildcare: 0 })).toBe(false);
    expect(bitesHousehold(care, { ...co.answers, monthlyChildcare: 1000, childAges: [15] })).toBe(false);
  });
  it("reads the state's block and counts the states that would mark this household, from the file", () => {
    expect(incompleteHere(cov, co.answers)).toEqual([]);
    expect(incompleteHere({ ...cov, unmodeled: [premium, liheap] }, co.answers)).toEqual(["NJ Health Plan Savings"]);
    const states = incompleteStates(summary, co.answers);
    expect(states.length).toBeGreaterThan(0);   /* today: the two states whose own premium program is unmodeled */
    expect(states).toEqual(Object.entries(summary.coverage!).filter(([, c]) => c.unmodeled.some((u) => u.program !== "LIHEAP")).map(([st]) => st).sort());
  });
});

describe("ThresholdLedger", () => {
  const rows = ledgerRows(co);
  it("ends every program at the first pay at which it is gone, adults and children apart, sorted by earnings", () => {
    expect(rows.map((r) => [r.at, r.id, r.group, r.deferred !== null])).toEqual([
      [7000, "tanf", "Household", false],
      [38000, "medicaid", "Adult", false],
      [41000, "medicaid", "Children", true],
      [54000, "snap", "Household", false],
      [54000, "wic", "Children", false],
      [55000, "childcare", "Household", false],
      [59000, "eitc", "Household", false],
      [73000, "chip", "Children", true],
      [107000, "aca", "Household", false],
    ]);
  });
  it("cites what continues, what it was worth and the care price behind the child-care row", () => {
    const by = (id: string) => rows.find((r) => r.id === id)!;
    expect(cite(co, by("snap"), cov)).toBe("$713 a year of SNAP continues at $54,000, none from $55,000.");
    expect(cite(co, by("childcare"), cov)).toBe("Worth $24,899 a year at $54,000. Care priced at $2,773 a month for 2 children (county 2015 prices, carried to 2026 dollars by the BLS Employment Cost Index).");
    expect(cite(co, by("medicaid"), cov)).toBe("Coverage ends with the raise (no deferral applies); the net premium rises $444 in the step.");
    /* S5: the premium clause only when a premium rises (Texas's coverage gap charges none). */
    const noPremium = { ...by("medicaid"), cliff: { ...by("medicaid").cliff!, breakdown: { ...by("medicaid").cliff!.breakdown, premiums: 0 } } };
    expect(cite(co, noPremium, cov)).toBe("Coverage ends with the raise (no deferral applies).");
    expect(cite(co, rows.find((r) => r.id === "medicaid" && r.group === "Children")!, cov)).toMatch(/^The children move to CHIP: \$4,548 a year of coverage from \$41,000\. Crossing this does not end it this year/);
    expect(cite(co, by("eitc"), cov)).toBe("Phases out; no step of $200 or more, so it is not a cliff.");
    expect(cite(co, by("aca"), cov)).toBe("Net premium rises $4,475 in one step; Colorado premium assistance ($1,656) ends with it.");
  });
  it("footnotes cash benefits, child coverage and the state's premium help from the coverage block, its note verbatim", () => {
    expect(ledgerNote(co, cov)).toBe(`Cash benefits never end inside this axis. Child coverage ends at $73,000, deferred. No coverage gap band: ${cov.corrections.coverageGap.note} Colorado premium assistance is modeled: netted out of the premium, up to $1,656 a year.`);
    expect(cov.corrections.coverageGap.note).toMatch(/^Expansion state/);
  });
});

describe("the chart's words", () => {
  it("says a cliff and the whole shape", () => {
    expect(cliffSentence(co.analysis.cliffs[7])).toBe("Cliff at $54,000 to $55,000: −$25,449. CCDF child care subsidy ends. Driver: benefits.");
    expect(chartLabel(co)).toBe("Net income after premiums against earnings, $0 to $150,000. 4 danger zones; this household's runs from $36,000 to $45,000, cleared by a raise of $7,000. The largest step down is $25,449 at $54,000 where CCDF child care subsidy ends. Safe from $119,000.");
    expect(cliffSentence(co.analysis.cliffs[6])).toBe("Cliff at $53,000 to $54,000: −$2,444. SNAP and WIC end. Driver: benefits.");
  });
});

describe("CompareTable", () => {
  it("answers the same rows for the base and for a what-if", () => {
    const raise = evaluateOffline(answers({ state: "CO", kids: "3,7", earnings: "55000" }))!;
    const rows = compareRows(co);
    expect(rows.map((r) => [r.label, r.cell(co), r.cell(raise)])).toEqual([
      ["Net after premiums", "$84,371", "$55,924"],
      ["Change from now", "—", "−$28,447"],
      ["In a danger zone", "Yes", "Yes"],
      ["Zone ends at", "$45,000", "$119,000"],
      ["Raise still needed", "$7,000", "$64,000"],
      ["Safe from", "$119,000", "$119,000"],
      ["Largest drop", "$25,449", "$25,449"],
      ["Adult Medicaid ends", "$38,000", "$38,000"],
      ["Child coverage ends", "$73,000", "$73,000"],
      ["Reach at these earnings", "40th", "51st"],
    ]);
  });
});

describe("a what-if the sweep cannot express (B1)", () => {
  it("is the base's own archetype curve at the same earnings; a raise or a partner is not", () => {
    expect(notInSweep(co, co)).toBe(true);
    expect(notInSweep(co, { ...co, source: "live" })).toBe(false);
    const raise = evaluateOffline(answers({ state: "CO", kids: "3,7", earnings: "55000" }))!;
    expect(notInSweep(co, raise)).toBe(false);
    const partner = evaluateOffline(answers({ state: "CO", kids: "3,7", earnings: "38000", married: true }))!;
    expect(notInSweep(co, partner)).toBe(false);
    expect(compareNote(co, [], 1)).toMatch(/so a what-if that changes something else has no figure until the live call answers\.$/);
    expect(compareNote(co, [], 2)).toMatch(/2 what-ifs that change something else have no figure/);
  });
});

describe("what the model does not include, and where the numbers came from", () => {
  it("lists the swept household's assumptions on the archetype path and the state's unmodeled programs", () => {
    const lines = assumed(co, cov);
    expect(modeled(co).monthlyRent).toBe(1735);
    expect(lines[1]).toBe("Assumed for this curve: a citizen, no savings, wages, not self-employment, no employer coverage, and no other income; aged 30.");
    expect(lines[2]).toBe("Take-up assumed for SNAP, TANF cash assistance, Medicaid, WIC, and CCDF child care subsidy; not for Head Start and Housing voucher.");
    // LIHEAP is a boundary on every block since Plan 7, never an unmodeled row (Phase 2 renders it from cov.liheap).
    expect(lines.some((l) => /Not modelled in Colorado: LIHEAP/.test(l))).toBe(false);
  });
  it("says which curve, in which words, and drops the county on an archetype", () => {
    const arche = sourceLine(co, { ...prov, county: "El Paso County" });
    expect(arche).toMatch(/Curve: committed archetype sweep \(single-2\), generated [A-Z][a-z]{2} \d{1,2}, \d{4} — not this family's own live call\. Rent: HUD/);
    expect(arche).not.toContain("El Paso");
    expect(arche).toMatch(/Child-care price: county 2015, carried to 2026 dollars/);
    expect(arche).toMatch(/Model: policyengine-us \d/);
    const live = sourceLine({ ...co, source: "live" }, { ...prov, county: "El Paso County" });
    expect(live).toContain("Curve: live PolicyEngine call for this household in El Paso County, Colorado.");
    const clamped = sourceLine({ ...co, answers: { ...co.answers, annualEarnings: 200000 } }, prov);
    expect(clamped).toContain("Pay is above the modeled range — evaluated at $38,000, the top of the sweep.");
  });
  it("names the programs turned off that would pay", () => {
    expect(unclaimedNote(co)).toBe("");
    expect(unclaimedNote({ ...co, unclaimed: [{ program: "snap", annual: 4853 }] })).toBe("Off for this household: SNAP would pay $4,853 a year at $38,000.");
  });
});

describe("the client sheet", () => {
  it("is the citizen catalog's sentence and the same thresholds in plain words", () => {
    const h = handout(co, summary);
    expect(h.title).toBe("Your pay and your help — Colorado, one parent, two children");
    expect(h.paragraphs[0]).toBe("You are paid $38,000 a year. You keep about $84,400 a year. More pay does not add to that until you are paid $45,000 a year: a raise of $7,000 a year. It happens again between $45,000 and $119,000.");
    expect(h.paragraphs[1]).toBe("$29,379 of what you keep is child care help paid straight to your day care.");
    expect(h.paragraphs[2]).toBe("The biggest drop is at $55,000 of pay: child care help ends and you keep $25,449 less. Food help ends at $54,000.");
    expect(h.paragraphs[3]).toBe("Your kids' health plan ends at $73,000 of pay — but not that year. It ends at their next yearly check, up to 12 months later.");
  });
});
