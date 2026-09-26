import { describe, it, expect } from "vitest";
import { ARCHETYPES, archetypeById, isNoSubsidyTwin } from "./archetypes.js";
import { REACH_PERCENTILES } from "./reach.js";
import { REACH_CELL_DEFINITION, reachCell, reachForArchetype, reachForHousehold, reachProvenance } from "./reachLookup.js";
import { STATE_CODES } from "./states.js";

// Everything here is checked against the real, committed reach.json rather than
// a synthetic fixture, so a change to the builder or the underlying PUMS pull
// cannot silently desync this lookup from the data shape it reads. Expected
// values are DERIVED from the file (a cell's own p50 must look itself back up
// to 50) instead of pinned in dollars, which would only re-pin the artifact to
// itself and would have to be rewritten on every vintage bump.
// The ladders are per household SHAPE: a `-nosub` twin is the same families
// as the shape it twins (fallback.ts never picks it), so it has no cell of its own.
const CELLS = STATE_CODES.flatMap((state) => ARCHETYPES.filter((a) => !isNoSubsidyTwin(a)).map((a) => ({ state, id: a.id, cell: reachCell(state, a.id) })));
const PUBLISHED = CELLS.flatMap(({ state, id, cell }) => (cell ? [{ state, id, cell }] : []));
const SUPPRESSED = CELLS.filter(({ cell }) => cell === null);
const P50 = REACH_PERCENTILES.indexOf(50);
const P25 = REACH_PERCENTILES.indexOf(25);

describe("reachForArchetype", () => {
  it("looks a cell's own median back up to the 50th percentile (CA single-1)", () => {
    const median = reachCell("CA", "single-1")!.ladder[P50];
    expect(median).toBeGreaterThan(0);
    expect(reachForArchetype("CA", "single-1", median)).toBeCloseTo(50, 6);
  });

  it("looks every ladder point back up to its own percentile, for every published cell", () => {
    for (const { state, id, cell } of PUBLISHED) {
      for (let i = 1; i < REACH_PERCENTILES.length; i++) {
        // A flat step means several percentiles share a value; the lookup
        // rightly reports the lowest of them. A value tying the ladder's top
        // is 100 by definition. Neither is a distinct percentile to assert on.
        if (cell.ladder[i] <= cell.ladder[i - 1]) continue;
        if (cell.ladder[i] >= cell.ladder[cell.ladder.length - 1]) continue;
        expect(reachForArchetype(state, id, cell.ladder[i]), `${state} ${id} p${REACH_PERCENTILES[i]}`)
          .toBeCloseTo(REACH_PERCENTILES[i], 6);
      }
    }
  });

  it("returns a higher percentile for a higher income, for the same cell", () => {
    const low = reachForArchetype("CA", "single-1", 30000)!;
    const high = reachForArchetype("CA", "single-1", 150000)!;
    expect(high).toBeGreaterThan(low);
  });

  it("returns null for every cell the file suppresses", () => {
    console.log(`reach.json suppresses ${SUPPRESSED.length} of ${CELLS.length} cells: ${SUPPRESSED.map((c) => `${c.state} ${c.id}`).join(", ") || "none"}`);
    for (const { state, id } of SUPPRESSED) expect(reachForArchetype(state, id, 50000), `${state} ${id}`).toBeNull();
  });

  it("returns null for a state absent from the file entirely", () => {
    expect(reachForArchetype("ZZ", "single-1", 50000)).toBeNull();
  });

  it("returns null for an archetype id absent from a real state's entry", () => {
    expect(reachForArchetype("CA", "not-a-real-archetype", 50000)).toBeNull();
  });
});

