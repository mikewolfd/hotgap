import { parsePEResponse, PEParseError, YEAR, type CurveResponse } from "@hotgap/shared";
import { buildPEPayload, AXIS_COUNT } from "./translate.js";
import { validateAnswers } from "./validate.js";

const PE_URL = "https://api.policyengine.org/us/calculate";
const UPSTREAM_TIMEOUT_MS = 25_000;
const CACHE_TTL_S = 7 * 24 * 3600;

export interface Deps {
  fetchImpl: typeof fetch;
  cache: { match(key: string): Promise<Response | undefined>; put(key: string, res: Response): Promise<void> };
  waitUntil: (p: Promise<unknown>) => void;
}

const json = (status: number, body: unknown, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...extra },
  });

async function cacheKey(normalized: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(normalized));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `https://cache.hotgap.internal/curve/${hex}`;
}

export async function handleRequest(req: Request, deps: Deps): Promise<Response> {
  const url = new URL(req.url);
  if (url.pathname === "/api/health") return json(200, { ok: true });
  if (url.pathname !== "/api/curve" || req.method !== "POST") return json(404, { error: "not_found" });

  let input: unknown;
  try {
    input = await req.json();
  } catch {
    return json(400, { error: "bad_input", detail: "invalid JSON" });
  }
  const v = validateAnswers(input);
  if (!v.ok) return json(400, { error: "bad_input", detail: v.detail });

  const key = await cacheKey(v.value);
  const hit = await deps.cache.match(key);
  if (hit) return hit;

  let upstream: Response;
  try {
    upstream = await deps.fetchImpl(PE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPEPayload(v.value)),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (e) {
    return json((e as Error).name === "AbortError" || (e as Error).name === "TimeoutError" ? 504 : 502, {
      error: (e as Error).name === "AbortError" || (e as Error).name === "TimeoutError" ? "upstream_timeout" : "upstream_error",
    });
  }
  if (upstream.status !== 200) return json(502, { error: "upstream_error" });

  let points;
  try {
    points = parsePEResponse(await upstream.json(), AXIS_COUNT);
  } catch (e) {
    if (e instanceof PEParseError) return json(502, { error: "upstream_error" });
    throw e;
  }

  const body: CurveResponse = { year: YEAR, currentEarnings: v.value.annualEarnings, points };
  const res = json(200, body, { "Cache-Control": `public, max-age=${CACHE_TTL_S}` });
  deps.waitUntil(deps.cache.put(key, res.clone()));
  return res;
}

export default {
  async fetch(req: Request, _env: unknown, ctx: { waitUntil(p: Promise<unknown>): void }): Promise<Response> {
    const cache = caches.default;
    return handleRequest(req, {
      fetchImpl: fetch,
      cache: {
        match: async (k) => (await cache.match(new Request(k))) ?? undefined,
        put: (k, r) => cache.put(new Request(k), r),
      },
      waitUntil: (p) => ctx.waitUntil(p),
    });
  },
};
