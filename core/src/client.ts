// The one place HotGap talks to PolicyEngine. Wraps the public, keyless
// POST /us/calculate with a timeout, optional retries, error classification,
// and an optional result cache keyed on the household, request and overrides.
import { createHash } from "node:crypto";
import { maTafdcGrant, maTafdcResampleIndices } from "./maTafdc.js";
import { parsePEResponse, PEParseError } from "./parse.js";
import { SGA_ANNUAL } from "./policyYear.js";
import { policyOverridesFor, type PolicyOverrides } from "./policyOverrides.js";
import { axisSpec, buildPEPayload, type AxisSpec, type PayloadOptions } from "./translate.js";
import { YEAR, type CurvePoint, type CurveResponse, type HouseholdAnswers } from "./types.js";

export const PE_URL = "https://api.policyengine.org/us/calculate";
const DEFAULT_TIMEOUT_MS = 25_000;
// The service builds a reform for per-request parameters. Live probes took
// 34–39 s end to end; use the batch budget for these requests too.
const POLICY_TIMEOUT_MS = 90_000;

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
  /**
   * In-flight limit for the Massachusetts feedback loop's point requests.
   * Measured 2026-09-15 on fresh households (64 points): 49 s at 3, 27 s at
   * 6, 21 s at 10, 45 s at 15 as the API saturates. Default 8; a batch that
   * already runs several households at once should pass less.
   */
  resampleConcurrency?: number;
}

export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Run `worker` over `tasks` with at most `concurrency` in flight; order of completion is not preserved. */
export async function runQueue<T>(tasks: T[], concurrency: number, worker: (task: T) => Promise<void>): Promise<void> {
  let next = 0;
  async function pull(): Promise<void> {
    while (next < tasks.length) {
      const task = tasks[next++];
      await worker(task);
    }
  }
  const workers = Math.max(1, Math.min(concurrency, tasks.length));
  await Promise.all(Array.from({ length: workers }, pull));
}

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

/** Stable key including the exact request, year, axis and effective overrides. */
export function curveCacheKey(answers: HouseholdAnswers, policy: PolicyOverrides = policyOverridesFor(answers)): string {
  return createHash("sha256").update(canonical({ answers, payload: buildPEPayload(answers), policy })).digest("hex");
}

/** Household request with HotGap's sourced parameter corrections. */
export function buildCurvePayload(answers: HouseholdAnswers, opts: PayloadOptions = {}) {
  const policy = policyOverridesFor(answers);
  return { ...buildPEPayload(answers, opts), ...(Object.keys(policy).length ? { policy } : {}) };
}

function parseOrThrow(body: unknown, count: number): CurvePoint[] {
  try {
    return parsePEResponse(body, count);
  } catch (e) {
    if (e instanceof PEParseError) throw new PolicyEngineError("parse", e.message);
    throw e;
  }
}

/** Above substantial gainful activity: still disabled, no SSI pathway. */
const ABOVE_SGA: PayloadOptions = { ssiPathway: false };

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
 *
 * The "stopped" request drops `is_ssi_disabled` as well (ssiPathway: false).
 * The person is still disabled, but work at SGA bars a new disability finding,
 * so leaving the SSI flag on handed them SSI and SSI-linked Medicaid above
 * SGA that no such worker can get — an OH household at $22–24k was shown SSI
 * $1,438 and Medicaid $11,078 ending at $24k as a cliff that does not exist.
 */
async function fetchSplicedForSSDI(
  answers: HouseholdAnswers,
  axis: AxisSpec,
  opts: RequestOptions,
): Promise<CurvePoint[]> {
  const [receiving, stopped] = await Promise.all([
    requestPE(buildCurvePayload(answers), opts),
    requestPE(buildCurvePayload({ ...answers, ssdiMonthly: 0 }, ABOVE_SGA), opts),
  ]);
  const withSSDI = parseOrThrow(receiving, axis.count);
  const withoutSSDI = parseOrThrow(stopped, axis.count);
  return withSSDI.map((p, i) => (p.earnings <= SGA_ANNUAL ? p : withoutSSDI[i]));
}

