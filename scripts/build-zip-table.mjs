// Regenerates core/data/zip3-state.json from GeoNames (CC BY 4.0).
// Usage: node scripts/build-zip-table.mjs
import { writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
// The one state list (plain node strips the types; Node 22.18+).
import { STATE_CODES } from "../core/src/states.ts";
import { fetchToFile } from "./lib/builder.mjs";

// The 51 codes this app supports (50 states + DC). GeoNames' US export
// includes territory rows (e.g. Guam ZIPs tagged "MH", the Marshall Islands
// compact-of-free-association code) that are not among them; without this
// filter those rows can win a zip3 prefix's plurality vote and produce a
// table entry the app can't resolve to a real state (see core/src/zip.ts's
// runtime guard, which is the actual defense-in-depth — this filter just
// keeps the committed table honest at the source).
const VALID_STATES = new Set(STATE_CODES);

const url = "https://download.geonames.org/export/zip/US.zip";
const zip = join(tmpdir(), "geonames-us.zip");
await fetchToFile(url, zip);
const listing = spawnSync("unzip", ["-p", zip, "US.txt"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
if (listing.status !== 0) throw new Error(`cannot read US.txt from ${zip}: ${listing.stderr}`);
const rows = listing.stdout
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
writeFileSync(new URL("../core/data/zip3-state.json", import.meta.url), JSON.stringify(table));
console.log(`wrote ${Object.keys(table).length} prefixes`);
