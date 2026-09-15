// Policy year every calculation runs against (PolicyEngine variable period).
export const YEAR = "2026" as const;

export type ProgramId =
  | "snap" | "medicaid" | "chip" | "eitc" | "ctc"
  | "aca" | "tanf" | "housing" | "wic" | "ssi"
  | "headstart" | "schoolmeals";

export const PROGRAM_IDS: ProgramId[] = [
  "snap", "medicaid", "chip", "eitc", "ctc", "aca", "tanf", "housing", "wic", "ssi",
  "headstart", "schoolmeals",
];

// The three kinds of program value, because they do not belong in the same
// sum. CASH is money (or near-money) the household receives; CREDIT is a
// refundable tax credit or premium subsidy; COVERAGE is a *sticker* value —
// PolicyEngine's estimate of what Medicaid/CHIP coverage is worth, which is
// never cash and is never inside netIncome. Mixing the third into a benefits
// total is what made "benefits end at $57k" mean the value of a child's
// insurance card rather than any money changing hands.
export const CASH_PROGRAMS: ProgramId[] = ["snap", "tanf", "housing", "wic", "ssi", "headstart", "schoolmeals"];
export const CREDIT_PROGRAMS: ProgramId[] = ["eitc", "ctc", "aca"];
// Credits that live inside PolicyEngine's household_net_income. The premium
// tax credit does NOT (pinned live by the contract suite): it reaches
// netIncome only through medicalOOP, the premium net of the credit, so a step
// attributed to it as a credit AND as a premium would count the same dollars
// twice.
export const NET_INCOME_CREDITS: ProgramId[] = ["eitc", "ctc"];
export const COVERAGE_PROGRAMS: ProgramId[] = ["medicaid", "chip"];

export interface HouseholdAnswers {
  state: string;
  married: boolean;
  age: number;
  spouseAge: number | null;
  childAges: number[];
  youDisabled: boolean;
  spouseDisabled: boolean;
  childDisabled: boolean[];
  monthlyRent: number | null;
  monthlyChildcare: number | null;
  annualEarnings: number;
  spouseAnnualEarnings: number;
  getsHeadStart: boolean;
  getsHousing: boolean;
  hasEmployerCoverage: boolean;
  countyFips: string | null;
  // Monthly non-wage income, 0 when there is none. SSDI is modeled as ending
  // above substantial gainful activity rather than tapering — see client.ts.
  ssdiMonthly: number;
  childSupportMonthly: number;
  unemploymentMonthly: number;
}

export interface CurvePoint {
  earnings: number;
  // Resources after paying real health costs: PolicyEngine's household net
  // income minus SPM medical out-of-pocket (health-insurance premiums, net of
  // the ACA subsidy). The whole tool operates on this after-health figure.
  netIncome: number;
  // What the household actually pays for health-insurance premiums at this
  // earnings level, net of the ACA subsidy (SPM medical out-of-pocket).
  // Surfaced for transparency; already subtracted from netIncome above.
  medicalOOP: number;
  programs: Record<ProgramId, number>;
  // The person-level programs (medicaid, chip, wic, ssi, headstart) summed
  // over CHILDREN only, so a threshold that ends a parent's coverage is never
  // reported as ending the child's, and vice versa.
  childPrograms: Partial<Record<ProgramId, number>>;
  // PolicyEngine's household_benefits minus the cash programs we track: the
  // untracked remainder, so a benefit HotGap does not name still shows up in
  // a cliff's size. 0 for a curve fetched before we asked for the variable.
  otherBenefits: number;
  // Set by evaluate.ts when this household is in the coverage gap at this
  // earnings level (no Medicaid, no subsidy, under 100% FPL); always false
  // out of parse.ts, which has no household context to decide it.
  coverageGap: boolean;
}

export interface CurveResponse {
  year: string;
  currentEarnings: number;
  points: CurvePoint[];
}

export const householdSize = (a: HouseholdAnswers): number => 1 + (a.married ? 1 : 0) + a.childAges.length;

/** Employer-plan tier: a plan for one person, or one that also covers a spouse or child. */
export const esiTier = (a: HouseholdAnswers): "single" | "family" =>
  a.married || a.childAges.length > 0 ? "family" : "single";
