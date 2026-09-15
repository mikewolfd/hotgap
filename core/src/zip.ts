import { readData } from "./data.js";
import { STATE_CODES } from "./states.js";

const VALID_STATES = new Set(STATE_CODES);

// ZIP3 prefixes used by US territories (Puerto Rico, the Virgin Islands, and
// the Pacific-associated territories/Guam). The generated zip3->state table
// can contain non-state values for these (e.g. "969": "MH"), which is not one
// of the 51 codes HotGap models. Kept separate from VALID_STATES so a caller
// can tell "not modeled here" apart from "unrecognized ZIP".
const TERRITORY_PREFIXES = new Set(["006", "007", "008", "009", "969"]);

const table = (): Record<string, string> => readData<Record<string, string>>("zip3-state.json") ?? {};

export function zipToState(zip: string): string | null {
  if (!/^\d{5}$/.test(zip)) return null;
  const state = table()[zip.slice(0, 3)];
  return state !== undefined && VALID_STATES.has(state) ? state : null;
}

export function isTerritoryZip(zip: string): boolean {
  return /^\d{5}$/.test(zip) && TERRITORY_PREFIXES.has(zip.slice(0, 3));
}
