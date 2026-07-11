// Sequential choropleth ramp: splits the observed range of "biggest possible
// loss" values (for the currently selected archetype, across all 51 states)
// into RAMP_BINS equal-width, quantized bins, light -> dark. One hue (the
// design system's danger/clay-red family — see --danger-ramp-1..5 in
// styles.css), monotone lightness, validated with the dataviz skill's
// validate_palette.js --ordinal check (see task report for the exact run).
export const RAMP_BINS = 5;

// Bin 0 (lightest/least severe) .. bin 4 (darkest/most severe). References the
// CSS custom properties defined in styles.css so light/dark mode both resolve
// to the same validated ramp automatically (see the comment there for the
// validate_palette.js --ordinal run this ramp passed).
export const RAMP_COLOR_VARS = [
  "var(--danger-ramp-1)",
  "var(--danger-ramp-2)",
  "var(--danger-ramp-3)",
  "var(--danger-ramp-4)",
  "var(--danger-ramp-5)",
];

export interface Ramp {
  /** Largest value observed (bin upper edge). 0 when every value is 0. */
  max: number;
  /** Upper bound (whole dollars) of each bin, lightest bin first. */
  upperBounds: number[];
  /** Bin index (0 = lightest/least severe .. RAMP_BINS-1 = darkest/most severe) for a value. */
  binIndex: (value: number) => number;
}

export function buildRamp(values: number[]): Ramp {
  const max = Math.max(0, ...values);

  // Degenerate case: every state has the same (zero) loss for this
  // archetype (true today for single-0/married-0-ish rows). A 5-bin ramp
  // over a zero-width range is meaningless — collapse to a single bin so
  // every state reads as "no loss found" rather than showing 5 fake shades
  // of the same color.
  if (max <= 0) {
    return { max: 0, upperBounds: [0], binIndex: () => 0 };
  }

  const step = max / RAMP_BINS;
  const upperBounds = Array.from({ length: RAMP_BINS }, (_, i) => Math.round(step * (i + 1)));

  const binIndex = (value: number): number => {
    if (value <= 0) return 0;
    return Math.min(RAMP_BINS - 1, Math.floor(value / step));
  };

  return { max, upperBounds, binIndex };
}
