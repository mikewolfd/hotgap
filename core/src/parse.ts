import type { MaTafdcInputs } from "./maTafdc.js";
import { STATE_PREMIUM_ASSISTANCE } from "./statePremiumAssistance.js";
import { childcareSubsidyInNetIncome } from "./stateChildcareSubsidies.js";
import { CASH_PROGRAMS, YEAR, type CurvePoint, type ProgramId } from "./types.js";

export class PEParseError extends Error {}

type Entity = Record<string, Record<string, Record<string, unknown>>>;

const PERSON_PROGRAMS: Record<string, ProgramId> = {
  medicaid: "medicaid", chip: "chip", wic: "wic", ssi: "ssi",
  head_start: "headstart", early_head_start: "headstart",
};
/** The programs PolicyEngine reports per person, so they can be split by age. */
export const PERSON_LEVEL_PROGRAMS: ProgramId[] = [...new Set(Object.values(PERSON_PROGRAMS))];

const SPM_PROGRAMS: Record<string, ProgramId> = {
  snap: "snap", tanf: "tanf", spm_unit_capped_housing_subsidy: "housing",
  free_school_meals: "schoolmeals", reduced_price_school_meals: "schoolmeals",
};
const TAX_PROGRAMS: Record<string, ProgramId> = {
  eitc: "eitc", refundable_ctc: "ctc", premium_tax_credit: "aca",
};

function firstEntity(group: unknown, label: string): Record<string, Record<string, unknown>> {
  if (typeof group !== "object" || group === null) throw new PEParseError(`missing ${label}`);
  const first = Object.values(group as Entity)[0];
  if (!first) throw new PEParseError(`empty ${label}`);
  return first;
}

/**
 * The household's state, echoed back by PolicyEngine. `state_name` is always an
 * input (translate.ts sends it), so it comes back as a scalar string rather
 * than a series. Read here rather than passed in, so parsing stays a pure
 * function of the response — and so a curve replayed from disk carries its own
 * state with it.
 */
function stateOf(household: Record<string, unknown>): string {
  const v = (household.state_name as Record<string, unknown> | undefined)?.[YEAR];
  if (typeof v === "string") return v;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0];
  throw new PEParseError("missing state_name");
}

function series(entity: Record<string, unknown>, variable: string, count: number): number[] {
  const v = (entity[variable] as Record<string, unknown> | undefined)?.[YEAR];
  // A take-up override forces a program's value to a scalar (e.g. head_start: 0
  // when the family does not receive it). PolicyEngine returns a forced scalar
  // input as-is instead of broadcasting it across the earnings axis, so a
  // single number is valid here — hold it constant across all points. `age` is
  // always a scalar for the same reason: the axis varies employment income only.
  if (typeof v === "number") return new Array(count).fill(v);
  if (!Array.isArray(v) || v.length !== count || v.some((x) => typeof x !== "number")) {
    throw new PEParseError(`bad series for ${variable}`);
  }
  return v as number[];
}

export interface ParseOptions {
  /**
   * Whether the model that produced `body` counts Massachusetts TAFDC twice
   * (in `household_benefits` via TANF and again in `household_state_benefits`;
   * policyengine-us #9470, fixed in 2.4.4). Default false: every stored
   * fixture is from a fixed model (fixtures/README.md), and the removal
   * would otherwise eat an equal amount of whatever else fills
   * `household_state_benefits`. client.ts probes the live endpoint — the
   * public API still double-counted as of 2026-09 — and passes its answer.
   */
  maTafdcDoubleCounted?: boolean;
}

