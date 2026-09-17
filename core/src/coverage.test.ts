import { describe, it, expect } from "vitest";
import { ARCHETYPES } from "./archetypes.js";
import { stateCoverage } from "./coverage.js";
import type { StateCoverage } from "./data.js";
import { NON_EXPANSION_STATES } from "./policyYear.js";
import { CHILDCARE_SUBSIDY_IN_NET_INCOME } from "./stateChildcareSubsidies.js";
import { STATE_PREMIUM_ASSISTANCE, UNMODELED_STATE_PREMIUM_ASSISTANCE } from "./statePremiumAssistance.js";
import { PER_MEMBER_PREMIUM_HELP, STATE_PREMIUM_WRAPS } from "./statePremiumWraps.js";
import { STATE_CODES } from "./states.js";
import { point, type PointOver } from "./testing.js";
import type { CurvePoint } from "./types.js";

/** A flat three-point curve; `otherBenefits` and `statePremiumAssistance` are what the tests vary. */
const curve = (over: PointOver = {}): CurvePoint[] => [0, 1000, 2000].map((earnings) => point(earnings, 10000, over));
const curves = (over?: PointOver) => Object.fromEntries(ARCHETYPES.map((a) => [a.id, curve(over)]));
const model = { endpoint: "127.0.0.1:8099", version: "2.5.0" };

