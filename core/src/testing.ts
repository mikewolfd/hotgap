// Test-only helpers shared by the core and worker suites. Not exported from
// index.ts: nothing here is part of the library.
import type { AxisSpec } from "./translate.js";

/**
 * A minimal well-formed PolicyEngine response at whatever axis the answers
 * ask for: flat $20,000 of net income and no program anywhere. The recorded
 * fixtures are pinned to their own axes, so they cannot stand in for a live
 * body; parse.ts's own tests still use them.
 */
export function peBody(spec: AxisSpec, ssdi = 0): string {
  const all = (v: number) => ({ "2026": new Array(spec.count).fill(v) });
  return JSON.stringify({
    status: "ok",
    result: {
      axes: [[{ min: 0, max: spec.max, count: spec.count }]],
      households: { h: { household_net_income: all(20000 + ssdi), household_benefits: all(ssdi) } },
      spm_units: {
        s: {
          snap: all(0), tanf: all(0), spm_unit_capped_housing_subsidy: all(0),
          free_school_meals: all(0), reduced_price_school_meals: all(0),
          spm_unit_medical_out_of_pocket_expenses: all(0),
        },
      },
      tax_units: { t: { eitc: all(0), refundable_ctc: all(0), premium_tax_credit: all(0) } },
      people: {
        you: { age: { "2026": 30 }, medicaid: all(0), chip: all(0), wic: all(0), ssi: all(0) },
        child1: { age: { "2026": 5 }, medicaid: all(0), chip: all(0) },
      },
    },
  });
}
