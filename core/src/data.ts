// Committed data files under data/, read lazily from disk and memoized.
//
//   summary.json        weekly sweep: per state × archetype cliff metrics
//   states/{ST}.json    weekly sweep: the full 101-point curve per archetype
//   reach.json          ACS PUMS household-earnings percentile ladders
//   zip3-state.json     ZIP prefix → state (GeoNames)
//   zip5-county.json    ZIP → county FIPS (Census ZCTA relationship file)
import { existsSync, readFileSync } from "node:fs";
import type { CurvePoint } from "./types.js";

export interface StateMetrics {
  biggestLoss: number;
  dangerWidth: number;
  cliffCount: number;
  safeExit: number | null;
  leap: number;
  // True when the widest danger zone runs past the sweep's axis, so `leap`
  // is a floor, not a measurement — rank such cells with care.
  leapIsLowerBound: boolean;
}

export interface SummaryJson {
  // ISO timestamp of the sweep that last CHANGED this file's numbers (an
  // unchanged re-sweep leaves the file, and this stamp, alone).
  generated: string;
  year: string;
  archetypes: { id: string; married: boolean; childAges: number[] }[];
  states: Record<string, Record<string, StateMetrics>>;
}

export interface StateFileJson {
  generated: string;
  year: string;
  state: string;
  archetypes: Record<string, { points: CurvePoint[] }>;
}

const DATA_DIR = new URL("../data/", import.meta.url);

const cache = new Map<string, unknown>();

/** Parse `data/<relPath>` once; null when the file does not exist or the path escapes data/. */
export function readData<T>(relPath: string): T | null {
  if (!cache.has(relPath)) {
    const url = new URL(relPath, DATA_DIR);
    const inside = url.href.startsWith(DATA_DIR.href);
    cache.set(relPath, inside && existsSync(url) ? (JSON.parse(readFileSync(url, "utf8")) as T) : null);
  }
  return cache.get(relPath) as T | null;
}

export function loadSummary(): SummaryJson {
  const summary = readData<SummaryJson>("summary.json");
  if (!summary) throw new Error("data/summary.json is missing — run `npm run pipeline`");
  return summary;
}

export function loadStateFile(state: string): StateFileJson | null {
  return /^[A-Z]{2}$/.test(state) ? readData<StateFileJson>(`states/${state}.json`) : null;
}
