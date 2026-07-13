export interface StepperProps {
  /** What's being counted — used for the +/- buttons' accessible labels. */
  label: string;
  value: number;
  min?: number;
  max?: number;
  /** How the value reads in the middle (defaults to the number itself, e.g.
   *  pass "2 kids, ages 3 and 7"). */
  display?: string;
  /** A visible caption shown above the stepper, e.g. "How many kids?". */
  caption?: string;
  onChange?: (value: number) => void;
}

/**
 * A big plus/minus counter for small whole numbers (how many kids, etc.). The
 * −/+ buttons are 48px square; the current value shows between them and can be
 * overridden with `display` to read as a full phrase.
 */
export function Stepper({ label, value, min = 0, max = 99, display, caption, onChange }: StepperProps) {
  return (
    <div>
      {caption && <span className="field-label" style={{ display: "block", marginBottom: 6 }}>{caption}</span>}
      <div className="stepper" role="group" aria-label={caption ?? `choose ${label}`}>
        <button
          type="button" className="step-btn" aria-label={`fewer ${label}`}
          disabled={value <= min} onClick={() => onChange?.(Math.max(min, value - 1))}
        >−</button>
        <output>{display ?? value}</output>
        <button
          type="button" className="step-btn" aria-label={`more ${label}`}
          disabled={value >= max} onClick={() => onChange?.(Math.min(max, value + 1))}
        >+</button>
      </div>
    </div>
  );
}
