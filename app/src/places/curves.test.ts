import { describe, expect, it } from "vitest";
import { sharedTop, stateCurve, type Curves } from "./curves.js";

/* A $0–$10,000 axis in $1,000 steps with one cliff at $4,000 that the line climbs back over by $7,000. */
const net = [10_000, 11_000, 12_000, 13_000, 14_000, 11_000, 12_000, 13_500, 15_000, 16_000, 17_000];
const curves: Curves = { from: 0, step: 1000, states: { CA: net, TX: net.map((v) => v + 5000) } };

describe("the per-state curves", () => {
  it("read the danger zone off the line itself: from the step down until it climbs back", () => {
    const c = stateCurve(curves, "CA", "single-2")!;
    expect(c.earnings).toEqual(net.map((_, i) => i * 1000));
    expect(c.zones).toEqual([[4000, 8000]]);
  });
  it("share one y-scale: $0 to the highest point any state reaches, rounded up", () => {
    expect(sharedTop(curves)).toBe(40_000);
  });
  it("have nothing to draw for a state the file does not carry", () => {
    expect(stateCurve(curves, "NY", "single-2")).toBeNull();
  });
});
