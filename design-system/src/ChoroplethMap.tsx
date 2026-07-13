import { geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Feature, Geometry } from "geojson";
import rawTopology from "us-atlas/states-albers-10m.json";
import { FIPS_TO_USPS, STATE_NAMES } from "./usGeo.js";
import { buildRamp, RAMP_COLOR_VARS } from "./ramp.js";
import type { StateValues } from "./types.js";

// us-atlas ships a pre-projected Albers topology, so geoPath takes NO projection.
const topology = rawTopology as unknown as {
  bbox?: [number, number, number, number];
  objects: { states: Parameters<typeof feature>[1] };
};
const usStates = feature(topology as never, topology.objects.states) as unknown as {
  features: Array<Feature<Geometry, Record<string, unknown>> & { id?: string | number }>;
};
const [bx0, by0, bx1, by1] = topology.bbox ?? [0, 0, 975, 610];
const pathGen = geoPath();

export interface ChoroplethMapProps {
  /** Two-letter USPS code → the value to shade that state by (bigger = darker). */
  values: StateValues;
  /** Currently selected state (USPS code), if any. */
  selected?: string | null;
  /** Word for what the value measures, used in each state's label (e.g. "biggest loss"). */
  valueLabel?: string;
  /** How to render a value in a state's accessible label (default: "$" + commas). */
  formatValue?: (value: number) => string;
  onSelect?: (usps: string) => void;
}

/**
 * The 50-states-plus-DC map, shaded by a value per state on HotGap's clay-red
 * ramp (light = small, dark = large). Every state is a real focusable button, so
 * the map is keyboard- and screen-reader-navigable. Pair it with `Legend` using
 * the same `var(--danger-ramp-*)` tokens so swatches and states always agree.
 */
export function ChoroplethMap({
  values, selected, valueLabel = "value",
  formatValue = (v) => `$${Math.round(v).toLocaleString()}`, onSelect,
}: ChoroplethMapProps) {
  const ramp = buildRamp(Object.values(values).filter((v): v is number => typeof v === "number"));
  return (
    <svg
      viewBox={`${bx0} ${by0} ${bx1 - bx0} ${by1 - by0}`}
      role="group"
      aria-label="A map of the 50 states and Washington, DC, shaded by value."
      className="places-map"
    >
      {usStates.features.map((f) => {
        const usps = FIPS_TO_USPS[String(f.id)];
        if (!usps) return null;
        const value = values[usps] ?? 0;
        const name = STATE_NAMES[usps] ?? usps;
        const d = pathGen(f) ?? undefined;
        return (
          <path
            key={usps}
            d={d}
            className={`state-path${selected === usps ? " selected" : ""}`}
            style={{ fill: RAMP_COLOR_VARS[ramp.binIndex(value)] }}
            role="button"
            tabIndex={0}
            aria-label={`${name}: ${valueLabel} ${formatValue(value)}`}
            onClick={() => onSelect?.(usps)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect?.(usps); }
            }}
          />
        );
      })}
    </svg>
  );
}
