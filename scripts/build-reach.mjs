// Builds app/src/data/reach.json: per state × household archetype, a percentile
// ladder of weighted household income (ACS 1-Year PUMS, household file only).
// Answers "how common is the income needed to clear the benefits cliffs here?"
//
// Source: U.S. Census Bureau, American Community Survey Public Use Microdata
// Sample (PUMS), 2023 1-Year. Bulk files are public domain and need no API key.
// Usage: node scripts/build-reach.mjs   (downloads ~300 MB across 51 states)
//
// PUMS household variables used (no person-file join needed):
//   HINCP household income · HHT household/family type · NOC number of own
//   children · WGTP household weight.
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const YEAR = "2023";
const BASE = `https://www2.census.gov/programs-surveys/acs/data/pums/${YEAR}/1-Year`;
const MIN_SAMPLE = 30; // unweighted matching households required, else null (small-sample honesty)
const PCTLS = Array.from({ length: 21 }, (_, i) => i * 5); // p0,p5,…,p100

const STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM",
  "NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA",
  "WV","WI","WY",
];

// archetype id → predicate on {hht, noc}
const ARCHETYPES = {
  "single-0": (hht) => hht === 4 || hht === 6,          // nonfamily, living alone
  "single-1": (hht, noc) => (hht === 2 || hht === 3) && noc === 1,
  "single-2": (hht, noc) => (hht === 2 || hht === 3) && noc === 2,
  "single-3": (hht, noc) => (hht === 2 || hht === 3) && noc === 3,
  "married-0": (hht, noc) => hht === 1 && noc === 0,
  "married-1": (hht, noc) => hht === 1 && noc === 1,
  "married-2": (hht, noc) => hht === 1 && noc === 2,
  "married-3": (hht, noc) => hht === 1 && noc === 3,
};

function weightedLadder(pairs) {
  // pairs: [income, weight][]; returns income at each PCTL (rounded to $100).
  pairs.sort((a, b) => a[0] - b[0]);
  const total = pairs.reduce((s, [, w]) => s + w, 0);
  const out = [];
  let idx = 0, cum = 0;
  for (const p of PCTLS) {
    const target = (p / 100) * total;
    while (idx < pairs.length - 1 && cum + pairs[idx][1] < target) {
      cum += pairs[idx][1];
      idx++;
    }
    out.push(Math.round(pairs[idx][0] / 100) * 100);
  }
  return out;
}

function processState(st, dir) {
  const zip = join(dir, `h${st}.zip`);
  execSync(`curl -sSL -o "${zip}" "${BASE}/csv_h${st.toLowerCase()}.zip" --max-time 300`, { stdio: "ignore" });
  execSync(`unzip -oq "${zip}" -d "${dir}"`, { stdio: "ignore" });
  // the CSV is psam_h{fips}.csv — find it
  const csvName = execSync(`ls "${dir}" | grep -E '^psam_h.*\\.csv$'`).toString().trim().split("\n")[0];
  const lines = readFileSync(join(dir, csvName), "utf8").split("\n");
  const header = lines[0].split(",").map((h) => h.replace(/"/g, ""));
  const iH = header.indexOf("HINCP"), iT = header.indexOf("HHT"),
        iN = header.indexOf("NOC"), iW = header.indexOf("WGTP");
  const buckets = Object.fromEntries(Object.keys(ARCHETYPES).map((k) => [k, []]));
  for (let li = 1; li < lines.length; li++) {
    const row = lines[li];
    if (!row) continue;
    const c = row.split(",");
    const hht = Number(c[iT].replace(/"/g, ""));
    const w = Number(c[iW].replace(/"/g, ""));
    const hincp = c[iH].replace(/"/g, "");
    if (!w || w <= 0 || hincp === "" || Number.isNaN(hht)) continue;
    const inc = Number(hincp);
    if (Number.isNaN(inc)) continue;
    const nocRaw = c[iN].replace(/"/g, "");
    const noc = nocRaw === "" ? 0 : Number(nocRaw);
    for (const [id, pred] of Object.entries(ARCHETYPES)) {
      if (pred(hht, noc)) buckets[id].push([inc, w]);
    }
  }
  const cell = {};
  for (const [id, pairs] of Object.entries(buckets)) {
    cell[id] = pairs.length >= MIN_SAMPLE
      ? { ladder: weightedLadder(pairs), households: Math.round(pairs.reduce((s, [, w]) => s + w, 0)) }
      : null;
  }
  rmSync(zip, { force: true });
  execSync(`rm -f "${join(dir, csvName)}"`, { stdio: "ignore" });
  return cell;
}

const dir = mkdtempSync(join(tmpdir(), "reach-"));
const states = {};
for (const st of STATES) {
  process.stderr.write(`  ${st}…`);
  states[st] = processState(st, dir);
}
process.stderr.write("\n");
rmSync(dir, { recursive: true, force: true });

writeFileSync(
  new URL("../app/src/data/reach.json", import.meta.url),
  JSON.stringify({ year: YEAR, source: "U.S. Census Bureau, ACS 1-Year PUMS", percentiles: PCTLS, states }),
);
console.log(`wrote reach.json — ${STATES.length} states`);
