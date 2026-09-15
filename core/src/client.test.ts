import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { curveCacheKey, fetchCurve, PolicyEngineError, requestPE, resampleMaTafdc, type CurveCache } from "./client.js";
import { correctMaTafdc, maTafdcGrant, maTafdcResampleIndices } from "./maTafdc.js";
import { parsePEResponse } from "./parse.js";
import { SGA_ANNUAL } from "./policyYear.js";
import { axisSpec, type AxisSpec } from "./translate.js";
import { validateAnswers } from "./validate.js";
import type { CurveResponse } from "./types.js";

const noopSleep = async () => {};

// A minimal well-formed PolicyEngine response at whatever axis the answers ask
// for. The recorded fixture is pinned to the retired 101-point / $100k axis, so
// it can no longer stand in for a live body; parse.ts's own tests still use it.
function peBody(spec: AxisSpec, ssdi = 0): string {
  const all = (v: number) => ({ "2026": new Array(spec.count).fill(v) });
  return JSON.stringify({
    status: "ok",
    result: {
      axes: [[{ min: 0, max: spec.max, count: spec.count }]],
      households: { h: { household_net_income: all(20000 + ssdi), household_benefits: all(ssdi) } },
      spm_units: {
        s: {
          snap: all(0), tanf: all(0), spm_unit_capped_housing_subsidy: all(0),
          free_school_meals: all(0), reduced_price_school_meals: all(0),
          spm_unit_medical_out_of_pocket_expenses: all(0),
        },
      },
      tax_units: { t: { eitc: all(0), refundable_ctc: all(0), premium_tax_credit: all(0) } },
      people: {
        you: { age: { "2026": 30 }, medicaid: all(0), chip: all(0), wic: all(0), ssi: all(0) },
        child1: { age: { "2026": 5 }, medicaid: all(0), chip: all(0) },
      },
    },
  });
}

const raw = {
  state: "CA", married: false, age: 30, spouseAge: null, childAges: [5],
  youDisabled: false, spouseDisabled: false, childDisabled: [false],
  monthlyRent: 1500, monthlyChildcare: null, annualEarnings: 30000, spouseAnnualEarnings: 0,
};
const v = validateAnswers(raw);
if (!v.ok) throw new Error(v.detail);
const answers = v.value;

const respond = (fn: () => Response | Promise<Response>) => (async () => fn()) as unknown as typeof fetch;
const axis = axisSpec(answers);
const body = peBody(axis);

async function kindOf(p: Promise<unknown>): Promise<string> {
  try { await p; return "ok"; } catch (e) { return e instanceof PolicyEngineError ? e.kind : "other"; }
}

