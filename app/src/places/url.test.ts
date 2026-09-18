import { describe, expect, it } from "vitest";
import { parseView, viewQuery } from "./url.js";

const domain = { households: ["single-0", "single-2", "married-dual-2"], states: ["CO", "NJ", "TX"], defaultHousehold: "single-2" };

describe("the view in the query string", () => {
  it("an empty query is the default view with nothing selected", () => {
    expect(parseView("", domain)).toEqual({ household: "single-2", measure: "keepRate", sort: "state", state: null });
  });
  it("round-trips every key", () => {
    const v = { household: "married-dual-2", measure: "safeExit" as const, sort: "leap" as const, state: "NJ" };
    expect(viewQuery(v)).toBe("?household=married-dual-2&measure=safeExit&sort=leap&state=NJ");
    expect(parseView(viewQuery(v), domain)).toEqual(v);
  });
  it("a link written when the only sort was \"this measure\" still lands on that measure's order", () => {
    expect(parseView("?measure=safeExit&sort=measure", domain).sort).toBe("safeExit");
    expect(parseView("?sort=measure", domain).sort).toBe("keepRate");
  });
  it("writes every key even at the defaults, and omits only an empty selection", () => {
    expect(viewQuery({ household: "single-2", measure: "biggestLoss", sort: "state", state: null }))
      .toBe("?household=single-2&measure=biggestLoss&sort=state");
  });
  it("every measure key ever written still resolves, the six whole-axis ones included (Plan 9)", () => {
    for (const key of ["biggestLoss", "dangerWidth", "leap", "safeExit", "cliffCount", "deferredCliffCount", "keepRate", "roadCliffCount", "roadWorst"]) {
      expect(parseView(`?measure=${key}`, domain).measure, key).toBe(key);
      expect(parseView(`?sort=${key}`, domain).sort, key).toBe(key);
    }
  });
  it("anything unknown falls back to the default for that key alone", () => {
    expect(parseView("?household=nope&measure=leap&sort=up&state=ZZ", domain))
      .toEqual({ household: "single-2", measure: "leap", sort: "state", state: null });
    expect(parseView("?state=TX", domain).state).toBe("TX");
  });
});
