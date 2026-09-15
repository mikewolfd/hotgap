// Builds core/data/reach.json: per state × household archetype, a percentile
// ladder of weighted HOUSEHOLD EARNINGS in 2026 dollars, plus the Census-
// prescribed margin of error for every point on it.
//
// Why earnings, not total income: the tool's "safe exit" is an EMPLOYMENT-income
// threshold. Comparing it to total household income (which includes benefits,
// retirement, and non-labor income) is apples-to-oranges and understates how
// hard the jump is.
//
// Why householder + spouse, not every member: the tool's axis is ONE adult's
// employment income with the spouse's pay held fixed. Summing every member's
// pay folds in adult relatives — ~30% of aggregate "household earnings" in the
// single-parent cells, mostly the householder's own 18+ children, who are
// invisible to NOC. That made the single-parent ladders read far too high.
// We therefore sum PERNP for RELSHIPP 20 (reference person) and 21/23 (spouse)
// only. See docs/reviews/2026-09-14-methodology-validation.md, Appendix D8.
//
// Why a working-age householder: HHT/NOC are purely structural. "NOC = 0" is
// true of an 80-year-old couple and "living alone" is true at any age, so 23%–46%
// of the childless cells were 65+ householders and p25 was structurally $0 in
// 50 of 51 states. HHLDRAGEP (on the housing record) restricts to 18–64. (D2)
//
// Why MOEs instead of a sample-count floor: Census sets a variance METHOD, not
// a minimum record count. The 80 replicate weights WGTP1..WGTP80 are already in
// the files we download. Successive Difference Replication:
//   variance = (4/80) · Σ_r (X_r − X)²,  MOE₉₀ = 1.645 · SE
// (2024 Accuracy of the PUMS; 2024 PUMS User Guide §B.) Cells are suppressed on
// the relative MOE of their own median, with n ≥ 30 as a floor only. (D5)
//
// Sources (all keyless; the Census microdata API needs a key, these bulk zips
// do not — D7):
//   ACS 2024 1-Year PUMS   (released 2025-12-04)
//   ACS 2020–2024 5-Year PUMS (released 2026-03-05) — small states only (D6)
//   BLS ECI wages & salaries, private industry, for 2024 → 2026 dollars (D4)
//
// Usage: node scripts/build-reach.mjs [--states=CA,WY] [--out=path]
//   PUMS_CACHE=<dir>  where the downloaded zips are kept (default: a stable
//                     directory under the OS temp dir, so re-runs skip the
//                     ~700 MB download entirely).
import { createWriteStream, existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { createInterface } from "node:readline";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PUMS_YEAR = "2024";
const PUMS_BASE = `https://www2.census.gov/programs-surveys/acs/data/pums/${PUMS_YEAR}`;
const VINTAGE_1YR = "2024-1yr";
const VINTAGE_5YR = "2020-2024-5yr";

const PCTLS = Array.from({ length: 21 }, (_, i) => i * 5);
const MEDIAN_IDX = PCTLS.indexOf(50);
const REPS = 80; // WGTP1..WGTP80
const SDR_FACTOR = 4 / REPS; // 2024 Accuracy of the PUMS, §"Standard errors"
const Z90 = 1.645;
const MIN_N = 30; // a floor, NOT the reliability test — see MOE_LIMIT
const MOE_LIMIT = 0.5; // suppress when MOE₉₀(median) > 50% of the median

const SOURCE = {
  pums1yr: `${PUMS_BASE}/1-Year/`,
  pums5yr: `${PUMS_BASE}/5-Year/`,
  dataDictionary: `https://www2.census.gov/programs-surveys/acs/tech_docs/pums/data_dict/PUMS_Data_Dictionary_${PUMS_YEAR}.txt`,
  dataDictionary5yr: "https://www2.census.gov/programs-surveys/acs/tech_docs/pums/data_dict/PUMS_Data_Dictionary_2020-2024.txt",
  accuracy: `https://www2.census.gov/programs-surveys/acs/tech_docs/pums/accuracy/${PUMS_YEAR}AccuracyPUMS.pdf`,
  userGuide: `https://www2.census.gov/programs-surveys/acs/tech_docs/pums/${PUMS_YEAR}ACS_PUMS_User_Guide.pdf`,
  eci: "https://api.bls.gov/publicAPI/v2/timeseries/data/CIU2020000000000I",
  subjectDefinitions: `https://www2.census.gov/programs-surveys/acs/tech_docs/subject_definitions/${PUMS_YEAR}_ACSSubjectDefinitions.pdf`,
  // Census's own SDR standard errors for state totals — the file to check this
  // builder's variance code against (it reproduces WY "Total males" SE 1948,
  // MOE 3205 and "Age 20-24" SE 1678, MOE 2760 exactly).
  verificationEstimates: `https://www2.census.gov/programs-surveys/acs/tech_docs/pums/estimates/pums_estimates_${PUMS_YEAR.slice(2)}.csv`,
};

const STATES = {
  AL: "01", AK: "02", AZ: "04", AR: "05", CA: "06", CO: "08", CT: "09", DE: "10", DC: "11", FL: "12",
  GA: "13", HI: "15", ID: "16", IL: "17", IN: "18", IA: "19", KS: "20", KY: "21", LA: "22", ME: "23",
  MD: "24", MA: "25", MI: "26", MN: "27", MS: "28", MO: "29", MT: "30", NE: "31", NV: "32", NH: "33",
  NJ: "34", NM: "35", NY: "36", NC: "37", ND: "38", OH: "39", OK: "40", OR: "41", PA: "42", RI: "44",
  SC: "45", SD: "46", TN: "47", TX: "48", UT: "49", VT: "50", VA: "51", WA: "53", WV: "54", WI: "55", WY: "56",
};

// The five smallest states by 2024 1-Year housing records (WY 3,024 / VT 3,875 /
// AK 4,016 / DC 3,914 / ND 4,345 — D6). For these we also build from the 5-Year
// PUMS and fall back to it per cell when the 1-Year cell fails the MOE test.
const FIVE_YEAR_STATES = new Set(["WY", "VT", "AK", "DC", "ND"]);

const ARCHETYPE_IDS = ["single-0", "single-1", "single-2", "single-3", "married-0", "married-1", "married-2", "married-3"];
const MAX_KIDS = 3; // NOC >= 3 maps to the 3-kid bucket; 4+ own children used to match nothing at all (D2)

// ---------------------------------------------------------------- CSV parsing

// PUMS CSVs quote only string fields, and no PUMS value contains a comma, so
// the fast path splits on indexOf. A line that contains a quote at all takes a
// quote-aware path, so a future vintage that starts quoting (or embeds a comma)
// fails safe instead of silently shifting every column.
function splitLine(line, maxIdx) {
  if (line.includes('"')) return splitQuoted(line, maxIdx);
  const out = new Array(maxIdx + 1).fill("");
  let start = 0;
  for (let i = 0; i <= maxIdx; i++) {
    const c = line.indexOf(",", start);
    if (c === -1) { out[i] = line.slice(start); break; }
    out[i] = line.slice(start, c);
    start = c + 1;
  }
  return out;
}

// Header rows are plain column names — no embedded commas in any PUMS vintage.
const splitAll = (line) => line.split(",").map((c) => c.replace(/^"|"$/g, ""));

function splitQuoted(line, maxIdx) {
  const out = [];
  let field = "", quoted = false;
  for (let i = 0; i < line.length && out.length <= maxIdx; i++) {
    const ch = line[i];
    if (ch === '"') quoted = !quoted;
    else if (ch === "," && !quoted) { out.push(field); field = ""; }
    else field += ch;
  }
  if (out.length <= maxIdx) out.push(field);
  while (out.length <= maxIdx) out.push("");
  return out;
}

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0; // blank / "b" (N/A) -> 0
};

