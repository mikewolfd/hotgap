// The pure model against the committed Colorado sweep — the household
// design/caseworker.html froze (single parent, kids 3 and 7, $38,000),
// evaluated offline through core, so every expected figure below is one the
// mockup's audit screenshots carry and a reader can check against the file.
import { analyzeCurve, cliffsBetween, evaluateOffline, loadSummary, rawAnswersFromFlags, reachCell, validateAnswers, type HouseholdEvaluation, type UnmodeledProgram } from "@hotgap/core";
import { describe, expect, it } from "vitest";
import { dateWords, listOf, lossFigure, ordinal, signedMoney } from "../lib/format.js";
import {
  againLine, answerParts, answerText, assumed, chartLabel, cite, cliffSentence, compareNote, compareRows, handout, incompleteHere, incompleteStates, ledgerNote, ledgerRows,
  modeled, notInSweep, onTheWay, reachSentence, sourceLine, tiles, unclaimedNote,
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

describe("figures, through Intl in the locale (lib/format.ts)", () => {
  it("prints a loss with a true minus, a share with its sign, an ordinal, a list and a date", () => {
    expect(lossFigure(25449.4)).toBe("−$25,449");
    expect(signedMoney(-874.6)).toBe("−$875");
    expect(signedMoney(383)).toBe("+$383");
    expect([1, 2, 3, 4, 11, 12, 13, 21, 40, 51, 83, 100].map(ordinal)).toEqual(["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "40th", "51st", "83rd", "100th"]);
    expect(listOf(["SNAP"])).toBe("SNAP");
    expect(listOf(["SNAP", "WIC"])).toBe("SNAP and WIC");
    expect(listOf(["SNAP", "WIC", "TANF"])).toBe("SNAP, WIC, and TANF");
    // The reader's own zone (the shell's dateWords): 01:16 UTC on the 17th is the 16th in New York, and the 17th only in UTC.
    expect(dateWords("2026-09-16T16:13:51.445Z", "America/New_York")).toBe("Sep 16, 2026");
    expect(dateWords("2026-09-17T01:16:58.798Z", "America/New_York")).toBe("Sep 16, 2026");
    expect(dateWords("2026-09-17T01:16:58.798Z", "UTC")).toBe("Sep 17, 2026");
  });
});

/* Rewritten 2026-09-18 with the page (design/PICTURE-FIRST-2026-09-18.md): the
   verdict's three sentences became ONE — the figure's own caption, professional
   and in the third person — and the zones beyond this one became `againLine`,
   at the head of the disclosure a counselor opens second. The figures are the
   same figures, off the same sweep; what moved is how many sentences carry them. */
describe("the answer, one sentence in the caseworker register", () => {
  it("names the household's own zone, its exit and the raise that clears it — and nothing else", () => {
    /* It counts the steps that lose money rather than saying every raise does (design/TASKS.md § Danger-zone sentences). */
    expect(answerText(co)).toBe("Net income — pay plus help, after taxes and premiums — stays below its $84,732 peak (at $36,000) until $45,000: 2 of the 9 $1,000 raises between them lose money; $7,000 clears the stretch.");
    /* Each dollar figure wears the key of the mark it names, so the sentence doubles as the chart's key. */
    expect(answerParts(co).flatMap((p) => ("slot" in p ? [[p.slot, p.text, p.key]] : []))).toEqual([
      ["peak", "$84,732", null],
      ["start", "$36,000", "hg-amt hg-amt--gap"],
      ["exit", "$45,000", "hg-amt hg-amt--gap"],
      ["nSteps", "9", null],
      ["step", "$1,000", null],
      ["raise", "$7,000", "hg-amt hg-amt--gap"],
    ]);
  });
  it("says the zones beyond it, and where they end, one press away rather than in the answer", () => {
    expect(againLine(co)).toBe("It happens again between $45,000 and $119,000. Safe from $119,000: a raise of $73,000.");
    expect(answerText(co)).not.toContain("again");
  });
  it("has one sentence for every curve shape", () => {
    const shape = (patch: Partial<HouseholdEvaluation["analysis"]>, personal: Partial<HouseholdEvaluation["personal"]> = {}) =>
      answerText({ ...co, analysis: { ...co.analysis, ...patch }, personal: { ...co.personal, ...personal } });
    expect(shape({ verdict: "always_up" })).toBe("Every raise leaves this family better off; nothing drops anywhere up to $150,000.");
    expect(shape({ verdict: "cliff_behind" })).toBe("The worst is behind this family: from $55,000 up, every raise is more money.");
    expect(shape({ verdict: "cliff_ahead", nextCliff: { startEarnings: 54000 } as never })).toBe("This family is clear up to $55,000; past it a raise costs about $25,449 a year.");
    expect(shape({}, { raiseIsLowerBound: true })).toBe("Net income — pay plus help, after taxes and premiums — stays below its $84,732 peak (at $36,000) past the top of the axis, $150,000: 8 of the 114 $1,000 raises between them lose money.");
    /* Every one of them is one sentence. */
    for (const s of [shape({ verdict: "always_up" }), shape({ verdict: "cliff_behind" }), answerText(co)]) {
      expect(s.split(/\.\s/).length).toBe(1);
    }
  });
});

/* The SF household of design/TASKS.md (94110, kids 3 and 7, $30,000), as a curve of its shape: net peaks at $44,985 at $28,000,
   drops three times inside the zone and first passes the peak again at $43,000. Built through core's analyzeCurve on the CO axis. */
const shaped = (netAt: (e: number) => number, current: number): HouseholdEvaluation => {
  const points = co.curve.points.map((p) => ({ ...p, netIncome: netAt(p.earnings) }));
  const analysis = analyzeCurve(points, current, { hasChildren: true });
  const zone = analysis.dangerZones.find((z) => current > z.startEarnings && (z.endEarnings === null || current < z.endEarnings)) ?? null;
  return {
    ...co, curve: { ...co.curve, currentEarnings: current, points }, analysis,
    personal: { ...co.personal, zone, escapeEarnings: zone?.endEarnings ?? null, raiseToClear: zone ? (zone.endEarnings ?? 150_000) - current : null, raiseIsLowerBound: zone !== null && zone.endEarnings === null },
  };
};
const sfNet = (e: number): number => {
  const k = e / 1000;
  if (k <= 28) return 44_985 - (28 - k) * 700;
  if (k <= 33) return 43_000 + (k - 29) * 300;   /* the first drop, $28k → $29k */
  if (k <= 38) return 43_200 + (k - 34) * 300;   /* the second, $33k → $34k */
  if (k <= 43) return 43_400 + (k - 39) * 400;   /* the third, $38k → $39k; $45,000 at $43k clears the $44,985 peak */
  return 45_000 + (k - 43) * 700;
};

describe("the answer counts the steps (design/TASKS.md § Danger-zone sentences)", () => {
  it("says how many of the zone's steps lose money for the SF household, not that every raise does", () => {
    const sf = shaped(sfNet, 30_000);
    expect(sf.personal.zone).toEqual({ startEarnings: 28_000, endEarnings: 43_000, peakNet: 44_985 });
    expect(answerText(sf)).toBe("Net income — pay plus help, after taxes and premiums — stays below its $44,985 peak (at $28,000) until $43,000: 3 of the 15 $1,000 raises between them lose money; $13,000 clears the stretch.");
  });
  it("calls a next cliff the family climbs back out of within three steps a dip, and says where it is ahead again", () => {
    const dip = shaped((e) => (e <= 28_000 ? sfNet(e) : e === 29_000 ? 43_000 : e === 30_000 ? 44_500 : 45_100 + (e - 31_000) * 0.7), 25_000);
    expect(dip.analysis.verdict).toBe("cliff_ahead");
    expect(answerText(dip)).toBe("This family is clear up to $29,000; there it dips by about $1,985 and is ahead again by $31,000.");
    /* The SF curve's first cliff opens a fifteen-step zone: no dip, the plain sentence. */
    expect(answerText(shaped(sfNet, 25_000))).toBe("This family is clear up to $29,000; past it a raise costs about $1,985 a year.");
  });
});

describe("the tiles", () => {
  it("are net, the raise, the household's own next cliff, the whole-axis worst below it, and reach with its margin from the cell (Plan 9's demotion)", () => {
    const t = tiles(co, reachCell("CO", "single-2"));
    expect(t.map((x) => [x.label, x.value, x.sub])).toEqual([
      ["Net, after premiums", "$84,371", "at $38,000 earned"],
      ["Raise to clear the zone", "$7,000", "to $45,000 earned"],
      ["Next cliff", "$305", "at $41,000 → $42,000 (42 in 100 families like this earn less)"],
      ["Largest drop anywhere on the curve", "$25,449", "at $54,000 → $55,000 (50 in 100 families like this earn less)"],
      /* R7: the range in percentiles, read back through the ladder; M13: the reading in words and the sample in words. */
      ["Reach at current earnings", "40th", "percentile (34th–44th allowing for survey error): 40 in 100 families like this earn less. Survey sample: 393 households."],
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
  it("bites on a premium program always, on child care only with a paying young child, on LIHEAP never — the rule is lib/coverage.ts's, over this surface's answers", () => {
    expect(incompleteHere({ ...cov, unmodeled: [liheap, premium, care] }, co.answers)).toEqual(["NJ Health Plan Savings"]);
    expect(incompleteHere({ ...cov, unmodeled: [care] }, { ...co.answers, monthlyChildcare: 1000 })).toEqual([care.program]);
    expect(incompleteHere({ ...cov, unmodeled: [care] }, { ...co.answers, monthlyChildcare: 0 })).toEqual([]);
    expect(incompleteHere({ ...cov, unmodeled: [care] }, { ...co.answers, monthlyChildcare: 1000, childAges: [15] })).toEqual([]);
  });
  it("reads the state's block and counts the states that would mark this household, from the file", () => {
    expect(incompleteHere(cov, co.answers)).toEqual([]);
    expect(incompleteHere({ ...cov, unmodeled: [premium, liheap] }, co.answers)).toEqual(["NJ Health Plan Savings"]);
    /* The committed sweep hatches nobody since 2026-09-16 (NJ and WA became
       complete), so the count is exercised on a copy with one state marked
       and the empty answer is read from the file rather than typed. */
    const marked = { ...summary, coverage: { ...summary.coverage!, NJ: { ...cov, unmodeled: [premium, liheap] } } };
    expect(incompleteStates(marked, co.answers)).toEqual(["NJ"]);
    const states = incompleteStates(summary, co.answers);
    expect(states).toEqual(Object.entries(summary.coverage!).filter(([, c]) => c.unmodeled.some((u) => u.program !== "LIHEAP")).map(([st]) => st).sort());
    expect(states).toEqual([]);
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
      // EligibilityBoundary (#23): Colorado's 60% of state median income for three, $69,935 — a row the household never crossed, off the axis grid.
      [69935, "liheap", "Household", false],
      [73000, "chip", "Children", true],
      [107000, "aca", "Household", false],
    ]);
    const boundary = rows.find((r) => r.id === "liheap")!;
    expect(boundary.boundary).toBe(true);
    expect(boundary.cliff).toBeUndefined();
    expect(boundary.credit).toBeUndefined();
    // The tag says "if you apply"; the cite leads with the basis and does not say it again (liheap review S3).
    expect(cite(co, boundary, cov)).toBe("60% of state median income, the heating limit. Worth $200–$1,000 at that band if received; 16% of income-eligible households were served in FY2024. Not counted unless the household says it gets it. Read 2026-09-16.");
  });
  it("in Michigan the row is where the counted Home Heating Credit tapers out: no tag, a cite that says it is counted, and a take-up sentence that leaves it out (liheap review B1)", () => {
    const mi = evaluateOffline(answers({ state: "MI", kids: "3,7", earnings: "20000" }))!, miCov = summary.coverage!.MI;
    const row = ledgerRows(mi).find((r) => r.id === "liheap")!;
    expect(mi.liheap?.upstream?.counted).toBe("state credit");
    expect([row.boundary, row.credit, row.cliff]).toEqual([true, true, undefined]);
    expect(cite(mi, row, miCov)).toBe("Paid as the Home Heating Credit, a refundable state credit PolicyEngine models and HotGap counts in state credits; it tapers out by the state's limit, 110% of the poverty guideline, so it is not a cliff. 85% of income-eligible households were served in FY2024. Assumes heat is not included in rent; the credit halves when it is. Read 2026-09-16.");
    expect(cite(mi, row, undefined)).toMatch(/^Paid as a refundable state credit PolicyEngine models/);
    // On the archetype path the swept household (heat not in rent) is what was modelled; a live household that said heat is in the rent reads its own answer.
    const withHeat = { ...mi, source: "live" as const, answers: { ...mi.answers, heatInRent: true } };
    expect(cite(withHeat, row, miCov)).toContain("Heat is included in the rent, so the credit is halved.");
    const takeUp = assumed(mi, miCov).find((t) => /^Take-up assumed/.test(t))!;
    expect(takeUp).not.toContain("LIHEAP");
    expect(assumed(co, cov).find((t) => /^Take-up assumed/.test(t))).toContain("LIHEAP");
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
    // One sentence per fact since the copy shape landed (audit D13): the zone count and the household's own zone are two sentences, not a semicolon.
    expect(chartLabel(co)).toBe("Net income after premiums against earnings, $0 to $150,000. 4 danger zones. This household's runs from $36,000 to $45,000, cleared by a raise of $7,000. The largest step down is $25,449 at $54,000 where CCDF child care subsidy ends. Safe from $119,000.");
    expect(cliffSentence(co.analysis.cliffs[6])).toBe("Cliff at $53,000 to $54,000: −$2,444. SNAP and WIC end. Driver: benefits.");
  });
});

describe("CompareTable", () => {
  const raise = evaluateOffline(answers({ state: "CO", kids: "3,7", earnings: "55000" }))!;
  it("answers the same rows for the base and for a what-if", () => {
    const rows = compareRows(co);
    expect(rows.map((r) => [r.label, r.cell(co), r.cell(raise)])).toEqual([
      ["Net after premiums", "$84,371", "$55,924"],
      ["Change from now", "—", "−$28,447"],
      ["Of each extra dollar, now → this what-if", "keeps 1¢ of the next $10,000", "loses 167¢ of each extra dollar on average"],
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
  it("keeps rate is Δnet ÷ Δpay against the base, through keepRateWords and road.rate — never a rate for a column whose pay did not change (a take-up toggle)", () => {
    const keep = compareRows(co).find((r) => r.label === "Of each extra dollar, now → this what-if")!;
    // $17,000 more pay, $28,447 less net (the $54k→$55k childcare cliff sits in the stretch): loses $1.673 of every extra dollar.
    expect(keep.cell(raise)).toBe("loses 167¢ of each extra dollar on average");
    const toggle = evaluateOffline(answers({ state: "CO", kids: "3,7", earnings: "38000", married: true }))!;
    expect(toggle.analysis.currentEarnings).toBe(co.analysis.currentEarnings);   /* same pay as the base: a toggle, not a raise */
    expect(keep.cell(toggle)).toBe("—");
    /* The base column is never measured against itself: it says its own next stretch (keepNext), and a dash only with none left. */
    expect(keep.cell(co)).toBe("keeps 1¢ of the next $10,000");
    expect(keep.cell({ ...co, personal: { ...co.personal, keepNext: null } })).toBe("—");
  });
});

describe("on the way (Plan 9): the cliffs a pay what-if crosses, from core's own cliffsBetween", () => {
  const raise = evaluateOffline(answers({ state: "CO", kids: "3,7", earnings: "55000" }))!;
  it("equals cliffsBetween on the base's own cliffs, in earnings order, each with its position", () => {
    const items = onTheWay(co, raise)!;
    const expected = cliffsBetween(co.analysis.cliffs, 38000, 55000);
    expect(items).toHaveLength(expected.length);
    expect(items.map((i) => i.deferred)).toEqual(expected.map((c) => c.deferral !== null));
    // The first is a credits phase-out with no named program (a step, not a program ending); the last is the childcare cliff the tiles and the ledger already carry.
    expect(items[0].text).toBe("$41,000 — a step down (−$305)");
    expect(items[0].position).toBe("42 in 100 families like this earn less");
    expect(items.at(-1)!.text).toBe("$54,000 — child care help ends (−$25,449)");
  });
  it("carries the DeferredBadge flag on a deferred cliff", () => {
    const cliffs = co.analysis.cliffs;
    const at41k = cliffs.find((c) => c.startEarnings === 41000)!;
    const deferred = { ...at41k, deferral: { reason: "transitional_medical_assistance", until: "next renewal", complete: true } as never };
    const withDeferred = { ...co, analysis: { ...co.analysis, cliffs: cliffs.map((c) => (c === at41k ? deferred : c)) } };
    expect(onTheWay(withDeferred, raise)!.map((i) => i.deferred)).toEqual([true, false, false, false, false]);
  });
  it("is null for a toggle what-if whose pay did not move — no list, not an empty one", () => {
    const toggle = evaluateOffline(answers({ state: "CO", kids: "3,7", earnings: "38000", married: true }))!;
    expect(onTheWay(co, toggle)).toBeNull();
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
    expect(lines[2]).toBe("Take-up assumed for SNAP, TANF cash assistance, Medicaid, WIC, and CCDF child care subsidy; not for Head Start, Housing voucher, and LIHEAP energy assistance.");
    // LIHEAP is a boundary on every block since Plan 7, never an unmodeled row: core's sentence on why, verbatim (#23).
    expect(lines.some((l) => /Not modelled in Colorado: LIHEAP/.test(l))).toBe(false);
    expect(lines.at(-1)).toMatch(/^Energy assistance \(LIHEAP\) in Colorado: HotGap shows where energy assistance \(LIHEAP\) stops in this state — 60% of state median income — .*16% of its income-eligible households in FY2024.*\.$/);
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
  it("cites the rent and child-care sources only when the curve used them (policy review R8)", () => {
    const live = (a: Partial<typeof co.answers>) => sourceLine({ ...co, source: "live", answers: { ...co.answers, ...a } }, prov);
    const none = live({ monthlyRent: null, monthlyChildcare: null });
    expect(none).toContain("Rent: none entered (no SNAP shelter deduction taken). Child-care price: none entered.");
    expect(none).not.toContain("HUD");
    expect(none).not.toContain("county 2015");
    expect(live({ monthlyRent: 900, monthlyChildcare: 400 })).toContain("Rent: as entered. Child-care price: as entered.");
    // No children, no child-care line at all.
    expect(live({ childAges: [], childDisabled: [], monthlyRent: null, monthlyChildcare: null })).not.toContain("Child-care price");
  });
  it("says what \"the same shape\" matches on, and that it is not the children's ages (policy review R15)", () => {
    expect(reachSentence(co)).toContain("Same shape means the same marital status, the same number of earners (one or two) and the same number of children under 18 (three or more pooled), with a householder aged 18–64; children's ages are not matched.");
  });
  it("never lists WIC as taken up or not for a household with no child under five (marketing review M5)", () => {
    const older = assumed({ ...co, source: "live", answers: { ...co.answers, childAges: [7, 9] } }, cov);
    expect(older[2]).not.toContain("WIC");
    expect(assumed(co, cov)[2]).toContain("WIC");
  });
  it("names the programs turned off that would pay", () => {
    expect(unclaimedNote(co)).toBe("");
    expect(unclaimedNote({ ...co, unclaimed: [{ program: "snap", annual: 4853 }] })).toBe("Off for this household: SNAP would pay $4,853 a year at $38,000.");
  });
});

describe("the client sheet", () => {
  it("opens with the pay and the money kept, then the citizen catalog's sentence and the same thresholds in plain words", () => {
    const h = handout(co, summary);
    expect(h.title).toBe("Your pay and your help — Colorado, one parent, two children");
    // The two facts the citizen answer gave up on 2026-09-18 (design/PICTURE-FIRST-2026-09-18.md): on the
    // screen the pay is in the ScenarioBar and the money kept is the label on the diamond; paper has
    // neither, so the sheet's first line carries them. They are the same figures the page's own diamond and
    // its chips show — an evaluation's, not a re-derivation.
    expect(h.paragraphs[0]).toBe("You're paid $38,000 a year, and with help counted you keep $84,371.");
    expect(h.paragraphs[0]).toContain(`$${co.analysis.currentEarnings.toLocaleString("en-US")}`);
    // Then the citizen page's own answer for this household (audit D4): the in-zone shape (the drop behind it, the rate to the exit),
    // then "again" from the next zone's start. One catalog, one sentence, on both surfaces.
    expect(h.paragraphs[1]).toBe("Your pay is past a drop at $38,000. From here to $45,000 you keep about 5¢ of each extra dollar; at $45,000 you're back to what you'd have kept at $36,000. Further up, from $46,000 to $119,000, a raise again doesn't leave you better off than you were at $46,000.");
    expect(h.paragraphs[2]).toBe("$29,379 of what you keep is child care help paid straight to your day care.");
    expect(h.paragraphs[3]).toBe("The biggest drop is at $55,000 of pay: child care help ends and you keep $25,449 less. Food help ends at $54,000.");
    expect(h.paragraphs[4]).toBe("Your kids' health plan ends at $73,000 of pay — but not that year. It ends at their next yearly check, up to 12 months later.");
  });
});
