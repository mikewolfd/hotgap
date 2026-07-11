import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { ARCHETYPES } from "@hotgap/shared";
import { parseArgs, fetchWithRetry, runPipeline, writeOutputs, ALL_STATES } from "./run.js";

const fixtureBody = readFileSync(
  new URL("../../fixtures/pe-ca-single-1kid-101.json", import.meta.url),
  "utf8",
);
const noopSleep = async () => {};

describe("ALL_STATES", () => {
  it("lists all 50 states plus DC, uppercase and unique", () => {
    expect(ALL_STATES).toHaveLength(51);
    expect(new Set(ALL_STATES).size).toBe(51);
    expect(ALL_STATES.every((s) => s === s.toUpperCase() && s.length === 2)).toBe(true);
  });
});

describe("parseArgs", () => {
  it("defaults to all 51 states, concurrency 3, dry-run off", () => {
    const opts = parseArgs([]);
    expect(opts).toEqual({ states: ALL_STATES, concurrency: 3, dryRun: false });
  });

  it("parses --states as a comma list (space- or =-separated)", () => {
    expect(parseArgs(["--states", "ca,tx"]).states).toEqual(["CA", "TX"]);
    expect(parseArgs(["--states=CA,TX"]).states).toEqual(["CA", "TX"]);
  });

  it("parses --concurrency and --dry-run", () => {
    const opts = parseArgs(["--concurrency", "5", "--dry-run"]);
    expect(opts.concurrency).toBe(5);
    expect(opts.dryRun).toBe(true);
  });
});

describe("fetchWithRetry", () => {
  it("retries up to 3 attempts with 2s/8s backoff, succeeding on the last try", async () => {
    let calls = 0;
    const fetchImpl = (async () => {
      calls++;
      return calls < 3 ? new Response("", { status: 500 }) : new Response(JSON.stringify({ ok: true }), { status: 200 });
    }) as unknown as typeof fetch;
    const sleeps: number[] = [];
    const body = await fetchWithRetry(fetchImpl, { household: {} }, async (ms) => { sleeps.push(ms); });
    expect(calls).toBe(3);
    expect(sleeps).toEqual([2000, 8000]);
    expect(body).toEqual({ ok: true });
  });

  it("throws after exhausting all 3 attempts", async () => {
    const fetchImpl = (async () => new Response("", { status: 500 })) as unknown as typeof fetch;
    await expect(fetchWithRetry(fetchImpl, {}, noopSleep)).rejects.toThrow();
  });
});

describe("runPipeline", () => {
  it("dry-run builds payloads without ever calling fetch", async () => {
    let called = false;
    const fetchImpl = (async () => { called = true; return new Response("", { status: 200 }); }) as unknown as typeof fetch;
    const result = await runPipeline({ states: ["CA", "TX"], concurrency: 3, dryRun: true }, fetchImpl, noopSleep);
    expect(result).toEqual({ ok: true, dryRun: true, gaps: [] });
    expect(called).toBe(false);
  });

  it("fetches 2 fake states × 8 archetypes from an injected fetch and builds correct summary + state files, with zero real network", async () => {
    let callCount = 0;
    const fetchImpl = (async () => {
      callCount++;
      return new Response(fixtureBody, { status: 200 });
    }) as unknown as typeof fetch;

    const result = await runPipeline({ states: ["ZZ", "YY"], concurrency: 3, dryRun: false }, fetchImpl, noopSleep);

    expect(callCount).toBe(16); // 2 states × 8 archetypes, no retries needed
    expect(result.ok).toBe(true);
    expect(result.gaps).toEqual([]);
    expect(result.summary).toBeDefined();
    expect(result.stateFiles).toBeDefined();

    // Every archetype for both fake states resolves to the same fixture-derived
    // metrics, since the fake fetch always returns the same fixture response.
    for (const state of ["ZZ", "YY"]) {
      expect(Object.keys(result.summary!.states[state])).toHaveLength(8);
      expect(result.summary!.states[state]["single-2"]).toEqual({ biggestLoss: 21957, dangerWidth: expect.any(Number), cliffCount: expect.any(Number) });
      expect(result.summary!.states[state]["single-2"].cliffCount).toBeGreaterThanOrEqual(2);
      expect(result.summary!.states[state]["single-2"].dangerWidth).toBeGreaterThan(0);

      const points = result.stateFiles![state].archetypes["single-2"].points;
      expect(points).toHaveLength(101);
      expect(Number.isInteger(points[0].netIncome)).toBe(true);
    }
    expect(result.summary!.archetypes).toHaveLength(8);
  });

  it("leaves a gap (not a throw) when one archetype exhausts retries, and skips writing summary/state files", async () => {
    const fetchImpl = (async (_url: unknown, init?: RequestInit) => {
      const payload = JSON.parse(init!.body as string);
      const peopleCount = Object.keys(payload.household.people).length;
      // married-3 is the only archetype with 5 people (you, spouse, 3 kids) —
      // fail it every time to simulate an upstream that never recovers.
      if (peopleCount === 5) return new Response("", { status: 500 });
      return new Response(fixtureBody, { status: 200 });
    }) as unknown as typeof fetch;

    const result = await runPipeline({ states: ["CA"], concurrency: 3, dryRun: false }, fetchImpl, noopSleep);

    expect(result.ok).toBe(false);
    expect(result.gaps).toEqual([{ state: "CA", archetypeId: "married-3", reason: "missing" }]);
    expect(result.summary).toBeUndefined();
    expect(result.stateFiles).toBeUndefined();
  });
});

describe("writeOutputs", () => {
  it("writes summary.json and per-state files to disk, creating directories as needed", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "hotgap-pipeline-test-"));
    try {
      const summaryPath = path.join(dir, "nested", "summary.json");
      const statesDir = path.join(dir, "states");
      const summary = { generated: "g", year: "2026", archetypes: ARCHETYPES.map((a) => ({ id: a.id, married: a.married, childAges: a.childAges })), states: {} };
      const stateFiles = { CA: { generated: "g", year: "2026", state: "CA", archetypes: {} } };

      await writeOutputs({ summaryPath, statesDir }, summary as never, stateFiles as never);

      const writtenSummary = JSON.parse(await readFile(summaryPath, "utf8"));
      expect(writtenSummary).toEqual(summary);
      const writtenState = JSON.parse(await readFile(path.join(statesDir, "CA.json"), "utf8"));
      expect(writtenState).toEqual(stateFiles.CA);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
