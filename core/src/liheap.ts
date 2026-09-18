// LIHEAP — the Low Income Home Energy Assistance Program — as an eligibility
// BOUNDARY, never a benefit in the money line by default.
//
// LIHEAP is a block grant, not an entitlement: a family under the limit is
// eligible to APPLY, and in FY2024 the states served 3% (Texas) to 85%
// (Michigan) of their income-eligible households, about 12% nationally. So a
// LIHEAP series drawn into net income would draw a benefit most eligible
// families never receive. HotGap shows the limit instead — where a household
// can no longer apply, what the state pays at that top income band if it does
// get help, and the share of eligible households the state served — and puts
// the dollars into the curve only behind the take-up toggle
// `getsEnergyAssistance` (evaluate.ts applyLiheap), the rule housing vouchers
// and the child-care subsidy already follow. Plan 7,
// docs/superpowers/plans/2026-09-16-hotgap-liheap-boundary.md; the research
// behind it, docs/research/liheap-cliff-2026-09-16.md.
//
// FY2026 (2025-10-01 to 2026-09-30), the heating component. Every row was
// hand-read on 2026-09-16 from three publishers, each named per row:
//
//   limits      LIHEAP Clearinghouse, "Income Eligibility" table, FY2026
//               ("Last updated: 12/15/2025 … Source: FY 2026 State Model
//               Plans"): the base (FPG or SMI) and percentage each state
//               elected, with the household-size caveats.
//   amounts     the state's FY2026 benefit matrix as the Clearinghouse serves
//               it (docs/2026/benefits-matricies/, index updated 2026-01-05),
//               or, where that file prints no dollar figure at the top band
//               (a points or cost formula, an income worksheet, a broken
//               link), the Clearinghouse's "Benefit Levels" table of the
//               state-reported heating minimum and maximum (updated
//               2025-11-24) — the row's `sources.amounts` says which.
//   served      ACF LIHEAP Performance Management, FY2024 state profile
//               ("% of State Income-Eligible Population Served"; "Data are
//               current as of May 30, 2025"; Oregon and Vermont March 26).
//
// The dollar limits come from HotGap's own FPL_2025 ladder (policyYear.ts:
// FY2026 LIHEAP runs on the 2025 guidelines, $26,650 for three) and from
// core/data/smi.json (60% of the four-person state median income with the
// 45 CFR 96.85 size adjustment, built by scripts/build-smi.mjs from
// policyengine-us's transcription of ACF's LIHEAP-IM-2025-02 Attachment 4 at a
// pinned commit). Two matrices cross-checked to the dollar against that
// arithmetic are pinned in liheap.test.ts (Massachusetts $83,641 for three,
// Missouri $4,588 a month); 15 more agreed within rounding when the table was
// built, and the two that did not — South Carolina and West Virginia — apply
// the FY2025 figures and say so in `vintage`.
//
// `topBand` is the notch: the amount the state pays at its TOP income band,
// which is the smallest step of every staircase and therefore what a household
// crossing the limit actually loses. `min` is taken over the fuels a renter
// pays a utility or a delivery for (natural gas, electricity, fuel oil,
// propane) in non-subsidized housing with no vulnerability add-on — the
// household HotGap models; wood, coal, kerosene, heat-in-rent and subsidized
// rows are named in the row's note. `bands` is the staircase below the top
// band where the matrix gives one by income alone; the toggle path
// (liheapAmount) reads the family's band from it and `topBand.min` above the
// last band. Where the amount turns on fuel, county, points or energy burden
// there is no income-only staircase and `bands` is null.
//
// Yearly refresh: December (the Clearinghouse limits and matrices, from the
// new Model Plans), May (the ACF profiles). Moving the fiscal year means
// re-reading every row from its publisher, never carrying a percentage over —
// the rule policyYear.ts sets out.
import { readData } from "./data.js";
import { message } from "./messages.js";
import { fpl2025 } from "./policyYear.js";
import { householdSize, type CurveResponse, type HouseholdAnswers } from "./types.js";

/** An income limit as a state elects it: a share of the poverty guideline or of the state median income. */
export type LiheapLimit =
  | { kind: "fpg"; pct: number }
  | { kind: "smi"; pct: number; /** The state's own FY2026 table still applies the prior year's SMI figures. */ vintage?: "FY2025" }
  /** Maryland: the percentage of SMI slides with household size; index size − 1, the last entry for every larger household. */
  | { kind: "smi-by-size"; pct: number[] };

/** A different limit from this household size up (the Clearinghouse table's caveats: "150 FPG for households with 8+ members"). */
export interface LiheapSizeRule { fromSize: number; limit: LiheapLimit }

/** One step of an income-only staircase: the amount paid up to this share of the base. */
export interface LiheapBand { upto: LiheapLimit; amount: number }

/**
 * The shape of the benefit at the limit: a flat amount that stops (notch); a
 * staircase of income bands ending in a notch; a formula on points, energy
 * burden or heating cost that ends in a notch of at least its minimum; a
 * taper that reaches its floor (or zero) before the limit. Null where the
 * matrix could not be read.
 */
export type LiheapShape = "notch" | "staircase" | "points" | "taper";

export interface LiheapHeating {
  limit: LiheapLimit;
  sizeRules: LiheapSizeRule[] | null;
  /** The published amounts at the top income band (see the header); null only where nothing was read. */
  topBand: { min: number; max: number } | null;
  bands: LiheapBand[] | null;
  shape: LiheapShape | null;
  note: string;
}

export interface LiheapRow {
  state: string;
  heating: LiheapHeating;
  /** The cooling and crisis limits where they differ from heating's; null where they are the same or the state runs no such component. */
  cooling: LiheapLimit | null;
  crisis: LiheapLimit | null;
  /** Households served ÷ state income-eligible population, FY2024 (ACF profile), or null where the profile was not read. */
  servedShare: number | null;
  /**
   * The policyengine-us variable that models this state's schedule, when one
   * does (programs.yaml: DC, MA, IL complete). Michigan's is a refundable
   * income-tax credit already inside HotGap's stateCredits — `counted` says so,
   * and the toggle adds nothing there.
   */
  upstream: { variable: string; counted?: "state credit" } | null;
  sources: { limits: string; amounts: string | null; served: string | null };
  /** ISO date every figure in the row was read. */
  readOn: string;
}

const CH = "https://liheapch.acf.gov";
const LIMITS = `${CH}/delivery/income_eligibility.htm`;
const BENEFIT_LEVELS = `${CH}/tables/benefits.htm`;
const matrix = (file: string) => `${CH}/docs/2026/benefits-matricies/${file}`;
const profile = (name: string) => `https://liheappm.acf.gov/sites/default/files/private/congress/profiles/2024/FY2024_${name}_Profile.pdf`;
const READ_ON = "2026-09-16";

