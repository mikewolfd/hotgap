// WORKAROUND — remove when every endpoint serves each state's own variable
// (policyengine-us #9481: `ct_covered_connecticut` 1.795.0, `ma_connector_care`
// 1.799.0, `assigned_nm_premium_assistance`, `assigned_ca_premium_subsidy`;
// statePremiumAssistance.ts). The hosted engine at 2.6.2 serves all four, so
// on the committed sweep this table never fires; it stands in on the public
// API (1.764.6), which has none of them.
//
// PolicyEngine charges every marketplace enrollee the benchmark premium net of
// the federal premium tax credit. Four states pay that remainder off entirely
// for their lowest-income enrollees, so a model without the state's program
// overstates the Medicaid → marketplace step there by the whole net premium.
// This table is the $0 tier and nothing else.
//
// SCOPE: only the $0-premium tiers. Every one of these states also runs a
// reduced-premium sliding scale ABOVE its $0 tier — Massachusetts' $53 at
// 150.1–200% FPL, New Mexico's 0–2% of income at 200–250%, California's
// 3.19–3.91% at 150–165%, Connecticut's ordinary APTC above 175% — and none of
// that is modeled here. A household above the bound gets no correction, which
// leaves PolicyEngine's (still slightly overstated) premium in place rather
// than inventing a partial one.
//
// Coverage year 2026. Each row carries its publisher, the exact table, and the
// date it was read, because these bounds are re-legislated annually — moving
// the policy year means re-reading every one of them from the state's own page,
// never from a cached percentage (the rule policyYear.ts sets out).
//
// Six states were checked and EXCLUDED because no state page states an
// FPL-bounded $0 tier for 2026 — see statePremiumWraps.test.ts for the list and
// what each actually pays.

/** A state's own $0-premium tier for marketplace coverage, coverage year 2026. */
export interface PremiumWrap {
  state: string;
  program: string;
  /** Fraction of the federal poverty line, e.g. 1.75. At or below it the enrollee pays $0. */
  zeroPremiumUpToFpl: number;
  /** The state exchange or state agency page the bound was read from. */
  source: string;
  /** ISO date the source was read. */
  readOn: string;
  /** Conditions the state attaches to the $0 tier. */
  note?: string;
  /**
   * The state's reduced-premium tier just above the $0 band, where one exists,
   * so the band edge steps to the real next price rather than to the full
   * federal net premium (a manufactured cliff). `annualPremium` is what the
   * household pays at a given MAGI and FPL share inside (zeroPremiumUpToFpl,
   * upToFpl], for `enrollees` people on the plan — every one of them, since
   * Massachusetts' table is per person and a child off MassHealth pays it
   * too. Connecticut has none: Covered Connecticut is a hard cutoff.
   */
  tiers?: PremiumTier[];
}

/** One reduced-premium band above the $0 tier: (previous bound, upToFpl]. */
export interface PremiumTier {
  upToFpl: number;
  annualPremium: (magi: number, fplShare: number, enrollees: number) => number;
  source: string;
}

/** Linear interpolation of an applicable percentage between two FPL shares. */
const pctBetween = (share: number, from: number, to: number, pctFrom: number, pctTo: number): number =>
  pctFrom + ((Math.min(Math.max(share, from), to) - from) / (to - from)) * (pctTo - pctFrom);

// Every program below conditions its help on the enrollee being eligible for
// the federal premium tax credit, and 26 CFR 1.36B-2(b)(1) puts that credit's
// floor at 100% of the poverty line — the same floor evaluate.ts's coverage-gap
// correction is measured against. Below it there is no APTC to top up, so there
// is no wrap either; a household down there is on Medicaid or in the gap.
const APTC_FPL_FLOOR = 1.0;

