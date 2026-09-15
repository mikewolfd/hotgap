// The one place HotGap talks to PolicyEngine. Wraps the public, keyless
// POST /us/calculate with a timeout, optional retries, error classification,
// and an optional result cache keyed on the household answers.
import { createHash } from "node:crypto";
import { parsePEResponse, PEParseError } from "./parse.js";
import { AXIS_COUNT, buildPEPayload } from "./translate.js";
import { YEAR, type CurveResponse, type HouseholdAnswers } from "./types.js";

export const PE_URL = "https://api.policyengine.org/us/calculate";
const DEFAULT_TIMEOUT_MS = 25_000;

export type PolicyEngineErrorKind = "timeout" | "network" | "upstream" | "parse";

export class PolicyEngineError extends Error {
  constructor(readonly kind: PolicyEngineErrorKind, message: string) {
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

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

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
  if (res.status !== 200) throw new PolicyEngineError("upstream", `PolicyEngine responded ${res.status}`);
  try {
    return await res.json();
  } catch {
    throw new PolicyEngineError("upstream", "PolicyEngine returned non-JSON");
  }
}

/** POST a raw PolicyEngine payload and return the parsed JSON body. */
export async function requestPE(payload: unknown, opts: RequestOptions = {}): Promise<unknown> {
  const { fetchImpl = fetch, timeoutMs = DEFAULT_TIMEOUT_MS, retryDelaysMs = [], sleep = defaultSleep } = opts;
  let lastError: PolicyEngineError | undefined;
  for (let attempt = 0; attempt <= retryDelaysMs.length; attempt++) {
    try {
      return await requestOnce(fetchImpl, payload, timeoutMs);
    } catch (e) {
      lastError = e as PolicyEngineError;
      if (attempt < retryDelaysMs.length) await sleep(retryDelaysMs[attempt]);
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

/** Full earnings sweep for one household, from PolicyEngine (or the cache). */
export async function fetchCurve(answers: HouseholdAnswers, opts: FetchCurveOptions = {}): Promise<CurveResponse> {
  const key = curveCacheKey(answers);
  const hit = await opts.cache?.get(key);
  if (hit) return hit;

  const body = await requestPE(buildPEPayload(answers), opts);
  let points;
  try {
    points = parsePEResponse(body, AXIS_COUNT);
  } catch (e) {
    if (e instanceof PEParseError) throw new PolicyEngineError("parse", e.message);
    throw e;
  }
  const curve: CurveResponse = { year: YEAR, currentEarnings: answers.annualEarnings, points };
  await opts.cache?.set(key, curve);
  return curve;
}
