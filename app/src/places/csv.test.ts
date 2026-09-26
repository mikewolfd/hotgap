import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { SummaryJson } from "@hotgap/core";
import { parseCsv } from "../../e2e/parseCsv.mjs";
import { CSV_HEADER, csvField, csvFor, csvName } from "./csv.js";
import { DEFAULT_ARCHETYPE, STATE_NAMES } from "@hotgap/core";
import { programName } from "../lib/names.js";
import { measureByKey, positionAt, rowsFor, tableRows } from "./model.js";

/* The header as it stood before Plan 9, typed out on purpose: this is the
   contract a reporter's script holds, and the new columns are appended so that
   not one of these indices moves. If a change here is deliberate, it is a
   change to a published contract and belongs in a commit that says so. */
const BEFORE_PLAN_9 = [
  "state", "state_name", "archetype_id", "archetype",
  "biggest_one_step_loss", "biggest_loss_at", "biggest_loss_programs", "danger_zone_width", "leap", "safe_exit", "cliff_count", "deferred_cliff_count",
  "leap_is_lower_bound", "no_cliff_found", "comparable", "figures", "unmodeled_programs", "corrections_applied", "childcare_subsidy_footing", "liheap_limit", "liheap_served_share",
  "county_name", "county_fips", "rent_vintage", "county_vintage", "childcare_price_vintage",
  "policy_year", "sweep_generated", "model_label", "model_endpoint", "model_version", "source",
];

const summary = JSON.parse(readFileSync(new URL("../../../core/data/summary.json", import.meta.url), "utf8")) as SummaryJson;
const arch = summary.archetypes.find((a) => a.id === DEFAULT_ARCHETYPE) ?? summary.archetypes[0];
const measure = measureByKey("biggestLoss")!;

describe("csvField", () => {
  it("quotes only what RFC 4180 needs and doubles an inner quote", () => {
    expect(csvField("plain")).toBe("plain");
    expect(csvField(12)).toBe("12");
    expect(csvField(null)).toBe("");
    expect(csvField('a "b", c')).toBe('"a ""b"", c"');
    expect(csvField("line\nbreak")).toBe('"line\nbreak"');
  });
});

