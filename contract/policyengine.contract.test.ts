import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const RUN = process.env.RUN_CONTRACT === "1";
// Only load the fixture when the contract suite actually runs, so a missing or
// corrupt fixture cannot break test collection on the skip path.
const request = RUN
  ? JSON.parse(
      readFileSync(new URL("../fixtures/pe-ca-single-1kid-101.request.json", import.meta.url), "utf8"),
    )
  : null;

describe.skipIf(!RUN)("PolicyEngine /us/calculate contract", () => {
  it("computes a 101-point axes sweep with every variable we display", async () => {
    const res = await fetch("https://api.policyengine.org/us/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(60_000),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.status).toBe("ok");
    const r = body.result;
    const arr = (x: unknown) => {
      expect(Array.isArray(x)).toBe(true);
      expect((x as number[]).length).toBe(101);
    };
    arr(r.households["your household"].household_net_income["2026"]);
    arr(r.spm_units["your spm_unit"].snap["2026"]);
    arr(r.spm_units["your spm_unit"].tanf["2026"]);
    arr(r.spm_units["your spm_unit"].spm_unit_capped_housing_subsidy["2026"]);
    arr(r.tax_units["your tax unit"].eitc["2026"]);
    arr(r.tax_units["your tax unit"].refundable_ctc["2026"]);
    arr(r.tax_units["your tax unit"].premium_tax_credit["2026"]);
    for (const v of ["medicaid", "ssi", "wic", "chip"]) arr(r.people["you"][v]["2026"]);
  }, 90_000);

  it("accepts rent on people and childcare_expenses on spm_units", async () => {
    const probe = {
      household: {
        people: { you: { age: { "2026": 30 }, rent: { "2026": 18000 } } },
        families: { f: { members: ["you"] } },
        marital_units: { m: { members: ["you"] } },
        tax_units: { t: { members: ["you"] } },
        spm_units: { s: { members: ["you"], childcare_expenses: { "2026": 6000 }, snap: { "2026": null } } },
        households: { h: { members: ["you"], state_name: { "2026": "CA" }, household_net_income: { "2026": null } } },
      },
    };
    const res = await fetch("https://api.policyengine.org/us/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(probe),
      signal: AbortSignal.timeout(60_000),
    });
    const body = (await res.json()) as any;
    expect(body.status).toBe("ok");
  }, 90_000);

  it("rejects a misplaced variable with an error-JSON body", async () => {
    // `rent` belongs on `people`; putting it on `spm_units` must produce a
    // structured validation error. Observed live behavior (2026-07-11): the API
    // responds HTTP 400 with { status: "error", message: string }, e.g.
    // "Household variable `rent` belongs on `people`, not `spm_units`, ...".
    const probe = {
      household: {
        people: { you: { age: { "2026": 30 } } },
        families: { f: { members: ["you"] } },
        marital_units: { m: { members: ["you"] } },
        tax_units: { t: { members: ["you"] } },
        spm_units: { s: { members: ["you"], rent: { "2026": 18000 }, snap: { "2026": null } } },
        households: { h: { members: ["you"], state_name: { "2026": "CA" }, household_net_income: { "2026": null } } },
      },
    };
    const res = await fetch("https://api.policyengine.org/us/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(probe),
      signal: AbortSignal.timeout(60_000),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as any;
    expect(body.status).toBe("error");
    expect(typeof body.message).toBe("string");
    expect(body.message.length).toBeGreaterThan(0);
  }, 90_000);
});
