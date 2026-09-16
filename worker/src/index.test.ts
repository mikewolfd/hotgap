import { afterEach, describe, expect, it } from "vitest";
import { axisSpec, configurePolicyEngine, loadStateFile, validateAnswers, type ApiErrorBody, type CurveCache, type CurveResponse, type HouseholdEvaluation } from "@hotgap/core";
import { CA_SINGLE_ONE_KID as raw, peBody, respond } from "../../core/src/testing.js";
import { curveCache, handleRequest, localRateLimiter, type Deps } from "./index.js";

const v = validateAnswers(raw);
if (!v.ok) throw new Error(v.detail);
const body = peBody(axisSpec(v.value));

const ok = respond(() => new Response(body, { status: 200 }));
const down = respond(() => new Response("boom", { status: 500 }));
const slow = respond(() => { throw new DOMException("timeout", "TimeoutError"); });

function memoryCache(): CurveCache & { store: Map<string, CurveResponse> } {
  const store = new Map<string, CurveResponse>();
  return { store, get: (k) => store.get(k), set: (k, c) => void store.set(k, c) };
}

const deps = (over: Partial<Deps> = {}): Deps => ({
  fetchImpl: ok,
  cache: memoryCache(),
  loadStateFile: async (state) => loadStateFile(state),
  allow: async () => true,
  ...over,
});

const post = (json: unknown, headers: Record<string, string> = {}) =>
  new Request("https://hotgap.example/api/evaluate", {
    method: "POST",
    body: typeof json === "string" ? json : JSON.stringify(json),
    headers: { "Content-Type": "application/json", ...headers },
  });

const errorOf = async (res: Response) => (await res.json()) as ApiErrorBody;

// Probes are memoized per endpoint and process; a distinct endpoint per suite
// keeps one test's fetch counts from depending on another's.
configurePolicyEngine({ url: "https://worker-test.example/us/calculate" });
afterEach(() => configurePolicyEngine({ url: "https://worker-test.example/us/calculate" }));

describe("POST /api/evaluate", () => {
  it("returns the HouseholdEvaluation for valid answers, live, and never caches the response itself", async () => {
    const res = await handleRequest(post(raw), deps());
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const ev = (await res.json()) as HouseholdEvaluation;
    expect(ev.source).toBe("live");
    expect(ev.answers.state).toBe("CA");
    expect(ev.curve.points).toHaveLength(axisSpec(v.value).count);
    expect(ev.analysis.verdict).toBeDefined();
  });

  it("resolves a ZIP in the body to the state and county", async () => {
    const { state: _s, ...noState } = raw;
    const res = await handleRequest(post({ ...noState, zip: "94110" }), deps());
    expect(res.status).toBe(200);
    const ev = (await res.json()) as HouseholdEvaluation;
    expect([ev.answers.state, ev.answers.countyFips]).toEqual(["CA", "06075"]);
  });

  it("rejects bad input with core's own detail, and non-JSON with its own", async () => {
    expect(await errorOf(await handleRequest(post({ ...raw, state: "ZZ" }), deps()))).toEqual({ error: "bad_input", detail: "state" });
    expect(await errorOf(await handleRequest(post({ ...raw, state: undefined, zip: "00000" }), deps()))).toEqual({ error: "bad_input", detail: "no state for ZIP 00000" });
    const res = await handleRequest(post("{not json"), deps());
    expect(res.status).toBe(400);
    expect(await errorOf(res)).toEqual({ error: "bad_input", detail: "invalid JSON" });
  });

  it("refuses a body no household could need", async () => {
    const res = await handleRequest(post({ ...raw, note: "x".repeat(20_000) }), deps());
    expect(res.status).toBe(413);
    expect((await errorOf(res)).error).toBe("payload_too_large");
  });

  it("serves the second identical household from the curve cache without asking PolicyEngine again", async () => {
    let calls = 0;
    const counting = respond(() => { calls++; return new Response(body, { status: 200 }); });
    const d = deps({ fetchImpl: counting });
    expect((await handleRequest(post(raw), d)).status).toBe(200);
    const after = calls;
    expect(after).toBeGreaterThan(0);
    expect((await handleRequest(post(raw), d)).status).toBe(200);
    expect(calls).toBe(after);
    expect((d.cache as ReturnType<typeof memoryCache>).store.size).toBe(1);
  });

  it("falls back to the archetype curve when PolicyEngine fails, fetching the state file through the loader", async () => {
    const asked: string[] = [];
    const d = deps({ fetchImpl: down, loadStateFile: async (s) => { asked.push(s); return loadStateFile(s); } });
    const res = await handleRequest(post(raw), d);
    expect(res.status).toBe(200);
    expect(((await res.json()) as HouseholdEvaluation).source).toBe("archetype");
    expect(asked).toEqual(["CA"]);
    // Nothing is cached for a fallback: the next request tries live again.
    expect((d.cache as ReturnType<typeof memoryCache>).store.size).toBe(0);
  });

  it("maps an upstream timeout to 504 and an upstream error to 502 when there is no archetype either", async () => {
    const none = { loadStateFile: async () => null };
    const timeout = await handleRequest(post(raw), deps({ fetchImpl: slow, ...none }));
    expect(timeout.status).toBe(504);
    expect((await errorOf(timeout)).error).toBe("upstream_timeout");
    const failed = await handleRequest(post(raw), deps({ fetchImpl: down, ...none }));
    expect(failed.status).toBe(502);
    expect(await errorOf(failed)).toMatchObject({ error: "upstream_error", detail: expect.stringContaining("500") });
  });

  it("rate-limits by the client key it is handed, with a Retry-After", async () => {
    const seen: string[] = [];
    const d = deps({ allow: async (key) => { seen.push(key); return false; } });
    const res = await handleRequest(post(raw, { "cf-connecting-ip": "203.0.113.9" }), d);
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("60");
    expect(await errorOf(res)).toEqual({ error: "rate_limited" });
    expect(seen).toEqual(["203.0.113.9"]);
  });

  it("caps live evaluations in flight and tells the rest to retry", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const blocked = respond(async () => { await gate; return new Response(body, { status: 200 }); });
    const d = deps({ fetchImpl: blocked });
    const pending = Array.from({ length: 4 }, () => handleRequest(post(raw), d));
    // Let the four reach their upstream call before the fifth arrives.
    await new Promise((r) => setTimeout(r, 0));
    const fifth = await handleRequest(post(raw), d);
    expect(fifth.status).toBe(503);
    expect(fifth.headers.get("retry-after")).toBe("5");
    release();
    expect((await Promise.all(pending)).map((r) => r.status)).toEqual([200, 200, 200, 200]);
    // Slots are freed again.
    expect((await handleRequest(post(raw), d)).status).toBe(200);
  });
});

