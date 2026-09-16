import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { isDeepStrictEqual, parseArgs as parseNodeArgs } from "node:util";
import {
  ARCHETYPES,
  STATE_CODES,
  answersFor,
  buildCurvePayload,
  fetchCurve,
  modelVersion,
  peUrl,
  runQueue,
  sleep,
  type CurvePoint,
  type ModelRecord,
  type StateFileJson,
  type SummaryJson,
} from "@hotgap/core";
import {
  buildStateFile,
  buildSummary,
  roundPoint,
  validateResults,
  type ResultsByStateArchetype,
  type ValidationGap,
} from "./build.js";

// 50 states + DC, the full weekly sweep. --states overrides this for partial
// runs. Sourced from core's STATE_CODES so there's one list of states in the repo.
export const ALL_STATES: string[] = [...STATE_CODES];

const DEFAULT_CONCURRENCY = 3;
// Per-request retry: up to 3 total attempts, waiting 2s then 8s between them
// (handed straight to core's requestPE).
const RETRY_DELAYS_MS = [2000, 8000];
const BATCH_TIMEOUT_MS = 90_000;

export interface RunOptions {
  states: string[];
  concurrency: number;
  dryRun: boolean;
  fromData: boolean;
}

export interface RunResult {
  ok: boolean;
  dryRun: boolean;
  gaps: ValidationGap[];
  summary?: SummaryJson;
  stateFiles?: Record<string, StateFileJson>;
}

export interface OutputPaths {
  summaryPath: string;
  statesDir: string;
}

export type SleepFn = (ms: number) => Promise<void>;

export function parseArgs(argv: string[]): RunOptions {
  const { values } = parseNodeArgs({
    args: argv,
    options: {
      states: { type: "string" },
      concurrency: { type: "string" },
      "dry-run": { type: "boolean" },
      "from-data": { type: "boolean" },
    },
  });
  return {
    states: values.states ? values.states.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean) : ALL_STATES,
    concurrency: values.concurrency === undefined ? DEFAULT_CONCURRENCY : Number(values.concurrency),
    dryRun: values["dry-run"] === true,
    fromData: values["from-data"] === true,
  };
}

export async function runPipeline(
  opts: RunOptions,
  fetchImpl: typeof fetch = fetch,
  sleepImpl: SleepFn = sleep,
): Promise<RunResult> {
  const tasks = opts.states.flatMap((state) => ARCHETYPES.map((archetype) => ({ state, archetype })));

  if (opts.dryRun) {
    for (const { state, archetype } of tasks) buildCurvePayload(answersFor(state, archetype));
    return { ok: true, dryRun: true, gaps: [] };
  }

  const results: ResultsByStateArchetype = {};
  await runQueue(tasks, opts.concurrency, async ({ state, archetype }) => {
    try {
      const answers = answersFor(state, archetype);
      // Every batch request gets the longer budget, including requests that
      // do not send parameter overrides.
      // opts.concurrency households run at once; keep the Massachusetts point
      // loop small so the API is never asked for more than ~9 things at a time.
      const curve = await fetchCurve(answers, { fetchImpl, timeoutMs: BATCH_TIMEOUT_MS, retryDelaysMs: RETRY_DELAYS_MS, sleep: sleepImpl, resampleConcurrency: 3 });
      results[state] ??= {};
      results[state][archetype.id] = curve.points.map(roundPoint);
    } catch (e) {
      console.error(`fetch failed for ${state} × ${archetype.id}: ${(e as Error).message}`);
    }
  });

  const validation = validateResults(opts.states, results);
  if (!validation.ok) return { ok: false, dryRun: false, gaps: validation.gaps };

  const generated = new Date().toISOString();
  const model: ModelRecord = { endpoint: new URL(peUrl()).host, version: await modelVersion({ fetchImpl }) };
  const summary = buildSummary(generated, opts.states, results, model);
  const stateFiles: Record<string, StateFileJson> = {};
  for (const state of opts.states) stateFiles[state] = buildStateFile(generated, state, results, model);

  return { ok: true, dryRun: false, gaps: [], summary, stateFiles };
}

// --from-data support: recompute summary.json offline from the committed
// per-state files, with zero network calls and the committed state files
// left byte-identical (we only ever read them).

export type ReadStateFileFn = (state: string) => Promise<string>;

/** Pure: pulls the per-archetype point arrays back out of a stored state file. */
export function resultsFromStateFile(file: StateFileJson): Record<string, CurvePoint[]> {
  const byArchetype: Record<string, CurvePoint[]> = {};
  for (const [archetypeId, { points }] of Object.entries(file.archetypes)) {
    byArchetype[archetypeId] = points;
  }
  return byArchetype;
}

/** Reads `{statesDir}/{state}.json` from disk — the injectable default for runFromData. */
export function defaultReadStateFile(statesDir: string): ReadStateFileFn {
  return (state) => readFile(path.join(statesDir, `${state}.json`), "utf8");
}

