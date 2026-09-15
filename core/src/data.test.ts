import { describe, it, expect } from "vitest";
import { ARCHETYPES } from "./archetypes.js";
import { loadStateFile, loadSummary, readData } from "./data.js";
import { STATE_CODES } from "./states.js";

describe("committed data", () => {
  it("summary.json covers every state × archetype", () => {
    const summary = loadSummary();
    expect(Object.keys(summary.states).sort()).toEqual([...STATE_CODES].sort());
    for (const state of STATE_CODES) {
      expect(Object.keys(summary.states[state]).sort()).toEqual(ARCHETYPES.map((a) => a.id).sort());
    }
  });

  it("every state file exists with 101-point curves for every archetype", () => {
    for (const state of STATE_CODES) {
      const file = loadStateFile(state);
      expect(file?.state, state).toBe(state);
      for (const a of ARCHETYPES) expect(file!.archetypes[a.id].points, `${state} ${a.id}`).toHaveLength(101);
    }
  });

  it("returns null for an unknown or malformed state code", () => {
    expect(loadStateFile("ZZ")).toBeNull();
    expect(loadStateFile("../summary")).toBeNull();
  });

  it("memoizes reads (same object back)", () => {
    expect(readData("reach.json")).toBe(readData("reach.json"));
  });
});