/** Streams one CSV out of a zip, line by line: O(rows), bounded memory. */
async function streamCsv(zipPath, entry, onHeader, onRow) {
  const child = spawn("unzip", ["-p", zipPath, entry], { stdio: ["ignore", "pipe", "inherit"] });
  const closed = new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`unzip -p ${entry} exited ${code}`))));
  });
  let maxIdx = -1;
  for await (const line of createInterface({ input: child.stdout, crlfDelay: Infinity })) {
    if (!line) continue;
    if (maxIdx < 0) { maxIdx = onHeader(splitAll(line)); continue; }
    onRow(splitLine(line, maxIdx));
  }
  await closed;
}

// ---------------------------------------------------------------- downloading

const CACHE = process.env.PUMS_CACHE || join(tmpdir(), "hotgap-pums");

async function fetchZip(kind, st, fiveYear) {
  mkdirSync(CACHE, { recursive: true });
  const folder = fiveYear ? "5-Year" : "1-Year";
  const dest = join(CACHE, `${PUMS_YEAR}-${fiveYear ? "5yr" : "1yr"}-${kind}${st.toLowerCase()}.zip`);
  if (existsSync(dest) && statSync(dest).size > 0) return dest;
  const url = `${PUMS_BASE}/${folder}/csv_${kind}${st.toLowerCase()}.zip`;
  const part = `${dest}.part`;
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { redirect: "follow" });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      await pipeline(Readable.fromWeb(res.body), createWriteStream(part));
      renameSync(part, dest);
      return dest;
    } catch (err) {
      rmSync(part, { force: true });
      if (attempt >= 3) throw new Error(`download failed after ${attempt} tries: ${url} (${err.message})`);
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
}

