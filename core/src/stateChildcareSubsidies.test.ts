import { describe, it, expect } from "vitest";
import { STATE_CODES } from "./states.js";
import { CHILDCARE_SUBSIDY_IN_NET_INCOME, CHILDCARE_SUBSIDY_STATES, childcareSubsidyInNetIncome } from "./stateChildcareSubsidies.js";

describe("state child-care subsidy table", () => {
  it("counts the two lists read live from the deployed model on 2026-09-15", () => {
    // 38 of 51 implemented in policyengine-us 1.764.6; 23 reach net income on
    // `main` (18 in the deployed 2026 block — see the module's own note).
    expect(CHILDCARE_SUBSIDY_STATES.size).toBe(38);
    expect(CHILDCARE_SUBSIDY_IN_NET_INCOME.size).toBe(23);
  });

  it("only names real states", () => {
    const states = new Set<string>(STATE_CODES);
    for (const st of [...CHILDCARE_SUBSIDY_STATES, ...CHILDCARE_SUBSIDY_IN_NET_INCOME]) {
      expect(states.has(st), st).toBe(true);
    }
  });

  it("never claims net income already carries a subsidy the deployed model cannot compute", () => {
    // The five states in the net-income list but not the implemented list —
    // DC, NC, NY, OH, OK — have no subsidy variable deployed yet, so their
    // subsidy is $0 today and the branch is a no-op either way. Any OTHER
    // state in that position would be a real double-count risk.
    const ahead = [...CHILDCARE_SUBSIDY_IN_NET_INCOME].filter((st) => !CHILDCARE_SUBSIDY_STATES.has(st));
    expect(ahead.sort()).toEqual(["DC", "NC", "NY", "OH", "OK"]);
  });

  it("says yes everywhere on a model that carries policyengine-us #9503", () => {
    expect(childcareSubsidyInNetIncome("CT", true)).toBe(true);
    expect(childcareSubsidyInNetIncome("CT", false)).toBe(false);
  });

  it("reads inclusion case-insensitively, and says no for a state that is not listed", () => {
    expect(childcareSubsidyInNetIncome("co")).toBe(true);
    expect(childcareSubsidyInNetIncome("CT")).toBe(false);
    expect(childcareSubsidyInNetIncome("MA")).toBe(false);
  });
});
