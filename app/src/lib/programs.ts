// Program names (design/inventory.md M3): the `name` register — what the
// office calls a program, which the caseworker and journalist surfaces print
// and the citizen surface names after its plain phrase ("It is called
// SNAP"). Not gated: the inventory says a name is the office's. The plain
// phrases are citizen copy and live with it (app/src/citizen/copy.ts, gated
// by scripts/readability.mjs). A page never inlines a program phrasing.
import type { ProgramId } from "@hotgap/core";

const NAME: Record<ProgramId, string> = {
  snap: "SNAP",
  medicaid: "Medicaid",
  chip: "CHIP",
  eitc: "Earned Income Tax Credit (EITC)",
  ctc: "Child Tax Credit",
  aca: "Premium tax credit",
  tanf: "TANF cash assistance",
  housing: "Housing voucher",
  wic: "WIC",
  ssi: "SSI",
  headstart: "Head Start",
  schoolmeals: "School meals",
  childcare: "CCDF child care subsidy",
  liheap: "LIHEAP energy assistance",
};

export const programName = (id: ProgramId): string => NAME[id];
