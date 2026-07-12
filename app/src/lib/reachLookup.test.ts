import { describe, it, expect } from "vitest";
import { reachForArchetype, reachForHousehold } from "./reachLookup.js";

// Pinned against the real, committed reach.json (see app/src/data/reach.json
// and scripts/build-reach.mjs) rather than a synthetic fixture, so a change
// to the builder or the underlying PUMS pull can't silently desync this
// lookup from the actual data shape it reads.
describe("reachForArchetype", () => {
  it("returns the percentile for a real state x archetype cell (CA single-1's own p50 -> 50)", () => {
    // CA single-1's ladder p50 (index 10 of 21 points) is $72,800 -- see
    // app/src/data/reach.json (household earnings, 2026 dollars). Looking that
    // exact income back up must land on (very close to) the 50th percentile.
    expect(reachForArchetype("CA", "single-1", 72800)).toBeCloseTo(50, 0);
  });

  it("returns a higher percentile for a higher income, for the same cell", () => {
    const low = reachForArchetype("CA", "single-1", 30000)!;
    const high = reachForArchetype("CA", "single-1", 150000)!;
    expect(high).toBeGreaterThan(low);
  });

  it("returns null for a small-sample cell stored as null (WY single-3)", () => {
    expect(reachForArchetype("WY", "single-3", 50000)).toBeNull();
  });

  it("returns null for a state absent from the file entirely", () => {
    expect(reachForArchetype("ZZ", "single-1", 50000)).toBeNull();
  });

  it("returns null for an archetype id absent from a real state's entry", () => {
    expect(reachForArchetype("CA", "not-a-real-archetype", 50000)).toBeNull();
  });
});

describe("reachForHousehold", () => {
  it("maps married/kidCount to the archetype the same way the fallback picker does (single-1)", () => {
    expect(reachForHousehold("CA", false, 1, 72800)).toBeCloseTo(50, 0);
  });

  it("clamps kid count the same way pickArchetypeId does (5 kids -> single-3, still a real cell in most states)", () => {
    const viaClamp = reachForHousehold("CA", false, 5, 50000);
    const viaDirect = reachForArchetype("CA", "single-3", 50000);
    expect(viaClamp).toBe(viaDirect);
  });

  it("returns null when the mapped archetype's cell is a small-sample null (WY, single, 3 kids)", () => {
    expect(reachForHousehold("WY", false, 3, 50000)).toBeNull();
  });

  it("returns null for an unknown state", () => {
    expect(reachForHousehold("ZZ", true, 2, 80000)).toBeNull();
  });
});
