// MoneyCurve (#3) geometry the two charts share, pure (design/charts.md
// § 1; audit D10): nice gridline steps, the ticks inside a range, the
// collision rule that merges cliff dots into one mark, the layer that maps
// money to pixels, and the scroll rule: both charts draw the whole axis at
// `PX_PER_1K` and scroll it, so a viewport never crops the curve. Each page
// keeps its own scene → layout — the citizen's x ticks are in the person's
// unit, the caseworker's annual — and its own words. O(cliffs) for the
// clusters, O(1) for the rest; a layout is computed once per draw, never per
// pointer event.
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

/** One mark: the cliffs under it, its x, and whether every named loss under it waits (a hollow dot). */
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
    cl.later = cl.cliffs.every((c) => c.deferral?.complete === true);
  }
  return out;
}

export interface Pad { t: number; r: number; b: number; l: number }

/**
 * The scroll rule (design/charts.md § The scroll rule, 2026-09-17): both
 * charts draw the WHOLE earnings axis inside `.hg-scroll-x`, at one uniform
 * scale, and no viewport ever decides which part of the curve exists.
 *
 * The scale is chosen so the INITIAL VIEW is the window the old crop rule
 * picked, at the legibility it had: one screen of scroller shows the same
 * pay the cropped chart used to show, and everything the crop threw away is
 * a swipe either side of it. That is why the scale is not a constant — a
 * constant either squeezes a $44,000 window into a phone or stretches a
 * $750,000 axis (which the caseworker's live curves reach) to nine thousand
 * pixels, twenty-nine screens of swiping to cross.
 *
 * `MAX_SCREENS` is the guard on the second case: past six screens the axis
 * stops being reachable by hand, so the scale zooms out until it is. The
 * initial view then shows MORE pay than the window, never less — nothing is
 * cropped either way, which is the whole point.
 */
export const MAX_SCREENS = 6;

/** The lead-in inside the scrolled plot, so the point at $0 clears the gutter's edge fade. */
export const PLOT_LEAD = 12;

/** Pixels per dollar of earnings: the window filling one screen, unless that would make the axis longer than `MAX_SCREENS` of them. */
export function scaleFor(viewport: number, window: [number, number], top: number): number {
  const ideal = viewport / Math.max(1, window[1] - window[0]);
  return Math.min(ideal, (MAX_SCREENS * viewport) / Math.max(1, top));
}

/** The scrolled plot's own width: the whole axis at `scale`, plus the lead-in and the room the last x-tick label needs. */
export const plotWidth = (top: number, pad: Pad, scale: number): number => pad.l + pad.r + top * scale;

/**
 * The floor the plot's height is chosen by (design/charts.md § The scroll
 * rule): the curve's biggest drop should stand at least this tall.
 */
export const DROP_FLOOR = 24;
/** What a figure is allowed to be. Past the ceiling it is a scrolling page, not a picture. */
export const PLOT_H = { min: 260, max: 560 } as const;

/**
 * The plot's height from the data, for both charts. It was written when the
 * y-range was the whole curve's, where the biggest drop was 2.7% to 8% of
 * it; since the range is fitted to the stretch that matters (`stableSpan`,
 * `fitY`) the drop is a far larger share and the floor rarely bites. The
 * plot is as tall as the biggest drop needs to clear `DROP_FLOOR`, clamped.
 *
 * The ceiling bites, and `charts.md` records where: four of the eight would
 * need a plot 600–880px tall to reach 24px, which is not a figure any more.
 * They get the ceiling and fall short. That is the price of the owner's rule
 * that the curve is never cropped, and it is paid in the one place that can
 * afford it — the drop's *height*, not its dollars, which the direct label,
 * the readout, the StepList row and the DataTable all carry in text.
 *
 * `avail` is the second floor (2026-09-18): the drawing area still free in
 * the reader's FIRST SCREEN, which the page measures and hands in. The
 * picture is the page now, so a plot that could have been 324px tall fills
 * the screen instead — and the households that were short of the 24px floor
 * gain those pixels too. The ceiling is unchanged, so a figure is never
 * taller than a screen, and the drop floor still wins where it asks for more.
 */
export function plotHeight(yRange: number, maxDrop: number, avail = 0): number {
  const want = maxDrop > 0 ? Math.ceil((DROP_FLOOR * yRange) / maxDrop) : PLOT_H.min;
  return Math.min(PLOT_H.max, Math.max(PLOT_H.min, want, Math.floor(avail)));
}

/**
 * The room the fitted curve leaves above and below itself, as shares of the
 * range: the top holds the leap bracket and the drop labels over the dots,
 * the foot only has to keep the line off the axis.
 */
export const FIT_ROOM = { top: 0.24, foot: 0.1 } as const;

