import { describe, it, expect } from "vitest";
import { pickArchetypeId, fetchFallbackCurve } from "./fallback.js";

const PROGRAMS = { snap: 0, medicaid: 0, chip: 0, eitc: 0, ctc: 0, aca: 0, tanf: 0, housing: 0, wic: 0, ssi: 0, headstart: 0, schoolmeals: 0 };
const mkPoint = (earnings: number, netIncome: number) => ({ earnings, netIncome, programs: { ...PROGRAMS } });
const points = [mkPoint(0, 20000), mkPoint(50000, 30000), mkPoint(100000, 45000)];

const stateFile = {
  generated: "2026-07-11T00:00:00.000Z",
  year: "2026",
  state: "CA",
  archetypes: { "single-1": { points } },
};

describe("pickArchetypeId", () => {
  it("maps married + kid count to the matching archetype id", () => {
    expect(pickArchetypeId(false, 0)).toBe("single-0");
    expect(pickArchetypeId(false, 1)).toBe("single-1");
    expect(pickArchetypeId(false, 2)).toBe("single-2");
    expect(pickArchetypeId(true, 0)).toBe("married-0");
    expect(pickArchetypeId(true, 1)).toBe("married-1");
    expect(pickArchetypeId(true, 2)).toBe("married-2");
  });

  it("clamps kid counts above 3 down to the married-3/single-3 archetype", () => {
    expect(pickArchetypeId(false, 3)).toBe("single-3");
    expect(pickArchetypeId(false, 5)).toBe("single-3");
    expect(pickArchetypeId(true, 4)).toBe("married-3");
  });
});

describe("fetchFallbackCurve", () => {
  it("returns the archetype's points on success", async () => {
    const fetchImpl = (async () =>
      new Response(JSON.stringify(stateFile), { status: 200 })) as unknown as typeof fetch;
    const result = await fetchFallbackCurve("CA", false, 1, fetchImpl);
    expect(result).toEqual(points);
  });

  it("fetches the expected per-state URL", async () => {
    let calledWith: string | undefined;
    const fetchImpl = (async (url: string) => {
      calledWith = url;
      return new Response(JSON.stringify(stateFile), { status: 200 });
    }) as unknown as typeof fetch;
    await fetchFallbackCurve("CA", false, 1, fetchImpl);
    expect(calledWith).toBe("/data/states/CA.json");
  });

  it("returns null on a non-200 status (e.g. 404)", async () => {
    const fetchImpl = (async () => new Response("not found", { status: 404 })) as unknown as typeof fetch;
    expect(await fetchFallbackCurve("CA", false, 1, fetchImpl)).toBeNull();
  });

  it("returns null on bad JSON", async () => {
    const fetchImpl = (async () => new Response("not json{", { status: 200 })) as unknown as typeof fetch;
    expect(await fetchFallbackCurve("CA", false, 1, fetchImpl)).toBeNull();
  });

  it("returns null when the requested archetype is missing from the state file", async () => {
    const fetchImpl = (async () =>
      new Response(JSON.stringify(stateFile), { status: 200 })) as unknown as typeof fetch;
    // stateFile only has single-1; married-2 isn't present.
    expect(await fetchFallbackCurve("CA", true, 2, fetchImpl)).toBeNull();
  });

  it("returns null when fetch itself rejects (network failure)", async () => {
    const fetchImpl = (async () => { throw new TypeError("network down"); }) as unknown as typeof fetch;
    expect(await fetchFallbackCurve("CA", false, 1, fetchImpl)).toBeNull();
  });
});
