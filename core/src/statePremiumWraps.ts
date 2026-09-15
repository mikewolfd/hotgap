// WORKAROUND — remove when upstream models state premium wraps (policyengine-us #9481).
//
// PolicyEngine charges every marketplace enrollee the benchmark premium net of
// the federal premium tax credit. Four states pay that remainder off entirely
// for their lowest-income enrollees, so PolicyEngine's Medicaid → marketplace
// step is overstated there by the whole net premium. This table is the $0 tier
// and nothing else.
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
}

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
    source: "https://hbex.coveredca.com/stakeholders/PDFs/2026-02_StatePremiumSub_PolicyExplainer-Final.pdf",
    readOn: "2026-09-15",
    note: "0% applicable percentage against the benchmark (second-lowest-cost Silver) plan. The enrollee must otherwise be eligible for federal APTC and apply on Covered California's subsidized application; at or below 138% FPL most Californians are Medi-Cal eligible instead, and Medi-Cal enrollees receive neither APTC nor the state subsidy. The published band is 'under 150%' — at exactly 150% FPL the applicable percentage is 3.19%.",
  },
];

/** The state's $0-premium tier for a marketplace enrollee at this share of FPL, or null. */
export function premiumWrapFor(state: string, fplShare: number): PremiumWrap | null {
  if (!Number.isFinite(fplShare) || fplShare < APTC_FPL_FLOOR) return null;
  return STATE_PREMIUM_WRAPS.find((w) => w.state === state && fplShare <= w.zeroPremiumUpToFpl) ?? null;
}
