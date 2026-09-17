// The sentences around the chart, pure: what the answer's sub-line says,
// what we assumed about the household (S6, with the corrections that shaped
// its own numbers in the citizen register), the SourceNote (#17, with its
// archetype state M4), the IncompleteMarker (#16), reach and hours. The
// provenance parts take the sweep's summary when the page has fetched it and
// say less, never something wrong, when it has not.
import {
  CHILDCARE_MAX_AGE, childcareMonthlyFor, provideData, stateDefaults, type ProgramId, type StateCoverage, type SummaryJson,
} from "@hotgap/core";
import stateDefaultsJson from "@hotgap/core/data/state-defaults.json";
import { dateWords, listOf, unitFigure } from "../lib/format.js";
import { capitalize, modelLine } from "../lib/format.js";
import { servedTenths } from "../lib/served.js";
import { copy, fill, t } from "./copy.js";
import type { Scene } from "./model.js";
import { NONCASH, phrase, phraseAndName } from "./programs.js";

provideData({ "state-defaults.json": stateDefaultsJson });

/** Under the answer: why "you keep" is not your pay, and the largest non-cash part of it (S6). */
export function subText(s: Scene): string {
  // The last sampled point at or below the household's pay, the point core reads too (evaluate.ts unclaimedFrom).
  const at = s.ev.curve.points.filter((p) => p.earnings <= s.current).pop() ?? s.ev.curve.points[0];
  let out = s.currentNet >= s.current ? copy.sub.more : copy.sub.less;
  const [id, amount] = NONCASH.map((p) => [p, at?.programs[p] ?? 0] as const).sort((a, b) => b[1] - a[1])[0];
  if (amount > 0) out += " " + fill(copy.noncash[id], { amount: s.m.money(amount) });
  if ((at?.medicalOOP ?? 0) > 0) out += " " + t("health", { amount: s.m.money(at.medicalOOP) });
  return out;
}

export interface Fact { label: string; text: string }

const TAKE_UP: [keyof Scene["modeled"], ProgramId][] = [
  ["getsSnap", "snap"], ["getsTanf", "tanf"], ["getsMedicaid", "medicaid"], ["getsWic", "wic"],
  ["getsChildcareSubsidy", "childcare"], ["getsHousing", "housing"], ["getsHeadStart", "headstart"], ["getsEnergyAssistance", "liheap"],
];

const kidsWord = (n: number): string =>
  n === 1 ? copy.assumed.kids.one : n === 2 ? copy.assumed.kids.two : n === 3 ? copy.assumed.kids.three : fill(copy.assumed.kids.many, { n });

