// Builds app/public/data/zip5-county.json: 5-digit ZIP (ZCTA) -> dominant county FIPS.
// Source: U.S. Census Bureau 2020 ZCTA-to-county relationship file (public domain,
// no API key). For a ZCTA spanning multiple counties, the county with the largest
// land-area overlap (AREALAND_PART) wins — a good-enough proxy for a rating-area
// lookup. Note: ZCTAs approximate USPS ZIPs; dominance is by area, not population.
// Usage: node scripts/build-zip-county.mjs
import { writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const SOURCE_URL =
  "https://www2.census.gov/geo/docs/maps-data/data/rel2020/zcta520/tab20_zcta520_county20_natl.txt";

const raw = execSync(`curl -sSL "${SOURCE_URL}" --max-time 120`, { maxBuffer: 64 * 1024 * 1024 }).toString("utf8");
const lines = raw.split("\n");
const header = lines[0].replace(/^﻿/, "").split("|");
const iZcta = header.indexOf("GEOID_ZCTA5_20");
const iCounty = header.indexOf("GEOID_COUNTY_20");
const iArea = header.indexOf("AREALAND_PART");
if (iZcta < 0 || iCounty < 0 || iArea < 0) throw new Error("unexpected relationship-file columns");

// zcta -> { county, area } keeping the max-area county
const best = new Map();
for (let i = 1; i < lines.length; i++) {
  const c = lines[i].split("|");
  const zcta = c[iZcta];
  const county = c[iCounty];
  if (!/^\d{5}$/.test(zcta) || !/^\d{5}$/.test(county)) continue;
  const area = Number(c[iArea]) || 0;
  const prev = best.get(zcta);
  if (!prev || area > prev.area) best.set(zcta, { county, area });
}

const table = {};
for (const [zcta, { county }] of [...best.entries()].sort()) table[zcta] = county;

writeFileSync(new URL("../app/public/data/zip5-county.json", import.meta.url), JSON.stringify(table));
console.log(`wrote zip5-county.json — ${Object.keys(table).length} ZCTAs`);
