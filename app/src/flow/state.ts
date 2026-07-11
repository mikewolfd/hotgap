import { toAnnual, type HouseholdAnswers, type Pay } from "@hotgap/shared";
import { zipToState } from "../lib/zip.js";

export type ScreenId = "zip" | "family" | "housing" | "childcare" | "pay";

export interface FlowAnswers {
  zip: string;
  state: string | null;
  married: boolean;
  childAges: number[];
  monthlyRent: number | null;
  monthlyChildcare: number | null;
  pay: Pay;
  spousePay: Pay | null;
}

export interface FlowState { screen: ScreenId; answers: FlowAnswers }

export type FlowAction =
  | { type: "setZip"; zip: string }
  | { type: "setState"; state: string }
  | { type: "setMarried"; married: boolean }
  | { type: "setChildAges"; ages: number[] }
  | { type: "setRent"; amount: number | null }
  | { type: "setChildcare"; amount: number | null }
  | { type: "setPay"; pay: Pay }
  | { type: "setSpousePay"; pay: Pay | null }
  | { type: "next" }
  | { type: "back" };

export const initialFlowState: FlowState = {
  screen: "zip",
  answers: {
    zip: "", state: null, married: false, childAges: [],
    monthlyRent: null, monthlyChildcare: null,
    pay: { amount: 0, unit: "hour", hoursPerWeek: 40 },
    spousePay: null,
  },
};

export function visibleScreens(a: FlowAnswers): ScreenId[] {
  const screens: ScreenId[] = ["zip", "family", "housing"];
  if (a.childAges.some((age) => age < 13)) screens.push("childcare");
  screens.push("pay");
  return screens;
}

export function canAdvance(s: FlowState): boolean {
  switch (s.screen) {
    case "zip": return s.answers.state !== null;
    case "family": return s.answers.childAges.every((a) => a >= 0 && a <= 17);
    case "housing": return true;   // "not sure" (null) is a valid answer
    case "childcare": return true;
    case "pay": return s.answers.pay.amount > 0;
  }
}

export function flowReducer(s: FlowState, action: FlowAction): FlowState {
  const a = s.answers;
  switch (action.type) {
    case "setZip": return { ...s, answers: { ...a, zip: action.zip, state: zipToState(action.zip) } };
    case "setState": return { ...s, answers: { ...a, state: action.state } };
    case "setMarried": return { ...s, answers: { ...a, married: action.married, spousePay: action.married ? a.spousePay : null } };
    case "setChildAges": return { ...s, answers: { ...a, childAges: action.ages } };
    case "setRent": return { ...s, answers: { ...a, monthlyRent: action.amount } };
    case "setChildcare": return { ...s, answers: { ...a, monthlyChildcare: action.amount } };
    case "setPay": return { ...s, answers: { ...a, pay: action.pay } };
    case "setSpousePay": return { ...s, answers: { ...a, spousePay: action.pay } };
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
  return {
    state: a.state,
    married: a.married,
    childAges: a.childAges,
    monthlyRent: a.monthlyRent,
    monthlyChildcare: a.childAges.some((age) => age < 13) ? a.monthlyChildcare : 0,
    annualEarnings: toAnnual(a.pay),
    spouseAnnualEarnings: a.married && a.spousePay ? toAnnual(a.spousePay) : 0,
  };
}
