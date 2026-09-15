import { describe, it, expect, vi } from "vitest";
import { ARCHETYPES, answersFor } from "./archetypes.js";
import { BHP_EXPANDED_STATES, parentMedicaidLimit, policyOverridesFor } from "./policyOverrides.js";
import { buildCurvePayload, curveCacheKey, fetchCurve } from "./client.js";

describe("sourced PolicyEngine overrides", () => {
  const single = (state: string) => answersFor(state, ARCHETYPES.find((a) => a.id === "single-2")!);
  it.each([
    ["TX", (230 + 113.85) * 12], ["MS", 498 * 12], ["GA", 662 * 12],
    ["FL", 600 * 12], ["WY", 873 * 12 + 27320 * 0.05], ["SC", 27320 * 0.67],
  ])("matches the published family-of-three dollar limit in %s", (state, annual) => {
    expect(parentMedicaidLimit(single(state as string))! * 27320).toBeCloseTo(annual as number, 6);
  });

  it("uses household size and Texas's separate two-parent standard", () => {
    const a = { ...single("TX"), childAges: [4] };
    expect(parentMedicaidLimit(a)! * 21640).toBeCloseTo(12 * (196 + 90.20), 6);
    expect(parentMedicaidLimit({ ...a, married: true, spouseAge: 30 })! * 27320).toBeCloseTo(12 * (251 + 113.85), 6);
    expect(parentMedicaidLimit({ ...single("MS"), childAges: [1, 2, 3, 4, 5, 6], married: true })! * 55720).toBeCloseTo(1007 * 12, 6);
  });

  it("leaves other states and childless parent pathways alone, and scopes NY's list override", () => {
    expect(policyOverridesFor(single("CA"))).toEqual({});
    expect(policyOverridesFor({ ...single("TX"), childAges: [] })).toEqual({});
    expect(policyOverridesFor(single("NY"))).toEqual({ [BHP_EXPANDED_STATES]: { "2026-01-01.2026-12-31": [] } });
    expect(buildCurvePayload(single("CA"))).not.toHaveProperty("policy");
  });

  it("invalidates cached curves when a parameter or list changes", () => {
    const a = single("SC");
    const policy = policyOverridesFor(a);
    expect(curveCacheKey(a)).toBe(curveCacheKey(a, policy));
    expect(curveCacheKey(a, {})).not.toBe(curveCacheKey(a));
    const key = Object.keys(policy)[0];
    expect(curveCacheKey(a, { [key]: { "2026-01-01.2026-12-31": 1 } })).not.toBe(curveCacheKey(a));
    expect(curveCacheKey(single("NY"), { [BHP_EXPANDED_STATES]: { "2026-01-01.2026-12-31": ["NY"] } })).not.toBe(curveCacheKey(single("NY")));
  });

  it("sends the overrides on both sides of the SSDI splice", async () => {
    const a = { ...single("SC"), ssdiMonthly: 1500 };
    const payloads: any[] = [];
    const fetchImpl = (async (_url: unknown, init: RequestInit) => {
      payloads.push(JSON.parse(init.body as string));
      return new Response("{}", { status: 400 });
    }) as typeof fetch;
    await expect(fetchCurve(a, { fetchImpl })).rejects.toThrow();
    expect(payloads).toHaveLength(2);
    for (const payload of payloads) expect(payload.policy).toEqual(policyOverridesFor(a));
  });

  it("allows time for the upstream reform build and honors caller timeouts", async () => {
    const timeout = vi.spyOn(AbortSignal, "timeout");
    const fetchImpl = (async () => new Response("{}", { status: 400 })) as typeof fetch;
    try {
      await expect(fetchCurve(single("SC"), { fetchImpl })).rejects.toThrow();
      expect(timeout).toHaveBeenLastCalledWith(90000);
      await expect(fetchCurve(single("CA"), { fetchImpl })).rejects.toThrow();
      expect(timeout).toHaveBeenLastCalledWith(25000);
      await expect(fetchCurve(single("NY"), { fetchImpl, timeoutMs: 1234 })).rejects.toThrow();
      expect(timeout).toHaveBeenLastCalledWith(1234);
    } finally {
      timeout.mockRestore();
    }
  });
});