export const STATE_PREMIUM_WRAPS: readonly PremiumWrap[] = [
  {
    // Connecticut DSS, "Covered Connecticut Program", income guidelines
    // "effective January 1, 2026 through December 31, 2026": household of one
    // $27,387.50, which is exactly 175% of the 2025 guideline ($15,650) that
    // governs coverage year 2026 — the same FPL vintage as policyYear.ts's
    // FPL_2025. Re-derived from the exchange rather than trusted once: Access
    // Health CT's own help center gives the same 175% bound, the Silver-plan
    // requirement and the 19–64 age range
    // (https://help.accesshealthct.com/en_US/covered-connecticut-program).
    state: "CT",
    program: "Covered Connecticut Program",
    zeroPremiumUpToFpl: 1.75,
    source: "https://portal.ct.gov/dss/health-and-home-care/covered-connecticut-program",
    readOn: "2026-09-15",
    note: "Ages 19–64 and ineligible for HUSKY Health/Medicaid on income. Must enroll in a Silver plan on Access Health CT and use 100% of available APTC and cost-sharing reductions; the state pays the rest of the premium and the cost sharing.",
  },
  {
    // Massachusetts Health Connector, "ConnectorCare Plans", 2026 Plan Year
    // table: Plan Type 2A, FPL range 100–150%, "2026 Lowest-cost Monthly
    // Premium per person" $0. The tiers above it on the same table are 2B
    // (150.1–200%) $53, 3A (200.1–250%) $103, 3B (250.1–300%) $152 and 3C
    // (300.1–400%) $235 — the reduced-premium scale this module leaves alone.
    state: "MA",
    program: "ConnectorCare Plan Type 2A",
    zeroPremiumUpToFpl: 1.50,
    // 2026 lowest-cost premium per enrollee per month, same page: 2B (150.1–200%
    // FPL) $53, 3A (200.1–250%) $103, 3B (250.1–300%) $152, 3C (300.1–400%) $235.
    // PolicyEngine models 2B itself but not 3A–3C (external validation,
    // docs/reviews/2026-09-15-external-validation.md, finding 2).
    tiers: [
      { upToFpl: 2.00, annualPremium: (_m, _s, enrollees) => 53 * 12 * enrollees, source: "https://www.mahealthconnector.org/learn/plan-information/connectorcare-plans" },
      { upToFpl: 2.50, annualPremium: (_m, _s, enrollees) => 103 * 12 * enrollees, source: "https://www.mahealthconnector.org/learn/plan-information/connectorcare-plans" },
      { upToFpl: 3.00, annualPremium: (_m, _s, enrollees) => 152 * 12 * enrollees, source: "https://www.mahealthconnector.org/learn/plan-information/connectorcare-plans" },
      { upToFpl: 4.00, annualPremium: (_m, _s, enrollees) => 235 * 12 * enrollees, source: "https://www.mahealthconnector.org/learn/plan-information/connectorcare-plans" },
    ],
    source: "https://www.mahealthconnector.org/learn/plan-information/connectorcare-plans",
    readOn: "2026-09-15",
    note: "The $0 is the LOWEST-cost ConnectorCare plan in the enrollee's area; other carriers' Plan Type 2A plans can still charge a premium. Requires Massachusetts residency, lawful presence, no access to affordable employer coverage, and ineligibility for MassHealth or Medicare.",
  },
  {
    // New Mexico Health Care Authority, "2026 Plan Year Health Insurance
    // Marketplace Affordability Program — Policy & Procedure Manual", Table 1
    // (NMPA Sliding Scale, premium as % of income): "Up to 150% — 0%",
    // "150-200% — 0%", then 200-250% 0-2%, 250-300% 2-5%, 300-400% 5-8.5%,
    // "400%+ — No HCAF Assistance". Linked from the HCAF page below as
    // api.realfile.rtsclients.com/PublicFiles/6c91aefc960e463485b3474662fd7fd2
    // /15a6c1dd-e12b-4ffb-95af-bb54262218f3/FINAL-PY26%20%20MAP%20Policy%20and
    // %20Procedures%20Manual.pdf — a contractor file host, so the state agency
    // page is what this row cites.
    //
    // The manual's payment formula makes the bound inclusive: the 110%-of-
    // benchmark equation applies "for individuals under 200% FPL" and the plain
    // benchmark one "for individuals between 200.01-400% FPL". Re-derived from
    // a second state artifact rather than read once: the NM HCA's own CY2026
    // premium assistance calculator, published on the exchange at
    // bewellnm.com/wp-content/uploads/2024/12/nm_premium_assistance_calculator
    // _CY2026_final2.html, computes the state's expected contribution as 0.0
    // for every fplShare below 2.0 and a rising scale above it.
    state: "NM",
    program: "New Mexico Premium Assistance (Marketplace Affordability Program)",
    zeroPremiumUpToFpl: 2.00,
    // PY26 MAP manual, Table 1: 200–250% FPL contributes 0%→2% of income.
    tiers: [{ upToFpl: 2.50, annualPremium: (magi, share) => magi * pctBetween(share, 2.00, 2.50, 0, 0.02), source: "https://www.hca.nm.gov/health-care-coverage-innovations-hcaf/" }],
    source: "https://www.hca.nm.gov/health-care-coverage-innovations-hcaf/",
    readOn: "2026-09-15",
    note: "0% of income toward the benchmark plan, and below 200% FPL the benchmark is priced at 110% of the second-lowest-cost Silver plan, so every plan at or under that price is $0. Requires APTC eligibility. Members of federally recognized tribes get a wider $0 tier (lowest-cost plan from each issuer, to 300% FPL) that this row does not model.",
  },
  {
    // Covered California, "2026 California State Premium Subsidy Program"
    // policy explainer (published 2026-02-20), Table 1 (Applicable
    // Percentages), "2026 California Premium Subsidy Program" column: "Under
    // 138% — 0.0%*", "138% – Under 150% — 0.0%*", then "150% – At or Below
    // 165% — 3.19% – 3.91%*" and nothing above 165%. $190 million from the
    // Health Care Affordability Reserve Fund, reinstated for PY2026 after the
    // ARPA/IRA enhanced credits expired.
    //
    // BOUND IS EXCLUSIVE IN THE SOURCE: California's 0% band is "under 150%",
    // so an enrollee at exactly 150.00% FPL owes 3.19%, not $0. This row rounds
    // to the band edge — 1.50 with `<=` — because a curve sampled at $1,000
    // steps never lands on the boundary exactly, and the note is the record of
    // where the real edge is.
    state: "CA",
    program: "California Premium Subsidy",
    zeroPremiumUpToFpl: 1.50,
    // 2026 policy explainer, Table 1: 150–165% FPL applicable percentage 3.19%→3.91%.
    tiers: [{ upToFpl: 1.65, annualPremium: (magi, share) => magi * pctBetween(share, 1.50, 1.65, 0.0319, 0.0391), source: "https://hbex.coveredca.com/stakeholders/PDFs/2026-02_StatePremiumSub_PolicyExplainer-Final.pdf" }],
    source: "https://hbex.coveredca.com/stakeholders/PDFs/2026-02_StatePremiumSub_PolicyExplainer-Final.pdf",
    readOn: "2026-09-15",
    note: "0% applicable percentage against the benchmark (second-lowest-cost Silver) plan. The enrollee must otherwise be eligible for federal APTC and apply on Covered California's subsidized application; at or below 138% FPL most Californians are Medi-Cal eligible instead, and Medi-Cal enrollees receive neither APTC nor the state subsidy. The published band is 'under 150%' — at exactly 150% FPL the applicable percentage is 3.19%.",
  },
];

