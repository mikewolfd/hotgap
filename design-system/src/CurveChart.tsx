import { useState, useEffect, useId, useRef } from "react";
import { scaleLinear } from "d3-scale";
import { line as d3line, curveMonotoneX } from "d3-shape";
import type { CurveAnalysis, PayUnit } from "./types.js";
import { PROGRAM_LABELS } from "./types.js";
import { formatDollars, formatWage, fromAnnual, toAnnual } from "./format.js";

const W = 360, H = 240, M = { top: 16, right: 12, bottom: 40, left: 52 };

export interface CurveChartProps {
  /** The household's money-vs-pay story: points, cliffs, danger zones, and where
   *  they are today. */
  analysis: CurveAnalysis;
  /** How pay reads on the x-axis and in the drop cards. Default "year". */
  unit?: PayUnit;
  /** Hours per week, when unit is "hour". Default 40. */
  hoursPerWeek?: number;
  /** Show the "you are here" dot. Off for comparison charts with no single
   *  household. Default true. */
  showCurrent?: boolean;
}

/**
 * HotGap's signature chart: yearly money kept as pay rises. Benefits cliffs show
 * as red danger bands, and every discrete drop gets a tappable dot — tapping it
 * opens a card naming how much money the drop costs and exactly which help ends
 * there. The dots are real buttons (44px, keyboard-focusable).
 */
