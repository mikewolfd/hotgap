import { describe, expect, it } from "vitest";
import { servedTenths } from "./served.js";

describe("servedTenths — the one rule for 'about N in 10' (inventory #23)", () => {
  it("rounds to the nearest tenth, with the two ends in words", () => {
    expect(servedTenths(0.03)).toEqual({ kind: "few" });     // Texas
    expect(servedTenths(0.049)).toEqual({ kind: "few" });
    expect(servedTenths(0.05)).toEqual({ kind: "some", n: 1 });
    expect(servedTenths(0.18)).toEqual({ kind: "some", n: 2 });
    expect(servedTenths(0.22)).toEqual({ kind: "some", n: 2 });  // Ohio
    expect(servedTenths(0.85)).toEqual({ kind: "some", n: 9 });  // Michigan
    expect(servedTenths(0.95)).toEqual({ kind: "most" });
    expect(servedTenths(1)).toEqual({ kind: "most" });
  });
});
