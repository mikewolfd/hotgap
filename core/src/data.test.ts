import { describe, it, expect } from "vitest";
import { ARCHETYPES, answersFor } from "./archetypes.js";
import { axisSpec } from "./translate.js";
import { loadStateFile, loadSummary, provideData, readData } from "./data.js";
import { REACH_PERCENTILES } from "./reach.js";
import { STATE_CODES } from "./states.js";

// The archetypes the COMMITTED sweep actually holds. It can lag ARCHETYPES by
// one sweep: `npm run pipeline` is 51 states × archetypes of live PolicyEngine
// calls, so a newly added archetype has no curve until that runs. These tests
// therefore check that every state carries the SAME archetypes, that each is a
// real one, and — loudly — which are still waiting, so "not swept yet" can
// never quietly become "silently dropped".
const SWEPT = Object.keys(loadSummary().states[STATE_CODES[0]]).sort();
const AWAITING_SWEEP = ARCHETYPES.map((a) => a.id).filter((id) => !SWEPT.includes(id));
// Rows the summary DERIVED from another row's stored points rather than swept
// (pipeline/src/twin.ts: the no-subsidy twin, until a sweep runs it). They
// have a summary row and no curve of their own in the state files.
const DERIVED = loadSummary().archetypes.filter((a) => a.derivedFrom !== undefined).map((a) => a.id);
const IN_FILES = SWEPT.filter((id) => !DERIVED.includes(id));

describe("committed data", () => {
  it("summary.json covers every state, with the same archetypes in each and no stranger among them", () => {
    const summary = loadSummary();
    expect(Object.keys(summary.states).sort()).toEqual([...STATE_CODES].sort());
    for (const state of STATE_CODES) {
      expect(Object.keys(summary.states[state]).sort(), state).toEqual(SWEPT);
    }
    expect(SWEPT.filter((id) => !ARCHETYPES.some((a) => a.id === id))).toEqual([]);
    expect(SWEPT.length).toBeGreaterThan(0);
  });

  it("summary.json carries a complete coverage block for every state, with the sweep's own model", () => {
    const summary = loadSummary();
    expect(Object.keys(summary.coverage ?? {}).sort()).toEqual([...STATE_CODES].sort());
    for (const state of STATE_CODES) {
      const c = summary.coverage![state];
      expect(Object.keys(c).sort(), state).toEqual(["corrections", "liheap", "otherBenefits", "unmodeled", "vintages"]);
      expect(Object.keys(c.corrections).sort(), state).toEqual(["childcareSubsidy", "coverageGap", "liheap", "maTafdc", "policyOverrides", "premiumAssistance"]);
      expect(Object.keys(c.vintages).sort(), state).toEqual(["childcare", "county", "model", "reach", "rent"]);
      expect(c.vintages.model, state).toEqual(summary.model ?? null);
      // LIHEAP is a boundary in every state (Plan 7), never an unmodeled row; the list is empty where nothing else is missing.
      expect(c.unmodeled.map((u) => u.program), state).not.toContain("LIHEAP");
      expect(c.liheap?.readOn, state).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      // Nothing unlabeled: every remainder on the map has been traced to a variable.
      for (const o of c.otherBenefits) expect(o.variable, `${state} $${o.maxAnnualInSweep}`).not.toBeNull();
    }
  });

  it("names any archetype the committed sweep has not caught up with yet", () => {
    // Not a failure: `npm run pipeline` is a live 51-state sweep and cannot run
    // in a test. It is a standing reminder that until it does, these archetypes
    // have no offline curve and no summary row.
    if (AWAITING_SWEEP.length) console.log(`summary.json awaits the next sweep for: ${AWAITING_SWEEP.join(", ")}`);
    expect(ARCHETYPES.map((a) => a.id).filter((id) => !AWAITING_SWEEP.includes(id)).sort()).toEqual(SWEPT);
  });

  it("every state file exists with a full-axis curve for every swept archetype", () => {
    for (const state of STATE_CODES) {
      const file = loadStateFile(state);
      expect(file?.state, state).toBe(state);
      expect(Object.keys(file!.archetypes).sort(), state).toEqual(IN_FILES);
      for (const a of ARCHETYPES.filter((x) => IN_FILES.includes(x.id))) {
        expect(file!.archetypes[a.id].points, `${state} ${a.id}`).toHaveLength(axisSpec(answersFor(state, a)).count);
      }
    }
  });

  it("returns null for an unknown or malformed state code", () => {
    expect(loadStateFile("ZZ")).toBeNull();
    expect(loadStateFile("../summary")).toBeNull();
  });

  it("memoizes reads (same object back)", () => {
    expect(readData("reach.json")).toBe(readData("reach.json"));
  });

  it("never reads outside data/", () => {
    expect(readData("../package.json")).toBeNull();
    expect(readData("/etc/hosts")).toBeNull();
  });

  it("serves a provided entry ahead of the disk, whether or not the file was read first", () => {
    const summary = loadSummary();
    provideData({ "summary.json": { ...summary, generated: "provided" }, "states/ZZ.json": { state: "ZZ", archetypes: {} } });
    expect(loadSummary().generated).toBe("provided");
    expect(loadStateFile("ZZ")?.state).toBe("ZZ");
    provideData({ "summary.json": summary, "states/ZZ.json": null });
    expect(loadSummary()).toBe(summary);
    expect(loadStateFile("ZZ")).toBeNull();
  });

  it("reach.json is sampled at the percentile steps the code assumes", () => {
    expect(readData<{ percentiles: number[] }>("reach.json")?.percentiles).toEqual(REACH_PERCENTILES);
  });
});
