// Builds app/src/data/reach.json: per state × household archetype, a percentile
// ladder of weighted household EARNINGS (person wages + self-employment summed
// per household), inflation-adjusted from the 2023 ACS to 2026 dollars.
//
// Why earnings, not total income: the tool's "safe exit" is an EMPLOYMENT-income
// threshold on one earner's axis. Comparing it to total household income (which
// includes benefits, other earners, and non-labor income) is apples-to-oranges
// and understates how hard the jump is. Household earnings is the honest yardstick.
//
// Source: U.S. Census Bureau ACS 2023 1-Year PUMS, household + person files
// (public domain, no API key). Usage: node scripts/build-reach.mjs
import { writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const YEAR = "2023";
const BASE = `https://www2.census.gov/programs-surveys/acs/data/pums/${YEAR}/1-Year`;
// Approximate nominal wage growth ACS-2023 -> policy-year 2026 (~4%/yr), so a 2026
// escape income is compared against a 2026-dollar earnings distribution.
const INFLATION_2023_TO_2026 = 1.12;
const MIN_SAMPLE = 30;
const PCTLS = Array.from({ length: 21 }, (_, i) => i * 5);

const STATES = {
  AL:"01",AK:"02",AZ:"04",AR:"05",CA:"06",CO:"08",CT:"09",DE:"10",DC:"11",FL:"12",
  GA:"13",HI:"15",ID:"16",IL:"17",IN:"18",IA:"19",KS:"20",KY:"21",LA:"22",ME:"23",
  MD:"24",MA:"25",MI:"26",MN:"27",MS:"28",MO:"29",MT:"30",NE:"31",NV:"32",NH:"33",
  NJ:"34",NM:"35",NY:"36",NC:"37",ND:"38",OH:"39",OK:"40",OR:"41",PA:"42",RI:"44",
  SC:"45",SD:"46",TN:"47",TX:"48",UT:"49",VT:"50",VA:"51",WA:"53",WV:"54",WI:"55",WY:"56",
};

const ARCHETYPES = {
  "single-0": (hht) => hht === 4 || hht === 6,
  "single-1": (hht, noc) => (hht === 2 || hht === 3) && noc === 1,
  "single-2": (hht, noc) => (hht === 2 || hht === 3) && noc === 2,
  "single-3": (hht, noc) => (hht === 2 || hht === 3) && noc === 3,
  "married-0": (hht, noc) => hht === 1 && noc === 0,
  "married-1": (hht, noc) => hht === 1 && noc === 1,
  "married-2": (hht, noc) => hht === 1 && noc === 2,
  "married-3": (hht, noc) => hht === 1 && noc === 3,
};

function ladder(pairs) {
  pairs.sort((a, b) => a[0] - b[0]);
  const total = pairs.reduce((s, [, w]) => s + w, 0);
  const out = [];
  let idx = 0, cum = 0;
  for (const p of PCTLS) {
    const target = (p / 100) * total;
    while (idx < pairs.length - 1 && cum + pairs[idx][1] < target) { cum += pairs[idx][1]; idx++; }
    out.push(Math.round((pairs[idx][0] * INFLATION_2023_TO_2026) / 100) * 100);
  }
  return out;
}

// PUMS CSVs quote only string fields today, so numeric columns parse fine with
// a bare Number(). Strip quotes anyway so a future vintage that quotes numbers
// fails safe (a quoted number would otherwise become NaN -> silently 0).
const cell_str = (v) => String(v ?? "").replace(/"/g, "");
const num = (v) => Number(cell_str(v)) || 0;

function processState(st, dir) {
  for (const kind of ["h", "p"]) {
    execSync(`curl -sSL -o "${dir}/${kind}.zip" "${BASE}/csv_${kind}${st.toLowerCase()}.zip" --max-time 300`, { stdio: "ignore" });
    execSync(`unzip -oq "${dir}/${kind}.zip" -d "${dir}"`, { stdio: "ignore" });
  }
  const hcsv = execSync(`ls "${dir}" | grep -E '^psam_h.*\\.csv$'`).toString().trim().split("\n")[0];
  const pcsv = execSync(`ls "${dir}" | grep -E '^psam_p.*\\.csv$'`).toString().trim().split("\n")[0];

  // household composition + weight
  const hh = new Map();
  const hlines = execSync(`cat "${dir}/${hcsv}"`, { maxBuffer: 512 * 1024 * 1024 }).toString("utf8").split("\n");
  const hh0 = hlines[0].split(",").map(cell_str);
  const [iS, iHHT, iNOC, iWGTP] = ["SERIALNO", "HHT", "NOC", "WGTP"].map((k) => hh0.indexOf(k));
  for (let i = 1; i < hlines.length; i++) {
    if (!hlines[i]) continue;
    const c = hlines[i].split(",");
    const w = num(c[iWGTP]);
    if (w <= 0) continue;
    hh.set(cell_str(c[iS]), { hht: num(c[iHHT]), noc: num(c[iNOC]), w });
  }
  // household earnings = sum(person WAGP + SEMP)
  const earn = new Map();
  const plines = execSync(`cat "${dir}/${pcsv}"`, { maxBuffer: 1024 * 1024 * 1024 }).toString("utf8").split("\n");
  const p0 = plines[0].split(",").map(cell_str);
  const [pS, iWAGP, iSEMP] = ["SERIALNO", "WAGP", "SEMP"].map((k) => p0.indexOf(k));
  for (let i = 1; i < plines.length; i++) {
    if (!plines[i]) continue;
    const c = plines[i].split(",");
    const s = cell_str(c[pS]);
    const wagp = Math.max(0, num(c[iWAGP]));
    const semp = Math.max(0, num(c[iSEMP]));
    earn.set(s, (earn.get(s) || 0) + wagp + semp);
  }
  const buckets = Object.fromEntries(Object.keys(ARCHETYPES).map((k) => [k, []]));
  for (const [s, { hht, noc, w }] of hh) {
    for (const [id, pred] of Object.entries(ARCHETYPES)) {
      if (pred(hht, noc)) buckets[id].push([earn.get(s) || 0, w]);
    }
  }
  const cell = {};
  for (const [id, pairs] of Object.entries(buckets)) {
    cell[id] = pairs.length >= MIN_SAMPLE
      ? { ladder: ladder(pairs), households: Math.round(pairs.reduce((s, [, w]) => s + w, 0)) }
      : null;
  }
  execSync(`rm -f "${dir}"/*.zip "${dir}/${hcsv}" "${dir}/${pcsv}"`, { stdio: "ignore" });
  return cell;
}

const dir = execSync("mktemp -d").toString().trim();
const states = {};
for (const st of Object.keys(STATES)) {
  process.stderr.write(`  ${st}…`);
  states[st] = processState(st, dir);
}
process.stderr.write("\n");
execSync(`rm -rf "${dir}"`, { stdio: "ignore" });

writeFileSync(
  new URL("../app/src/data/reach.json", import.meta.url),
  JSON.stringify({ year: "2026", basis: "ACS 2023 1-Year PUMS household earnings, inflation-adjusted to 2026", source: "U.S. Census Bureau, ACS 1-Year PUMS", percentiles: PCTLS, states }),
);
console.log(`wrote reach.json — ${Object.keys(STATES).length} states (household earnings, 2026 dollars)`);