/** "What we assumed about you": the household the curve was run for, and every correction that touched its numbers. */
export function assumedRows(s: Scene): Fact[] {
  const A = s.modeled, { ev, m, stateName: state } = s;
  const L = copy.assumed.labels;
  const d = stateDefaults(s.state);
  const typicalCare = A.childAges.reduce((sum, age) => sum + childcareMonthlyFor(d, age), 0);
  const rows: (Fact | null)[] = [];

  rows.push({ label: L.rent, text: A.monthlyRent === null ? t("assumed.rentNone")
    : A.monthlyRent === d.monthlyRent ? t("assumed.rentTypical", { amount: m.money(A.monthlyRent), state })
    : t("assumed.rent", { amount: m.money(A.monthlyRent) }) });
  const kids = kidsWord(A.childAges.length);
  rows.push({ label: L.childcare, text: !A.monthlyChildcare ? t("assumed.childcareNone")
    : A.monthlyChildcare === typicalCare ? t("assumed.childcareTypical", { amount: m.money(A.monthlyChildcare), kids, state })
    : t("assumed.childcare", { amount: m.money(A.monthlyChildcare), kids }) });

  const on = TAKE_UP.filter(([k]) => A[k]).map(([, id]) => phraseAndName(id));
  const off = TAKE_UP.filter(([k]) => !A[k]).map(([, id]) => phraseAndName(id));
  if (on.length) rows.push({ label: L.help, text: t("assumed.help", { list: capitalize(listOf(on)) }) });
  if (off.length) rows.push({ label: L.notCounted, text: t("assumed.notCounted", { list: capitalize(listOf(off)) }) });

  let disability = "";
  if (A.youDisabled) disability += copy.assumed.youDisabled;
  if (A.spouseDisabled) disability += copy.assumed.spouseDisabled;
  const kidsDisabled = A.childDisabled.filter(Boolean).length;
  if (kidsDisabled === 1) disability += copy.assumed.kidDisabled;
  else if (kidsDisabled > 1) disability += fill(copy.assumed.kidsDisabled, { n: capitalize(kidsWord(kidsDisabled).split(" ")[0]) });
  rows.push({ label: L.you, text: t(A.youStatus === "citizen" ? "assumed.you" : "assumed.youNotCitizen", { age: A.age }) + (disability || copy.assumed.nobodyDisabled) });
  if (A.married) rows.push({ label: L.spouse, text: A.spouseAnnualEarnings > 0
    ? t("assumed.spouse", { age: A.spouseAge ?? A.age, pay: m.money(A.spouseAnnualEarnings) }) : t("assumed.spouseNoPay", { age: A.spouseAge ?? A.age }) });

  const monthly = ([["ssdi", A.ssdiMonthly], ["childSupport", A.childSupportMonthly], ["unemployment", A.unemploymentMonthly]] as const)
    .filter(([, v]) => v > 0).map(([k, v]) => fill(copy.assumed.monthly[k], { amount: m.money(v) }));
  rows.push({ label: L.money, text: t("assumed.savings", { savings: A.savings > 0 ? m.money(A.savings) : copy.assumed.none })
    + (monthly.length ? monthly.join("") : copy.assumed.noOtherMoney) });
  rows.push({ label: L.hours, text: A.hoursPerWeek === null ? t("assumed.hoursNone") : t("assumed.hours", { hours: A.hoursPerWeek }) });
  if (A.selfEmployed) rows.push({ label: L.work, text: t("assumed.selfEmployed") });

  // The corrections that shaped this household's own numbers (CorrectionsApplied, #18, in the citizen register).
  if (ev.esi) rows.push({ label: L.employerPlan, text: ev.esi.tier ? t("assumed.employerPlan", { amount: m.money(ev.esi.annualContribution) }) : t("assumed.employerPlanFree") });
  if (ev.headStart) rows.push({ label: L.headStart, text: t("assumed.headStart", { amount: m.money(ev.headStart.replacementValue) }) });
  if (ev.coverageGap) rows.push({ label: L.coverageGap, text: t("assumed.coverageGap", { from: m.payUnit(ev.coverageGap.fromEarnings), to: m.payUnit(ev.coverageGap.toEarnings) }) });
  if (ev.statePremiumAssistance) rows.push({ label: L.premiumHelp, text: t("assumed.premiumHelpMax", { program: ev.statePremiumAssistance.program, amount: m.money(ev.statePremiumAssistance.maxAnnual) }) });
  else if (ev.premiumWrap) rows.push({ label: L.premiumHelp, text: t("assumed.premiumHelp", { program: ev.premiumWrap.program }) });
  if (ev.maTafdc?.status === "applied") rows.push({ label: L.maTafdc, text: t("assumed.maTafdc") });
  if (ev.unclaimed?.length) rows.push({ label: L.unclaimed, text: t("assumed.unclaimed", {
    list: listOf(ev.unclaimed.map((u) => phraseAndName(u.program))), amount: m.about(ev.unclaimed.reduce((sum, u) => sum + u.annual, 0)) }) });
  return rows.filter((r): r is Fact => r !== null);
}

/** The sweep's record for this household's state, when the page has it. */
export interface Sweep { summary: SummaryJson; coverage: StateCoverage | undefined }
export const sweepFor = (summary: SummaryJson | null, state: string): Sweep | null =>
  summary ? { summary, coverage: summary.coverage?.[state] } : null;

/** The provenance sentence (SourceNote #17): what produced the numbers, from the data, never typed. */
export function provenanceText(s: Scene, sweep: Sweep | null): string {
  const year = s.ev.curve.year;
  const A = s.modeled, d = stateDefaults(s.state);
  // On the archetype path the sweep's own model and stamp are what produced
  // the numbers (N9); the live evaluation does not carry its engine's version.
  let out = s.ev.source === "live" ? t("source.live", { year })
    : sweep ? t("source.sweep", { model: modelLine(sweep.coverage?.vintages.model ?? sweep.summary.model), year, date: dateWords(sweep.summary.generated) })
    : t("source.sweepBare", { year });
  // The rent and child-care vintages apply when the household's figures are the state's typical ones.
  // core's vintage is written for the reader who will quote it; it is printed whole.
  if (sweep?.coverage && A.monthlyRent === d.monthlyRent) out += t("source.rent", { rent: sweep.coverage.vintages.rent.vintage });
  const typicalCare = A.childAges.reduce((sum, age) => sum + childcareMonthlyFor(d, age), 0);
  if (sweep?.coverage && typicalCare > 0 && A.monthlyChildcare === typicalCare) out += t("source.childcare", { childcare: sweep.coverage.vintages.childcare.preschool, year });
  return out + t("source.money");
}

