import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { ARCHETYPES, PROBE_SENTINEL, answersFor, archetypeById, axisSpec, evaluateCurve, parsePEResponse, type StateFileJson } from "@hotgap/core";
import { buildStateFile, buildSummary, type ResultsByStateArchetype, roundPoint } from "./build.js";
import { stateMetrics } from "./metrics.js";
import {
  parseArgs,
  runPipeline,
  runFromData,
  resultsFromStateFile,
  writeOutputs,
  writeSummary,
  mergePartial,
  sameIgnoringGenerated,
  ALL_STATES,
} from "./run.js";

// The stored fixture is a 101-point sweep to $100k; the archetype axis is now
// 151 points to $150k. Pad every series flat beyond the last point so the
// fixture's pinned cliffs, safe exit, and leap are unchanged.
const rawFixture = readFileSync(new URL("../../fixtures/pe-ca-single-1kid-101.json", import.meta.url), "utf8");
const AXIS = axisSpec(answersFor("CA", ARCHETYPES[0]));
function padSeries(value: unknown, count: number): unknown {
  if (Array.isArray(value) && value.length === 101 && typeof value[0] === "number") {
    return [...value, ...Array(count - 101).fill(value[100])];
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, padSeries(v, count)]));
  }
  return value;
}
/** The fixture stretched flat to a given axis, so its pinned cliffs survive whatever length a request asks for. */
function fixtureFor(count: number, max: number): string {
  const json = padSeries(JSON.parse(rawFixture), count) as { result: { axes: { max: number; count: number }[][] } };
  json.result.axes[0][0] = { ...json.result.axes[0][0], max, count };
  return JSON.stringify(json);
}
/** A fake PolicyEngine: answers each request with the fixture on the axis that request asked for. */
function fixtureForRequest(init?: RequestInit): string {
  const axis = JSON.parse(init!.body as string).household.axes[0][0] as { max: number; count: number };
  return fixtureFor(axis.count, axis.max);
}
/** A payload with no axes is a capability probe; the hosted API answers 400 for a variable it lacks. */
function isProbe(init?: RequestInit): boolean {
  return !JSON.parse(init!.body as string).household.axes;
}
const probeRejected = () => new Response(JSON.stringify({ status: "error", message: "Unrecognized calculate input(s): Unrecognized household variable" }), { status: 400 });
/** The #9503 probe forces the aggregate subsidy; a model from before the fix reads it back and counts none of it. */
function isChildcareProbe(init?: RequestInit): boolean {
  return JSON.parse(init!.body as string).household.spm_units?.spm_unit?.child_care_subsidies?.["2026"] === PROBE_SENTINEL;
}
const childcareProbeOld = () => new Response(JSON.stringify({ status: "ok", result: {
  households: { household: { household_state_benefits: { "2026": 0 } } },
  spm_units: { spm_unit: { child_care_subsidies: { "2026": PROBE_SENTINEL } } },
} }), { status: 200 });
const fixtureBody = fixtureFor(AXIS.count, AXIS.max);
const noopSleep = async () => {};

describe("ALL_STATES", () => {
  it("lists all 50 states plus DC, uppercase and unique", () => {
    expect(ALL_STATES).toHaveLength(51);
    expect(new Set(ALL_STATES).size).toBe(51);
    expect(ALL_STATES.every((s) => s === s.toUpperCase() && s.length === 2)).toBe(true);
  });
});

