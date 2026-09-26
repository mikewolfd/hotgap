// The CSV a reporter downloads: the table's rows in the table's order, plus
// the provenance a number needs to travel — the run stamp, the model that
// produced it, and the vintages behind each state's curve, all read from
// summary.json. RFC 4180 quoting; a UTF-8 byte-order mark so a spreadsheet
// keeps the dashes in core's notes. Column headers are a machine contract
// and stay English (app/README.md § Languages); the header order is printed
// in the method panel's download line.
import type { SummaryJson } from "@hotgap/core";
import { fill, limitWords } from "../lib/copy.js";
import { correctionRows, sourceWord } from "../lib/corrections.js";
import { unmodeledName } from "../lib/coverage.js";
import { listOf } from "../lib/format.js";
import { programName, stateName } from "../lib/names.js";
import { copy } from "./copy.js";
import { archLabel, positionAt, type Archetype, type StateRow } from "./model.js";
import { modelLabel } from "./words.js";

/*
 * The road's six figures and the four positions are APPENDED, not slotted in
 * beside the columns they belong with, and that is deliberate: this file is
 * already downloaded and a column's index is part of what a reporter's script
 * holds. Reading order loses; every existing index stays where it was.
 * `keep_rate_cents` is signed whole cents (-56 is 56 cents poorer per extra
 * dollar), because a spreadsheet should sort it without parsing a word; the
 * page says "loses 56¢" and core's `keepRateWords` owns that wording.
 * A position is 0-100 to one decimal, and EMPTY where the survey cell cannot
 * support it — never 0, which would read as "nobody earns less".
 * `keep_rate_to_line_cents` came after them, appended by the same rule: the
 * keep rate measured to exactly twice poverty, without the road's last step.
 * `net_at_road_lo` and `net_at_road_hi` came next, by the same rule: the
 * level beside the slope, net income in whole dollars at each end of the road.
 * `keep_rate_wide_cents`, `road_wide_hi` and `deepest_fall` came last (blind
 * review R3, 2026-09-26): the keep rate measured on to 220% of the poverty
 * line and the earnings it runs to, and how far below its poverty-line income
 * the family falls on the road, whole dollars, 0 where it never dips.
 * The three counts left the page's Measure menu the same day (R5, R6) and
 * stay here, where they describe a state: a file's columns are a contract.
 */
export const CSV_HEADER = [
  "state", "state_name", "archetype_id", "archetype",
  "biggest_one_step_loss", "biggest_loss_at", "biggest_loss_programs", "danger_zone_width", "leap", "safe_exit", "cliff_count", "deferred_cliff_count",
  "leap_is_lower_bound", "no_cliff_found", "comparable", "figures", "unmodeled_programs", "corrections_applied", "childcare_subsidy_footing", "liheap_limit", "liheap_served_share",
  "county_name", "county_fips", "rent_vintage", "county_vintage", "childcare_price_vintage",
  "policy_year", "sweep_generated", "model_label", "model_endpoint", "model_version", "source",
  "keep_rate_cents", "road_lo", "road_hi", "road_cliff_count", "road_worst_drop", "road_worst_at", "road_worst_programs",
  "road_worst_position", "biggest_loss_position", "safe_exit_position", "families_below_road_top",
  "keep_rate_to_line_cents", "net_at_road_lo", "net_at_road_hi",
  "keep_rate_wide_cents", "road_wide_hi", "deepest_fall",
] as const;