/** The psam_h… / psam_p… CSV entry inside a PUMS zip (which also holds a README PDF). */
function csvEntry(zipPath, kind) {
  const listed = spawnSync("unzip", ["-Z1", zipPath], { encoding: "utf8" });
  if (listed.status !== 0) throw new Error(`cannot list ${zipPath}: ${listed.stderr}`);
  const name = listed.stdout.split("\n").map((s) => s.trim()).find((n) => new RegExp(`^psam_${kind}.*\\.csv$`, "i").test(n));
  if (!name) throw new Error(`no psam_${kind}*.csv inside ${zipPath}`);
  return name;
}

// ---------------------------------------------------------- the PUMS read

/**
 * One state × one vintage → { buckets, adjinc }.
 *
 * Housing pass: keep occupied units with a working-age householder, remember
 * the main + 80 replicate weights and the archetype. Person pass: add up the
 * reference person's and spouse's ADJINC-adjusted PERNP.
 */
async function readState(st, fiveYear) {
  const [hZip, pZip] = await Promise.all([fetchZip("h", st, fiveYear), fetchZip("p", st, fiveYear)]);

  const bySerial = new Map();
  const buckets = Object.fromEntries(ARCHETYPE_IDS.map((id) => [id, []]));
  const adjincSeen = new Set();
  let hi = {};

  await streamCsv(hZip, csvEntry(hZip, "h"), (cols) => {
    hi = {
      serial: cols.indexOf("SERIALNO"), adjinc: cols.indexOf("ADJINC"), wgtp: cols.indexOf("WGTP"),
      np: cols.indexOf("NP"), hht: cols.indexOf("HHT"), noc: cols.indexOf("NOC"), age: cols.indexOf("HHLDRAGEP"),
      rep: Array.from({ length: REPS }, (_, r) => cols.indexOf(`WGTP${r + 1}`)),
    };
    for (const [k, v] of Object.entries(hi)) {
      if (k === "rep" ? v.some((i) => i < 0) : v < 0) throw new Error(`${st}: housing file is missing ${k}`);
    }
    return Math.max(hi.serial, hi.adjinc, hi.wgtp, hi.np, hi.hht, hi.noc, hi.age, ...hi.rep);
  }, (f) => {
    const w = num(f[hi.wgtp]);
    if (w <= 0) return;                    // GQ placeholder record (WGTP = 0)
    if (num(f[hi.np]) < 1) return;         // vacant unit
    const hht = num(f[hi.hht]);
    if (hht < 1) return;                   // no household type => not an occupied household
    const age = num(f[hi.age]);
    if (age < 18 || age > 64) return;      // working-age householder only (D2)

    const adjinc = num(f[hi.adjinc]) / 1e6; // 6 implied decimals (D1)
    if (adjinc > 0) adjincSeen.add(num(f[hi.adjinc]));
    const id = `${hht === 1 ? "married" : "single"}-${Math.min(num(f[hi.noc]), MAX_KIDS)}`;

    const rep = new Int32Array(REPS);
    for (let r = 0; r < REPS; r++) rep[r] = num(f[hi.rep[r]]);
    const rec = { w, rep, earn: 0, adj: adjinc || 1 };
    bySerial.set(f[hi.serial], rec);
    buckets[id].push(rec);
  });

  let pi = {};
  await streamCsv(pZip, csvEntry(pZip, "p"), (cols) => {
    pi = { serial: cols.indexOf("SERIALNO"), rel: cols.indexOf("RELSHIPP"), pernp: cols.indexOf("PERNP") };
    for (const [k, v] of Object.entries(pi)) if (v < 0) throw new Error(`${st}: person file is missing ${k}`);
    return Math.max(pi.serial, pi.rel, pi.pernp);
  }, (f) => {
    const rel = num(f[pi.rel]);
    // 20 = reference person, 21 = opposite-sex spouse, 23 = same-sex spouse.
    // Unmarried partners (22/24) and every other member are deliberately out.
    if (rel !== 20 && rel !== 21 && rel !== 23) return;
    const rec = bySerial.get(f[pi.serial]);
    if (!rec) return;
    rec.earn += num(f[pi.pernp]) * rec.adj; // PERNP keeps self-employment losses
  });

  // Floor the SUM, not each component: a spouse's self-employment loss really
  // does reduce what the couple took home, and PERNP ranges to −$10,000. Only a
  // household whose combined earnings are negative is clamped, to 0 — the
  // reach ladder is a "how much do you bring in" axis with no negative rung.
  for (const rec of bySerial.values()) rec.earn = Math.max(0, rec.earn);

  return { buckets, adjinc: [...adjincSeen].sort((a, b) => a - b) };
}