export async function runFromData(states: string[], readStateFile: ReadStateFileFn): Promise<RunResult> {
  const results: ResultsByStateArchetype = {};
  const models: (ModelRecord | undefined)[] = [];
  for (const state of states) {
    try {
      const raw = await readStateFile(state);
      const file = JSON.parse(raw) as StateFileJson;
      results[state] = resultsFromStateFile(file);
      models.push(file.model);
    } catch (e) {
      // Missing/unreadable/corrupt file: leave the state absent from `results`
      // so validateResults reports it as a normal "missing" gap below.
      console.error(`--from-data: could not read state file for ${state}: ${(e as Error).message}`);
    }
  }

  const validation = validateResults(states, results);
  if (!validation.ok) return { ok: false, dryRun: false, gaps: validation.gaps };

  // The summary's provenance is the state files' — when they agree. A mix of
  // models (partial re-sweeps against different endpoints) has no single name.
  const model = models[0] && models.every((m) => isDeepStrictEqual(m, models[0])) ? models[0] : undefined;
  const generated = new Date().toISOString();
  const summary = buildSummary(generated, states, results, model);
  return { ok: true, dryRun: false, gaps: [], summary };
}

// Weekly-sweep noise fix: every summary.json/state file embeds a `generated`
// stamp, so a naive write makes all 52 files change every week even when no
// number moved. `generated` should mean "the sweep that last changed this
// file's numbers" (core/src/data.ts documents this), so before writing we
// compare the new content against what's on disk with `generated` stripped
// from both sides, and skip the write entirely when nothing else differs.

function stripGenerated(value: unknown): unknown {
  if (typeof value !== "object" || value === null) return value;
  const { generated: _generated, ...rest } = value as Record<string, unknown>;
  return rest;
}

/** Pure: deep-equal once each side's top-level `generated` key is removed (the only stamp either artifact carries). */
export function sameIgnoringGenerated(a: unknown, b: unknown): boolean {
  return isDeepStrictEqual(stripGenerated(a), stripGenerated(b));
}

/** Pure: a partial sweep's summary laid over the existing one, state by state; the states it did not sweep keep their rows. */
export function mergePartial(existing: Partial<SummaryJson>, partial: SummaryJson): SummaryJson {
  const swept = new Set(Object.keys(partial.states));
  const unmodeled = [...(existing.childcareSubsidyUnmodeled ?? []).filter((s) => !swept.has(s)), ...(partial.childcareSubsidyUnmodeled ?? [])];
  return {
    ...partial,
    ...(unmodeled.length ? { childcareSubsidyUnmodeled: unmodeled } : {}),
    states: { ...existing.states, ...partial.states },
    ...(existing.coverage || partial.coverage ? { coverage: { ...existing.coverage, ...partial.coverage } } : {}),
  };
}

/** Parses `filePath` as JSON; undefined when it's missing or unparsable, so the caller overwrites unconditionally. */
async function readExistingJson(filePath: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return undefined;
  }
}

export async function writeSummary(summaryPath: string, summary: SummaryJson): Promise<void> {
  await mkdir(path.dirname(summaryPath), { recursive: true });
  const existing = (await readExistingJson(summaryPath)) as Partial<SummaryJson> | undefined;
  // A partial run (--states) must not drop the states it did not sweep: merge
  // everything keyed by state — metrics, coverage, and the unmodeled list —
  // into the existing file rather than replacing the file.
  const next = existing?.states ? mergePartial(existing, summary) : summary;
  if (existing !== undefined && sameIgnoringGenerated(existing, next)) return;
  await writeFile(summaryPath, JSON.stringify(next));
}

export async function writeOutputs(
  paths: OutputPaths,
  summary: SummaryJson,
  stateFiles: Record<string, StateFileJson>,
): Promise<void> {
  await writeSummary(paths.summaryPath, summary);
  await mkdir(paths.statesDir, { recursive: true });
  for (const [state, file] of Object.entries(stateFiles)) {
    const statePath = path.join(paths.statesDir, `${state}.json`);
    const existing = await readExistingJson(statePath);
    if (existing !== undefined && sameIgnoringGenerated(existing, file)) continue;
    await writeFile(statePath, JSON.stringify(file));
  }
}

const DEFAULT_PATHS: OutputPaths = {
  summaryPath: path.join(process.cwd(), "core/data/summary.json"),
  statesDir: path.join(process.cwd(), "core/data/states"),
};

export async function main(argv: string[] = process.argv.slice(2)): Promise<number> {
  const opts = parseArgs(argv);

  if (opts.fromData) {
    const result = await runFromData(opts.states, defaultReadStateFile(DEFAULT_PATHS.statesDir));
    if (!result.ok) {
      console.error(`Validation failed: ${result.gaps.length} gap(s)`);
      for (const g of result.gaps) console.error(`  ${g.state} × ${g.archetypeId}: ${g.reason}`);
      return 1;
    }
    await writeSummary(DEFAULT_PATHS.summaryPath, result.summary!);
    console.log(`Recomputed summary.json from ${opts.states.length} on-disk state file(s) — no network calls, state files untouched.`);
    return 0;
  }

  const result = await runPipeline(opts, fetch);

  if (opts.dryRun) {
    console.log(`dry-run: built payloads for ${opts.states.length} state(s) × ${ARCHETYPES.length} archetypes`);
    return 0;
  }
  if (!result.ok) {
    console.error(`Validation failed: ${result.gaps.length} gap(s)`);
    for (const g of result.gaps) console.error(`  ${g.state} × ${g.archetypeId}: ${g.reason}`);
    return 1;
  }

  await writeOutputs(DEFAULT_PATHS, result.summary!, result.stateFiles!);
  console.log(`Wrote summary.json and ${opts.states.length} state file(s).`);
  return 0;
}

// Only run the CLI when this file is the invoked entrypoint (via `tsx
// pipeline/src/run.ts`), not when imported as a module by tests.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then((code) => {
    process.exitCode = code;
  });
}
