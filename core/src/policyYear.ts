// The few figures HotGap holds by hand for the policy year. Everything else
// comes out of PolicyEngine; these are the values `/us/calculate` does not
// expose. Each carries the publisher, the table, and the date it was read, so
// moving YEAR means re-deriving every one of them from the publisher's own
// table — never from a cached percentage, which is how a dollar-standard
// threshold silently decays (docs/reviews/2026-09-14-methodology-validation.md).

// Substantial gainful activity, non-blind, 2026: $1,690/month.
// https://www.ssa.gov/oact/cola/sga.html — confirmed from ssa.gov 2026-09-14.
export const SGA_MONTHLY = 1690;
export const SGA_ANNUAL = SGA_MONTHLY * 12; // $20,280

// 2025 HHS poverty guidelines — the vintage that governs coverage year 2026.
// 26 CFR 1.36B-1(h) takes the guidelines in effect on the first day of the
// open-enrollment period *preceding* the coverage year, and 2026 open
// enrollment began 2025-11-01, so 2026 marketplace eligibility (including the
// 100%-FPL floor under 26 CFR 1.36B-2(b)(1) that defines the coverage gap)
// runs on the 2025 table, not the 2026 one. Annual Update of the HHS Poverty
// Guidelines, 90 FR 5108 (2025-01-17), FR Doc. 2025-01377.
// https://aspe.hhs.gov/topical-brief/poverty-guidelines
// Figures read 2026-09-14 from ASPE's own detailed table:
// https://aspe.hhs.gov/sites/default/files/documents/dd73d4f00d8a819d10b2fdb70d254f7b/detailed-guidelines-2025.pdf
// (48 contiguous 1/2/3 = 15,650 / 21,150 / 26,650; AK 19,550 / 26,430 / 33,310;
// HI 17,990 / 24,320 / 30,650 — each an arithmetic ladder, hence base+increment.)
export const FPL_2025 = {
  contiguous: { base: 15_650, perPerson: 5_500 },
  AK: { base: 19_550, perPerson: 6_880 },
  HI: { base: 17_990, perPerson: 6_330 },
} as const;

// 2026 HHS poverty guidelines, 48 contiguous states + DC (FR Doc. 2026-00755,
// effective 2026-01-13): $15,960 + $5,680 per additional person. Medicaid uses
// the current-year guideline, so the parent-Medicaid overrides convert state
// dollar standards with this line, not the 2025 one the marketplace uses.
export const FPL_2026_CONTIGUOUS = { base: 15_960, perPerson: 5_680 } as const;

/** 100% of the 2026 guideline for a contiguous-state household of this size. */
export function fpl2026Contiguous(householdSize: number): number {
  return FPL_2026_CONTIGUOUS.base + FPL_2026_CONTIGUOUS.perPerson * (Math.max(1, householdSize) - 1);
}

/** 100% of the 2025 federal poverty line for a household of this size in this state. */
export function fpl2025(state: string, householdSize: number): number {
  const ladder = state === "AK" ? FPL_2025.AK : state === "HI" ? FPL_2025.HI : FPL_2025.contiguous;
  return ladder.base + ladder.perPerson * (Math.max(1, householdSize) - 1);
}

// AHRQ Medical Expenditure Panel Survey — Insurance Component, 2024,
// private-sector: "average total employee contribution (in dollars) per
// enrolled employee", United States row. Table II.C.2 (single) $1,789 and
// Table II.D.2 (family) $7,216, read 2026-09-14 from
// https://meps.ahrq.gov/data_stats/summ_tables/insr/state/series_2/2024/ic24_iia_f.pdf
// (index: https://meps.ahrq.gov/data_stats/summ_tables/meps-ic-table-series.shtml;
// the same numbers appear in AHRQ Research Findings #54). These are the
// EMPLOYEE's share; the matching total premiums are $8,486 and $24,540.
//
// They replace the $6,500 / $1,700 constants translate.ts used to send, which
// came from a non-government survey AND sat on the wrong side of the premium:
// PolicyEngine documents `employer_sponsored_insurance_premiums` as "Annual
// employer-paid health insurance premiums. CBO treats this as part of
// household market income."
//
// MEPS-IC 2025 is also published ($1,817 single / $7,314 family) if this moves
// to the newer vintage; 2024 is what the methodology review specified.
export const ESI_EMPLOYEE_CONTRIBUTION = { single: 1_789, family: 7_216 } as const;