describe("fetchCurve", () => {
  it("returns a CurveResponse for valid answers, one point per axis step", async () => {
    const curve = await fetchCurve(answers, { fetchImpl: respond(() => new Response(body, { status: 200 })) });
    expect(curve.points).toHaveLength(axis.count);
    expect(curve.points[curve.points.length - 1].earnings).toBe(axis.max);
    expect(curve.year).toBe("2026");
    expect(curve.currentEarnings).toBe(30000);
  });

  it("classifies failures: upstream status, PE error JSON, timeout, network", async () => {
    expect(await kindOf(fetchCurve(answers, { fetchImpl: respond(() => new Response("boom", { status: 500 })) }))).toBe("upstream");
    expect(await kindOf(fetchCurve(answers, { fetchImpl: respond(() => new Response(JSON.stringify({ status: "error", message: "bad variable" }), { status: 200 })) }))).toBe("parse");
    expect(await kindOf(fetchCurve(answers, { fetchImpl: respond(() => { throw new DOMException("timeout", "TimeoutError"); }) }))).toBe("timeout");
    expect(await kindOf(fetchCurve(answers, { fetchImpl: respond(() => { throw new TypeError("fetch failed"); }) }))).toBe("network");
  });

  it("serves the second identical request from the cache without refetching", async () => {
    let calls = 0;
    const store = new Map<string, CurveResponse>();
    const cache: CurveCache = { get: (k) => store.get(k), set: (k, c) => void store.set(k, c) };
    const fetchImpl = respond(() => { calls++; return new Response(body, { status: 200 }); });
    await fetchCurve(answers, { fetchImpl, cache });
    const again = await fetchCurve(answers, { fetchImpl, cache });
    expect(calls).toBe(1);
    expect(again.points).toHaveLength(axis.count);
  });

  it("splices two SSDI requests at substantial gainful activity", async () => {
    // PolicyEngine pays a disability benefit at every earnings level; SSA stops
    // it above SGA. fetchCurve therefore asks twice — once with
    // social_security_disability set, once without — and takes points at or
    // below SGA_ANNUAL from the first and the rest from the second.
    const withSSDI = validateAnswers({ ...raw, ssdiMonthly: 1500 });
    if (!withSSDI.ok) throw new Error(withSSDI.detail);
    const payloads: string[] = [];
    const fetchImpl = (async (_url: string, init: { body: string }) => {
      payloads.push(init.body);
      const sendsSSDI = init.body.includes("social_security_disability");
      return new Response(peBody(axis, sendsSSDI ? 18000 : 0), { status: 200 });
    }) as unknown as typeof fetch;

    const curve = await fetchCurve(withSSDI.value, { fetchImpl });
    expect(payloads).toHaveLength(2);
    expect(payloads.filter((p) => p.includes("social_security_disability"))).toHaveLength(1);

    const below = curve.points.filter((p) => p.earnings <= SGA_ANNUAL);
    const above = curve.points.filter((p) => p.earnings > SGA_ANNUAL);
    expect(below.every((p) => p.otherBenefits === 18000)).toBe(true);
    expect(above.every((p) => p.otherBenefits === 0)).toBe(true);
    // The whole check stops in one step: a real cash cliff, not a taper.
    expect(below[below.length - 1].netIncome - above[0].netIncome).toBe(18000);
    expect(SGA_ANNUAL).toBe(20280);
  });

  it("makes one request when there is no SSDI", async () => {
    let calls = 0;
    const fetchImpl = respond(() => { calls++; return new Response(body, { status: 200 }); });
    await fetchCurve(answers, { fetchImpl });
    expect(calls).toBe(1);
  });
});

describe("curveCacheKey", () => {
  it("ignores key order and changes with any answer", () => {
    const reordered = Object.fromEntries(Object.entries(answers).reverse()) as typeof answers;
    expect(curveCacheKey(reordered)).toBe(curveCacheKey(answers));
    expect(curveCacheKey({ ...answers, annualEarnings: 30001 })).not.toBe(curveCacheKey(answers));
  });
});

