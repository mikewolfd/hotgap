// The CSV a reporter downloads: the table's rows in the table's order, plus
// the provenance a number needs to travel — the run stamp, the model that
// produced it, and the vintages behind each state's curve, all read from
// summary.json. RFC 4180 quoting; a UTF-8 byte-order mark so a spreadsheet
// keeps the dashes in core's notes. Column headers are a machine contract
// and stay English (app/README.md § Languages); the header order is printed
// in the method panel's download line.
import { STATE_NAMES, type SummaryJson } from "@hotgap/core";
import { fill } from "../lib/copy.js";
import { correctionRows } from "../lib/corrections.js";
import { listOf } from "../lib/format.js";
import { programName } from "../lib/programs.js";
import { copy } from "./copy.js";
import { archLabel, type Archetype, type StateRow } from "./model.js";
import { modelLabel } from "./words.js";

export const CSV_HEADER = [
  "state", "state_name", "archetype_id", "archetype",
  "biggest_one_step_loss", "biggest_loss_at", "biggest_loss_programs", "danger_zone_width", "leap", "safe_exit", "cliff_count", "deferred_cliff_count",
  "leap_is_lower_bound", "no_cliff_found", "comparable", "figures", "unmodeled_programs", "corrections_applied", "childcare_subsidy_footing", "liheap_limit", "liheap_served_share",
  "county_name", "county_fips", "rent_vintage", "county_vintage", "childcare_price_vintage",
  "policy_year", "sweep_generated", "model_label", "model_endpoint", "model_version", "source",
] as const;

/** One field, quoted only when it has to be (a comma, a quote, a line break). */
export const csvField = (v: unknown): string => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/**
 * The rows as the table shows them: a no-cliff row leaves the dollar
 * measures empty (the table prints "none", never $0 — inventory #15) and
 * says so in `no_cliff_found`; a past-the-axis safe exit is empty with
 * `leap_is_lower_bound` set; the counts are always numbers; `figures`
 * carries the table's own floor wording for an incomplete row (S5); the
 * worst step's earnings and programs ride beside its figure (B3) and the
 * county is named, not only dated (B4); the child-care subsidy's footing
 * rides on every row, so two states compare without a click (rerun S4).
 */
export function csvFor(summary: SummaryJson, a: Archetype, rows: StateRow[]): string {
  const label = archLabel(a);
  const lines = [CSV_HEADER.join(",")];
  for (const r of rows) {
    const { m } = r, cov = summary.coverage?.[r.st], v = cov?.vintages;
    const none = r.kind === "none";
    const dollars = (x: number | null) => (none || x === null ? "" : x);
    const missing = r.incomplete.map((u) => u.program);
    lines.push([
      r.st, STATE_NAMES[r.st] ?? r.st, a.id, label,
      dollars(m.biggestLoss), dollars(m.biggestLossAt), m.biggestLossPrograms.map(programName).join("; "),
      dollars(m.dangerWidth), dollars(m.leap), dollars(m.safeExit),
      m.cliffCount, m.deferredCliffCount,
      m.leapIsLowerBound, none, r.kind === "shaded", missing.length ? fill(copy.table.floor, { programs: listOf(missing) }) : copy.table.complete,
      missing.join("; "),
      correctionRows(cov?.corrections).map((c) => `${c.program}: ${c.source ?? copy.detail.applied}`).join("; "),
      cov ? (cov.corrections.childcareSubsidy.source === "added by HotGap" ? copy.csv.subsidy.added : copy.csv.subsidy.inNetIncome) : "",
      /* EligibilityBoundary (#23): the heating limit in words and the served share as a fraction, both the block's — empty where the profile was not read (Hawaii), never a number. */
      cov?.liheap?.limitKind ?? "", cov?.liheap?.servedShare ?? "",
      v?.county.name ?? "", v?.county.fips ?? "",
      v?.rent.vintage ?? "", v?.county.vintage ?? "", v?.childcare.preschool ?? "",
      summary.year, summary.generated, modelLabel(summary.model), summary.model?.endpoint ?? "", summary.model?.version ?? "",
      "HotGap/PolicyEngine",
    ].map(csvField).join(","));
  }
  return "﻿" + lines.join("\r\n") + "\r\n";
}

/** Named by the household as the reader knows it, not by the archetype id (N7), and the run's ISO date — a file name is a machine contract: "hotgap-1-adult-2-children-3-and-7-2026-09-16.csv". */
export const csvName = (a: Archetype, generated: string): string =>
  `hotgap-${archLabel(a).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${generated.slice(0, 10)}.csv`;
