import { describe, it, expect } from "vitest";
import { fetchCurve } from "./client.js";
import type { HouseholdAnswers } from "@hotgap/shared";

const answers: HouseholdAnswers = {
  state: "CA", married: false, age: 30, spouseAge: null, childAges: [5],
  youDisabled: false, spouseDisabled: false, childDisabled: [false],
  monthlyRent: null, monthlyChildcare: null, annualEarnings: 30000, spouseAnnualEarnings: 0,
  getsHeadStart: false, getsHousing: false, hasEmployerCoverage: false,
};

describe("fetchCurve", () => {
  it("returns data on 200", async () => {
    const fake = (async () =>
      new Response(JSON.stringify({ year: "2026", currentEarnings: 30000, points: [] }), { status: 200 })) as unknown as typeof fetch;
    const r = await fetchCurve(answers, fake);
    expect(r.ok).toBe(true);
  });
  it("maps 504 to timeout and 502 to server", async () => {
    const f = (status: number) => (async () => new Response("{}", { status })) as unknown as typeof fetch;
    expect((await fetchCurve(answers, f(504))).ok).toBe(false);
    expect(((await fetchCurve(answers, f(504))) as { kind: string }).kind).toBe("timeout");
    expect(((await fetchCurve(answers, f(502))) as { kind: string }).kind).toBe("server");
  });
  it("maps thrown fetch errors to network", async () => {
    const f = (async () => { throw new TypeError("fetch failed"); }) as unknown as typeof fetch;
    expect(((await fetchCurve(answers, f)) as { kind: string }).kind).toBe("network");
  });
});
