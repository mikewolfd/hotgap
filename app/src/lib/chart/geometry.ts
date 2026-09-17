// MoneyCurve (#3) geometry the two charts share, pure (design/charts.md
// § 1; audit D10): nice gridline steps, the ticks inside a range, the
// collision rule that merges cliff dots into one mark, and the layer that
// maps money to pixels. Each page keeps its own scene → layout — the
// citizen crops a window in the person's unit, the caseworker draws the
// full annual axis — and its own words. O(cliffs) for the clusters, O(1)
// for the rest; a layout is computed once per draw, never per pointer event.
import type { Cliff } from "@hotgap/core";

const NICE = [1, 2, 2.5, 5, 10];

/** range / n snapped to the nearest of 1, 2, 2.5 or 5 × 10^k (N1). */
export function niceStep(range: number, n: number): number {
  const raw = range / n;
  const p = 10 ** Math.floor(Math.log10(raw));
  return NICE.map((m) => m * p).reduce((b, s) => (Math.abs(s - raw) < Math.abs(b - raw) ? s : b));
}

/** The next nice value above `step`: the gridline step, stepped up while it would draw too many lines. */
export function niceUp(step: number): number {
  const p = 10 ** Math.floor(Math.log10(step) + 1e-9), m = step / p;
  return (NICE.find((v) => v > m + 1e-9) ?? 10) * p;
}

/** The multiples of `step` inside [lo, hi]. */
export function niceTicks(lo: number, hi: number, step: number): number[] {
  const out: number[] = [];
  for (let v = Math.ceil(lo / step - 1e-9) * step; v <= hi + 1e-9; v += step) out.push(+v.toFixed(6));
  return out;
}

/** One mark: the cliffs under it, its x, and whether every one of them waits for a renewal (a hollow dot). */
export interface Cluster { cliffs: Cliff[]; x: number; later: boolean }

/**
 * Dots closer than `gap` px merge into one mark, whichever kind they are
 * (S8; citizen review B1: a mixed cluster keeps the waits channel). Input in
 * axis order; the x is the members' mean.
 */
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

export interface Pad { t: number; r: number; b: number; l: number }

/** The drawing layer: the box, its padding, and money → pixels. */
export interface Layer {
  W: number; H: number; pad: Pad;
  px(earnings: number): number;
  py(net: number): number;
}

/** The linear maps of an x-range and a y-range onto the box inside its padding. */
export function layerFor(W: number, H: number, pad: Pad, x0: number, x1: number, y0: number, y1: number): Layer {
  return {
    W, H, pad,
    px: (e) => pad.l + ((e - x0) / (x1 - x0)) * (W - pad.l - pad.r),
    py: (v) => pad.t + ((y1 - v) / (y1 - y0)) * (H - pad.t - pad.b),
  };
}

/** The point index nearest a client x on a layer's plot, clamped to [lo, hi]; `boxWidth` is the SVG's rendered width, which may differ from W. */
export function indexAtX(L: Layer, clientX: number, boxLeft: number, boxWidth: number, lo: number, hi: number): number {
  const f = ((clientX - boxLeft) / boxWidth) * L.W;
  return Math.min(hi, Math.max(lo, Math.round(lo + ((f - L.pad.l) / (L.W - L.pad.l - L.pad.r)) * (hi - lo))));
}
