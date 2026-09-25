// The per-state `coverage` block in summary.json: what a reader of one state's
// numbers has to know before comparing them with another state's. Every
// entry is derived from the code that applies the correction — the override
// table, the premium tables, the child-care list, the expansion list — and
// from the data files' own provenance, never from a hand-kept list, so the
// block cannot say one thing while the sweep did another. Each note is one
// sentence a surface prints verbatim and a reporter can quote (places review
// S9): what HotGap did, why, and the upstream issue as the cite; it is
// rendered from its code (messages.ts, messages/en.json), and the code with
// its parameters rides beside it as `message` so a surface can say it in
// another language. The code pointer is the `code` field. The long form,
// with evidence and retirement conditions, is
// docs/upstream/2026-09-15-local-corrections.md.
import { PROGRAM_END_MIN } from "./analyze.js";
import { ARCHETYPES, answersFor } from "./archetypes.js";
import { countyName } from "./county.js";
import type { CorrectionNote, LiheapCoverage, ModelRecord, OtherBenefit, PolicyOverrideRecord, StateCorrections, StateCoverage, UnmodeledProgram } from "./data.js";
import type { Coded } from "./messages.js";
import { LIHEAP_VINTAGE, liheapLimitWords, liheapRow } from "./liheap.js";
import { MA_TAFDC_SOURCES } from "./maTafdc.js";
import { coded, message } from "./messages.js";
import { BHP_EXPANDED_STATES, POLICY_OVERRIDE_SOURCES, policyOverridesFor } from "./policyOverrides.js";
import { NON_EXPANSION_STATES } from "./policyYear.js";
import { reachProvenance } from "./reachLookup.js";
import { childcareSubsidyInNetIncome } from "./stateChildcareSubsidies.js";
import { stateDefaults, stateDefaultsProvenance } from "./stateDefaults.js";
import { otherBenefitSourcesFor } from "./stateOtherBenefits.js";
import { PER_MEMBER_PREMIUM_HELP, STATE_PREMIUM_WRAPS } from "./statePremiumWraps.js";
import { statePremiumAssistanceFor, UNMODELED_STATE_PREMIUM_ASSISTANCE } from "./statePremiumAssistance.js";
import type { CurvePoint } from "./types.js";

export interface CoverageContext {
  model?: ModelRecord;
  /** summary.childcareSubsidyUnmodeled: the states whose paying archetypes drew no subsidy at any point. */
  childcareSubsidyUnmodeled?: readonly string[];
}

/** The overrides `buildCurvePayload` attaches in this state, one record per parameter with the value sent per archetype. */
function policyOverrideRecords(state: string, swept: ReadonlySet<string>): PolicyOverrideRecord[] {
  const byParameter = new Map<string, PolicyOverrideRecord>();
  /* Only the archetypes this sweep has curves for: a row added to ARCHETYPES
     before the sweep that fills it has sent nothing yet. */
  for (const a of ARCHETYPES.filter((x) => swept.has(x.id))) {
    for (const [parameter, byPeriod] of Object.entries(policyOverridesFor(answersFor(state, a)))) {
      const [period, value] = Object.entries(byPeriod)[0];
      const source = POLICY_OVERRIDE_SOURCES[state as keyof typeof POLICY_OVERRIDE_SOURCES].source;
      const { message: msg, text } = coded(parameter === BHP_EXPANDED_STATES ? "coverage.override.nyBhp" : "coverage.override.parentLimit");
      const record = byParameter.get(parameter) ?? { parameter, period, values: {}, source, note: text, message: msg };
      record.values[a.id] = value;
      byParameter.set(parameter, record);
    }
  }
  return [...byParameter.values()];
}

/** A note's two forms from its code: the English `note` and the `message` a surface renders in its own language. */
const note = (...args: Parameters<typeof coded>): { note: string; message: Coded } => { const { message: m, text } = coded(...args); return { note: text, message: m }; };

