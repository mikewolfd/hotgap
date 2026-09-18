// MoneyCurve (#3) geometry for the citizen curve, pure (design/charts.md
// § 1 and § The scroll rule): the whole earnings axis at a fixed scale, the
// y-range of the whole curve honouring the 2.5× rule, ticks on nice values
// in the display unit, where to scroll first, and the layout the draw reads.
// The nice steps, the scale, the clusters and the pixel maps are
// lib/chart/geometry.ts's (audit D10).
//
// Since 2026-09-17 nothing here crops: `Scene.window` is where to scroll,
// not what to draw, so every figure below is the whole curve's. O(points)
// per layout; a layout is computed once per draw (a new evaluation or a
// resize), never per pointer event or per scroll.
import { fromAnnual, toAnnual, type Cliff } from "@hotgap/core";
import { clusterCliffs, layerFor, niceStep, niceTicks, plotHeight, plotWidth, PLOT_LEAD, scaleFor, scrollFor, type Cluster, type Layer, type Pad } from "../lib/chart/geometry.js";
import type { Scene } from "./model.js";

/** The gutter the y axis lives in, outside the scroller: wide enough for "$100k" at the tick size. */
export const GUTTER = { narrow: 44, wide: 52 } as const;

/* The plot's height follows the data under a rule both doors share (§ The scroll rule), so it lives in lib/chart. */

/** The plot's own padding: a lead-in at $0, room at the top for the "you keep" label and at the right for the last tick. */
const PAD: Pad = { t: 26, r: 24, b: 38, l: PLOT_LEAD };
/**
 * The extra foot the road out of poverty needs (charts.md § Direct labels,
 * 6): its bar and the one line of keep rate written on it, below the x-tick
 * labels so nothing that measures pay sits inside the plot.
 */
export const ROAD_FOOT = 26;

/**
 * Axis honesty: the y-range covers the WHOLE curve — no crop chooses which
 * drops the reader is allowed to compare — and is still at least 2.5× the
 * largest drop on it. Floor and ceiling are padded 6%, extended equally to
 * meet the need, then snapped outward to a quarter of the gridline step.
 *
 * The padding was 14% when this was a crop, where the slice's ends were
 * arbitrary and a line running into the edge looked cut off. The whole
 * curve's ends are real points at real pay, so they need breathing room and
 * not a margin; and every dollar of slack here is a dollar of range that
 * makes every drop shorter in pixels (§ The scroll rule's 24px floor).
 */
export function yRange(s: Scene, narrow: boolean): { y0: number; y1: number; stepY: number; maxDrop: number } {
  const maxDrop = Math.max(0, ...s.cliffs.map((c) => c.drop));
  const need = 2.5 * maxDrop;
  const lo = Math.min(...s.net, s.currentNet), hi = Math.max(...s.net, s.currentNet);
  const padY = (hi - lo) * 0.06;
  let y0 = lo - padY, y1 = hi + padY;
  if (y1 - y0 < need) { const ext = (need - (y1 - y0)) / 2; y0 -= ext; y1 += ext; }
  const stepY = niceStep(Math.max(1, y1 - y0), narrow ? 4 : 5);
  // Snapped outward on a quarter of the gridline step: a whole step took a $19,000 floor to $0 (B2), and the floor need not be a tick.
  const snap = stepY / 4;
  return { y0: Math.floor(y0 / snap) * snap, y1: Math.ceil(y1 / snap) * snap, stepY, maxDrop };
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
  yTicks: number[];
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
export function layout(s: Scene, width: number, print = false, screen = 0): Layout {
  const box = Math.max(300, width);
  const narrow = !print && box < 520;
  const gutter = narrow ? GUTTER.narrow : GUTTER.wide;
  const viewport = Math.max(200, box - gutter);
  const { y0, y1, stepY, maxDrop } = yRange(s, narrow);
  const foot = s.road ? ROAD_FOOT : 0;
  const pad: Pad = { ...PAD, b: PAD.b + foot };
  /* The second height floor (charts.md § Height): what is left of the first
     screen, handed in by the page, because only the page knows where the
     figure starts. Paper has no screen and passes none. */
  const H = plotHeight(y1 - y0, maxDrop, print ? 0 : screen - pad.t - pad.b) + pad.t + pad.b;
  /* Paper cannot scroll, so the whole axis is fitted to the column; a screen draws the axis
     at the scale that puts the window in one viewport and scrolls the rest (§ The scroll rule). */
  const scale = print ? (viewport - pad.l - pad.r) / s.top : scaleFor(viewport, s.window, s.top);
  const W = print ? viewport : plotWidth(s.top, pad, scale);
  const layer = layerFor(W, H, pad, 0, s.top, y0, y1);
  return {
    ...layer, narrow, i0: 0, i1: s.net.length - 1, y0, y1, stepY, maxDrop, gutter, viewport, print, scale,
    yTicks: niceTicks(y0, y1, stepY),
    xTicks: xTicks(s, Math.max(2, Math.round((W - pad.l - pad.r) / (print ? 150 : 110)))),
    clusters: clusterCliffs(s.cliffs, layer.px),
    scrollLeft: print ? 0 : scrollFor(layer, viewport, s.window, s.current),
    labelled: s.worst,
  };
}
