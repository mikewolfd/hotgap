import { describe, it, expect } from "vitest";
import {
  flowReducer, initialFlowState, canAdvance, visibleScreens, toHouseholdAnswers,
  type FlowState,
} from "./state.js";

describe("flow state machine", () => {
  it("starts on zip and cannot advance until a valid state is derived", () => {
    expect(initialFlowState.screen).toBe("zip");
    expect(canAdvance(initialFlowState)).toBe(false);
    const s = flowReducer(initialFlowState, { type: "setZip", zip: "94110" });
    expect(s.answers.state).toBe("CA");
    expect(canAdvance(s)).toBe(true);
  });

  it("skips the childcare screen when there is no child under 13", () => {
    const a = { ...initialFlowState.answers, childAges: [15] };
    expect(visibleScreens(a)).toEqual(["zip", "family", "housing", "gets", "pay"]);
    expect(visibleScreens({ ...a, childAges: [3] })).toContain("childcare");
  });

  it("walks next/back through visible screens", () => {
    let s = flowReducer(initialFlowState, { type: "setZip", zip: "94110" });
    s = flowReducer(s, { type: "next" });
    expect(s.screen).toBe("family");
    s = flowReducer(s, { type: "back" });
    expect(s.screen).toBe("zip");
  });

  it("requires pay > 0 to finish", () => {
    let s: FlowState = { ...initialFlowState, screen: "pay" };
    expect(canAdvance(s)).toBe(false);
    s = flowReducer(s, { type: "setPay", pay: { amount: 18, unit: "hour", hoursPerWeek: 30 } });
    expect(canAdvance(s)).toBe(true);
  });

  it("converts to HouseholdAnswers with annualized pay", () => {
    let s = flowReducer(initialFlowState, { type: "setZip", zip: "94110" });
    s = flowReducer(s, { type: "setMarried", married: true });
    s = flowReducer(s, { type: "setAge", age: 35 });
    s = flowReducer(s, { type: "setSpouseAge", age: 33 });
    s = flowReducer(s, { type: "setPay", pay: { amount: 20, unit: "hour", hoursPerWeek: 40 } });
    s = flowReducer(s, { type: "setSpousePay", pay: { amount: 3000, unit: "month" } });
    const h = toHouseholdAnswers(s.answers);
    expect(h).toMatchObject({
      state: "CA", married: true, age: 35, spouseAge: 33, annualEarnings: 41600, spouseAnnualEarnings: 36000,
    });
  });

  describe("age gate on the family screen", () => {
    it("blocks advance until an age 16..110 is entered", () => {
      let s: FlowState = { ...initialFlowState, screen: "family" };
      expect(canAdvance(s)).toBe(false);
      s = flowReducer(s, { type: "setAge", age: 15 });
      expect(canAdvance(s)).toBe(false);
      s = flowReducer(s, { type: "setAge", age: 111 });
      expect(canAdvance(s)).toBe(false);
      s = flowReducer(s, { type: "setAge", age: 30 });
      expect(canAdvance(s)).toBe(true);
    });

    it("also requires a valid spouse age when married", () => {
      let s: FlowState = { ...initialFlowState, screen: "family" };
      s = flowReducer(s, { type: "setAge", age: 30 });
      s = flowReducer(s, { type: "setMarried", married: true });
      expect(canAdvance(s)).toBe(false);
      s = flowReducer(s, { type: "setSpouseAge", age: 200 });
      expect(canAdvance(s)).toBe(false);
      s = flowReducer(s, { type: "setSpouseAge", age: 28 });
      expect(canAdvance(s)).toBe(true);
    });
  });

  describe("disability actions", () => {
    it("dispatches setYouDisabled and setSpouseDisabled", () => {
      let s = flowReducer(initialFlowState, { type: "setYouDisabled", disabled: true });
      expect(s.answers.youDisabled).toBe(true);
      s = flowReducer(s, { type: "setMarried", married: true });
      s = flowReducer(s, { type: "setSpouseDisabled", disabled: true });
      expect(s.answers.spouseDisabled).toBe(true);
    });

    it("keeps childDisabled paired with childAges when kids are added or removed", () => {
      let s = flowReducer(initialFlowState, { type: "setChildAges", ages: [5] });
      expect(s.answers.childDisabled).toEqual([false]);
      s = flowReducer(s, { type: "setChildDisabled", index: 0, disabled: true });
      s = flowReducer(s, { type: "setChildAges", ages: [5, 8] }); // add a second kid
      expect(s.answers.childDisabled).toEqual([true, false]);
      s = flowReducer(s, { type: "setChildAges", ages: [5] }); // remove the second kid
      expect(s.answers.childDisabled).toEqual([true]);
    });
  });

  it("forces spouseAge/spouseDisabled back to null/false in HouseholdAnswers when unmarried", () => {
    let s = flowReducer(initialFlowState, { type: "setZip", zip: "94110" });
    s = flowReducer(s, { type: "setAge", age: 40 });
    s = flowReducer(s, { type: "setMarried", married: true });
    s = flowReducer(s, { type: "setSpouseAge", age: 38 });
    s = flowReducer(s, { type: "setSpouseDisabled", disabled: true });
    s = flowReducer(s, { type: "setMarried", married: false });
    s = flowReducer(s, { type: "setPay", pay: { amount: 20, unit: "hour", hoursPerWeek: 40 } });
    const h = toHouseholdAnswers(s.answers);
    expect(h.spouseAge).toBeNull();
    expect(h.spouseDisabled).toBe(false);
  });

  it("carries take-up answers into HouseholdAnswers, default false", () => {
    let s = flowReducer(initialFlowState, { type: "setZip", zip: "94110" });
    s = flowReducer(s, { type: "setAge", age: 30 });
    const h = toHouseholdAnswers(s.answers);
    expect(h.getsHeadStart).toBe(false);
    expect(h.getsHousing).toBe(false);
    expect(h.hasEmployerCoverage).toBe(false);
  });

  it("setGets updates a take-up flag", () => {
    let s = flowReducer(initialFlowState, { type: "setGets", key: "getsHousing", value: true });
    expect(s.answers.getsHousing).toBe(true);
  });
});
