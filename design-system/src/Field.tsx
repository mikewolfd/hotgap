export interface FieldProps {
  /** The question or label shown above the input. */
  label: string;
  /** Optional helper text under the input (e.g. "Your best guess is fine"). */
  hint?: string;
  /** A currency-style prefix shown before the input (e.g. "$"). */
  prefix?: string;
  value?: string;
  placeholder?: string;
  inputMode?: "text" | "numeric" | "decimal";
  /** Narrow the input (e.g. for an age or a small count). */
  small?: boolean;
  onChange?: (value: string) => void;
  id?: string;
}

/**
 * A labeled text or number input. Pass `prefix="$"` for money questions. The
 * label sits above the field in bold; an optional hint sits below it. The input
 * is a large 52px tap target with a teal focus ring.
 */
export function Field({
  label, hint, prefix, value, placeholder, inputMode = "text", small, onChange, id,
}: FieldProps) {
  const inputId = id ?? label.replace(/\s+/g, "-").toLowerCase();
  const input = (
    <input
      id={inputId}
      className={`input${small ? " input-small" : ""}`}
      value={value}
      placeholder={placeholder}
      inputMode={inputMode}
      onChange={(e) => onChange?.(e.target.value)}
    />
  );
  return (
    <label className="field" htmlFor={inputId}>
      <span className="field-label">{label}</span>
      {prefix ? (
        <span className="money-row"><span className="money-prefix">{prefix}</span>{input}</span>
      ) : input}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}