/**
 * The vintages every row was read at, for a surface's provenance line: the
 * fiscal year of the limits and matrices (the header's first publisher) and
 * the year of the ACF profiles the served shares come from (the third).
 * Moving either means re-reading every row, so they live beside READ_ON and
 * nowhere else; liheap.test.ts pins them to the rows' own source URLs.
 */
export const LIHEAP_VINTAGE = { limits: "FY2026", served: "FY2024" } as const;

const fpg = (pct: number): LiheapLimit => ({ kind: "fpg", pct });
const smi = (pct: number): LiheapLimit => ({ kind: "smi", pct });
const FPG150 = fpg(150);
const SMI60 = smi(60);

export const LIHEAP_TABLE: readonly LiheapRow[] = [
  {
    state: "AL",
    heating: {
      limit: FPG150, sizeRules: null, topBand: { min: 320, max: 410 }, bands: null, shape: "staircase",
      note: "Three monthly-income bands (0–50, 51–100, 101–150% FPG) by fuel and household size; the top band pays propane $380–$410, natural gas $360–$390, electric $320–$350, wood/coal/kerosene $280–$310, plus $50 for a household with a child, elderly or disabled member. The chart is 'PY 2026, effective February 17, 2025, to be updated when the FY 2026 FPL guidelines are released'.",
    },
    cooling: null, crisis: null, servedShare: 0.18, upstream: null,
    sources: { limits: LIMITS, amounts: matrix("AL_BenefitMatrix_Heating_2026.pdf"), served: profile("Alabama") }, readOn: READ_ON,
  },
  {
    state: "AK",
    heating: {
      limit: FPG150, sizeRules: null, topBand: { min: 350, max: 6125 }, bands: null, shape: "points",
      note: "Community heating-cost points × a dwelling factor × an income share (100% of points to 25% FPL, stepping to 50% at 125–150%), +1 point for a member 60+, disabled or under six, 2 to 35 points at $175 a point; the range is the state's reported heating minimum and maximum (Benefit Levels table). The profile's served share excludes households served by tribal grantees.",
    },
    cooling: null, crisis: null, servedShare: 0.10, upstream: null,
    sources: { limits: LIMITS, amounts: BENEFIT_LEVELS, served: profile("Alaska") }, readOn: READ_ON,
  },
  {
    state: "AZ",
    heating: {
      limit: SMI60, sizeRules: [{ fromSize: 10, limit: FPG150 }], topBand: { min: 160, max: 640 }, bands: null, shape: "points",
      note: "A worksheet (effective 2024-10-12): 1 to 5 income points by fifths of the limit (1 point in the top fifth), 0 to 6 energy-burden points (+2 for portable fuels), 1 each for an elderly, disabled or veteran member or a child six or under; $160 for 1–4 points, $320, $480, $640 for 13 or more.",
    },
    cooling: null, crisis: null, servedShare: 0.06, upstream: null,
    sources: { limits: LIMITS, amounts: matrix("AZ_BenefitMatrix_Heating_2026.pdf"), served: profile("Arizona") }, readOn: READ_ON,
  },
  {
    state: "AR",
    heating: {
      limit: SMI60, sizeRules: [{ fromSize: 8, limit: FPG150 }], topBand: { min: 60, max: 570 }, bands: null, shape: null,
      note: "The Clearinghouse index lists five FY2026 Arkansas matrices (electric, natural gas, fuel oil, propane, other/wood); all five links returned HTTP 404 on 2026-09-16, with or without a file extension, so no matrix was read and the shape is unknown. The range is the state's reported heating minimum and maximum (Benefit Levels table).",
    },
    cooling: null, crisis: null, servedShare: 0.17, upstream: null,
    sources: { limits: LIMITS, amounts: BENEFIT_LEVELS, served: profile("Arkansas") }, readOn: READ_ON,
  },
  {
    state: "CA",
    heating: {
      limit: SMI60, sizeRules: null, topBand: { min: 283, max: 594 }, bands: null, shape: "staircase",
      note: "Four poverty groups, amounts set per county; Group IV (100% FPL to 60% SMI) pays $283 (Santa Barbara) to $499 (Nevada County) for one person, $19 more a person through six; Los Angeles County, the sweep's, $310 for one and $348 for three.",
    },
    cooling: null, crisis: null, servedShare: 0.05, upstream: null,
    sources: { limits: LIMITS, amounts: matrix("CA_BenefitMatrix_2026.pdf"), served: profile("California") }, readOn: READ_ON,
  },
  {
    state: "CO",
    heating: {
      limit: SMI60, sizeRules: null, topBand: { min: 200, max: 1000 }, bands: null, shape: "points",
      note: "Benefit = the household's estimated home heating cost less a statewide funding adjustment and an income contribution (0% to 75% FPL, 10% to 125%, 20% to 175%, 30% above), floored at $200 and capped at $1,000 (3.758.47, LEAP 2025–2026).",
    },
    cooling: null, crisis: null, servedShare: 0.16, upstream: null,
    sources: { limits: LIMITS, amounts: matrix("CO_BenefitMatrix_Heat-Crisis_2026.pdf"), served: profile("Colorado") }, readOn: READ_ON,
  },
  {
    state: "CT",
    heating: {
      limit: SMI60, sizeRules: null, topBand: { min: 295, max: 345 },
      bands: [{ upto: fpg(125), amount: 595 }, { upto: fpg(200), amount: 445 }], shape: "staircase",
      note: "CEAP basic benefit by three income levels, non-vulnerable and vulnerable (a member 60+, disabled or under six pays $50 more): Level 1 to 125% FPG $595/$645, Level 2 to 200% $445/$495, Level 3 (201% FPG to 60% SMI) $295/$345; the bands here are the non-vulnerable column. A household with heat in its rent gets the $125/$100/$75 rental-assistance benefit instead.",
    },
    cooling: null, crisis: null, servedShare: 0.25, upstream: null,
    sources: { limits: LIMITS, amounts: matrix("CT_BenefitMatrix_Heat-Crisis_2026.pdf"), served: profile("Connecticut") }, readOn: READ_ON,
  },
  {
    state: "DE",
    heating: {
      limit: SMI60, sizeRules: null, topBand: { min: 155, max: 339 }, bands: null, shape: "staircase",
      note: "Eight income-percent-interval bands (the interval is income over half the 60% SMI limit, so 200% is the limit) by fuel; the 176–200% band pays propane $339, kerosene and fuel oil $278, electric $192, natural gas $155, other $100; approved 2025-04-28. The Clearinghouse index links this file as 'Colorado: heating' and lists no Delaware entry (Plan 7 Q5).",
    },
    cooling: null, crisis: null, servedShare: 0.12, upstream: null,
    sources: { limits: LIMITS, amounts: matrix("CO_BenefitMatrix_Heating_2026.pdf"), served: profile("Delaware") }, readOn: READ_ON,
  },
  {
    state: "DC",
    heating: {
      limit: SMI60, sizeRules: null, topBand: { min: 200, max: 1500 }, bands: null, shape: "staircase",
      note: "Seven income levels ($0 to $30,000 and over in $5,000 steps) by home type, size and fuel; the top level pays natural gas and electric $200, oil $1,500 (flat at every level), heat in rent $200. policyengine-us models the schedule (dc_liheap_payment) but the amount never reaches its net income, and on HotGap's payload — no fuel or heating bill sent — it returns $0.",
    },
    cooling: null, crisis: null, servedShare: 0.10, upstream: { variable: "dc_liheap_payment" },
    sources: { limits: LIMITS, amounts: matrix("DC_BenefitMatrix_Heat-Cool_2026.docx"), served: profile("District_of_Columbia") }, readOn: READ_ON,
  },
  {
    state: "FL",
    heating: {
      limit: SMI60, sizeRules: null, topBand: { min: 200, max: 550 },
      bands: [{ upto: smi(30), amount: 350 }, { upto: smi(42), amount: 300 }, { upto: smi(51), amount: 250 }], shape: "staircase",
      note: "Four bands as shares of the 60% SMI limit (50% or less, to 70%, to 85%, to 100%): a base of $350, $300, $250, $200, plus $100 with a member 60+, $100 disabled, $150 a child five or younger (so up to $550 at the top band); effective 2025-10-01. Cooling and crisis revert to 150% FPG for households of ten or more.",
    },
    cooling: null, crisis: null, servedShare: 0.04, upstream: null,
    sources: { limits: LIMITS, amounts: matrix("FL_BenefitMatrix_Heat-Cool_2026.pdf"), served: profile("Florida") }, readOn: READ_ON,
  },
  {
    state: "GA",
    heating: {
      limit: SMI60, sizeRules: null, topBand: { min: 400, max: 710 }, bands: null, shape: "staircase",
      note: "Two income levels by main heating fuel; Level II (about 40% of the limit to the limit) pays electric and wood $400, natural gas $560, propane $580, oil $710; Level I $500 to $810.",
    },
    cooling: null, crisis: null, servedShare: 0.12, upstream: null,
    sources: { limits: LIMITS, amounts: matrix("GA_BenefitMatrix_Heat-Cool_2026.pdf"), served: profile("Georgia") }, readOn: READ_ON,
  },
  {
    state: "HI",
    heating: {
      limit: SMI60, sizeRules: [{ fromSize: 11, limit: FPG150 }], topBand: { min: 375, max: 1400 }, bands: null, shape: "points",
      note: "Private dwellings: points (income 0–3, size 1–3, island 1–2, vulnerability 1, burden 1) times a value per point set each year from the funds available; subsidized households a flat $375, $425 or $475 by size. The range is the state's reported minimum and maximum (Benefit Levels table). The FY2024 ACF profile was not at the FY2024 URL pattern on 2026-09-16 (HTTP 404), so the served share is unread.",
    },
    cooling: null, crisis: null, servedShare: null, upstream: null,
    sources: { limits: LIMITS, amounts: BENEFIT_LEVELS, served: null }, readOn: READ_ON,
  },
  {
    state: "ID",
    heating: {
      limit: SMI60, sizeRules: [{ fromSize: 8, limit: FPG150 }], topBand: { min: 122, max: 1164 }, bands: null, shape: "points",
      note: "An average heating cost by fuel, vendor and heating area, paid at a low, medium or high energy-burden factor (burden under 6%, 6–11%, over 11%); the low-burden row, which is where a household at the limit sits, runs $122 (natural gas, Intermountain, area I) to $1,164 (oil or propane, area III), plus $25 with a vulnerable member.",
    },
    cooling: null, crisis: null, servedShare: 0.24, upstream: null,
    sources: { limits: LIMITS, amounts: matrix("ID_BenefitMatrix_Heating_2026.pdf"), served: profile("Idaho") }, readOn: READ_ON,
  },
  {
    state: "IL",
    heating: {
      limit: SMI60, sizeRules: [{ fromSize: 12, limit: FPG150 }], topBand: { min: 58, max: 635 }, bands: null, shape: "staircase",
      note: "Four bands (0–50, 51–100, 101–150% FPG, 151% to 60% SMI) by fuel, size and whether the electric utility gives the low-income discount; the top band pays $58 (all-electric with the discount, one person; $67 for three) to $635 (propane or oil, six or more, no discount); edited May 2025. policyengine-us models the schedule (il_liheap) but the amount never reaches its net income, and on HotGap's payload it returns $0.",
    },
    cooling: null, crisis: null, servedShare: 0.19, upstream: { variable: "il_liheap" },
    sources: { limits: LIMITS, amounts: matrix("IL_BenefitMatrix_Heat-Cool_2026.pdf"), served: profile("Illinois") }, readOn: READ_ON,
  },
  {
    state: "IN",
    heating: {
      limit: SMI60, sizeRules: null, topBand: { min: 100, max: 375 }, bands: null, shape: "points",
      note: "Points × $25 plus an electric benefit: 9, 5 or 2 income points (2 in the 45–60% SMI band), dwelling 0–3, fuel 0–6, vulnerable 0–2, so $50–$325 at the top band, plus a $50 electric benefit there ($125 at the bottom); the plan states the FY2026 four-person SMI as $107,555, 60% $64,533.",
    },
    cooling: null, crisis: null, servedShare: 0.19, upstream: null,
    sources: { limits: LIMITS, amounts: matrix("IN_BenefitMatrix_Heat-Crisis_2026.pdf"), served: profile("Indiana") }, readOn: READ_ON,
  },
  {
    state: "IA",
    heating: {
      limit: fpg(200), sizeRules: null, topBand: { min: 320, max: 800 }, bands: null, shape: "points",
      note: "$40 a point: 8/6/5/4 income points at 0–75/76–100/101–125/126–200% FPL ('over 200% ineligible'), fuel 4 (gas, electric), 5 (propane, oil) or 2 (solid), targeting +1 each (fixed income, elderly, disabled, a child under six, detached dwelling) and −2 subsidized, −1 five-plex, −4 heat in rent, −4 over $50,000 saved; $80 minimum, $800 maximum, and propane and oil households get at least $800. A gas household with no targeting factor at 126–200% FPL: 8 points, $320.",
    },
    cooling: null, crisis: FPG150, servedShare: 0.26, upstream: null,
    sources: { limits: LIMITS, amounts: matrix("IA_BenefitMatrix_Heat-Crisis_2026.pdf"), served: profile("Iowa") }, readOn: READ_ON,
  },
  {
    state: "KS",
    heating: {
      limit: FPG150, sizeRules: null, topBand: { min: 94, max: 1682 }, bands: null, shape: "staircase",
      note: "Monthly-income rows ($1,700 and over is the top) by fuel, dwelling, household size (1–4, 5+) and a utility-cost range A–J; the top row pays $94 (an 'other' dwelling, range A) to $1,682 (a house of five or more, range J); an 80% funding-adjustment version of every page sits beside the full one.",
    },
    cooling: null, crisis: null, servedShare: 0.21, upstream: null,
    sources: { limits: LIMITS, amounts: matrix("KS_BenefitMatrix_2026.pdf"), served: profile("Kansas") }, readOn: READ_ON,
  },
  {
    state: "KY",
    heating: {
      limit: FPG150, sizeRules: null, topBand: { min: 83, max: 200 }, bands: null, shape: "points",
      note: "Points × $16.66 by income band, fuel and size; the 126–150% FPL band scores 5 (natural gas, one person, $83) to 12 (electricity, five or more, $200); wood scores 3 ($50). The workbook's income sheet is labelled 2024–2025 and its poverty rows use the 2025 guidelines.",
    },
    cooling: null, crisis: null, servedShare: 0.27, upstream: null,
    sources: { limits: LIMITS, amounts: matrix("KY_BenefitMatrix_Heat-Cool_2026.xlsx"), served: profile("Kentucky") }, readOn: READ_ON,
  },
  {
    state: "LA",
    heating: {
      limit: SMI60, sizeRules: null, topBand: { min: 200, max: 250 }, bands: null, shape: "points",
      note: "By energy burden alone, not income: 9.9% or less pays $200 (1–3 people) or $250 (4 or more), rising to $650/$700 at 25% or more; plus $100 with a member 60+, disabled or five or under; $800 cap. A household at the limit has the lowest burden, so its figure is the bottom row.",
    },
    cooling: null, crisis: null, servedShare: 0.17, upstream: null,
    sources: { limits: LIMITS, amounts: matrix("LA_BenefitMatrix_Heat-Cool_2026.pdf"), served: profile("Louisiana") }, readOn: READ_ON,
  },
  {
    state: "ME",
    heating: {
      limit: SMI60, sizeRules: [{ fromSize: 10, limit: FPG150 }], topBand: { min: 88, max: 1012 }, bands: null, shape: "points",
      note: "Heating-cost points prorated by poverty level: 130% of points at 0–25% FPIG stepping to 70% above 150% FPIG up to 60% SMI; no dollar figure in the rule, so the range is the state's reported heating minimum and maximum (Benefit Levels table).",
    },
    cooling: null, crisis: null, servedShare: 0.28, upstream: null,
    sources: { limits: LIMITS, amounts: BENEFIT_LEVELS, served: profile("Maine") }, readOn: READ_ON,
  },
  {
    state: "MD",
    heating: {
      limit: { kind: "smi-by-size", pct: [39, 40, 41, 41.7, 42, 42.4, 46, 50.9, 54.89, 58.7, 60] }, sizeRules: null,
      topBand: { min: 25, max: 25 }, bands: null, shape: "staircase",
      note: "MEAP: seven levels by fuel; Level 7, 'Over 200% FPL' running to the size-sliding SMI cap (39% of SMI for one person to 60% above ten), pays $25 for every fuel; Level 5 (151–200% FPL) $100 electric, $300 gas, $650 oil; Level 6 is subsidized or sub-metered housing ($100–$225).",
    },
    cooling: null, crisis: null, servedShare: 0.15, upstream: null,
    sources: { limits: LIMITS, amounts: matrix("MD_BenefitMatrix_2026.pdf"), served: profile("Maryland") }, readOn: READ_ON,
  },
  {
    state: "MA",
    heating: {
      limit: SMI60, sizeRules: null, topBand: { min: 355, max: 430 },
      bands: [{ upto: fpg(100), amount: 500 }, { upto: fpg(125), amount: 460 }, { upto: fpg(150), amount: 425 }, { upto: fpg(175), amount: 390 }, { upto: fpg(200), amount: 390 }], shape: "staircase",
      note: "HEAP chart dated 2025-06-02: homeowners and non-subsidized tenants, utility or heat-included-in-rent row $500/$460/$425/$390/$390/$355 at 100/125/150/175/200% FPL and 60% SMI, deliverable fuel $600 to $430; subsidized tenants $350 to $250 and $420 to $300; the High Energy Cost Supplement is 'TBD' until the chart is reissued mid-fall. policyengine-us models the schedule (ma_liheap) but the amount never reaches its net income, on HotGap's payload it returns $0 (it is capped at a heating bill HotGap does not ask for), and its FY2026 amounts ($925/$814/$716… for the utility row, from a chart dated 2025-05-08) differ from this file's.",
    },
    cooling: null, crisis: null, servedShare: 0.18, upstream: { variable: "ma_liheap" },
    sources: { limits: LIMITS, amounts: matrix("MA_BenefitMatrix_2026.pdf"), served: profile("Massachusetts") }, readOn: READ_ON,
  },
  {
    state: "MI",
    heating: {
      limit: fpg(110), sizeRules: null, topBand: { min: 1, max: 2205 }, bands: null, shape: "taper",
      note: "The refundable Home Heating Credit (MI-1040CR-7): a standard allowance ($995 for three exemptions, 2024 Table A) less 3.5% of total household resources, so the credit reaches $0 at the table's income ceiling ($28,414 for three) rather than dropping; halved when heat is included in the rent (line 41); an alternate credit uses actual heating costs. PolicyEngine models it (mi_home_heating_credit, $180.38 for a single parent of two at $20,000) and HotGap already counts it in state credits, so the toggle adds nothing here. The range is the state's reported minimum and maximum (Benefit Levels table).",
    },
    cooling: null, crisis: FPG150, servedShare: 0.85, upstream: { variable: "mi_home_heating_credit", counted: "state credit" },
    sources: { limits: LIMITS, amounts: matrix("MI_BenefitMatrix_2026_Heating-see-pg-11.pdf"), served: profile("Michigan") }, readOn: READ_ON,
  },
  {
    state: "MN",
    heating: {
      limit: smi(50), sizeRules: null, topBand: { min: 200, max: 356 }, bands: null, shape: "taper",
      note: "A pay percent that slides from 43.9% of the household's annual energy cost at the bottom of the income range to 10.8% at 89.6% of the limit and stays there to the limit; $200 minimum, $1,400 maximum; at the top, 10.8% of the workbook's $873–$3,293 average annual costs is $94–$356, floored at $200.",
    },
    cooling: null, crisis: null, servedShare: 0.28, upstream: null,
    sources: { limits: LIMITS, amounts: matrix("MN_BenefitMatrix_2026.xlsx"), served: profile("Minnesota") }, readOn: READ_ON,
  },
  {
    state: "MS",
    heating: {
      limit: SMI60, sizeRules: null, topBand: { min: 450, max: 550 }, bands: null, shape: "staircase",
      note: "Six bands (25, 50, 75, 100, 125% FPG, then to 60% SMI) by fuel; the top band pays propane $550, electric and natural gas $450, wood or other $200, against a $1,000 total (heating plus cooling) maximum there.",
    },
    cooling: null, crisis: null, servedShare: 0.15, upstream: null,
    sources: { limits: LIMITS, amounts: matrix("MS_BenefitMatrix_Heat-Cool_2026.pdf"), served: profile("Mississippi") }, readOn: READ_ON,
  },
  {
    state: "MO",
    heating: {
      limit: SMI60, sizeRules: null, topBand: { min: 318, max: 495 }, bands: null, shape: "notch",
      note: "Appendix K, FFY 26: one flat payment by fuel at every income to the 60% SMI limit ($4,588 a month for three) — natural gas and fuel oil $326, electric $318, tank propane $495; wood $219, kerosene $153, cylinder propane $177.",
    },
    cooling: null, crisis: null, servedShare: 0.18, upstream: null,
    sources: { limits: LIMITS, amounts: matrix("MO_BenefitMatrix_2026.docx"), served: profile("Missouri") }, readOn: READ_ON,
  },
  {
    state: "MT",
    heating: {
      limit: SMI60, sizeRules: [{ fromSize: 9, limit: FPG150 }], topBand: { min: 180, max: 3228 }, bands: null, shape: "points",
      note: "A base benefit by dwelling type, bedrooms and fuel times an income/heating-degree-day multiplier by district (0.9 at 8% of poverty and 0.55 at 190% in the worked examples); the range is the state's reported heating minimum and maximum (Benefit Levels table).",
    },
    cooling: null, crisis: null, servedShare: 0.13, upstream: null,
    sources: { limits: LIMITS, amounts: BENEFIT_LEVELS, served: profile("Montana") }, readOn: READ_ON,
  },
  {
    state: "NE",
    heating: {
      limit: FPG150, sizeRules: null, topBand: { min: 154, max: 280 }, bands: null, shape: "staircase",
      note: "Four tiers (70, 100, 130, 150% FPL) by fuel and dwelling after a 20% earned-income disregard; Tier 4 (130–150%) pays fuel oil, kerosene and wood $175, propane $165, natural gas, electricity, coal and corn $280 in a single-family home, $154 in multi-family housing for every fuel.",
    },
    cooling: null, crisis: null, servedShare: 0.32, upstream: null,
    sources: { limits: LIMITS, amounts: matrix("NE_BenefitMatrix_2026.pdf"), served: profile("Nebraska") }, readOn: READ_ON,
  },
  {
    state: "NV",
    heating: {
      limit: FPG150, sizeRules: null, topBand: { min: 360, max: 1633 }, bands: null, shape: "points",
      note: "The benefit brings the household's energy burden toward the state median (1.81% for FY2026), capped by income band and size; the 125–150% FPL cap is $1,152 (one person) to $1,633 (eight or more), $100 more for targeted households; the $360 minimum is the state's reported figure (Benefit Levels table).",
    },
    cooling: null, crisis: null, servedShare: 0.08, upstream: null,
    sources: { limits: LIMITS, amounts: matrix("NV_BenefitMatrix_2026.pdf"), served: profile("Nevada") }, readOn: READ_ON,
  },
  {
    state: "NH",
    heating: {
      limit: SMI60, sizeRules: null, topBand: { min: 160, max: 726 }, bands: null, shape: "staircase",
      note: "Six tiers A–F to 200% FPG by annual heating cost (four rows) and fuel; tier F (175–200% FPG, and the households above it to the 60% SMI limit) pays utility heat $160–$454 and deliverable heat $256–$726.",
    },
    cooling: null, crisis: null, servedShare: 0.21, upstream: null,
    sources: { limits: LIMITS, amounts: matrix("NH_BenefitMatrix_2026.pdf"), served: profile("New_Hampshire") }, readOn: READ_ON,
  },
  {
    state: "NJ",
    heating: {
      limit: SMI60, sizeRules: null, topBand: { min: 278, max: 820 }, bands: null, shape: "staircase",
      note: "A monthly-income grid by fuel, household size and county (Warren and Sussex pay more); the $6,440–$8,886 band, which holds the 60% SMI limit for households of one to eight, pays natural gas $278–$509, electric $442–$807, deliverables $535–$820, and renters with heat in the rent $196–$358; the grid runs to $9,660 and over.",
    },
    cooling: null, crisis: null, servedShare: 0.25, upstream: null,
    sources: { limits: LIMITS, amounts: matrix("NJ_BenefitMatrix_2026.pdf"), served: profile("New_Jersey") }, readOn: READ_ON,
  },
  {
    state: "NM",
    heating: {
      limit: FPG150, sizeRules: null, topBand: { min: 70, max: 490 }, bands: null, shape: "points",
      note: "$35 a point: 3 income points to about 110% FPG and 2 above it to 150%, energy burden 0 to 3 (+2 propane), 2 for each of a child five or under, a member 60 or older, a disabled member; 2 points ($70) to 14 ($490).",
    },
    cooling: null, crisis: null, servedShare: 0.23, upstream: null,
    sources: { limits: LIMITS, amounts: matrix("NM_BenefitMatrix_2026.pdf"), served: profile("New_Mexico") }, readOn: READ_ON,
  },
  {
    state: "NY",
    heating: {
      limit: SMI60, sizeRules: [{ fromSize: 14, limit: FPG150 }], topBand: { min: 400, max: 935 }, bands: null, shape: "staircase",
      note: "HEAP 2025–2026 direct-heating base benefit by fuel — utility $400, oil, kerosene and propane $900, wood, pellets and coal $635 — plus $35 with a vulnerable member and $61 in Tier I (below about 130% FPG); households with heat included in the rent get $50 (Tier I) or $45 (Tier II), 'heat and eat' $21.",
    },
    cooling: null, crisis: null, servedShare: 0.53, upstream: null,
    sources: { limits: LIMITS, amounts: matrix("NY_BenefitMatrix_2026.docx"), served: profile("New_York") }, readOn: READ_ON,
  },
  {
    state: "NC",
    heating: {
      limit: fpg(130), sizeRules: null, topBand: { min: 300, max: 400 }, bands: [{ upto: fpg(65), amount: 400 }], shape: "staircase",
      note: "Two bands: 0–50% of the limit (65% FPG) pays $400 for one to three people and $500 for four or more; 51–100% pays $300 and $400. The bands and top band here are the one-to-three-person figures. A household with a member 65 or older or disabled through Adult Services uses 150% FPG.",
    },
    cooling: FPG150, crisis: FPG150, servedShare: 0.29, upstream: null,
    sources: { limits: LIMITS, amounts: matrix("NC_BenefitMatrix_Heat-Cool_2026.pdf"), served: profile("North_Carolina") }, readOn: READ_ON,
  },
  {
    state: "ND",
    heating: {
      limit: SMI60, sizeRules: null, topBand: { min: 1, max: 7500 }, bands: null, shape: "staircase",
      note: "LIHEAP pays a share of the heating cost that steps down across six income bands — 100, 100, 95, 85, 65, 45% — so the top band (about 83% of the limit to the limit; $54,571–$65,478 for three) pays 45% of the cost; the range is the state's reported heating minimum and maximum (Benefit Levels table).",
    },
    cooling: null, crisis: null, servedShare: 0.16, upstream: null,
    sources: { limits: LIMITS, amounts: matrix("ND_BenefitMatrix_2026.xlsx"), served: profile("North_Dakota") }, readOn: READ_ON,
  },
  {
    state: "OH",
    heating: {
      limit: fpg(175), sizeRules: [{ fromSize: 9, limit: SMI60 }], topBand: { min: 24, max: 441 }, bands: null, shape: "points",
      note: "A graduated matrix by income, size, fuel, region (±6%) and targeted group, $24 minimum to $441 maximum (gas and electric top out at $319, coal and wood $264); households at or under 50% of poverty get the maximum, PIPP Plus customers a reduced benefit; the 2025 matrix's projected average is $181.",
    },
    cooling: null, crisis: SMI60, servedShare: 0.22, upstream: null,
    sources: { limits: LIMITS, amounts: matrix("OH_BenefitMatrix_2026.pdf"), served: profile("Ohio") }, readOn: READ_ON,
  },
  {
    state: "OK",
    heating: {
      limit: fpg(130), sizeRules: null, topBand: { min: 235, max: 330 }, bands: null, shape: "staircase",
      note: "Three net-monthly-income bands ($0–400, $401–700, $701 to the limit) by fuel and size; the top band pays natural gas, electricity, wood and coal $235/$259/$277 (1–3, 4–6, 7+ people) and LP gas, kerosene and heating oil $280/$308/$330; renters with heat in the rent $100–$125, roomers $40. 'Benefit amounts are estimated' and adjusted to funding.",
    },
    cooling: null, crisis: null, servedShare: 0.36, upstream: null,
    sources: { limits: LIMITS, amounts: matrix("OK_BenefitMatrix_2026.docx"), served: profile("Oklahoma") }, readOn: READ_ON,
  },
  {
    state: "OR",
    heating: {
      limit: SMI60, sizeRules: null, topBand: { min: 250, max: 750 }, bands: null, shape: "staircase",
      note: "Four bands (quarters of the 60% SMI limit) by fuel, region and size; the top band pays electricity $250 (one person) to $345, natural gas $250–$455, heating oil, liquid gas and wood up to the $750 cap.",
    },
    cooling: null, crisis: null, servedShare: 0.14, upstream: null,
    sources: { limits: LIMITS, amounts: matrix("OR_BenefitMatrix_Heat-Cool_2026.pdf"), served: profile("Oregon") }, readOn: READ_ON,
  },
  {
    state: "PA",
    heating: {
      limit: FPG150, sizeRules: null, topBand: { min: 200, max: 200 }, bands: null, shape: "taper",
      note: "County charts (generated 2025-08-07) by annual income in $1,000 rows, fuel and size: from $1,000 at the bottom they decline to the $200 minimum by about $13,000 of income in Philadelphia and stay there, and the rows end at $22,999, below every size's limit — so at the limit every household is at $200.",
    },
    cooling: null, crisis: null, servedShare: 0.33, upstream: null,
    sources: { limits: LIMITS, amounts: matrix("PA_BenefitMatrix_2026.pdf"), served: profile("Pennsylvania") }, readOn: READ_ON,
  },
  {
    state: "RI",
    heating: {
      limit: SMI60, sizeRules: null, topBand: { min: 159, max: 657 }, bands: null, shape: "staircase",
      note: "Five FPG bands by fuel; band E (151% FPG to 60% SMI) pays deliverables $657, natural gas $159, electric and other $268; subsidized housing with its own heating bill the same, heat in rent $400 direct to the household; 'moderate matrix dependent on funding levels'.",
    },
    cooling: null, crisis: null, servedShare: 0.25, upstream: null,
    sources: { limits: LIMITS, amounts: matrix("RI_BenefitMatrix_2026.pdf"), served: profile("Rhode_Island") }, readOn: READ_ON,
  },
  {
    state: "SC",
    heating: {
      limit: { kind: "smi", pct: 60, vintage: "FY2025" }, sizeRules: null, topBand: { min: 200, max: 675 }, bands: null, shape: "points",
      note: "A $200 minimum plus add-ons: energy burden (20% of income or more) $175, heats with fuel $75, veteran $50, a child five or under $50, elderly $75, disabled $50, and $175 for income at or under 70% of the limit; $850 heating cap. The matrix's SMI limits ($49,478 for three) are the FY2025 figures — it cites LIHEAP-IM-2024-02 — so the row applies that vintage.",
    },
    cooling: null, crisis: null, servedShare: 0.09, upstream: null,
    sources: { limits: LIMITS, amounts: matrix("SC_BenefitMatrix_2026.pdf"), served: profile("South_Carolina") }, readOn: READ_ON,
  },
  {
    state: "SD",
    heating: {
      limit: fpg(200), sizeRules: [{ fromSize: 7, limit: SMI60 }, { fromSize: 10, limit: FPG150 }], topBand: { min: 668, max: 3093 }, bands: null, shape: "staircase",
      note: "Two income tiers (0 to mid, mid to max) by fuel and four regions; the upper tier pays coal and wood $668–$768, natural gas $792–$953, electric $1,198–$1,461, propane $2,249–$2,762, fuel oil $2,573–$3,093; heat in rent $800–$850. The Clearinghouse caveat: 200% FPG for one to six people, 60% SMI for seven to nine, 150% FPG for ten or more.",
    },
    cooling: null, crisis: null, servedShare: 0.30, upstream: null,
    sources: { limits: LIMITS, amounts: matrix("SD_BenefitMatrix_2026.pdf"), served: profile("South_Dakota") }, readOn: READ_ON,
  },
  {
    state: "TN",
    heating: {
      limit: SMI60, sizeRules: null, topBand: { min: 174, max: 750 }, bands: null, shape: "points",
      note: "Four income groups by size, then nine energy-burden columns; group D, the top (for example $31,181–$51,778 for three), pays $174 (one or two people), $225 (three to five), $300 (six to eight), $450 (nine or more) at the lowest burden and $750 at the highest.",
    },
    cooling: null, crisis: null, servedShare: 0.17, upstream: null,
    sources: { limits: LIMITS, amounts: matrix("TN_BenefitMatrix_Heating_2026.xlsx"), served: profile("Tennessee") }, readOn: READ_ON,
  },
  {
    state: "TX",
    heating: {
      limit: FPG150, sizeRules: null, topBand: { min: 1200, max: 1200 },
      bands: [{ upto: fpg(50), amount: 1800 }, { upto: fpg(75), amount: 1500 }], shape: "staircase",
      note: "10 TAC §6.309(e): a household may receive up to $1,800 per component at 0–50% FPG, $1,500 at more than 50% to 75%, $1,200 at more than 75% to 150%; heating and cooling are each a component, and crisis assistance is capped the same way. policyengine-us's tx_ceap is marked partial (FY2024–25 amounts) and returns $0 on HotGap's payload.",
    },
    cooling: null, crisis: null, servedShare: 0.03, upstream: null,
    sources: { limits: LIMITS, amounts: matrix("TX_BenefitMatrix_Heat-Cool_2026.pdf"), served: profile("Texas") }, readOn: READ_ON,
  },
  {
    state: "UT",
    heating: {
      limit: FPG150, sizeRules: null, topBand: { min: 140, max: 800 }, bands: null, shape: "points",
      note: "A formula (effective 2025-10-01): 250 less the household's percent of poverty, plus energy burden × 10 (at most 250), plus $150 for a target group (elderly, disabled, a child under six) and $150 for propane or oil; $140 minimum, $800 maximum.",
    },
    cooling: null, crisis: null, servedShare: 0.18, upstream: null,
    sources: { limits: LIMITS, amounts: matrix("UT_BenefitMatrix_2026.xlsx"), served: profile("Utah") }, readOn: READ_ON,
  },
  {
    state: "VT",
    heating: {
      limit: SMI60, sizeRules: null, topBand: { min: 249, max: 1229 }, bands: null, shape: "staircase",
      note: "A percentage of a standard heating cost by fuel, dwelling and bedrooms (Rules 2915–2916): 90% at 0–74% of poverty stepping to 27% at 175–185%; 27% of the $923–$4,552 proxies is $249–$1,229. The percentage table stops at 185% FPL while the Clearinghouse limit column says 60% SMI.",
    },
    cooling: null, crisis: null, servedShare: 0.36, upstream: null,
    sources: { limits: LIMITS, amounts: matrix("VT_BenefitMatrix_2026.pdf"), served: profile("Vermont") }, readOn: READ_ON,
  },
  {
    state: "VA",
    heating: {
      limit: FPG150, sizeRules: null, topBand: { min: 181, max: 634 }, bands: null, shape: null,
      note: "The Clearinghouse's FY2026 Virginia file is the EAP manual's income-limit page (150% FPL, applied to heating from FFY 2026) and prints no benefit amount, so the shape is unread; the range is the state's reported heating minimum and maximum (Benefit Levels table).",
    },
    cooling: null, crisis: null, servedShare: 0.29, upstream: null,
    sources: { limits: LIMITS, amounts: BENEFIT_LEVELS, served: profile("Virginia") }, readOn: READ_ON,
  },
  {
    state: "WA",
    heating: {
      limit: FPG150, sizeRules: null, topBand: { min: 250, max: 1250 }, bands: null, shape: "taper",
      note: "Benefit = the annual heat cost × (1.30 less income after a $500 deduction over the household's 150% FPL limit), on a benefit curve that starts at 90% of cost; the range is the state's reported heating minimum and maximum (Benefit Levels table).",
    },
    cooling: null, crisis: null, servedShare: 0.23, upstream: null,
    sources: { limits: LIMITS, amounts: BENEFIT_LEVELS, served: profile("Washington") }, readOn: READ_ON,
  },
  {
    state: "WV",
    heating: {
      limit: { kind: "smi", pct: 60, vintage: "FY2025" }, sizeRules: [{ fromSize: 8, limit: FPG150 }], topBand: { min: 1, max: 10000 }, bands: null, shape: null,
      note: "The Clearinghouse's FY2026 West Virginia file is an income-range worksheet computed from the FY2025 four-person SMI ($90,661; 60% $54,396) and prints no benefit amount, so the shape is unread and the row applies that vintage; the range is the state's reported heating minimum and maximum (Benefit Levels table).",
    },
    cooling: null, crisis: null, servedShare: 0.23, upstream: null,
    sources: { limits: LIMITS, amounts: BENEFIT_LEVELS, served: profile("West_Virginia") }, readOn: READ_ON,
  },
  {
    state: "WI",
    heating: {
      limit: SMI60, sizeRules: null, topBand: { min: 30, max: 2147 }, bands: null, shape: "taper",
      note: "A funding factor times the household's heating-cost proxy divided by its poverty ratio (floored at 60% of poverty, capped at 215%), $30 minimum, $2,575 maximum in the FFY2026 calculator; the range is the state's reported heating minimum and maximum (Benefit Levels table, $2,147).",
    },
    cooling: null, crisis: null, servedShare: 0.31, upstream: null,
    sources: { limits: LIMITS, amounts: BENEFIT_LEVELS, served: profile("Wisconsin") }, readOn: READ_ON,
  },
  {
    state: "WY",
    heating: {
      limit: SMI60, sizeRules: null, topBand: { min: 117, max: 251 }, bands: null, shape: "staircase",
      note: "A share of the season's fuel cost by fuel that steps from 80% (income under 20% of the limit) to 10% (86–99%), less a 10% holdback; the top step pays propane $117, natural gas $139, electricity $154, heating oil $251, coal $45, wood $105–$117.",
    },
    cooling: null, crisis: null, servedShare: 0.15, upstream: null,
    sources: { limits: LIMITS, amounts: matrix("WY_BenefitMatrix_2026.xlsx"), served: profile("Wyoming") }, readOn: READ_ON,
  },
];

