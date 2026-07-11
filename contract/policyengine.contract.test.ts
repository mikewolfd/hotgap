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
    for (const v of ["head_start", "early_head_start"]) arr(r.people["your first dependent"][v]["2026"]);
    for (const v of ["free_school_meals", "reduced_price_school_meals", "spm_unit_medical_out_of_pocket_expenses"]) arr(r.spm_units["your spm_unit"][v]["2026"]);
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

  it("pins is_disabled/is_ssi_disabled and the SSI-disabled pathway", async () => {
    // `is_disabled: true` alone does not unlock SSI in PolicyEngine — only
    // `is_ssi_disabled: true` does (see worker/src/translate.ts). This pins
    // both variable names and confirms the pathway actually produces a
    // nonzero SSI award, not just an accepted request. Observed live
    // (2026-07-11): ssi = $9,438 for this household.
    const probe = {
      household: {
        people: {
          you: {
            age: { "2026": 45 },
            is_disabled: { "2026": true },
            is_ssi_disabled: { "2026": true },
            employment_income: { "2026": 6000 },
            ssi: { "2026": null },
          },
        },
        families: { f: { members: ["you"] } },
        marital_units: { m: { members: ["you"] } },
        tax_units: { t: { members: ["you"] } },
        spm_units: { s: { members: ["you"] } },
        households: { h: { members: ["you"], state_name: { "2026": "CA" } } },
      },
    };
    const res = await fetch("https://api.policyengine.org/us/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(probe),
      signal: AbortSignal.timeout(60_000),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.status).toBe("ok");
    const ssi = body.result.people["you"].ssi["2026"];
    expect(ssi).toBeGreaterThan(0);
  }, 90_000);

  it("head_start:0 override removes Head Start from net income", async () => {
    const withHS = { household: { people: { you: { age: { "2026": 30 }, employment_income: { "2026": 20000 } }, kid: { age: { "2026": 5 }, head_start: { "2026": null } } }, families: { f: { members: ["you", "kid"] } }, marital_units: { m: { members: ["you"] } }, tax_units: { t: { members: ["you", "kid"] } }, spm_units: { s: { members: ["you", "kid"] } }, households: { h: { members: ["you", "kid"], state_name: { "2026": "CA" }, household_net_income: { "2026": null } } } } };
    const off = JSON.parse(JSON.stringify(withHS));
    off.household.people.kid.head_start = { "2026": 0 };
    const call = async (body: unknown) => {
      const res = await fetch("https://api.policyengine.org/us/calculate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(60_000) });
      return (await res.json()) as any;
    };
    const on = await call(withHS);
    const offR = await call(off);
    const onNet = on.result.households.h.household_net_income["2026"];
    const offNet = offR.result.households.h.household_net_income["2026"];
    expect(onNet - offNet).toBeGreaterThan(15000); // Head Start value removed
  }, 90_000);
});