describe("csvFor on the committed sweep", () => {
  const rows = rowsFor(summary, arch, measure);
  const text = csvFor(summary, arch, rows);
  const parsed = parseCsv(text.replace(/^﻿/, ""));
  const [head, ...body] = parsed;
  const col = (name: (typeof CSV_HEADER)[number]) => head.indexOf(name);

  it("has the header, one row per table row, in the table's order, every row the header's width", () => {
    expect(head).toEqual([...CSV_HEADER]);
    expect(body.length).toBe(rows.length);
    expect(body.map((r) => r[col("state")])).toEqual(rows.map((r) => r.st));
    for (const r of body) expect(r.length).toBe(head.length);
  });
  it("follows the table's order when the table is sorted by a measure", () => {
    const sorted = tableRows(summary, arch, "leap");
    const [, ...sortedBody] = parseCsv(csvFor(summary, arch, sorted).replace(/^﻿/, ""));
    expect(sortedBody.map((r) => r[col("state")])).toEqual(sorted.map((r) => r.st));
  });
  it("round-trips the comma in \"Washington, DC\" and reads one source constant on every row (N8)", () => {
    const dc = body.find((r) => r[col("state")] === "DC")!;
    expect(dc[col("state_name")]).toBe(STATE_NAMES.DC);
    expect(STATE_NAMES.DC).toContain(",");
    expect(dc.length).toBe(head.length);
    expect(new Set(body.map((r) => r[col("source")]))).toEqual(new Set(["HotGap/PolicyEngine"]));
    expect(new Set(body.map((r) => r[col("model_label")]))).toEqual(new Set([`HotGap hosted engine, policyengine-us ${summary.model!.version}`]));
  });
  it("carries provenance from the file on every row: the run stamp, the model, the vintages, the county named (B4)", () => {
    for (const r of body) {
      const cov = summary.coverage![r[col("state")]];
      expect(r[col("sweep_generated")]).toBe(summary.generated);
      expect(r[col("model_endpoint")]).toBe(summary.model!.endpoint);
      expect(r[col("model_version")]).toBe(summary.model!.version);
      expect(r[col("policy_year")]).toBe(summary.year);
      expect(r[col("rent_vintage")]).toBe(cov.vintages.rent.vintage);
      expect(r[col("county_vintage")]).toBe(cov.vintages.county.vintage);
      expect(r[col("county_name")]).toBe(cov.vintages.county.name ?? "");
      expect(r[col("county_fips")]).toBe(cov.vintages.county.fips);
      expect(r[col("childcare_price_vintage")]).toBe(cov.vintages.childcare.preschool);
      expect(r[col("archetype_id")]).toBe(arch.id);
    }
    expect(head).not.toContain("reach_vintages");
  });
  it("carries the worst step's earnings and programs beside its figure (B3): Ohio's row is the readout's sentence, cell by cell", () => {
    const oh = body.find((r) => r[col("state")] === "OH")!;
    const m = summary.states.OH[arch.id];
    expect(Number(oh[col("biggest_one_step_loss")])).toBe(m.biggestLoss);
    expect(Number(oh[col("biggest_loss_at")])).toBe(m.biggestLossAt);
    expect(oh[col("biggest_loss_programs")]).toBe(m.biggestLossPrograms.map(programName).join("; "));
    expect(oh[col("county_name")]).toBe(summary.coverage!.OH.vintages.county.name);
  });
  it("carries the child-care subsidy's footing on every row, from the coverage record (rerun S4): Ohio's is PolicyEngine's, Texas's HotGap's", () => {
    for (const r of body) {
      const source = summary.coverage![r[col("state")]].corrections.childcareSubsidy.source;
      expect(r[col("childcare_subsidy_footing")]).toBe(source === "added by HotGap" ? "added by HotGap" : "in PolicyEngine's net income");
    }
    expect(body.find((r) => r[col("state")] === "OH")![col("childcare_subsidy_footing")]).toBe("in PolicyEngine's net income");
    expect(body.find((r) => r[col("state")] === "TX")![col("childcare_subsidy_footing")]).toBe("added by HotGap");
  });
  it("carries the LIHEAP boundary's two facts from every block (#23): Ohio's limit in words and its served share as a fraction, Hawaii's share empty, never a number", () => {
    for (const r of body) {
      const b = summary.coverage![r[col("state")]].liheap!;
      expect(r[col("liheap_limit")]).toBe(b.limitKind);
      expect(r[col("liheap_served_share")]).toBe(b.servedShare === null ? "" : String(b.servedShare));
    }
    const oh = body.find((r) => r[col("state")] === "OH")!;
    expect(oh[col("liheap_limit")]).toBe("175% of the poverty guideline");
    expect(oh[col("liheap_served_share")]).toBe("0.22");
    const hi = body.find((r) => r[col("state")] === "HI")!;
    expect(summary.coverage!.HI.liheap!.servedShare).toBeNull();
    expect(hi[col("liheap_served_share")]).toBe("");
    // A boundary, not a measure: no column ranks or bins it, and the two sit with the footing columns, before the county.
    expect(head.indexOf("liheap_limit")).toBe(head.indexOf("childcare_subsidy_footing") + 1);
    expect(head.indexOf("liheap_served_share")).toBe(head.indexOf("county_name") - 1);
  });
  it("prints the model's numbers where there is a cliff, and leaves the dollar cells empty where there is none", () => {
    for (const [i, r] of body.entries()) {
      const m = rows[i].m;
      if (rows[i].kind === "none") {
        expect(r[col("no_cliff_found")]).toBe("true");
        expect([r[col("biggest_one_step_loss")], r[col("danger_zone_width")], r[col("leap")], r[col("safe_exit")]]).toEqual(["", "", "", ""]);
      } else {
        expect(r[col("no_cliff_found")]).toBe("false");
        expect(Number(r[col("biggest_one_step_loss")])).toBe(m.biggestLoss);
        expect(r[col("safe_exit")]).toBe(m.safeExit === null ? "" : String(m.safeExit));
      }
      expect(Number(r[col("cliff_count")])).toBe(m.cliffCount);
      expect(r[col("comparable")]).toBe(String(rows[i].kind === "shaded"));
      // The floor wording travels with the row (S5), so a spreadsheet reads the caveat without the page.
      expect(r[col("figures")]).toBe(rows[i].incomplete.length ? `floor: ${rows[i].incomplete.map((u) => u.program).join(" and ")} not modelled` : "complete");
    }
  });
  it("carries the road out of poverty and the positions, appended so no existing column moved (Plan 9)", () => {
    // The contract: every column that existed before this plan is where it was.
    expect(head.slice(0, 32)).toEqual(BEFORE_PLAN_9);
    expect(head.slice(32)).toEqual([
      "keep_rate_cents", "road_lo", "road_hi", "road_cliff_count", "road_worst_drop", "road_worst_at", "road_worst_programs",
      "road_worst_position", "biggest_loss_position", "safe_exit_position", "families_below_road_top",
      "keep_rate_to_line_cents", "net_at_road_lo", "net_at_road_hi",
      "keep_rate_wide_cents", "road_wide_hi", "deepest_fall",
    ]);
    for (const [i, r] of body.entries()) {
      const m = rows[i].m;
      // Signed whole cents, so a spreadsheet sorts the measure without parsing a word.
      expect(r[col("keep_rate_cents")]).toBe(m.keepRate === null ? "" : String(Math.round(m.keepRate * 100)));
      expect(r[col("road_lo")]).toBe(m.roadLo === null ? "" : String(m.roadLo));
      expect(r[col("road_hi")]).toBe(m.roadHi === null ? "" : String(m.roadHi));
      expect(Number(r[col("road_cliff_count")])).toBe(m.roadCliffCount);
      expect(r[col("road_worst_drop")]).toBe(m.roadWorst ? String(m.roadWorst.drop) : "");
      expect(r[col("road_worst_at")]).toBe(m.roadWorst ? String(m.roadWorst.at) : "");
      expect(r[col("road_worst_programs")]).toBe(m.roadWorst ? m.roadWorst.programs.map(programName).join("; ") : "");
      // A position is the page's own lookup, to one decimal, and empty — never
      // 0 — where the survey cell cannot support it.
      const round = (n: number | null) => (n === null ? "" : String(Math.round(n * 10) / 10));
      expect(r[col("road_worst_position")]).toBe(round(positionAt(rows[i].st, arch, m.roadWorst?.at ?? null)));
      expect(r[col("biggest_loss_position")]).toBe(round(m.biggestLossPosition));
      expect(r[col("families_below_road_top")]).toBe(round(positionAt(rows[i].st, arch, m.roadHi)));
      expect(r[col("keep_rate_to_line_cents")]).toBe(m.keepRateToLine == null ? "" : String(Math.round(m.keepRateToLine * 100)));
      // The level beside the slope: whole dollars at each end of the road.
      expect(r[col("net_at_road_lo")]).toBe(m.netAtRoadLo == null ? "" : String(m.netAtRoadLo));
      expect(r[col("net_at_road_hi")]).toBe(m.netAtRoadHi == null ? "" : String(m.netAtRoadHi));
      // R3: the keep rate on to 220% of the line, the earnings it runs to, and the deepest fall on the road.
      expect(r[col("keep_rate_wide_cents")]).toBe(m.keepRateWide == null ? "" : String(Math.round(m.keepRateWide * 100)));
      expect(r[col("road_wide_hi")]).toBe(m.roadWideHi == null ? "" : String(m.roadWideHi));
      expect(r[col("deepest_fall")]).toBe(m.deepestFall == null ? "" : String(m.deepestFall));
    }
    // Minnesota, the knife edge: 9¢ kept to the road's top, 75¢ lost to 220% of the line, and no fall below its start on the road.
    const mn = body.find((r) => r[col("state")] === "MN")!;
    expect([mn[col("keep_rate_cents")], mn[col("keep_rate_to_line_cents")], mn[col("keep_rate_wide_cents")], mn[col("road_wide_hi")], mn[col("deepest_fall")]]).toEqual(["9", "22", "-75", "59000", "0"]);
    // The three counts left the Measure menu (R5, R6) and stay in the file, where they describe a state.
    for (const c of ["cliff_count", "deferred_cliff_count", "road_cliff_count"] as const) expect(body.every((r) => /^\d+$/.test(r[col(c)])), c).toBe(true);
        // A keep rate is a slope, not a level: Wisconsin's family has more than New Mexico's at the line and less at twice it
    // (after taxes, premiums and the child care the family pays itself, R1).
    const level = (st: string) => { const r = body.find((x) => x[col("state")] === st)!; return [r[col("net_at_road_lo")], r[col("net_at_road_hi")]]; };
    expect(level("WI")).toEqual(["46179", "16817"]);
    expect(level("NM")).toEqual(["45705", "54223"]);
    // The boundary sensitivity (road.ts keepRateToLine): 26 states negative on
    // the road, 20 of them still negative to exactly twice poverty. Counted on
    // the stored figure — New Jersey's −0.12¢ is negative and prints as 0.
    const bad = rows.filter((r) => (r.m.keepRate ?? 0) < 0);
    expect(bad).toHaveLength(26);
    expect(bad.filter((r) => (r.m.keepRateToLine ?? 0) < 0)).toHaveLength(20);
    expect(bad.filter((r) => (r.m.keepRateToLine ?? 0) >= 0).map((r) => r.st).sort()).toEqual(["DC", "DE", "MA", "OR", "PA", "VA"]);
    // Missouri, the plan's worked example, cell by cell.
    const mo = body.find((r) => r[col("state")] === "MO")!;
    expect([mo[col("keep_rate_cents")], mo[col("road_lo")], mo[col("road_hi")], mo[col("road_cliff_count")], mo[col("road_worst_drop")], mo[col("road_worst_at")], mo[col("road_worst_programs")]])
      .toEqual(["-56", "27000", "55000", "7", "16428", "40000", "CCDF child care subsidy"]);
    // New Mexico has a road and no cliff on it; its whole-axis worst has no position because it has no worst step.
    const nm = body.find((r) => r[col("state")] === "NM")!;
    expect([nm[col("keep_rate_cents")], nm[col("road_cliff_count")], nm[col("road_worst_drop")], nm[col("biggest_loss_position")]]).toEqual(["30", "0", "", ""]);
    // Every position the file carries is inside 0–100, and none of them is a bare 0.
    const shares = body.flatMap((r) => ["road_worst_position", "biggest_loss_position", "safe_exit_position", "families_below_road_top"].map((c) => r[col(c as (typeof CSV_HEADER)[number])])).filter((s) => s !== "");
    expect(shares.length).toBeGreaterThan(100);
    for (const s of shares) { expect(Number(s)).toBeGreaterThan(0); expect(Number(s)).toBeLessThanOrEqual(100); }
  });
  it("names the file after the household as the reader knows it, and the sweep date", () => {
    expect(csvName({ id: "single-2", married: false, childAges: [3, 7] }, "2026-09-16T19:37:52.231Z")).toBe("hotgap-1-adult-2-children-3-and-7-2026-09-16.csv");
    expect(csvName({ id: "married-dual-1", married: true, childAges: [4] }, "2026-09-16T19:37:52.231Z")).toBe("hotgap-2-adults-both-working-1-child-4-2026-09-16.csv");
  });
});
