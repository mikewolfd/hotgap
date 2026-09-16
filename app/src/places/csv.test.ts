import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { SummaryJson } from "@hotgap/core";
import { parseCsv } from "../../e2e/parseCsv.mjs";
import { CSV_HEADER, csvField, csvFor, csvName } from "./csv.js";
import { group, measureByKey, PREFERRED_HOUSEHOLD, rowsFor, tableRows } from "./model.js";

const summary = JSON.parse(readFileSync(new URL("../../../core/data/summary.json", import.meta.url), "utf8")) as SummaryJson;
const arch = summary.archetypes.find((a) => a.id === PREFERRED_HOUSEHOLD) ?? summary.archetypes[0];
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
  it("follows the table's order when the table is sorted by the measure", () => {
    const sorted = tableRows(rows, group(rows, measure), "measure");
    const [, ...sortedBody] = parseCsv(csvFor(summary, arch, sorted).replace(/^﻿/, ""));
    expect(sortedBody.map((r) => r[col("state")])).toEqual(sorted.map((r) => r.st));
  });
  it("carries provenance from the file on every row: the sweep stamp, the model, the vintages", () => {
    for (const r of body) {
      const cov = summary.coverage![r[col("state")]];
      expect(r[col("sweep_generated")]).toBe(summary.generated);
      expect(r[col("model_endpoint")]).toBe(summary.model!.endpoint);
      expect(r[col("model_version")]).toBe(summary.model!.version);
      expect(r[col("policy_year")]).toBe(summary.year);
      expect(r[col("rent_vintage")]).toBe(cov.vintages.rent.vintage);
      expect(r[col("county_vintage")]).toBe(cov.vintages.county.vintage);
      expect(r[col("childcare_price_vintage")]).toBe(cov.vintages.childcare.preschool);
      expect(r[col("reach_vintages")]).toBe(cov.vintages.reach.vintages.join("; "));
      expect(r[col("archetype_id")]).toBe(arch.id);
    }
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
      expect(r[col("figures")]).toBe(rows[i].incomplete.length ? "incomplete" : "complete");
    }
  });
  it("names the file after the household as the reader knows it, and the sweep date", () => {
    expect(csvName({ id: "single-2", married: false, childAges: [3, 7] }, "2026-09-16T19:37:52.231Z")).toBe("hotgap-1-adult-2-children-3-and-7-2026-09-16.csv");
    expect(csvName({ id: "married-dual-1", married: true, childAges: [4] }, "2026-09-16T19:37:52.231Z")).toBe("hotgap-2-adults-both-working-1-child-4-2026-09-16.csv");
  });
});
