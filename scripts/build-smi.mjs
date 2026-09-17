// Builds core/data/smi.json: 60% of state median income (SMI) by state for a
// four-person household, the LIHEAP fiscal year's mandatory figure, plus the
// household-size adjustment that turns it into every other size's limit
// (45 CFR 96.85: 52% for one person, 68 for two, 84 for three, 100 for four,
// 116 for five, 132 for six, then +3 points a person).
//
// Why upstream's parameter and not ACF's PDF: the publisher of record is
// ACF's LIHEAP-IM-2025-02 Attachment 4, but acf.gov answers a plain request
// with an empty HTTP 202 (docs/research/liheap-cliff-2026-09-16.md § 2), and
// policyengine-us transcribes the same table, by state and fiscal year, into
// `gov/hhs/smi/amount.yaml` with the IM cited as its reference. This script
// reads that transcription at ONE pinned commit, so the file can be re-derived
// byte for byte, and records the commit, the two URLs and the ACF citation the
// parameter itself carries. Two independently published figures are pinned in
// core/src/liheap.test.ts against the arithmetic here: Massachusetts' FY2026
// matrix prints $83,641 for a household of three, Missouri's DSS table
// $4,588 a month (Plan 7 § core/data/smi.json).
//
// Usage: node scripts/build-smi.mjs [--out=path] [--commit=<sha>]
// The one state list (plain node strips the types; Node 22.18+): the parameter
// also carries Puerto Rico, which HotGap does not model.
import { STATE_CODES } from "../core/src/states.ts";
import { outputPath, parseArgs, writeStamped } from "./lib/builder.mjs";

// policyengine-us `main` as read on 2026-09-16 (2.6.4). Move the pin only when
// a new LIHEAP fiscal year's figures land upstream, and say so in the commit.
const COMMIT = "6b7101388adc0661df510d3ee854e015647e5753";
// The LIHEAP fiscal year these limits govern, and the parameter period that
// carries it: FY2026 runs 2025-10-01 to 2026-09-30. The prior year's figure
// rides along because two states' FY2026 matrices still apply it (South
// Carolina cites LIHEAP-IM-2024-02; West Virginia's worksheet computes from
// the FY2025 four-person $90,661), and a row in core/src/liheap.ts has to be
// able to say which vintage the state's own table uses.
const FISCAL_YEAR = "FY2026";
const PERIOD = "2025-10-01";
const PERIODS = { FY2025: "2024-10-01", FY2026: PERIOD };

const raw = (commit, file) => `https://raw.githubusercontent.com/PolicyEngine/policyengine-us/${commit}/policyengine_us/parameters/gov/hhs/smi/${file}`;

/**
 * The subset of YAML these two files use: top-level keys, one level of
 * indented `key: value` pairs, `_` thousands separators, and a `metadata`
 * block with a `reference` list of `title`/`href` pairs. No YAML library is
 * installed, and the shape is fixed by upstream's parameter convention.
 */
function parseParameter(text) {
  const values = {};
  const references = [];
  let section = null;
  let ref = null;
  for (const line of text.split("\n")) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const top = /^([A-Za-z_]+):\s*$/.exec(line);
    if (top) { section = top[1]; ref = null; continue; }
    const pair = /^  ([0-9]{4}-[0-9]{2}-[0-9]{2}|[a-z_]+):\s*(.+?)\s*$/.exec(line);
    if (pair && section !== "metadata") {
      (values[section] ??= {})[pair[1]] = Number(pair[2].replace(/_/g, ""));
      continue;
    }
    const item = /^\s+- title:\s*(.+?)\s*$/.exec(line);
    if (item) { ref = { title: item[1] }; references.push(ref); continue; }
    const href = /^\s+href:\s*(\S+)\s*$/.exec(line);
    if (href && ref) ref.href = href[1];
  }
  return { values, references };
}

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

const argv = parseArgs();
const commit = argv.commit ?? COMMIT;
const urls = { amount: raw(commit, "amount.yaml"), adjustment: raw(commit, "household_size_adjustment.yaml"), threshold: raw(commit, "additional_person_threshold.yaml") };
const amount = parseParameter(await fetchText(urls.amount));
const adjustment = parseParameter(await fetchText(urls.adjustment));
const threshold = parseParameter(await fetchText(urls.threshold));

const acf = amount.references.find((r) => /FY 2026/.test(r.title));
if (!acf) throw new Error("amount.yaml no longer cites an FY 2026 ACF table; re-read the parameter before pinning");

const states = {};
for (const state of STATE_CODES) {
  const fourPerson = {};
  for (const [fy, period] of Object.entries(PERIODS)) {
    const v = amount.values[state]?.[period];
    if (v === undefined) throw new Error(`${state} has no ${period} value`);
    fourPerson[fy] = v;
  }
  states[state] = { fourPerson };
}

// The adjustment is national and dated once; take the value in force for the period.
const inForce = (byPeriod) => byPeriod[Object.keys(byPeriod).filter((d) => d <= PERIOD).sort().at(-1)];

const body = {
  fiscalYear: FISCAL_YEAR,
  period: PERIOD,
  source: {
    commit,
    url: urls,
    publisher: "policyengine-us parameters gov/hhs/smi (amount.yaml, household_size_adjustment.yaml, additional_person_threshold.yaml), a transcription of the ACF table below, at the pinned commit",
    acf,
    sizeRule: "45 CFR 96.85: 60% of the four-person SMI times 52% for one person, +16 points a person through six, +3 points a person above six",
    periods: PERIODS,
  },
  adjustment: {
    firstPerson: inForce(adjustment.values.first_person),
    secondToSixthPerson: inForce(adjustment.values.second_to_sixth_person),
    additionalPerson: inForce(adjustment.values.additional_person),
    additionalPersonThreshold: inForce(threshold.values.values),
  },
  states,
};

const out = outputPath(argv, new URL("../core/data/smi.json", import.meta.url));
writeStamped(out, "read", new Date().toISOString().slice(0, 10), body, 1);
console.log(`wrote ${out.pathname}: ${Object.keys(states).length} states, ${FISCAL_YEAR}, commit ${commit.slice(0, 10)}`);
