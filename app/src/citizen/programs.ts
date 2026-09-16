// The program phrase table (design/inventory.md M3): one plain phrase per
// program id, gated (copy.ts), and the name the office uses, not gated. A
// sentence is composed from these — "{Phrase} ends. It is called {name}." —
// never inlined.
import type { ProgramId } from "@hotgap/core";
import { copy } from "./copy.js";

/** "It is called {name}": a name that is a title, not a proper noun, takes "the". */
const NAME: Record<ProgramId, { name: string; the?: true }> = {
  snap: { name: "SNAP" },
  medicaid: { name: "Medicaid" },
  chip: { name: "CHIP" },
  eitc: { name: "Earned Income Tax Credit (EITC)", the: true },
  ctc: { name: "Child Tax Credit", the: true },
  aca: { name: "Premium tax credit", the: true },
  tanf: { name: "TANF cash assistance" },
  housing: { name: "Housing voucher", the: true },
  wic: { name: "WIC" },
  ssi: { name: "SSI" },
  headstart: { name: "Head Start" },
  schoolmeals: { name: "School meals" },
  childcare: { name: "CCDF child care subsidy", the: true },
};

export const phrase = (id: ProgramId): string => copy.program[id];
export const called = (id: ProgramId): string => (NAME[id].the ? "the " : "") + NAME[id].name;
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
