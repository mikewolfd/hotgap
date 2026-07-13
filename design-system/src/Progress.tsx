export interface ProgressProps {
  /** Which step the person is on (1-based). */
  current: number;
  /** How many steps there are in all. */
  total: number;
  /** Word for a step (default "Question"). */
  noun?: string;
}
/** A step indicator for a multi-step flow ("Question 2 of 6") with a filled bar.
 *  Announced to screen readers via role="progressbar". */
export function Progress({ current, total, noun = "Question" }: ProgressProps) {
  const pct = Math.max(0, Math.min(100, (current / Math.max(1, total)) * 100));
  return (
    <div className="progress" role="progressbar" aria-valuenow={current} aria-valuemin={1}
      aria-valuemax={total} aria-label={`${noun} ${current} of ${total}`}>
      <p className="progress-label">{noun} {current} of {total}</p>
      <div className="progress-track"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
    </div>
  );
}
