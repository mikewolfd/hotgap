export interface CheckboxOption { value: string; label: string; }
export interface CheckboxGroupProps {
  /** The question these options answer — the group's accessible name. */
  legend: string;
  options: CheckboxOption[];
  /** The values currently checked. */
  value?: string[];
  /** Words for a row's on/off state (default "Yes"/"No"). */
  onText?: string;
  offText?: string;
  onChange?: (value: string[]) => void;
}
/** Pick any number from a list (multi-select) with real checkbox semantics,
 *  shown as HotGap's pills. For a single yes/no use Toggle; for pick-exactly-one
 *  use RadioGroup. */
export function CheckboxGroup({ legend, options, value = [], onText = "Yes", offText = "No", onChange }: CheckboxGroupProps) {
  const toggle = (v: string) => onChange?.(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  return (
    <fieldset className="fieldset">
      <legend className="field-label">{legend}</legend>
      {options.map((o) => {
        const on = value.includes(o.value);
        return (
          <label key={o.value} className={`toggle${on ? " on" : ""}`}>
            <span className="toggle-label">{o.label}</span>
            <input type="checkbox" className="visually-hidden" checked={on} onChange={() => toggle(o.value)} />
            <span className="toggle-state">{on ? onText : offText}</span>
          </label>
        );
      })}
    </fieldset>
  );
}