describe("requestPE retries", () => {
  it("retries with the given delays, succeeding on the last try", async () => {
    let calls = 0;
    const fetchImpl = respond(() => {
      calls++;
      return calls < 3 ? new Response("", { status: 500 }) : new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    const sleeps: number[] = [];
    const body = await requestPE({ household: {} }, { fetchImpl, retryDelaysMs: [2000, 8000], sleep: async (ms) => { sleeps.push(ms); } });
    expect(calls).toBe(3);
    expect(sleeps).toEqual([2000, 8000]);
    expect(body).toEqual({ ok: true });
  });

  it("does not retry a 4xx, and keeps PolicyEngine's message", async () => {
    let calls = 0;
    const fetchImpl = respond(() => { calls++; return new Response(JSON.stringify({ status: "error", message: "Household variable `rent` belongs on `people`" }), { status: 400 }); });
    const err = (await requestPE({}, { fetchImpl, retryDelaysMs: [1, 1], sleep: noopSleep }).catch((e) => e)) as PolicyEngineError;
    expect(err).toBeInstanceOf(PolicyEngineError);
    expect(err.status).toBe(400);
    expect(err.message).toContain("belongs on `people`");
    expect(calls).toBe(1);
  });

  it("throws the last error after exhausting all attempts, and does not retry by default", async () => {
    let calls = 0;
    const fetchImpl = respond(() => { calls++; return new Response("", { status: 500 }); });
    await expect(requestPE({}, { fetchImpl, retryDelaysMs: [1, 1], sleep: noopSleep })).rejects.toBeInstanceOf(PolicyEngineError);
    expect(calls).toBe(3);
    calls = 0;
    await expect(requestPE({}, { fetchImpl })).rejects.toBeInstanceOf(PolicyEngineError);
    expect(calls).toBe(1);
  });
});

describe("Massachusetts TAFDC feedback loop", () => {
  // A real 11-point PolicyEngine response ($24k–$34k) for a married couple with
  // children aged 1, 4 and 9 in private housing, carrying every ma_tafdc_* input.
  const maFixture = JSON.parse(readFileSync(new URL("../../fixtures/pe-ma-married-3kids-11.json", import.meta.url), "utf8"));
  const maAnswers = (() => {
    const v = validateAnswers({
      state: "MA", married: true, age: 30, spouseAge: 30, childAges: [1, 4, 9], childDisabled: [false, false, false],
      youDisabled: false, spouseDisabled: false, monthlyRent: 1500, monthlyChildcare: null,
      annualEarnings: 26000, spouseAnnualEarnings: 0,
    });
    if (!v.ok) throw new Error(v.detail);
    return v.value;
  })();
  const maPoints = parsePEResponse(maFixture, 11);
  const YEAR = "2026";

  // A fake PolicyEngine: for a forced-grant point request, answer with the
  // fixture's point at that earnings, the grant as forced, and SNAP raised by
  // $1,000 so the test can see the engine's answer land in the curve.
  function pointBody(payload: any): string {
    const axis = payload.household.axes[0][0];
    const forced = payload.household.spm_units.spm_unit.ma_tafdc[YEAR] as number;
    const k = Math.round((axis.min - 24000) / 1000);
    const pick = (v: unknown): unknown =>
      Array.isArray(v) && v.length === 11 ? [v[k], v[k]] : v && typeof v === "object" ? Object.fromEntries(Object.entries(v as object).map(([a, b]) => [a, pick(b)])) : v;
    const body = pick(maFixture) as any;
    body.result.axes = payload.household.axes;
    const spm = Object.values(body.result.spm_units)[0] as any;
    spm.ma_tafdc[YEAR] = [forced, forced];
    spm.tanf[YEAR] = [forced, forced];
    spm.snap[YEAR] = spm.snap[YEAR].map((x: number) => x + 1000);
    (Object.values(body.result.households)[0] as any).household_state_benefits[YEAR] = [forced, forced];
    return JSON.stringify(body);
  }

  it("re-requests only the points whose corrected grant differs, forcing that grant, and splices the engine's answer back", async () => {
    const requests: any[] = [];
    const fetchImpl = (async (_url: unknown, init?: RequestInit) => {
      const payload = JSON.parse(init!.body as string);
      requests.push(payload);
      return new Response(pointBody(payload), { status: 200 });
    }) as unknown as typeof fetch;

    const expected = maTafdcResampleIndices(maAnswers, maPoints);
    expect(expected.length).toBeGreaterThan(0);
    const out = await resampleMaTafdc(maAnswers, maPoints, { fetchImpl });

    expect(requests.map((r) => r.household.axes[0][0].min).sort((a, b) => a - b)).toEqual(expected.map((i) => maPoints[i].earnings));
    for (const r of requests) {
      const earnings = r.household.axes[0][0].min;
      const i = maPoints.findIndex((p) => p.earnings === earnings);
      expect(r.household.axes[0][0].count).toBe(2);
      expect(r.household.people.you.employment_income).toBeUndefined(); // the axis carries earnings
      expect(r.household.spm_units.spm_unit.ma_tafdc[YEAR]).toBe(maTafdcGrant(earnings, 0, maPoints[i].maTafdc!));
    }
    for (const i of expected) {
      expect(out[i].earnings).toBe(maPoints[i].earnings);
      expect(out[i].programs.snap).toBe(maPoints[i].programs.snap + 1000);
      expect(out[i].programs.tanf).toBe(maTafdcGrant(maPoints[i].earnings, 0, maPoints[i].maTafdc!));
      expect(out[i].maTafdc?.engineUsedCorrectedGrant).toBe(true);
    }
    for (let i = 0; i < maPoints.length; i++) if (!expected.includes(i)) expect(out[i]).toBe(maPoints[i]);

    // Fed-back points need no second pass, and the correction now says so.
    expect(maTafdcResampleIndices(maAnswers, out)).toEqual([]);
    expect(correctMaTafdc(maAnswers, maPoints).correction?.linkedBenefitsRecomputed).toBe(false);
    expect(correctMaTafdc(maAnswers, out).correction).toMatchObject({ status: "applied", linkedBenefitsRecomputed: true, message: expect.stringContaining("recomputed") });
  });

  it("does not feed back a point whose grant differs by $100 or less", () => {
    const small = maPoints.map((p) => ({ ...p, programs: { ...p.programs, tanf: maTafdcGrant(p.earnings, 0, p.maTafdc!) + 100 } }));
    expect(maTafdcResampleIndices(maAnswers, small)).toEqual([]);
    const big = maPoints.map((p) => ({ ...p, programs: { ...p.programs, tanf: maTafdcGrant(p.earnings, 0, p.maTafdc!) + 101 } }));
    expect(maTafdcResampleIndices(maAnswers, big)).toHaveLength(maPoints.length);
  });

  it("fetchCurve runs the loop for a Massachusetts household with children and stores the flag", async () => {
    const axis = axisSpec(maAnswers);
    const stretch = (v: unknown): unknown =>
      Array.isArray(v) && v.length === 11 ? Array.from({ length: axis.count }, (_, i) => v[Math.min(i, 10)]) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v as object).map(([a, b]) => [a, stretch(b)])) : v;
    let pointRequests = 0;
    const fetchImpl = (async (_url: unknown, init?: RequestInit) => {
      const payload = JSON.parse(init!.body as string);
      if (payload.household.axes[0][0].count === 2) { pointRequests++; return new Response(pointBody({ household: { ...payload.household, axes: [[{ ...payload.household.axes[0][0], min: 24000 + (payload.household.axes[0][0].min % 11000) }]] } }).replace(/"min":24000/, `"min":${payload.household.axes[0][0].min}`), { status: 200 }); }
      const body = stretch(maFixture) as any;
      body.result.axes = [[{ name: "employment_income", min: 0, max: axis.max, count: axis.count, period: YEAR }]];
      return new Response(JSON.stringify(body), { status: 200 });
    }) as unknown as typeof fetch;

    const curve = await fetchCurve(maAnswers, { fetchImpl });
    const swept = parsePEResponse(JSON.parse(JSON.stringify(stretch(maFixture))).result ? (() => { const b = stretch(maFixture) as any; b.result.axes = [[{ name: "employment_income", min: 0, max: axis.max, count: axis.count, period: YEAR }]]; return b; })() : null, axis.count);
    const expected = maTafdcResampleIndices(maAnswers, swept);
    expect(pointRequests).toBe(expected.length);
    expect(curve.points).toHaveLength(axis.count);
    for (const i of expected) expect(curve.points[i].maTafdc?.engineUsedCorrectedGrant).toBe(true);
    expect(curve.points.filter((p) => p.maTafdc?.engineUsedCorrectedGrant).length).toBe(expected.length);
  });
});
