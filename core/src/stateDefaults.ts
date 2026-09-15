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
import { readData } from "./data.js";

export interface StateDefaults {
  /** HUD FY2026 two-bedroom Fair Market Rent for the state's largest county. */
  monthlyRent: number;
  /** Census Vintage 2024 most populous county (or county equivalent). */
  countyFips: string;
  /**
   * DOL NDCP median county price of center-based preschool care (ages 3–5),
   * grown to 2026 dollars. Not an archetype input: `answersFor` keeps
   * `monthlyChildcare: 0`, because a childcare expense the household does not
   * actually report would inflate the dependent-care deduction. It is here as
   * the replacement value of a "free" childcare slot (Head Start).
   */
  monthlyChildcarePreschool: number;
}

interface StateDefaultsJson {
  read: string;
  sources: Record<string, Record<string, string>>;
  states: Record<string, StateDefaults>;
}

const table = (): Record<string, StateDefaults> => {
  const json = readData<StateDefaultsJson>("state-defaults.json");
  if (!json) throw new Error("data/state-defaults.json is missing");
  return json.states;
};

/** The typical household's rent, county and childcare price in this state. */
export function stateDefaults(state: string): StateDefaults {
  const row = table()[state];
  if (!row) throw new Error(`no state defaults for ${state}`);
  return row;
}
