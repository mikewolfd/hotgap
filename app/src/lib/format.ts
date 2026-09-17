// Money and pay figures in the citizen register (design/inventory.md M5, W6):
// every pay figure in the unit the person gave, rounded to a step that
// unit is spoken in, and said as a phrase. Shared by the editor's chips and
// any surface that quotes a pay figure. Below them, the word-level helpers
// every surface needs (capitalize, a reach vintage as words, the model line,
// an HTML escape): one home (audit D1).
import { DEFAULT_HOURS, fromAnnual, type ModelRecord, type PayUnit } from "@hotgap/core";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const usdCents = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });

/** Whole dollars, "$1,234". */
export const money = (n: number): string => usd.format(Math.round(n));

/** The step each unit is spoken in: $0.25 an hour, $10 a week, $50 a month, $500 a year. */
const STEP: Record<PayUnit, number> = { hour: 0.25, week: 10, month: 50, year: 500 };
const PHRASE: Record<PayUnit, string> = { hour: "an hour", week: "a week", month: "a month", year: "a year" };

/** "an hour", "a week", "a month", "a year". */
export const unitPhrase = (unit: PayUnit): string => PHRASE[unit];

/** The unit's own rounding: an annual figure to the step that unit is spoken in, still in that unit. */
export const payRounded = (annual: number, unit: PayUnit, hoursPerWeek: number = DEFAULT_HOURS): number =>
  Math.round(fromAnnual(annual, unit, hoursPerWeek) / STEP[unit]) * STEP[unit];

/** A figure already in the unit, printed as that unit is: cents by the hour, whole dollars otherwise. */
export const unitFigure = (inUnit: number, unit: PayUnit): string => (unit === "hour" ? usdCents.format(inUnit) : usd.format(inUnit));

/** An annual figure in the person's own unit, rounded, without the unit phrase: "$14.50", "$30,000". */
export const payFigure = (annual: number, unit: PayUnit, hoursPerWeek: number = DEFAULT_HOURS): string =>
  unitFigure(payRounded(annual, unit, hoursPerWeek), unit);

/** An annual figure in the person's own unit, rounded to that unit's step: "$14.50 an hour", "$30,000 a year". */
export const payPhrase = (annual: number, unit: PayUnit, hoursPerWeek: number = DEFAULT_HOURS): string =>
  `${payFigure(annual, unit, hoursPerWeek)} ${PHRASE[unit]}`;

/** A drop in the citizen "about" grain: whole hundreds. */
export const moneyAbout = (n: number): string => usd.format(Math.round(n / 100) * 100);

/** A chart tick: "$40k" by the year, "$2,500" by the month or week, "$20" or "$17.50" by the hour. */
export const tickMoney = (v: number, unit: PayUnit): string =>
  unit === "year" && v >= 1000 ? `${usd.format(v / 1000)}k` : unit === "hour" && !Number.isInteger(v) ? usdCents.format(v) : usd.format(v);

const conjunction = new Intl.ListFormat("en-US", { style: "long", type: "conjunction" });
/** "a", "a and b", "a, b, and c" — the locale's list, not a hand-joined one. */
export const listOf = (items: string[]): string => conjunction.format(items);

const mediumDate = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });
/**
 * An ISO stamp as a date in words, "Sep 16, 2026", in the reader's own time
 * zone — a sweep stamped 01:16 UTC is the evening before to a reader in the
 * United States, and "run of tomorrow" is a date an editor bounces (places
 * rerun S2). A zone can be named for a test or a fixed-zone surface.
 */
export const dateWords = (iso: string, timeZone?: string): string =>
  (timeZone ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone }) : mediumDate).format(new Date(iso));

export const capitalize = (s: string): string => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** A reach.json vintage token ("2024-1yr", "2020-2024-5yr") as words; anything else as-is. */
export function reachWord(s: string): string {
  const m = s.match(/^(\d{4})(?:-(\d{4}))?-(\d)yr$/);
  return m ? `ACS ${m[2] ? `${m[1]}–${m[2]}` : m[1]} ${m[3]}-year PUMS` : s;
}

/* N9: the model that produced the numbers, from the file, not the one installed.
   When `version` is null (public API) the line names the endpoint. */
export const modelLine = (model: ModelRecord | null | undefined): string =>
  model?.version ? `policyengine-us ${model.version}`
  : model ? `the PolicyEngine API at ${model.endpoint}`
  : "PolicyEngine (version not recorded)";

/** HTML-escape a data value before it goes into a template string. */
export const esc = (s: unknown): string =>
  String(s).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch] as string);
