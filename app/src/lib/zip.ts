import table from "../data/zip3-state.json";
import { STATE_NAMES } from "./states.js";

const VALID_STATES = new Set(Object.keys(STATE_NAMES));

// ZIP3 prefixes used by US territories (Puerto Rico, the Virgin Islands, and
// the Pacific-associated territories/Guam). The generated zip3->state table
// can contain non-state values for these (e.g. "969": "MH"), which is not one
// of the 51 codes this app supports. Kept separate from VALID_STATES so
// ZipScreen can tell "we don't serve this area" apart from "unrecognized ZIP".
const TERRITORY_PREFIXES = new Set(["006", "007", "008", "009", "969"]);

export function zipToState(zip: string): string | null {
  if (!/^\d{5}$/.test(zip)) return null;
  const state = (table as Record<string, string>)[zip.slice(0, 3)];
  return state !== undefined && VALID_STATES.has(state) ? state : null;
}

export function isTerritoryZip(zip: string): boolean {
  return /^\d{5}$/.test(zip) && TERRITORY_PREFIXES.has(zip.slice(0, 3));
}
