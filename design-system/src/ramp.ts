// Sequential choropleth ramp: splits the observed value range into 5 equal-width
// quantized bins, light -> dark, using the clay-red --danger-ramp tokens so
// light/dark mode both resolve automatically.
export const RAMP_BINS = 5;

/** Bin 0 (lightest/least) … bin 4 (darkest/most). CSS token per bin. */
export const RAMP_COLOR_VARS = [
  "var(--danger-ramp-1)",
  "var(--danger-ramp-2)",
  "var(--danger-ramp-3)",
  "var(--danger-ramp-4)",
  "var(--danger-ramp-5)",
];

export interface Ramp {
  /** Largest value observed (0 when every value is 0). */
  max: number;
  /** Upper bound (whole units) of each bin, lightest first. */
  upperBounds: number[];
  /** Bin index (0 = lightest … RAMP_BINS-1 = darkest) for a value. */
  binIndex: (value: number) => number;
}

/** Build a 5-bin ramp over a set of values (collapses to one bin when all 0). */
export function buildRamp(values: number[]): Ramp {
  const max = Math.max(0, ...values);
  if (max <= 0) return { max: 0, upperBounds: [0], binIndex: () => 0 };
  const step = max / RAMP_BINS;
  const upperBounds = Array.from({ length: RAMP_BINS }, (_, i) => Math.round(step * (i + 1)));
  const binIndex = (value: number): number =>
    value <= 0 ? 0 : Math.min(RAMP_BINS - 1, Math.floor(value / step));
  return { max, upperBounds, binIndex };
}
