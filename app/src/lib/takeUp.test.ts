import { describe, expect, test } from "vitest";
import { takeUpApplies, wicCouldApply } from "./takeUp.js";

describe("which take-up lines apply (marketing review M5)", () => {
  test("WIC needs a child under five", () => {
    expect(wicCouldApply({ childAges: [] })).toBe(false);
    expect(wicCouldApply({ childAges: [5, 7] })).toBe(false);
    expect(wicCouldApply({ childAges: [4, 9] })).toBe(true);
    expect(wicCouldApply({ childAges: [0] })).toBe(true);
  });
  test("every other program is named whatever the household's shape", () => {
    expect(takeUpApplies({ childAges: [] }, "wic")).toBe(false);
    expect(takeUpApplies({ childAges: [] }, "snap")).toBe(true);
    expect(takeUpApplies({ childAges: [3] }, "wic")).toBe(true);
  });
});
