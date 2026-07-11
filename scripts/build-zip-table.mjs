// Regenerates app/src/data/zip3-state.json from GeoNames (CC BY 4.0).
// Usage: node scripts/build-zip-table.mjs
import { writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const url = "https://download.geonames.org/export/zip/US.zip";
execSync(`curl -sSL ${url} -o /tmp/geonames-us.zip && cd /tmp && unzip -o geonames-us.zip US.txt`, { stdio: "inherit" });
const rows = execSync("cat /tmp/US.txt", { maxBuffer: 64 * 1024 * 1024 })
  .toString("utf8")
  .split("\n")
  .filter(Boolean)
  .map((line) => line.split("\t"))
  .map((cols) => ({ zip: cols[1], state: cols[4] }))
  .filter((r) => /^\d{5}$/.test(r.zip) && /^[A-Z]{2}$/.test(r.state));

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
