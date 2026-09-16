// Re-records the PolicyEngine fixtures under fixtures/ from the endpoint
// HOTGAP_PE_URL names — the self-hosted engine (engine/README.md) — so the
// unit suite pins the model that is actually served. Each fixture is one
// household on one fixed axis: the request is what buildCurvePayload sends
// today with only the axis overridden, and the response is stored as
// returned (key order and values untouched, indented for readable diffs).
// fixtures/README.md records the provenance of each; update its version and
// date after a run, and re-pin the tests that assert numbers from the curves.
//
// Usage: node --env-file=.env --import tsx scripts/record-fixtures.mts [name ...]
//   Names default to every fixture below. HOTGAP_PE_TOKEN goes out as the
//   bearer token and is never printed; neither is the URL.
import { writeFileSync } from "node:fs";
import { buildCurvePayload, modelVersion, requestPE, validateAnswers } from "../core/src/index.js";

interface Axis { min: number; max: number; count: number }
const FIXTURES: Record<string, { answers: Record<string, unknown>; axis: Axis }> = {
  // A single parent of a 5-year-old with no rent or child-care bill, Head
  // Start and a housing subsidy left for the model to decide (both null, so
  // the Head Start cliff at $30k is on the curve). No premium-assistance
  // variable is asked for, so the curve is what any endpoint returns.
  "pe-ca-single-1kid-101": {
    answers: {
      state: "CA", married: false, age: 30, spouseAge: null, childAges: [5], childDisabled: [false],
      youDisabled: false, spouseDisabled: false, monthlyRent: null, monthlyChildcare: null,
      annualEarnings: 30000, spouseAnnualEarnings: 0, getsHeadStart: true, getsHousing: true,
    },
    axis: { min: 0, max: 100_000, count: 101 },
  },
  // A one-earner couple with children aged 1, 4 and 9, sampled across the
  // end of TAFDC, carrying every ma_tafdc_* input the feedback loop replays.
  "pe-ma-married-3kids-11": {
    answers: {
      state: "MA", married: true, age: 30, spouseAge: 30, childAges: [1, 4, 9], childDisabled: [false, false, false],
      youDisabled: false, spouseDisabled: false, monthlyRent: null, monthlyChildcare: null,
      annualEarnings: 26000, spouseAnnualEarnings: 0,
    },
    axis: { min: 24_000, max: 34_000, count: 11 },
  },
};

const pretty = (value: unknown) => JSON.stringify(value, null, 2) + "\n";
const out = (name: string) => new URL(`../fixtures/${name}`, import.meta.url);

const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(FIXTURES);
for (const name of names) if (!(name in FIXTURES)) throw new Error(`unknown fixture ${name}; known: ${Object.keys(FIXTURES).join(", ")}`);

console.log(`policyengine-us ${(await modelVersion()) ?? "(endpoint does not say)"}, ${new Date().toISOString().slice(0, 10)}`);
for (const name of names) {
  const { answers, axis } = FIXTURES[name];
  const v = validateAnswers(answers);
  if (!v.ok) throw new Error(`${name}: ${v.detail}`);
  const payload = buildCurvePayload(v.value);
  const h = payload.household as { axes: Array<Array<Record<string, unknown>>> };
  h.axes[0][0] = { ...h.axes[0][0], ...axis };
  const body = (await requestPE(payload, { timeoutMs: 90_000 })) as { status: string; result: { axes: Axis[][] } };
  if (body.status !== "ok") throw new Error(`${name}: ${JSON.stringify(body)}`);
  writeFileSync(out(`${name}.request.json`), pretty(payload));
  writeFileSync(out(`${name}.json`), pretty(body));
  const [{ min, max, count }] = body.result.axes[0];
  console.log(`${name}: ${count} points, $${min.toLocaleString()}–$${max.toLocaleString()}`);
}
