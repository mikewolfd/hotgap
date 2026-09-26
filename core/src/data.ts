// Committed data files under data/, read lazily from disk and memoized — or
// provided by the environment where there is no disk (provideData, below).
//
//   summary.json        weekly sweep: per state × archetype cliff metrics
//   states/{ST}.json    weekly sweep: the full curve per archetype (151–231 points, see axisSpec)
//   reach.json          ACS PUMS household-earnings percentile ladders
//   zip3-state.json     ZIP prefix → state (GeoNames)
//   zip5-county.json    ZIP → county FIPS (Census ZCTA relationship file)
//   county-names.json   county FIPS → name (Census 2020 gazetteer)
import type { LiheapLimit, LiheapShape } from "./liheap.js";
import type { MaTafdcCorrection } from "./maTafdc.js";
import type { Coded } from "./messages.js";
import type { CurvePoint, ProgramId } from "./types.js";

export interface StateMetrics {
  maTafdc?: MaTafdcCorrection;
  biggestLoss: number;
  /**
   * Where `biggestLoss` happens: the worst step's starting earnings (the
   * step is `biggestLossAt` → `biggestLossAt` + the sweep's $1,000) and the
   * programs that step ends, in PROGRAM_IDS order — so a figure never travels
   * without its cause (places review B3). Null and empty when cliffCount is 0.
   */
  biggestLossAt: number | null;
  biggestLossPrograms: ProgramId[];
  dangerWidth: number;
  /** Every cliff on the curve, the deferred ones included (2026-09-17). */
  cliffCount: number;
  // Of cliffCount, those whose loss lands at a future renewal (Head Start,
  // children's continuous eligibility, transitional Medicaid).
  deferredCliffCount: number;
  safeExit: number | null;
  leap: number;
  // True when the widest danger zone runs past the sweep's axis, so `leap`
  // is a floor, not a measurement — rank such cells with care.
  leapIsLowerBound: boolean;
  /**
   * The top of the earnings axis this cell was swept to — the last point's
   * earnings (axisSpec: $150,000 for most households, more for a larger one
   * and in Alaska and Hawaii). A figure that "runs past the axis" runs past
   * this, and a no-cliff verdict holds up to it, so a surface can say the
   * dollar figure instead of "the axis" (places rerun S6, N9).
   */
  axisTop: number;
  /**
   * THE ROAD OUT OF POVERTY (Plan 9, road.ts). Every measure above is an
   * absolute dollar figure over the whole axis, so it names the tallest wall
   * wherever it stands — usually one few families reach. These six describe
   * the stretch from 100% to 200% of the federal poverty guideline for this
   * household's size, which is where the families the tool is for actually
   * are. They are a seventh measure with its own definition, not a composite
   * of the six (design/README.md forbids a score).
   *
   * `keepRate` is dollars kept per extra dollar earned across the road —
   * 1 minus the effective marginal tax rate — rounded to four decimals, so
   * -0.63 means the family ends up 63 cents poorer for each extra dollar.
   * Null only when the road runs off this cell's axis, which no swept cell
   * does (axisSpec always reaches past 4x the poverty line); `roadLo` and
   * `roadHi` are null and `roadCliffCount` is 0 in that same case, and
   * `keepRate` is the field that says so.
   */
  keepRate: number | null;
  /**
   * The keep rate from `roadLo` to exactly twice poverty (road.ts
   * `keepRateToLine`: the road without its one-step allowance), to the same
   * four decimals. Where it and `keepRate` differ in sign, the state's loss on
   * the road is the one step out of twice poverty — an exit sitting on that
   * line — rather than the road as a whole. Null where `keepRate` is.
   */
  keepRateToLine: number | null;
  /**
   * The level beside the slope (road.ts `netAtLo`/`netAtHi`): net income in
   * whole dollars — help and tax credits counted, taxes, health premiums and
   * the child care the family pays itself out (types.ts `netIncome`) — with
   * pay at `roadLo` and at `roadHi`. A high keep rate is not a generous
   * state; these say what the family has. Null where `keepRate` is.
   */
  netAtRoadLo: number | null;
  netAtRoadHi: number | null;
  /**
   * The road's ends on this cell's axis — the HOUSEHOLDER's pay. For a
   * two-earner row that is the family's poverty line (and twice it) less the
   * spouse's fixed pay (road.ts `povertyRoad`), so a page naming these as
   * "the poverty line" must say it is the one earner's share of it.
   */
  roadLo: number | null;
  roadHi: number | null;
  /** Cliffs whose step starts on the road. Every cliff counts, deferred ones included (2026-09-17). */
  roadCliffCount: number;
  /** Where the road collapses: the largest of those cliffs, or null when it holds. */
  roadWorst: { drop: number; at: number; programs: ProgramId[] } | null;
  /**
   * How many families like this one, in this state, earn less than the pay
   * the WHOLE-AXIS worst step starts at (0–100, one decimal). The number that
   * tells a reader whether the headline cliff is one anybody stands at: null
   * where the reach ladder has no trustworthy cell, and never 0.
   */
  biggestLossPosition: number | null;
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
  /**
   * The year of the HHS poverty guideline every road in this file is set by
   * (policyYear.ts `FPL_GUIDELINE_YEAR`) — not `year`: the 2026 rules run on
   * the 2025 guideline. Absent on files written before it was recorded.
   */
  fplYear?: string;
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
  /**
   * Whether `household_state_benefits` carries the aggregate
   * `child_care_subsidies` in every state (policyengine-us #9503), read off
   * the endpoint by client.ts probeChildcareSubsidyCounted. Absent on records
   * written before the probe existed, which all predate the fix. WORKAROUND
   * field: goes with stateChildcareSubsidies.ts.
   */
  countsChildcareSubsidy?: boolean;
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
  /** Where energy assistance stops in this state and what it pays there (liheap.ts). Absent on files written before Plan 7. */
  liheap?: LiheapCoverage;
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
  /**
   * How LIHEAP is treated here (coverage.ts liheapNote): a `boundary` —
   * the state's limit is shown and the amount enters net income only behind
   * the take-up toggle — everywhere but Michigan, whose heating money is the
   * refundable Home Heating Credit that PolicyEngine models and HotGap
   * already counts in state credits (`in net income`). Absent on files
   * written before Plan 7.
   */
  liheap?: CorrectionNote & { source: "boundary" | "in net income"; program: string };
}

