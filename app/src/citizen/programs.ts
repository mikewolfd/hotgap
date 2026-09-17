// The program phrase table (design/inventory.md M3): one plain phrase per
// program id, gated (`citizen.program.*`), and the name the office uses, not
// gated (`shared.program.*`, lib/names.ts, the one table every surface
// reads). A sentence is composed from these — "{Phrase} ends. It is called
// {name}." — never inlined; the forms a sentence needs are their own tables
// in the locale file, never derived from the phrase by code.
import type { ProgramId } from "@hotgap/core";
import { programName } from "../lib/names.js";
import { copy, t } from "./copy.js";

export const phrase = (id: ProgramId): string => copy.program[id];
/** The name as "It is called {called}." says it — a title takes its article, a proper noun does not; LIHEAP is called by its acronym alone (`citizen.called.*`, the six that differ from the name). */
export const called = (id: ProgramId): string => (copy.called as Partial<Record<ProgramId, string>>)[id] ?? programName(id);
/** Programs whose phrase already names who holds it ("for kids", "for moms and babies"): the group template would say it twice. */
export const NAMES_ITS_GROUP: ReadonlySet<ProgramId> = new Set<ProgramId>(["chip", "wic"]);
/** The phrase without its article, for "Your own {noun}" / "Your kids' {noun}" (`citizen.noun.*`). */
export const noun = (id: ProgramId): string => copy.noun[id];
/** "food help (SNAP)", for the assumed list. */
export const phraseAndName = (id: ProgramId): string => t("phraseAndName", { phrase: phrase(id), name: programName(id) });

/**
 * Help that is inside "money you keep" but never passes through the
 * household as cash (S6). Medicaid, CHIP and the premium credit are NOT
 * candidates: they are not in netIncome, so naming them here would
 * double-count.
 */
export const NONCASH: ("childcare" | "schoolmeals" | "headstart" | "liheap")[] = ["childcare", "schoolmeals", "headstart", "liheap"];
