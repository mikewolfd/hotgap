export interface SelectOption { value: string; label: string; }
export interface SelectProps {
  /** The visible label above the select. */
  label: string;
  options: SelectOption[];
  value?: string;
  /** Text for the empty first option. */
  placeholder?: string;
  onChange?: (value: string) => void;
  id?: string;
}
/**
 * A labeled native dropdown — a plain, fully accessible way to choose one item
 * from a list (e.g. your state, when tapping a tiny state on the map is hard).
 * Uses a real <select> so it works with keyboard, screen readers, and touch.
 */
export function Select({ label, options, value, placeholder, onChange, id }: SelectProps) {
  const selId = id ?? label.replace(/\s+/g, "-").toLowerCase();
  return (
    <label className="field" htmlFor={selId}>
      <span className="field-label">{label}</span>
      <select id={selId} className="select" value={value ?? ""} onChange={(e) => onChange?.(e.target.value)}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}
