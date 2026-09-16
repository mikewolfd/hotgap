import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
// The endpoint under test: the public API unless HOTGAP_PE_URL names another
// one. Every assertion below is about behaviour the public API has, so a
// self-hosted stand-in (engine/) has to satisfy all of them unchanged.
import { answersFor, archetypeById, buildCurvePayload, CHILDCARE_SUBSIDY_PROBE_SENTINEL, childcareSubsidyProbePayload, OTHER_BENEFIT_SOURCES, parsePEResponse, peHeaders, peUrl, probeChildcareSubsidyCounted, requestPE } from "../core/src/index.js";

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
      headers: peHeaders(),
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
    arr(r.households.household.household_net_income["2026"]);
    arr(r.spm_units.spm_unit.snap["2026"]);
    arr(r.spm_units.spm_unit.tanf["2026"]);
    arr(r.spm_units.spm_unit.spm_unit_capped_housing_subsidy["2026"]);
    arr(r.tax_units.tax_unit.eitc["2026"]);
    arr(r.tax_units.tax_unit.refundable_ctc["2026"]);
    arr(r.tax_units.tax_unit.premium_tax_credit["2026"]);
    for (const v of ["medicaid", "ssi", "wic", "chip"]) arr(r.people.you[v]["2026"]);
    for (const v of ["head_start", "early_head_start"]) arr(r.people.child1[v]["2026"]);
    for (const v of ["free_school_meals", "reduced_price_school_meals", "spm_unit_medical_out_of_pocket_expenses"]) arr(r.spm_units.spm_unit[v]["2026"]);
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
      headers: peHeaders(),
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
      headers: peHeaders(),
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
      headers: peHeaders(),
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
      const res = await fetch(peUrl(), { method: "POST", headers: peHeaders(), body: JSON.stringify(body), signal: AbortSignal.timeout(60_000) });
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
        headers: peHeaders(),
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
      headers: peHeaders(),
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
      headers: peHeaders(),
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
      headers: peHeaders(),
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
  // The personal-path inputs added 2026-09-16, each through HotGap's own
  // payload: the model must read them, on both endpoints.
  // Pennsylvania by default: no policy override there, so each request is a
  // baseline calculation rather than a 35–70 s reform on the hosted API.
  const twoPoints = (over: Partial<ReturnType<typeof answersFor>>, min: number, state = "PA") => {
    const answers = { ...answersFor(state, archetypeById("single-1")), childAges: [3], childDisabled: [false], annualEarnings: min, ...over };
    const payload = buildCurvePayload(answers);
    (payload.household as { axes: unknown[][] }).axes[0][0] = { name: answers.selfEmployed ? "self_employment_income" : "employment_income", min, max: min + 1000, count: 2, period: "2026" };
    return requestPE(payload, { timeoutMs: 90_000 }).then((body) => parsePEResponse(body, 2)[0]);
  };

  it("immigration status: an undocumented parent loses the EITC and their share of SNAP; a permanent resident under the five-year bar loses Medicaid, not SNAP", async () => {
    // Pennsylvania: an expansion state that does not cover new residents with
    // its own money (California does), so the bar shows in the adult's Medicaid.
    const citizen = await twoPoints({}, 12000, "PA");
    const undocumented = await twoPoints({ youStatus: "undocumented" }, 12000, "PA");
    const newLpr = await twoPoints({ youStatus: "lpr", youYearsInUs: 2 }, 12000, "PA");
    const settledLpr = await twoPoints({ youStatus: "lpr", youYearsInUs: 6 }, 12000, "PA");
    const adultMedicaid = (p: { programs: Record<string, number>; childPrograms: Partial<Record<string, number>> }) => p.programs.medicaid - (p.childPrograms.medicaid ?? 0);
    expect(citizen.programs.eitc).toBeGreaterThan(3000);
    expect(undocumented.programs.eitc).toBe(0);
    expect(undocumented.programs.snap).toBeLessThan(citizen.programs.snap! - 1000);
    expect(adultMedicaid(undocumented)).toBe(0);
    expect(adultMedicaid(citizen)).toBeGreaterThan(5000);
    expect(adultMedicaid(newLpr)).toBe(0);
    expect(adultMedicaid(settledLpr)).toBe(adultMedicaid(citizen));
    // The model applies no five-year bar to SNAP (its rule is a status list;
    // upstream simplification, noted in the README): SNAP is unchanged.
    expect(newLpr.programs.snap).toBe(citizen.programs.snap);
    // The children are modeled as citizens throughout.
    expect(undocumented.childPrograms.medicaid).toBe(citizen.childPrograms.medicaid);
  }, 300_000);

  it("savings: $5,000 in the bank ends SNAP in a state without broad-based categorical eligibility", async () => {
    // Kansas: no BBCE, and no policy override to slow the hosted API down.
    const ks = { ...answersFor("KS", archetypeById("single-0")), annualEarnings: 10000 };
    const run = (savings: number) => {
      const payload = buildCurvePayload({ ...ks, savings });
      (payload.household as { axes: unknown[][] }).axes[0][0] = { name: "employment_income", min: 10000, max: 11000, count: 2, period: "2026" };
      return requestPE(payload, { timeoutMs: 90_000 }).then((body) => parsePEResponse(body, 2)[0]);
    };
    expect((await run(0)).programs.snap).toBeGreaterThan(1000);
    expect((await run(5000)).programs.snap).toBe(0);
  }, 200_000);

  it("self-employment: the axis on self_employment_income is accepted and earns the EITC like wages", async () => {
    const self = await twoPoints({ selfEmployed: true }, 20000);
    expect(self.programs.eitc).toBeGreaterThan(3000);
    expect(self.programs.snap).toBeGreaterThan(0);
  }, 200_000);

  it("take-up: SNAP and Medicaid switched off pay nothing, WIC forced to zero", async () => {
    const off = await twoPoints({ getsSnap: false, getsMedicaid: false, getsWic: false }, 12000);
    expect(off.programs.snap).toBe(0);
    expect(off.programs.medicaid).toBe(0);
    expect(off.childPrograms.medicaid ?? 0).toBe(0);
    expect(off.programs.wic ?? 0).toBe(0);
    const on = await twoPoints({}, 12000);
    expect(on.childPrograms.medicaid).toBeGreaterThan(0);
  }, 200_000);

  it("employer coverage: the ACA firewall reaches the spouse and children, so no premium credit is computed for anyone", async () => {
    const family = await twoPoints({ married: true, spouseAge: 30, childAges: [3, 8], childDisabled: [false, false], hasEmployerCoverage: true }, 60000);
    expect(family.programs.aca ?? 0).toBe(0);
    const marketplace = await twoPoints({ married: true, spouseAge: 30, childAges: [3, 8], childDisabled: [false, false] }, 60000);
    expect(marketplace.programs.aca).toBeGreaterThan(5000);
  }, 200_000);

  it("state premium assistance: served and netted out of the premium where the endpoint has it, the local ladder otherwise", async () => {
    const { fetchCurve, evaluateCurve, endpointHasTaxUnitVariable } = await import("../core/src/index.js");
    const ca = { ...answersFor("CA", archetypeById("single-0")), annualEarnings: 23000 }; // ~145% FPL: the $0 band
    const has = await endpointHasTaxUnitVariable("assigned_ca_premium_subsidy", { timeoutMs: 90_000 });
    const ev = evaluateCurve(ca, await fetchCurve(ca, { timeoutMs: 90_000 }), "live");
    const at23k = ev.curve.points.find((p) => p.earnings === 23000)!;
    expect(at23k.medicalOOP).toBe(0);
    if (has) {
      expect(at23k.statePremiumAssistance).toBeGreaterThan(500);
      expect(ev.statePremiumAssistance?.variable).toBe("assigned_ca_premium_subsidy");
      expect(ev.premiumWrap).toBeNull();
    } else {
      expect(at23k.statePremiumAssistance).toBeUndefined();
      expect(ev.premiumWrap?.state).toBe("CA");
    }
  }, 200_000);

  // The untracked `otherBenefits` remainder, traced to a variable per state in
  // core/src/stateOtherBenefits.ts. Each row is pinned the only way that is
  // not circular: the swept household's own payload at the earnings where the
  // remainder peaks ($0 for every row so far), with the named variable added,
  // must show that variable carrying the whole remainder. A row that stops
  // holding here is a stale finding; a remainder this leaves unexplained is
  // money nobody has named.
  for (const { variable, entity, states } of OTHER_BENEFIT_SOURCES) {
    for (const state of states) {
      it(`${state}: otherBenefits is ${variable}`, async () => {
        const answers = answersFor(state, archetypeById("single-0"));
        const payload = buildCurvePayload(answers);
        const household = payload.household as { axes: unknown[][] } & Record<string, Record<string, Record<string, unknown>>>;
        household.axes[0][0] = { name: "employment_income", min: 0, max: 1000, count: 2, period: "2026" };
        for (const instance of Object.values(household[entity])) instance[variable] = { "2026": null };
        const body = (await requestPE(payload, { timeoutMs: 90_000 })) as any;
        const [point] = parsePEResponse(body, 2);
        const series = Object.values(body.result[entity] as Record<string, any>)[0][variable]["2026"] as number[];
        // Observed 2026-09-16 on policyengine-us 2.5.0: NJ $450.
        expect(point.otherBenefits).toBeGreaterThan(100);
        expect(series[0]).toBeCloseTo(point.otherBenefits, 0);
      }, 120_000);
    }
  }

  // The first remainder traced was a leak, not a benefit: HUD's voucher
  // payment (`housing_assistance`, which household_benefits reads) reaching a
  // household that said it has no voucher, because HotGap forced only
  // `spm_unit_capped_housing_subsidy`. CA $2,963 and KS $2,471 a year at $0
  // on 2.5.0 before `takes_up_housing_assistance_if_eligible: false` closed
  // it. Pins that it stays closed, and that a voucher household still draws it.
  it("no voucher means no HUD payment in the remainder (CA, KS); a voucher household still draws one", async () => {
    for (const state of ["CA", "KS"] as const) {
      const answers = answersFor(state, archetypeById("single-0"));
      const at0 = async (getsHousing: boolean) => {
        const payload = buildCurvePayload({ ...answers, getsHousing });
        const household = payload.household as { axes: unknown[][]; spm_units: { spm_unit: Record<string, unknown> } };
        household.axes[0][0] = { name: "employment_income", min: 0, max: 1000, count: 2, period: "2026" };
        household.spm_units.spm_unit.housing_assistance = { "2026": null };
        const body = (await requestPE(payload, { timeoutMs: 90_000 })) as any;
        return { point: parsePEResponse(body, 2)[0], hud: body.result.spm_units.spm_unit.housing_assistance["2026"][0] as number };
      };
      const off = await at0(false);
      expect(off.hud, state).toBe(0);
      expect(off.point.otherBenefits, state).toBeLessThan(100);
      const on = await at0(true);
      expect(on.hud, state).toBeGreaterThan(1000);
    }
  }, 300_000);

  // Two states pay nothing until the provider type is named (policyengine-us
  // #9485); HotGap names it in its own payload. Pins that the enum values
  // exist on the endpoint and that they turn the award on.
  for (const state of ["MA", "MD"] as const) {
    it(`${state}: a 3-year-old's bill draws a subsidy through HotGap's payload (provider type named)`, async () => {
      const answers = { ...answersFor(state, archetypeById("single-1")), childAges: [3], childDisabled: [false], monthlyChildcare: 1000, getsChildcareSubsidy: true };
      const payload = buildCurvePayload(answers);
      const household = payload.household as { axes: unknown[][] };
      household.axes[0][0] = { name: "employment_income", min: 20000, max: 21000, count: 2, period: "2026" };
      const [point] = parsePEResponse(await requestPE(payload, { timeoutMs: 90_000 }), 2);
      expect(point.programs.childcare).toBeGreaterThan(5000);
    }, 100_000);
  }

  // Pins the #9503 probe against the model it runs on: the forced aggregate
  // comes back as itself (an ignored input would read as an old model), and
  // the answer is a plain boolean. Which boolean is the endpoint's business —
  // the two-state check below has to AGREE with it, measured the other way.
  it("the child-care subsidy probe reads its sentinel back and answers", async () => {
    const body = (await requestPE(childcareSubsidyProbePayload(), { timeoutMs: 90_000 })) as any;
    expect(body.result.spm_units.spm_unit.child_care_subsidies["2026"]).toBeCloseTo(CHILDCARE_SUBSIDY_PROBE_SENTINEL, -1);
    expect(typeof (await probeChildcareSubsidyCounted({ timeoutMs: 90_000 }))).toBe("boolean");
  }, 120_000);

  // Pins four things at once — the per-state variable names, the aggregate
  // `child_care_subsidies` that HotGap actually requests, the fact that
  // `spm_unit_pre_subsidy_childcare_expenses` (not `childcare_expenses`) is the
  // input the formulas read, and the inclusion table itself. If any of them
  // moves, `core/src/stateChildcareSubsidies.ts` has to be re-derived.
  // Connecticut is the state the table leaves out, so on a model that carries
  // policyengine-us #9503 (the probe says so) its subsidy IS counted — and a
  // probe that said otherwise here would be lying.
  for (const [state, variable, listed] of [
    ["CO", "co_child_care_subsidies", true],
    ["CT", "ct_child_care_subsidies", false],
  ] as const) {
    it(`${state}: ${variable} is computed, and is inside household_state_benefits ${listed ? "always" : "only on a model with #9503"}`, async () => {
      const inNetIncome = listed || await probeChildcareSubsidyCounted({ timeoutMs: 90_000 });
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
          method: "POST", headers: peHeaders(),
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