export function parsePEResponse(body: unknown, expectedCount: number, opts: ParseOptions = {}): CurvePoint[] {
  const maTafdcDoubleCounted = opts.maTafdcDoubleCounted ?? false;
  const b = body as { status?: string; result?: Record<string, unknown> };
  if (b?.status !== "ok" || !b.result) {
    throw new PEParseError(`PolicyEngine error: ${(b as { message?: string })?.message ?? "unknown"}`);
  }
  const r = b.result;

  const axes = r.axes as Array<Array<{ min: number; max: number; count: number }>> | undefined;
  const axis = axes?.[0]?.[0];
  if (!axis || axis.count !== expectedCount) throw new PEParseError("missing or mismatched axes");
  const step = (axis.max - axis.min) / (axis.count - 1);

  const household = firstEntity(r.households, "households");
  const spm = firstEntity(r.spm_units, "spm_units");
  const tax = firstEntity(r.tax_units, "tax_units");
  const people = r.people as Entity | undefined;
  if (!people) throw new PEParseError("missing people");

  const rawNet = series(household, "household_net_income", expectedCount);
  // Count the real cost of health coverage the household bears: SPM medical
  // out-of-pocket = health-insurance premiums NET of the ACA premium tax
  // credit. PolicyEngine leaves this out of household_net_income, and the PTC
  // is not inside household_net_income either — it is not one of the
  // household_refundable_tax_credits (pinned live by the contract test) — so
  // money left after paying for health is simply net income minus MOOP.
  // Subtracting the PTC as well, as this code did until 2026-09-14, erased
  // the subsidy and charged every household the gross premium.
  const moop = series(spm, "spm_unit_medical_out_of_pocket_expenses", expectedCount);
  const net = rawNet.map((n, i) => n - moop[i]);

  const programSeries = new Map<ProgramId, number[]>();
  const childSeries = new Map<ProgramId, number[]>();
  const add = (into: Map<ProgramId, number[]>, id: ProgramId, values: number[]) => {
    const existing = into.get(id);
    into.set(id, existing ? existing.map((x, i) => x + values[i]) : [...values]);
  };
  for (const [variable, id] of Object.entries(SPM_PROGRAMS)) add(programSeries, id, series(spm, variable, expectedCount));
  // The state child-care subsidy, asked for only when the household claims it
  // (translate.ts), so absent on every other curve — including every committed
  // archetype — where it is simply 0.
  if ("child_care_subsidies" in spm) add(programSeries, "childcare", series(spm, "child_care_subsidies", expectedCount));
  for (const [variable, id] of Object.entries(TAX_PROGRAMS)) add(programSeries, id, series(tax, variable, expectedCount));
  for (const person of Object.values(people)) {
    // Who is a child comes from the person's own `age`, never from the key:
    // PolicyEngine echoes back whatever names the caller used, which is
    // "child1…" from translate.ts but "your first dependent" in anything
    // built by PolicyEngine's own web app.
    const isChild = series(person, "age", expectedCount)[0] < 18;
    for (const [variable, id] of Object.entries(PERSON_PROGRAMS)) {
      if (!person[variable]) continue;
      const values = series(person, variable, expectedCount);
      add(programSeries, id, values);
      if (isChild) add(childSeries, id, values);
    }
  }

  // household_benefits is what PolicyEngine counts as benefit income for the
  // household. Verified live 2026-09-14 that for a household whose only
  // benefits are the ones we track it equals their sum to the dollar (so the
  // remainder is a true untracked residual, not an offset), that Medicaid and
  // CHIP sticker values are NOT in it, and that it DOES carry SSDI, child
  // support and unemployment compensation when those are inputs — a household
  // with those therefore carries a constant floor here, which cancels in any
  // step-to-step difference. Absent from curves fetched before we asked for
  // it, in which case the remainder is simply 0.
  const benefits = "household_benefits" in household
    ? series(household, "household_benefits", expectedCount)
    : null;
  // `otherBenefits` is household_benefits minus what we name. The child-care
  // subsidy is only inside household_benefits in the 23 states listed in
  // `gov.household.household_state_benefits` (policyengine-us #9405); taking
  // it out anywhere else would eat an equal amount of some OTHER untracked
  // benefit — or floor the remainder at 0 and hide it.
  // `stateOf` is only consulted when there IS a subsidy to place, so a body
  // that never asked for one — every synthetic fixture, every curve swept
  // before this — does not have to carry a state to parse.
  const subsidyIsCounted = programSeries.has("childcare") && childcareSubsidyInNetIncome(stateOf(household));
  const trackedCash = (i: number) =>
    CASH_PROGRAMS.reduce(
      (sum, id) => (id === "childcare" && !subsidyIsCounted ? sum : sum + (programSeries.get(id)?.[i] ?? 0)),
      0,
    );

  // Refundable STATE credits — Colorado's child tax credit and family
  // affordability credit, California's CalEITC, and their kin. They sit inside
  // household_refundable_tax_credits, which sits inside household_net_income,
  // so they were real money falling out of a cliff with nothing to explain it:
  // before 2026-09-15 every dollar of them landed in the breakdown's
  // unattributed `other`.
  //
  // Verified live 2026-09-15 on a Colorado single parent of three (ages 3, 7,
  // 10): at $25,000, household_refundable_tax_credits $21,648 less eitc $7,997
  // and refundable_ctc $3,375 leaves $10,276, and the federal pair matches
  // PolicyEngine's own income_tax_refundable_credits ($11,372) to the cent —
  // so the remainder is exactly the state's share. It drops $1,215 over the
  // single step from $26,000 to $27,000.
  //
  // The remainder is NOT the premium tax credit and NOT a benefit, so it
  // double-counts nothing: at $100,000 the same household's PTC is $6,450
  // while the remainder is $25, and household_benefits is a separate term of
  // the net-income identity from household_refundable_tax_credits (which is
  // why otherBenefits, built from household_benefits, cannot contain it).
  const refundable = "household_refundable_tax_credits" in household
    ? series(household, "household_refundable_tax_credits", expectedCount)
    : null;
  const stateCredits = (i: number) => {
    if (!refundable) return 0;
    const federal = (programSeries.get("eitc")?.[i] ?? 0) + (programSeries.get("ctc")?.[i] ?? 0);
    // Float noise around a difference that is zero in most states can only go
    // negative by fractions of a cent; floor it rather than report a negative.
    return Math.max(0, refundable[i] - federal);
  };

  // The whole child tax credit, kept apart from programs.ctc (the refundable
  // part). Absent from curves fetched before we asked for it, where the
  // refundable series is all we know.
  const totalCtc = "ctc" in tax ? series(tax, "ctc", expectedCount) : null;
  // Present only when the endpoint was asked for it (translate.ts, on the
  // client's probe); `stateOf` is consulted only if the state has one.
  const assistance = STATE_PREMIUM_ASSISTANCE.find((s) => s.variable in tax) ?? null;
  const stateAssistance = assistance && assistance.state === stateOf(household) ? series(tax, assistance.variable, expectedCount) : null;

  const at = (source: Map<ProgramId, number[]>, i: number) =>
    Object.fromEntries([...source.entries()].map(([id, values]) => [id, values[i]]));

  let maTafdc: MaTafdcInputs[] | undefined;
  if ("ma_tafdc_payment_standard" in spm) {
    const standard = series(spm, "ma_tafdc_payment_standard", expectedCount);
    const unearned = series(spm, "ma_tafdc_countable_unearned_income", expectedCount);
    const care = series(spm, "ma_tafdc_dependent_care_deduction", expectedCount);
    // A double-counting model includes ma_tafdc in household_state_benefits
    // AND tanf in household_benefits. Retain the overlap for local removal
    // from both net income and the otherwise-unexplained otherBenefits
    // remainder. The overlap is a floor, not a detection (other state
    // benefits can fill household_state_benefits too), so it is only taken
    // when the caller knows the model double-counts.
    const tafdc = series(spm, "ma_tafdc", expectedCount);
    const stateBenefits = series(household, "household_state_benefits", expectedCount);
    const eligible = spm.ma_tafdc_non_financial_eligible?.[YEAR];
    const flags = typeof eligible === "boolean" ? new Array(expectedCount).fill(eligible) : eligible;
    if (!Array.isArray(flags) || flags.length !== expectedCount || flags.some((v) => typeof v !== "boolean")) {
      throw new PEParseError("bad series for ma_tafdc_non_financial_eligible");
    }
    const sumPeople = (variable: string) => Object.values(people).reduce(
      (sum, person) => series(person, variable, expectedCount).map((v, i) => v + sum[i]), new Array(expectedCount).fill(0) as number[],
    );
    const clothing = sumPeople("ma_tafdc_clothing_allowance");
    const infant = sumPeople("ma_tafdc_infant_benefit");
    maTafdc = standard.map((paymentStandard, i) => ({
      paymentStandard, nonFinancialEligible: flags[i], unearnedIncome: unearned[i],
      dependentCareDeduction: care[i], clothingAllowance: clothing[i], infantBenefit: infant[i],
      duplicatedTanf: maTafdcDoubleCounted ? Math.min(tafdc[i], programSeries.get("tanf")![i], stateBenefits[i]) : 0,
      engineUsedCorrectedGrant: false,
    }));
    if (maTafdc.some((inputs) => Object.values(inputs).some((v) => typeof v === "number" && (!Number.isFinite(v) || v < 0)))) {
      throw new PEParseError("invalid Massachusetts TAFDC inputs");
    }
  }

  return net.map((n, i) => ({
    ...(maTafdc ? { maTafdc: maTafdc[i] } : {}),
    earnings: axis.min + step * i,
    netIncome: n,
    medicalOOP: moop[i],
    ...(stateAssistance ? { statePremiumAssistance: stateAssistance[i] } : {}),
    programs: at(programSeries, i) as Record<ProgramId, number>,
    childPrograms: at(childSeries, i) as Partial<Record<ProgramId, number>>,
    // Float noise around an identity that holds exactly can only go negative
    // by fractions of a cent, so floor it rather than report a negative benefit.
    otherBenefits: benefits ? Math.max(0, benefits[i] - trackedCash(i)) : 0,
    stateCredits: stateCredits(i),
    totalCtc: totalCtc ? totalCtc[i] : (programSeries.get("ctc")?.[i] ?? 0),
    coverageGap: false,
  }));
}