// ------------------------------------------------------------ the statistics

/**
 * Weighted percentiles over records already sorted by `earn`. `rep < 0` uses the
 * main weight; otherwise replicate `rep`. Returns null when the weight total is
 * zero (a replicate that dropped the whole cell).
 *
 * Replicate weights may be negative (Accuracy of the PUMS: an artefact of adding
 * the group-quarters population to ACS weighting), which makes the running total
 * not strictly monotone. Measured across WY/CA/NY/DC that is 96 negative values
 * out of 12.0 million, in 13 of 150,369 kept households, smallest -181 against
 * weights in the thousands — the index walk still advances forward only, and the
 * effect on any percentile is far inside the $100 rounding.
 */
function weightedLadder(sorted, rep) {
  let total = 0;
  for (const r of sorted) total += rep < 0 ? r.w : r.rep[rep];
  if (total <= 0) return null;
  const out = new Array(PCTLS.length);
  let i = 0, cum = 0;
  for (let k = 0; k < PCTLS.length; k++) {
    const target = (PCTLS[k] / 100) * total;
    while (i < sorted.length - 1 && cum + (rep < 0 ? sorted[i].w : sorted[i].rep[rep]) < target) {
      cum += rep < 0 ? sorted[i].w : sorted[i].rep[rep];
      i++;
    }
    out[k] = sorted[i].earn;
  }
  return out;
}

const round100 = (v) => Math.round(v / 100) * 100;
// MOEs round UP to the ladder's own $100 granularity, never down: a stated
// uncertainty that shrinks to $0 by rounding would read as "exact". After this,
// moe === 0 means one thing only — every replicate produced the same value.
const ceil100 = (v) => Math.ceil(v / 100) * 100;

