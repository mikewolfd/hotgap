import { scaleLinear } from "d3-scale";
import { line as d3line, curveMonotoneX } from "d3-shape";
import { fromAnnual, toAnnual, type CurveAnalysis } from "@hotgap/shared";
import { t } from "../strings/t.js";
import type { PayContext } from "../lib/narration.js";

// Exported for tests: lets CurveChart.test.tsx reconstruct the exact same x
// scale to verify tick label/position agreement without duplicating layout
// constants.
export const W = 360, H = 240, M = { top: 16, right: 12, bottom: 40, left: 52 };

export function CurveChart({
  analysis, ctx, showCurrent = true,
}: {
  analysis: CurveAnalysis; ctx: PayContext;
  /** Hides the "you are here" dot + label. Default true (personal-door result page). The
   * places-door drill-down passes false: its curves belong to an archetype household,
   * not the visitor, so there is no "you" position to mark. */
  showCurrent?: boolean;
}) {
  const pts = analysis.points;
  const x = scaleLinear([pts[0].earnings, pts[pts.length - 1].earnings], [M.left, W - M.right]);
  const yMax = Math.max(...pts.map((p) => p.netIncome));
  const y = scaleLinear([0, yMax * 1.05], [H - M.bottom, M.top]);

  const path = d3line<{ earnings: number; netIncome: number }>()
    .x((p) => x(p.earnings))
    .y((p) => y(p.netIncome))
    .curve(curveMonotoneX)(pts)!;

  const unitLabel = { hour: "$/hour", month: "$/month", year: "$/year" }[ctx.unit];

  // Ticks are chosen in DISPLAY-unit space (dollars/hour, dollars/month, ...)
  // rather than annual dollars, so a label's printed value and its pixel
  // x-position always describe the same amount. The old approach picked
  // "nice" ticks in annual dollars, then converted+rounded each one only for
  // display: a "nice" annual step (say $20,000) is not a "nice" step once
  // divided into months or hours, so the rounded label could sit up to ~25%
  // off from where that rounded number actually falls on the axis. Generating
  // ticks in display space and mapping each one back to annual (via the exact
  // inverse, toAnnual) for positioning keeps label and position exact.
  const displayDomain: [number, number] = [
    fromAnnual(pts[0].earnings, ctx.unit, ctx.hoursPerWeek),
    fromAnnual(pts[pts.length - 1].earnings, ctx.unit, ctx.hoursPerWeek),
  ];
  const xTicks = scaleLinear(displayDomain, [0, 1]).ticks(5).map((displayValue) => ({
    annual: toAnnual({ amount: displayValue, unit: ctx.unit, hoursPerWeek: ctx.hoursPerWeek }),
    label: ctx.unit === "hour" ? `$${Math.round(displayValue)}` : `$${Math.round(displayValue / 1000)}k`,
  }));
  const yTicks = y.ticks(4);

  return (
    <figure className="chart-figure">
      <figcaption className="chart-title">{t("result.chart.title")}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t("result.chart.alt")} className="curve-chart">
        {analysis.dangerZones.map((z, i) => (
          <rect key={i} className="danger-zone"
            x={x(z.startEarnings)} y={M.top}
            width={x(z.endEarnings ?? pts[pts.length - 1].earnings) - x(z.startEarnings)}
            height={H - M.top - M.bottom} />
        ))}
        {yTicks.map((v) => (
          <g key={v}>
            <line x1={M.left} x2={W - M.right} y1={y(v)} y2={y(v)} className="tick-line" />
            <text x={M.left - 6} y={y(v)} dy="0.32em" textAnchor="end" className="tick-text y-tick">
              ${Math.round(v / 1000)}k
            </text>
          </g>
        ))}
        {xTicks.map(({ annual, label }) => (
          <text key={annual} x={x(annual)} y={H - M.bottom + 16} textAnchor="middle" className="tick-text x-tick">
            {label}
          </text>
        ))}
        <text x={(M.left + W - M.right) / 2} y={H - 4} textAnchor="middle" className="axis-label">
          {t("result.chart.xLabel", { unit: unitLabel })}
        </text>
        {/* Y-axis label, rotated -90deg along the left margin. Plan 4: the
            curve is health-adjusted (netIncome already has real health costs
            subtracted out), and this label is the load-bearing spot that says
            so on the chart itself — result.chart.yLabel was an unused string
            before this (see docs/post-merge-notes.md), now it has a home. */}
        <text
          x={14} y={(M.top + H - M.bottom) / 2}
          textAnchor="middle" className="axis-label y-axis-label"
          transform={`rotate(-90 14 ${(M.top + H - M.bottom) / 2})`}
        >
          {t("result.chart.yLabel")}
        </text>
        <path d={path} className="net-line" fill="none" />
        {showCurrent && (
          <>
            <circle
              className="you-dot" r={6}
              cx={x(analysis.currentEarnings)} cy={y(analysis.currentNet)}
            />
            <text
              x={x(analysis.currentEarnings)}
              y={Math.max(M.top + 10, y(analysis.currentNet) - 12)}
              textAnchor="middle" className="you-label"
            >
              {t("result.chart.youAreHere")}
            </text>
          </>
        )}
      </svg>
      {analysis.dangerZones.length > 0 && (
        <p className="chart-legend">
          <span className="legend-swatch" aria-hidden /> {t("result.chart.dangerZone")}
        </p>
      )}
    </figure>
  );
}
