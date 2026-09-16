// MoneyCurve (#3) geometry, pure (design/charts.md § 1): the y-range that
// honours the 2.5× rule, ticks on nice values in the display unit, and the
// cliff clusters. O(points in the window) per layout; a layout is computed
// once per draw (a new evaluation or a resize), never per pointer event.
import { fromAnnual, toAnnual, type Cliff } from "@hotgap/core";
import type { Scene } from "./model.js";

/** range / n snapped to the nearest of 1, 2, 2.5 or 5 × 10^k (N1). */
export function niceStep(range: number, n: number): number {
  const raw = range / n;
  const p = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 2.5, 5, 10].map((m) => m * p).reduce((b, s) => (Math.abs(s - raw) < Math.abs(b - raw) ? s : b));
}

/** The multiples of `step` inside [lo, hi]. */
export function niceTicks(lo: number, hi: number, step: number): number[] {
  const out: number[] = [];
  for (let v = Math.ceil(lo / step - 1e-9) * step; v <= hi + 1e-9; v += step) out.push(+v.toFixed(6));
  return out;
}

/**
 * Axis honesty: the visible y-range is at least 2.5× the largest drop in
 * the window. Floor and ceiling are padded 14%, extended equally to meet
 * the need, then snapped outward to the gridline step.
 */
export function yRange(s: Scene, narrow: boolean): { y0: number; y1: number; stepY: number; maxDrop: number } {
  const [i0, i1] = [s.idx(s.window[0]), s.idx(s.window[1])];
  const slice = s.lifted.slice(i0, i1 + 1);
  const maxDrop = Math.max(0, ...s.inWindow.map((c) => c.drop));
  const need = 2.5 * maxDrop;
  // The real curve (the ghost, and the diamond at the household's own money) is never above the lifted one and must stay in the picture.
  const lo = Math.min(...slice, ...s.net.slice(i0, i1 + 1), s.currentNet), hi = Math.max(...slice, s.currentNet);
  const padY = (hi - lo) * 0.14;
  let y0 = lo - padY, y1 = hi + padY;
  if (y1 - y0 < need) { const ext = (need - (y1 - y0)) / 2; y0 -= ext; y1 += ext; }
  const stepY = niceStep(Math.max(1, y1 - y0), narrow ? 3 : 4);
  return { y0: Math.floor(y0 / stepY) * stepY, y1: Math.ceil(y1 / stepY) * stepY, stepY, maxDrop };
}

/** x ticks generated in the display unit and mapped back to annual for position (M5). */
export function xTicks(s: Scene, n: number): { value: number; annual: number }[] {
  const { unit, hours } = s.pay;
  const d0 = fromAnnual(s.window[0], unit, hours), d1 = fromAnnual(s.window[1], unit, hours);
  return niceTicks(d0, d1, niceStep(d1 - d0, n)).map((value) => ({ value, annual: toAnnual({ amount: value, unit, hoursPerWeek: hours }) }));
}

/** One mark: the cliffs under it, its x, and whether every one of them waits for a renewal (a hollow dot). */
export interface Cluster { cliffs: Cliff[]; x: number; later: boolean }

/** Dots closer than `gap` px merge into one mark, whichever kind they are (S8). Input in window order. */
export function clusterCliffs(cliffs: Cliff[], px: (earnings: number) => number, gap = 10): Cluster[] {
  const out: Cluster[] = [];
  for (const c of cliffs) {
    const last = out[out.length - 1];
    if (last && px(c.startEarnings) - px(last.cliffs[last.cliffs.length - 1].startEarnings) < gap) last.cliffs.push(c);
    else out.push({ cliffs: [c], x: 0, later: false });
  }
  for (const cl of out) {
    cl.x = cl.cliffs.reduce((sum, c) => sum + px(c.startEarnings), 0) / cl.cliffs.length;
    cl.later = cl.cliffs.every((c) => c.deferral !== null);
  }
  return out;
}

export interface Layout {
  W: number; H: number; narrow: boolean;
  pad: { t: number; r: number; b: number; l: number };
  i0: number; i1: number;
  y0: number; y1: number; stepY: number; maxDrop: number;
  px(earnings: number): number;
  py(net: number): number;
  yTicks: number[];
  xTicks: { value: number; annual: number }[];
  clusters: Cluster[];
  /**
   * The chart's one drop label is the curve's biggest drop (charts.md § Direct
   * labels), drawn only when that drop is in the picture; otherwise the
   * caption says where it is.
   */
  labelled: Cliff | null;
  ghost: boolean;
}

/** Everything a draw needs, from the scene and the wrapper's width. */
export function layout(s: Scene, width: number): Layout {
  const W = Math.max(300, width);
  const narrow = W < 520;
  const H = narrow ? 260 : 300;
  const pad = { t: 26, r: narrow ? 22 : 28, b: 38, l: narrow ? 48 : 58 };
  const { y0, y1, stepY, maxDrop } = yRange(s, narrow);
  const [x0, x1] = s.window;
  const px = (e: number) => pad.l + ((e - x0) / (x1 - x0)) * (W - pad.l - pad.r);
  const py = (v: number) => pad.t + ((y1 - v) / (y1 - y0)) * (H - pad.t - pad.b);
  return {
    W, H, narrow, pad, i0: s.idx(x0), i1: s.idx(x1), y0, y1, stepY, maxDrop, px, py,
    yTicks: niceTicks(y0, y1, stepY),
    xTicks: xTicks(s, narrow ? 4 : 5),
    clusters: clusterCliffs(s.inWindow, px),
    labelled: s.worst && s.inWindow.includes(s.worst) ? s.worst : null,
    // The ghost is drawn only when a deferred drop that starts before the
    // window's right edge exceeds 1.5% of the y-range — past the edge the
    // real curve lies on the line; the caption sentence comes from the same
    // test (S14).
    ghost: s.deferred.some((c) => c.startEarnings < x1 && c.drop > 0.015 * (y1 - y0)),
  };
}
