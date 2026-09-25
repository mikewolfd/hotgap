import { describe, expect, it } from "vitest";
import { curveOrder, relativeNet, ROAD_TAIL, roadFrame, sharedTop, stateCurve, type Curves, type StateCurve } from "./curves.js";
import { measureByKey, type StateRow } from "./model.js";

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

describe("the small multiples' road mode", () => {
  /* A $0–$30,000 axis; the poverty line at $2,000, the road's last step at $4,000 and its top at $5,000. */
  const road = (values: number[]): StateCurve => ({ earnings: values.map((_, i) => i * 1000), net: values, zones: [], road: [2000, 4000], roadHi: 5000 });
  const a = road([8000, 9000, 10_000, 11_000, 8000, 9500, 12_000, ...Array.from({ length: 24 }, (_, i) => 13_000 + i * 1000)]);
  const b = road(a.net.map((v) => v + 20_000));

  it("draws what the family keeps less what it keeps at the poverty line, so the line crosses zero there", () => {
    const rel = relativeNet(a)!;
    expect(rel[2]).toBe(0);
    expect(rel[4]).toBe(-2000);                    // poorer than at the poverty line: under the rule
    expect(relativeNet(b)).toEqual(rel);           // a richer state with the same shape draws the same line
    expect(relativeNet({ ...a, road: null })).toBeNull();
  });
  it("shares one frame: $0 to the longest road's top plus the tail, and one y-range every state fits over that pay", () => {
    const f = roadFrame([a, b, { ...a, roadHi: 6000 }])!;
    expect(f.x1).toBe(6000 + ROAD_TAIL);
    // Over $0–$16,000 the lowest point is $2,000 under the poverty line's level and the highest $12,000 over it.
    expect(f.lo).toBeLessThan(-2000);
    expect(f.lo).toBeGreaterThan(-3000);
    expect(f.hi).toBeGreaterThan(12_000);
    expect(f.hi).toBeLessThan(13_000);             // the climb past the frame does not widen it
    expect(roadFrame([{ ...a, road: null, roadHi: null }])).toBeNull();
  });
});

describe("the small multiples' order", () => {
  const measure = measureByKey("biggestLoss")!;
  const row = (st: string, value: number | null, kind: StateRow["kind"]) => ({ st, value, kind }) as StateRow;
  const g = {
    past: [row("AK", null, "past")],
    ranked: [row("WI", 9000, "shaded"), row("OH", 9000, "shaded"), row("CA", 4000, "shaded")],
    none: [row("NM", 0, "none")],
    incomplete: [row("TX", 7000, "incomplete")],
    bins: { lo: 4000, hi: 9000, kind: "steps" as const, index: (v: number) => (v > 6000 ? 4 : 0), classes: [0, 1, 2, 3, 4].map((ramp) => ({ ramp, hue: "loss" as const, lo: 0, hi: 0 })) },
  };

  it("is the map's ranking — lower bounds first, worst first with shared ranks, then no cliff, then incomplete — each with its tile's class", () => {
    expect(curveOrder(g, measure)).toEqual([
      { st: "AK", rank: "1.", cls: "past" },
      { st: "WI", rank: "2.", cls: "loss-5" },
      { st: "OH", rank: "2.", cls: "loss-5" },
      { st: "CA", rank: "4.", cls: "loss-1" },
      { st: "NM", rank: null, cls: "none" },
      { st: "TX", rank: null, cls: "incomplete" },
    ]);
  });
});
