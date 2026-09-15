// The one place HotGap talks to PolicyEngine. Wraps the public, keyless
// POST /us/calculate with a timeout, optional retries, error classification,
// and an optional result cache keyed on the household answers.
import { createHash } from "node:crypto";
import { parsePEResponse, PEParseError } from "./parse.js";
import { SGA_ANNUAL } from "./policyYear.js";
import { axisSpec, buildPEPayload, type AxisSpec } from "./translate.js";
import { YEAR, type CurvePoint, type CurveResponse, type HouseholdAnswers } from "./types.js";

export const PE_URL = "https://api.policyengine.org/us/calculate";
const DEFAULT_TIMEOUT_MS = 25_000;

export type PolicyEngineErrorKind = "timeout" | "network" | "upstream" | "parse";

export class PolicyEngineError extends Error {
  constructor(readonly kind: PolicyEngineErrorKind, message: string, readonly status?: number) {
    super(message);
    this.name = "PolicyEngineError";
  }
}

export interface RequestOptions {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  /** Waits between attempts; one retry per entry. Default: no retries. */
  retryDelaysMs?: number[];
  sleep?: (ms: number) => Promise<void>;
}

export interface CurveCache {
  get(key: string): Promise<CurveResponse | undefined> | CurveResponse | undefined;
  set(key: string, value: CurveResponse): Promise<void> | void;
}

export interface FetchCurveOptions extends RequestOptions {
  cache?: CurveCache;
}

export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function requestOnce(fetchImpl: typeof fetch, payload: unknown, timeoutMs: number): Promise<unknown> {
  let res: Response;
  try {
    res = await fetchImpl(PE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    const { name, message } = e as Error;
    throw new PolicyEngineError(name === "AbortError" || name === "TimeoutError" ? "timeout" : "network", message);
  }
  if (res.status !== 200) {
    // A rejected payload comes back as { status: "error", message } — keep the message.
    const detail = await res.json().then((b) => (b as { message?: string })?.message, () => undefined);
    throw new PolicyEngineError("upstream", `PolicyEngine responded ${res.status}${detail ? `: ${detail}` : ""}`, res.status);
  }
  try {
    return await res.json();
  } catch (e) {
    // The timeout signal also aborts the body stream, so a slow body lands here.
    const { name, message } = e as Error;
    if (name === "AbortError" || name === "TimeoutError") throw new PolicyEngineError("timeout", message);
    throw new PolicyEngineError("upstream", "PolicyEngine returned non-JSON", res.status);
  }
}

/** POST a raw PolicyEngine payload and return the parsed JSON body. */
export async function requestPE(payload: unknown, opts: RequestOptions = {}): Promise<unknown> {
  const { fetchImpl = fetch, timeoutMs = DEFAULT_TIMEOUT_MS, retryDelaysMs = [], sleep: wait = sleep } = opts;
  let lastError: PolicyEngineError | undefined;
  for (let attempt = 0; attempt <= retryDelaysMs.length; attempt++) {
    try {
      return await requestOnce(fetchImpl, payload, timeoutMs);
    } catch (e) {
      lastError = e as PolicyEngineError;
      // A 4xx means our payload is wrong; retrying cannot fix it.
      const ourFault = lastError.status !== undefined && lastError.status >= 400 && lastError.status < 500;
      if (ourFault || attempt >= retryDelaysMs.length) break;
      await wait(retryDelaysMs[attempt]);
    }
  }
  throw lastError;
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : 1));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

/** Stable key for a set of answers: SHA-256 of their key-sorted JSON. */
export function curveCacheKey(answers: HouseholdAnswers): string {
  return createHash("sha256").update(canonical(answers)).digest("hex");
}

function parseOrThrow(body: unknown, count: number): CurvePoint[] {
  try {
    return parsePEResponse(body, count);
  } catch (e) {
    if (e instanceof PEParseError) throw new PolicyEngineError("parse", e.message);
    throw e;
  }
}

/**
 * The SSDI curve, spliced at substantial gainful activity.
 *
 * PolicyEngine has no SGA rule: given `social_security_disability`, it pays
 * the same benefit at every point on the earnings axis, so a single request
 * draws a household that keeps its disability check while earning $90,000.
 * Two requests — one with the benefit, one without — spliced at SGA_ANNUAL put
 * the real cash cliff on the curve: the whole check stops, in one step.
 *
 * This is the steady-state rule only. SSA's nine-month trial work period and
 * the 36-month extended period of eligibility mean a worker does not lose the
 * check the month they first cross SGA, and none of that timing is modeled
 * here — the curve answers "at this pay, eventually", not "next month".
 */
async function fetchSplicedForSSDI(
  answers: HouseholdAnswers,
  axis: AxisSpec,
  opts: RequestOptions,
): Promise<CurvePoint[]> {
  const [receiving, stopped] = await Promise.all([
    requestPE(buildPEPayload(answers), opts),
    requestPE(buildPEPayload({ ...answers, ssdiMonthly: 0 }), opts),
  ]);
  const withSSDI = parseOrThrow(receiving, axis.count);
  const withoutSSDI = parseOrThrow(stopped, axis.count);
  return withSSDI.map((p, i) => (p.earnings <= SGA_ANNUAL ? p : withoutSSDI[i]));
}

/** Full earnings sweep for one household, from PolicyEngine (or the cache). */
export async function fetchCurve(answers: HouseholdAnswers, opts: FetchCurveOptions = {}): Promise<CurveResponse> {
  const key = curveCacheKey(answers);
  const hit = await opts.cache?.get(key);
  if (hit) return hit;

  const axis = axisSpec(answers);
  const points = answers.ssdiMonthly > 0
    ? await fetchSplicedForSSDI(answers, axis, opts)
    : parseOrThrow(await requestPE(buildPEPayload(answers), opts), axis.count);

  const curve: CurveResponse = { year: YEAR, currentEarnings: answers.annualEarnings, points };
  await opts.cache?.set(key, curve);
  return curve;
}
