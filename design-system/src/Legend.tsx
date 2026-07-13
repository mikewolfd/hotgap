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
