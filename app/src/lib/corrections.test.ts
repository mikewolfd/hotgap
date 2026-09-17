import { describe, expect, it } from "vitest";
import type { StateCorrections } from "@hotgap/core";
import { correctionRows } from "./corrections.js";

const none: StateCorrections = {
  policyOverrides: [],
  maTafdc: { applies: false, note: "" },
  premiumAssistance: { applies: false, source: "none", program: null, note: "" },
  childcareSubsidy: { applies: false, source: "in net income", note: "" },
  coverageGap: { applies: false, note: "" },
};

describe("correctionRows", () => {
  it("keeps only the corrections that apply, in one order, with the source word as the chip", () => {
    const c = none;
    expect(correctionRows(c)).toEqual([]);
    expect(correctionRows(undefined)).toEqual([]);
    const applied = correctionRows({
      ...c,
      policyOverrides: [{ parameter: "gov.hhs.medicaid.eligibility.categories.parent.income_limit.TX", period: "2026", values: {}, source: "https://fhb.hhs.texas.gov/x", note: "parent limit" }],
      childcareSubsidy: { applies: true, source: "added by HotGap", note: "added" },
      coverageGap: { applies: true, note: "gap" },
    });
    expect(applied.map((r) => [r.program, r.source])).toEqual([
      ["Medicaid — parent income limit", "overridden"],
      ["CCDF child care subsidy", "added by HotGap"],
      ["Premium tax credit — coverage gap", null],
    ]);
    expect(applied[0].href).toBe("https://fhb.hhs.texas.gov/x");
    // A correction's published source (core's `cite`) is the link; its `code` pointer is not a reader's fact and never reaches a row.
    const cited = correctionRows({
      ...c,
      maTafdc: { applies: true, note: "tafdc", code: "maTafdc.ts", cite: "https://www.mass.gov/x" },
      premiumAssistance: { applies: true, source: "ladder", program: "ConnectorCare", note: "ladder", code: "statePremiumWraps.ts", cite: "https://www.mahealthconnector.org/x" },
    });
    expect(cited.map((r) => [r.program, r.href])).toEqual([["TANF cash assistance", "https://www.mass.gov/x"], ["ConnectorCare", "https://www.mahealthconnector.org/x"]]);
    expect(JSON.stringify(cited)).not.toContain(".ts");
  });
});

