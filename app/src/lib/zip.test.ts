import { describe, it, expect } from "vitest";
import { zipToState } from "./zip.js";

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
});
