import { useReducer } from "react";
import type { HouseholdAnswers, PayUnit } from "@hotgap/shared";
import { t } from "../strings/t.js";
import {
  canAdvance, flowReducer, initialFlowState, toHouseholdAnswers, visibleScreens,
} from "./state.js";
import { ZipScreen, FamilyScreen, HousingScreen, ChildcareScreen, GetsScreen, PayScreen } from "./screens.js";

export default function Flow(props: {
  onComplete: (answers: HouseholdAnswers, ctx: { unit: PayUnit; hoursPerWeek?: number }) => void;
}) {
  const [state, dispatch] = useReducer(flowReducer, initialFlowState);
  const order = visibleScreens(state.answers);
  const index = order.indexOf(state.screen);
  const last = index === order.length - 1;

  const Screen = {
    zip: ZipScreen, family: FamilyScreen, housing: HousingScreen,
    childcare: ChildcareScreen, gets: GetsScreen, pay: PayScreen,
  }[state.screen];

  return (
    <div className="flow">
      <p className="progress">{t("flow.stepOf", { step: index + 1, total: order.length })}</p>
      <Screen answers={state.answers} dispatch={dispatch} />
      <div className="nav-row">
        {index > 0 && (
          <button type="button" className="ghost" onClick={() => dispatch({ type: "back" })}>
            {t("flow.back")}
          </button>
        )}
        <button
          type="button" className="primary" disabled={!canAdvance(state)}
          onClick={() => {
            if (!last) return dispatch({ type: "next" });
            props.onComplete(toHouseholdAnswers(state.answers), {
              unit: state.answers.pay.unit,
              hoursPerWeek: state.answers.pay.hoursPerWeek,
            });
          }}
        >
          {last ? t("flow.pay.cta") : t("flow.next")}
        </button>
      </div>
    </div>
  );
}
