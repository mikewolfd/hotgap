// CorrectionsApplied (inventory #18): coverage[state].corrections kept to
// applies === true, in one order, for the journalist's detail block and CSV
// and the caseworker's list (audit D9: one home, so the caseworker page no
// longer ships the journalist's model). The note is printed as core wrote
// it; the published source it was read from (an override's `source`, another
// correction's `cite`) is the cite's link; core's `code` pointer is not a
// reader's fact and is not shown. Program names are the `name` register (M3).
import type { StateCorrections } from "@hotgap/core";
import { programName } from "./names.js";

export interface CorrectionRow {
  program: string;
  /** The `source` word for the chip, or null where the correction carries none (coverageGap, maTafdc). */
  source: string | null;
  note: string;
  href?: string;
}

/** A policy override's program, from its parameter path. */
const overrideProgram = (parameter: string): string =>
  /medicaid\..*parent/.test(parameter) ? `${programName("medicaid")} — parent income limit`
  : /basic_health_program/.test(parameter) ? "Basic Health Program — expanded-limit states"
  : parameter.split(".").slice(-2).join(" ");

export function correctionRows(c: StateCorrections | undefined): CorrectionRow[] {
  if (!c) return [];
  const rows: CorrectionRow[] = c.policyOverrides.map((o) => ({ program: overrideProgram(o.parameter), source: "overridden", note: o.note, href: o.source }));
  if (c.maTafdc.applies) rows.push({ program: programName("tanf"), source: null, note: c.maTafdc.note, href: c.maTafdc.cite });
  if (c.premiumAssistance.applies) rows.push({ program: c.premiumAssistance.program ?? "State premium help", source: c.premiumAssistance.source, note: c.premiumAssistance.note, href: c.premiumAssistance.cite });
  if (c.childcareSubsidy.applies) rows.push({ program: programName("childcare"), source: c.childcareSubsidy.source, note: c.childcareSubsidy.note });
  if (c.coverageGap.applies) rows.push({ program: `${programName("aca")} — coverage gap`, source: null, note: c.coverageGap.note });
  return rows;
}