/** One field, quoted only when it has to be (a comma, a quote, a line break). */
export const csvField = (v: unknown): string => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** A position as the file carries it: 0–100 to one decimal, empty where the survey cannot support the cell. */
const position = (n: number | null): number | string => (n === null ? "" : Math.round(n * 10) / 10);

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
    /* "This state has no cliff anywhere" is the CELL's fact, read from the
       metrics — not the row's tile state, which follows whichever measure the
       table is ordered by and, since the keep rate became the default, no
       longer lifts a no-cliff state out at all. Reading the tile state here
       printed New Mexico's $0 safe exit as a figure and then looked up how
       many families earn less than $0. */
    const none = m.cliffCount === 0;
    const dollars = (x: number | null) => (none || x === null ? "" : x);
    const missing = r.incomplete.map(unmodeledName);
    lines.push([
      r.st, stateName(r.st), a.id, label,
      dollars(m.biggestLoss), dollars(m.biggestLossAt), m.biggestLossPrograms.map(programName).join("; "),
      dollars(m.dangerWidth), dollars(m.leap), dollars(m.safeExit),
      m.cliffCount, m.deferredCliffCount,
      m.leapIsLowerBound, none, r.kind === "shaded", missing.length ? fill(copy.table.floor, { programs: listOf(missing) }) : copy.table.complete,
      missing.join("; "),
      correctionRows(cov?.corrections).map((c) => `${c.program}: ${c.source ? sourceWord(c.source) : copy.detail.applied}`).join("; "),
      cov ? (cov.corrections.childcareSubsidy.source === "added by HotGap" ? copy.csv.subsidy.added : copy.csv.subsidy.inNetIncome) : "",
      /* EligibilityBoundary (#23): the heating limit in words and the served share as a fraction, both the block's — empty where the profile was not read (Hawaii), never a number. */
      cov?.liheap ? limitWords(cov.liheap.limit) : "", cov?.liheap?.servedShare ?? "",
      v?.county.name ?? "", v?.county.fips ?? "",
      v?.rent.vintage ?? "", v?.county.vintage ?? "", v?.childcare.preschool ?? "",
      summary.year, summary.generated, modelLabel(summary.model), summary.model?.endpoint ?? "", summary.model?.version ?? "",
      "HotGap/PolicyEngine",
      /* The road out of poverty (Plan 9). `no_cliff_found` is the whole axis's
         fact; the road's own is `road_cliff_count` being 0, and a road that
         runs off this cell's axis is an empty `keep_rate_cents`. */
      m.keepRate === null ? "" : Math.round(m.keepRate * 100), m.roadLo ?? "", m.roadHi ?? "",
      m.roadCliffCount, m.roadWorst?.drop ?? "", m.roadWorst?.at ?? "", m.roadWorst?.programs.map(programName).join("; ") ?? "",
      position(positionAt(r.st, a, m.roadWorst?.at ?? null)), position(m.biggestLossPosition),
      position(none ? null : positionAt(r.st, a, m.safeExit)), position(positionAt(r.st, a, m.roadHi)),
      /* The keep rate to exactly twice poverty (road.ts `keepRateToLine`), signed whole cents like `keep_rate_cents`; empty where the road runs off the axis or the file predates it. */
      m.keepRateToLine == null ? "" : Math.round(m.keepRateToLine * 100),
      /* The level beside the slope (road.ts `netAtLo`/`netAtHi`): net income in whole dollars at `road_lo` and `road_hi`; empty where the road runs off the axis or the file predates it. */
      m.netAtRoadLo ?? "", m.netAtRoadHi ?? "",
      /* The road's second top and its deepest fall (R3); empty where the band runs off the axis or the file predates them. */
      m.keepRateWide == null ? "" : Math.round(m.keepRateWide * 100), m.roadWideHi ?? "", m.deepestFall ?? "",
    ].map(csvField).join(","));
  }
  return "﻿" + lines.join("\r\n") + "\r\n";
}

/** Named by the household as the reader knows it, not by the archetype id (N7), and the run's ISO date — a file name is a machine contract: "hotgap-1-adult-2-children-3-and-7-2026-09-16.csv". */
/**
 * The instant's calendar day in the reader's own zone, as `YYYY-MM-DD` — the
 * same day `dateWords` puts on the page, in the shape a filename wants. Built
 * from parts rather than a locale's own short form, which is `16/09/2026` in
 * half the world and would sort wrong in a folder of downloads.
 */
const isoDay = (iso: string): string => {
  const parts = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(iso));
  const at = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${at("year")}-${at("month")}-${at("day")}`;
};

/**
 * The file's day is the day the PAGE prints, not the instant's UTC day.
 * `generated.slice(0, 10)` is the UTC date, and the run at 01:29 UTC on the
 * 17th is the 16th everywhere west of Greenwich — so every line on the page
 * said "run of Sep 16, 2026" while the file it handed a reporter was named
 * `…-2026-09-17.csv`. A cold reader met both and did not know which date to
 * put in a footnote (2026-09-18, N2). One instant, one day, the reader's.
 */
export const csvName = (a: Archetype, generated: string): string =>
  `hotgap-${archLabel(a).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${isoDay(generated)}.csv`;
