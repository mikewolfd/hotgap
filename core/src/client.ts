// The one place HotGap talks to PolicyEngine. Wraps the keyless
// POST /us/calculate — the public API, or whatever `HOTGAP_PE_URL` names —
// with a timeout, optional retries, error classification, and an optional
// result cache keyed on the household, request and overrides.
import { createHash } from "node:crypto";
import { maTafdcGrant, maTafdcResampleIndices } from "./maTafdc.js";
import { parsePEResponse, PEParseError } from "./parse.js";
import { SGA_ANNUAL } from "./policyYear.js";
import { statePremiumAssistanceFor } from "./statePremiumAssistance.js";
import { PARENT_LIMITS_UPSTREAM_SINCE, parentMedicaidLimit, policyOverridesFor, releaseAtLeast, type PolicyOverrides } from "./policyOverrides.js";
import { axisSpec, buildPEPayload, earningsVariable, type AxisSpec, type PayloadOptions } from "./translate.js";
import type { ModelRecord } from "./data.js";
import { YEAR, type CurvePoint, type CurveResponse, type HouseholdAnswers } from "./types.js";

export const PE_URL = "https://api.policyengine.org/us/calculate";

/**
 * The endpoint every request goes to: `HOTGAP_PE_URL` when it is set to a
 * non-empty value, the public API otherwise — so nothing changes for anyone
 * who does not set it, and the CLI, the pipeline and the contract suite all
 * follow one switch because all three call through here.
 *
 * `engine/` is a self-hosted stand-in for this endpoint; it runs a newer
 * policyengine-us than the hosted service, which is the point of setting the
 * variable (13 states' child-care subsidy variables exist only in the newer
 * model). Read on every call rather than captured at import, so a process can
 * set it before the first request.
 */
export function peUrl(): string {
  return process.env.HOTGAP_PE_URL?.trim() || PE_URL;
}

