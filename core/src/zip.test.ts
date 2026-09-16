import { describe, it, expect } from "vitest";
import { isTerritoryZip, resolvePlace, zipToState } from "./zip.js";

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

describe("resolvePlace", () => {
  it("resolves a ZIP to its state and county, letting a given county win", () => {
    expect(resolvePlace({ zip: "94110" })).toEqual({ ok: true, state: "CA", countyFips: "06075" });
    expect(resolvePlace({ zip: "94110", state: "CA", countyFips: "06037" })).toEqual({ ok: true, state: "CA", countyFips: "06037" });
  });
  it("passes a state and county through when there is no ZIP", () => {
    expect(resolvePlace({ state: "TX" })).toEqual({ ok: true, state: "TX", countyFips: null });
    expect(resolvePlace({})).toEqual({ ok: true, state: undefined, countyFips: null });
  });
  it("names the reason a ZIP cannot be used", () => {
    expect(resolvePlace({ zip: "00901" })).toEqual({ ok: false, detail: "HotGap does not model US territories yet" });
    expect(resolvePlace({ zip: "00000" })).toEqual({ ok: false, detail: "no state for ZIP 00000" });
    expect(resolvePlace({ zip: "94110", state: "NY" })).toEqual({ ok: false, detail: "ZIP 94110 is in CA, not NY" });
  });
});
