// Program phrases (design/inventory.md M3): one table, two registers, the
// thirteen ids core knows. `phrase` is citizen copy (gated) and composes
// "{Phrase} ends. It is called {name}."; `name` is what the office calls it
// and is what the caseworker and journalist surfaces print. A page never
// inlines a program phrasing.
import type { ProgramId } from "@hotgap/core";

export const PROGRAMS: Record<ProgramId, { phrase: string; name: string }> = {
  snap: { phrase: "food help", name: "SNAP" },
  medicaid: { phrase: "a free state health plan", name: "Medicaid" },
  chip: { phrase: "a health plan for kids", name: "CHIP" },
  eitc: { phrase: "a tax break for workers", name: "Earned Income Tax Credit (EITC)" },
  ctc: { phrase: "the child tax break", name: "Child Tax Credit" },
  aca: { phrase: "help paying for health insurance", name: "Premium tax credit" },
  tanf: { phrase: "cash help", name: "TANF cash assistance" },
  housing: { phrase: "housing help", name: "Housing voucher" },
  wic: { phrase: "food help for moms and babies", name: "WIC" },
  ssi: { phrase: "SSI cash help", name: "SSI" },
  headstart: { phrase: "free early learning", name: "Head Start" },
  schoolmeals: { phrase: "free school meals", name: "School meals" },
  childcare: { phrase: "child care help", name: "CCDF child care subsidy" },
  liheap: { phrase: "help with heating bills", name: "LIHEAP energy assistance" },
};

export const programName = (id: ProgramId): string => PROGRAMS[id].name;
export const programPhrase = (id: ProgramId): string => PROGRAMS[id].phrase;
