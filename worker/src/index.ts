// The HotGap Worker: /api/* in front of the static site. It evaluates a
// household with @hotgap/core against the hosted PolicyEngine so the page
// never carries the bearer token, the endpoint probes, the data tables or the
// calculation library — the page renders what this returns.
//
// Per request the Worker does O(household) validation, one canonical
// serialization for the cache key, and, on a cache miss, one PolicyEngine
// round trip per curve (two for an SSDI household, one more per point the
// Massachusetts feedback loop re-asks, and a second curve when an entitlement
// is turned off). The analysis itself is O(points × programs) and measured
// under 2 ms on a 151-point curve, well inside the free plan's 10 ms of CPU.
import {
  configurePolicyEngine,
  evaluateHousehold,
  peUrl,
  PolicyEngineError,
  provideData,
  validateAnswers,
  type ApiErrorBody,
  type ApiErrorCode,
  type CurveCache,
  type CurveResponse,
  type HouseholdEvaluation,
  type StateFileJson,
} from "@hotgap/core";
import reach from "@hotgap/core/data/reach.json";
import stateDefaults from "@hotgap/core/data/state-defaults.json";
import zip3State from "@hotgap/core/data/zip3-state.json";
import zip5County from "@hotgap/core/data/zip5-county.json";

// The four small tables core reads synchronously, bundled (about 930 KB raw
// against a 64 MiB limit) and provided once per isolate. The 51 state files
// (29 MB) are not bundled: the fallback fetches the one it needs from the
// static assets (loadStateFile below), and only when PolicyEngine has failed.
provideData({ "reach.json": reach, "state-defaults.json": stateDefaults, "zip3-state.json": zip3State, "zip5-county.json": zip5County });

/** A live curve is a function of the answers and the model, not of the sweep, so a week is safe. */
const CACHE_TTL_S = 7 * 24 * 3600;
/** Per PolicyEngine request. The engine answers a plain curve in seconds; a policy-override curve took 34–39 s on the public API. */
const UPSTREAM_TIMEOUT_MS = 60_000;
/** Live evaluations one isolate will run at once; the rest are told to retry. The engine has two workers. */
const MAX_IN_FLIGHT = 4;
/** The Massachusetts feedback loop's point requests in flight (core's default is 8, sized for the public API). */
const RESAMPLE_CONCURRENCY = 2;
/** A household is a few hundred bytes of JSON; anything near this is not one. */
const MAX_BODY_BYTES = 16 * 1024;

/** What the handler needs from its environment, so a test can hand it fakes. */
export interface Deps {
  fetchImpl: typeof fetch;
  /** The curve cache core consults inside fetchCurve; only live curves are ever stored. */
  cache: CurveCache;
  /** The committed sweep file for a state, for the fallback path only. */
  loadStateFile: (state: string) => Promise<StateFileJson | null>;
  /** Whether this client may evaluate now (the rate-limit binding; true when there is none). */
  allow: (clientKey: string) => Promise<boolean>;
}

const json = (status: number, body: unknown, headers: Record<string, string> = {}): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers },
  });

const error = (status: number, error: ApiErrorCode, detail?: string, headers?: Record<string, string>): Response =>
  json(status, { error, ...(detail === undefined ? {} : { detail }) } satisfies ApiErrorBody, headers);

// Live evaluations this isolate is running. A per-isolate bound, not a
// global one — Cloudflare runs many isolates — so it caps what one isolate
// can throw at the engine; the rate-limit binding is the per-client brake.
let inFlight = 0;

