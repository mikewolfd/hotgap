import { useMemo, useState } from "react";
import { geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import { ARCHETYPES, DEFAULT_ARCHETYPE } from "@hotgap/shared";
import rawTopology from "us-atlas/states-albers-10m.json";
import rawSummary from "../data/places/summary.json";
import { t } from "../strings/t.js";
import { STATE_NAMES } from "../lib/states.js";
import { FIPS_TO_USPS } from "../lib/fips.js";
import { buildRamp, RAMP_COLOR_VARS } from "../lib/placesRamp.js";
import { formatDollars } from "../lib/narration.js";
import { StatePanel } from "./StatePanel.js";

interface StateArchetypeMetrics { biggestLoss: number; dangerWidth: number; cliffCount: number }
interface PlacesSummary {
  generated: string;
  year: string;
  archetypes: { id: string; married: boolean; childAges: number[] }[];
  states: Record<string, Record<string, StateArchetypeMetrics>>;
}

const summary = rawSummary as unknown as PlacesSummary;

interface StateProps { name: string }
type StatesTopology = Topology<{ states: GeometryCollection<StateProps> }>;
const topology = rawTopology as unknown as StatesTopology;
const usStates = feature(topology, topology.objects.states);
const [bx0, by0, bx1, by1] = topology.bbox ?? [0, 0, 975, 610];

const projectionlessPath = geoPath(); // pre-projected topology: NO projection argument

const DEFAULT = ARCHETYPES.find((a) => a.id === DEFAULT_ARCHETYPE)!;

const KID_MAX = 3;

export function PlacesPage() {
  const [married, setMarried] = useState(DEFAULT.married);
  const [kids, setKids] = useState(DEFAULT.childAges.length);
  const [selected, setSelected] = useState<string | null>(null);
  const archetypeId = `${married ? "married" : "single"}-${kids}`;

  const ramp = useMemo(() => {
    const values = Object.values(summary.states).map((s) => s[archetypeId]?.biggestLoss ?? 0);
    return buildRamp(values);
  }, [archetypeId]);

  function selectState(usps: string) {
    setSelected(usps);
  }

  function onKeyDownState(e: React.KeyboardEvent, usps: string) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      selectState(usps);
    }
  }

  const selectedMetrics = selected ? summary.states[selected]?.[archetypeId] : undefined;
  const rank = selectedMetrics
    ? Object.entries(summary.states).filter(
        ([code, byArchetype]) => code !== selected && (byArchetype[archetypeId]?.biggestLoss ?? 0) < selectedMetrics.biggestLoss,
      ).length
    : 0;

  return (
    <div className="places-page">
      <h1>{t("places.title")}</h1>
      <p className="hint">{t("places.intro")}</p>

      <fieldset className="places-picker">
        <legend>{t("places.pick.title")}</legend>
        <div className="choice-row" role="radiogroup" aria-label={t("places.pick.title")}>
          <button
            type="button" className={married ? "choice" : "choice selected"}
            role="radio" aria-checked={!married}
            onClick={() => setMarried(false)}
          >{t("flow.family.single")}</button>
          <button
            type="button" className={married ? "choice selected" : "choice"}
            role="radio" aria-checked={married}
            onClick={() => setMarried(true)}
          >{t("flow.family.married")}</button>
        </div>

        <p className="hint" id="places-kids-label">{t("places.pick.kids")}</p>
        <div className="stepper" aria-labelledby="places-kids-label">
          <button
            type="button" className="step-btn" aria-label="fewer kids"
            disabled={kids <= 0}
            onClick={() => setKids((k) => Math.max(0, k - 1))}
          >−</button>
          <output>{kids}</output>
          <button
            type="button" className="step-btn" aria-label="more kids"
            disabled={kids >= KID_MAX}
            onClick={() => setKids((k) => Math.min(KID_MAX, k + 1))}
          >+</button>
        </div>
      </fieldset>

      <figure className="places-map-figure">
        <svg
          viewBox={`${bx0} ${by0} ${bx1 - bx0} ${by1 - by0}`}
          role="img" aria-label={t("places.map.alt")} className="places-map"
        >
          {usStates.features.map((f) => {
            const usps = FIPS_TO_USPS[String(f.id)];
            if (!usps) return null;
            const loss = summary.states[usps]?.[archetypeId]?.biggestLoss ?? 0;
            const bin = ramp.binIndex(loss);
            const name = STATE_NAMES[usps] ?? usps;
            const d = projectionlessPath(f) ?? undefined;
            return (
              <path
                key={usps}
                d={d}
                className={`state-path${selected === usps ? " selected" : ""}`}
                style={{ fill: RAMP_COLOR_VARS[bin] }}
                role="button"
                tabIndex={0}
                aria-label={t("places.map.stateLabel", { state: name, loss: formatDollars(loss) })}
                onClick={() => selectState(usps)}
                onKeyDown={(e) => onKeyDownState(e, usps)}
              />
            );
          })}
        </svg>
      </figure>

      <section className="places-legend">
        <h2>{t("places.legend.title")}</h2>
        {ramp.max <= 0 ? (
          <p>{t("places.legend.none")}</p>
        ) : (
          <ul className="legend-scale">
            {ramp.upperBounds.map((upper, i) => (
              <li key={upper}>
                <span className="legend-swatch-map" aria-hidden style={{ background: RAMP_COLOR_VARS[i] }} />
                {t("places.legend.upTo", { amount: formatDollars(upper) })}
              </li>
            ))}
          </ul>
        )}
      </section>

      {selected && selectedMetrics && (
        <StatePanel
          stateCode={selected}
          stateName={STATE_NAMES[selected] ?? selected}
          archetypeId={archetypeId}
          biggestLoss={selectedMetrics.biggestLoss}
          rank={rank}
        />
      )}
    </div>
  );
}