/**
 * LIHEAP's boundary facts for one state, straight from the table in
 * liheap.ts, so a surface can name the limit, the top-band amount and the
 * served share without loading the table.
 */
export interface LiheapCoverage {
  /** The heating limit as the state elects it, in words: "150% of the poverty guideline", "60% of state median income". */
  limitKind: string;
  limit: LiheapLimit;
  topBand: { min: number; max: number } | null;
  shape: LiheapShape | null;
  /** Households served ÷ income-eligible households, FY2024, or null where the profile was not read. */
  servedShare: number | null;
  upstream: { variable: string; counted?: "state credit" } | null;
  sources: { limits: string; amounts: string | null; served: string | null };
  readOn: string;
}

/**
 * A correction as a reader meets it: `note` is the sentence a surface prints
 * verbatim (inventory.md § CorrectionsApplied) — what HotGap did, why, and
 * the upstream issue as the cite — so it is written for the reporter who
 * will quote it, never for a log. `message` is the same sentence as a code
 * with its parameters (messages.ts), so a surface can say it in another
 * language; absent on files written before it was recorded, and the note
 * is the fallback. The engineering pointers ride beside them: `code`, where
 * the correction lives in core, and `cite`, the published source it was
 * read from, when there is one.
 */
export interface CorrectionNote {
  applies: boolean;
  note: string;
  message?: Coded;
  code?: string;
  cite?: string;
}

export interface PolicyOverrideRecord {
  parameter: string;
  period: string;
  /** The value sent, per archetype: the parent limit is a poverty-line fraction for the household's own size, so it varies. */
  values: Record<string, number | string[]>;
  source: string;
  note: string;
  message?: Coded;
}

