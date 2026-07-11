import { describe, it, expect } from "vitest";
import { YEAR } from "./index.js";

describe("workspace smoke", () => {
  it("exports the simulation year", () => {
    expect(YEAR).toBe("2026");
  });
});