/** The row for a state; a state HotGap serves without one is a bug, not a null. */
export function liheapRow(state: string): LiheapRow {
  const row = LIHEAP_TABLE.find((r) => r.state === state);
  if (!row) throw new Error(`no LIHEAP row for ${state}`);
  return row;
}

/**
 * The SPM-unit variable that models this state's schedule upstream and can
 * be asked for as a program series — DC, MA, IL today — or null: Michigan's
 * credit is a tax-unit variable HotGap already reads through stateCredits.
 */
export function liheapUpstreamVariable(state: string): string | null {
  const { upstream } = liheapRow(state);
  return upstream && upstream.counted === undefined ? upstream.variable : null;
}

/** Every such variable, so a response can be read without knowing its state first (parse.ts). */
export const LIHEAP_UPSTREAM_VARIABLES: readonly string[] = LIHEAP_TABLE.flatMap((r) => (r.upstream && r.upstream.counted === undefined ? [r.upstream.variable] : []));

interface SmiJson {
  read: string;
  fiscalYear: string;
  period: string;
  source: { commit: string; url: Record<string, string>; publisher: string; acf: { title: string; href: string }; sizeRule: string; periods: Record<string, string> };
  adjustment: { firstPerson: number; secondToSixthPerson: number; additionalPerson: number; additionalPersonThreshold: number };
  states: Record<string, { fourPerson: Record<string, number> }>;
}

