// The per-state `coverage` block in summary.json: what a reader of one state's
// numbers has to know before comparing them with another state's. Every
// entry is derived from the code that applies the correction — the override
// table, the premium tables, the child-care list, the expansion list — and
// from the data files' own provenance, never from a hand-kept list, so the
// block cannot say one thing while the sweep did another. Each note is one
// sentence a surface prints verbatim and a reporter can quote (places review
// S9): what HotGap did, why, and the upstream issue as the cite; the code
// pointer is the `code` field beside it. The long form, with evidence and
// retirement conditions, is docs/upstream/2026-09-15-local-corrections.md.
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

const PARENT_LIMIT_NOTE = "HotGap sends the state's own published parent Medicaid income limit for this household's size, as a share of the 2026 poverty line including the MAGI disregard, because PolicyEngine's figure is five years out of date (policyengine-us #9474; fixed upstream in PR #9475).";
const NY_BHP_NOTE = "HotGap takes New York off PolicyEngine's expanded Basic Health Program list, so the Essential Plan ceiling is the 200% of poverty rule in force from 2026-07-01 for the whole year rather than the 250% upstream keeps (policyengine-us #9471; CMS approved the termination on 2026-03-20).";

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
  const code = "maTafdc.ts";
  if (state !== "MA") return { applies: false, code, note: "Massachusetts only; PolicyEngine's TANF stands as served." };
  return {
    applies: true, code, cite: MA_TAFDC_SOURCES.rules,
    note: "HotGap recomputes the TAFDC grant under the state's ongoing-recipient rules ($200 a month per earner, then a 50% disregard; 106 CMR 704.281) and feeds it back to the engine so SNAP follows it, because PolicyEngine ends the grant abruptly (policyengine-us #9469; fix in PR #9477); the September clothing allowance is counted under other benefits, and the six-month full disregard is not modelled.",
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
      applies: true, source: "modeled", program: modeled.program, code: `evaluate.ts applyStatePremiumAssistance (${modeled.variable})`,
      note: `PolicyEngine computes ${modeled.program} itself, and HotGap subtracts it from the premium the household pays, because the engine reports it as a health benefit rather than in the out-of-pocket premium HotGap reads; no local schedule is applied.`,
    };
  }
  const wrap = STATE_PREMIUM_WRAPS.find((w) => w.state === state);
  if (wrap) {
    return {
      applies: true, source: "ladder", program: wrap.program, code: "statePremiumWraps.ts", cite: wrap.source,
      note: `HotGap applies ${wrap.program}'s published premium schedule itself — a $0 premium up to ${Math.round(wrap.zeroPremiumUpToFpl * 100)}% of the poverty line${wrap.tiers ? " and the reduced premiums above it" : ""}, as read on ${wrap.readOn} — because PolicyEngine does not model the program (policyengine-us #9481).`,
    };
  }
  const known = modeled?.program ?? UNMODELED_STATE_PREMIUM_ASSISTANCE.find((s) => s.state === state)?.program ?? null;
  return {
    applies: false, source: "none", program: known, code: "statePremiumAssistance.ts",
    note: known
      ? `${known} is not counted: PolicyEngine served no figure for it on this sweep, and HotGap's own schedules cover only $0-premium tiers, so the premiums here are overstated by it.`
      : "No state premium help applies: PolicyEngine serves none for this state, and HotGap knows of no program to add.",
  };
}

function childcareSubsidy(state: string, model?: ModelRecord): StateCorrections["childcareSubsidy"] {
  const code = "parse.ts childcareSubsidyCounted";
  if (model?.countsChildcareSubsidy) {
    return { applies: false, source: "in net income", code, note: "PolicyEngine counts the child-care subsidy inside net income in every state on this version (policyengine-us #9503), so HotGap only names it." };
  }
  return childcareSubsidyInNetIncome(state)
    ? { applies: false, source: "in net income", code, note: "PolicyEngine already counts this state's child-care subsidy in net income, so HotGap only names it." }
    : { applies: true, source: "added by HotGap", code, note: "PolicyEngine computes the child-care subsidy but leaves it out of net income here, so HotGap adds it back, until the engine's own fix (policyengine-us #9405, PR #9503) reaches this endpoint." };
}

