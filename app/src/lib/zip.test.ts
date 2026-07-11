import { describe, it, expect } from "vitest";
import { zipToState, isTerritoryZip } from "./zip.js";

describe("zipToState", () => {
  it("maps well-known ZIPs to their state", () => {
    expect(zipToState("94110")).toBe("CA");
    expect(zipToState("10001")).toBe("NY");
    expect(zipToState("60601")).toBe("IL");
  });
  it("rejects malformed input", () => {
    expect(zipToState("1234")).toBeNull();
    expect(zipToState("abcde")).toBeNull();
    expect(zipToState("")).toBeNull();
  });
  it("returns null for unassigned prefixes", () => {
    expect(zipToState("00000")).toBeNull();
  });
  it("returns null for territory prefixes that map to a non-state code (e.g. 969 -> MH)", () => {
    expect(zipToState("96910")).toBeNull();
  });
  it("still resolves Honolulu, HI correctly (a real 968-prefix ZIP, not a territory)", () => {
    expect(zipToState("96813")).toBe("HI");
  });
});

describe("isTerritoryZip", () => {
  it("identifies territory ZIP prefixes", () => {
    expect(isTerritoryZip("00901")).toBe(true); // Puerto Rico
    expect(isTerritoryZip("96910")).toBe(true); // Guam et al.
  });
  it("does not flag ordinary state ZIPs as territories", () => {
    expect(isTerritoryZip("94110")).toBe(false);
    expect(isTerritoryZip("96813")).toBe(false); // Honolulu
  });
});