const smiFile = (): SmiJson => {
  const json = readData<SmiJson>("smi.json");
  if (!json) throw new Error("data/smi.json is missing — run `node scripts/build-smi.mjs`");
  return json;
};

/** What core/data/smi.json says about itself, for a surface's provenance line. */
export const smiProvenance = (): { fiscalYear: string; read: string; commit: string; acf: { title: string; href: string } } => {
  const { fiscalYear, read, source } = smiFile();
  return { fiscalYear, read, commit: source.commit, acf: source.acf };
};

/**
 * `pct`% of the state median income for a household of this size, on the
 * 45 CFR 96.85 ladder: the four-person figure times 52% for one person, +16
 * points a person through six, +3 points a person beyond. FY2026 unless the
 * row says the state still applies FY2025's table.
 */
export function smiLimit(state: string, size: number, pct: number, vintage: "FY2025" | "FY2026" = "FY2026"): number {
  const { adjustment: a, states } = smiFile();
  const fourPerson = states[state]?.fourPerson[vintage];
  if (fourPerson === undefined) throw new Error(`no ${vintage} SMI for ${state}`);
  const n = Math.max(1, size);
  const share = a.firstPerson + a.secondToSixthPerson * (Math.min(n, a.additionalPersonThreshold) - 1) + a.additionalPerson * Math.max(0, n - a.additionalPersonThreshold);
  return (pct / 100) * share * fourPerson;
}