/**
 * THE Y-RANGE IS FITTED TO THE CURVE IN VIEW (TASKS 2026-09-24). The whole
 * curve's range ran ~$15k–$100k for a household whose line, where the
 * reader lands, sits between $40k and $55k: seven tenths of the plot was
 * empty and a $2,384 drop was a few pixels. So the range is the one the
 * VISIBLE points need — `values`, the net of every point inside the
 * viewport's pay, plus the diamond — with room above and below.
 *
 * Axis honesty still holds, and against the WHOLE curve's biggest drop, not
 * the view's: the range is at least 2.5× that drop (S14), so no drop on the
 * curve is ever drawn taller than the rule allows wherever the reader
 * scrolls, and the caption's "N× the largest drop" is true of every view.
 * The extension that meets the rule goes mostly above the line, where the
 * labels are. A curve that stays positive never gets a floor below $0.
 *
 * The pay it is fitted over is `stableSpan`'s, chosen once per draw and
 * never refitted on scroll; past it the line is clipped by the plot.
 */
export function fitY(values: number[], maxDrop: number): [number, number] {
  const lo = Math.min(...values), hi = Math.max(...values);
  const span = Math.max(hi - lo, 2.5 * maxDrop, 0.1 * Math.abs(hi), 1000);
  const extra = span - (hi - lo);
  const y0 = lo - extra * 0.3 - span * FIT_ROOM.foot, y1 = hi + extra * 0.7 + span * FIT_ROOM.top;
  return [lo >= 0 ? Math.max(0, y0) : y0, y1];
}

/**
 * The pay a chart's y-range is fitted over, once per draw: from $0 through
 * the landing window and the household's OWN exit — the end of its own zone
 * or its next cliff, whichever is further — plus a third of the margin. Not
 * the whole curve's safe exit (TASKS, The pictures): that put the SF
 * household's $42k–$47k story on a $15k–$100k axis. Every drop the reader
 * lands on is inside it, so scrolling never rescales the axis (a refit on
 * rest read as the chart jumping); a far zone scrolls in on a clipped line,
 * and the 2.5× rule (`fitY`) still holds against the whole curve's drop.
 */
export function stableSpan(window: [number, number], exit: number | null, top: number): [number, number] {
  return [0, Math.min(top, Math.max(window[1], (exit ?? 0) + WINDOW_MARGIN / 3))];
}

/** The context the initial view carries around what it must show: a third before, two thirds after, where the climb back is. */
export const WINDOW_MARGIN = 30_000;

/**
 * The part of the curve the reader must land on, in annual dollars: the
 * household, its own danger zone and that zone's exit, the next cliff, and
 * the curve's biggest drop when it lies within the margin — plus the margin.
 * Never a fixed fraction of the axis (design/REVIEW-citizen B2: a half-axis
 * view spent the picture on the climb and made a $2,400 step two pixels
 * tall). Snapped to the points.
 *
 * Both doors land the same way, which is why this lives here. It used to be
 * the citizen chart's CROP, and the rest of the curve did not exist; since
 * 2026-09-17 it only chooses where the reader starts.
 */
export function windowFor(s: { current: number; zone: { startEarnings: number } | null; stuck: boolean; exit: number | null; next: { endEarnings: number } | null; worst: { startEarnings: number; endEarnings: number } | null; top: number; step: number }): [number, number] {
  const { current, zone, stuck, exit, next, worst, top, step } = s;
  let lo = Math.min(current, zone?.startEarnings ?? current);
  let hi = Math.max(current, stuck || exit === null ? current : exit, next?.endEarnings ?? current);
  if (worst && worst.endEarnings <= hi + WINDOW_MARGIN && worst.startEarnings >= lo - WINDOW_MARGIN) {
    lo = Math.min(lo, worst.startEarnings);
    hi = Math.max(hi, worst.endEarnings);
  }
  lo -= WINDOW_MARGIN / 3;
  hi += (2 * WINDOW_MARGIN) / 3;
  if (lo < 0) { hi -= lo; lo = 0; }
  if (hi > top) { lo = Math.max(0, lo - (hi - top)); hi = top; }
  return [Math.floor(lo / step) * step, Math.ceil(hi / step) * step];
}

/**
 * Where to scroll so the reader lands on the part of the curve that answers
 * the question — what the crop rule used to choose, as a position instead of
 * a truncation. The window is centred in the viewport; then `current` is
 * pulled inside it by `margin`, because the "you" mark being on screen is
 * the one thing the initial view owes the reader (proof (a)).
 */
export function scrollFor(L: Layer, viewport: number, window: [number, number], current: number, margin = 44): number {
  const max = Math.max(0, L.W - viewport);
  const [a, b] = [L.px(window[0]), L.px(window[1])];
  let left = Math.min(max, Math.max(0, (a + b) / 2 - viewport / 2));
  const cx = L.px(current);
  if (cx - left > viewport - margin) left = cx - viewport + margin;
  if (cx - left < margin) left = cx - margin;
  return Math.round(Math.min(max, Math.max(0, left)));
}

/** The scroll position that brings plot-space `x` inside the viewport with `margin` to spare, or the position unchanged when it already is. */
export function scrollToShow(x: number, left: number, viewport: number, W: number, margin = 44): number {
  const max = Math.max(0, W - viewport);
  const want = x - left < margin ? x - margin : x - left > viewport - margin ? x - viewport + margin : left;
  return Math.round(Math.min(max, Math.max(0, want)));
}

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