describe("the committed reach ladders", () => {
  it("cover every state × archetype, published or explicitly suppressed", () => {
    expect(CELLS).toHaveLength(STATE_CODES.length * ARCHETYPES.filter((a) => !isNoSubsidyTwin(a)).length);
    expect(PUBLISHED.length).toBeGreaterThan(0);
  });

  it("carry a 21-point ladder and a 21-point margin of error, non-decreasing", () => {
    for (const { state, id, cell } of PUBLISHED) {
      const where = `${state} ${id}`;
      expect(cell.ladder, where).toHaveLength(REACH_PERCENTILES.length);
      expect(cell.moe, where).toHaveLength(REACH_PERCENTILES.length);
      for (let i = 1; i < cell.ladder.length; i++) {
        expect(cell.ladder[i], `${where} p${REACH_PERCENTILES[i]}`).toBeGreaterThanOrEqual(cell.ladder[i - 1]);
      }
      for (const m of cell.moe) expect(m, where).toBeGreaterThanOrEqual(0);
      expect(cell.households, where).toBeGreaterThan(0);
      expect(["2024-1yr", "2020-2024-5yr"], where).toContain(cell.vintage);
    }
  });

  it("publish nothing below the 30-household floor, or wider than a half-median MOE", () => {
    for (const { state, id, cell } of PUBLISHED) {
      const where = `${state} ${id}`;
      expect(cell.n, where).toBeGreaterThanOrEqual(30);
      expect(cell.ladder[P50], `${where} median`).toBeGreaterThan(0);
      expect(cell.moe[P50], `${where} median MOE`).toBeLessThanOrEqual(0.5 * cell.ladder[P50]);
    }
  });

  // The pre-fix builder counted any solo resident as "single, no children", so
  // retirees pushed p25 to $0 in 50 of 51 states (methodology validation, D2).
  // A working-age householder makes a $0 lower quartile the rare exception it
  // should be; this is the regression guard on that fix, not a style check.
  it("no longer bottom out at $0 for the p25 of single-0 in more than a handful of states", () => {
    const zeros = PUBLISHED.filter(({ id, cell }) => id === "single-0" && cell.ladder[P25] === 0).map((c) => c.state);
    console.log(`single-0 p25 === $0 in ${zeros.length} of ${STATE_CODES.length} states${zeros.length ? `: ${zeros.join(", ")}` : ""}`);
    expect(zeros.length).toBeLessThanOrEqual(5);
  });
});

describe("reachForHousehold", () => {
  const hh = (married: boolean, kidCount: number, spouseAnnualEarnings = 0) => ({
    married, spouseAnnualEarnings, childAges: Array.from({ length: kidCount }, () => 5),
  });

  it("maps a household to the archetype the same way the fallback picker does (single-1)", () => {
    const median = reachCell("CA", "single-1")!.ladder[P50];
    expect(reachForHousehold("CA", hh(false, 1), median)).toBeCloseTo(50, 6);
  });

  it("clamps kid count the same way pickArchetypeId does (5 kids -> single-3)", () => {
    expect(reachForHousehold("CA", hh(false, 5), 50000)).toBe(reachForArchetype("CA", "single-3", 50000));
  });

  // A two-earner couple is measured against two-earner couples. Pooled against
  // every couple it would read low, since most couples living on one pay earn
  // less — the yardstick would be a different population from the household.
  it("measures a couple with a second earner against the dual-earner ladder", () => {
    expect(reachForHousehold("CA", hh(true, 2, 15080), 60000)).toBe(reachForArchetype("CA", "married-dual-2", 60000));
    expect(reachForHousehold("CA", hh(true, 2), 60000)).toBe(reachForArchetype("CA", "married-2", 60000));
  });

  it("returns null when the mapped archetype's cell is suppressed", () => {
    const gap = SUPPRESSED.find(({ id }) => ARCHETYPES.some((a) => a.id === id));
    if (!gap) return; // this vintage suppressed nothing; reachForArchetype's null cases cover the path
    const archetype = archetypeById(gap.id);
    expect(reachForHousehold(gap.state, hh(archetype.married, archetype.childAges.length, archetype.spouseWorks ? 15080 : 0), 50000)).toBeNull();
  });

  it("returns null for an unknown state", () => {
    expect(reachForHousehold("ZZ", hh(true, 2), 80000)).toBeNull();
  });
});

describe("reachCell", () => {
  it("hands back the whole cell, so a caller can say how sure the number is", () => {
    const cell = reachCell("CA", "married-2")!;
    expect(cell.ladder[P50]).toBeGreaterThan(0);
    expect(cell.moe[P50]).toBeGreaterThan(0);
    expect(cell.n).toBeGreaterThanOrEqual(30);
    expect(cell.vintage).toBe("2024-1yr");
  });

  it("is null on the same terms as reachForArchetype", () => {
    expect(reachCell("ZZ", "single-1")).toBeNull();
    expect(reachCell("CA", "not-a-real-archetype")).toBeNull();
  });
});

describe("what a reach cell matches on (R15)", () => {
  it("prints the file's own cell definition, the same words core falls back to, and names what it does not match", () => {
    const { cellDefinition, basis } = reachProvenance("CA");
    expect(cellDefinition).toBe(REACH_CELL_DEFINITION);
    for (const part of ["married couple or not", "own children under 18", "one earner or two", "householder aged 18-64", "children's ages not matched"]) {
      expect(cellDefinition).toContain(part);
    }
    expect(basis).toContain("the children's ages are not matched");
  });

  it("is the same cell for a 3- and 7-year-old as for two teenagers: the ages are not matched", () => {
    const young = reachForHousehold("CA", { married: false, childAges: [3, 7], spouseAnnualEarnings: 0 }, 30_000);
    const teens = reachForHousehold("CA", { married: false, childAges: [15, 17], spouseAnnualEarnings: 0 }, 30_000);
    expect(young).not.toBeNull();
    expect(teens).toBe(young);
  });
});
