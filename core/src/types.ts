import type { MaTafdcInputs } from "./maTafdc.js";
// Policy year every calculation runs against (PolicyEngine variable period).
export const YEAR = "2026" as const;

export type ProgramId =
  | "snap" | "medicaid" | "chip" | "eitc" | "ctc"
  | "aca" | "tanf" | "housing" | "wic" | "ssi"
  | "headstart" | "schoolmeals" | "childcare";

export const PROGRAM_IDS: ProgramId[] = [
  "snap", "medicaid", "chip", "eitc", "ctc", "aca", "tanf", "housing", "wic", "ssi",
  "headstart", "schoolmeals", "childcare",
];

// The three kinds of program value, because they do not belong in the same
// sum. CASH is money (or near-money) the household receives; CREDIT is a
// refundable tax credit or premium subsidy; COVERAGE is a *sticker* value —
// PolicyEngine's estimate of what Medicaid/CHIP coverage is worth, which is
// never cash and is never inside netIncome. Mixing the third into a benefits
// total is what made "benefits end at $57k" mean the value of a child's
// insurance card rather than any money changing hands.
// `childcare` is the state child-care subsidy (CCDF). It pays a provider
// rather than the family, which is exactly what makes it CASH here: it frees
// the same dollars the family would otherwise hand over, one for one, and it
// is capped at a real bill. That is school meals and Head Start, not a
// Medicaid sticker price — which is a valuation of coverage nobody would have
// bought at that price and which never moves a household's own money.
export const CASH_PROGRAMS: ProgramId[] = ["snap", "tanf", "housing", "wic", "ssi", "headstart", "schoolmeals", "childcare"];
export const CREDIT_PROGRAMS: ProgramId[] = ["eitc", "ctc", "aca"];
// Credits that live inside PolicyEngine's household_net_income. The premium
// tax credit does NOT (pinned live by the contract suite): it reaches
// netIncome only through medicalOOP, the premium net of the credit, so a step
// attributed to it as a credit AND as a premium would count the same dollars
// twice.
export const NET_INCOME_CREDITS: ProgramId[] = ["eitc", "ctc"];
export const COVERAGE_PROGRAMS: ProgramId[] = ["medicaid", "chip"];

/**
 * PolicyEngine's `immigration_status` values, lower-cased. Benefits gate on
 * it (SNAP prorates an undocumented parent's share out; Medicaid and the
 * premium tax credit are barred), and the EITC's SSN test follows from it —
 * see translate.ts. Children are modeled as citizens; HotGap does not ask.
 */
export const IMMIGRATION_STATUSES = [
  "citizen", "lpr", "refugee", "asylee", "deportation_withheld", "cuban_haitian_entrant",
  "conditional_entrant", "paroled_one_year", "daca", "tps", "undocumented",
] as const;
export type ImmigrationStatus = (typeof IMMIGRATION_STATUSES)[number];

export interface HouseholdAnswers {
  state: string;
  married: boolean;
  age: number;
  spouseAge: number | null;
  // Citizen unless said otherwise. `yearsInUs` matters only to a non-citizen
  // (the five-year bar on SNAP, and on Medicaid in most states, for lawful
  // permanent residents); null means not asked, and PolicyEngine then
  // assumes the bar is met.
  youStatus: ImmigrationStatus;
  spouseStatus: ImmigrationStatus;
  youYearsInUs: number | null;
  spouseYearsInUs: number | null;
  childAges: number[];
  youDisabled: boolean;
  spouseDisabled: boolean;
  childDisabled: boolean[];
  monthlyRent: number | null;
  monthlyChildcare: number | null;
  annualEarnings: number;
  spouseAnnualEarnings: number;
  // The earner's pay is from self-employment rather than wages: the curve's
  // axis becomes `self_employment_income`, so the self-employment tax and the
  // deductions that follow from it apply instead of the employee half of FICA.
  // Benefit rules treat both as earned income.
  selfEmployed: boolean;
  // Liquid savings — bank balances — for the whole household, 0 when none.
  // SNAP's asset test binds in the states without broad-based categorical
  // eligibility ($3,000 in 2026; $5,000 ends SNAP in Mississippi).
  savings: number;
  // Hours a week actually worked, null when not asked. Sent to PolicyEngine as
  // `weekly_hours_worked_before_lsr`, which Massachusetts' TAFDC dependent-care
  // deduction scales by; it is not used to derive earnings (the CLI does that
  // before validation) and never varies along the axis.
  hoursPerWeek: number | null;
  getsHeadStart: boolean;
  getsHousing: boolean;
  // Take-up of the state's CCDF child-care subsidy. Off by default, like every
  // other rationed program here: CCDF reaches roughly one in six eligible
  // children, and most states run a waiting list. Turning it on also changes
  // what PolicyEngine is asked for the childcare bill — see translate.ts.
  getsChildcareSubsidy: boolean;
  // The entitlements, on by default: a household that does not currently
  // get one of these turns it off, and the curve is then the money it
  // actually lives on. evaluate.ts reports what an off program would pay
  // at today's earnings as `unclaimed`.
  getsSnap: boolean;
  getsTanf: boolean;
  getsMedicaid: boolean;
  getsWic: boolean;
  hasEmployerCoverage: boolean;
  countyFips: string | null;
  // Monthly non-wage income, 0 when there is none. SSDI is modeled as ending
  // above substantial gainful activity rather than tapering — see client.ts.
  ssdiMonthly: number;
  childSupportMonthly: number;
  unemploymentMonthly: number;
}

export interface CurvePoint {
  /** MA-only inputs for the local TAFDC correction; absent in older sweeps. */
  maTafdc?: MaTafdcInputs;
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
  // Refundable STATE tax credits: household_refundable_tax_credits less the
  // federal EITC and refundable CTC. They are inside netIncome, so a cliff
  // that is a state credit ending has to be attributed to credits rather than
  // left in the unexplained residual. 0 for a curve fetched before we asked.
  stateCredits: number;
  // The WHOLE child tax credit, refundable part included; `programs.ctc` is
  // the refundable part alone, because that is what sits in netIncome. The
  // total is what says whether the credit ENDED or merely stopped being paid
  // out as a refund (see escape.ts). Falls back to the refundable series on a
  // curve fetched before we asked for it.
  totalCtc: number;
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

