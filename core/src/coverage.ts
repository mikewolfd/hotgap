// The per-state `coverage` block in summary.json: what a reader of one state's
// numbers has to know before comparing them with another state's. Every
// entry is derived from the code that applies the correction — the override
// table, the premium tables, the child-care list, the expansion list — and
// from the data files' own provenance, never from a hand-kept list, so the
// block cannot say one thing while the sweep did another. Each note is one
// sentence; the long form, with evidence and retirement conditions, is
// docs/upstream/2026-09-15-local-corrections.md.
import { PROGRAM_END_MIN } from "./analyze.js";
import { ARCHETYPES, answersFor } from "./archetypes.js";
import type { CorrectionNote, ModelRecord, OtherBenefit, PolicyOverrideRecord, StateCorrections, StateCoverage, UnmodeledProgram } from "./data.js";
import { MA_TAFDC_SOURCES } from "./maTafdc.js";
import { BHP_EXPANDED_STATES, POLICY_OVERRIDE_SOURCES, policyOverridesFor } from "./policyOverrides.js";
import { NON_EXPANSION_STATES } from "./policyYear.js";
import { reachProvenance } from "./reachLookup.js";
import { childcareSubsidyInNetIncome } from "./stateChildcareSubsidies.js";
import { stateDefaultsProvenance } from "./stateDefaults.js";
import { otherBenefitSourcesFor } from "./stateOtherBenefits.js";
import { STATE_PREMIUM_WRAPS } from "./statePremiumWraps.js";
import { statePremiumAssistanceFor, UNMODELED_STATE_PREMIUM_ASSISTANCE } from "./statePremiumAssistance.js";
import type { CurvePoint } from "./types.js";

export interface CoverageContext {
  model?: ModelRecord;
  /** summary.childcareSubsidyUnmodeled: the states whose paying archetypes drew no subsidy at any point. */
  childcareSubsidyUnmodeled?: readonly string[];
}

const PARENT_LIMIT_NOTE = "Parent Medicaid limit sent as a request parameter from the state's published limit for the household's size, as a 2026 poverty-line fraction inclusive of the MAGI disregard; PolicyEngine's is five years stale (policyengine-us #9474, fix in PR #9475).";
const NY_BHP_NOTE = "Expanded Basic Health Program list emptied so the Essential Plan ceiling is the 200% FPL rule in force from 2026-07-01 for the whole year, not upstream's 250% (policyengine-us #9471; CMS approved the termination 2026-03-20).";

/** The overrides `buildCurvePayload` attaches in this state, one record per parameter with the value sent per archetype. */
function policyOverrideRecords(state: string): PolicyOverrideRecord[] {
  const byParameter = new Map<string, PolicyOverrideRecord>();
  for (const a of ARCHETYPES) {
    for (const [parameter, byPeriod] of Object.entries(policyOverridesFor(answersFor(state, a)))) {
      const [period, value] = Object.entries(byPeriod)[0];
      const source = POLICY_OVERRIDE_SOURCES[state as keyof typeof POLICY_OVERRIDE_SOURCES].source;
      const record = byParameter.get(parameter) ?? { parameter, period, values: {}, source, note: parameter === BHP_EXPANDED_STATES ? NY_BHP_NOTE : PARENT_LIMIT_NOTE };
      record.values[a.id] = value;
      byParameter.set(parameter, record);
    }
  }
  return [...byParameter.values()];
}

function maTafdcNote(state: string): CorrectionNote {
  if (state !== "MA") return { applies: false, note: "Massachusetts-only; PolicyEngine's TANF as served." };
  return {
    applies: true,
    note: `TAFDC grant recomputed under the ongoing-recipient rules (106 CMR 704.281: $200 a month per earner, then a 50% disregard; ${MA_TAFDC_SOURCES.rules}) and fed back to the engine point by point so SNAP follows it (policyengine-us #9469, fix in PR #9477); programs.tanf is the ongoing grant, the September clothing allowance rides in otherBenefits, and the six-month full disregard is not modeled.`,
  };
}

/**
 * Which of the three premium-help paths this sweep took: the endpoint's own
 * amount when every point carries it (evaluate.ts applyStatePremiumAssistance
 * needs every point), the local ladder where one exists otherwise, or nothing.
 */
