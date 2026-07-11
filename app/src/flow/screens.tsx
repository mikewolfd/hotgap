import { useEffect, useId, useState } from "react";
import type { Pay, PayUnit } from "@hotgap/shared";
import { t } from "../strings/t.js";
import { STATE_NAMES } from "../lib/states.js";
import { isTerritoryZip } from "../lib/zip.js";
import type { FlowAction, FlowAnswers } from "./state.js";

type D = (action: FlowAction) => void;

// Parses a raw money string the same way on every keystroke and on external
// resets, so the two can be compared for equality (see the sync effects
// below). Returns null for empty/unparseable input rather than 0 so callers
// can tell "cleared" apart from "typed zero".
function parseMoney(raw: string): number | null {
  if (raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

// Shared keystroke sanitizer for money-style inputs (digits + at most one
// decimal point). Strips anything that isn't a digit or ".", then — if that
// leaves more than one "." — rejects the keystroke outright by returning the
// previous text unchanged. Without this, typing a second "." (e.g. "18.5"
// then ".") produces "18.5.", which still passes the digits-and-dots regex
// but parses to NaN via Number("18.5.") -> null, so the input would keep
// showing a number-looking string while silently submitting "not sure"
// underneath. Rejecting the stray keystroke means the field simply doesn't
// change, which is always safe: a single dot never breaks parsing (e.g.
// "18." parses fine as 18), so this only ever blocks the invalid case.
function sanitizeMoneyKeystroke(raw: string, previous: string): string {
  const sanitized = raw.replace(/[^0-9.]/g, "");
  const dotCount = sanitized.split(".").length - 1;
  return dotCount > 1 ? previous : sanitized;
}

// Money inputs keep the RAW STRING the user typed in local state and only
// hand a parsed number up to the caller. Parsing on every keystroke and
// rendering the parsed number back into the controlled input (the old
// behavior) destroys a trailing decimal point as it's typed: "18." parses to
// 18, which re-renders as "18", so the "." the user is about to follow with
// "50" is silently gone. Keeping the string local sidesteps that entirely.
function MoneyInput(props: {
  id: string; value: number | null; onChange: (v: number | null) => void; notSureLabel?: string;
}) {
  const [text, setText] = useState(props.value === null ? "" : String(props.value));

  // If the value changes for a reason other than this input's own typing
  // (e.g. the "Not sure" button sets it to null), resync the local string.
  // Comparing parsed(text) to props.value (rather than just the raw string)
  // means our own onChange round-trips never trigger a reset.
  useEffect(() => {
    if (parseMoney(text) !== props.value) {
      setText(props.value === null ? "" : String(props.value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.value]);

  return (
    <div className="money-row">
      <span className="money-prefix" aria-hidden>$</span>
      <input
        id={props.id}
        className="input"
        inputMode="decimal"
        value={text}
        placeholder="0"
        onChange={(e) => {
          const sanitized = sanitizeMoneyKeystroke(e.target.value, text);
          setText(sanitized);
          props.onChange(parseMoney(sanitized));
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
  const territory = bad && isTerritoryZip(answers.zip);
  return (
    <>
      <h1><label htmlFor={id}>{t("flow.zip.q")}</label></h1>
      <p className="hint">{t("flow.zip.hint")}</p>
      <input
        id={id} className="input" inputMode="numeric" autoComplete="postal-code"
        maxLength={5} value={answers.zip}
        onChange={(e) => dispatch({ type: "setZip", zip: e.target.value.replace(/\D/g, "") })}
      />
      {bad && (
        <p role="alert" className="error-text">
          {territory ? t("flow.zip.territory") : t("flow.zip.bad")}
        </p>
      )}
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

// Same raw-string-first pattern as MoneyInput (see above): local state holds
// exactly what was typed, so a digit-by-digit age like "1" -> "10" never gets
// clobbered by a parse-and-rerender round trip mid-keystroke. Reuses
// parseMoney since the sanitizer below already strips everything but digits,
// so there is never a decimal point for it to worry about.
function AgeInput(props: { id: string; value: number | null; onChange: (v: number | null) => void }) {
  const [text, setText] = useState(props.value === null ? "" : String(props.value));

  useEffect(() => {
    if (parseMoney(text) !== props.value) {
      setText(props.value === null ? "" : String(props.value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.value]);

  return (
    <input
      id={props.id} className="input input-small" inputMode="numeric"
      value={text}
      onChange={(e) => {
        const sanitized = e.target.value.replace(/\D/g, "");
        setText(sanitized);
        props.onChange(parseMoney(sanitized));
      }}
    />
  );
}

function YesNoChoice(props: { id: string; question: string; value: boolean; onChange: (v: boolean) => void }) {
  const labelId = `${props.id}-label`;
  return (
    <>
      <p className="hint" id={labelId}>{props.question}</p>
      <div className="choice-row" role="radiogroup" aria-labelledby={labelId}>
        <button
          type="button" className={props.value ? "choice" : "choice selected"}
          role="radio" aria-checked={!props.value}
          onClick={() => props.onChange(false)}
        >{t("common.no")}</button>
        <button
          type="button" className={props.value ? "choice selected" : "choice"}
          role="radio" aria-checked={props.value}
          onClick={() => props.onChange(true)}
        >{t("common.yes")}</button>
      </div>
    </>
  );
}

export function FamilyScreen({ answers, dispatch }: { answers: FlowAnswers; dispatch: D }) {
  const id = useId();
  const ageId = `${id}-age`;
  const spouseAgeId = `${id}-spouse-age`;
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

      <label htmlFor={ageId}>{t("flow.family.yourAge")}</label>
      <AgeInput id={ageId} value={answers.age} onChange={(v) => dispatch({ type: "setAge", age: v })} />
      <YesNoChoice
        id={`${id}-you-disabled`} question={t("flow.family.youDisabled")} value={answers.youDisabled}
        onChange={(v) => dispatch({ type: "setYouDisabled", disabled: v })}
      />

      {answers.married && (
        <>
          <label htmlFor={spouseAgeId}>{t("flow.family.spouseAge")}</label>
          <AgeInput id={spouseAgeId} value={answers.spouseAge} onChange={(v) => dispatch({ type: "setSpouseAge", age: v })} />
          <YesNoChoice
            id={`${id}-spouse-disabled`} question={t("flow.family.spouseDisabled")} value={answers.spouseDisabled}
            onChange={(v) => dispatch({ type: "setSpouseDisabled", disabled: v })}
          />
        </>
      )}

      <p className="hint" id="kids-label">{t("flow.family.kids")}</p>
      <div className="stepper" aria-labelledby="kids-label">
        <button type="button" className="step-btn" aria-label={t("common.fewerKids")}
          onClick={() => dispatch({ type: "setChildAges", ages: kids.slice(0, -1) })}>−</button>
        <output>{kids.length}</output>
        <button type="button" className="step-btn" aria-label={t("common.moreKids")}
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
          <label>
            <input type="checkbox" checked={answers.childDisabled[i] ?? false}
              onChange={(e) => dispatch({ type: "setChildDisabled", index: i, disabled: e.target.checked })} />
            {" "}{t("flow.family.kidDisabled")}
          </label>
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

// Same "blank means no value yet" convention as MoneyInput: 0 is treated as
// "no amount typed yet" so the field starts blank instead of showing a
// literal 0, matching the prior `value={pay.amount || ""}` behavior.
function moneyText(amount: number): string {
  return amount === 0 ? "" : String(amount);
}

function parseHours(raw: string): number | undefined {
  if (raw === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function PayEditor({ pay, onChange, label }: { pay: Pay; onChange: (p: Pay) => void; label: string }) {
  const id = useId();
  const units: { u: PayUnit; label: string }[] = [
    { u: "hour", label: t("flow.pay.perHour") },
    { u: "month", label: t("flow.pay.perMonth") },
    { u: "year", label: t("flow.pay.perYear") },
  ];

  // Amount: keep the raw string locally, same decimal-preserving pattern as
  // MoneyInput (see there for why parsing every keystroke back into the
  // controlled input destroys a trailing ".").
  const [amountText, setAmountText] = useState(moneyText(pay.amount));
  useEffect(() => {
    if (parseMoney(amountText) !== (pay.amount || null)) {
      setAmountText(moneyText(pay.amount));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pay.amount]);

  // Hours: also kept as a raw string so the field can be cleared and retyped.
  // The old `Math.max(1, Math.min(80, Number(v) || 40))` coercion ran on every
  // keystroke, so clearing "40" to type "35" snapped straight back to "40"
  // before the "3" could land. Clamping now happens only on blur; while
  // editing, an empty field is allowed and simply leaves hoursPerWeek unset
  // (toAnnual already defaults a missing hoursPerWeek to 40 at submit time).
  const [hoursText, setHoursText] = useState(String(pay.hoursPerWeek ?? 40));
  useEffect(() => {
    if ((parseHours(hoursText) ?? null) !== (pay.hoursPerWeek ?? null)) {
      setHoursText(String(pay.hoursPerWeek ?? 40));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pay.hoursPerWeek]);

  return (
    <fieldset className="pay-editor">
      <legend>{label}</legend>
      <div className="money-row">
        <span className="money-prefix" aria-hidden>$</span>
        <input id={id} className="input" inputMode="decimal" value={amountText}
          aria-label={label}
          onChange={(e) => {
            const sanitized = sanitizeMoneyKeystroke(e.target.value, amountText);
            setAmountText(sanitized);
            onChange({ ...pay, amount: parseMoney(sanitized) ?? 0 });
          }} />
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
            value={hoursText}
            onChange={(e) => {
              const sanitized = e.target.value.replace(/[^0-9]/g, "");
              setHoursText(sanitized);
              onChange({ ...pay, hoursPerWeek: parseHours(sanitized) });
            }}
            onBlur={() => {
              const n = parseHours(hoursText) ?? 40;
              const clamped = Math.max(1, Math.min(80, n));
              setHoursText(String(clamped));
              onChange({ ...pay, hoursPerWeek: clamped });
            }} />
        </div>
      )}
    </fieldset>
  );
}

export function GetsScreen({ answers, dispatch }: { answers: FlowAnswers; dispatch: D }) {
  const hasYoungKid = answers.childAges.some((a) => a < 6);
  const rows: { key: "getsHeadStart" | "getsHousing" | "hasEmployerCoverage"; label: string; show: boolean }[] = [
    { key: "getsHeadStart", label: t("flow.gets.headstart"), show: hasYoungKid },
    { key: "getsHousing", label: t("flow.gets.housing"), show: true },
    { key: "hasEmployerCoverage", label: t("flow.gets.esi"), show: true },
  ];
  return (
    <>
      <h1>{t("flow.gets.q")}</h1>
      <p className="hint">{t("flow.gets.hint")}</p>
      {rows.filter((r) => r.show).map((r) => {
        const labelId = `gets-${r.key}-label`;
        return (
          <div key={r.key} className="gets-row">
            <span id={labelId}>{r.label}</span>
            <div className="choice-row" role="radiogroup" aria-labelledby={labelId}>
              <button type="button" className={answers[r.key] ? "choice selected" : "choice"}
                role="radio" aria-checked={answers[r.key]}
                onClick={() => dispatch({ type: "setGets", key: r.key, value: true })}>{t("common.yes")}</button>
              <button type="button" className={answers[r.key] ? "choice" : "choice selected"}
                role="radio" aria-checked={!answers[r.key]}
                onClick={() => dispatch({ type: "setGets", key: r.key, value: false })}>{t("common.no")}</button>
            </div>
          </div>
        );
      })}
    </>
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
