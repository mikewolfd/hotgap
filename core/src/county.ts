// ZIP -> county FIPS from the committed Census ZCTA→county crosswalk
// (data/zip5-county.json, built by scripts/build-zip-county.mjs). County
// sharpens PolicyEngine's ACA rating-area premium; null means "state only",
// which is exactly the pre-county behavior.
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