/** A limit in annual household-income dollars for this state and size. */
export function liheapLimitDollars(state: string, limit: LiheapLimit, size: number): number {
  switch (limit.kind) {
    case "fpg": return (limit.pct / 100) * fpl2025(state, size);
    case "smi": return smiLimit(state, size, limit.pct, limit.vintage ?? "FY2026");
    case "smi-by-size": return smiLimit(state, size, limit.pct[Math.min(Math.max(1, size), limit.pct.length) - 1]);
  }
}

/** A limit in the words a coverage note prints: "150% of the poverty guideline", "60% of state median income", Maryland's slide (messages/en.json `liheap.limit.*`; a surface renders the same codes in its language). */
export function liheapLimitWords(limit: LiheapLimit): string {
  switch (limit.kind) {
    case "fpg": return message("liheap.limit.fpg", { pct: limit.pct });
    case "smi": return limit.vintage ? message("liheap.limit.smiVintage", { pct: limit.pct, vintage: limit.vintage }) : message("liheap.limit.smi", { pct: limit.pct });
    case "smi-by-size": return message("liheap.limit.smiBySize", { from: limit.pct[0], to: limit.pct[limit.pct.length - 1] });
  }
}

/** The heating limit that governs a household of this size: the last size rule reached, else the state's base limit. */
export function heatingLimitFor(row: LiheapRow, size: number): LiheapLimit {
  let limit = row.heating.limit;
  for (const rule of row.heating.sizeRules ?? []) if (size >= rule.fromSize) limit = rule.limit;
  return limit;
}

