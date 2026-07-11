import { describe, it, expect } from "vitest";
import { t } from "./t.js";

describe("t", () => {
  it("returns plain strings", () => {
    expect(t("flow.next")).toBe("Next");
  });
  it("interpolates params", () => {
    expect(t("flow.stepOf", { step: 2, total: 5 })).toBe("Step 2 of 5");
  });
  it("throws when a param is missing", () => {
    expect(() => t("flow.stepOf", { step: 2 })).toThrow(/missing param/);
  });
});
