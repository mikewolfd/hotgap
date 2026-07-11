import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { ARCHETYPES, answersFor, parsePEResponse, type CurvePoint } from "@hotgap/shared";
import { buildPEPayload, AXIS_COUNT } from "@hotgap/worker/translate";
import {
  buildStateFile,
  buildSummary,
  validateResults,
  type ResultsByStateArchetype,
  type StateFileJson,
  type SummaryJson,
  type ValidationGap,
} from "./build.js";

// 50 states + DC, the full weekly sweep. --states overrides this for partial runs.
export const ALL_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC",
];

const PE_URL = "https://api.policyengine.org/us/calculate";
const DEFAULT_CONCURRENCY = 3;
const RETRY_DELAYS_MS = [2000, 8000];

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

const realSleep: SleepFn = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function splitFlag(arg: string): [string, string | null] {
  const eq = arg.indexOf("=");
  return eq === -1 ? [arg.slice(2), null] : [arg.slice(2, eq), arg.slice(eq + 1)];
}

export function parseArgs(argv: string[]): RunOptions {
  let states = ALL_STATES;
  let concurrency = DEFAULT_CONCURRENCY;
  let dryRun = false;
  let fromData = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (arg === "--from-data") {
      fromData = true;
      continue;
    }
    if (!arg.startsWith("--")) continue;
    const [flag, inline] = splitFlag(arg);
    if (flag === "states") {
      const value = inline ?? argv[++i];
      states = value.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
    } else if (flag === "concurrency") {
      const value = inline ?? argv[++i];
      concurrency = Number(value);
    }
  }
  return { states, concurrency, dryRun, fromData };
}

// Per-request retry: up to 3 total attempts, waiting 2s then 8s between them.
export async function fetchWithRetry(
  fetchImpl: typeof fetch,
  payload: unknown,
  sleepImpl: SleepFn = realSleep,
): Promise<unknown> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const res = await fetchImpl(PE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.status !== 200) throw new Error(`upstream status ${res.status}`);
      return await res.json();
    } catch (e) {
      lastError = e;
      if (attempt < RETRY_DELAYS_MS.length) await sleepImpl(RETRY_DELAYS_MS[attempt]);
    }
  }
  throw lastError;
}

async function runQueue<T>(tasks: T[], concurrency: number, worker: (task: T) => Promise<void>): Promise<void> {
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

export async function runPipeline(
  opts: RunOptions,
  fetchImpl: typeof fetch = fetch,
  sleepImpl: SleepFn = realSleep,
): Promise<RunResult> {
  const tasks = opts.states.flatMap((state) => ARCHETYPES.map((archetype) => ({ state, archetype })));

  if (opts.dryRun) {
    for (const { state, archetype } of tasks) buildPEPayload(answersFor(state, archetype));
    return { ok: true, dryRun: true, gaps: [] };
  }

  const results: ResultsByStateArchetype = {};
  await runQueue(tasks, opts.concurrency, async ({ state, archetype }) => {
    try {
      const payload = buildPEPayload(answersFor(state, archetype));
      const body = await fetchWithRetry(fetchImpl, payload, sleepImpl);
      const points = parsePEResponse(body, AXIS_COUNT);
      results[state] ??= {};
      results[state][archetype.id] = points;
    } catch (e) {
      console.error(`fetch failed for ${state} × ${archetype.id}: ${(e as Error).message}`);
    }
  });

  const validation = validateResults(opts.states, results);
  if (!validation.ok) return { ok: false, dryRun: false, gaps: validation.gaps };

  const generated = new Date().toISOString();
  const summary = buildSummary(generated, opts.states, results);
  const stateFiles: Record<string, StateFileJson> = {};
  for (const state of opts.states) stateFiles[state] = buildStateFile(generated, state, results);

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
  for (const state of states) {
    try {
      const raw = await readStateFile(state);
      const file = JSON.parse(raw) as StateFileJson;
      results[state] = resultsFromStateFile(file);
    } catch (e) {
      // Missing/unreadable/corrupt file: leave the state absent from `results`
      // so validateResults reports it as a normal "missing" gap below.
      console.error(`--from-data: could not read state file for ${state}: ${(e as Error).message}`);
    }
  }

  const validation = validateResults(states, results);
  if (!validation.ok) return { ok: false, dryRun: false, gaps: validation.gaps };

  const generated = new Date().toISOString();
  const summary = buildSummary(generated, states, results);
  return { ok: true, dryRun: false, gaps: [], summary };
}

export async function writeSummary(summaryPath: string, summary: SummaryJson): Promise<void> {
  await mkdir(path.dirname(summaryPath), { recursive: true });
  await writeFile(summaryPath, JSON.stringify(summary));
}

export async function writeOutputs(
  paths: OutputPaths,
  summary: SummaryJson,
  stateFiles: Record<string, StateFileJson>,
): Promise<void> {
  await writeSummary(paths.summaryPath, summary);
  await mkdir(paths.statesDir, { recursive: true });
  for (const [state, file] of Object.entries(stateFiles)) {
    await writeFile(path.join(paths.statesDir, `${state}.json`), JSON.stringify(file));
  }
}

const DEFAULT_PATHS: OutputPaths = {
  summaryPath: path.join(process.cwd(), "app/src/data/places/summary.json"),
  statesDir: path.join(process.cwd(), "app/public/data/states"),
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
