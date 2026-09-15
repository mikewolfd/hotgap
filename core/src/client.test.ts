import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { curveCacheKey, fetchCurve, PolicyEngineError, requestPE, type CurveCache } from "./client.js";
import { validateAnswers } from "./validate.js";
import type { CurveResponse } from "./types.js";

const fixture = readFileSync(new URL("../../fixtures/pe-ca-single-1kid-101.json", import.meta.url), "utf8");
const noopSleep = async () => {};

const v = validateAnswers({
  state: "CA", married: false, age: 30, spouseAge: null, childAges: [5],
  youDisabled: false, spouseDisabled: false, childDisabled: [false],
  monthlyRent: 1500, monthlyChildcare: null, annualEarnings: 30000, spouseAnnualEarnings: 0,
});
if (!v.ok) throw new Error(v.detail);
const answers = v.value;

const respond = (fn: () => Response | Promise<Response>) => (async () => fn()) as unknown as typeof fetch;

async function kindOf(p: Promise<unknown>): Promise<string> {
  try { await p; return "ok"; } catch (e) { return e instanceof PolicyEngineError ? e.kind : "other"; }
}

describe("fetchCurve", () => {
  it("returns a CurveResponse for valid answers", async () => {
    const curve = await fetchCurve(answers, { fetchImpl: respond(() => new Response(fixture, { status: 200 })) });
    expect(curve.points).toHaveLength(101);
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
    const fetchImpl = respond(() => { calls++; return new Response(fixture, { status: 200 }); });
    await fetchCurve(answers, { fetchImpl, cache });
    const again = await fetchCurve(answers, { fetchImpl, cache });
    expect(calls).toBe(1);
    expect(again.points).toHaveLength(101);
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
