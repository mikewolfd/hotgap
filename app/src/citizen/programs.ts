// The program phrase table (design/inventory.md M3): one plain phrase per
// program id, gated (copy.ts), and the name the office uses, not gated. A
// sentence is composed from these — "{Phrase} ends. It is called {name}." —
// never inlined.
import type { ProgramId } from "@hotgap/core";
import { copy } from "./copy.js";

/** `name` as the office writes it; `called` as "It is called {called}." says it — a title takes its article, a proper noun does not. */
const NAME: Record<ProgramId, { name: string; called: string }> = {
  snap: { name: "SNAP", called: "SNAP" },
  medicaid: { name: "Medicaid", called: "Medicaid" },
  chip: { name: "CHIP", called: "CHIP" },
  eitc: { name: "Earned Income Tax Credit (EITC)", called: "the Earned Income Tax Credit (EITC)" },
  ctc: { name: "Child Tax Credit", called: "the Child Tax Credit" },
  aca: { name: "Premium tax credit", called: "the Premium tax credit" },
  tanf: { name: "TANF cash assistance", called: "TANF cash assistance" },
  housing: { name: "Housing voucher", called: "the Housing voucher" },
  wic: { name: "WIC", called: "WIC" },
  ssi: { name: "SSI", called: "SSI" },
  headstart: { name: "Head Start", called: "Head Start" },
  schoolmeals: { name: "School meals", called: "School meals" },
  childcare: { name: "CCDF child care subsidy", called: "the CCDF child care subsidy" },
};

export const phrase = (id: ProgramId): string => copy.program[id];
export const called = (id: ProgramId): string => NAME[id].called;
/** Programs whose phrase already names who holds it ("for kids", "for moms and babies"): the group template would say it twice. */
export const NAMES_ITS_GROUP: ReadonlySet<ProgramId> = new Set<ProgramId>(["chip", "wic"]);
/** The phrase without its article, for "Your own {noun}" / "Your kids' {noun}". */
export const noun = (id: ProgramId): string => phrase(id).replace(/^(a|an|the) /, "");
/** "food help (SNAP)", for the assumed list. */
export const phraseAndName = (id: ProgramId): string => `${phrase(id)} (${NAME[id].name})`;

/**
 * Help that is inside "money you keep" but never passes through the
 * household as cash (S6). Medicaid, CHIP and the premium credit are NOT
 * candidates: they are not in netIncome, so naming them here would
 * double-count.
 */
export const NONCASH: ("childcare" | "schoolmeals" | "headstart")[] = ["childcare", "schoolmeals", "headstart"];