/**
 * IncompleteMarker (#16), citizen register: the programs the model cannot
 * compute in this state that could move this household — every entry but
 * LIHEAP, and the child-care one only where a child of child-care age
 * (through CHILDCARE_MAX_AGE, the one rule every surface uses) has paid care.
 */
export function incompleteText(s: Scene, sweep: Sweep | null): string | null {
  const unmodeled = (sweep?.coverage?.unmodeled ?? []).filter((u) => u.program !== "LIHEAP").filter((u) =>
    !/child.?care/i.test(u.program) || (s.modeled.childAges.some((age) => age <= CHILDCARE_MAX_AGE) && (s.modeled.monthlyChildcare ?? 0) > 0));
  if (!unmodeled.length) return null;
  return t("incomplete.body", { state: s.stateName, program: listOf(unmodeled.map((u) => u.program)) });
}

export function reachText(s: Scene): string | null {
  const pct = s.ev.reach.current;
  if (pct === null) return null;
  const n = Math.round(pct / 10);
  const A = s.modeled;
  const who = A.childAges.length ? copy.reach.who.parents : A.married ? copy.reach.who.couples : copy.reach.who.people;
  const params = { who, state: s.stateName, pay: s.m.payUnit(s.current) };
  // The margin travels with the number (design/README.md conflict 5); the cell's own figure is not in the evaluation yet.
  return (n <= 0 ? t("reach.few", params) : n >= 10 ? t("reach.most", params) : t("reach.some", { n, ...params })) + t("reach.margin");
}

/** A reach.json vintage token ("2024-1yr", "2020-2024-5yr") as words a reader can place; anything else as-is. */
const surveyWord = (v: string): string => {
  const m = v.match(/^(\d{4})(?:-(\d{4}))?-(\d)yr$/);
  return m ? `ACS ${m[2] ? `${m[1]}–${m[2]}` : m[1]}, ${m[3]}-year` : v;
};

export function reachSourceText(s: Scene, sweep: Sweep | null): string {
  const v = sweep?.coverage?.vintages.reach.vintages;
  return v?.length ? t("reach.source", { vintages: listOf(v.map(surveyWord)), year: s.ev.curve.year }) : t("reach.sourceBare");
}

/** The masthead sentence for paper: who the numbers are for, from the household the curve was run for. */
export function whoText(s: Scene): string {
  const A = s.modeled;
  const ages = A.childAges;
  const place = s.stateName;
  if (!ages.length) return t("whoNoKids", { adults: A.married ? copy.adults.twoNoKids : copy.adults.oneNoKids, place });
  const kids = ages.length === 1 ? t("kidsOne", { age: ages[0] }) : t("kidsMany", { n: ages.length, ages: listOf(ages.map(String)) });
  return t("who", { adults: A.married ? copy.adults.two : copy.adults.one, kids, place });
}

export function hoursText(s: Scene): string | null {
  const w = s.ev.minWage;
  if (!w) return null;
  return t("hours.body", { state: s.stateName, wage: unitFigure(w.wage, "hour"), fullTime: s.m.money(Math.round(w.fullTimeEarnings / 500) * 500) });
}

/**
 * EligibilityBoundary (#23) under the key: where help with heating bills
 * stops, what it is worth if received, and the share of eligible families
 * the state served — "about N in 10", never this family's odds — then the
 * invitation to the toggle. With the toggle on, only that it was counted.
 */
export function boundaryText(s: Scene): string | null {
  const b = s.boundary;
  if (!b) return null;
  const { m } = s;
  if (b.counted) {
    const at = s.ev.curve.points.filter((p) => p.earnings <= b.earningsLimit).pop();
    return t("boundary.counted", { amount: m.about(at?.programs.liheap ?? 0), pay: m.payUnit(b.earningsLimit) });
  }
  let out = t("boundary.line", { pay: m.payUnit(b.earningsLimit), state: s.stateName });
  out += !b.topBand ? t("boundary.worthUnknown")
    : b.topBand.min === b.topBand.max ? t("boundary.worthFlat", { amount: m.money(b.topBand.min) })
    : t("boundary.worth", { min: m.money(b.topBand.min), max: m.money(b.topBand.max) });
  if (b.servedShare === null) out += t("boundary.served.unknown");
  else {
    const served = servedTenths(b.servedShare);
    out += served.kind === "some" ? t("boundary.served.some", { n: served.n }) : t(`boundary.served.${served.kind}`);
  }
  return out + t("boundary.invite");
}

/** The phrase for a cliff's first named program, for the chart's spoken label. */
export const worstPhrase = (s: Scene): string => (s.worst?.programsLost.length ? phrase(s.worst.programsLost[0]) : copy.chart.someHelp);
