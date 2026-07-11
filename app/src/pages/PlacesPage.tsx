import { useMemo, useState } from "react";
import { geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import { ARCHETYPES, DEFAULT_ARCHETYPE } from "@hotgap/shared";
import rawTopology from "us-atlas/states-albers-10m.json";
import rawSummary from "../data/places/summary.json";
import { t, type StringKey } from "../strings/t.js";
import { STATE_NAMES } from "../lib/states.js";
import { FIPS_TO_USPS } from "../lib/fips.js";
import { buildRamp, RAMP_COLOR_VARS, metricValue, type PlacesMetric } from "../lib/placesRamp.js";
import { formatDollars, formatAgeList } from "../lib/narration.js";
import { pickArchetypeId } from "../lib/fallback.js";
import { StatePanel } from "./StatePanel.js";

// Widened (was a 3-field narrowing behind an `as unknown as` cast) now that
// the summary carries escape-analysis fields too — safeExit isn't read on
// this page yet (the drill-down computes its own from the lazy-loaded
// points), but the interface should describe the real shape of the bundled
// data, not a stale subset of it.
interface StateArchetypeMetrics {
  biggestLoss: number;
  dangerWidth: number;
  cliffCount: number;
  safeExit: number | null;
  leap: number;
}
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

// The most kids any pipeline archetype models — derived the same way
// lib/fallback.ts derives its clamp, so a change to ARCHETYPES can never
// silently desync the stepper's max from what curves actually exist for.
const KID_MAX = Math.max(...ARCHETYPES.map((a) => a.childAges.length));

// All 51 states (50 + DC), alphabetical by full name, for the select-list
// equivalent control (Finding 1: WCAG 2.5.8 target-size exception + a
// first-class screen-reader path, since DE/RI/DC are far below tap-target
// size on the rendered map at mobile width).
const SORTED_STATES = Object.entries(STATE_NAMES)
  .map(([code, name]) => ({ code, name }))
  .sort((a, b) => a.name.localeCompare(b.name));

// Finding 4 (defensive): the map/legend color scale falls back to 0 for any
// state missing this archetype's data (summary.states[usps]?.[id] ?? 0) so a
// single state with no logged loss can't break the ramp math. But an
// archetype id missing from the summary ENTIRELY (i.e. absent from every
// state, not just one) is a different failure: the ?? 0 fallback would make
// the whole legend collapse to the degenerate "no cliffs" message — which is
// true for a genuinely-flat archetype but a false claim for a data gap. This
// guard keeps that message honest. Exported so it's unit-testable without
// mocking the bundled summary.json import.
export function isKnownArchetype(archetypeId: string, archetypes: { id: string }[]): boolean {
  return archetypes.some((a) => a.id === archetypeId);
}

export function PlacesPage() {
  const [married, setMarried] = useState(DEFAULT.married);
  const [kids, setKids] = useState(DEFAULT.childAges.length);
  const [selected, setSelected] = useState<string | null>(null);
  // Default: leap ("the jump to get out") — it answers the owner's core
  // question (how hard is it to escape safely) more directly than the raw
  // biggest-loss figure. The loss metric stays one tap away.
  const [metric, setMetric] = useState<PlacesMetric>("leap");
  // Reuses the same picker the personal door's fallback path uses (Finding 4)
  // instead of hand-deriving the "(single|married)-N" format locally, so the
  // two can never silently desync.
  const archetypeId = pickArchetypeId(married, kids);
  const archetypeKnown = isKnownArchetype(archetypeId, summary.archetypes);
  const kidsArchetype = ARCHETYPES.find((a) => a.childAges.length === kids);
  const kidsLabel =
    kids === 0
      ? t("places.pick.kids0")
      : t(`places.pick.kids${kids}` as StringKey, {
          ages: formatAgeList(kidsArchetype?.childAges ?? []),
        });

  const ramp = useMemo(() => {
    const values = Object.values(summary.states).map((s) => metricValue(s[archetypeId], metric));
    return buildRamp(values);
  }, [archetypeId, metric]);

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
  // Rank follows the SELECTED metric, not always biggestLoss: worse means a
  // bigger leap when comparing by leap, a bigger loss when comparing by loss.
  const selectedMetricValue = metricValue(selectedMetrics, metric);
  const rank = selectedMetrics
    ? Object.entries(summary.states).filter(
        ([code, byArchetype]) => code !== selected && metricValue(byArchetype[archetypeId], metric) < selectedMetricValue,
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
            type="button" className="step-btn" aria-label={t("common.fewerKids")}
            disabled={kids <= 0}
            onClick={() => setKids((k) => Math.max(0, k - 1))}
          >−</button>
          <output className="places-kids-output">{kidsLabel}</output>
          <button
            type="button" className="step-btn" aria-label={t("common.moreKids")}
            disabled={kids >= KID_MAX}
            onClick={() => setKids((k) => Math.min(KID_MAX, k + 1))}
          >+</button>
        </div>
      </fieldset>

      <figure className="places-map-figure">
        {/* role="group" (not "img"): an svg with role="img" is treated as a
            single children-presentational leaf, which can hide the per-path
            role="button" states from assistive tech (axe nested-interactive).
            role="group" keeps this label while exposing each state button. */}
        <svg
          viewBox={`${bx0} ${by0} ${bx1 - bx0} ${by1 - by0}`}
          role="group"
          aria-label={metric === "leap" ? t("places.map.altLeap") : t("places.map.alt")}
          className="places-map"
        >
          {usStates.features.map((f) => {
            const usps = FIPS_TO_USPS[String(f.id)];
            if (!usps) return null;
            const value = metricValue(summary.states[usps]?.[archetypeId], metric);
            const bin = ramp.binIndex(value);
            const name = STATE_NAMES[usps] ?? usps;
            const d = projectionlessPath(f) ?? undefined;
            const label = metric === "leap"
              ? t("places.map.stateLabelLeap", { state: name, amount: formatDollars(value) })
              : t("places.map.stateLabel", { state: name, loss: formatDollars(value) });
            return (
              <path
                key={usps}
                d={d}
                className={`state-path${selected === usps ? " selected" : ""}`}
                style={{ fill: RAMP_COLOR_VARS[bin] }}
                role="button"
                tabIndex={0}
                aria-label={label}
                onClick={() => selectState(usps)}
                onKeyDown={(e) => onKeyDownState(e, usps)}
              />
            );
          })}
        </svg>
      </figure>

      {/* Finding 1: an equivalent, always-tap-target-sized control for every
          state — DE/RI/DC render far below the 44px/24px targets on the map
          itself at mobile width, with no other way to reach them precisely.
          Drives the exact same selectState() the map paths use. */}
      <div className="places-state-select-row">
        <label htmlFor="places-state-select">{t("places.pick.state")}</label>
        <select
          id="places-state-select"
          value={selected ?? ""}
          onChange={(e) => selectState(e.target.value)}
        >
          {SORTED_STATES.map(({ code, name }) => (
            <option key={code} value={code}>{name}</option>
          ))}
        </select>
      </div>

      {/* Two-choice metric picker, same choice-chip idiom as the family
          picker above. Default is "leap" — the map, legend, and rank all
          switch together (Task 24: make the leap a first-class metric). */}
      <div className="places-metric-picker">
        <p className="hint" id="places-metric-label">{t("places.metric.title")}</p>
        <div className="choice-row" role="radiogroup" aria-labelledby="places-metric-label">
          <button
            type="button" className={metric === "leap" ? "choice selected" : "choice"}
            role="radio" aria-checked={metric === "leap"}
            onClick={() => setMetric("leap")}
          >{t("places.metric.leap")}</button>
          <button
            type="button" className={metric === "loss" ? "choice selected" : "choice"}
            role="radio" aria-checked={metric === "loss"}
            onClick={() => setMetric("loss")}
          >{t("places.metric.loss")}</button>
        </div>
      </div>

      {archetypeKnown && (
        <section className="places-legend">
          <h2>{metric === "leap" ? t("places.legend.titleLeap") : t("places.legend.title")}</h2>
          {ramp.max <= 0 ? (
            // Defensive fallback: once real health costs are folded in, every
            // archetype — including childless adults, who hit a health-coverage
            // cliff when Medicaid gives way to paid ACA premiums — has a cliff
            // in at least one state, so this branch does not fire on current
            // data. Kept as an honest, metric-agnostic guard if an archetype
            // ever comes back all-zero.
            <p>{t("places.legend.noneFound")}</p>
          ) : (
            <ul className="legend-scale">
              {ramp.upperBounds.map((upper, i) => (
                <li key={upper}>
                  <span className="legend-swatch-map" aria-hidden style={{ background: RAMP_COLOR_VARS[i] }} />
                  {metric === "leap"
                    ? t("places.legend.leapUpTo", { amount: formatDollars(upper) })
                    : t("places.legend.upTo", { amount: formatDollars(upper) })}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {selected && selectedMetrics && (
        <StatePanel
          stateCode={selected}
          stateName={STATE_NAMES[selected] ?? selected}
          archetypeId={archetypeId}
          metric={metric}
          biggestLoss={selectedMetrics.biggestLoss}
          leap={selectedMetrics.leap}
          rank={rank}
        />
      )}
    </div>
  );
}
