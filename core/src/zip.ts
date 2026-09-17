import { zipToCounty } from "./county.js";
import { readData } from "./data.js";
import { coded, type Coded, type MessageCode, type MessageParams } from "./messages.js";
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

export interface PlaceInput {
  zip?: string;
  state?: string;
  countyFips?: string | null;
}

export type Place = { ok: true; state: string | undefined; countyFips: string | null } | { ok: false; detail: string; message: Coded };

const refuse = (code: MessageCode, params?: MessageParams): Place => { const { message, text } = coded(code, params); return { ok: false, detail: text, message }; };

/**
 * A ZIP resolved to the state and county every caller sends PolicyEngine —
 * the one rule for the CLI's `--zip`, an API body's `zip` and a page's ZIP
 * field. A given state must agree with the ZIP's; a given county wins over
 * the ZIP's. Without a ZIP the state and county pass through untouched, and
 * validateAnswers judges them.
 */
export function resolvePlace({ zip, state, countyFips }: PlaceInput): Place {
  if (zip === undefined) return { ok: true, state, countyFips: countyFips ?? null };
  if (isTerritoryZip(zip)) return refuse("place.territory");
  const zipState = zipToState(zip);
  if (zipState === null) return refuse("place.noState", { zip });
  if (state !== undefined && state !== zipState) return refuse("place.stateMismatch", { zip, zipState, state });
  return { ok: true, state: zipState, countyFips: countyFips ?? zipToCounty(zip, zipState) };
}