function maTafdcNote(state: string): CorrectionNote {
  const code = "maTafdc.ts";
  if (state !== "MA") return { applies: false, code, ...note("coverage.maTafdc.elsewhere") };
  return { applies: true, code, cite: MA_TAFDC_SOURCES.rules, ...note("coverage.maTafdc.applied") };
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
      ...note("coverage.premium.modeled", { program: modeled.program }),
    };
  }
  const wrap = STATE_PREMIUM_WRAPS.find((w) => w.state === state);
  if (wrap) {
    return {
      applies: true, source: "ladder", program: wrap.program, code: "statePremiumWraps.ts", cite: wrap.source,
      ...note("coverage.premium.ladder", { program: wrap.program, pct: Math.round(wrap.zeroPremiumUpToFpl * 100), tiers: wrap.tiers ? "yes" : "no", readOn: wrap.readOn }),
    };
  }
  // The other local table: a flat amount per person per month rather than a
  // $0 band. Same standing-down rule — it reports only where the endpoint
  // served no figure, which is the branch this function is already on.
  const perMember = PER_MEMBER_PREMIUM_HELP.find((h) => h.state === state);
  if (perMember) {
    const cheapest = Math.min(...perMember.bands.map((b) => b.monthlyPerMember));
    const dearest = Math.max(...perMember.bands.map((b) => b.monthlyPerMember));
    return {
      applies: true, source: "ladder", program: perMember.program, code: "statePremiumWraps.ts", cite: perMember.source,
      ...note("coverage.premium.perMember", { program: perMember.program, range: cheapest === dearest ? "flat" : "range", cheapest, dearest, pct: Math.round(perMember.bands[perMember.bands.length - 1].upToFpl * 100), readOn: perMember.readOn, issue: perMember.upstreamIssue }),
    };
  }
  const known = modeled?.program ?? UNMODELED_STATE_PREMIUM_ASSISTANCE.find((s) => s.state === state)?.program ?? null;
  return {
    applies: false, source: "none", program: known, code: "statePremiumAssistance.ts",
    ...(known ? note("coverage.premium.unserved", { program: known }) : note("coverage.premium.none")),
  };
}

function childcareSubsidy(state: string, model?: ModelRecord): StateCorrections["childcareSubsidy"] {
  const code = "parse.ts childcareSubsidyCounted";
  if (model?.countsChildcareSubsidy) {
    return { applies: false, source: "in net income", code, ...note("coverage.childcare.countedEverywhere") };
  }
  return childcareSubsidyInNetIncome(state)
    ? { applies: false, source: "in net income", code, ...note("coverage.childcare.counted") }
    : { applies: true, source: "added by HotGap", code, ...note("coverage.childcare.added") };
}

function coverageGap(state: string): CorrectionNote {
  const code = "evaluate.ts applyCoverageGap";
  return NON_EXPANSION_STATES.has(state)
    ? { applies: true, code, ...note("coverage.coverageGap.applies") }
    : { applies: false, code, ...note("coverage.coverageGap.expansion") };
}

function unmodeled(state: string, premium: StateCorrections["premiumAssistance"], ctx: CoverageContext): UnmodeledProgram[] {
  const out: UnmodeledProgram[] = [];
  if (premium.source === "none" && premium.program) {
    const known = UNMODELED_STATE_PREMIUM_ASSISTANCE.find((s) => s.state === state);
    out.push({
      program: premium.program, scope: "state",
      ...(known ? note("coverage.unmodeled.premiumKnown", { program: premium.program, detail: known.note }) : note("coverage.unmodeled.premiumUnserved", { program: premium.program })),
    });
  }
  if (ctx.childcareSubsidyUnmodeled?.includes(state)) {
    out.push({ program: message("program.childcareCcdf"), scope: "state", ...note("coverage.unmodeled.childcare") });
  }
  // LIHEAP is no longer an unmodeled row: its boundary is shown in every
  // state (corrections.liheap and the `liheap` block below), and Michigan's
  // is counted. A gap every state shares would carry `scope: "all"` here.
  return out;
}