function premiumAssistance(state: string, curves: Record<string, CurvePoint[]>): StateCorrections["premiumAssistance"] {
  const modeled = statePremiumAssistanceFor(state);
  const points = Object.values(curves).flat();
  if (modeled && points.length > 0 && points.every((p) => p.statePremiumAssistance !== undefined)) {
    return {
      applies: true, source: "modeled", program: modeled.program,
      note: `PolicyEngine's ${modeled.variable} netted out of the premium (it lands in household_health_benefits, not the out-of-pocket figure HotGap reads); the local ladder stands down.`,
    };
  }
  const wrap = STATE_PREMIUM_WRAPS.find((w) => w.state === state);
  if (wrap) {
    return {
      applies: true, source: "ladder", program: wrap.program,
      note: `$0-premium tier to ${Math.round(wrap.zeroPremiumUpToFpl * 100)}% FPL${wrap.tiers ? " and the published reduced-premium tiers above it" : ""}, applied locally from ${wrap.source} (read ${wrap.readOn}) — WORKAROUND until upstream models the wrap (policyengine-us #9481).`,
    };
  }
  const known = modeled?.program ?? UNMODELED_STATE_PREMIUM_ASSISTANCE.find((s) => s.state === state)?.program ?? null;
  return {
    applies: false, source: "none", program: known,
    note: known
      ? `${known} exists but is modeled nowhere on this sweep — no upstream variable served, no FPL-bounded $0 tier for a ladder — so the net premium is overstated by it.`
      : "No state premium help served by the endpoint, and no ladder or known program for this state.",
  };
}

function childcareSubsidy(state: string, model?: ModelRecord): StateCorrections["childcareSubsidy"] {
  if (model?.countsChildcareSubsidy) {
    return { applies: false, source: "in net income", note: "Already inside household_net_income: this model counts the aggregate child_care_subsidies in every state (policyengine-us #9503); HotGap only names it." };
  }
  return childcareSubsidyInNetIncome(state)
    ? { applies: false, source: "in net income", note: "Already inside household_net_income (gov.household.household_state_benefits lists this state's subsidy); HotGap only names it." }
    : { applies: true, source: "added by HotGap", note: "Computed by PolicyEngine but dropped from household_net_income here, so HotGap adds it back (parse.ts) — WORKAROUND until this endpoint carries policyengine-us #9503 (issue #9405)." };
}

function coverageGap(state: string): CorrectionNote {
  return NON_EXPANSION_STATES.has(state)
    ? { applies: true, note: "Non-expansion state: an adult with no Medicaid and no premium credit under 100% FPL is charged no marketplace premium, and flagged (evaluate.ts applyCoverageGap) — WORKAROUND until upstream gates take-up on subsidy eligibility (policyengine-us #9472)." }
    : { applies: false, note: "Expansion state: adults to 138% FPL are on Medicaid, so the coverage-gap correction never fires." };
}

function unmodeled(state: string, premium: StateCorrections["premiumAssistance"], ctx: CoverageContext): UnmodeledProgram[] {
  const out: UnmodeledProgram[] = [];
  if (premium.source === "none" && premium.program) {
    const known = UNMODELED_STATE_PREMIUM_ASSISTANCE.find((s) => s.state === state);
    out.push({ program: premium.program, note: known ? `${known.note}; no upstream variable and no local ladder.` : "The endpoint did not serve the state's variable on this sweep, and no local ladder covers it." });
  }
  if (ctx.childcareSubsidyUnmodeled?.includes(state)) {
    out.push({ program: "Child-care subsidy (CCDF)", note: "The engine paid $0 at every point to an archetype that pays for care — a modeling gap, not a state rule; footnote this state rather than read its missing cliff as good news." });
  }
  out.push({ program: "LIHEAP", note: "Not requested from PolicyEngine and not in its household_benefits; the few state programs upstream models never reach net income." });
  return out;
}

/**
 * The raw remainder's peak on any of this state's swept curves, labeled from
 * stateOtherBenefits.ts. Under PROGRAM_END_MIN it is float noise or a
 * program too small to be "on" anywhere in the analysis, and is left out.
 */
function otherBenefits(state: string, curves: Record<string, CurvePoint[]>): OtherBenefit[] {
  const maxAnnualInSweep = Math.round(Object.values(curves).flat().reduce((max, p) => Math.max(max, p.otherBenefits ?? 0), 0));
  if (maxAnnualInSweep <= PROGRAM_END_MIN) return [];
  const sources = otherBenefitSourcesFor(state);
  if (sources.length === 0) return [{ variable: null, label: "not yet identified — probe the engine with the household-benefit lists (stateOtherBenefits.ts)", maxAnnualInSweep }];
  return sources.map(({ variable, label }) => ({ variable, label, maxAnnualInSweep }));
}

/** Everything a reader of this state's summary row should know first, from the swept curves and the tables that shaped them. */
export function stateCoverage(state: string, curves: Record<string, CurvePoint[]>, ctx: CoverageContext = {}): StateCoverage {
  const premium = premiumAssistance(state, curves);
  return {
    corrections: {
      policyOverrides: policyOverrideRecords(state),
      maTafdc: maTafdcNote(state),
      premiumAssistance: premium,
      childcareSubsidy: childcareSubsidy(state, ctx.model),
      coverageGap: coverageGap(state),
    },
    unmodeled: unmodeled(state, premium, ctx),
    otherBenefits: otherBenefits(state, curves),
    vintages: { model: ctx.model ?? null, ...stateDefaultsProvenance(state), reach: reachProvenance(state) },
  };
}
