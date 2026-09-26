// MoneyCurve (#3) geometry for the citizen curve, pure (design/charts.md
// § 1 and § The scroll rule): the whole earnings axis at a fixed scale, the
// y-range fitted to the curve in view honouring the 2.5× rule, ticks on nice values
// in the display unit, where to scroll first, and the layout the draw reads.
// The nice steps, the scale, the clusters and the pixel maps are
// lib/chart/geometry.ts's (audit D10).
//
// Since 2026-09-17 nothing here crops: `Scene.window` is where to scroll,
// not what to draw: every point is drawn, and only the y-range is fitted to
// the part of the curve the reader is looking at (2026-09-24). O(points)
// per layout; a layout is computed once per draw (a new evaluation or a
// resize), never per pointer event or per scroll.
import { fromAnnual, toAnnual, type Cliff } from "@hotgap/core";
import { bandTicks, clusterCliffs, drawingFor, fitY, layerFor, niceStep, niceTicks, plotWidth, PLOT_LEAD, scaleFor, scrollFor, stableSpan, type Cluster, type Layer, type Pad } from "../lib/chart/geometry.js";
import type { Scene } from "./model.js";

/** The gutter the y axis lives in, outside the scroller: wide enough for "$100k" at the tick size. */
export const GUTTER = { narrow: 44, wide: 52 } as const;

/* The plot's height follows the data under a rule both doors share (§ The scroll rule), so it lives in lib/chart. */

/** The plot's own padding: a lead-in at $0, room at the top for the "you keep" label and at the right for the last tick. */
const PAD: Pad = { t: 26, r: 24, b: 38, l: PLOT_LEAD };
/**
 * The extra foot the road out of poverty needs (charts.md § Direct labels,
 * 6): its bar and the one line of keep rate written on it, below the x-tick
 * labels so nothing that measures pay sits inside the plot — and a second
 * line for the road's two ends where the first has no room for them.
 */
export const ROAD_FOOT = 40;

/**
 * Axis honesty over a fitted range (lib/chart/geometry.ts `fitY`): the
 * y-range fits the points whose pay lies in [e0, e1] — the viewport's pay,
 * or the whole axis on paper and by default — and is at least 2.5× the
 * largest drop on the WHOLE curve, so no view makes any drop look bigger
 * than the rule allows. Snapped outward to a quarter of the gridline step.
 * `lo`/`hi` are the fitted points' own extremes.
 */
export function yRange(s: Scene, narrow: boolean, e0 = 0, e1 = s.top): { y0: number; y1: number; stepY: number; maxDrop: number; lo: number; hi: number } {
  const maxDrop = Math.max(0, ...s.cliffs.map((c) => c.drop));
  /* The points either side of the view's edges too, so the line where it leaves the viewport is inside the range. */
  const last = s.net.length - 1, at = (e: number) => (e - s.earningsAt(0)) / s.step;
  const i0 = Math.min(last, Math.max(0, Math.floor(at(e0)))), i1 = Math.max(i0, Math.min(last, Math.ceil(at(e1))));
  /* The $0-pay point is a parent with no job charged the household's care bill (evaluate.ts normalizePoint),
     and can sit below $0; it is not part of the pay story the picture tells, so a negative one stays out of
     the fit and is clipped below the floor rather than dragging the axis under zero (blind review R1). */
  const values = s.net.slice(i0, i1 + 1).filter((v, k) => !(i0 + k === 0 && v < 0));
  if (s.current >= e0 && s.current <= e1) values.push(s.currentNet);
  const [lo, hi] = [Math.min(...values), Math.max(...values)];
  const [f0, f1] = fitY(values, maxDrop);
  const stepY = niceStep(Math.max(1, f1 - f0), narrow ? 4 : 5);
  // Snapped outward on a quarter of the gridline step: a whole step took a $19,000 floor to $0 (B2), and the floor need not be a tick.
  const snap = stepY / 4;
  return { y0: Math.floor(f0 / snap) * snap, y1: Math.ceil(f1 / snap) * snap, stepY, maxDrop, lo, hi };
}

/**
 * x ticks generated in the display unit and mapped back to annual for
 * position (M5), over the whole axis. `n` is how many the plot has room for,
 * so a scrolled axis gets a tick about every 110px and paper gets fewer —
 * the type floor holds either way, because the step grows, not the type.
 */
export function xTicks(s: Scene, n: number): { value: number; annual: number }[] {
  const { unit, hours } = s.pay;
  const d0 = fromAnnual(0, unit, hours), d1 = fromAnnual(s.top, unit, hours);
  return niceTicks(d0, d1, niceStep(d1 - d0, n)).map((value) => ({ value, annual: toAnnual({ amount: value, unit, hoursPerWeek: hours }) }));
}