/**
 * LIHEAP counts the gross income of everyone in the household, so the
 * earner's own pay at the limit is the limit less what the rest of the
 * household brings in: the spouse's wages and the monthly non-wage income the
 * answers carry (SSDI, unemployment, child support), annualized.
 */
const otherHouseholdIncome = (a: HouseholdAnswers): number =>
  a.spouseAnnualEarnings + 12 * (a.ssdiMonthly + a.unemploymentMonthly + a.childSupportMonthly);

/** The boundary as a surface prints it: three facts and their provenance, from the row. */
export interface LiheapBoundary {
  component: "heating";
  /** The earner's own annual pay above which the household can no longer apply. */
  earningsLimit: number;
  /** The same limit as gross household income, the figure the state publishes. */
  householdIncomeLimit: number;
  limit: LiheapLimit;
  topBand: { min: number; max: number } | null;
  shape: LiheapShape | null;
  servedShare: number | null;
  upstream: LiheapRow["upstream"];
  /** True when the toggle put the dollars into the curve, so the marker reads as an end, not a boundary. */
  counted: boolean;
  sources: LiheapRow["sources"];
  readOn: string;
  note: string;
}

/**
 * Where energy assistance stops for this household, when that lies inside the
 * curve's earnings range; null when the curve ends below it. Pure: the answers
 * and the axis only, so the live and archetype paths agree for the same
 * answers. Not a Cliff, not a program end, not in any metric — with the
 * toggle off there is nothing in the money line to lose.
 */
