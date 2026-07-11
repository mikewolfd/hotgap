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
    expect(visibleScreens(a)).toEqual(["zip", "family", "housing", "pay"]);
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
    s = flowReducer(s, { type: "setPay", pay: { amount: 20, unit: "hour", hoursPerWeek: 40 } });
    s = flowReducer(s, { type: "setSpousePay", pay: { amount: 3000, unit: "month" } });
    const h = toHouseholdAnswers(s.answers);
    expect(h).toMatchObject({ state: "CA", married: true, annualEarnings: 41600, spouseAnnualEarnings: 36000 });
  });
});
