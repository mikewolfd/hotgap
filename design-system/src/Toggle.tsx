export interface ToggleProps {
  /** The thing being turned on or off, in plain words. */
  label: string;
  /** Whether it's currently on. */
  on: boolean;
  /** Words for the on/off states (default "Yes"/"No"). */
  onText?: string;
  offText?: string;
  onChange?: (on: boolean) => void;
}

/**
 * A full-width pill switch for a yes/no choice (e.g. "A housing voucher").
 * Turns teal when on. It's a real `role="switch"` button, so it's keyboard- and
 * screen-reader-friendly, and at least 44px tall.
 */
export function Toggle({ label, on, onText = "Yes", offText = "No", onChange }: ToggleProps) {
  return (
    <button
      type="button" role="switch" aria-checked={on}
      className={`toggle${on ? " on" : ""}`}
      onClick={() => onChange?.(!on)}
    >
      <span className="toggle-label">{label}</span>
      <span className="toggle-state">{on ? onText : offText}</span>
    </button>
  );
}
