export type ProgramId =
  | "snap" | "medicaid" | "chip" | "eitc" | "ctc"
  | "aca" | "tanf" | "housing" | "wic" | "ssi"
  | "headstart" | "schoolmeals";

export const PROGRAM_IDS: ProgramId[] = [
  "snap", "medicaid", "chip", "eitc", "ctc", "aca", "tanf", "housing", "wic", "ssi",
  "headstart", "schoolmeals",
];

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
}

export interface CurvePoint {
  earnings: number;
  // Resources after paying real health costs: raw household net income minus
  // the ACA premium tax credit (already counted once in net income as a
  // refundable credit) minus SPM medical out-of-pocket (health-insurance
  // premiums, net of that same subsidy). The whole tool operates on this
  // honest after-health figure.
  netIncome: number;
  // What the household actually pays for health-insurance premiums at this
  // earnings level, net of the ACA subsidy (SPM medical out-of-pocket).
  // Surfaced for transparency; already subtracted from netIncome above.
  medicalOOP: number;
  programs: Record<ProgramId, number>;
}

export interface CurveResponse {
  year: string;
  currentEarnings: number;
  points: CurvePoint[];
}
