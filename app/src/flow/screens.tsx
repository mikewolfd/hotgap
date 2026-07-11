import { useId } from "react";
import type { Pay, PayUnit } from "@hotgap/shared";
import { t } from "../strings/t.js";
import { STATE_NAMES } from "../lib/states.js";
import type { FlowAction, FlowAnswers } from "./state.js";

type D = (action: FlowAction) => void;

function MoneyInput(props: {
  id: string; value: number | null; onChange: (v: number | null) => void; notSureLabel?: string;
}) {
  return (
    <div className="money-row">
      <span className="money-prefix" aria-hidden>$</span>
      <input
        id={props.id}
        className="input"
        inputMode="decimal"
        value={props.value ?? ""}
        placeholder="0"
        onChange={(e) => {
          const n = Number(e.target.value.replace(/[^0-9.]/g, ""));
          props.onChange(e.target.value === "" ? null : Number.isFinite(n) ? n : null);
        }}
      />
      {props.notSureLabel && (
        <button type="button" className="ghost" onClick={() => props.onChange(null)}>
          {props.notSureLabel}
        </button>
      )}
    </div>
  );
}

export function ZipScreen({ answers, dispatch }: { answers: FlowAnswers; dispatch: D }) {
  const id = useId();
  const bad = answers.zip.length === 5 && answers.state === null;
  return (
    <>
      <h1><label htmlFor={id}>{t("flow.zip.q")}</label></h1>
      <p className="hint">{t("flow.zip.hint")}</p>
      <input
        id={id} className="input" inputMode="numeric" autoComplete="postal-code"
        maxLength={5} value={answers.zip}
        onChange={(e) => dispatch({ type: "setZip", zip: e.target.value.replace(/\D/g, "") })}
      />
      {bad && <p role="alert" className="error-text">{t("flow.zip.bad")}</p>}
      {answers.state && (
        <div className="confirm-row">
          <p>{t("flow.zip.confirm", { state: STATE_NAMES[answers.state] ?? answers.state })}</p>
          <select
            aria-label={t("flow.zip.fix")}
            value={answers.state}
            onChange={(e) => dispatch({ type: "setState", state: e.target.value })}
          >
            {Object.entries(STATE_NAMES).map(([code, name]) => (
              <option key={code} value={code}>{name}</option>
            ))}
          </select>
        </div>
      )}
    </>
  );
}

export function FamilyScreen({ answers, dispatch }: { answers: FlowAnswers; dispatch: D }) {
  const kids = answers.childAges;
  return (
    <>
      <h1>{t("flow.family.q")}</h1>
      <div className="choice-row" role="radiogroup" aria-label={t("flow.family.q")}>
        <button
          type="button" className={answers.married ? "choice" : "choice selected"}
          role="radio" aria-checked={!answers.married}
          onClick={() => dispatch({ type: "setMarried", married: false })}
        >{t("flow.family.single")}</button>
        <button
          type="button" className={answers.married ? "choice selected" : "choice"}
          role="radio" aria-checked={answers.married}
          onClick={() => dispatch({ type: "setMarried", married: true })}
        >{t("flow.family.married")}</button>
      </div>
      <p className="hint" id="kids-label">{t("flow.family.kids")}</p>
      <div className="stepper" aria-labelledby="kids-label">
        <button type="button" className="step-btn" aria-label="fewer kids"
          onClick={() => dispatch({ type: "setChildAges", ages: kids.slice(0, -1) })}>−</button>
        <output>{kids.length}</output>
        <button type="button" className="step-btn" aria-label="more kids"
          disabled={kids.length >= 6}
          onClick={() => dispatch({ type: "setChildAges", ages: [...kids, 5] })}>+</button>
      </div>
      {kids.map((age, i) => (
        <div key={i} className="kid-age-row">
          <label htmlFor={`kid-${i}`}>{t("flow.family.kidAge", { n: i + 1 })}</label>
          <select id={`kid-${i}`} value={age}
            onChange={(e) => {
              const ages = [...kids]; ages[i] = Number(e.target.value);
              dispatch({ type: "setChildAges", ages });
            }}>
            {Array.from({ length: 18 }, (_, y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      ))}
    </>
  );
}

export function HousingScreen({ answers, dispatch }: { answers: FlowAnswers; dispatch: D }) {
  const id = useId();
  return (
    <>
      <h1><label htmlFor={id}>{t("flow.housing.q")}</label></h1>
      <p className="hint">{t("flow.housing.hint")}</p>
      <MoneyInput id={id} value={answers.monthlyRent} notSureLabel={t("flow.notSure")}
        onChange={(v) => dispatch({ type: "setRent", amount: v })} />
    </>
  );
}

export function ChildcareScreen({ answers, dispatch }: { answers: FlowAnswers; dispatch: D }) {
  const id = useId();
  return (
    <>
      <h1><label htmlFor={id}>{t("flow.childcare.q")}</label></h1>
      <p className="hint">{t("flow.childcare.hint")}</p>
      <MoneyInput id={id} value={answers.monthlyChildcare} notSureLabel={t("flow.notSure")}
        onChange={(v) => dispatch({ type: "setChildcare", amount: v })} />
    </>
  );
}

function PayEditor({ pay, onChange, label }: { pay: Pay; onChange: (p: Pay) => void; label: string }) {
  const id = useId();
  const units: { u: PayUnit; label: string }[] = [
    { u: "hour", label: t("flow.pay.perHour") },
    { u: "month", label: t("flow.pay.perMonth") },
    { u: "year", label: t("flow.pay.perYear") },
  ];
  return (
    <fieldset className="pay-editor">
      <legend>{label}</legend>
      <div className="money-row">
        <span className="money-prefix" aria-hidden>$</span>
        <input id={id} className="input" inputMode="decimal" value={pay.amount || ""}
          aria-label={label}
          onChange={(e) => onChange({ ...pay, amount: Number(e.target.value.replace(/[^0-9.]/g, "")) || 0 })} />
      </div>
      <div className="choice-row">
        {units.map(({ u, label: ul }) => (
          <button key={u} type="button" className={pay.unit === u ? "choice selected" : "choice"}
            onClick={() => onChange({ ...pay, unit: u })}>{ul}</button>
        ))}
      </div>
      {pay.unit === "hour" && (
        <div className="hours-row">
          <label htmlFor={`${id}-h`}>{t("flow.pay.hours")}</label>
          <input id={`${id}-h`} className="input input-small" inputMode="numeric"
            value={pay.hoursPerWeek ?? 40}
            onChange={(e) => onChange({ ...pay, hoursPerWeek: Math.max(1, Math.min(80, Number(e.target.value) || 40)) })} />
        </div>
      )}
    </fieldset>
  );
}

export function PayScreen({ answers, dispatch }: { answers: FlowAnswers; dispatch: D }) {
  return (
    <>
      <h1>{t("flow.pay.q")}</h1>
      <PayEditor label={t("flow.pay.q")} pay={answers.pay}
        onChange={(pay) => dispatch({ type: "setPay", pay })} />
      {answers.married && (
        <PayEditor label={t("flow.pay.spouse")}
          pay={answers.spousePay ?? { amount: 0, unit: "hour", hoursPerWeek: 40 }}
          onChange={(pay) => dispatch({ type: "setSpousePay", pay })} />
      )}
    </>
  );
}