/** Headers every request carries: JSON, plus the bearer token a hosted engine may require (HOTGAP_PE_TOKEN). */
export function peHeaders(): Record<string, string> {
  const token = process.env.HOTGAP_PE_TOKEN?.trim();
  return token ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` } : { "Content-Type": "application/json" };
}

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
   * Whether the endpoint counts Massachusetts TAFDC twice. Left unset, a
   * Massachusetts household triggers one cached probe of the endpoint
   * (see probeMaTafdcDoubleCount); tests and fixtures set it explicitly.
   */
  maTafdcDoubleCounted?: boolean;
  /**
   * Whether the endpoint counts the aggregate child-care subsidy in every
   * state (policyengine-us #9503). Left unset, a household with a child-care
   * bill triggers one cached probe of the endpoint (see
   * probeChildcareSubsidyCounted); tests and fixtures set it explicitly.
   */
  childcareSubsidyCounted?: boolean;
  /**
   * Whether to ask the endpoint for the state's modeled premium assistance
   * (statePremiumAssistance.ts). Left unset, a household in one of those
   * states triggers one cached probe of the endpoint for the variable.
   */
  statePremiumAssistance?: boolean;
  /**
   * Whether the model already carries the parent-limit corrections (release
   * ≥ PARENT_LIMITS_UPSTREAM_SINCE). Left unset, one cached /healthz read
   * per endpoint decides; tests set it explicitly.
   */
  parentLimitsUpstream?: boolean;
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
    res = await fetchImpl(peUrl(), {
      method: "POST",
      headers: peHeaders(),
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
    const hint = res.status === 401 ? " (this engine wants a bearer token: set HOTGAP_PE_TOKEN)" : "";
    throw new PolicyEngineError("upstream", `PolicyEngine responded ${res.status}${detail ? `: ${detail}` : ""}${hint}`, res.status);
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
  const policy = policyOverridesFor(answers, { parentLimitsUpstream: opts.parentLimitsUpstream });
  return { ...buildPEPayload(answers, opts), ...(Object.keys(policy).length ? { policy } : {}) };
}

function parseOrThrow(body: unknown, count: number, opts: FetchCurveOptions = {}): CurvePoint[] {
  try {
    return parsePEResponse(body, count, { maTafdcDoubleCounted: opts.maTafdcDoubleCounted, childcareSubsidyCounted: opts.childcareSubsidyCounted });
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
// Above SGA the person is no longer receiving a disability benefit, and SNAP
// defines "disabled" by benefit receipt (7 CFR 271.2), so dropping the SSI
// pathway in the stopped request also removes the elderly-or-disabled
// household's uncapped excess shelter deduction and a state supplement like
// California's SSP. Verified live 2026-09-15 (CA family, $21k, rent $2,903):
// SNAP $13,214 → $8,972, other benefits $4,102 → $0. That is the rule, not a
// side effect, and it deepens the SGA cliff for a high-rent family.
async function fetchSplicedForSSDI(
  answers: HouseholdAnswers,
  axis: AxisSpec,
  opts: FetchCurveOptions,
  payloadOpts: PayloadOptions = {},
): Promise<CurvePoint[]> {
  const [receiving, stopped] = await Promise.all([
    requestPE(buildCurvePayload(answers, payloadOpts), opts),
    requestPE(buildCurvePayload({ ...answers, ssdiMonthly: 0 }, { ...payloadOpts, ...ABOVE_SGA }), opts),
  ]);
  const withSSDI = parseOrThrow(receiving, axis.count, opts);
  const withoutSSDI = parseOrThrow(stopped, axis.count, opts);
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
  h.axes = [[{ name: earningsVariable(answers), min: earnings, max: earnings + 1000, count: 2, period: YEAR }]];
  for (const [name, value] of Object.entries(forced)) h.spm_units.spm_unit[name] = { [YEAR]: value };
  return payload;
}

/**
 * The policyengine-us release `peUrl()` serves, from the engine's /healthz
 * (engine/app.py), or null when the endpoint does not say: the public API
 * has no cheap version route (its metadata document is ~70 MB).
 */
export function modelVersion(opts: RequestOptions = {}): Promise<string | null> {
  // Once per endpoint per process — the hosted API's null included, since
  // neither answer changes within one.
  const endpoint = peUrl();
  let pending = modelVersionCache.get(endpoint);
  if (!pending) {
    pending = readModelVersion(opts);
    modelVersionCache.set(endpoint, pending);
  }
  return pending;
}

const modelVersionCache = new Map<string, Promise<string | null>>();

async function readModelVersion(opts: RequestOptions): Promise<string | null> {
  const { fetchImpl = fetch, timeoutMs = DEFAULT_TIMEOUT_MS } = opts;
  const health = new URL(peUrl());
  health.pathname = "/healthz";
  health.search = "";
  try {
    const res = await fetchImpl(health, { signal: AbortSignal.timeout(timeoutMs) });
    if (res.status !== 200) return null;
    const body = (await res.json()) as { model?: string; version?: string };
    return body.model === "policyengine-us" && typeof body.version === "string" ? body.version : null;
  } catch {
    return null;
  }
}

const variableProbeCache = new Map<string, Promise<boolean>>();

/**
 * Whether `peUrl()` knows a tax-unit variable: a bare household asking for
 * it comes back 200, or 400 "Unrecognized household variable" from a model
 * that predates it (the hosted API lacks every state premium-assistance
 * variable; the engine has them all). One request per endpoint and
 * variable per process; a failed probe is retried next time.
 */
export function endpointHasTaxUnitVariable(variable: string, opts: RequestOptions = {}): Promise<boolean> {
  const key = `${peUrl()} ${variable}`;
  let pending = variableProbeCache.get(key);
  if (!pending) {
    const y = { [YEAR]: 0 };
    const payload = {
      household: {
        people: { person: { age: { [YEAR]: 30 }, employment_income: y } },
        households: { household: { members: ["person"], state_code: { [YEAR]: "CA" } } },
        tax_units: { tax_unit: { members: ["person"], [variable]: { [YEAR]: null } } },
        spm_units: { spm_unit: { members: ["person"] } },
        families: { family: { members: ["person"] } },
        marital_units: { marital_unit: { members: ["person"] } },
      },
    };
    pending = requestPE(payload, opts).then(
      () => true,
      (e) => {
        if (e instanceof PolicyEngineError && e.status === 400 && /unrecognized/i.test(e.message)) return false;
        throw e;
      },
    );
    pending.catch(() => variableProbeCache.delete(key));
    variableProbeCache.set(key, pending);
  }
  return pending;
}

/** Forced TAFDC large enough that no other state benefit can be mistaken for it. */
export const MA_TAFDC_PROBE_SENTINEL = 1_000_000;

const maTafdcProbeCache = new Map<string, Promise<boolean>>();

/**
 * Does this endpoint count Massachusetts TAFDC twice (policyengine-us
 * #9470, fixed in 2.4.4)? Read from the model rather than a version number:
 * force `ma_tafdc` to the sentinel on a bare Massachusetts household and
 * see whether `household_state_benefits` absorbs it. A double-counting model
 * returns the sentinel (verified 2026-09-15 on the public API: $999,999.94,
 * with household_benefits at $2M); a fixed one returns the other state
 * benefits, a few thousand at most. One request per endpoint per process;
 * the parse path then removes the overlap only where it exists, so this
 * workaround retires itself when the API updates.
 */
export function probeMaTafdcDoubleCount(opts: RequestOptions = {}): Promise<boolean> {
  const endpoint = peUrl();
  let pending = maTafdcProbeCache.get(endpoint);
  if (!pending) {
    pending = requestPE(maTafdcProbePayload(), opts).then((body) => {
      const r = (body as { result?: { households?: Record<string, Record<string, Record<string, number>>> } }).result;
      const h = r?.households?.household;
      const stateBenefits = h?.household_state_benefits?.[YEAR];
      const benefits = h?.household_benefits?.[YEAR];
      if (typeof stateBenefits !== "number" || typeof benefits !== "number") {
        throw new PolicyEngineError("parse", "probe returned no household benefit aggregates");
      }
      // An ignored input would look exactly like a fixed model. TANF carries
      // ma_tafdc into household_benefits on both, so the sentinel must show
      // there (as $999,999.94 after float32; a fixed model has it once, a
      // double-counting one twice).
      if (benefits < MA_TAFDC_PROBE_SENTINEL / 2) throw new PolicyEngineError("parse", "probe: forced ma_tafdc did not reach household_benefits");
      return stateBenefits > MA_TAFDC_PROBE_SENTINEL / 2;
    });
    // A failed probe is not an answer; let the next caller ask again.
    pending.catch(() => maTafdcProbeCache.delete(endpoint));
    maTafdcProbeCache.set(endpoint, pending);
  }
  return pending;
}

export function maTafdcProbePayload(): unknown {
  const year = { [YEAR]: 0 };
  return {
    household: {
      people: { person: { age: { [YEAR]: 30 }, employment_income: year } },
      households: { household: { members: ["person"], state_code: { [YEAR]: "MA" }, household_state_benefits: { [YEAR]: null }, household_benefits: { [YEAR]: null } } },
      tax_units: { tax_unit: { members: ["person"] } },
      spm_units: { spm_unit: { members: ["person"], ma_tafdc: { [YEAR]: MA_TAFDC_PROBE_SENTINEL } } },
      families: { family: { members: ["person"] } },
      marital_units: { marital_unit: { members: ["person"] } },
    },
  };
}

/** Forced aggregate subsidy large enough that no other state benefit can be mistaken for it. */
export const CHILDCARE_SUBSIDY_PROBE_SENTINEL = 1_000_000;

const childcareSubsidyProbeCache = new Map<string, Promise<boolean>>();

/**
 * WORKAROUND — goes with stateChildcareSubsidies.ts. Does this endpoint count
 * the aggregate `child_care_subsidies` in `household_state_benefits` for every
 * state (policyengine-us #9503, the fix for #9405)? Read from the model rather
 * than a version number, because the public API has none to read: force the
 * aggregate to the sentinel on a bare Connecticut household — a state no
 * pre-#9503 list ever named — and see whether household_state_benefits absorbs
 * it. A fixed model returns the sentinel; an old one returns the other state
 * benefits, a few thousand at most. One request per endpoint per process;
 * parse.ts then adds the subsidy to net income only where the model dropped
 * it, so the workaround retires itself endpoint by endpoint.
 */
export function probeChildcareSubsidyCounted(opts: RequestOptions = {}): Promise<boolean> {
  const endpoint = peUrl();
  let pending = childcareSubsidyProbeCache.get(endpoint);
  if (!pending) {
    pending = requestPE(childcareSubsidyProbePayload(), opts).then((body) => {
      const r = (body as { result?: { households?: Record<string, Record<string, Record<string, number>>>; spm_units?: Record<string, Record<string, Record<string, number>>> } }).result;
      const stateBenefits = r?.households?.household?.household_state_benefits?.[YEAR];
      const aggregate = r?.spm_units?.spm_unit?.child_care_subsidies?.[YEAR];
      if (typeof stateBenefits !== "number" || typeof aggregate !== "number") {
        throw new PolicyEngineError("parse", "probe returned no child-care subsidy aggregates");
      }
      // An ignored input would look exactly like an old model, so the forced
      // aggregate has to come back as itself before its absence means anything.
      if (aggregate < CHILDCARE_SUBSIDY_PROBE_SENTINEL / 2) throw new PolicyEngineError("parse", "probe: forced child_care_subsidies was not read back");
      return stateBenefits > CHILDCARE_SUBSIDY_PROBE_SENTINEL / 2;
    });
    // A failed probe is not an answer; let the next caller ask again.
    pending.catch(() => childcareSubsidyProbeCache.delete(endpoint));
    childcareSubsidyProbeCache.set(endpoint, pending);
  }
  return pending;
}

export function childcareSubsidyProbePayload(): unknown {
  const year = { [YEAR]: 0 };
  return {
    household: {
      people: { person: { age: { [YEAR]: 30 }, employment_income: year } },
      households: { household: { members: ["person"], state_code: { [YEAR]: "CT" }, household_state_benefits: { [YEAR]: null } } },
      tax_units: { tax_unit: { members: ["person"] } },
      spm_units: { spm_unit: { members: ["person"], child_care_subsidies: { [YEAR]: CHILDCARE_SUBSIDY_PROBE_SENTINEL } } },
      families: { family: { members: ["person"] } },
      marital_units: { marital_unit: { members: ["person"] } },
    },
  };
}

/**
 * The model behind `peUrl()` as a sweep records it (data.ts ModelRecord):
 * its release from /healthz, and what the probes found there.
 */
export async function modelRecord(opts: RequestOptions = {}): Promise<ModelRecord> {
  return {
    endpoint: new URL(peUrl()).host,
    version: await modelVersion(opts),
    countsChildcareSubsidy: await probeChildcareSubsidyCounted(opts),
  };
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
    const pointOpts: PayloadOptions = { statePremiumAssistance: opts.statePremiumAssistance === true, parentLimitsUpstream: opts.parentLimitsUpstream === true, ...(aboveSga ? ABOVE_SGA : {}) };
    const [point] = parseOrThrow(await requestPE(pointPayload(base, p.earnings, { ma_tafdc: grant }, pointOpts), opts), 2, opts);
    out[i] = { ...point, earnings: p.earnings, maTafdc: { ...point.maTafdc!, engineUsedCorrectedGrant: true } };
  });
  return out;
}

export async function fetchCurve(answers: HouseholdAnswers, opts: FetchCurveOptions = {}): Promise<CurveResponse> {
  // The parent-limit override is dropped on a model that already carries the
  // fix (one cached /healthz read per endpoint); the cache key follows the
  // policy actually sent, so it is computed after that.
  const parentLimitsUpstream = opts.parentLimitsUpstream
    ?? (parentMedicaidLimit(answers) !== null && releaseAtLeast(await modelVersion(opts), PARENT_LIMITS_UPSTREAM_SINCE));
  const policy = policyOverridesFor(answers, { parentLimitsUpstream });
  const key = curveCacheKey(answers, policy);
  const hit = await opts.cache?.get(key);
  if (hit) return hit;

  const axis = axisSpec(answers);
  const requestOpts: FetchCurveOptions = {
    ...opts,
    timeoutMs: opts.timeoutMs ?? (Object.keys(policy).length ? POLICY_TIMEOUT_MS : DEFAULT_TIMEOUT_MS),
  };
  if (answers.state === "MA" && requestOpts.maTafdcDoubleCounted === undefined) {
    requestOpts.maTafdcDoubleCounted = await probeMaTafdcDoubleCount(requestOpts);
  }
  // Only a household with a child-care bill can draw the subsidy, so only it
  // needs to know whether the model counts it.
  if ((answers.monthlyChildcare ?? 0) > 0 && requestOpts.childcareSubsidyCounted === undefined) {
    requestOpts.childcareSubsidyCounted = await probeChildcareSubsidyCounted(requestOpts);
  }
  const assistance = statePremiumAssistanceFor(answers.state);
  if (assistance && requestOpts.statePremiumAssistance === undefined) {
    requestOpts.statePremiumAssistance = await endpointHasTaxUnitVariable(assistance.variable, requestOpts);
  }
  const payloadOpts: PayloadOptions = { statePremiumAssistance: requestOpts.statePremiumAssistance === true, parentLimitsUpstream };
  requestOpts.parentLimitsUpstream = parentLimitsUpstream;
  const swept = answers.ssdiMonthly > 0
    ? await fetchSplicedForSSDI(answers, axis, requestOpts, payloadOpts)
    : parseOrThrow(await requestPE(buildCurvePayload(answers, payloadOpts), requestOpts), axis.count, requestOpts);
  const points = await resampleMaTafdc(answers, swept, requestOpts);

  const curve: CurveResponse = { year: YEAR, currentEarnings: answers.annualEarnings, points };
  await opts.cache?.set(key, curve);
  return curve;
}
