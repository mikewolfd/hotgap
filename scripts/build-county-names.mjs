// Builds core/data/county-names.json: county FIPS -> the county's name as the
// Census gives it ("El Paso County", "Orleans Parish", "Juneau City and
// Borough"). Source: U.S. Census Bureau 2020 Gazetteer, counties file (public
// domain, no API key) — the same 2020 county vintage as zip5-county.json's
// ZCTA relationship file, so every county that crosswalk can name has a name
// here (the eight it lacks are territories HotGap does not model). Nothing but
// the name is kept: the page that shows "El Paso County" beside a ZIP needs
// nothing else, and the file stays at 80 KB.
// Usage: node scripts/build-county-names.mjs
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const SOURCE_URL = "https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2020_Gazetteer/2020_Gaz_counties_national.zip";

// funzip (Info-ZIP, shipped with macOS and every Linux `unzip`) unpacks the zip's one member from the pipe.
const raw = execSync(`curl -sSL "${SOURCE_URL}" --max-time 120 | funzip`, { maxBuffer: 16 * 1024 * 1024 }).toString("utf8");
const lines = raw.split("\n");
const header = lines[0].split("\t").map((s) => s.trim());
const iGeoid = header.indexOf("GEOID");
const iName = header.indexOf("NAME");
if (iGeoid < 0 || iName < 0) throw new Error("unexpected gazetteer columns");

const table = {};
for (let i = 1; i < lines.length; i++) {
  const c = lines[i].split("\t");
  const fips = c[iGeoid]?.trim();
  const name = c[iName]?.trim();
  if (/^\d{5}$/.test(fips ?? "") && name) table[fips] = name;
}

const sorted = Object.fromEntries(Object.entries(table).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(new URL("../core/data/county-names.json", import.meta.url), JSON.stringify(sorted));
console.log(`wrote county-names.json — ${Object.keys(sorted).length} counties`);