describe("parseArgs", () => {
  it("defaults to all 51 states, concurrency 3, dry-run off, from-data off", () => {
    const opts = parseArgs([]);
    expect(opts).toEqual({ states: ALL_STATES, concurrency: 3, dryRun: false, fromData: false });
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

  it("parses --from-data", () => {
    expect(parseArgs(["--from-data"]).fromData).toBe(true);
    expect(parseArgs([]).fromData).toBe(false);
  });
});

describe("runPipeline", () => {
  it("dry-run builds payloads without ever calling fetch", async () => {
    let called = false;
    const fetchImpl = (async () => { called = true; return new Response("", { status: 200 }); }) as unknown as typeof fetch;
    const result = await runPipeline({ states: ["CA", "TX"], concurrency: 3, dryRun: true, fromData: false }, fetchImpl, noopSleep);
    expect(result).toEqual({ ok: true, dryRun: true, gaps: [] });
    expect(called).toBe(false);
  });

  it("fetches 2 fake states × every archetype from an injected fetch and builds correct summary + state files, with zero real network", async () => {
    let callCount = 0;
    let healthChecks = 0;
    let probes = 0;
    let childcareProbes = 0;
    const fetchImpl = (async (url: unknown, init?: RequestInit) => {
      // The one GET is the engine's /healthz, which names the model; the public API has no such route.
      if (!init?.body) { healthChecks++; return new Response(JSON.stringify({ status: "ok", model: "policyengine-us", version: "2.5.0" }), { status: 200 }); }
      if (isChildcareProbe(init)) { childcareProbes++; return childcareProbeOld(); }
      if (isProbe(init)) { probes++; return probeRejected(); } // Vermont's premium assistance
      callCount++;
      return new Response(fixtureForRequest(init), { status: 200 });
    }) as unknown as typeof fetch;

    const result = await runPipeline({ states: ["WY", "VT"], concurrency: 3, dryRun: false, fromData: false }, fetchImpl, noopSleep);

    expect(callCount).toBe(2 * ARCHETYPES.length); // 2 states × every archetype, no retries needed
    expect(healthChecks).toBe(1);
    expect(probes).toBe(1); // once per endpoint and variable, however many Vermont curves follow
    expect(childcareProbes).toBe(1); // once per endpoint, however many households buy care
    expect(result.ok).toBe(true);
    expect(result.gaps).toEqual([]);
    expect(result.summary).toBeDefined();
    expect(result.summary!.model).toEqual({ endpoint: "api.policyengine.org", version: "2.5.0", countsChildcareSubsidy: false });
    expect(result.stateFiles!.WY.model).toEqual(result.summary!.model);
    expect(result.stateFiles).toBeDefined();

    // Every archetype for both fake states resolves to the same fixture-derived
    // metrics, since the fake fetch always returns the same fixture response.
    for (const state of ["WY", "VT"]) {
      expect(Object.keys(result.summary!.states[state])).toEqual(ARCHETYPES.map((a) => a.id));
      // Metrics come from the whole-dollar points the sweep stores, not raw floats.
      // Pinned literally (not re-derived from the code under test): the CA
      // fixture's $22,103 Head Start loss at $30k lands at the next program
      // year and, since 2026-09-17, counts — it is the biggest loss, and the
      // leap is the $29k–$74k trough it opens (pinned 2026-09-15 at the $3,868
      // subsidy end at $84k, a $7,000 leap and an $18,000 danger width, with
      // the deferred drop lifted out); same under WY and VT answers since
      // neither the wrap nor the coverage gap touches this fixture. A second
      // cliff on the curve names a waiting program beside an immediate loss;
      // the label counts it (2026-09-17: a label, never an exemption).
      expect(result.summary!.states[state]["single-2"]).toEqual({
        biggestLoss: 22103,
        biggestLossAt: 30000,
        biggestLossPrograms: ["headstart"],
        dangerWidth: 57000,
        cliffCount: 4,
        deferredCliffCount: 2,
        safeExit: 91000,
        leap: 45000,
        leapIsLowerBound: false,
        axisTop: 150000, // the fake fetch answers at the archetype's own axis (fixtureFor(axis.count, axis.max))
        // The road out of poverty for three: $26,650 → the step out of $54,000,
        // the first sampled point at or above twice $26,650, carried to its
        // end. The Head Start step is on it, so the fixture's family ends up
        // 38 cents poorer for every extra dollar it earns across it, and the
        // whole-axis worst step is one a third of families like this have passed.
        keepRate: -0.3807,
        roadLo: 27000,
        roadHi: 55000,
        roadCliffCount: 2,
        roadWorst: { drop: 22103, at: 30000, programs: ["headstart"] },
        // …and the one figure the two fake states do NOT share, on identical
        // curves: how many families like this earn less than $30,000 is a
        // fact about the state's families, not about the curve. Wyoming 33.6,
        // Vermont 13.7.
        biggestLossPosition: { WY: 33.6, VT: 13.7 }[state],
      });
      expect(result.summary!.states[state]["single-2"].cliffCount).toBeGreaterThanOrEqual(2);
      expect(result.summary!.states[state]["single-2"].dangerWidth).toBeGreaterThan(0);

      const points = result.stateFiles![state].archetypes["single-2"].points;
      expect(points).toHaveLength(axisSpec(answersFor(state, archetypeById("single-2"))).count);
      expect(Number.isInteger(points[0].netIncome)).toBe(true);
    }
    expect(result.summary!.archetypes).toHaveLength(ARCHETYPES.length);
  });

  it("leaves a gap (not a throw) when an archetype exhausts retries, and skips writing summary/state files", async () => {
    const fetchImpl = (async (_url: unknown, init?: RequestInit) => {
      if (isProbe(init)) return probeRejected(); // California's premium assistance
      const payload = JSON.parse(init!.body as string);
      const peopleCount = Object.keys(payload.household.people).length;
      // The 5-person households (you, spouse, 3 kids) — married-3 and its
      // dual-earner twin — fail every time, simulating an upstream that never
      // recovers. The payload is the only thing this fake fetch can tell them
      // apart by, and both shapes have the same five people.
      if (peopleCount === 5) return new Response("", { status: 500 });
      return new Response(fixtureForRequest(init), { status: 200 });
    }) as unknown as typeof fetch;

    const result = await runPipeline({ states: ["CA"], concurrency: 3, dryRun: false, fromData: false }, fetchImpl, noopSleep);

    expect(result.ok).toBe(false);
    expect(result.gaps).toEqual(
      ARCHETYPES.filter((a) => a.married && a.childAges.length === 3)
        .map((a) => ({ state: "CA", archetypeId: a.id, reason: "missing" })),
    );
    expect(result.gaps).toHaveLength(2);
    expect(result.summary).toBeUndefined();
    expect(result.stateFiles).toBeUndefined();
  });
});

describe("runFromData", () => {
  // Two synthetic states, built the same way the real pipeline would (via
  // buildStateFile), then round-tripped through JSON exactly as they'd sit on
  // disk at core/data/states/{ST}.json. No fetch is ever invoked.
  function syntheticResults(states: string[]): ResultsByStateArchetype {
    // Rounded at ingestion, exactly as runPipeline does.
    const results: ResultsByStateArchetype = {};
    for (const state of states) {
      results[state] = {};
      for (const a of ARCHETYPES) {
        const axis = axisSpec(answersFor(state, a));
        results[state][a.id] = parsePEResponse(JSON.parse(fixtureFor(axis.count, axis.max)), axis.count).map(roundPoint);
      }
    }
    return results;
  }

  it("reconstructs results from stored state-file JSON and rebuilds only summary.json, stamped with the newest sweep read", async () => {
    const states = ["WY", "VT"];
    const results = syntheticResults(states);
    const storedStateFiles: Record<string, string> = {};
    // Two sweeps on disk (a partial re-sweep leaves a mix): the summary's stamp is the newer one, never the rebuild's clock.
    const stamps: Record<string, string> = { WY: "2026-09-16T20:15:49.275Z", VT: "2026-09-17T00:25:59.552Z" };
    for (const state of states) {
      storedStateFiles[state] = JSON.stringify(buildStateFile(stamps[state], state, results));
    }
    const readStateFile = async (state: string): Promise<string> => {
      if (!(state in storedStateFiles)) throw new Error(`no on-disk fixture for ${state}`);
      return storedStateFiles[state];
    };

    const result = await runFromData(states, readStateFile);

    expect(result.ok).toBe(true);
    expect(result.gaps).toEqual([]);
    expect(result.dryRun).toBe(false);
    expect(result.stateFiles).toBeUndefined(); // state files are untouched, never rebuilt
    expect(result.summary).toBeDefined();

    // Exact identity: the sweep rounds each curve once at ingestion, so the
    // stored points ARE the points the summary was built from, and a summary
    // rebuilt from disk equals one built in memory, stamped by the newest file.
    const expected = buildSummary(stamps.VT, states, results);
    expect(result.summary).toEqual(expected);
  });

  it("reports gaps (not a throw) when a requested state's file can't be read, and returns no summary", async () => {
    const readStateFile = async (): Promise<string> => {
      throw new Error("ENOENT: no such file");
    };

    const result = await runFromData(["WY"], readStateFile);

    expect(result.ok).toBe(false);
    expect(result.gaps).toHaveLength(ARCHETYPES.length);
    expect(result.gaps.every((g) => g.state === "WY" && g.reason === "missing")).toBe(true);
    expect(result.summary).toBeUndefined();
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

describe("writeSummary with a partial --states run", () => {
  it("merges the swept states into the existing file instead of dropping the others", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "hotgap-pipeline-test-"));
    try {
      const summaryPath = path.join(dir, "summary.json");
      const file = (states: Record<string, unknown>, generated: string) => ({ generated, year: "2026", archetypes: [], states });
      await writeSummary(summaryPath, file({ ZZ: { leap: 1 }, YY: { leap: 2 } }, "g1") as never);
      await writeSummary(summaryPath, file({ YY: { leap: 3 } }, "g2") as never);
      expect(JSON.parse(await readFile(summaryPath, "utf8"))).toEqual(file({ ZZ: { leap: 1 }, YY: { leap: 3 } }, "g2"));
      // An unchanged partial rewrite is still skipped.
      await writeSummary(summaryPath, file({ YY: { leap: 3 } }, "g3") as never);
      expect(JSON.parse(await readFile(summaryPath, "utf8")).generated).toBe("g2");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("merges everything keyed by state — coverage and the unmodeled list too — and keeps the unswept states' entries", () => {
    const existing = { generated: "g1", year: "2026", childcareSubsidyUnmodeled: ["ZZ", "YY"], archetypes: [], states: { ZZ: { leap: 1 }, YY: { leap: 2 } }, coverage: { ZZ: { a: 1 }, YY: { a: 2 } } };
    const partial = { generated: "g2", year: "2026", archetypes: [], states: { YY: { leap: 3 } }, coverage: { YY: { a: 3 } } };
    // YY was re-swept and is no longer flagged; ZZ was not swept and keeps its flag, its row and its block.
    expect(mergePartial(existing as never, partial as never)).toEqual({
      generated: "g2", year: "2026", childcareSubsidyUnmodeled: ["ZZ"], archetypes: [],
      states: { ZZ: { leap: 1 }, YY: { leap: 3 } }, coverage: { ZZ: { a: 1 }, YY: { a: 3 } },
    });
    // A file written before the block existed gains none from a partial run that has none either.
    const bare = mergePartial({ states: { ZZ: { leap: 1 } } } as never, { generated: "g", year: "2026", archetypes: [], states: { YY: { leap: 3 } } } as never);
    expect("coverage" in bare).toBe(false);
    expect("childcareSubsidyUnmodeled" in bare).toBe(false);
  });
});

describe("writeSummary", () => {
  it("writes only summary.json, creating directories as needed, and touches nothing else", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "hotgap-pipeline-test-"));
    try {
      const summaryPath = path.join(dir, "nested", "summary.json");
      const summary = { generated: "g", year: "2026", archetypes: ARCHETYPES.map((a) => ({ id: a.id, married: a.married, childAges: a.childAges })), states: {} };

      await writeSummary(summaryPath, summary as never);

      const written = JSON.parse(await readFile(summaryPath, "utf8"));
      expect(written).toEqual(summary);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe("sameIgnoringGenerated", () => {
  it("ignores the top-level generated key alone", () => {
    expect(sameIgnoringGenerated({ generated: "a", x: 1 }, { generated: "b", x: 1 })).toBe(true);
  });

  it("still reports a difference when anything else changes", () => {
    expect(sameIgnoringGenerated({ generated: "a", x: 1 }, { generated: "a", x: 2 })).toBe(false);
  });

  it("compares nested structures deeply, not just the top level", () => {
    const a = { generated: "a", states: { CA: { biggestLoss: 100 } } };
    const same = { generated: "b", states: { CA: { biggestLoss: 100 } } };
    const different = { generated: "b", states: { CA: { biggestLoss: 101 } } };
    expect(sameIgnoringGenerated(a, same)).toBe(true);
    expect(sameIgnoringGenerated(a, different)).toBe(false);
    // A coverage change with identical numbers is a real change: the block is
    // what a reader trusts about the numbers, so a table edit rewrites the file.
    const relabeled = { ...same, coverage: { CA: { otherBenefits: [{ variable: "housing_assistance" }] } } };
    expect(sameIgnoringGenerated({ ...a, coverage: { CA: { otherBenefits: [] } } }, relabeled)).toBe(false);
  });
});

// The weekly-sweep noise fix: writeSummary/writeOutputs must skip a write
// when nothing but `generated` differs from what's on disk, so an unchanged
// re-sweep doesn't touch all 52 files (regression coverage for the bug where
// every file's `generated` stamp changed every week regardless).
describe("writeSummary skip-on-unchanged", () => {
  it("writing the same numbers twice leaves the file byte-identical with the first stamp", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "hotgap-pipeline-test-"));
    try {
      const summaryPath = path.join(dir, "summary.json");
      const base = { year: "2026", archetypes: ARCHETYPES.map((a) => ({ id: a.id, married: a.married, childAges: a.childAges })), states: {} };

      await writeSummary(summaryPath, { ...base, generated: "first-stamp" } as never);
      const firstBytes = await readFile(summaryPath, "utf8");

      await writeSummary(summaryPath, { ...base, generated: "second-stamp" } as never);
      const secondBytes = await readFile(summaryPath, "utf8");

      expect(secondBytes).toBe(firstBytes);
      expect(JSON.parse(secondBytes).generated).toBe("first-stamp");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("changing a number rewrites the file with the new stamp", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "hotgap-pipeline-test-"));
    try {
      const summaryPath = path.join(dir, "summary.json");
      const archetypes = ARCHETYPES.map((a) => ({ id: a.id, married: a.married, childAges: a.childAges }));
      const metrics = { dangerWidth: 0, cliffCount: 0, safeExit: 0, leap: 0 };

      await writeSummary(summaryPath, { generated: "first-stamp", year: "2026", archetypes, states: { CA: { "single-2": { ...metrics, biggestLoss: 100 } } } } as never);
      await writeSummary(summaryPath, { generated: "second-stamp", year: "2026", archetypes, states: { CA: { "single-2": { ...metrics, biggestLoss: 200 } } } } as never);

      const written = JSON.parse(await readFile(summaryPath, "utf8"));
      expect(written.generated).toBe("second-stamp");
      expect(written.states.CA["single-2"].biggestLoss).toBe(200);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("overwrites a corrupt or missing existing file unconditionally", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "hotgap-pipeline-test-"));
    try {
      const summaryPath = path.join(dir, "summary.json");
      const summary = { generated: "stamp", year: "2026", archetypes: ARCHETYPES.map((a) => ({ id: a.id, married: a.married, childAges: a.childAges })), states: {} };

      // Missing: nothing has been written to this path yet.
      await writeSummary(summaryPath, summary as never);
      expect(JSON.parse(await readFile(summaryPath, "utf8"))).toEqual(summary);

      // Corrupt: not valid JSON at all — must still be overwritten, not skipped.
      await writeFile(summaryPath, "{not json");
      const updated = { ...summary, generated: "stamp-2" };
      await writeSummary(summaryPath, updated as never);
      expect(JSON.parse(await readFile(summaryPath, "utf8"))).toEqual(updated);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("applies the same skip-on-unchanged behavior per state file in writeOutputs", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "hotgap-pipeline-test-"));
    try {
      const summaryPath = path.join(dir, "summary.json");
      const statesDir = path.join(dir, "states");
      const summary = { generated: "g1", year: "2026", archetypes: ARCHETYPES.map((a) => ({ id: a.id, married: a.married, childAges: a.childAges })), states: {} };
      const caFile = { generated: "g1", year: "2026", state: "CA", archetypes: {} };

      await writeOutputs({ summaryPath, statesDir }, summary as never, { CA: caFile } as never);
      const firstCaBytes = await readFile(path.join(statesDir, "CA.json"), "utf8");

      // Re-run with a new stamp but identical numbers: CA.json must stay byte-identical.
      await writeOutputs({ summaryPath, statesDir }, { ...summary, generated: "g2" } as never, { CA: { ...caFile, generated: "g2" } } as never);
      const secondCaBytes = await readFile(path.join(statesDir, "CA.json"), "utf8");
      expect(secondCaBytes).toBe(firstCaBytes);

      // Re-run with changed CA content: CA.json must be rewritten with the new stamp.
      await writeOutputs(
        { summaryPath, statesDir },
        { ...summary, generated: "g3" } as never,
        { CA: { ...caFile, generated: "g3", archetypes: { "single-0": { points: [] } } } } as never,
      );
      const thirdCa = JSON.parse(await readFile(path.join(statesDir, "CA.json"), "utf8"));
      expect(thirdCa.generated).toBe("g3");
      expect(thirdCa.archetypes).toEqual({ "single-0": { points: [] } });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
