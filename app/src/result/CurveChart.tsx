import { scaleLinear } from "d3-scale";
import { line as d3line, curveMonotoneX } from "d3-shape";
import { fromAnnual, type CurveAnalysis } from "@hotgap/shared";
import { t } from "../strings/t.js";
import type { PayContext } from "../lib/narration.js";

const W = 360, H = 240, M = { top: 16, right: 12, bottom: 40, left: 52 };

export function CurveChart({ analysis, ctx }: { analysis: CurveAnalysis; ctx: PayContext }) {
  const pts = analysis.points;
  const x = scaleLinear([pts[0].earnings, pts[pts.length - 1].earnings], [M.left, W - M.right]);
  const yMax = Math.max(...pts.map((p) => p.netIncome));
  const y = scaleLinear([0, yMax * 1.05], [H - M.bottom, M.top]);

  const path = d3line<{ earnings: number; netIncome: number }>()
    .x((p) => x(p.earnings))
    .y((p) => y(p.netIncome))
    .curve(curveMonotoneX)(pts)!;

  const unitLabel = { hour: "$/hour", month: "$/month", year: "$/year" }[ctx.unit];
  const xTick = (annual: number) => {
    const v = fromAnnual(annual, ctx.unit, ctx.hoursPerWeek);
    return ctx.unit === "hour" ? `$${Math.round(v)}` : `$${Math.round(v / 1000)}k`;
  };
  const xTicks = x.ticks(5);
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
            <text x={M.left - 6} y={y(v)} dy="0.32em" textAnchor="end" className="tick-text">
              ${Math.round(v / 1000)}k
            </text>
          </g>
        ))}
        {xTicks.map((v) => (
          <text key={v} x={x(v)} y={H - M.bottom + 16} textAnchor="middle" className="tick-text">
            {xTick(v)}
          </text>
        ))}
        <text x={(M.left + W - M.right) / 2} y={H - 4} textAnchor="middle" className="axis-label">
          {t("result.chart.xLabel", { unit: unitLabel })}
        </text>
        <path d={path} className="net-line" fill="none" />
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
      </svg>
      {analysis.dangerZones.length > 0 && (
        <p className="chart-legend">
          <span className="legend-swatch" aria-hidden /> {t("result.chart.dangerZone")}
        </p>
      )}
    </figure>
  );
}
