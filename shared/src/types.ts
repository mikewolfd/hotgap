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
  childAges: number[];
  monthlyRent: number | null;
  monthlyChildcare: number | null;
  annualEarnings: number;
  spouseAnnualEarnings: number;
}

export interface CurvePoint {
  earnings: number;
  netIncome: number;
  programs: Record<ProgramId, number>;
}

export interface CurveResponse {
  year: string;
  currentEarnings: number;
  points: CurvePoint[];
}