// ── The other shape of state help: a flat amount per person per month ──────
//
// WORKAROUND — remove when every endpoint serves the state's own variable
// (`nj_njhps`, `wa_cascade_care_savings`; statePremiumAssistance.ts). New
// Jersey and Washington do not buy a $0 tier: they hand the carrier a fixed
// number of dollars a month for each person on the plan, so no FPL-bounded
// ladder fits them and, until 2026-09-16, HotGap modeled neither — they were
// the two states the journalist map hatched as "figures incomplete".
//
// Upstream models both (policyengine-us #9224 and #9222, shipped in 1.801.0
// and 1.797.0), and the hosted engine at 2.6.2 serves both, so on that
// endpoint this table never fires: applyStatePremiumAssistance nets the
// engine's own figure out first and applyPerMemberPremiumHelp stands down.
// It exists for the endpoints that predate those releases — the public API at
// 1.764.6 — so a New Jersey household is not shown a premium $1,200 too high
// on one endpoint and right on the other.
//
// Coverage year 2026, and the same rule the $0 table runs on: publisher, the
// exact table, and the date it was read, because both schedules are set
// annually — New Jersey's in the Health Insurance Affordability Fund's
// appropriation, Washington's by the Exchange Board within its.
export interface PerMemberPremiumHelp {
  state: string;
  program: string;
  /** Bands in ascending order; the first whose `upToFpl` covers the share wins. */
  bands: readonly PerMemberBand[];
  /** Below this share of the poverty line the program pays nothing. */
  fromFpl: number;
  /** The publisher's page or document the schedule was read from. */
  source: string;
  /** ISO date the source was read. */
  readOn: string;
  /** The upstream issue whose release retires this row, e.g. "#9224". */
  upstreamIssue: string;
  /** Conditions the state attaches. */
  note: string;
}

/** One band of a per-member schedule: (previous bound, upToFpl], paid monthly per person on the plan. */
export interface PerMemberBand {
  upToFpl: number;
  monthlyPerMember: number;
}

