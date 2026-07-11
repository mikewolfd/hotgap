// Regenerates app/src/data/zip3-state.json from GeoNames (CC BY 4.0).
// Usage: node scripts/build-zip-table.mjs
import { writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

// Must match the 51 keys of app/src/lib/states.ts's STATE_NAMES (50 states +
// DC). GeoNames' US export includes territory rows (e.g. Guam ZIPs tagged
// "MH", the Marshall Islands compact-of-free-association code) that are not
// among the 51 codes this app supports; without this filter those rows can
// win a zip3 prefix's plurality vote and produce a table entry the app can't
// resolve to a real state (see app/src/lib/zip.ts's runtime guard, which is
// the actual defense-in-depth — this filter just keeps the committed table
// honest at the source).
const VALID_STATES = new Set([
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI", "ID",
  "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO",
  "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA",
  "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
]);

const url = "https://download.geonames.org/export/zip/US.zip";
execSync(`curl -sSL ${url} -o /tmp/geonames-us.zip && cd /tmp && unzip -o geonames-us.zip US.txt`, { stdio: "inherit" });
const rows = execSync("cat /tmp/US.txt", { maxBuffer: 64 * 1024 * 1024 })
  .toString("utf8")
  .split("\n")
  .filter(Boolean)
  .map((line) => line.split("\t"))
  .map((cols) => ({ zip: cols[1], state: cols[4] }))
  .filter((r) => /^\d{5}$/.test(r.zip) && VALID_STATES.has(r.state));

const counts = new Map(); // zip3 -> {state: n}
for (const { zip, state } of rows) {
  const p = zip.slice(0, 3);
  if (!counts.has(p)) counts.set(p, {});
  counts.get(p)[state] = (counts.get(p)[state] ?? 0) + 1;
}
const table = {};
for (const [prefix, byState] of [...counts.entries()].sort()) {
  table[prefix] = Object.entries(byState).sort((a, b) => b[1] - a[1])[0][0];
}
writeFileSync(new URL("../app/src/data/zip3-state.json", import.meta.url), JSON.stringify(table));
console.log(`wrote ${Object.keys(table).length} prefixes`);