async function evaluate(req: Request, deps: Deps): Promise<Response> {
  const length = Number(req.headers.get("content-length") ?? 0);
  if (length > MAX_BODY_BYTES) return error(413, "payload_too_large");
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) return error(413, "payload_too_large");
  let input: unknown;
  try {
    input = JSON.parse(text);
  } catch {
    return error(400, "bad_input", "invalid JSON");
  }
  const v = validateAnswers(input);
  if (!v.ok) return error(400, "bad_input", v.detail);

  const client = req.headers.get("cf-connecting-ip") ?? "anonymous";
  if (!(await deps.allow(client))) return error(429, "rate_limited", undefined, { "Retry-After": "60" });
  if (inFlight >= MAX_IN_FLIGHT) return error(503, "busy", undefined, { "Retry-After": "5" });

  inFlight++;
  try {
    const evaluation: HouseholdEvaluation = await evaluateHousehold(v.value, {
      fetchImpl: deps.fetchImpl,
      cache: deps.cache,
      loadStateFile: deps.loadStateFile,
      timeoutMs: UPSTREAM_TIMEOUT_MS,
      resampleConcurrency: RESAMPLE_CONCURRENCY,
    });
    return json(200, evaluation);
  } catch (e) {
    // Only reached when the archetype fallback could not answer either (no
    // swept curve for this household's shape, or no state file). The answers
    // are never logged.
    if (e instanceof PolicyEngineError) {
      console.error(JSON.stringify({ event: "upstream_failed", kind: e.kind, status: e.status ?? null, message: e.message }));
      return e.kind === "timeout" ? error(504, "upstream_timeout", e.message) : error(502, "upstream_error", e.message);
    }
    console.error(JSON.stringify({ event: "evaluate_failed", message: e instanceof Error ? e.message : String(e) }));
    return error(500, "internal");
  } finally {
    inFlight--;
  }
}

export async function handleRequest(req: Request, deps: Deps): Promise<Response> {
  const { pathname } = new URL(req.url);
  if (pathname === "/api/health") {
    return req.method === "GET" ? json(200, { ok: true }) : error(405, "method_not_allowed", undefined, { Allow: "GET" });
  }
  if (pathname === "/api/evaluate") {
    return req.method === "POST" ? evaluate(req, deps) : error(405, "method_not_allowed", undefined, { Allow: "POST" });
  }
  return error(404, "not_found");
}

/**
 * A synthetic URL the Cache API can key on; the host is never fetched. Core's
 * key covers the household, the request and the policy but not the engine,
 * so the engine's host goes in the path: a curve from one model is never
 * served for another after the endpoint secret changes.
 */
const cacheUrl = (key: string) => `https://cache.hotgap.invalid/curve/${new URL(peUrl()).host}/${key}`;

/** Core's CurveCache over the Cache API: a stored curve is a JSON response with the TTL as its max-age. */
export function curveCache(cache: Cache, waitUntil: (p: Promise<unknown>) => void): CurveCache {
  return {
    async get(key) {
      const hit = await cache.match(cacheUrl(key));
      return hit ? ((await hit.json()) as CurveResponse) : undefined;
    },
    set(key, curve) {
      const stored = new Response(JSON.stringify(curve), {
        headers: { "Content-Type": "application/json", "Cache-Control": `public, max-age=${CACHE_TTL_S}` },
      });
      waitUntil(cache.put(cacheUrl(key), stored));
    },
  };
}

/** The two secrets (`wrangler secret put`, or worker/.dev.vars locally). Not in wrangler.toml, so not in the generated Env. */
type Secrets = { HOTGAP_PE_URL?: string; HOTGAP_PE_TOKEN?: string };

export default {
  async fetch(req: Request, env: Env & Secrets, ctx: ExecutionContext): Promise<Response> {
    // Secrets are bindings, not config; an unset pair leaves core on the public API.
    configurePolicyEngine({ url: env.HOTGAP_PE_URL, token: env.HOTGAP_PE_TOKEN });
    return handleRequest(req, {
      // Bound, because workerd's fetch checks its receiver and a bare reference
      // invoked later throws "Illegal invocation".
      fetchImpl: fetch.bind(globalThis),
      cache: curveCache(caches.default, (p) => ctx.waitUntil(p)),
      loadStateFile: async (state) => {
        const res = await env.ASSETS.fetch(new URL(`/data/states/${state}.json`, req.url));
        return res.ok ? ((await res.json()) as StateFileJson) : null;
      },
      allow: async (key) => (await env.RATE_LIMIT.limit({ key })).success,
    });
  },
} satisfies ExportedHandler<Env>;