export const PER_MEMBER_PREMIUM_HELP: readonly PerMemberPremiumHelp[] = [
  {
    // U.S. Treasury, Office of Tax Analysis, "Section 1332 ... Methodology
    // Addendum" for New Jersey's pass-through (November 2021), the bullets on
    // PDF page 9 and Table 2's "Enhanced Monthly State Subsidy" column on page
    // 12: "From 138% through 150% of FPL: $20 per member per month (PMPM)";
    // "150% through 200%: $40"; "200% through 250%: $50"; "250% through 400%:
    // $100"; "400% through 600%: $50". The SAME PDF's February 2021 half lists
    // the superseded initial schedule ($20/$30/$40/$95, to 400% only); the $95
    // is the tell for a reader who grabbed the wrong list.
    //
    // No New Jersey document for plan year 2026 restates the five amounts —
    // Get Covered NJ's page sends the reader to its calculator — so the
    // schedule's currency rests on three DOBI statements, each read from the
    // Legislature's copy on 2026-09-16: FY2025-2026 budget discussion points,
    // p.8 ("The lowest amount an eligible individual can receive per month in
    // New Jersey Health Plan Savings is $20 and the maximum is $100"; "$100 per
    // person per month ... $400 a month for a family of four at 300% FPL"),
    // pub.njleg.state.nj.us/publications/budget/governors-budget/2026/dobi_
    // response_2026.pdf; FY2026-2027 discussion points, p.4 ("While the
    // enhanced APTCs were not extended by the federal government in 2026, the
    // Department continued providing NJ Health Plan Savings subsidies up to
    // 600% FPL"), .../2027/dobi_response_2027.pdf; and the 2026-08-18 letter
    // to the Assembly Budget Committee, p.5 ("For plan year 2026 (using 2025
    // FPL levels) ... 600 percent of FPL is $192,900" for four — the FPL_2025
    // vintage policyYear.ts uses), .../2027/dobi_follow_up_response_abu.pdf.
    // The FY2027 document's PY2025 cohort averages ($16 under 200% FPL, $43 at
    // 200–250%, $91 and $96 at 250–400%, $40 above 400%) all sit at or under
    // the schedule, as a premium-capped flat amount must.
    //
    // Re-derived from the deployed model rather than trusted once: on
    // policyengine-us 2.6.2 a single adult's `nj_njhps` steps $0 → $20 → $40 →
    // $50 → $100 → $50 → $0 at the first $1,000 past 138, 150, 200, 250, 400 and
    // 600% of the 2025 guideline — the same schedule, upper-inclusive.
    state: "NJ",
    program: "NJ Health Plan Savings",
    fromFpl: 1.38,
    bands: [
      { upToFpl: 1.50, monthlyPerMember: 20 },
      { upToFpl: 2.00, monthlyPerMember: 40 },
      { upToFpl: 2.50, monthlyPerMember: 50 },
      { upToFpl: 4.00, monthlyPerMember: 100 },
      { upToFpl: 6.00, monthlyPerMember: 50 },
    ],
    source: "https://www.cms.gov/files/document/1332-ota-methodology-addendum-nj-pass-through.pdf",
    readOn: "2026-09-16",
    upstreamIssue: "#9224",
    note: "Paid to the carrier on top of the federal credit and capped at the premium left after it, for every person on a Get Covered NJ plan at any metal level; not reported on Form 1095-A or reconciled on Form 8962. Below 138% FPL an adult is on NJ FamilyCare and gets nothing; a child is FamilyCare-eligible to 355% FPL and gets nothing while so, which is why the household count follows who is off Medicaid and CHIP at each point. Not conditioned on federal credit eligibility: above 400% FPL, where the credit ended for 2026, the $50 is the only help. Citizens, nationals and the lawfully present only. Set by the Commissioner under P.L. 2020 c.61, not in statute, and the fund's projected FY2027 closing balance is $0 — reread for 2027.",
  },
  {
    // Washington Health Benefit Exchange, "Final Cascade Care Savings amounts
    // for plan year 2026 released" (memo dated 2025-09-30, with Wakely's
    // exhibits), p.1: "Customers with federal subsidies: $55 per member, per
    // month (PMPM)"; "Customers without federal subsidies: $250 PMPM"; "the
    // program's $55 million legislative appropriation for plan year 2026". The
    // exhibit on p.7 carries the year-over-year: Group 1 $155 → $55, Group 2/3
    // $250 → $250.
    //
    // The rules are the Exchange's "Plan year 2026 final Cascade Care Savings
    // policy" (PDF dated 2025-03-31), wahbexchange.org/content/dam/wahbe-assets
    // /materials/collateral/cc/FinalPY2026CascadeCareSavingsPolicy_Combined.pdf:
    // §4(1)(c), p.11, "Has income up to 250% of the Federal Poverty Level" (no
    // floor); §4(1)(d)–(e) a Silver or Gold Cascade Care plan and "accepts all
    // APTC for which the individual's household is eligible"; §5(1)(c), p.14,
    // the base amount "multiplied by the number of eligible enrollees";
    // §5(1)(d) the household amount capped at the lesser of the net premium
    // after APTC and what the members would pay in the county's lowest-cost
    // Cascade Care Silver plan. Attachment 1, p.3, lists the "benchmark
    // premium expectation" ($0/$0/$15 a month by band) among the "policy
    // concepts included in the final draft ... but not included in the final
    // policy" — upstream's model subtracts the draft's $0/$10/$15 anyway,
    // which is the defect its retirement note in docs/upstream names. RCW
    // 43.71.110(4)(a)(ii) leaves the income threshold to the appropriation or
    // the Exchange; 250% is not in statute.
    //
    // Re-derived from the deployed model: on policyengine-us 2.6.2 a single
    // adult's `wa_cascade_care_savings` is $55 a month at every $1,000 step
    // from the first past 138% (Apple Health's edge, not the program's) to the
    // first past 250% of the 2025 guideline, then $0.
    //
    // The $250 for members without federal subsidies is not carried: HotGap's
    // households are lawfully present and, inside 250% FPL, credit-eligible.
    state: "WA",
    program: "Cascade Care Savings",
    fromFpl: APTC_FPL_FLOOR,
    bands: [{ upToFpl: 2.50, monthlyPerMember: 55 }],
    source: "https://www.wahbexchange.org/content/dam/materials/communications/legislative/2025/WAHBE_Final_PY_2026_Cascade_Care_Savings_Maximum_Per_Member_Per_Month_Methodology.pdf",
    readOn: "2026-09-16",
    upstreamIssue: "#9222",
    note: "A Silver or Gold Cascade Care (standardized) plan from a carrier that does not tobacco-rate; all federal credit and cost-sharing help taken first; the household amount is the per-member amount times the members on the plan, capped at the lesser of the premium left after the credit and what those members would pay in the county's lowest-cost Cascade Care Silver plan. Nobody eligible for Apple Health, Medicare or COFA premium assistance. A hard edge at 250% FPL: the whole amount ends there. The amounts are set each year by the Exchange within the appropriation ($55 million for 2026), and the program may close to new enrollees if spending outruns it (Policy §11).",
  },
];

