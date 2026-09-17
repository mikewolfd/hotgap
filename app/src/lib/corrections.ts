// CorrectionsApplied (inventory #18): coverage[state].corrections kept to
// applies === true, in one order, for the journalist's detail block and CSV
// and the caseworker's list (audit D9: one home, so the caseworker page no
// longer ships the journalist's model). The note is printed as core wrote
// it; the published source it was read from (an override's `source`, another
// correction's `cite`) is the cite's link; core's `code` pointer is not a
// reader's fact and is not shown. Program names are the `name` register (M3).
// `note` is rendered in the active language from the code core sent beside
// it (lib/copy.ts coreText), the English as the fallback.
import type { StateCorrections } from "@hotgap/core";
import { catalog, coreText, fill } from "./copy.js";
import { programName } from "./names.js";

/** The labels this module puts on a corrected program, shared by the caseworker's list and the journalist's block. */
const P = catalog.shared.correctionProgram;

export interface CorrectionRow {
  program: string;
  /** The `source` word for the chip, or null where the correction carries none (coverageGap, maTafdc). */
  source: string | null;
  note: string;
  href?: string;
}

/** A policy override's program, from its parameter path, in the active language (`shared.correctionProgram`); a path neither branch knows is the path's own last two words, a machine's name for a machine's parameter. */
const overrideProgram = (parameter: string): string =>
  /medicaid\..*parent/.test(parameter) ? fill(P.parentIncomeLimit, { program: programName("medicaid") })
  : /basic_health_program/.test(parameter) ? P.basicHealthProgram
  : parameter.split(".").slice(-2).join(" ");

/** The `source` word in the active language: core's value is the key (`shared.correctionSource`), so a value the catalog lacks prints as core sent it. */
export const sourceWord = (source: string): string => (catalog.shared.correctionSource as Record<string, string>)[source] ?? source;

export function correctionRows(c: StateCorrections | undefined): CorrectionRow[] {
  if (!c) return [];
  const rows: CorrectionRow[] = c.policyOverrides.map((o) => ({ program: overrideProgram(o.parameter), source: "overridden", note: coreText(o.message, o.note), href: o.source }));
  if (c.maTafdc.applies) rows.push({ program: programName("tanf"), source: null, note: coreText(c.maTafdc.message, c.maTafdc.note), href: c.maTafdc.cite });
  /* The state's own program is a name and stays as the coverage block wrote it ("ConnectorCare", "Cascade Care Savings"); only the fallback, where the block named none, is a phrase to translate (M3). */
  if (c.premiumAssistance.applies) rows.push({ program: c.premiumAssistance.program ?? P.premiumHelp, source: c.premiumAssistance.source, note: coreText(c.premiumAssistance.message, c.premiumAssistance.note), href: c.premiumAssistance.cite });
  if (c.childcareSubsidy.applies) rows.push({ program: programName("childcare"), source: c.childcareSubsidy.source, note: coreText(c.childcareSubsidy.message, c.childcareSubsidy.note) });
  if (c.coverageGap.applies) rows.push({ program: fill(P.coverageGap, { program: programName("aca") }), source: null, note: coreText(c.coverageGap.message, c.coverageGap.note) });
  return rows;
}
