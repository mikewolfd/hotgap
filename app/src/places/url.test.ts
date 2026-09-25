import { describe, expect, it } from "vitest";
import { parseView, tryItHref, viewQuery } from "./url.js";

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

describe("the link to the household tool from a state", () => {
  it("opens the swept household: state, children, marriage, and core's rent, care bill, subsidy and second pay, in core's flag names", () => {
    // Texas, single parent of two: the state's typical rent and center-based care, the subsidy claimed.
    expect(tryItHref("TX", { id: "single-2", married: false, childAges: [3, 7] })).toBe("/?state=TX&kids=3%2C7&rent=1573&childcare=1674&childcare-subsidy=1");
    // A one-earner couple buys no care, so neither the bill nor the subsidy travels.
    expect(tryItHref("NJ", { id: "married-3", married: true, childAges: [1, 4, 9] })).toBe("/?state=NJ&married=1&kids=1%2C4%2C9&rent=2324");
    // A two-earner couple carries the second pay the sweep holds fixed.
    expect(tryItHref("TX", { id: "married-dual-2", married: true, childAges: [3, 7] })).toBe("/?state=TX&married=1&kids=3%2C7&rent=1573&childcare=1674&spouse-earnings=15080&childcare-subsidy=1");
    // The no-subsidy twin: the same bill, the subsidy off.
    expect(tryItHref("TX", { id: "single-2-nosub", married: false, childAges: [3, 7] })).toBe("/?state=TX&kids=3%2C7&rent=1573&childcare=1674");
    expect(tryItHref("CO", { id: "single-0", married: false, childAges: [] })).toBe("/?state=CO&rent=1735");
  });
  it("carries the shape alone for a household core no longer sweeps", () => {
    expect(tryItHref("TX", { id: "gone-2", married: false, childAges: [3, 7] })).toBe("/?state=TX&kids=3%2C7");
  });
});