/**
 * The state's flat per-member help for a marketplace enrollee at this share of
 * FPL, with the monthly amount per person, or null.
 *
 * The same 100%-FPL floor the $0 table takes: every one of these programs
 * conditions on federal premium-credit eligibility, whose floor is 26 CFR
 * 1.36B-2(b)(1). A state's own floor can be higher, and `fromFpl` carries it.
 */
export function perMemberPremiumHelpFor(state: string, fplShare: number): { help: PerMemberPremiumHelp; monthlyPerMember: number } | null {
  if (!Number.isFinite(fplShare) || fplShare < APTC_FPL_FLOOR) return null;
  const help = PER_MEMBER_PREMIUM_HELP.find((h) => h.state === state);
  if (!help || fplShare < help.fromFpl) return null;
  const band = help.bands.find((b) => fplShare <= b.upToFpl);
  return band && band.monthlyPerMember > 0 ? { help, monthlyPerMember: band.monthlyPerMember } : null;
}

/** The state's $0-premium tier for a marketplace enrollee at this share of FPL, or null. */
export function premiumWrapFor(state: string, fplShare: number): PremiumWrap | null {
  if (!Number.isFinite(fplShare) || fplShare < APTC_FPL_FLOOR) return null;
  return STATE_PREMIUM_WRAPS.find((w) => w.state === state && fplShare <= w.zeroPremiumUpToFpl) ?? null;
}

/** The state's reduced-premium tier a marketplace enrollee at this share of FPL sits in, or null. */
export function premiumTierAbove(state: string, fplShare: number): { wrap: PremiumWrap; tier: PremiumTier } | null {
  const w = STATE_PREMIUM_WRAPS.find((row) => row.state === state);
  if (!w?.tiers || fplShare <= w.zeroPremiumUpToFpl) return null;
  const tier = w.tiers.find((t) => fplShare <= t.upToFpl);
  return tier ? { wrap: w, tier } : null;
}
