import { buildRamp, RAMP_COLOR_VARS } from "./ramp.js";

export interface LegendItem {
  /** Swatch color — a CSS color or a token like "var(--danger-ramp-3)". */
  color: string;
  label: string;
}

export interface LegendProps {
  /** Heading above the scale. */
  title?: string;
  /** The scale steps, ordered light → dark. */
  items: LegendItem[];
}

/**
 * A color-scale key for the map. Pass the same ramp tokens the map shades with
 * (`var(--danger-ramp-1)` … `-5`) so swatches and states always agree.
 */
export function Legend({ title, items }: LegendProps) {
  return (
    <div className="places-legend">
      {title && <h2>{title}</h2>}
      <ul className="legend-scale">
        {items.map((it, i) => (
          <li key={i}>
            <span className="legend-swatch-map" style={{ background: it.color }} aria-hidden />
            {it.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Build Legend items whose labels match a ChoroplethMap's actual bins over the
 * same `values`, so the swatches and the shaded states always agree.
 */
export function rampLegendItems(
  values: Partial<Record<string, number>>,
  format: (n: number) => string = (n) => "$" + Math.round(n).toLocaleString(),
): LegendItem[] {
  const { upperBounds } = buildRamp(
    Object.values(values).filter((v): v is number => typeof v === "number"),
  );
  const last = RAMP_COLOR_VARS.length - 1;
  return RAMP_COLOR_VARS.map((color, i) => {
    let label: string;
    if (i === 0) label = `Up to ${format(upperBounds[0])}`;
    else if (i === last) label = `${format(upperBounds[last - 1])} and up`;
    else label = `${format(upperBounds[i - 1])}–${format(upperBounds[i])}`;
    return { color, label };
  });
}
