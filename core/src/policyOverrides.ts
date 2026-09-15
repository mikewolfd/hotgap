import { fpl2026Contiguous } from "./policyYear.js";
import { householdSize, YEAR, type HouseholdAnswers } from "./types.js";

export type PolicyOverrides = Record<string, Record<string, number | string[]>>;
const PERIOD = "2026-01-01.2026-12-31";
const PARENT_LIMIT = "gov.hhs.medicaid.eligibility.categories.parent.income_limit";
export const BHP_EXPANDED_STATES = "gov.hhs.basic_health_program.eligibility.expanded_income_limit_states";

// These are current-rule, annualized 2026 curves, including changes effective
// during 2026. They do not prorate the months before a change. Sources checked
// 2026-09-15. Issue reports are local drafts, not filed GitHub issues.
const PARENT_ISSUE = "docs/upstream/2026-09-14-policyengine-issues.md#issue-5--parentcaretaker-medicaid-income-limits-are-five-years-stale-in-the-frozen-dollar-standard-states";
export const POLICY_OVERRIDE_SOURCES = {
  TX: { source: "https://fhb.hhs.texas.gov/handbooks/texas-works-handbook/c-130-medical-programs", issueReport: PARENT_ISSUE },
  MS: { source: "https://medicaid.ms.gov/medicaid-coverage/who-qualifies-for-coverage/income-limits-for-medicaid-and-chip-programs/", issueReport: PARENT_ISSUE },
  GA: { source: "https://pamms.dhs.ga.gov/dfcs/medicaid/appendix-a2/2026-family-limits/", issueReport: PARENT_ISSUE },
  FL: { source: "https://ffic.myflfamilies.com/manual/essfiles/30446.pdf", issueReport: PARENT_ISSUE },
  WY: { source: "https://health.wyo.gov/healthcarefin/medicaid/programs-and-eligibility/medicaid-income-requirements/", issueReport: PARENT_ISSUE },
  SC: { source: "https://www.scdhhs.gov/sites/dhhs/files/pdf/links/Medicaid%20Eligibility%20Groups%20Effective%201.1.pdf", issueReport: PARENT_ISSUE },
  NY: {
    source: "https://www.cms.gov/files/document/1332-ny-termination-approval-letter.pdf",
    issueReport: "docs/upstream/2026-09-14-policyengine-issues.md#issue-2--new-yorks-basic-health-program-ceiling-is-held-at-250-fpl-for-all-of-2026-cms-terminated-the-1332-waiver-effective-2026-07-01",
  },
} as const;

// Rows cover household sizes 1–8, the full range validateAnswers accepts.
// MS and GA publish limits INCLUDING the MAGI disregard; FL lists its two
// disregards separately. TX distinguishes one-parent and two-parent cases.
const MONTHLY_LIMITS = {
  MS: [294, 396, 498, 600, 702, 804, 906, 1007],
  GA: [376, 546, 662, 787, 909, 1006, 1106, 1196],
  FL: [180 + 109 + 67, 241 + 146 + 91, 303 + 183 + 114, 364 + 221 + 138,
    426 + 258 + 162, 487 + 296 + 185, 549 + 333 + 209, 610 + 371 + 233],
  WY: [529, 737, 873, 999, 1192, 1327, 1515, 1644],
  TX_SINGLE: [103, 196, 230, 277, 310, 356, 389, 441],
  TX_MARRIED: [0, 161, 251, 285, 332, 367, 412, 447],
  TX_DISREGARD: [66.50, 90.20, 113.85, 137.50, 161.20, 184.85, 208.50, 232.20],
} as const;

/** Fraction of the 2026 poverty guideline, inclusive of the MAGI disregard. */
export function parentMedicaidLimit(a: HouseholdAnswers): number | null {
  if (YEAR !== "2026") throw new Error("Revalidate PolicyEngine overrides for the new policy year");
  if (a.childAges.length === 0) return null;
  const n = householdSize(a);
  if (n < 1 || n > 8) throw new Error("Parent Medicaid override supports household sizes 1–8");
  // PolicyEngine's Medicaid denominator is the 2026 guideline; every state
  // here is contiguous. Keep full precision; rounding to whole percentages
  // moves cliffs.
  const fpl = fpl2026Contiguous(n);
  const i = n - 1;
  switch (a.state) {
    case "SC": return 0.67;
    case "TX": return 12 * (MONTHLY_LIMITS[a.married ? "TX_MARRIED" : "TX_SINGLE"][i] + MONTHLY_LIMITS.TX_DISREGARD[i]) / fpl;
    case "WY": return 12 * MONTHLY_LIMITS.WY[i] / fpl + 0.05;
    case "MS": case "GA": case "FL": return 12 * MONTHLY_LIMITS[a.state][i] / fpl;
    default: return null;
  }
}

/** Corrections for this household only; PolicyEngine still decides eligibility. */
export function policyOverridesFor(a: HouseholdAnswers): PolicyOverrides {
  if (YEAR !== "2026") throw new Error("Revalidate PolicyEngine overrides for the new policy year");
  const policy: PolicyOverrides = {};
  const parent = parentMedicaidLimit(a);
  if (parent !== null) policy[`${PARENT_LIMIT}.${a.state}`] = { [PERIOD]: parent };
  // Only NY requests receive this list replacement, so another state's
  // expanded BHP eligibility cannot be changed by this workaround.
  if (a.state === "NY") policy[BHP_EXPANDED_STATES] = { [PERIOD]: [] };
  return policy;
}