/**
 * LIHEAP as this state's correction note: a boundary everywhere but
 * Michigan, whose heating assistance is a refundable state income-tax credit
 * that PolicyEngine models (mi_home_heating_credit) and HotGap already
 * counts in stateCredits — verified live 2026-09-16, $180.38 for a single
 * parent of two at $20,000 — so the old "not counted anywhere" note was wrong
 * there (the research's finding 1). Elsewhere the row in liheap.ts says
 * where the program stops and what it pays there; the money enters net
 * income only behind the household's own take-up toggle, because the state
 * served the share of eligible households the note names, not all of them.
 */
function liheapNote(state: string): StateCorrections["liheap"] {
  const row = liheapRow(state);
  if (row.upstream?.counted === "state credit") {
    return {
      applies: false, source: "in net income", program: message("program.homeHeatingCredit"), code: "parse.ts stateCredits",
      // The MI-1040CR-7 booklet (2024 tax year), as the Clearinghouse serves it
      // for FY2026: Table A (standard allowance and income ceiling) and line 41
      // ("reduce your computed standard credit by 50 percent" when heat is in
      // the rent). Read 2026-09-16.
      cite: row.sources.amounts ?? row.sources.limits,
      ...note("coverage.liheap.credit"),
    };
  }
  // `limit` is the limit's own message rendered (liheapLimitWords); a surface
  // re-renders it in its language from the `liheap` block's structured limit.
  return {
    applies: false, source: "boundary", program: message("program.liheap"), code: "liheap.ts liheapBoundary", cite: row.sources.limits,
    ...note("coverage.liheap.boundary", { limit: liheapLimitWords(row.heating.limit), served: row.servedShare === null ? "unknown" : "known", pct: row.servedShare === null ? 0 : Math.round(row.servedShare * 100), vintage: LIHEAP_VINTAGE.served }),
  };
}

/** The boundary facts a surface prints per state, straight from the table. */
function liheapCoverage(state: string): LiheapCoverage {
  const { heating, servedShare, upstream, sources, readOn } = liheapRow(state);
  return { limitKind: liheapLimitWords(heating.limit), limit: heating.limit, topBand: heating.topBand, shape: heating.shape, servedShare, upstream, sources, readOn };
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
  if (sources.length === 0) { const { message: m, text } = coded("coverage.otherBenefits.unidentified"); return [{ variable: null, label: text, message: m, maxAnnualInSweep }]; }
  return sources.map(({ variable, label, message: m }) => ({ variable, label, message: m, maxAnnualInSweep }));
}

/** Everything a reader of this state's summary row should know first, from the swept curves and the tables that shaped them. */
export function stateCoverage(state: string, curves: Record<string, CurvePoint[]>, ctx: CoverageContext = {}): StateCoverage {
  const premium = premiumAssistance(state, curves);
  const provenance = stateDefaultsProvenance(state);
  // The county named, not only dated (places review B4). Null where the gazetteer
  // has no row: Connecticut's planning regions post-date it.
  const fips = stateDefaults(state).countyFips;
  return {
    corrections: {
      policyOverrides: policyOverrideRecords(state, new Set(Object.keys(curves))),
      maTafdc: maTafdcNote(state),
      premiumAssistance: premium,
      childcareSubsidy: childcareSubsidy(state, ctx.model),
      coverageGap: coverageGap(state),
      liheap: liheapNote(state),
    },
    unmodeled: unmodeled(state, premium, ctx),
    otherBenefits: otherBenefits(state, curves),
    liheap: liheapCoverage(state),
    vintages: { model: ctx.model ?? null, ...provenance, county: { ...provenance.county, fips, name: countyName(fips) }, reach: reachProvenance(state) },
  };
}
