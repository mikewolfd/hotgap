// MoneyCurve (#3) geometry for the citizen crop, pure (design/charts.md
// § 1): the y-range that honours the 2.5× rule, ticks on nice values in the
// display unit, and the layout the draw reads. The nice steps, the
// clusters and the pixel maps are lib/chart/geometry.ts's (audit D10).
// O(points in the window) per layout; a layout is computed once per draw
// (a new evaluation or a resize), never per pointer event.
import { fromAnnual, toAnnual, type Cliff } from "@hotgap/core";
import { clusterCliffs, layerFor, niceStep, niceTicks, type Cluster, type Layer } from "../lib/chart/geometry.js";
import type { Scene } from "./model.js";

/**
 * Axis honesty: the visible y-range is at least 2.5× the largest drop in
 * the window. Floor and ceiling are padded 14%, extended equally to meet
 * the need, then snapped outward to the gridline step.
 */
export function yRange(s: Scene, narrow: boolean): { y0: number; y1: number; stepY: number; maxDrop: number } {
  const [i0, i1] = [s.idx(s.window[0]), s.idx(s.window[1])];
  const slice = s.net.slice(i0, i1 + 1);
  const maxDrop = Math.max(0, ...s.inWindow.map((c) => c.drop));
  const need = 2.5 * maxDrop;
  const lo = Math.min(...slice, s.currentNet), hi = Math.max(...slice, s.currentNet);
  const padY = (hi - lo) * 0.14;
  let y0 = lo - padY, y1 = hi + padY;
  if (y1 - y0 < need) { const ext = (need - (y1 - y0)) / 2; y0 -= ext; y1 += ext; }
  const stepY = niceStep(Math.max(1, y1 - y0), narrow ? 3 : 4);
  // Snapped outward on a quarter of the gridline step: a whole step took a $19,000 floor to $0 (B2), and the floor need not be a tick.
  const snap = stepY / 4;
  return { y0: Math.floor(y0 / snap) * snap, y1: Math.ceil(y1 / snap) * snap, stepY, maxDrop };
}

/** x ticks generated in the display unit and mapped back to annual for position (M5). */
export function xTicks(s: Scene, n: number): { value: number; annual: number }[] {
  const { unit, hours } = s.pay;
  const d0 = fromAnnual(s.window[0], unit, hours), d1 = fromAnnual(s.window[1], unit, hours);
  return niceTicks(d0, d1, niceStep(d1 - d0, n)).map((value) => ({ value, annual: toAnnual({ amount: value, unit, hoursPerWeek: hours }) }));
}

export type { Cluster };

export interface Layout extends Layer {
  narrow: boolean;
  i0: number; i1: number;
  y0: number; y1: number; stepY: number; maxDrop: number;
  yTicks: number[];
  xTicks: { value: number; annual: number }[];
  clusters: Cluster[];
  /**
   * The chart's one drop label is the curve's biggest drop (charts.md § Direct
   * labels), drawn only when that drop is in the picture; otherwise the
   * caption says where it is.
   */
  labelled: Cliff | null;
}

/** Everything a draw needs, from the scene and the wrapper's width. */
export function layout(s: Scene, width: number): Layout {
  const W = Math.max(300, width);
  const narrow = W < 520;
  const H = narrow ? 260 : 300;
  const pad = { t: 26, r: narrow ? 22 : 28, b: 38, l: narrow ? 48 : 58 };
  const { y0, y1, stepY, maxDrop } = yRange(s, narrow);
  const [x0, x1] = s.window;
  const layer = layerFor(W, H, pad, x0, x1, y0, y1);
  return {
    ...layer, narrow, i0: s.idx(x0), i1: s.idx(x1), y0, y1, stepY, maxDrop,
    yTicks: niceTicks(y0, y1, stepY),
    xTicks: xTicks(s, narrow ? 4 : 5),
    clusters: clusterCliffs(s.inWindow, layer.px),
    labelled: s.worst && s.inWindow.includes(s.worst) ? s.worst : null,
  };
}
