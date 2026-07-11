import { toAnnual, type HouseholdAnswers, type Pay } from "@hotgap/shared";
import { zipToState } from "../lib/zip.js";
import { zipToCounty } from "../lib/county.js";

export type ScreenId = "zip" | "family" | "housing" | "childcare" | "gets" | "pay";

export interface FlowAnswers {
  zip: string;
  state: string | null;
  countyFips: string | null;
  married: boolean;
  age: number | null;
  spouseAge: number | null;
  childAges: number[];
  youDisabled: boolean;
  spouseDisabled: boolean;
  childDisabled: boolean[];
  monthlyRent: number | null;
  monthlyChildcare: number | null;
  pay: Pay;
  spousePay: Pay | null;
  getsHeadStart: boolean;
  getsHousing: boolean;
  hasEmployerCoverage: boolean;
}

export interface FlowState { screen: ScreenId; answers: FlowAnswers }

export type FlowAction =
  | { type: "setZip"; zip: string }
  | { type: "setState"; state: string }
  | { type: "setMarried"; married: boolean }
  | { type: "setAge"; age: number | null }
  | { type: "setSpouseAge"; age: number | null }
  | { type: "setChildAges"; ages: number[] }
  | { type: "setYouDisabled"; disabled: boolean }
  | { type: "setSpouseDisabled"; disabled: boolean }
  | { type: "setChildDisabled"; index: number; disabled: boolean }
  | { type: "setRent"; amount: number | null }
  | { type: "setChildcare"; amount: number | null }
  | { type: "setPay"; pay: Pay }
  | { type: "setSpousePay"; pay: Pay | null }
  | { type: "setGets"; key: "getsHeadStart" | "getsHousing" | "hasEmployerCoverage"; value: boolean }
  | { type: "next" }
  | { type: "back" };

export const initialFlowState: FlowState = {
  screen: "zip",
  answers: {
    zip: "", state: null, countyFips: null, married: false, age: null, spouseAge: null, childAges: [],
    youDisabled: false, spouseDisabled: false, childDisabled: [],
    monthlyRent: null, monthlyChildcare: null,
    pay: { amount: 0, unit: "hour", hoursPerWeek: 40 },
    spousePay: null,
    getsHeadStart: false, getsHousing: false, hasEmployerCoverage: false,
  },
};

const isValidAge = (age: number | null): age is number => age !== null && age >= 16 && age <= 110;

export function visibleScreens(a: FlowAnswers): ScreenId[] {
  const screens: ScreenId[] = ["zip", "family", "housing"];
  if (a.childAges.some((age) => age < 13)) screens.push("childcare");
  screens.push("gets");
  screens.push("pay");
  return screens;
}

export function canAdvance(s: FlowState): boolean {
  switch (s.screen) {
    case "zip": return s.answers.state !== null;
    case "family":
      return s.answers.childAges.every((a) => a >= 0 && a <= 17)
        && isValidAge(s.answers.age)
        && (!s.answers.married || isValidAge(s.answers.spouseAge));
    case "housing": return true;   // "not sure" (null) is a valid answer
    case "childcare": return true;
    case "gets": return true;      // all optional; default is "no"
    case "pay": return s.answers.pay.amount > 0;
  }
}

export function flowReducer(s: FlowState, action: FlowAction): FlowState {
  const a = s.answers;
  switch (action.type) {
    case "setZip": return {
      ...s,
      answers: { ...a, zip: action.zip, state: zipToState(action.zip), countyFips: zipToCounty(action.zip) },
    };
    case "setState": return { ...s, answers: { ...a, state: action.state } };
    case "setMarried":
      return {
        ...s,
        answers: {
          ...a,
          married: action.married,
          spousePay: action.married ? a.spousePay : null,
          spouseAge: action.married ? a.spouseAge : null,
          spouseDisabled: action.married ? a.spouseDisabled : false,
        },
      };
    case "setAge": return { ...s, answers: { ...a, age: action.age } };
    case "setSpouseAge": return { ...s, answers: { ...a, spouseAge: action.age } };
    case "setChildAges": {
      // Keep childDisabled paired 1:1 with childAges: growing appends a
      // default "not disabled" flag per new kid, shrinking truncates from the
      // end, and same-length edits (changing one kid's age) leave every
      // existing flag untouched.
      const ages = action.ages;
      const childDisabled = ages.length > a.childDisabled.length
        ? [...a.childDisabled, ...Array(ages.length - a.childDisabled.length).fill(false)]
        : a.childDisabled.slice(0, ages.length);
      return { ...s, answers: { ...a, childAges: ages, childDisabled } };
    }
    case "setYouDisabled": return { ...s, answers: { ...a, youDisabled: action.disabled } };
    case "setSpouseDisabled": return { ...s, answers: { ...a, spouseDisabled: action.disabled } };
    case "setChildDisabled": {
      const childDisabled = [...a.childDisabled];
      childDisabled[action.index] = action.disabled;
      return { ...s, answers: { ...a, childDisabled } };
    }
    case "setRent": return { ...s, answers: { ...a, monthlyRent: action.amount } };
    case "setChildcare": return { ...s, answers: { ...a, monthlyChildcare: action.amount } };
    case "setPay": return { ...s, answers: { ...a, pay: action.pay } };
    case "setSpousePay": return { ...s, answers: { ...a, spousePay: action.pay } };
    case "setGets": return { ...s, answers: { ...a, [action.key]: action.value } };
    case "next": {
      if (!canAdvance(s)) return s;
      const order = visibleScreens(a);
      const i = order.indexOf(s.screen);
      return i < order.length - 1 ? { ...s, screen: order[i + 1] } : s;
    }
    case "back": {
      const order = visibleScreens(a);
      const i = order.indexOf(s.screen);
      return i > 0 ? { ...s, screen: order[i - 1] } : s;
    }
  }
}

export function toHouseholdAnswers(a: FlowAnswers): HouseholdAnswers {
  if (!a.state) throw new Error("state not set");
  if (a.age === null) throw new Error("age not set");
  if (a.married && a.spouseAge === null) throw new Error("spouseAge not set");
  return {
    state: a.state,
    countyFips: a.countyFips,
    married: a.married,
    age: a.age,
    spouseAge: a.married ? a.spouseAge : null,
    childAges: a.childAges,
    youDisabled: a.youDisabled,
    spouseDisabled: a.married ? a.spouseDisabled : false,
    childDisabled: a.childDisabled,
    monthlyRent: a.monthlyRent,
    monthlyChildcare: a.childAges.some((age) => age < 13) ? a.monthlyChildcare : 0,
    annualEarnings: toAnnual(a.pay),
    spouseAnnualEarnings: a.married && a.spousePay ? toAnnual(a.spousePay) : 0,
    getsHeadStart: a.getsHeadStart,
    getsHousing: a.getsHousing,
    hasEmployerCoverage: a.hasEmployerCoverage,
  };
}