export type { Cluster };

export interface Layout extends Layer {
  narrow: boolean;
  /** The whole curve: every point is drawn, so these are the point list's ends. */
  i0: number; i1: number;
  y0: number; y1: number; stepY: number; maxDrop: number;
  /** The extremes of the points in view, which the y-range was fitted to. */
  lo: number; hi: number;
  yTicks: number[];
  /** Nice values inside the compressed band (lib/chart/geometry.ts § The break), drawn from the band's own scale; empty with no band. */
  bandTicks: number[];
  xTicks: { value: number; annual: number }[];
  clusters: Cluster[];
  /** The y-axis gutter's width, outside the scroller. */
  gutter: number;
  /** How much of the plot is on screen, where the scroller starts, and the pixels a dollar of pay gets (§ The scroll rule). */
  viewport: number;
  scrollLeft: number;
  scale: number;
  /** True when the whole axis is being fitted to a page instead of scrolled. */
  print: boolean;
  /**
   * The first drop label is always the curve's biggest (charts.md § Direct
   * labels): it is the label the page promises, and since the curve is never
   * cropped it is never outside the picture. The rest of the clusters follow
   * it in axis order and are labelled while there is room, up to `MAX_DROP_LABELS`.
   */
  labelled: Cliff | null;
}

/**
 * How many drops may carry their money (charts.md § Direct labels). The old
 * rule was one, from a page whose prose carried the answer; the anti-pattern
 * it guarded against — a number on every cliff — starts around four.
 */
export const MAX_DROP_LABELS = 3;

/**
 * Everything a draw needs, from the scene and the box the figure has. `width`
 * is the whole figure's — the gutter comes off it, and what is left is the
 * viewport the axis scrolls through (or, on paper, the plot's whole width).
 */
export function layout(s: Scene, width: number, print = false, screen = 0, at: number | null = null): Layout {
  const box = Math.max(300, width);
  const narrow = !print && box < 520;
  const gutter = narrow ? GUTTER.narrow : GUTTER.wide;
  const viewport = Math.max(200, box - gutter);
  const foot = s.road ? ROAD_FOOT : 0;
  const pad: Pad = { ...PAD, b: PAD.b + foot };
  /* Paper cannot scroll, so the whole axis is fitted to the column; a screen draws the axis
     at the scale that puts the window in one viewport and scrolls the rest (§ The scroll rule). */
  const scale = print ? (viewport - pad.l - pad.r) / s.top : scaleFor(viewport, s.window, s.top);
  const W = print ? viewport : plotWidth(s.top, pad, scale);
  /* x does not depend on y, so where the reader looks is known before the y-range is: the landing
     position, or `at` — the pay the reader left at the scroller's left edge. */
  const xOnly = layerFor(W, 1, pad, 0, s.top, 0, 1);
  const landing = print ? 0 : scrollFor(xOnly, viewport, s.window, s.current);
  const scrollLeft = print ? 0 : at === null ? landing : Math.round(Math.max(0, Math.min(W - viewport, xOnly.px(at))));
  /* One y-range for the whole draw, never refitted on scroll (a rescale mid-read was jarring): the
     household's own stretch, from $0 through its own exit and next cliff — not the whole curve's safe
     exit, which put a $42k–$47k story on a $15k–$100k axis (lib/chart/geometry.ts `stableSpan`).
     Paper fits the whole axis. On screen, where the line climbs past the fitted top, a compressed band on top
     of the plot carries the rest of it, so the curve is never cropped (lib/chart/geometry.ts § The break). */
  const [e0, e1] = print ? [0, s.top] : stableSpan(s.window, Math.max(s.exit ?? 0, s.next?.endEarnings ?? 0) || null, s.top);
  const { y0, y1, stepY, maxDrop, lo, hi } = yRange(s, narrow, e0, e1);
  const { drawing, band } = drawingFor(y0, y1, print ? y1 : Math.max(...s.net), maxDrop, narrow, print ? 0 : screen - pad.t - pad.b);
  const H = drawing + pad.t + pad.b;
  const layer = layerFor(W, H, pad, 0, s.top, y0, y1, band);
  return {
    ...layer, narrow, i0: 0, i1: s.net.length - 1, y0, y1, stepY, maxDrop, lo, hi, gutter, viewport, print, scale,
    yTicks: niceTicks(y0, y1, stepY),
    bandTicks: bandTicks(layer),
    xTicks: xTicks(s, Math.max(2, Math.round((W - pad.l - pad.r) / (print ? 150 : 110)))),
    clusters: clusterCliffs(s.cliffs, layer.px),
    scrollLeft,
    labelled: s.worst,
  };
}

