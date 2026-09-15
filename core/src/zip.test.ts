import { describe, it, expect } from "vitest";
import { zipToState, isTerritoryZip } from "./zip.js";

describe("zipToState", () => {
  it("maps well-known ZIPs to their state", () => {
    expect(zipToState("94110")).toBe("CA");
    expect(zipToState("10001")).toBe("NY");
    expect(zipToState("60601")).toBe("IL");
  });
  it("rejects malformed input and unassigned prefixes", () => {
    expect(zipToState("1234")).toBeNull();
    expect(zipToState("abcde")).toBeNull();
    expect(zipToState("")).toBeNull();
    expect(zipToState("00000")).toBeNull();
  });
  it("returns null for territory prefixes that map to a non-state code (969 -> MH), but resolves Honolulu", () => {
    expect(zipToState("96910")).toBeNull();
    expect(zipToState("96813")).toBe("HI");
  });
});

describe("isTerritoryZip", () => {
  it("flags territory prefixes and nothing else", () => {
    expect(isTerritoryZip("00901")).toBe(true); // Puerto Rico
    expect(isTerritoryZip("96910")).toBe(true); // Guam et al.
    expect(isTerritoryZip("94110")).toBe(false);
    expect(isTerritoryZip("96813")).toBe(false); // Honolulu
  });
});
