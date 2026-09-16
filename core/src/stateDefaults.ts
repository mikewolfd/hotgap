// What a household in this state looks like when nobody told us otherwise.
//
// The weekly sweep used to send `monthlyRent: null` and `countyFips: null` for
// every archetype, and both nulls are answers, not blanks: no rent means no
// SNAP excess-shelter deduction (every swept cell understated SNAP by $1–3k),
// and no county means PolicyEngine's default rating area for the state — which
// is byte-identical for CT and IL, and for CO and IN, so a premium-driven
// state ranking was partly ranking that default. These three figures replace
// the nulls with one sourced, typical household per state.
//
// data/state-defaults.json carries the publisher, file, vintage, date read and
// the exact arithmetic for each column; the rows hold nothing but the numbers.
import { readData, type SourceVintage } from "./data.js";

export interface StateDefaults {
  /** HUD FY2026 two-bedroom Fair Market Rent for the state's largest county. */
  monthlyRent: number;
  /** Census Vintage 2024 most populous county (or county equivalent). */
  countyFips: string;
  /**
   * DOL NDCP price of center-based care in that county, grown to 2026
   * dollars, for each of the NDCP's age bands (2024 technical report, p. 6):
   * infant 0–23 months, toddler 24–35, preschool 36–60 and not yet in
   * school, school age in school — that last one the wraparound care a
   * working parent of a schoolchild buys. `answersFor` prices each child of
   * a working household by band (childcareMonthlyFor); the preschool price
   * is also the replacement value of a "free" Head Start slot.
   */
  monthlyChildcareInfant: number;
  monthlyChildcareToddler: number;
  monthlyChildcarePreschool: number;
  monthlyChildcareSchoolAge: number;
}

/** The oldest child still charged for care: CCDF's age limit is 13. */
export const CHILDCARE_MAX_AGE = 12;

/** What a working household pays for one child of this age in this state per month, on the NDCP's bands; $0 from 13. */
export function childcareMonthlyFor(defaults: StateDefaults, age: number): number {
  if (age <= 1) return defaults.monthlyChildcareInfant;
  if (age === 2) return defaults.monthlyChildcareToddler;
  if (age <= 4) return defaults.monthlyChildcarePreschool;
  if (age <= CHILDCARE_MAX_AGE) return defaults.monthlyChildcareSchoolAge;
  return 0;
}


interface StateDefaultsJson {
  read: string;
  sources: Record<string, Record<string, string>>;
  /** Which rule and NDCP study year produced each state's childcare price, band by band. */
  childcareBasis: { byState: Record<string, Record<string, string>> };
  states: Record<string, StateDefaults>;
}

const file = (): StateDefaultsJson => {
  const json = readData<StateDefaultsJson>("state-defaults.json");
  if (!json) throw new Error("data/state-defaults.json is missing");
  return json;
};

/** The typical household's rent, county and childcare price in this state. */
export function stateDefaults(state: string): StateDefaults {
  const row = file().states[state];
  if (!row) throw new Error(`no state defaults for ${state}`);
  return row;
}

/**
 * Where this state's row came from, read off the file's own `sources` and
 * `childcareBasis` rather than retyped: the publisher and vintage behind the
 * rent and the county, and the rule plus NDCP study year behind each
 * childcare price band.
 */
export function stateDefaultsProvenance(state: string): { rent: SourceVintage; county: SourceVintage; childcare: Record<string, string> } {
  const { sources, childcareBasis } = file();
  const vintage = (column: string): SourceVintage => ({ publisher: sources[column].publisher, vintage: sources[column].vintage });
  const childcare = childcareBasis.byState[state];
  if (!childcare) throw new Error(`no childcare basis for ${state}`);
  return { rent: vintage("monthlyRent"), county: vintage("countyFips"), childcare };
}
