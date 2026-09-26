import { describe, expect, it } from "vitest";
import { ARCHETYPES, answersFor, archetypeById, evaluateCurve, loadStateFile } from "@hotgap/core";
import { point } from "../../core/src/testing.js";
import type { ResultsByStateArchetype } from "./build.js";
import { stateMetrics } from "./metrics.js";
import { deriveTwins, twinBase, twinsToDerive, withoutSubsidy } from "./twin.js";

describe("the no-subsidy twin, derived from its base row (R2, R16)", () => {
  it("takes the subsidy out of net income at each point and zeroes it, leaving everything else as it was", () => {
    const base = [point(0, 20000, { programs: { childcare: 0, snap: 3000 } }), point(1000, 50000, { programs: { childcare: 30000, snap: 2900 } })];
    const twin = withoutSubsidy(base);
    expect(twin.map((p) => p.netIncome)).toEqual([20000, 20000]);
    expect(twin.map((p) => p.programs.childcare)).toEqual([0, 0]);
    expect(twin.map((p) => p.programs.snap)).toEqual([3000, 2900]);
    // Pure: the base row is untouched.
    expect(base[1].netIncome).toBe(50000);
    expect(base[1].programs.childcare).toBe(30000);
  });

  it("names its base by its own id, and is derived only where no state carries it and every state carries the base", () => {
    expect(twinBase({ id: "single-2-nosub" })).toBe("single-2");
    const pts = [point(0, 1), point(1000, 2)];
    const all = (ids: string[]): ResultsByStateArchetype => ({ WY: Object.fromEntries(ids.map((id) => [id, pts])), VT: Object.fromEntries(ids.map((id) => [id, pts])) });
    expect(twinsToDerive(["WY", "VT"], all(["single-2"]))).toEqual([{ id: "single-2-nosub", from: "single-2" }]);
    // A sweep that carries the twin wins: nothing is derived over it.
    expect(twinsToDerive(["WY", "VT"], all(["single-2", "single-2-nosub"]))).toEqual([]);
    // No base, nothing to derive from.
    expect(twinsToDerive(["WY", "VT"], all(["single-1"]))).toEqual([]);
    const input = all(["single-2"]);
    const { results, derived } = deriveTwins(["WY", "VT"], input);
    expect(derived).toEqual({ "single-2-nosub": "single-2" });
    expect(Object.keys(results.WY).sort()).toEqual(["single-2", "single-2-nosub"]);
    // Pure: the caller's results are not changed.
    expect(Object.keys(input.WY)).toEqual(["single-2"]);
  });

  it("on the committed sweep: Wisconsin's family keeps 7¢ of each extra dollar without the subsidy, where it loses 105¢ with it", () => {
    const file = loadStateFile("WI")!;
    const twin = ARCHETYPES.find((a) => a.id === "single-2-nosub")!;
    const without = stateMetrics(evaluateCurve(answersFor("WI", twin), { year: file.year, currentEarnings: 0, points: withoutSubsidy(file.archetypes["single-2"].points) }, "archetype"));
    const withIt = stateMetrics(evaluateCurve(answersFor("WI", archetypeById("single-2")), { year: file.year, currentEarnings: 0, points: file.archetypes["single-2"].points }, "archetype"));
    expect(Math.round(withIt.keepRate! * 100)).toBe(-105);
    expect(Math.round(without.keepRate! * 100)).toBe(7);
    // The level loses exactly the subsidy it carried; the twin carries none.
    expect(without.netAtRoadLo).toBe(withIt.netAtRoadLo! - withIt.childcareAtRoadLo!);
    expect(without.childcareAtRoadLo).toBe(0);
  });
});
