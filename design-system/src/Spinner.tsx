export interface SpinnerProps {
  /** Text under the spinner, also announced to screen readers. */
  label?: string;
}

/**
 * A centered loading spinner with a plain caption. Uses `role="status"` so the
 * label is announced, and slows right down under reduced-motion settings.
 */
export function Spinner({ label = "Getting your numbers…" }: SpinnerProps) {
  return (
    <div className="loading" role="status">
      <div className="spinner" aria-hidden />
      <p className="hint">{label}</p>
    </div>
  );
}