/** Full earnings sweep for one household, from PolicyEngine (or the cache). */
const RESAMPLE_CONCURRENCY = 8;

/**
 * One earnings point with a forced SPM-unit input. The public endpoint only
 * varies a person-level variable along an axis and rejects arrays for anything
 * else, but a scalar SPM input broadcasts across an axis — so ask for a
 * two-point axis starting at `earnings` and keep the first point.
 */
function pointPayload(answers: HouseholdAnswers, earnings: number, forced: Record<string, number>, opts: PayloadOptions = {}) {
  const payload = buildCurvePayload({ ...answers, annualEarnings: earnings }, opts);
  const h = payload.household as { spm_units: Record<string, Record<string, unknown>>; axes: unknown };
  h.axes = [[{ name: "employment_income", min: earnings, max: earnings + 1000, count: 2, period: YEAR }]];
  for (const [name, value] of Object.entries(forced)) h.spm_units.spm_unit[name] = { [YEAR]: value };
  return payload;
}

/**
 * WORKAROUND — remove when policyengine-us #9477 merges (then the corrected
 * grant equals the engine's own and this loop makes zero requests; delete
 * it, maTafdcResampleIndices, and MaTafdcInputs.engineUsedCorrectedGrant).
 * It leans on an undocumented behavior of the public endpoint: a scalar
 * SPM-unit input broadcasts across a person-level axis. Arrays and parallel
 * axes are rejected.
 *
 * Feed the corrected Massachusetts grant back to PolicyEngine so SNAP,
 * EAEDC, categorical eligibility and net income follow from it — no local
 * benefit math. Only the points whose grant differs from upstream's are
 * re-requested (about thirty for a household with children), one at a time.
 * A no-op once upstream's formula matches the state's rules.
 */
export async function resampleMaTafdc(answers: HouseholdAnswers, points: CurvePoint[], opts: FetchCurveOptions): Promise<CurvePoint[]> {
  const indices = maTafdcResampleIndices(answers, points);
  if (indices.length === 0) return points;
  const out = points.slice();
  await runQueue(indices, opts.resampleConcurrency ?? RESAMPLE_CONCURRENCY, async (i) => {
    const p = points[i];
    // Above SGA the spliced curve came from the no-SSDI request; match it,
    // SSI pathway and all, or the fed-back point contradicts its neighbours.
    const aboveSga = answers.ssdiMonthly > 0 && p.earnings > SGA_ANNUAL;
    const base = aboveSga ? { ...answers, ssdiMonthly: 0 } : answers;
    const grant = maTafdcGrant(p.earnings, answers.spouseAnnualEarnings, p.maTafdc!);
    const [point] = parseOrThrow(await requestPE(pointPayload(base, p.earnings, { ma_tafdc: grant }, aboveSga ? ABOVE_SGA : {}), opts), 2);
    out[i] = { ...point, earnings: p.earnings, maTafdc: { ...point.maTafdc!, engineUsedCorrectedGrant: true } };
  });
  return out;
}

export async function fetchCurve(answers: HouseholdAnswers, opts: FetchCurveOptions = {}): Promise<CurveResponse> {
  const key = curveCacheKey(answers);
  const hit = await opts.cache?.get(key);
  if (hit) return hit;

  const axis = axisSpec(answers);
  const requestOpts = {
    ...opts,
    timeoutMs: opts.timeoutMs ?? (Object.keys(policyOverridesFor(answers)).length ? POLICY_TIMEOUT_MS : DEFAULT_TIMEOUT_MS),
  };
  const swept = answers.ssdiMonthly > 0
    ? await fetchSplicedForSSDI(answers, axis, requestOpts)
    : parseOrThrow(await requestPE(buildCurvePayload(answers), requestOpts), axis.count);
  const points = await resampleMaTafdc(answers, swept, requestOpts);

  const curve: CurveResponse = { year: YEAR, currentEarnings: answers.annualEarnings, points };
  await opts.cache?.set(key, curve);
  return curve;
}
