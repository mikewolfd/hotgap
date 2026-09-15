import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
// The endpoint under test: the public API unless HOTGAP_PE_URL names another
// one. Every assertion below is about behaviour the public API has, so a
// self-hosted stand-in (engine/) has to satisfy all of them unchanged.
import { peUrl } from "../core/src/index.js";

const RUN = process.env.RUN_CONTRACT === "1";
// Only load the fixture when the contract suite actually runs, so a missing or
// corrupt fixture cannot break test collection on the skip path.
const request = RUN
  ? JSON.parse(
      readFileSync(new URL("../fixtures/pe-ca-single-1kid-101.request.json", import.meta.url), "utf8"),
    )
  : null;

describe.skipIf(!RUN)("PolicyEngine /us/calculate contract", () => {
  it("computes a 101-point axes sweep with every variable we display", async () => {
    const res = await fetch(peUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(60_000),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.status).toBe("ok");
    const r = body.result;
    const arr = (x: unknown) => {
      expect(Array.isArray(x)).toBe(true);
      expect((x as number[]).length).toBe(101);
    };
    arr(r.households["your household"].household_net_income["2026"]);
    arr(r.spm_units["your spm_unit"].snap["2026"]);
    arr(r.spm_units["your spm_unit"].tanf["2026"]);
    arr(r.spm_units["your spm_unit"].spm_unit_capped_housing_subsidy["2026"]);
    arr(r.tax_units["your tax unit"].eitc["2026"]);
    arr(r.tax_units["your tax unit"].refundable_ctc["2026"]);
    arr(r.tax_units["your tax unit"].premium_tax_credit["2026"]);
    for (const v of ["medicaid", "ssi", "wic", "chip"]) arr(r.people["you"][v]["2026"]);
    for (const v of ["head_start", "early_head_start"]) arr(r.people["your first dependent"][v]["2026"]);
    for (const v of ["free_school_meals", "reduced_price_school_meals", "spm_unit_medical_out_of_pocket_expenses"]) arr(r.spm_units["your spm_unit"][v]["2026"]);
  }, 90_000);

  it("accepts rent on people and childcare_expenses on spm_units", async () => {
    const probe = {
      household: {
        people: { you: { age: { "2026": 30 }, rent: { "2026": 18000 } } },
        families: { f: { members: ["you"] } },
        marital_units: { m: { members: ["you"] } },
        tax_units: { t: { members: ["you"] } },
        spm_units: { s: { members: ["you"], childcare_expenses: { "2026": 6000 }, snap: { "2026": null } } },
        households: { h: { members: ["you"], state_name: { "2026": "CA" }, household_net_income: { "2026": null } } },
      },
    };
    const res = await fetch(peUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(probe),
      signal: AbortSignal.timeout(60_000),
    });
    const body = (await res.json()) as any;
    expect(body.status).toBe("ok");
  }, 90_000);

  it("rejects a misplaced variable with an error-JSON body", async () => {
    // `rent` belongs on `people`; putting it on `spm_units` must produce a
    // structured validation error. Observed live behavior (2026-07-11): the API
    // responds HTTP 400 with { status: "error", message: string }, e.g.
    // "Household variable `rent` belongs on `people`, not `spm_units`, ...".
    const probe = {
      household: {
        people: { you: { age: { "2026": 30 } } },
        families: { f: { members: ["you"] } },
        marital_units: { m: { members: ["you"] } },
        tax_units: { t: { members: ["you"] } },
        spm_units: { s: { members: ["you"], rent: { "2026": 18000 }, snap: { "2026": null } } },
        households: { h: { members: ["you"], state_name: { "2026": "CA" }, household_net_income: { "2026": null } } },
      },
    };
    const res = await fetch(peUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(probe),
      signal: AbortSignal.timeout(60_000),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as any;
    expect(body.status).toBe("error");
    expect(typeof body.message).toBe("string");
    expect(body.message.length).toBeGreaterThan(0);
  }, 90_000);

  it("pins is_disabled/is_ssi_disabled and the SSI-disabled pathway", async () => {
    // `is_disabled: true` alone does not unlock SSI in PolicyEngine — only
    // `is_ssi_disabled: true` does (see core/src/translate.ts). This pins
    // both variable names and confirms the pathway actually produces a
    // nonzero SSI award, not just an accepted request. Observed live
    // (2026-07-11): ssi = $9,438 for this household.
    const probe = {
      household: {
        people: {
          you: {
            age: { "2026": 45 },
            is_disabled: { "2026": true },
            is_ssi_disabled: { "2026": true },
            employment_income: { "2026": 6000 },
            ssi: { "2026": null },
          },
        },
        families: { f: { members: ["you"] } },
        marital_units: { m: { members: ["you"] } },
        tax_units: { t: { members: ["you"] } },
        spm_units: { s: { members: ["you"] } },
        households: { h: { members: ["you"], state_name: { "2026": "CA" } } },
      },
    };
    const res = await fetch(peUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(probe),
      signal: AbortSignal.timeout(60_000),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.status).toBe("ok");
    const ssi = body.result.people["you"].ssi["2026"];
    expect(ssi).toBeGreaterThan(0);
  }, 90_000);

  it("head_start:0 override removes Head Start from net income", async () => {
    const withHS = { household: { people: { you: { age: { "2026": 30 }, employment_income: { "2026": 20000 } }, kid: { age: { "2026": 5 }, head_start: { "2026": null } } }, families: { f: { members: ["you", "kid"] } }, marital_units: { m: { members: ["you"] } }, tax_units: { t: { members: ["you", "kid"] } }, spm_units: { s: { members: ["you", "kid"] } }, households: { h: { members: ["you", "kid"], state_name: { "2026": "CA" }, household_net_income: { "2026": null } } } } };
    const off = JSON.parse(JSON.stringify(withHS));
    off.household.people.kid.head_start = { "2026": 0 };
    const call = async (body: unknown) => {
      const res = await fetch(peUrl(), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(60_000) });
      return (await res.json()) as any;
    };
    const on = await call(withHS);
    const offR = await call(off);
    const onNet = on.result.households.h.household_net_income["2026"];
    const offNet = offR.result.households.h.household_net_income["2026"];
    expect(onNet - offNet).toBeGreaterThan(15000); // Head Start value removed
  }, 90_000);

  // Plan 7 (county-level): county_fips should genuinely change the ACA
  // marketplace premium via the rating area, not just be accepted and
  // ignored. $45k for a single adult sits in the marketplace-subsidy range
  // (verified live) where premium_tax_credit is comfortably nonzero, so a
  // real difference between counties reflects the rating area, not a
  // subsidy floor/ceiling both counties happen to hit.
  const singleAdultHousehold = (countyFips?: string) => ({
    household: {
      people: { you: { age: { "2026": 30 }, employment_income: { "2026": 45000 } } },
      families: { f: { members: ["you"] } },
      marital_units: { m: { members: ["you"] } },
      tax_units: { t: { members: ["you"], premium_tax_credit: { "2026": null } } },
      spm_units: { s: { members: ["you"] } },
      households: {
        h: {
          members: ["you"],
          state_name: { "2026": "CA" },
          household_net_income: { "2026": null },
          ...(countyFips ? { county_fips: { "2026": countyFips } } : {}),
        },
      },
    },
  });

  it("county_fips shifts the ACA rating area: SF vs LA yield different premium_tax_credit at the same CA income", async () => {
    const call = async (body: unknown) => {
      const res = await fetch(peUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60_000),
      });
      return { status: res.status, body: (await res.json()) as any };
    };
    const sf = await call(singleAdultHousehold("06075")); // San Francisco County
    const la = await call(singleAdultHousehold("06037")); // Los Angeles County
    expect(sf.status).toBe(200);
    expect(sf.body.status).toBe("ok");
    expect(la.status).toBe(200);
    expect(la.body.status).toBe("ok");
    const sfPtc = sf.body.result.tax_units.t.premium_tax_credit["2026"];
    const laPtc = la.body.result.tax_units.t.premium_tax_credit["2026"];
    expect(sfPtc).toBeGreaterThan(0);
    expect(laPtc).toBeGreaterThan(0);
    // Observed live (2026-07-11): SF ~$3,459 vs LA ~$1,251 — a $2k+ gap, not
    // rounding noise, so a much looser threshold still proves the point.
    expect(Math.abs(sfPtc - laPtc)).toBeGreaterThan(100);
  }, 90_000);

  // parse.ts subtracts SPM medical out-of-pocket (the premium NET of the
  // premium tax credit) from household_net_income. That is only right if the
  // PTC is not already inside household_net_income. Until 2026-09-14 the code
  // assumed it was and subtracted the PTC too, erasing the subsidy from every
  // curve. Pin the composition live so the formula never again rests on an
  // assumption: net = market + benefits + refundable credits − tax, and the
  // refundable credits are the EITC and CTC only.
  it("household_net_income = market + benefits + refundable credits − tax, and the premium tax credit is not inside it", async () => {
    const y = (v: unknown) => ({ "2026": v });
    const probe = {
      household: {
        people: { you: { age: y(30), medicaid: y(null) }, kid: { age: y(5), medicaid: y(null), chip: y(null) } },
        families: { f: { members: ["you", "kid"] } },
        marital_units: { m: { members: ["you"] } },
        tax_units: { t: { members: ["you", "kid"], eitc: y(null), refundable_ctc: y(null), premium_tax_credit: y(null) } },
        spm_units: { s: { members: ["you", "kid"], spm_unit_medical_out_of_pocket_expenses: y(null) } },
        households: {
          h: {
            members: ["you", "kid"],
            state_name: y("CA"),
            household_net_income: y(null),
            household_market_income: y(null),
            household_benefits: y(null),
            household_refundable_tax_credits: y(null),
            household_tax_before_refundable_credits: y(null),
          },
        },
        axes: [[{ name: "employment_income", min: 40000, max: 80000, count: 3, period: "2026" }]],
      },
    };
    const res = await fetch(peUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(probe),
      signal: AbortSignal.timeout(60_000),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.status).toBe("ok");
    const h = body.result.households.h;
    const t = body.result.tax_units.t;
    const at = (o: any, v: string): number[] => o[v]["2026"];
    const [net, mkt, ben, ref, tax] = ["household_net_income", "household_market_income", "household_benefits", "household_refundable_tax_credits", "household_tax_before_refundable_credits"].map((v) => at(h, v));
    const [ptc, eitc, ctc] = ["premium_tax_credit", "eitc", "refundable_ctc"].map((v) => at(t, v));
    // Only meaningful where a subsidy actually exists.
    expect(Math.max(...ptc)).toBeGreaterThan(1000);
    for (let i = 0; i < 3; i++) {
      expect(net[i]).toBeCloseTo(mkt[i] + ben[i] + ref[i] - tax[i], 0);
      expect(ref[i]).toBeCloseTo(eitc[i] + ctc[i], 0);
    }
  }, 90_000);

  // The inputs added 2026-09-14 for findings 2, 3 and 6. A wrong variable name
  // comes back as HTTP 400 with a message naming it, so acceptance is the
  // whole assertion for the three person-level inputs; household_benefits is
  // also checked for the composition parse.ts relies on (it equals the sum of
  // the benefits we track, and it carries SSDI, child support and
  // unemployment when those are supplied — so parse.ts's untracked remainder
  // is a real residual, not an offset).
  it("accepts child_support_received, unemployment_compensation and social_security_disability on people, and household_benefits on households", async () => {
    const y = (v: unknown) => ({ "2026": v });
    const probe = {
      household: {
        people: {
          you: {
            age: y(40),
            employment_income: y(12000),
            child_support_received: y(4800),
            unemployment_compensation: y(3600),
            social_security_disability: y(18000),
            ssi: y(null),
          },
        },
        families: { f: { members: ["you"] } },
        marital_units: { m: { members: ["you"] } },
        tax_units: { t: { members: ["you"] } },
        spm_units: { s: { members: ["you"], snap: y(null), tanf: y(null) } },
        households: {
          h: {
            members: ["you"],
            state_name: y("CA"),
            household_net_income: y(null),
            household_benefits: y(null),
          },
        },
      },
    };
    const res = await fetch(peUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(probe),
      signal: AbortSignal.timeout(60_000),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.status).toBe("ok");
    const person = body.result.people["you"];
    expect(person.child_support_received["2026"]).toBe(4800);
    expect(person.unemployment_compensation["2026"]).toBe(3600);
    expect(person.social_security_disability["2026"]).toBe(18000);
    const benefits = body.result.households.h.household_benefits["2026"];
    const spm = body.result.spm_units.s;
    // Observed live 2026-09-14: household_benefits = 26,400, exactly the three
    // non-wage inputs, with SNAP and TANF at 0 for this household.
    expect(benefits).toBeCloseTo(4800 + 3600 + 18000 + spm.snap["2026"] + spm.tanf["2026"] + person.ssi["2026"], 0);
  }, 90_000);

  it("still computes ok with no county_fips at all (state-only fallback)", async () => {
    const res = await fetch(peUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(singleAdultHousehold()),
      signal: AbortSignal.timeout(60_000),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.status).toBe("ok");
    expect(body.result.tax_units.t.premium_tax_credit["2026"]).toBeGreaterThan(0);
  }, 90_000);
  // The state child-care subsidy (policyengine-us #9405). Two states, one from
  // each side of `gov.household.household_state_benefits`, checked the only way
  // that does not just re-read the parameter HotGap's own table came from:
  // force the state's variable to 0 and see whether household_state_benefits
  // and net income move with it.
  //
  // Pins four things at once — the per-state variable names, the aggregate
  // `child_care_subsidies` that HotGap actually requests, the fact that
  // `spm_unit_pre_subsidy_childcare_expenses` (not `childcare_expenses`) is the
  // input the formulas read, and the inclusion table itself. If any of them
  // moves, `core/src/stateChildcareSubsidies.ts` has to be re-derived.
  for (const [state, variable, inNetIncome] of [
    ["CO", "co_child_care_subsidies", true],
    ["CT", "ct_child_care_subsidies", false],
  ] as const) {
    it(`${state}: ${variable} is computed, and ${inNetIncome ? "IS" : "is NOT"} inside household_state_benefits`, async () => {
      const y = (v: unknown) => ({ "2026": v });
      const household = (forced: number | null) => ({
        household: {
          people: {
            you: { age: y(30), employment_income: y(25000) },
            child1: {
              age: y(3),
              childcare_hours_per_day: y(8), childcare_days_per_week: y(5),
              childcare_attending_days_per_month: y(20),
            },
          },
          families: { f: { members: ["you", "child1"] } },
          marital_units: { m: { members: ["you"] } },
          tax_units: { t: { members: ["you", "child1"], tax_unit_is_filer: y(true) } },
          spm_units: {
            s: {
              members: ["you", "child1"],
              spm_unit_pre_subsidy_childcare_expenses: y(9600),
              childcare_expenses: y(null),
              child_care_subsidies: y(null),
              [variable]: y(forced),
            },
          },
          households: {
            h: {
              members: ["you", "child1"], state_name: y(state),
              household_net_income: y(null), household_state_benefits: y(null),
            },
          },
        },
      });
      const call = async (forced: number | null) => {
        const res = await fetch(peUrl(), {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(household(forced)), signal: AbortSignal.timeout(60_000),
        });
        expect(res.status).toBe(200);
        const body = (await res.json()) as any;
        expect(body.status).toBe("ok");
        return {
          subsidy: body.result.spm_units.s[variable]["2026"] as number,
          aggregate: body.result.spm_units.s.child_care_subsidies["2026"] as number,
          stateBenefits: body.result.households.h.household_state_benefits["2026"] as number,
          netIncome: body.result.households.h.household_net_income["2026"] as number,
        };
      };
      const paid = await call(null);
      // Observed live 2026-09-15: CO $8,913, CT $8,850 for this household.
      expect(paid.subsidy).toBeGreaterThan(5000);
      // The aggregate HotGap requests is this state's variable, nothing else.
      expect(paid.aggregate).toBeCloseTo(paid.subsidy, 0);

      const none = await call(0);
      expect(none.subsidy).toBe(0);
      const moved = paid.stateBenefits - none.stateBenefits;
      if (inNetIncome) {
        expect(moved).toBeCloseTo(paid.subsidy, 0);
        expect(paid.netIncome).toBeGreaterThan(none.netIncome);
      } else {
        expect(moved).toBeCloseTo(0, 0);
        // Not merely absent: net income is LOWER with the subsidy modeled,
        // because the net-of-subsidy childcare bill shrinks SNAP's
        // dependent-care deduction and the CDCC while the money never arrives.
        expect(paid.netIncome).toBeLessThan(none.netIncome);
      }
    }, 120_000);
  }
});
