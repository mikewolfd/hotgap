import { useEffect, useId, useState } from "react";
import type { Pay, PayUnit } from "@hotgap/shared";
import { Button, CheckboxGroup, Field, RadioGroup, Stepper } from "@hotgap/design-system";
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
  label: string; hint?: string; value: number | null; onChange: (v: number | null) => void; notSureLabel?: string;
}) {
  const id = useId();
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
    <>
      <Field
        id={id} label={props.label} hint={props.hint} prefix="$"
        inputMode="decimal" placeholder="0" value={text}
        onChange={(v) => {
          const sanitized = sanitizeMoneyKeystroke(v, text);
          setText(sanitized);
          props.onChange(parseMoney(sanitized));
        }}
      />
      {props.notSureLabel && (
        <Button variant="ghost" onClick={() => props.onChange(null)}>{props.notSureLabel}</Button>
      )}
    </>
  );
}

export function ZipScreen({ answers, dispatch }: { answers: FlowAnswers; dispatch: D }) {
  const id = useId();
  const bad = answers.zip.length === 5 && answers.state === null;
  const territory = bad && isTerritoryZip(answers.zip);
  return (
    <>
      <Field
        id={id} label={t("flow.zip.q")} hint={t("flow.zip.hint")}
        inputMode="numeric" autoComplete="postal-code" value={answers.zip}
        // Field has no maxLength; cap to 5 digits here so the old maxLength={5}
        // behavior is preserved (and it's more robust than the attribute).
        onChange={(v) => dispatch({ type: "setZip", zip: v.replace(/\D/g, "").slice(0, 5) })}
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
function AgeInput(props: { label: string; value: number | null; onChange: (v: number | null) => void }) {
  const id = useId();
  const [text, setText] = useState(props.value === null ? "" : String(props.value));

  useEffect(() => {
    if (parseMoney(text) !== props.value) {
      setText(props.value === null ? "" : String(props.value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.value]);

  return (
    <Field
      id={id} label={props.label} small inputMode="numeric" value={text}
      onChange={(v) => {
        const sanitized = v.replace(/\D/g, "");
        setText(sanitized);
        props.onChange(parseMoney(sanitized));
      }}
    />
  );
}

// A pick-exactly-one yes/no question with real radio semantics (DS RadioGroup),
// replacing the old button-with-aria-checked pattern.
function YesNoChoice(props: { question: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <RadioGroup
      legend={props.question}
      options={[
        { value: "no", label: t("common.no") },
        { value: "yes", label: t("common.yes") },
      ]}
      value={props.value ? "yes" : "no"}
      onChange={(v) => props.onChange(v === "yes")}
    />
  );
}

export function FamilyScreen({ answers, dispatch }: { answers: FlowAnswers; dispatch: D }) {
  const kids = answers.childAges;
  return (
    <>
      <RadioGroup
        legend={t("flow.family.q")}
        options={[
          { value: "single", label: t("flow.family.single") },
          { value: "married", label: t("flow.family.married") },
        ]}
        value={answers.married ? "married" : "single"}
        onChange={(v) => dispatch({ type: "setMarried", married: v === "married" })}
      />

      <AgeInput label={t("flow.family.yourAge")} value={answers.age} onChange={(v) => dispatch({ type: "setAge", age: v })} />
      <YesNoChoice
        question={t("flow.family.youDisabled")} value={answers.youDisabled}
        onChange={(v) => dispatch({ type: "setYouDisabled", disabled: v })}
      />

      {answers.married && (
        <>
          <AgeInput label={t("flow.family.spouseAge")} value={answers.spouseAge} onChange={(v) => dispatch({ type: "setSpouseAge", age: v })} />
          <YesNoChoice
            question={t("flow.family.spouseDisabled")} value={answers.spouseDisabled}
            onChange={(v) => dispatch({ type: "setSpouseDisabled", disabled: v })}
          />
        </>
      )}

      <Stepper
        caption={t("flow.family.kids")} label="kids" value={kids.length} min={0} max={6}
        onChange={(n) => dispatch({ type: "setChildAges", ages: n > kids.length ? [...kids, 5] : kids.slice(0, -1) })}
      />
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
  return (
    <MoneyInput
      label={t("flow.housing.q")} hint={t("flow.housing.hint")} value={answers.monthlyRent}
      notSureLabel={t("flow.notSure")} onChange={(v) => dispatch({ type: "setRent", amount: v })}
    />
  );
}

export function ChildcareScreen({ answers, dispatch }: { answers: FlowAnswers; dispatch: D }) {
  return (
    <MoneyInput
      label={t("flow.childcare.q")} hint={t("flow.childcare.hint")} value={answers.monthlyChildcare}
      notSureLabel={t("flow.notSure")} onChange={(v) => dispatch({ type: "setChildcare", amount: v })}
    />
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
      {/* The Field's label is the pay question itself, so it doubles as the
          group's visible heading — no separate <legend> needed. */}
      <Field
        id={id} label={label} prefix="$" inputMode="decimal" value={amountText}
        onChange={(v) => {
          const sanitized = sanitizeMoneyKeystroke(v, amountText);
          setAmountText(sanitized);
          onChange({ ...pay, amount: parseMoney(sanitized) ?? 0 });
        }}
      />
      <div className="choice-row">
        {units.map(({ u, label: ul }) => (
          <Button key={u} variant="choice" selected={pay.unit === u} onClick={() => onChange({ ...pay, unit: u })}>{ul}</Button>
        ))}
      </div>
      {pay.unit === "hour" && (
        // Clamp on blur (not per-keystroke) so an in-progress edit isn't
        // snapped back. React's onBlur bubbles (focusout), so the wrapper
        // catches the Field's inner input losing focus.
        <div className="hours-row"
          onBlur={() => {
            const n = parseHours(hoursText) ?? 40;
            const clamped = Math.max(1, Math.min(80, n));
            setHoursText(String(clamped));
            onChange({ ...pay, hoursPerWeek: clamped });
          }}>
          <Field
            id={`${id}-h`} label={t("flow.pay.hours")} small inputMode="numeric" value={hoursText}
            onChange={(v) => {
              const sanitized = v.replace(/[^0-9]/g, "");
              setHoursText(sanitized);
              onChange({ ...pay, hoursPerWeek: parseHours(sanitized) });
            }}
          />
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
  const visible = rows.filter((r) => r.show);
  return (
    <>
      <p className="hint">{t("flow.gets.hint")}</p>
      <CheckboxGroup
        legend={t("flow.gets.q")}
        onText={t("common.yes")}
        offText={t("common.no")}
        options={visible.map((r) => ({ value: r.key, label: r.label }))}
        value={visible.filter((r) => answers[r.key]).map((r) => r.key)}
        onChange={(next) => {
          // The group toggles one option per change; dispatch only the row
          // whose checked-state actually flipped, preserving the per-program
          // boolean state the reducer expects.
          for (const r of visible) {
            const nv = next.includes(r.key);
            if (nv !== answers[r.key]) dispatch({ type: "setGets", key: r.key, value: nv });
          }
        }}
      />
    </>
  );
}

export function PayScreen({ answers, dispatch }: { answers: FlowAnswers; dispatch: D }) {
  return (
    <>
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
