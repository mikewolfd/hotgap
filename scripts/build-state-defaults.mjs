// Builds core/data/state-defaults.json: per state, ONE household — the typical
// renter in the state's most populous county — as the three figures the
// archetype sweep needs when nobody told us otherwise.
//
// Why the file exists: the sweep used to send `countyFips: null` and
// `monthlyRent: null` for every archetype, and both nulls are answers, not
// blanks. No rent means no SNAP excess-shelter deduction (every swept cell
// understated SNAP by $1–3k); no county means PolicyEngine's default rating
// area for the state, which is byte-identical for CT and IL and for CO and IN,
// so a premium-driven ranking was partly ranking that default.
//
// Why all three columns describe the SAME county: the archetype is documented
// as "a typical renter in the state's most populous county", so every figure
// attached to it has to be that county's. The hand-assembled file this script
// replaces took `countyFips` and `monthlyRent` from the most populous county
// but `monthlyChildcarePreschool` from the state MEDIAN county — two different
// households in one row. Where the state's biggest county is also its priciest
// that understates the childcare bill badly: VA was $774 against Fairfax's
// $1,839, OR $903 against Multnomah's $1,760, IL $730 against Cook's $1,241.
// Harmless while the price was only a Head Start replacement value; not
// harmless the moment the archetype carries a childcare bill.
//
// Why a script: the file it replaces was written by hand, so nobody could
// re-derive it or refresh it, and three of its numbers (AK $947, MO $910,
// NC $685) matched no rule the file itself documented.
//
// Sources:
//   Census Vintage 2024 county population estimates  -> countyFips
//   HUD FY2026 Fair Market Rents, revised schedule   -> monthlyRent
//   DOL Women's Bureau NDCP (MCInfant/MCToddler/MCPreschool/MCSA) -> monthlyChildcare{Infant,Toddler,Preschool,SchoolAge}
//   BLS ECI wages & salaries, private industry       -> NDCP study year -> 2026 dollars
//
// Usage: node scripts/build-state-defaults.mjs [--out=path]
//   STATE_DEFAULTS_CACHE=<dir>  where the three downloads are kept (default: a
//                     stable directory under the OS temp dir), so a re-run
//                     skips them — the NDCP workbook alone is 35 MB.
//   ZYTE_TOKEN=<token>  huduser.gov answers a plain request with an empty
//                     HTTP 202 bot challenge. The other two publishers serve
//                     the file directly and never touch Zyte.
import { closeSync, createWriteStream, existsSync, mkdirSync, openSync, readFileSync, readSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
// The one state list (plain node strips the types; Node 22.18+).
import { FIPS_TO_USPS, STATE_CODES } from "../core/src/states.ts";

const SOURCE = {
  countyPop: "https://www2.census.gov/programs-surveys/popest/datasets/2020-2024/counties/totals/co-est2024-alldata.csv",
  countyPopIndex: "https://www.census.gov/data/tables/time-series/demo/popest/2020s-counties-total.html",
  fmr: "https://www.huduser.gov/portal/datasets/fmr/fmr2026/FY26_FMRs_revised.xlsx",
  fmrIndex: "https://www.huduser.gov/portal/datasets/fmr.html",
  ndcp: "https://www.dol.gov/sites/dolgov/files/WB/media/nationaldatabaseofchildcareprices.xlsx",
  ndcpIndex: "https://www.dol.gov/agencies/wb/topics/childcare/price-by-age-care-setting",
  eci: "https://api.bls.gov/publicAPI/v2/timeseries/data/",
};

// ---------------------------------------------------------------- downloading

const CACHE = process.env.STATE_DEFAULTS_CACHE || join(tmpdir(), "hotgap-state-defaults");

/**
 * Downloads `url` to `CACHE/name` once. `zipped` files are checked for the
 * "PK" magic: huduser.gov answers a plain request with an empty HTTP 202 bot
 * challenge rather than an error, so "it returned something" is not a test.
 * Those go through Zyte, which needs ZYTE_TOKEN in the environment.
 */
async function download(url, name, { zipped = false } = {}) {
  mkdirSync(CACHE, { recursive: true });
  const dest = join(CACHE, name);
  if (existsSync(dest) && statSync(dest).size > 0) {
    process.stderr.write(`  cached  ${name}  (${(statSync(dest).size / 1e6).toFixed(1)} MB)\n`);
    return dest;
  }
  const part = `${dest}.part`;
  const magic = (p) => { const fd = openSync(p, "r"); const b = Buffer.alloc(2); readSync(fd, b, 0, 2, 0); closeSync(fd); return b.toString("latin1"); };
  const ok = (p) => statSync(p).size > 0 && (!zipped || magic(p) === "PK");

  try {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
    await pipeline(Readable.fromWeb(res.body), createWriteStream(part));
    if (!ok(part)) throw new Error(`HTTP ${res.status} with no usable body (bot challenge?)`);
    renameSync(part, dest);
    process.stderr.write(`  fetched ${name}  (${(statSync(dest).size / 1e6).toFixed(1)} MB)\n`);
    return dest;
  } catch (err) {
    rmSync(part, { force: true });
    if (!process.env.ZYTE_TOKEN) {
      throw new Error(`${url} did not serve the file (${err.message}) and ZYTE_TOKEN is not set, so it cannot be fetched through Zyte either.`);
    }
    process.stderr.write(`  direct fetch of ${name} failed (${err.message}); retrying through Zyte\n`);
    const res = await fetch("https://api.zyte.com/v1/extract", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Basic ${Buffer.from(`${process.env.ZYTE_TOKEN}:`).toString("base64")}`,
      },
      body: JSON.stringify({ url, httpResponseBody: true }),
    });
    if (!res.ok) throw new Error(`Zyte HTTP ${res.status} for ${url}`);
    const json = await res.json();
    if (!json.httpResponseBody) throw new Error(`Zyte returned no body for ${url}`);
    writeFileSync(part, Buffer.from(json.httpResponseBody, "base64"));
    if (!ok(part)) { rmSync(part, { force: true }); throw new Error(`Zyte body for ${url} is not the expected file`); }
    renameSync(part, dest);
    process.stderr.write(`  fetched ${name} via Zyte  (${(statSync(dest).size / 1e6).toFixed(1)} MB)\n`);
    return dest;
  }
}

// ------------------------------------------------------------- xlsx, no deps
//
// An .xlsx is a zip of XML. `unzip -p` streams one entry out of it, which is
// what makes the 220 MB NDCP worksheet readable in bounded memory (the same
// tool scripts/build-reach.mjs uses on the PUMS zips). Only three things are
// needed from the format: the shared-string table, the cell values of a row,
// and the fact that a raw "</row>" can only ever be a tag — XML escapes it
// anywhere else — so it is a safe record separator.

const entry = (file, path, maxBuffer = 1 << 29) => {
  const r = spawnSync("unzip", ["-p", file, path], { encoding: "utf8", maxBuffer });
  if (r.status !== 0) throw new Error(`cannot read ${path} from ${file}: ${r.stderr}`);
  return r.stdout;
};

const unescapeXml = (s) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'")
   .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d))).replace(/&amp;/g, "&");

function sharedStrings(file) {
  const xml = entry(file, "xl/sharedStrings.xml");
  return [...xml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((si) =>
    unescapeXml([...si[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join("")),
  );
}

// Attributes are lazy up to either "/>" (empty cell) or ">" + body + "</c>".
const CELL = /<c\s+([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;

/** One worksheet row -> { [columnLetter]: string }, restricted to `want`. */
function cells(row, strings, want) {
  const out = {};
  for (const m of row.matchAll(CELL)) {
    const col = /r="([A-Z]+)\d+"/.exec(m[1])?.[1];
    if (!col || (want && !want.has(col))) continue;
    const body = m[2];
    if (body === undefined) { out[col] = ""; continue; }
    const type = /t="([^"]+)"/.exec(m[1])?.[1];
    if (type === "inlineStr") {
      out[col] = unescapeXml([...body.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join(""));
      continue;
    }
    const v = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1] ?? "";
    out[col] = type === "s" ? strings[Number(v)] : unescapeXml(v);
  }
  return out;
}

/** Streams a worksheet row by row. `onHeader` receives row 1 and returns the columns to keep. */
async function streamSheet(file, sheet, strings, onHeader, onRow) {
  const child = spawn("unzip", ["-p", file, sheet], { stdio: ["ignore", "pipe", "inherit"] });
  const closed = new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`unzip -p ${sheet} exited ${code}`))));
  });
  child.stdout.setEncoding("utf8");
  let buf = "";
  let want = null;
  for await (const chunk of child.stdout) {
    buf += chunk;
    let i;
    while ((i = buf.indexOf("</row>")) >= 0) {
      const row = buf.slice(0, i);
      buf = buf.slice(i + "</row>".length);
      if (want === null) want = onHeader(cells(row, strings, null));
      else onRow(cells(row, strings, want));
    }
  }
  await closed;
  if (want === null) throw new Error(`${sheet} has no rows`);
}

/** The column letters a header row assigns to `names`; throws if one is missing. */
function columnsFor(header, names) {
  const byName = Object.fromEntries(Object.entries(header).map(([col, name]) => [name, col]));
  const out = {};
  for (const name of names) {
    if (!byName[name]) throw new Error(`the workbook has no "${name}" column (found: ${Object.values(header).join(", ")})`);
    out[name] = byName[name];
  }
  return out;
}

// ------------------------------------------------------------------ the data

/** Most populous county (or county equivalent) per state, Vintage 2024. */
function mostPopulousCounties(csvPath) {
  const lines = readFileSync(csvPath, "utf8").split("\n");
  const header = lines[0].trim().split(",");
  const idx = {};
  for (const name of ["SUMLEV", "STATE", "COUNTY", "CTYNAME", "POPESTIMATE2024"]) {
    idx[name] = header.indexOf(name);
    if (idx[name] < 0) throw new Error(`the Census file has no ${name} column`);
  }
  const best = {};
  for (let i = 1; i < lines.length; i++) {
    const f = lines[i].trim().split(",");
    if (f[idx.SUMLEV] !== "050") continue; // 050 = county; 040 = state totals
    const state = FIPS_TO_USPS[f[idx.STATE]];
    if (!state) continue; // PR and the other territories are not modeled
    const pop = Number(f[idx.POPESTIMATE2024]);
    if (!Number.isFinite(pop)) throw new Error(`${f[idx.STATE]}${f[idx.COUNTY]}: unreadable POPESTIMATE2024`);
    if (!best[state] || pop > best[state].pop) best[state] = { fips: f[idx.STATE] + f[idx.COUNTY], name: f[idx.CTYNAME], pop };
  }
  const missing = STATE_CODES.filter((s) => !best[s]);
  if (missing.length) throw new Error(`no county found for ${missing.join(", ")}`);
  return best;
}

/** county FIPS -> the FMR rows covering it (one per county, or one per town in New England). */
function fairMarketRents(xlsxPath) {
  const strings = sharedStrings(xlsxPath);
  const sheet = entry(xlsxPath, "xl/worksheets/sheet1.xml");
  const rows = [...sheet.matchAll(/<row [\s\S]*?<\/row>/g)].map((m) => m[0]);
  const col = columnsFor(cells(rows[0], strings, null), ["fips", "county_town_name", "countyname", "pop2023", "fmr_2"]);
  const byCounty = new Map();
  for (const row of rows.slice(1)) {
    const c = cells(row, strings, new Set(Object.values(col)));
    // HUD's `fips` is state(2) + county(3) + county subdivision(5).
    const county = (c[col.fips] ?? "").slice(0, 5);
    if (!/^\d{5}$/.test(county)) continue;
    if (!byCounty.has(county)) byCounty.set(county, []);
    byCounty.get(county).push({
      name: c[col.county_town_name] || c[col.countyname],
      pop: Number(c[col.pop2023]) || 0,
      fmr2: Number(c[col.fmr_2]),
    });
  }
  return byCounty;
}

/**
 * The FMR for one county. In the six New England states HUD publishes FMRs by
 * town, and a county can span two or three FMR areas, so those counties take
 * the population-weighted mean of their town rows using HUD's own pop2023.
 * Everywhere else a county is a single row and the weighting is a no-op.
 */
function countyRent(rows, fips) {
  if (!rows?.length) throw new Error(`HUD publishes no FY2026 FMR for county ${fips}`);
  for (const r of rows) if (!Number.isFinite(r.fmr2) || r.fmr2 <= 0) throw new Error(`${fips}: unreadable fmr_2 for ${r.name}`);
  if (rows.length === 1) return Math.round(rows[0].fmr2);
  const pop = rows.reduce((s, r) => s + r.pop, 0);
  if (pop <= 0) throw new Error(`${fips}: ${rows.length} town rows but no pop2023 to weight them by`);
  return Math.round(rows.reduce((s, r) => s + r.fmr2 * r.pop, 0) / pop);
}

// The four center-based age bands the NDCP publishes, as HotGap names them.
// The NDCP's own bands (2024 technical report, p. 6): infant 0–11 months (or
// 0–23 where a state has no "pretoddler"), toddler 24–35, pre-kindergarten
// 36–60 and not yet in school, school age 61 months and up — the school-age
// price being the full-time weekly rate for a child who is in school, i.e.
// the wraparound care a working parent buys.
const AGE_BANDS = { infant: "MCInfant", toddler: "MCToddler", preschool: "MCPreschool", schoolAge: "MCSA" };

/**
 * For each age band, county FIPS -> { year, weekly } at that county's most
 * recent study year with a price for that band, plus `firstYear`/`lastYear`,
 * the oldest and newest study years anywhere in the file. A county's latest
 * year equals `lastYear` exactly when it has a price in that year, which is
 * what makes the last cross-section readable off these maps.
 */
async function childcarePrices(xlsxPath) {
  const strings = sharedStrings(xlsxPath);
  const latest = Object.fromEntries(Object.keys(AGE_BANDS).map((band) => [band, new Map()]));
  let firstYear = Infinity;
  let lastYear = 0;
  let col = {};
  await streamSheet(xlsxPath, "xl/worksheets/sheet1.xml", strings, (header) => {
    col = columnsFor(header, ["County_FIPS_Code", "StudyYear", ...Object.values(AGE_BANDS)]);
    return new Set(Object.values(col));
  }, (c) => {
    const fips = String(c[col.County_FIPS_Code]).padStart(5, "0");
    if (!/^\d{5}$/.test(fips)) return;
    const year = Number(c[col.StudyYear]);
    for (const [band, column] of Object.entries(AGE_BANDS)) {
      const weekly = Number(c[col[column]]);
      if (!(weekly > 0)) continue; // blank: that county published no center-based price for this band that year
      if (year > lastYear) lastYear = year;
      if (year < firstYear) firstYear = year;
      const prior = latest[band].get(fips);
      if (!prior || year > prior.year) latest[band].set(fips, { year, weekly });
    }
  });
  if (!latest.preschool.size) throw new Error("the NDCP workbook yielded no MCPreschool prices at all");
  return { latest, firstYear, lastYear };
}

// --------------------------------------------------- study year -> 2026 dollars

const ECI_SERIES = "CIU2020000000000I"; // ECI, wages and salaries, private industry workers, index NSA

// Quarterly values fetched from api.bls.gov on 2026-09-15, kept so an offline
// or rate-limited run still produces a sourced factor rather than a guess.
const ECI_FALLBACK = {
  "2008-1": 107.6, "2008-2": 108.4, "2008-3": 109.1, "2008-4": 109.4,
  "2009-1": 109.8, "2009-2": 110.1, "2009-3": 110.6, "2009-4": 110.8,
  "2010-1": 111.4, "2010-2": 111.9, "2010-3": 112.4, "2010-4": 112.8,
  "2011-1": 113.2, "2011-2": 113.8, "2011-3": 114.3, "2011-4": 114.6,
  "2012-1": 115.3, "2012-2": 115.9, "2012-3": 116.4, "2012-4": 116.6,
  "2013-1": 117.3, "2013-2": 118.1, "2013-3": 118.5, "2013-4": 119.0,
  "2014-1": 119.3, "2014-2": 120.3, "2014-3": 121.2, "2014-4": 121.6,
  "2015-1": 122.6, "2015-2": 122.9, "2015-3": 123.7, "2015-4": 124.2,
  "2016-1": 125.1, "2016-2": 126.1, "2016-3": 126.7, "2016-4": 127.1,
  "2017-1": 128.3, "2017-2": 129.1, "2017-3": 130.0, "2017-4": 130.6,
  "2018-1": 132.0, "2018-2": 132.9, "2018-3": 134.0, "2018-4": 134.7,
  "2019-1": 135.9, "2019-2": 136.9, "2019-3": 138.0, "2019-4": 138.7,
  "2020-1": 140.4, "2020-2": 140.9, "2020-3": 141.7, "2020-4": 142.6,
  "2021-1": 144.6, "2021-2": 145.9, "2021-3": 148.2, "2021-4": 149.7,
  "2022-1": 151.8, "2022-2": 154.2, "2022-3": 155.9, "2022-4": 157.4,
  "2023-1": 159.5, "2023-2": 161.3, "2023-3": 162.9, "2023-4": 164.1,
  "2024-1": 166.3, "2024-2": 167.9, "2024-3": 169.1, "2024-4": 170.2,
  "2025-1": 171.9, "2025-2": 173.849, "2025-3": 175.109, "2025-4": 175.885,
  "2026-1": 177.672, "2026-2": 179.304,
};

/**
 * The NDCP's study years run 2008–2018, so this needs the whole series, not
 * the three years api.bls.gov returns by default. startyear/endyear are only
 * honoured on the collection endpoint (.../timeseries/data/); posted to the
 * single-series endpoint (.../timeseries/data/SERIESID) they are ignored and
 * the default window comes back. Unregistered callers get 10 years a request,
 * hence two windows.
 */
async function fetchEci() {
  const values = {};
  try {
    for (const [startyear, endyear] of [["2008", "2017"], ["2018", "2026"]]) {
      const res = await fetch(SOURCE.eci, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seriesid: [ECI_SERIES], startyear, endyear }),
      });
      const json = await res.json();
      if (json.status !== "REQUEST_SUCCEEDED") throw new Error(`${json.status} ${(json.message || []).join("; ")}`);
      for (const d of json.Results.series[0].data) {
        const q = /^Q0([1-4])$/.exec(d.period);
        if (q) values[`${d.year}-${q[1]}`] = Number(d.value);
      }
    }
    if (Object.keys(values).length < 40) throw new Error("too few quarters returned");
    return { values, live: true };
  } catch (err) {
    process.stderr.write(`  BLS unavailable: ${err.message} — using the values compiled into this script\n`);
    return { values: ECI_FALLBACK, live: false };
  }
}

/**
 * Calendar-year average of the four quarterly index values, study year ->
 * CY2026. Quarters 2026 has not published yet are extrapolated from the same
 * quarter of 2025 at the latest published 12-month rate, which is how BLS
 * itself frames the series' headline number — the same arithmetic
 * scripts/build-reach.mjs uses to carry the reach ladders to 2026 dollars.
 */
function eciFactors(eci) {
  const v = eci.values;
  const cyAverage = (year) => {
    const qs = [1, 2, 3, 4].map((q) => v[`${year}-${q}`]);
    if (qs.some((x) => x === undefined)) throw new Error(`ECI: CY${year} is incomplete`);
    return qs.reduce((s, x) => s + x, 0) / 4;
  };

  let latest = null;
  for (const y of [2026, 2025]) for (const q of [4, 3, 2, 1]) if (latest === null && v[`${y}-${q}`] !== undefined) latest = { y, q };
  const prior = v[`${latest.y - 1}-${latest.q}`];
  if (prior === undefined) throw new Error("ECI: no year-earlier quarter for the 12-month rate");
  const yoy = v[`${latest.y}-${latest.q}`] / prior;

  const target = [1, 2, 3, 4].map((q) => {
    const actual = v[`2026-${q}`];
    return actual !== undefined ? { q, value: actual, projected: false } : { q, value: v[`2025-${q}`] * yoy, projected: true };
  });
  const to = target.reduce((s, t) => s + t.value, 0) / 4;

  process.stderr.write(
    `ECI ${ECI_SERIES} (${eci.live ? "live, api.bls.gov v2" : "offline fallback, fetched 2026-09-15"})\n` +
    `  latest published: ${latest.y}Q${latest.q} = ${v[`${latest.y}-${latest.q}`]} vs ${latest.y - 1}Q${latest.q} = ${prior} -> 12-month rate ${((yoy - 1) * 100).toFixed(3)}%\n` +
    `  CY2026: ${target.map((t) => `${t.value.toFixed(3)}${t.projected ? "*" : ""}`).join(" / ")} -> avg ${to.toFixed(3)}   (* projected at the 12-month rate)\n`,
  );

  return {
    factor: (year) => to / cyAverage(year),
    meta: {
      series: ECI_SERIES,
      source: SOURCE.eci,
      live: eci.live,
      to: { period: "CY2026", index: Number(to.toFixed(3)), projectedQuarters: target.filter((t) => t.projected).map((t) => `2026Q${t.q}`) },
      twelveMonthRate: Number(((yoy - 1) * 100).toFixed(3)),
      method:
        "BLS Employment Cost Index, wages and salaries, private industry workers (index, not seasonally adjusted). " +
        "Calendar-year average of the four quarterly index values, NDCP study year -> CY2026; quarters not yet published are " +
        `extrapolated from the same quarter of the prior year at the latest published 12-month rate (${((yoy - 1) * 100).toFixed(3)}%). ` +
        (eci.live
          ? `Fetched live from ${SOURCE.eci}.`
          : `${SOURCE.eci} did not serve the series on this run (it caps unregistered callers at 25 requests a day), so the quarterly values fetched from it on 2026-09-15 and compiled into scripts/build-state-defaults.mjs were used instead. crossCheck is what tests them: it is computed here and compared against a factor another builder derived from a live fetch.`),
    },
  };
}

// ---------------------------------------------------------------- statistics

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const n = s.length;
  if (n === 0) return null;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
};

/**
 * The median of a pool of priced counties, together with the one or two
 * counties that actually produced it — so the study year reported against a
 * median is the year the money came from, not a median of years.
 */
function medianCounty(pool) {
  const s = [...pool].sort((a, b) => a.price - b.price);
  const n = s.length;
  if (n === 0) return null;
  const middle = n % 2 ? [s[(n - 1) / 2]] : [s[n / 2 - 1], s[n / 2]];
  return { price: middle.reduce((sum, c) => sum + c.price, 0) / middle.length, years: [...new Set(middle.map((c) => c.year))].sort() };
}

/** A weekly full-time price in study-year dollars -> a monthly price in 2026 dollars. */
const monthly2026 = (weekly, year, factor) => (weekly * 52) / 12 * factor(year);

const usd = (v) => `$${Math.round(v).toLocaleString("en-US")}`;

// ---------------------------------------------------------------------- main

const argv = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
const outPath = argv.out ? new URL(argv.out, `file://${process.cwd()}/`) : new URL("../core/data/state-defaults.json", import.meta.url);
const started = Date.now();

const { factor, meta: eciMeta } = eciFactors(await fetchEci());

// A cross-check, not an input. scripts/build-reach.mjs runs this same
// arithmetic to CY2024 to carry the reach ladders into 2026 dollars, off a
// different fetch (it takes api.bls.gov's default three-year window, this one
// asks for eighteen years in two). Two builders, one number — so a drift in
// either shows up here, in a committed diff, rather than silently.
const reachPath = new URL("../core/data/reach.json", import.meta.url);
const ourCy2024 = Number(factor(2024).toFixed(6));
const reachFactor = existsSync(reachPath) ? JSON.parse(readFileSync(reachPath, "utf8")).growth?.factor : undefined;
eciMeta.crossCheck =
  `CY2024 -> CY2026 on this same arithmetic is ${ourCy2024}` +
  (reachFactor === undefined ? "; core/data/reach.json was not there to compare against."
    : reachFactor === ourCy2024 ? ", the factor core/data/reach.json applies to the reach ladders."
    : `, but core/data/reach.json applies ${reachFactor} to the reach ladders. They disagree, so one of the two was built against a different ECI vintage.`);
process.stderr.write(`  cross-check: ${eciMeta.crossCheck}\n`);

process.stderr.write(`downloads (cache: ${CACHE})\n`);
const [popCsv, fmrXlsx, ndcpXlsx] = [
  await download(SOURCE.countyPop, "co-est2024-alldata.csv"),
  await download(SOURCE.fmr, "FY26_FMRs_revised.xlsx", { zipped: true }),
  await download(SOURCE.ndcp, "ndcp.xlsx", { zipped: true }),
];

const counties = mostPopulousCounties(popCsv);
const rentRows = fairMarketRents(fmrXlsx);
const { latest: bands, firstYear, lastYear } = await childcarePrices(ndcpXlsx);
const preschool = bands.preschool;

// Every county's own most recent price for each band, in 2026 dollars,
// grouped by state — the pool both fallbacks draw on.
const byState = {};
const national = {};
for (const [band, latest] of Object.entries(bands)) {
  byState[band] = {};
  national[band] = [];
  for (const [fips, { year, weekly }] of latest) {
    const state = FIPS_TO_USPS[fips.slice(0, 2)];
    const price = monthly2026(weekly, year, factor);
    if (state) (byState[band][state] ??= []).push({ fips, year, price });
    if (year === lastYear) national[band].push(price);
  }
}
const nationalMedian = Object.fromEntries(Object.entries(national).map(([band, prices]) => [band, median(prices)]));
const BAND_KEY = { infant: "monthlyChildcareInfant", toddler: "monthlyChildcareToddler", preschool: "monthlyChildcarePreschool", schoolAge: "monthlyChildcareSchoolAge" };

const states = {};
const basis = {};
const yearsUsed = new Set();
for (const state of [...STATE_CODES].sort()) {
  const { fips } = counties[state];
  states[state] = { countyFips: fips, monthlyRent: countyRent(rentRows.get(fips), fips) };
  basis[state] = {};
  for (const band of Object.keys(AGE_BANDS)) {
    // The county's own price first: it is the household the row describes.
    // Then the state's median county, then the national median — each a wider
    // circle around the same household, never a different one if we can help it.
    const own = bands[band].get(fips);
    const middle = medianCounty(byState[band][state] ?? []);
    let rule, years, price;
    if (own) [rule, years, price] = ["county", [own.year], monthly2026(own.weekly, own.year, factor)];
    else if (middle) [rule, years, price] = ["stateMedianCounty", middle.years, middle.price];
    else [rule, years, price] = ["nationalMedian", [lastYear], nationalMedian[band]];
    for (const y of years) yearsUsed.add(y);
    states[state][BAND_KEY[band]] = Math.round(price);
    basis[state][band] = `${rule} ${years.join("/")}`;
  }
}

// Rule counts and the state lists in the notes describe the preschool band,
// the one every earlier build carried; the other bands' rules are in byState.
const ruleCounts = {};
const statesOn = (rule) => Object.keys(basis).filter((s) => basis[s].preschool.startsWith(`${rule} `));
for (const b of Object.values(basis)) ruleCounts[b.preschool.split(" ")[0]] = (ruleCounts[b.preschool.split(" ")[0]] ?? 0) + 1;
const bandCounts = Object.fromEntries(Object.keys(AGE_BANDS).map((band) => [band, Object.values(basis).reduce((acc, b) => ({ ...acc, [b[band].split(" ")[0]]: (acc[b[band].split(" ")[0]] ?? 0) + 1 }), {})]));
const factors = Object.fromEntries([...yearsUsed].sort().map((y) => [String(y), Number(factor(y).toFixed(6))]));

// New England is the only place a county is not one FMR row. Describe what the
// weighting actually did rather than asserting it from memory.
const spanning = Object.entries(states)
  .map(([state, { countyFips }]) => ({ state, countyFips, rows: rentRows.get(countyFips), rent: states[state].monthlyRent }))
  .filter((c) => c.rows.length > 1);
const varied = spanning.filter((c) => new Set(c.rows.map((r) => r.fmr2)).size > 1);
const flat = spanning.filter((c) => new Set(c.rows.map((r) => r.fmr2)).size === 1);

const body = {
  sources: {
    countyFips: {
      what: "Most populous county (or county equivalent) in each state; DC is the District itself.",
      publisher: "U.S. Census Bureau, Vintage 2024 county population estimates (CO-EST2024-ALLDATA), POPESTIMATE2024, SUMLEV 050.",
      url: SOURCE.countyPop,
      index: SOURCE.countyPopIndex,
      vintage: "Vintage 2024 (July 1, 2024 estimates)",
      note: `Connecticut is reported on the nine planning regions that replaced its counties in 2022; ${counties.CT.fips} is the ${counties.CT.name}.`,
    },
    monthlyRent: {
      what: "Two-bedroom Fair Market Rent for that county, in whole dollars per month.",
      // publisher and vintage are printed verbatim in every SourceNote
      // (summary.json coverage[state].vintages.rent), so they are the
      // reader's words; the file and column read are in the note (S9).
      publisher: "HUD Office of Policy Development and Research, Fair Market Rents",
      url: SOURCE.fmr,
      index: SOURCE.fmrIndex,
      vintage: "FY2026 revised schedule (effective 2025-10-01)",
      note:
        "The revised schedule supersedes HUD's first FY2026 file (FY26_FMRs.xlsx); the column read is the two-bedroom rent, fmr_2. " +
        "In the six New England states HUD publishes FMRs by town, not by county, and a county can span two or three FMR areas. " +
        "Those counties take the population-weighted mean of their town rows using HUD's own pop2023 column, rounded to the dollar: " +
        varied.map((c) => `${c.state} ${c.countyFips} (${[...new Set(c.rows.map((r) => r.fmr2))].sort((a, b) => a - b).map(usd).join("/")} across ${c.rows.length} town rows -> ${c.rent})`).join(", ") +
        `. ${flat.map((c) => `${c.state} ${c.countyFips}`).join(", ")} are single-valued across their town rows. Every other state's county is one row.`,
      access: "huduser.gov answers a plain request with an empty HTTP 202 bot challenge; scripts/build-state-defaults.mjs fetches this file through a proxy.",
    },
    monthlyChildcare: {
      what: "Price of center-based care in that same county, in whole 2026 dollars per month, for each of the NDCP's age bands: monthlyChildcareInfant (0-23 months), monthlyChildcareToddler (24-35), monthlyChildcarePreschool (36-60, not yet in school) and monthlyChildcareSchoolAge (in school; the full-time weekly rate for a school-age child, i.e. wraparound care). NDCP Technical Report, September 2024, p. 6.",
      publisher: "U.S. Department of Labor, Women's Bureau, National Database of Childcare Prices (NDCP), variables MCInfant, MCToddler, MCPreschool, MCSA (median weekly full-time price).",
      url: SOURCE.ndcp,
      index: SOURCE.ndcpIndex,
      vintage: `NDCP study years ${firstYear}-${lastYear}; each state's county contributes its own most recent year with a price. See childcareBasis for which year that is, state by state.`,
      arithmetic: "weekly price x 52 / 12 = monthly, then x the BLS Employment Cost Index factor from that study year to CY2026 (see eci), rounded to the dollar.",
      fallback:
        "The county's own price where it has one. Where it does not, the median across the state's counties (each at its own most recent year); where the state has no center-based price in any year, the median of the " +
        `${lastYear} cross-section (preschool: ${national.preschool.length.toLocaleString("en-US")} counties, ${usd(nationalMedian.preschool)}/month). ` +
        (statesOn("stateMedianCounty").length
          ? `On the state-median rule: ${statesOn("stateMedianCounty").join(", ")}. ` +
            (basis.CT?.preschool.startsWith("stateMedianCounty") && preschool.has("09003")
              ? `The NDCP is built on the eight pre-2022 Connecticut counties, so the ${counties.CT.name} has no row of its own; Hartford County (09003), which that region largely replaces, ` +
                `is ${usd(monthly2026(preschool.get("09003").weekly, preschool.get("09003").year, factor))} on the same arithmetic against the ${usd(states.CT.monthlyChildcarePreschool)} the state median gives. `
              : "")
          : "") +
        (statesOn("nationalMedian").length
          ? `On the national-median rule, because the NDCP publishes no center-based price for them in any year: ${statesOn("nationalMedian").join(", ")}.`
          : ""),
      note:
        "DOL's derived 'Childcare Prices by Age of Children and Care Setting' table (Data-Table-2023.xlsx) was NOT used: for the states the NDCP leaves blank in " +
        `${lastYear} it carries the weekly price in an annual column, giving Denver County a $36,101/year preschool price and a $693,417/year home-based price.`,
    },
  },
  eci: { ...eciMeta, factors },
  childcareBasis: {
    note:
      "Which rule produced each state's childcare price, band by band, and the NDCP study year behind it. " +
      "'county' is the most populous county's own MCPreschool — the household the row describes. " +
      "'stateMedianCounty' and 'nationalMedian' are the fallbacks, in that order; see sources.monthlyChildcare.fallback.",
    counts: ruleCounts,
    countsByBand: bandCounts,
    byState: basis,
  },
  states,
};

// Stamp the sweep that last CHANGED the numbers, matching reach.json's and
// summary.json's convention: an unchanged rebuild leaves the file, and this
// stamp, alone, so a re-run is not a diff.
const { read: priorStamp, ...priorBody } = existsSync(outPath) ? JSON.parse(readFileSync(outPath, "utf8")) : {};
const unchanged = priorStamp !== undefined && JSON.stringify(priorBody) === JSON.stringify(body);
writeFileSync(outPath, JSON.stringify({ read: unchanged ? priorStamp : new Date().toISOString().slice(0, 10), ...body }, null, 1));

const changed = Object.keys(states).filter((s) => JSON.stringify(priorBody.states?.[s]) !== JSON.stringify(states[s]));
for (const s of changed) {
  const was = priorBody.states?.[s] ?? {};
  process.stderr.write(`  ${s}  ${["countyFips", "monthlyRent", ...Object.values(BAND_KEY)].filter((k) => was[k] !== states[s][k]).map((k) => `${k} ${was[k] ?? "-"} -> ${states[s][k]}`).join(", ")}\n`);
}
console.log(
  `wrote ${outPath.pathname} — ${Object.keys(states).length} states, ${changed.length} rows changed, ` +
  `childcare rules ${Object.entries(ruleCounts).map(([r, n]) => `${r} ${n}`).join(" / ")}, in ${((Date.now() - started) / 1000).toFixed(1)}s`,
);