/** One state × archetype × vintage cell, with SDR margins of error. */
function buildCell(recs, growth, vintage) {
  if (recs.length === 0) return null;
  recs.sort((a, b) => a.earn - b.earn);
  const point = weightedLadder(recs, -1);
  if (!point) return null;

  const sumSq = new Float64Array(PCTLS.length);
  for (let r = 0; r < REPS; r++) {
    const replicate = weightedLadder(recs, r);
    if (!replicate) continue; // contributes 0 to the sum; the divisor stays 80, per Census
    for (let k = 0; k < PCTLS.length; k++) {
      const d = (replicate[k] - point[k]) * growth;
      sumSq[k] += d * d;
    }
  }

  const ladder = point.map((v) => round100(v * growth));
  const moe = [];
  let seZero = false;
  for (let k = 0; k < PCTLS.length; k++) {
    const se = Math.sqrt(SDR_FACTOR * sumSq[k]);
    moe.push(ceil100(Z90 * se));
    // p0 and p100 are the cell's min and max, identical in every replicate by
    // construction, so their SE is structurally zero and says nothing. An
    // INTERIOR zero is the trap Accuracy of the PUMS warns about: "Medians
    // should always have a non-zero SE. A median with a SE of zero may occur
    // when several records in the middle of the distribution were rounded to
    // the same value." Census's remedy is a GVF standard error from the design
    // factors; 2024 is the last vintage that publishes those, so we flag the
    // cell instead of quietly reporting the zero as precision.
    if (se === 0 && k > 0 && k < PCTLS.length - 1) seZero = true;
  }

  let households = 0;
  for (const r of recs) households += r.w;
  const cell = { ladder, moe, households: Math.round(households), n: recs.length, vintage };
  if (seZero) cell.seZero = true;
  return cell;
}

/**
 * The published reliability test, verifiable from the shipped numbers alone:
 * a median with a 90% margin of error wider than half of itself is not a point
 * estimate. n ≥ 30 is a floor beneath it, not the test. A non-positive median
 * cannot be tested against its own MOE at all, so it never publishes.
 */
function passes(cell) {
  if (!cell || cell.n < MIN_N) return false;
  const median = cell.ladder[MEDIAN_IDX];
  return median > 0 && cell.moe[MEDIAN_IDX] <= MOE_LIMIT * median;
}

// ------------------------------------------------------- 2024 → 2026 dollars

const ECI_SERIES = "CIU2020000000000I"; // ECI, wages and salaries, private industry workers, index NSA

// Quarterly values fetched from api.bls.gov on 2026-09-14, kept so an offline or
// rate-limited run still produces a sourced factor rather than a guess. The
// methodology validation quotes 2026 Q1 177.672 and Q2 179.304, which match.
const ECI_FALLBACK = {
  "2023-1": 159.5, "2023-2": 161.3, "2023-3": 162.9, "2023-4": 164.1,
  "2024-1": 166.3, "2024-2": 167.9, "2024-3": 169.1, "2024-4": 170.2,
  "2025-1": 171.9, "2025-2": 173.849, "2025-3": 175.109, "2025-4": 175.885,
  "2026-1": 177.672, "2026-2": 179.304,
};

