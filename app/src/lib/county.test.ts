import { describe, it, expect, vi, beforeEach } from "vitest";
import { zipToCounty, ensureCountyTable, __resetCountyTableForTests } from "./county.js";

const TABLE = { "94110": "06075", "90012": "06037", "10001": "36061" };

beforeEach(() => __resetCountyTableForTests());

describe("zipToCounty", () => {
  it("returns null before the table is loaded", () => {
    expect(zipToCounty("94110")).toBeNull();
  });
  it("resolves a known ZIP to its county after load", async () => {
    await ensureCountyTable((async () => new Response(JSON.stringify(TABLE))) as unknown as typeof fetch);
    expect(zipToCounty("94110")).toBe("06075");
    expect(zipToCounty("90012")).toBe("06037");
  });
  it("returns null for malformed or unknown ZIPs after load", async () => {
    await ensureCountyTable((async () => new Response(JSON.stringify(TABLE))) as unknown as typeof fetch);
    expect(zipToCounty("1234")).toBeNull();
    expect(zipToCounty("abcde")).toBeNull();
    expect(zipToCounty("00000")).toBeNull();
  });
  it("only fetches once across repeated ensureCountyTable calls", async () => {
    const f = vi.fn(async () => new Response(JSON.stringify(TABLE))) as unknown as typeof fetch;
    await ensureCountyTable(f);
    await ensureCountyTable(f);
    expect((f as unknown as { mock: { calls: unknown[] } }).mock.calls.length).toBe(1);
  });
  it("swallows a fetch failure (county stays null, never throws)", async () => {
    await ensureCountyTable((async () => { throw new Error("offline"); }) as unknown as typeof fetch);
    expect(zipToCounty("94110")).toBeNull();
  });
});