export interface UnmodeledProgram {
  program: string;
  note: string;
  message?: Coded;
  /**
   * "state": a gap particular to this state, listed under it and a reason to
   * mark its figures incomplete. "all": a gap every state shares (LIHEAP
   * today), which a comparison lists once, in the method, never under one
   * state as if it were that state's (places review S8). Absent on files
   * written before it was recorded, which means "state".
   */
  scope?: "state" | "all";
}

export interface OtherBenefit {
  /** The PolicyEngine variable the money was traced to (stateOtherBenefits.ts), or null when it has not been identified yet. */
  variable: string | null;
  label: string;
  message?: Coded;
  /** The largest raw remainder on any of this state's swept curves — the whole remainder, shared when more than one variable is listed. */
  maxAnnualInSweep: number;
}

export interface StateVintages {
  model: ModelRecord | null;
  /** Read from state-defaults.json `sources`, never retyped. */
  rent: SourceVintage;
  /** The county the archetypes rent in — its FIPS and its gazetteer name, so a page prints "Franklin County" where a name belongs (places review B4). */
  county: SourceVintage & { fips: string; name: string | null };
  /** Rule and NDCP study year behind each child-care price band (state-defaults.json `childcareBasis.byState`). */
  childcare: Record<string, string>;
  /** reach.json: the earnings basis, what a cell matches a family on, the PUMS vintage(s) this state's cells came from, and the ECI growth factor to 2026. */
  /** `cellDefinition` is absent on a summary written before it was recorded. */
  reach: { basis: string; cellDefinition?: string; vintages: string[]; growthFactor: number };
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

const cache = new Map<string, unknown>();

/**
 * Hand this module a file's parsed contents instead of letting it read disk:
 * the seam that runs core where there is no disk. A Worker or a page bundles
 * (or fetches) the small tables and provides them once at start-up; every
 * loader below then works unchanged, synchronously, from the cache. An entry
 * provided here wins over the file on disk, so a test can substitute a table.
 */
export function provideData(entries: Record<string, unknown>): void {
  for (const [relPath, value] of Object.entries(entries)) cache.set(relPath, value);
}

// Disk is Node's business. process.getBuiltinModule (Node ≥ 22.3, and the
// Workers runtime's node:process) loads a builtin without a static `node:fs`
// import, so this module also bundles for a browser — where `process` is
// undefined, the branch is skipped, and only provided entries exist.
const fs = typeof process !== "undefined" && typeof process.getBuiltinModule === "function"
  ? (process.getBuiltinModule("node:fs") as typeof import("node:fs") | undefined)
  : undefined;

/**
 * Where data/ is, from this module's own URL — on Node a file: URL. In a
 * Worker bundle import.meta.url is a bare module name, not a URL, so this is
 * resolved lazily and a failure means "no disk". The URL is built from a
 * parameter rather than the literal `import.meta.url` because Vite rewrites
 * `new URL(<string>, import.meta.url)` into an asset reference at build time,
 * and data/ is a directory, not an asset.
 */
function dataDirFrom(moduleUrl: string): URL | null {
  try {
    return new URL("../data/", moduleUrl);
  } catch {
    return null;
  }
}
let dataDir: URL | null | undefined;

/** Read `data/<relPath>` from disk; null off Node, or when the file does not exist or the path escapes data/. */
function readDisk(relPath: string): unknown {
  if (!fs) return null;
  dataDir ??= dataDirFrom(import.meta.url);
  if (!dataDir) return null;
  const url = new URL(relPath, dataDir);
  const inside = url.href.startsWith(dataDir.href);
  return inside && fs.existsSync(url) ? JSON.parse(fs.readFileSync(url, "utf8")) : null;
}

/** Parse `data/<relPath>` once — a provided entry first, else the file on disk. */
export function readData<T>(relPath: string): T | null {
  if (!cache.has(relPath)) cache.set(relPath, readDisk(relPath));
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