function coverageGap(state: string): CorrectionNote {
  const code = "evaluate.ts applyCoverageGap";
  return NON_EXPANSION_STATES.has(state)
    ? { applies: true, code, note: "In this non-expansion state an adult with no Medicaid and no premium credit below 100% of the poverty line is charged no marketplace premium, and the point is flagged, because PolicyEngine bills the full premium to someone the marketplace would not enrol (policyengine-us #9472)." }
    : { applies: false, code, note: "Expansion state: adults to 138% of the poverty line are on Medicaid, so the coverage-gap correction never fires." };
}

function unmodeled(state: string, premium: StateCorrections["premiumAssistance"], ctx: CoverageContext): UnmodeledProgram[] {
  const out: UnmodeledProgram[] = [];
  if (premium.source === "none" && premium.program) {
    const known = UNMODELED_STATE_PREMIUM_ASSISTANCE.find((s) => s.state === state);
    out.push({
      program: premium.program,
      note: known
        ? `${premium.program} (${known.note}) is not computed by PolicyEngine, and HotGap's own schedules cover only $0-premium tiers, so the premiums here are overstated by it.`
        : `PolicyEngine models ${premium.program}, but this sweep's endpoint did not serve it and HotGap has no schedule of its own for it, so the premiums here are overstated by it.`,
    });
  }
  if (ctx.childcareSubsidyUnmodeled?.includes(state)) {
    out.push({ program: "Child-care subsidy (CCDF)", note: "PolicyEngine paid $0 of child-care subsidy at every point to a household here that pays for care — a modelling gap, not a state rule — so a real cliff may be missing; footnote this state rather than read the gap as good news." });
  }
  const liheap = liheapUnmodeled(state);
  if (liheap) out.push(liheap);
  return out;
}

// The three states whose LIHEAP schedule PolicyEngine models in full
// (programs.yaml: dc_liheap, ma_liheap, il_liheap), none of which is on
// gov.household.household_state_benefits, so none reaches net income
// (docs/research/liheap-cliff-2026-09-16.md § 2).
const LIHEAP_MODELED_UPSTREAM: ReadonlySet<string> = new Set(["DC", "MA", "IL"]);

/**
 * LIHEAP as this state's unmodeled row, or null where it is not unmodeled at
 * all: Michigan pays its heating assistance as a refundable state income-tax
 * credit that PolicyEngine models (mi_home_heating_credit) and HotGap
 * already counts in stateCredits — verified live 2026-09-16, $180.38 for a
 * single parent of two at $20,000 — so the old "not counted anywhere" note
 * was wrong there (the research's finding 1). Michigan's row is a correction
 * note instead (liheapNote).
 */
function liheapUnmodeled(state: string): UnmodeledProgram | null {
  if (state === "MI") return null;
  if (LIHEAP_MODELED_UPSTREAM.has(state)) {
    return { program: "LIHEAP", note: "PolicyEngine models this state's LIHEAP schedule, but the amount never reaches its net income figure and HotGap does not yet show it, so a heating benefit ending is not on this curve." };
  }
  return { program: "LIHEAP", note: "Not counted anywhere: HotGap does not request LIHEAP from PolicyEngine, and the few state programs the engine models never reach its net income figure." };
}

/** Michigan's LIHEAP as the correction it is: counted, in state credits, on one stated assumption. */
function liheapNote(state: string): StateCorrections["liheap"] | undefined {
  if (state !== "MI") return undefined;
  return {
    applies: false, source: "in net income", program: "Home Heating Credit", code: "parse.ts stateCredits",
    // The MI-1040CR-7 booklet (2024 tax year), as the Clearinghouse serves it
    // for FY2026: Table A (standard allowance and income ceiling) and line 41
    // ("reduce your computed standard credit by 50 percent" when heat is in
    // the rent). Read 2026-09-16.
    cite: "https://liheapch.acf.gov/docs/2026/benefits-matricies/MI_BenefitMatrix_2026_Heating-see-pg-11.pdf",
    note: "Michigan pays its heating assistance as the refundable Home Heating Credit; PolicyEngine models it and HotGap counts it in state credits, assuming heat is not included in rent — the credit halves when it is.",
  };
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
  const liheap = liheapNote(state);
  return {
    corrections: {
      policyOverrides: policyOverrideRecords(state),
      maTafdc: maTafdcNote(state),
      premiumAssistance: premium,
      childcareSubsidy: childcareSubsidy(state, ctx.model),
      coverageGap: coverageGap(state),
      ...(liheap ? { liheap } : {}),
    },
    unmodeled: unmodeled(state, premium, ctx),
    otherBenefits: otherBenefits(state, curves),
    vintages: { model: ctx.model ?? null, ...stateDefaultsProvenance(state), reach: reachProvenance(state) },
  };
}
