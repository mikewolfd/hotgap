// Committed data files under data/, read lazily from disk and memoized.
//
//   summary.json        weekly sweep: per state × archetype cliff metrics
//   states/{ST}.json    weekly sweep: the full curve per archetype (151–231 points, see axisSpec)
//   reach.json          ACS PUMS household-earnings percentile ladders
//   zip3-state.json     ZIP prefix → state (GeoNames)
//   zip5-county.json    ZIP → county FIPS (Census ZCTA relationship file)
import { existsSync, readFileSync } from "node:fs";
import type { MaTafdcCorrection } from "./maTafdc.js";
import type { CurvePoint } from "./types.js";

export interface StateMetrics {
  maTafdc?: MaTafdcCorrection;
  biggestLoss: number;
  dangerWidth: number;
  cliffCount: number;
  // Cliffs whose loss is deferred to a future renewal (Head Start, children's
  // continuous eligibility, transitional Medicaid); not in cliffCount.
  deferredCliffCount: number;
  safeExit: number | null;
  leap: number;
  // True when the widest danger zone runs past the sweep's axis, so `leap`
  // is a floor, not a measurement — rank such cells with care.
  leapIsLowerBound: boolean;
}

export interface SummaryJson {
  /**
   * States where an archetype that PAYS for care — a single parent, or a
   * two-earner couple — received no child-care subsidy at any point on the
   * curve. An upstream gap, not a state whose rules are kinder, since a
   * working parent paying for care qualifies everywhere. Judged on those
   * archetypes alone: the single-earner married ones have a non-earning
   * spouse, and the subsidy's activity test requires every parent to work, so
   * their $0 is correct policy — and they are charged no bill either. Partial
   * coverage across household shapes still counts (Massachusetts pays a
   * household with an infant and nothing to one whose only child is a
   * preschooler). Detected per sweep rather than hand-listed, so a state
   * leaves the list the day the engine starts modeling it. A state comparison
   * must footnote these rather than read their missing cliff as good news.
   * See docs/upstream/2026-09-15-local-corrections.md.
   */
  childcareSubsidyUnmodeled?: string[];
  // ISO timestamp of the sweep that last CHANGED this file's numbers (an
  // unchanged re-sweep leaves the file, and this stamp, alone).
  generated: string;
  year: string;
  /** The PolicyEngine that produced these numbers; absent on files written before it was recorded. */
  model?: ModelRecord;
  archetypes: { id: string; married: boolean; childAges: number[] }[];
  states: Record<string, Record<string, StateMetrics>>;
  /** Per state, what a reader of its numbers has to know first (coverage.ts). Absent on files written before it was recorded. */
  coverage?: Record<string, StateCoverage>;
}

/**
 * Which model a sweep ran on. The self-hosted engine (engine/) names its
 * policyengine-us release; the public API does not expose one cheaply, so
 * `version` is null there and the endpoint host is the provenance.
 */
export interface ModelRecord {
  endpoint: string;
  version: string | null;
}

/**
 * What a reader of one state's numbers needs before comparing them with
 * another state's: which HotGap-side corrections apply there, what the map
 * cannot show, what the untracked `otherBenefits` remainder actually is, and
 * which data vintages the state's curves rest on. Derived by the pipeline
 * from the code that applies each correction and from the data files
 * themselves (coverage.ts), never hand-typed, so it cannot drift from what
 * the sweep did.
 */
export interface StateCoverage {
  corrections: StateCorrections;
  /** Programs the map cannot show for this state. Small on purpose: only what is known to exist and known to be missing. */
  unmodeled: UnmodeledProgram[];
  /** What the `otherBenefits` remainder is here; empty where it is $0 throughout the sweep. */
  otherBenefits: OtherBenefit[];
  vintages: StateVintages;
}

export interface StateCorrections {
  /** Parameter overrides sent with every curve in this state (policyOverrides.ts); empty where none apply. */
  policyOverrides: PolicyOverrideRecord[];
  /** Massachusetts only: the TAFDC grant recomputed locally and fed back to the engine (maTafdc.ts). */
  maTafdc: CorrectionNote;
  /** Where this state's own marketplace premium help comes from on this sweep. */
  premiumAssistance: CorrectionNote & { source: "modeled" | "ladder" | "none"; program: string | null };
  /** Whether PolicyEngine counts the CCDF subsidy in net income here, or HotGap adds it (stateChildcareSubsidies.ts). */
  childcareSubsidy: CorrectionNote & { source: "in net income" | "added by HotGap" };
  /** Whether the coverage-gap premium correction can fire here — non-expansion states only (evaluate.ts). */
  coverageGap: CorrectionNote;
}

export interface CorrectionNote {
  applies: boolean;
  note: string;
}

export interface PolicyOverrideRecord {
  parameter: string;
  period: string;
  /** The value sent, per archetype: the parent limit is a poverty-line fraction for the household's own size, so it varies. */
  values: Record<string, number | string[]>;
  source: string;
  note: string;
}

export interface UnmodeledProgram {
  program: string;
  note: string;
}

export interface OtherBenefit {
  /** The PolicyEngine variable the money was traced to (stateOtherBenefits.ts), or null when it has not been identified yet. */
  variable: string | null;
  label: string;
  /** The largest raw remainder on any of this state's swept curves — the whole remainder, shared when more than one variable is listed. */
  maxAnnualInSweep: number;
}

export interface StateVintages {
  model: ModelRecord | null;
  /** Read from state-defaults.json `sources`, never retyped. */
  rent: SourceVintage;
  county: SourceVintage;
  /** Rule and NDCP study year behind each child-care price band (state-defaults.json `childcareBasis.byState`). */
  childcare: Record<string, string>;
  /** reach.json: the earnings basis, the PUMS vintage(s) this state's cells came from, and the ECI growth factor to 2026. */
  reach: { basis: string; vintages: string[]; growthFactor: number };
}

export interface SourceVintage {
  publisher: string;
  vintage: string;
}

export interface StateFileJson {
  generated: string;
  year: string;
  state: string;
  model?: ModelRecord;
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
