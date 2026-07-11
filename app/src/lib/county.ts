// ZIP -> county FIPS, from a lazily-fetched crosswalk. County sharpens the
// live ACA rating-area premium; it is a progressive enhancement — until the
// table loads (or if the fetch fails) zipToCounty returns null and the caller
// falls back to state-only, which is identical to the pre-county behavior.
let table: Record<string, string> | null = null;
let inflight: Promise<void> | null = null;

export function zipToCounty(zip: string): string | null {
  if (!table || !/^\d{5}$/.test(zip)) return null;
  return table[zip] ?? null;
}

export function ensureCountyTable(fetchImpl: typeof fetch = fetch): Promise<void> {
  if (table) return Promise.resolve();
  if (inflight) return inflight;
  inflight = fetchImpl("/data/zip5-county.json")
    .then((r) => (r.ok ? r.json() : {}))
    .then((json) => { table = json as Record<string, string>; })
    .catch(() => { table = {}; }); // fail closed: county unavailable, never throw
  return inflight;
}

export function __resetCountyTableForTests(): void {
  table = null;
  inflight = null;
}