async function fetchEci() {
  const body = JSON.stringify({ seriesid: [ECI_SERIES], startyear: "2023", endyear: "2026" });
  for (const version of ["v2", "v1"]) {
    try {
      const res = await fetch(`https://api.bls.gov/publicAPI/${version}/timeseries/data/${ECI_SERIES}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body,
      });
      const json = await res.json();
      if (json.status !== "REQUEST_SUCCEEDED") throw new Error(json.status + " " + (json.message || []).join("; "));
      const out = {};
      for (const d of json.Results.series[0].data) {
        const q = /^Q0([1-4])$/.exec(d.period);
        if (q) out[`${d.year}-${q[1]}`] = Number(d.value);
      }
      if (Object.keys(out).length < 8) throw new Error("too few quarters returned");
      return { values: out, live: true, version };
    } catch (err) {
      process.stderr.write(`  BLS ${version} unavailable: ${err.message}\n`);
    }
  }
  return { values: ECI_FALLBACK, live: false, version: null };
}

/**
 * CY2024 average → CY2026 average on the ECI. Unpublished 2026 quarters are
 * extrapolated from the same quarter of 2025 at the latest published 12-month
 * rate of change, which is how BLS itself frames the series' headline number.
 */
function growthFactor(eci) {
  const v = eci.values;
  const cy = (y) => [1, 2, 3, 4].map((q) => v[`${y}-${q}`]);
  const base = cy(2024);
  if (base.some((x) => x === undefined)) throw new Error("ECI: CY2024 is incomplete");

  let latest = null;
  for (const y of [2026, 2025]) for (const q of [4, 3, 2, 1]) if (latest === null && v[`${y}-${q}`] !== undefined) latest = { y, q };
  const prior = v[`${latest.y - 1}-${latest.q}`];
  if (prior === undefined) throw new Error("ECI: no year-earlier quarter for the 12-month rate");
  const yoy = v[`${latest.y}-${latest.q}`] / prior;

  const target = [1, 2, 3, 4].map((q) => {
    const actual = v[`2026-${q}`];
    return actual !== undefined ? { q, value: actual, projected: false } : { q, value: v[`2025-${q}`] * yoy, projected: true };
  });
  const avg = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;
  const from = avg(base);
  const to = avg(target.map((t) => t.value));

  process.stderr.write(
    `ECI ${ECI_SERIES} (${eci.live ? `live, api.bls.gov ${eci.version}` : "offline fallback, fetched 2026-09-14"})\n` +
    `  CY2024: ${base.join(" / ")} -> avg ${from.toFixed(3)}\n` +
    `  latest published: ${latest.y}Q${latest.q} = ${v[`${latest.y}-${latest.q}`]} vs ${latest.y - 1}Q${latest.q} = ${prior} -> 12-month rate ${((yoy - 1) * 100).toFixed(2)}%\n` +
    `  CY2026: ${target.map((t) => `${t.value.toFixed(3)}${t.projected ? "*" : ""}`).join(" / ")} -> avg ${to.toFixed(3)}   (* projected at the 12-month rate)\n` +
    `  factor CY2024 -> CY2026 = ${(to / from).toFixed(6)}\n`,
  );

  return {
    factor: Number((to / from).toFixed(6)),
    series: ECI_SERIES,
    from: { period: "CY2024", index: Number(from.toFixed(3)) },
    to: { period: "CY2026", index: Number(to.toFixed(3)), projectedQuarters: target.filter((t) => t.projected).map((t) => `2026Q${t.q}`) },
    method:
      "BLS Employment Cost Index, wages and salaries, private industry workers (index, not seasonally adjusted). " +
      "Calendar-year average of the four quarterly index values, CY2024 -> CY2026; quarters not yet published are " +
      `extrapolated from the same quarter of the prior year at the latest published 12-month rate (${((yoy - 1) * 100).toFixed(2)}%). ` +
      (eci.live ? `Fetched live from ${SOURCE.eci}.` : "BLS was unreachable: values fetched from api.bls.gov on 2026-09-14 and compiled into this script were used instead."),
    source: SOURCE.eci,
    live: eci.live,
  };
}

// ---------------------------------------------------------------------- main

const argv = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
const stateList = argv.states ? argv.states.split(",") : Object.keys(STATES);
const outPath = argv.out ? new URL(argv.out, `file://${process.cwd()}/`) : new URL("../core/data/reach.json", import.meta.url);

const growth = growthFactor(await fetchEci());
const adjincUsed = {};
const states = {};
const started = Date.now();

for (const st of stateList) {
  if (!STATES[st]) throw new Error(`unknown state ${st}`);
  const t0 = Date.now();
  const oneYear = await readState(st, false);
  adjincUsed[VINTAGE_1YR] = [...new Set([...(adjincUsed[VINTAGE_1YR] || []), ...oneYear.adjinc])].sort((a, b) => a - b);

  const cells = {};
  for (const id of ARCHETYPE_IDS) cells[id] = buildCell(oneYear.buckets[id], growth.factor, VINTAGE_1YR);

  let swapped = 0;
  if (FIVE_YEAR_STATES.has(st) && ARCHETYPE_IDS.some((id) => !passes(cells[id]))) {
    const fiveYear = await readState(st, true);
    adjincUsed[VINTAGE_5YR] = [...new Set([...(adjincUsed[VINTAGE_5YR] || []), ...fiveYear.adjinc])].sort((a, b) => a - b);
    for (const id of ARCHETYPE_IDS) {
      if (passes(cells[id])) continue;
      const alt = buildCell(fiveYear.buckets[id], growth.factor, VINTAGE_5YR);
      if (passes(alt)) { cells[id] = alt; swapped++; }
    }
  }

  states[st] = Object.fromEntries(ARCHETYPE_IDS.map((id) => [id, passes(cells[id]) ? cells[id] : null]));
  const kept = ARCHETYPE_IDS.filter((id) => states[st][id]).length;
  process.stderr.write(`  ${st}  ${kept}/8 cells${swapped ? `, ${swapped} from the 5-year` : ""}  ${((Date.now() - t0) / 1000).toFixed(1)}s\n`);
}

const body = {
  year: "2026",
  basis:
    `ACS ${PUMS_YEAR} 1-Year PUMS (and the 2020-2024 5-Year PUMS for small-state cells the 1-Year cannot support), ` +
    "householder + spouse earnings, adjusted to 2024 dollars by each record's ADJINC and to 2026 dollars by the BLS ECI.",
  source: SOURCE,
  adjinc: {
    note: "ADJINC as published on the PUMS record: 6 implied decimals, applied per record before anything else.",
    values: adjincUsed,
  },
  growth,
  percentiles: PCTLS,
  earningsConcept: "householder + spouse PERNP, ADJINC-adjusted, floored at 0",
  householderAge: [18, 64],
  archetypes: {
    married: "HHT = 1 (married-couple household).",
    single: "any other household type with a householder aged 18-64, including nonfamily households not living alone (HHT 5/7) and family households with no own children (HHT 2/3, NOC 0).",
    kids: `NOC (own children under 18); NOC >= ${MAX_KIDS} maps to the ${MAX_KIDS}-kid bucket.`,
  },
  suppression:
    `A cell is null unless it clears both tests. Reliability: the 90% margin of error of its median, computed by ` +
    `Successive Difference Replication over WGTP1..WGTP${REPS} (variance = (4/${REPS}) x sum of (Xr - X)^2, MOE90 = ${Z90} x SE), ` +
    `must be at most ${MOE_LIMIT * 100}% of that median; a non-positive median never publishes. Floor: at least ${MIN_N} unweighted households. ` +
    `Each ladder point carries its own MOE90 in the same order, rounded UP to the ladder's own $100 granularity so that a ` +
    `zero MOE always means a zero replicate variance rather than a small one. The MOE at p0 and p100 is structurally zero (they are the cell's ` +
    `min and max, the same record in every replicate) and should not be read as precision; "seZero" marks a cell where an INTERIOR ` +
    `point also has a zero replicate variance. Accuracy of the PUMS says a median should never have a zero SE and prescribes the ` +
    `generalized-variance method with design factors for that case; this build flags such cells rather than substituting a GVF ` +
    `standard error, so "seZero" reads as "unmeasured here", never as "exact".`,
  states,
};

// Stamp the sweep that last CHANGED the numbers, matching summary.json's
// convention: an unchanged rebuild leaves the file, and this stamp, alone, so a
// re-run is not a diff.
const { generated: priorStamp, ...priorBody } = existsSync(outPath) ? JSON.parse(readFileSync(outPath, "utf8")) : {};
const unchanged = priorStamp !== undefined && JSON.stringify(priorBody) === JSON.stringify(body);
writeFileSync(outPath, JSON.stringify({ generated: unchanged ? priorStamp : new Date().toISOString(), ...body }));
const cellCount = Object.values(states).flatMap((s) => Object.values(s)).filter(Boolean).length;
const fromFive = Object.values(states).flatMap((s) => Object.values(s)).filter((c) => c && c.vintage === VINTAGE_5YR).length;
console.log(
  `wrote ${outPath.pathname} — ${Object.keys(states).length} states, ${cellCount}/${Object.keys(states).length * 8} cells published ` +
  `(${fromFive} from the 5-year PUMS), 2026 dollars, in ${((Date.now() - started) / 1000 / 60).toFixed(1)} min`,
);
