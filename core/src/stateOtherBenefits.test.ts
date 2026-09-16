import { describe, it, expect } from "vitest";
import { PROGRAM_END_MIN } from "./analyze.js";
import { loadStateFile } from "./data.js";
import { OTHER_BENEFIT_SOURCES, otherBenefitSourcesFor } from "./stateOtherBenefits.js";
import { STATE_CODES } from "./states.js";
import { CASH_PROGRAMS, PROGRAM_IDS } from "./types.js";

/** The largest raw remainder on any of this state's committed curves. */
const maxRemainder = (state: string): number =>
  Math.max(0, ...Object.values(loadStateFile(state)!.archetypes).flatMap(({ points }) => points.map((p) => p.otherBenefits)));

describe("OTHER_BENEFIT_SOURCES", () => {
  it("names real states, a variable HotGap does not already track, and at most one variable per state", () => {
    const seen = new Set<string>();
    for (const s of OTHER_BENEFIT_SOURCES) {
      expect(s.label.length).toBeGreaterThan(0);
      // A tracked program lives in `programs`, never in the remainder.
      expect(PROGRAM_IDS as string[]).not.toContain(s.variable);
      expect(CASH_PROGRAMS as string[]).not.toContain(s.variable);
      for (const state of s.states) {
        expect(STATE_CODES).toContain(state);
        // `maxAnnualInSweep` is the whole remainder; a second variable in one
        // state would need the sweep to request them to be told apart.
        expect(seen.has(state), `${state} has two sources`).toBe(false);
        seen.add(state);
      }
    }
  });

  // Both directions, on the committed data. A state whose remainder grew past
  // the floor with no row here is money nobody has named; a row for a state
  // whose remainder is gone is a stale finding. Either way, probe the engine
  // (the contract suite has the request) and fix the table.
  it("accounts for every remainder in the committed sweep, and only those", () => {
    for (const state of STATE_CODES) {
      const traced = otherBenefitSourcesFor(state).length > 0;
      expect(traced, `${state}: max otherBenefits $${maxRemainder(state)}`).toBe(maxRemainder(state) > PROGRAM_END_MIN);
    }
  });
});
