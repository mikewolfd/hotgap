import { describe, it, expect } from "vitest";
import { countyName, zipToCounty } from "./county.js";

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

describe("countyName", () => {
  it("names a county the crosswalk can point at, as the gazetteer spells it", () => {
    expect(countyName(zipToCounty("80903")!)).toBe("El Paso County");
    expect(countyName("22071")).toBe("Orleans Parish");
    expect(countyName("35013")).toBe("Doña Ana County");
  });
  it("is null for a code the table lacks", () => {
    expect(countyName("99999")).toBeNull();
  });
});
