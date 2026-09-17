// The program phrase table (design/inventory.md M3): one plain phrase per
// program id, gated (copy.ts), and the name the office uses, not gated
// (lib/programs.ts, the one table every surface reads). A sentence is
// composed from these — "{Phrase} ends. It is called {name}." — never inlined.
import type { ProgramId } from "@hotgap/core";
import { programName } from "../lib/programs.js";
import { copy } from "./copy.js";

/** The name as "It is called {called}." says it — a title takes its article, a proper noun does not; LIHEAP is called by its acronym alone. */
const CALLED: Partial<Record<ProgramId, string>> = {
  eitc: "the Earned Income Tax Credit (EITC)",
  ctc: "the Child Tax Credit",
  aca: "the Premium tax credit",
  housing: "the Housing voucher",
  childcare: "the CCDF child care subsidy",
  liheap: "LIHEAP",
};

export const phrase = (id: ProgramId): string => copy.program[id];
export const called = (id: ProgramId): string => CALLED[id] ?? programName(id);
/** Programs whose phrase already names who holds it ("for kids", "for moms and babies"): the group template would say it twice. */
export const NAMES_ITS_GROUP: ReadonlySet<ProgramId> = new Set<ProgramId>(["chip", "wic"]);
/** The phrase without its article, for "Your own {noun}" / "Your kids' {noun}". */
export const noun = (id: ProgramId): string => phrase(id).replace(/^(a|an|the) /, "");
/** "food help (SNAP)", for the assumed list. */
export const phraseAndName = (id: ProgramId): string => `${phrase(id)} (${programName(id)})`;

/**
 * Help that is inside "money you keep" but never passes through the
 * household as cash (S6). Medicaid, CHIP and the premium credit are NOT
 * candidates: they are not in netIncome, so naming them here would
 * double-count.
 */
export const NONCASH: ("childcare" | "schoolmeals" | "headstart" | "liheap")[] = ["childcare", "schoolmeals", "headstart", "liheap"];