export function CurveChart({ analysis, unit = "year", hoursPerWeek = 40, showCurrent = true }: CurveChartProps) {
  const pts = analysis.points;
  // Hooks run unconditionally (rules of hooks); the degenerate-input guard and
  // every pts-derived value come after them.
  const [selectedStart, setSelectedStart] = useState<number | null>(null);
  const cardId = useId();
  const markerRefs = useRef(new Map<number, HTMLButtonElement>());
  const selected = analysis.cliffs.find((c) => c.startEarnings === selectedStart) ?? null;
  useEffect(() => {
    if (selectedStart !== null && !selected) setSelectedStart(null);
  }, [selectedStart, selected]);

  if (pts.length < 2) {
    return (
      <figure className="chart-figure">
        <figcaption className="chart-title">Money you keep as your pay goes up</figcaption>
        <p className="hint">Not enough data to draw this yet.</p>
      </figure>
    );
  }

  const x = scaleLinear([pts[0].earnings, pts[pts.length - 1].earnings], [M.left, W - M.right]);
  const yMax = Math.max(...pts.map((p) => p.netIncome));
  const y = scaleLinear([0, yMax * 1.05], [H - M.bottom, M.top]);

  const path = d3line<{ earnings: number; netIncome: number }>()
    .x((p) => x(p.earnings))
    .y((p) => y(p.netIncome))
    .curve(curveMonotoneX)(pts)!;

  const unitLabel = { hour: "$/hour", month: "$/month", year: "$/year" }[unit];

  const netAt = (earnings: number): number => {
    if (earnings <= pts[0].earnings) return pts[0].netIncome;
    const last = pts[pts.length - 1];
    if (earnings >= last.earnings) return last.netIncome;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      if (earnings >= a.earnings && earnings <= b.earnings) {
        const span = b.earnings - a.earnings;
        if (span === 0) return a.netIncome;
        const t = (earnings - a.earnings) / span;
        return a.netIncome + t * (b.netIncome - a.netIncome);
      }
    }
    return last.netIncome;
  };

  const closeCard = () => {
    const marker = selectedStart !== null ? markerRefs.current.get(selectedStart) : undefined;
    setSelectedStart(null);
    marker?.focus();
  };

  const displayDomain: [number, number] = [
    fromAnnual(pts[0].earnings, unit, hoursPerWeek),
    fromAnnual(pts[pts.length - 1].earnings, unit, hoursPerWeek),
  ];
  const xTicks = scaleLinear(displayDomain, [0, 1]).ticks(5).map((displayValue) => ({
    annual: toAnnual(displayValue, unit, hoursPerWeek),
    label: unit === "hour" ? `$${Math.round(displayValue)}` : `$${Math.round(displayValue / 1000)}k`,
  }));
  const yTicks = y.ticks(4);

  return (
    <figure className="chart-figure">
      <figcaption className="chart-title">Money you keep as your pay goes up</figcaption>
      <div className="chart-plot">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="A chart of the money your family keeps as your pay goes up. Shaded parts show where more pay means less money." className="curve-chart">
          {analysis.dangerZones.map((z, i) => (
            <rect key={i} className="danger-zone"
              x={x(z.startEarnings)} y={M.top}
              width={x(z.endEarnings ?? pts[pts.length - 1].earnings) - x(z.startEarnings)}
              height={H - M.top - M.bottom} />
          ))}
          {yTicks.map((v) => (
            <g key={v}>
              <line x1={M.left} x2={W - M.right} y1={y(v)} y2={y(v)} className="tick-line" />
              <text x={M.left - 6} y={y(v)} dy="0.32em" textAnchor="end" className="tick-text">${Math.round(v / 1000)}k</text>
            </g>
          ))}
          {xTicks.map(({ annual, label }) => (
            <text key={annual} x={x(annual)} y={H - M.bottom + 16} textAnchor="middle" className="tick-text">{label}</text>
          ))}
          <text x={(M.left + W - M.right) / 2} y={H - 4} textAnchor="middle" className="axis-label">Your pay ({unitLabel})</text>
          <text x={14} y={(M.top + H - M.bottom) / 2} textAnchor="middle" className="axis-label"
            transform={`rotate(-90 14 ${(M.top + H - M.bottom) / 2})`}>Money left per year</text>
          <path d={path} className="net-line" fill="none" />
          {selected && (
            <line className="drop-guide" x1={x(selected.startEarnings)} x2={x(selected.startEarnings)} y1={M.top} y2={H - M.bottom} />
          )}
          {showCurrent && typeof analysis.currentEarnings === "number" && typeof analysis.currentNet === "number" && (
            <>
              <circle className="you-dot" r={6} cx={x(analysis.currentEarnings)} cy={y(analysis.currentNet)} />
              <text x={x(analysis.currentEarnings)} y={Math.max(M.top + 10, y(analysis.currentNet) - 12)} textAnchor="middle" className="you-label">You are here</text>
            </>
          )}
        </svg>
        {analysis.cliffs.map((c) => {
          const isSel = c.startEarnings === selectedStart;
          return (
            <button
              key={c.startEarnings}
              ref={(el) => { if (el) markerRefs.current.set(c.startEarnings, el); else markerRefs.current.delete(c.startEarnings); }}
              type="button"
              className={`drop-marker${isSel ? " drop-marker-selected" : ""}`}
              style={{ left: `${(x(c.startEarnings) / W) * 100}%`, top: `${(y(netAt(c.startEarnings)) / H) * 100}%` }}
              aria-pressed={isSel}
              aria-label={`A drop near ${formatWage(c.startEarnings, unit, hoursPerWeek)}. You'd lose about ${formatDollars(c.drop)} a year here. Tap to see what ends.`}
              onClick={() => setSelectedStart(isSel ? null : c.startEarnings)}
            >
              <span className="drop-dot" aria-hidden />
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="drop-card" role="region" aria-labelledby={`${cardId}-amt`}>
          <button type="button" className="drop-card-close" aria-label="Close" onClick={closeCard}>×</button>
          <p id={`${cardId}-amt`} className="drop-card-amount">
            At {formatWage(selected.startEarnings, unit, hoursPerWeek)}, more pay drops what you keep by about {formatDollars(selected.drop)}.
          </p>
          {selected.programsLost.length > 0 ? (
            <>
              <p className="drop-card-lose">You'd lose:</p>
              <ul className="drop-card-list">
                {selected.programsLost.map((id) => <li key={id}>{PROGRAM_LABELS[id]}</li>)}
              </ul>
            </>
          ) : (
            <p className="drop-card-lose">A few kinds of help would get smaller here.</p>
          )}
        </div>
      )}

      {analysis.dangerZones.length > 0 && (
        <p className="chart-legend"><span className="legend-swatch" aria-hidden /> Rough zone: more pay, less money</p>
      )}
      {analysis.cliffs.length > 0 && <p className="drop-hint">Tap a red dot to see what you lose.</p>}
    </figure>
  );
}