describe("routing", () => {
  it("answers health checks on GET only", async () => {
    const res = await handleRequest(new Request("https://hotgap.example/api/health"), deps());
    expect(await res.json()).toEqual({ ok: true });
    expect((await handleRequest(new Request("https://hotgap.example/api/health", { method: "POST" }), deps())).status).toBe(405);
  });
  it("is 405 for GET /api/evaluate and 404 elsewhere under /api", async () => {
    expect((await handleRequest(new Request("https://hotgap.example/api/evaluate"), deps())).status).toBe(405);
    expect((await handleRequest(new Request("https://hotgap.example/api/curve", { method: "POST" }), deps())).status).toBe(404);
  });
});

describe("localRateLimiter", () => {
  it("allows the budget per key per window, then refuses until the window passes", async () => {
    let t = 0;
    const allow = localRateLimiter({ limit: 2, periodMs: 1000 }, () => t);
    expect([await allow("a"), await allow("a"), await allow("a")]).toEqual([true, true, false]);
    expect(await allow("b")).toBe(true);
    t = 1000;
    expect(await allow("a")).toBe(true);
  });
});

describe("curveCache over the Cache API", () => {
  it("stores a curve as a JSON response with the TTL under the engine's host, and reads it back", async () => {
    const store = new Map<string, Response>();
    const fake = {
      match: async (url: string) => store.get(url)?.clone(),
      put: async (url: string, res: Response) => { store.set(url, res); },
    } as unknown as Cache;
    const waited: Promise<unknown>[] = [];
    // /healthz names the release; the key carries it.
    const healthz = respond(() => new Response(JSON.stringify({ model: "policyengine-us", version: "2.6.2" })));
    const cache = curveCache(fake, (p) => waited.push(p), healthz);
    const curve: CurveResponse = { year: "2026", currentEarnings: 1, points: [] };
    expect(await cache.get("k")).toBeUndefined();
    await cache.set("k", curve);
    await Promise.all(waited);
    expect(store.get("https://cache.hotgap.invalid/curve/worker-test.example/2.6.2/k")?.headers.get("cache-control")).toBe("public, max-age=604800");
    expect(await cache.get("k")).toEqual(curve);
    // Another engine's curve is another entry: a changed endpoint never serves the old model's numbers.
    configurePolicyEngine({ url: "https://other.example/us/calculate" });
    expect(await cache.get("k")).toBeUndefined();
  });
});