export function liheapBoundary(answers: HouseholdAnswers, curve: CurveResponse): LiheapBoundary | null {
  const row = liheapRow(answers.state);
  const size = householdSize(answers);
  const limit = heatingLimitFor(row, size);
  const householdIncomeLimit = Math.round(liheapLimitDollars(answers.state, limit, size));
  const earningsLimit = householdIncomeLimit - otherHouseholdIncome(answers);
  const points = curve.points;
  if (points.length === 0 || earningsLimit <= points[0].earnings || earningsLimit > points[points.length - 1].earnings) return null;
  return {
    component: "heating",
    earningsLimit, householdIncomeLimit, limit,
    topBand: row.heating.topBand, shape: row.heating.shape, servedShare: row.servedShare, upstream: row.upstream,
    counted: answers.getsEnergyAssistance && row.upstream?.counted !== "state credit",
    sources: row.sources, readOn: row.readOn, note: row.heating.note,
  };
}

/**
 * What the toggle puts into the curve at this pay: the published amount for
 * the family's band where the matrix gives an income-only staircase, else the
 * top band's minimum flat to the limit; zero above the limit, zero with the
 * toggle off, and zero in Michigan, whose heating money is already in the
 * curve as the Home Heating Credit. Annual, one heating season. The dollars a
 * points or burden state would really pay depend on facts HotGap never asks
 * (fuel, bill, dwelling), so the minimum is the claim it can stand behind.
 */
export function liheapAmount(answers: HouseholdAnswers, earnings: number): number {
  if (!answers.getsEnergyAssistance) return 0;
  const row = liheapRow(answers.state);
  if (row.upstream?.counted === "state credit" || !row.heating.topBand) return 0;
  const size = householdSize(answers);
  const income = earnings + otherHouseholdIncome(answers);
  if (income > liheapLimitDollars(answers.state, heatingLimitFor(row, size), size)) return 0;
  for (const band of row.heating.bands ?? []) if (income <= liheapLimitDollars(answers.state, band.upto, size)) return band.amount;
  return row.heating.topBand.min;
}
