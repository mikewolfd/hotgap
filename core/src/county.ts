// ZIP -> county FIPS from the committed Census ZCTA→county crosswalk
// (data/zip5-county.json, built by scripts/build-zip-county.mjs). County
// sharpens PolicyEngine's ACA rating-area premium; null means "state only",
// which is exactly the pre-county behavior. County FIPS -> name is the
// companion table (data/county-names.json, scripts/build-county-names.mjs,
// the 2020 gazetteer — the crosswalk's own county vintage).
import { readData } from "./data.js";
import { FIPS_TO_USPS } from "./states.js";

/**
 * County FIPS for a 5-digit ZIP, or null. When `state` is given, a county
 * whose FIPS prefix says it lies in a different state is dropped: a few
 * border ZCTAs straddle a state line, and the ZIP's own state must win.
 */
export function zipToCounty(zip: string, state?: string): string | null {
  if (!/^\d{5}$/.test(zip)) return null;
  const county = readData<Record<string, string>>("zip5-county.json")?.[zip] ?? null;
  if (county === null) return null;
  return state === undefined || FIPS_TO_USPS[county.slice(0, 2)] === state ? county : null;
}

/** The county's name as the Census gazetteer gives it ("El Paso County", "Orleans Parish"), or null when the table has none. */
export function countyName(fips: string): string | null {
  return readData<Record<string, string>>("county-names.json")?.[fips] ?? null;
}
