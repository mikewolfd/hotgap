import { describe, it, expect } from "vitest";
import { zipToCounty } from "./county.js";

describe("zipToCounty", () => {
  it("resolves known ZIPs from the committed crosswalk", () => {
    expect(zipToCounty("94110")).toBe("06075"); // San Francisco
    expect(zipToCounty("90012")).toBe("06037"); // Los Angeles
    expect(zipToCounty("10001")).toBe("36061"); // New York County
  });

  it("returns null for malformed or unassigned ZIPs", () => {
    expect(zipToCounty("1234")).toBeNull();
    expect(zipToCounty("abcde")).toBeNull();
    expect(zipToCounty("00000")).toBeNull();
  });

  it("drops a county that disagrees with the caller's state", () => {
    expect(zipToCounty("94110", "CA")).toBe("06075");
    expect(zipToCounty("94110", "NY")).toBeNull();
  });
});
