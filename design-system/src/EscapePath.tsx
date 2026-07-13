export interface EscapePathProps {
  /** Optional plain line about the yearly health-coverage cost at this pay. */
  healthCost?: string;
  /** The "you're safe past here" line (bold). */
  safe?: string;
  /** The pay distance across the roughest zone, as a plain line (bold). */
  leap?: string;
  /** Programs that end, as plain lines. */
  ends?: string[];
  /** Heading above the ends list. */
  endsTitle?: string;
}

/**
 * How help changes as pay rises — the pay past which more always helps ("safe
 * exit"), the pay distance across the roughest zone, and where each program ends.
 * Descriptive only: it shows thresholds, it never tells the reader what to do.
 */
export function EscapePath({ healthCost, safe, leap, ends, endsTitle = "When help ends" }: EscapePathProps) {
  return (
    <section className="escape-path">
      {healthCost && <p className="escape-health-cost">{healthCost}</p>}
      {safe && <p className="escape-safe">{safe}</p>}
      {leap && <p className="escape-leap">{leap}</p>}
      {ends && ends.length > 0 && (
        <>
          <p className="escape-ends-title">{endsTitle}</p>
          <ul className="escape-ends-list">
            {ends.map((e, i) => <li key={i} className="escape-ends-item">{e}</li>)}
          </ul>
        </>
      )}
    </section>
  );
}
