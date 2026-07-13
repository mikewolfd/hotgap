// Shared prop types for the HotGap design system. These are the contracts the
// chart and escape components render against — a simplified, presentation-only
// shape of the app's benefits-cliff analysis (no live data, no app coupling).

/** How pay is shown on an axis or in copy. */
export type PayUnit = "hour" | "month" | "year";

/** The means-tested programs HotGap tracks. */
export type ProgramId =
  | "snap" | "tanf" | "housing" | "schoolmeals" | "eitc" | "ctc"
  | "aca" | "medicaid" | "chip" | "headstart" | "wic" | "ssi";

/** Plain-language label for each program (5th-grade reading level). */
export const PROGRAM_LABELS: Record<ProgramId, string> = {
  snap: "food help (SNAP)",
  tanf: "cash help (TANF)",
  housing: "housing help",
  schoolmeals: "free school meals",
  eitc: "a tax credit for workers (EITC)",
  ctc: "the child tax credit",
  aca: "help paying for health insurance",
  medicaid: "help paying for health care (Medicaid)",
  chip: "kids' health coverage (CHIP)",
  headstart: "Head Start (free early learning)",
  wic: "food help for moms and babies (WIC)",
  ssi: "SSI cash help",
};

/** One point on the money-vs-pay curve: yearly take-home at a yearly pay level. */
export interface CurvePoint {
  /** Yearly pay from work (the x value). */
  earnings: number;
  /** Yearly money left after taxes, benefits, and health costs (the y value). */
  netIncome: number;
}

/** A benefits cliff: a step where more pay leaves the household with less money. */
export interface Cliff {
  /** Pay level where the drop begins. */
  startEarnings: number;
  /** Pay level where the drop ends. */
  endEarnings: number;
  /** How much yearly money is lost across the drop. */
  drop: number;
  /** Which programs end at this drop. */
  programsLost: ProgramId[];
}

/** A stretch of pay where earning more can leave you with less (a shaded zone). */
export interface DangerZone {
  startEarnings: number;
  /** null when the zone never recovers within the charted range. */
  endEarnings: number | null;
  /** The take-home peak the zone falls away from. */
  peakNet: number;
}

/** Everything the chart needs to draw one household's money-vs-pay story. */
export interface CurveAnalysis {
  points: CurvePoint[];
  cliffs: Cliff[];
  dangerZones: DangerZone[];
  /** Where the household is today (omit on comparison charts with no "you"). */
  currentEarnings: number;
  currentNet: number;
}

/** Two-letter USPS code → a value to shade a state by (e.g. worst yearly loss). */
export type StateValues = Partial<Record<string, number>>;