describe("stateCoverage — corrections", () => {
  it("lists Texas's parent-Medicaid override per archetype with children, from policyOverridesFor", () => {
    const [override, ...rest] = stateCoverage("TX", curves()).corrections.policyOverrides;
    expect(rest).toEqual([]);
    expect(override.parameter).toBe("gov.hhs.medicaid.eligibility.categories.parent.income_limit.TX");
    expect(override.period).toBe("2026-01-01.2026-12-31");
    // The childless archetypes get no override — a parent limit needs a parent.
    expect(Object.keys(override.values).sort()).toEqual(ARCHETYPES.filter((a) => a.childAges.length).map((a) => a.id).sort());
    // Texas distinguishes one- and two-parent tables, so the same children price differently.
    expect(override.values["single-1"]).not.toBe(override.values["married-1"]);
    expect(override.source).toMatch(/^https:\/\/fhb\.hhs\.texas\.gov\//);
    expect(override.note).toContain("#9474");
  });

  it("lists New York's emptied BHP list for every archetype, and nothing for a state with no override", () => {
    const [override] = stateCoverage("NY", curves()).corrections.policyOverrides;
    expect(override.parameter).toBe("gov.hhs.basic_health_program.eligibility.expanded_income_limit_states");
    expect(Object.values(override.values)).toEqual(ARCHETYPES.map(() => []));
    expect(override.note).toContain("#9471");
    expect(stateCoverage("CA", curves()).corrections.policyOverrides).toEqual([]);
  });

  it("applies the TAFDC correction to Massachusetts alone", () => {
    expect(stateCoverage("MA", curves()).corrections.maTafdc).toMatchObject({ applies: true, note: expect.stringContaining("#9469") });
    expect(stateCoverage("CT", curves()).corrections.maTafdc.applies).toBe(false);
  });

  it("reads premium help off the sweep: modeled when every point carries it, the ladder otherwise, none when neither exists", () => {
    const modeled = stateCoverage("CA", curves({ statePremiumAssistance: 900 })).corrections.premiumAssistance;
    expect(modeled).toMatchObject({ applies: true, source: "modeled", program: "California Premium Subsidy", code: expect.stringContaining("assigned_ca_premium_subsidy") });
    // The same state on an endpoint without the variable falls back to its ladder, citing the page the ladder was read from.
    expect(stateCoverage("CA", curves()).corrections.premiumAssistance).toMatchObject({ source: "ladder", program: "California Premium Subsidy", note: expect.stringContaining("#9481"), cite: expect.stringMatching(/^https:\/\//) });
    // One archetype without the amount is enough to stand the model down (evaluate.ts needs every point).
    const mixed = { ...curves({ statePremiumAssistance: 900 }), "single-0": curve() };
    expect(stateCoverage("CA", mixed).corrections.premiumAssistance.source).toBe("ladder");
    expect(stateCoverage("CT", curves()).corrections.premiumAssistance).toMatchObject({ source: "ladder", program: "Covered Connecticut Program" });
    expect(stateCoverage("TX", curves()).corrections.premiumAssistance).toMatchObject({ applies: false, source: "none", program: null });
  });

  it("reports the per-member table as a ladder where the endpoint served no figure, and the engine's own figure where it did", () => {
    // New Jersey and Washington were "modeled nowhere" until 2026-09-16 — the
    // two hatched states. Now: the engine's variable when every point carries
    // it, the local per-member schedule otherwise, never a gap.
    const nj = stateCoverage("NJ", curves());
    expect(nj.corrections.premiumAssistance).toMatchObject({ source: "ladder", program: "NJ Health Plan Savings", code: "statePremiumWraps.ts", cite: expect.stringMatching(/^https:\/\/www\.cms\.gov\//), note: expect.stringContaining("$20 to $100 a month for each person") });
    expect(nj.corrections.premiumAssistance.note).toContain("#9224");
    expect(nj.unmodeled.map((u) => u.program)).toEqual(["LIHEAP"]);
    const wa = stateCoverage("WA", curves());
    expect(wa.corrections.premiumAssistance).toMatchObject({ source: "ladder", program: "Cascade Care Savings", note: expect.stringContaining("$55 a month for each person on the plan, up to 250%") });
    expect(stateCoverage("NJ", curves({ statePremiumAssistance: 1200 })).corrections.premiumAssistance).toMatchObject({ source: "modeled", code: expect.stringContaining("nj_njhps") });
    expect(stateCoverage("WA", curves({ statePremiumAssistance: 660 })).corrections.premiumAssistance).toMatchObject({ source: "modeled", code: expect.stringContaining("wa_cascade_care_savings") });
  });

  it("names a program modeled upstream that this sweep's endpoint did not serve, as a gap for that sweep only", () => {
    // Maryland has no local table, so a sweep without the engine's figure is a gap.
    const md = stateCoverage("MD", curves());
    expect(md.corrections.premiumAssistance).toMatchObject({ source: "none", program: "Maryland Young Adult Premium Assistance" });
    expect(md.unmodeled[0]).toMatchObject({ program: "Maryland Young Adult Premium Assistance", note: expect.stringContaining("did not serve") });
    expect(stateCoverage("MD", curves({ statePremiumAssistance: 1 })).unmodeled.map((u) => u.program)).toEqual(["LIHEAP"]);
  });

  it("writes every note for the reader who will quote it: a sentence, the issue as the cite, the code pointer beside it (S9)", () => {
    for (const state of ["TX", "MA", "CT", "CO", "NY"]) {
      const c = stateCoverage(state, curves()).corrections;
      const notes = [c.maTafdc, c.premiumAssistance, c.childcareSubsidy, c.coverageGap, ...c.policyOverrides];
      for (const n of notes) {
        expect(n.note, `${state}: ${n.note}`).toMatch(/^[A-Z].*\.$/);
        expect(n.note, `${state}: ${n.note}`).not.toMatch(/WORKAROUND|\.ts\b|household_net_income|household_health_benefits|\bFPL\b/);
      }
      for (const n of [c.maTafdc, c.premiumAssistance, c.childcareSubsidy, c.coverageGap]) expect(n.code).toMatch(/\.ts\b/);
      // Every correction that works around an upstream defect names the issue.
      for (const n of [c.childcareSubsidy, c.coverageGap]) if (n.applies) expect(n.note).toMatch(/policyengine-us #\d{4}/);
      for (const o of c.policyOverrides) expect(o.note).toMatch(/policyengine-us #\d{4}/);
    }
    expect(stateCoverage("MA", curves()).corrections.maTafdc.cite).toMatch(/^https:\/\/www\.mass\.gov\//);
  });

  it("follows the child-care inclusion list and the expansion list", () => {
    expect(stateCoverage("CO", curves()).corrections.childcareSubsidy).toMatchObject({ applies: false, source: "in net income" });
    expect(stateCoverage("CT", curves()).corrections.childcareSubsidy).toMatchObject({ applies: true, source: "added by HotGap", note: expect.stringContaining("#9405") });
    // A sweep on a model that carries #9503 counted it everywhere; the list no longer decides.
    const fixed = { ...model, countsChildcareSubsidy: true };
    expect(stateCoverage("CT", curves(), { model: fixed }).corrections.childcareSubsidy).toMatchObject({ applies: false, source: "in net income", note: expect.stringContaining("#9503") });
    expect(stateCoverage("CT", curves(), { model: { ...model, countsChildcareSubsidy: false } }).corrections.childcareSubsidy.applies).toBe(true);
    expect(stateCoverage("TX", curves()).corrections.coverageGap).toMatchObject({ applies: true, note: expect.stringContaining("#9472") });
    expect(stateCoverage("CA", curves()).corrections.coverageGap.applies).toBe(false);
  });
});

describe("stateCoverage — unmodeled and otherBenefits", () => {
  it("always names LIHEAP, and the child-care subsidy only where the sweep found it unmodeled", () => {
    expect(stateCoverage("TX", curves()).unmodeled).toEqual([{ program: "LIHEAP", note: expect.any(String), scope: "all" }]);
    const flagged = stateCoverage("TX", curves(), { childcareSubsidyUnmodeled: ["TX"] }).unmodeled.map((u) => u.program);
    expect(flagged).toEqual(["Child-care subsidy (CCDF)", "LIHEAP"]);
    expect(stateCoverage("TX", curves(), { childcareSubsidyUnmodeled: ["MA"] }).unmodeled).toHaveLength(1);
  });

  it("scopes a gap every state shares as `all` and a state's own as `state` (places review S8)", () => {
    for (const state of STATE_CODES) {
      const entries = stateCoverage(state, curves(), { childcareSubsidyUnmodeled: [state] }).unmodeled;
      for (const u of entries) expect(u.scope, `${state}: ${u.program}`).toBe(u.program === "LIHEAP" ? "all" : "state");
    }
    // NJ's premium program is modeled since the NJ/WA pass, so the state-scoped entry here is the child-care gap.
    expect(stateCoverage("NJ", curves(), { childcareSubsidyUnmodeled: ["NJ"] }).unmodeled.map((u) => [u.program, u.scope])).toEqual([["Child-care subsidy (CCDF)", "state"], ["LIHEAP", "all"]]);
    expect(stateCoverage("NJ", curves()).unmodeled.map((u) => [u.program, u.scope])).toEqual([["LIHEAP", "all"]]);
  });

  it("labels the remainder from the traced table, reports an untraced one as such, and ignores noise", () => {
    const nj = stateCoverage("NJ", { ...curves(), "single-0": curve({ otherBenefits: 450.4 }) }).otherBenefits;
    expect(nj).toEqual([{ variable: "nj_property_tax_relief", label: expect.stringContaining("ANCHOR"), maxAnnualInSweep: 450 }]);
    expect(stateCoverage("TX", curves({ otherBenefits: 800 })).otherBenefits).toEqual([{ variable: null, label: expect.stringContaining("not yet identified"), maxAnnualInSweep: 800 }]);
    expect(stateCoverage("TX", curves({ otherBenefits: 99 })).otherBenefits).toEqual([]);
    expect(stateCoverage("CA", curves()).otherBenefits).toEqual([]);
  });
});

describe("stateCoverage — vintages", () => {
  it("reads rent, county and the child-care basis off state-defaults.json, and the reach vintages off reach.json", () => {
    const { vintages } = stateCoverage("CT", curves(), { model });
    expect(vintages.model).toEqual(model);
    expect(vintages.rent.publisher).toContain("HUD");
    expect(vintages.rent.vintage).toContain("FY2026");
    expect(vintages.county.publisher).toContain("Census");
    expect(vintages.county.vintage).toContain("Vintage 2024");
    // Connecticut's most populous "county" is a planning region the 2020 gazetteer predates: the FIPS is there, the name is not.
    expect(vintages.county).toMatchObject({ fips: "09110", name: null });
    // Connecticut's planning regions post-date the NDCP, so its price is the state-median rule.
    expect(vintages.childcare).toEqual({ infant: "stateMedianCounty 2018", toddler: "stateMedianCounty 2018", preschool: "stateMedianCounty 2018", schoolAge: "stateMedianCounty 2018" });
    expect(vintages.reach).toEqual({ basis: expect.stringContaining("PUMS"), vintages: ["2024-1yr"], growthFactor: 1.067533 });
    // A small state's cells lean on the 5-Year file; the block says so.
    expect(stateCoverage("WY", curves()).vintages.reach.vintages).toEqual(["2020-2024-5yr", "2024-1yr"]);
    expect(stateCoverage("WY", curves()).vintages.model).toBeNull();
  });
});

describe("stateCoverage — the county named (places review B4)", () => {
  it("names the archetypes' county from the gazetteer, keeping a parish, a municipality and the District as published", () => {
    const county = (state: string) => stateCoverage(state, curves()).vintages.county;
    expect(county("OH")).toMatchObject({ fips: "39049", name: "Franklin County" });
    expect(county("LA").name).toBe("East Baton Rouge Parish");
    expect(county("AK").name).toBe("Anchorage Municipality");
    expect(county("DC").name).toBe("District of Columbia");
    // Every state but Connecticut has a name; every state has its FIPS.
    for (const state of STATE_CODES) {
      const c = county(state);
      expect(c.fips, state).toMatch(/^\d{5}$/);
      expect(c.name !== null, state).toBe(state !== "CT");
    }
  });
});

describe("stateCoverage — every state", () => {
  const keys = (c: StateCoverage) => ({
    top: Object.keys(c).sort(),
    corrections: Object.keys(c.corrections).sort(),
    vintages: Object.keys(c.vintages).sort(),
  });
  const expected = keys(stateCoverage("CA", curves()));

  it("derives a complete block for all 51 states, agreeing with the tables it is built from", () => {
    for (const state of STATE_CODES) {
      const c = stateCoverage(state, curves());
      expect(keys(c), state).toEqual(expected);
      expect(c.corrections.coverageGap.applies, state).toBe(NON_EXPANSION_STATES.has(state));
      expect(c.corrections.childcareSubsidy.source, state).toBe(CHILDCARE_SUBSIDY_IN_NET_INCOME.has(state) ? "in net income" : "added by HotGap");
      expect(c.corrections.maTafdc.applies, state).toBe(state === "MA");
      const premium = c.corrections.premiumAssistance;
      const hasWrap = STATE_PREMIUM_WRAPS.some((w) => w.state === state) || PER_MEMBER_PREMIUM_HELP.some((h) => h.state === state);
      expect(premium.source, state).toBe(hasWrap ? "ladder" : "none");
      const known = STATE_PREMIUM_ASSISTANCE.some((s) => s.state === state) || UNMODELED_STATE_PREMIUM_ASSISTANCE.some((s) => s.state === state);
      expect(premium.program !== null, state).toBe(hasWrap || known);
      expect(c.unmodeled.at(-1)?.program, state).toBe("LIHEAP");
      for (const o of c.corrections.policyOverrides) expect(o.source.startsWith("https://"), state).toBe(true);
    }
  });
});
