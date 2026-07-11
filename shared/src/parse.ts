import { YEAR } from "./index.js";
import type { CurvePoint, ProgramId } from "./types.js";

export class PEParseError extends Error {}

type Entity = Record<string, Record<string, Record<string, unknown>>>;

const PERSON_PROGRAMS: Record<string, ProgramId> = {
  medicaid: "medicaid", chip: "chip", wic: "wic", ssi: "ssi",
  head_start: "headstart", early_head_start: "headstart",
};
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

function series(entity: Record<string, unknown>, variable: string, count: number): number[] {
  const v = (entity[variable] as Record<string, unknown> | undefined)?.[YEAR];
  if (!Array.isArray(v) || v.length !== count || v.some((x) => typeof x !== "number")) {
    throw new PEParseError(`bad series for ${variable}`);
  }
  return v as number[];
}

export function parsePEResponse(body: unknown, expectedCount: number): CurvePoint[] {
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

  const net = series(household, "household_net_income", expectedCount);

  const programSeries = new Map<ProgramId, number[]>();
  const add = (id: ProgramId, values: number[]) => {
    const existing = programSeries.get(id);
    programSeries.set(id, existing ? existing.map((x, i) => x + values[i]) : [...values]);
  };
  for (const [variable, id] of Object.entries(SPM_PROGRAMS)) add(id, series(spm, variable, expectedCount));
  for (const [variable, id] of Object.entries(TAX_PROGRAMS)) add(id, series(tax, variable, expectedCount));
  for (const person of Object.values(people)) {
    for (const [variable, id] of Object.entries(PERSON_PROGRAMS)) {
      if (person[variable]) add(id, series(person, variable, expectedCount));
    }
  }

  return net.map((n, i) => ({
    earnings: axis.min + step * i,
    netIncome: n,
    programs: Object.fromEntries(
      [...programSeries.entries()].map(([id, values]) => [id, values[i]]),
    ) as Record<ProgramId, number>,
  }));
}
