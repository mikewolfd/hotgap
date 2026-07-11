import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { handleRequest } from "./index.js";

const fixture = readFileSync(new URL("../../fixtures/pe-ca-single-1kid-101.json", import.meta.url), "utf8");

const good = JSON.stringify({
  state: "CA", married: false, age: 30, spouseAge: null, childAges: [5],
  youDisabled: false, spouseDisabled: false, childDisabled: [false],
  monthlyRent: 1500, monthlyChildcare: null,
  annualEarnings: 30000, spouseAnnualEarnings: 0,
});

function fakeCache() {
  const store = new Map<string, Response>();
  return {
    async match(key: Request | string) { const r = store.get(typeof key === "string" ? key : key.url); return r?.clone(); },
    async put(key: Request | string, res: Response) { store.set(typeof key === "string" ? key : key.url, res.clone()); },
    store,
  };
}

const deps = (fetchImpl: typeof fetch, cache = fakeCache()) => ({
  fetchImpl, cache, waitUntil: (p: Promise<unknown>) => { void p; }, promises: [] as Promise<unknown>[],
});

const post = (body: string) =>
  new Request("https://hotgap.example/api/curve", { method: "POST", body, headers: { "Content-Type": "application/json" } });

describe("handleRequest /api/curve", () => {
  it("returns a CurveResponse for valid answers", async () => {
    const d = deps(async () => new Response(fixture, { status: 200 }));
    const res = await handleRequest(post(good), d);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.points).toHaveLength(101);
    expect(body.year).toBe("2026");
    expect(body.currentEarnings).toBe(30000);
  });

  it("rejects invalid input with 400", async () => {
    const d = deps(async () => new Response(fixture, { status: 200 }));
    const res = await handleRequest(post(JSON.stringify({ state: "ZZ" })), d);
    expect(res.status).toBe(400);
    expect(((await res.json()) as any).error).toBe("bad_input");
  });

  it("maps upstream failure to 502", async () => {
    const d = deps(async () => new Response("boom", { status: 500 }));
    const res = await handleRequest(post(good), d);
    expect(res.status).toBe(502);
  });

  it("maps upstream PE error-status JSON to 502", async () => {
    const d = deps(async () => new Response(JSON.stringify({ status: "error", message: "bad variable" }), { status: 200 }));
    const res = await handleRequest(post(good), d);
    expect(res.status).toBe(502);
  });

  it("maps abort to 504", async () => {
    const d = deps(async () => { throw new DOMException("timeout", "AbortError"); });
    const res = await handleRequest(post(good), d);
    expect(res.status).toBe(504);
  });

  it("serves the second identical request from cache without refetching", async () => {
    let calls = 0;
    const cache = fakeCache();
    const d = deps(async () => { calls++; return new Response(fixture, { status: 200 }); }, cache);
    await handleRequest(post(good), d);
    const res2 = await handleRequest(post(good), d);
    expect(res2.status).toBe(200);
    expect(calls).toBe(1);
  });

  it("answers health checks", async () => {
    const d = deps(async () => new Response(""));
    const res = await handleRequest(new Request("https://hotgap.example/api/health"), d);
    expect(((await res.json()) as any).ok).toBe(true);
  });
});
