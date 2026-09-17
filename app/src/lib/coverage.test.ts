// The one IncompleteMarker rule (audit D7), over the three cases every
// surface once decided for itself: a premium program always, the child-care
// entry only with a paying child of care age, a shared gap never.
import { CHILDCARE_MAX_AGE, type UnmodeledProgram } from "@hotgap/core";
import { describe, expect, it } from "vitest";
import { bites, careHousehold, incompleteFor } from "./coverage.js";

const premium: UnmodeledProgram = { program: "NJ Health Plan Savings", note: "", scope: "state" };
const care: UnmodeledProgram = { program: "Child-care subsidy (CCDF)", note: "", scope: "state" };
const shared: UnmodeledProgram = { program: "Something everywhere", note: "", scope: "all" };
const liheapOld: UnmodeledProgram = { program: "LIHEAP", note: "" };   // a file written before scope was recorded

describe("bites", () => {
  it("a premium program bites every household; a gap every state shares never does", () => {
    const paying = { childAges: [3], paysForCare: true };
    expect(bites(premium, paying)).toBe(true);
    expect(bites(premium, { childAges: [], paysForCare: false })).toBe(true);
    expect(bites(shared, paying)).toBe(false);
    expect(bites(liheapOld, paying)).toBe(false);
  });
  it("the child-care entry bites only a household paying for a child of care age — through core's CHILDCARE_MAX_AGE", () => {
    expect(bites(care, { childAges: [7], paysForCare: true })).toBe(true);
    expect(bites(care, { childAges: [CHILDCARE_MAX_AGE], paysForCare: true })).toBe(true);
    expect(bites(care, { childAges: [CHILDCARE_MAX_AGE + 1], paysForCare: true })).toBe(false);
    expect(bites(care, { childAges: [7], paysForCare: false })).toBe(false);
    expect(bites(care, { childAges: [], paysForCare: true })).toBe(false);
  });
  it("reads a live household's care bill from its answers", () => {
    const base = { childAges: [3, 7], monthlyChildcare: null as number | null };
    expect(careHousehold(base as never)).toEqual({ childAges: [3, 7], paysForCare: false });
    expect(careHousehold({ ...base, monthlyChildcare: 1000 } as never).paysForCare).toBe(true);
    expect(careHousehold({ ...base, monthlyChildcare: 0 } as never).paysForCare).toBe(false);
  });
  it("incompleteFor keeps the entries that bite, in the block's order, and is empty without a block", () => {
    const cov = { unmodeled: [shared, care, premium] } as never;
    expect(incompleteFor(cov, { childAges: [3], paysForCare: true }).map((u) => u.program)).toEqual([care.program, premium.program]);
    expect(incompleteFor(cov, { childAges: [15], paysForCare: true }).map((u) => u.program)).toEqual([premium.program]);
    expect(incompleteFor(undefined, { childAges: [3], paysForCare: true })).toEqual([]);
  });
});
