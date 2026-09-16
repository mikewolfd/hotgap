// The CSV a reporter downloads: the table's rows in the table's order, plus
// the provenance a number needs to travel — the sweep stamp, the model that
// produced it, and the vintages behind each state's curve, all read from
// summary.json. RFC 4180 quoting; a UTF-8 byte-order mark so a spreadsheet
// keeps the dashes in core's notes.
import type { SummaryJson } from "@hotgap/core";
import { STATE_NAMES } from "../../../core/src/states.js";
import { archLabel, correctionRows, type Archetype, type StateRow } from "./model.js";
import { dateOf } from "./format.js";

export const CSV_HEADER = [
  "state", "state_name", "archetype_id", "archetype",
  "biggest_one_step_loss", "danger_zone_width", "leap", "safe_exit", "cliff_count", "deferred_cliff_count",
  "leap_is_lower_bound", "no_cliff_found", "comparable", "figures", "unmodeled_programs", "corrections_applied",
  "rent_vintage", "county_vintage", "childcare_price_vintage", "reach_vintages",
  "policy_year", "sweep_generated", "model_endpoint", "model_version", "source",
] as const;

/** One field, quoted only when it has to be (a comma, a quote, a line break). */
export const csvField = (v: unknown): string => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/**
 * The rows as the table shows them: a no-cliff row leaves the four dollar
 * measures empty (the table prints "none", never $0 — inventory #15) and
 * says so in `no_cliff_found`; a past-the-axis safe exit is empty with
 * `leap_is_lower_bound` set; the counts are always numbers.
 */
export function csvFor(summary: SummaryJson, a: Archetype, rows: StateRow[]): string {
  const label = archLabel(a);
  const lines = [CSV_HEADER.join(",")];
  for (const r of rows) {
    const { m } = r, cov = summary.coverage?.[r.st], v = cov?.vintages;
    const none = r.kind === "none";
    const dollars = (x: number | null) => (none || x === null ? "" : x);
    lines.push([
      r.st, STATE_NAMES[r.st] ?? r.st, a.id, label,
      dollars(m.biggestLoss), dollars(m.dangerWidth), dollars(m.leap), dollars(m.safeExit),
      m.cliffCount, m.deferredCliffCount,
      m.leapIsLowerBound, none, r.kind === "shaded", r.incomplete.length ? "incomplete" : "complete",
      r.incomplete.map((u) => u.program).join("; "),
      correctionRows(cov?.corrections).map((c) => `${c.program}: ${c.source ?? "applied"}`).join("; "),
      v?.rent.vintage ?? "", v?.county.vintage ?? "", v?.childcare.preschool ?? "", v?.reach.vintages.join("; ") ?? "",
      summary.year, summary.generated, summary.model?.endpoint ?? "", summary.model?.version ?? "",
      "HotGap/PolicyEngine",
    ].map(csvField).join(","));
  }
  return "﻿" + lines.join("\r\n") + "\r\n";
}

export const csvName = (a: Archetype, generated: string): string => `hotgap-${a.id}-${dateOf(generated)}.csv`;
