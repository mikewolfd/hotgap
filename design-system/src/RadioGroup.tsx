export interface RadioOption { value: string; label: string; }
export interface RadioGroupProps {
  /** The question these options answer — the group's accessible name. */
  legend: string;
  options: RadioOption[];
  value?: string;
  onChange?: (value: string) => void;
  name?: string;
}
/** A pick-exactly-one question shown as HotGap's pills but with correct radio
 *  semantics, so screen readers announce "1 of N". Use this for "Just me / Me +
 *  a partner" — not standalone choice Buttons, which read as independent toggles. */
export function RadioGroup({ legend, options, value, onChange, name }: RadioGroupProps) {
  const groupName = name ?? legend.replace(/\s+/g, "-").toLowerCase();
  return (
    <fieldset className="fieldset">
      <legend className="field-label">{legend}</legend>
      <div className="choice-row">
        {options.map((o) => {
          const on = value === o.value;
          return (
            <label key={o.value} className={`choice${on ? " selected" : ""}`}>
              <input type="radio" className="visually-hidden" name={groupName} value={o.value}
                checked={on} onChange={() => onChange?.(o.value)} />
              {o.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
