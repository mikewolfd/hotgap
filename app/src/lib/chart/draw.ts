// MoneyCurve (#3), CurveReadout (#4) and MarkKey (#5) primitives the two
// charts share, as DOM (design/charts.md § 1 Marks; audit D10): the hatch,
// the key entries that draw the actual mark, the series, the
// cliff marks in their two kinds, the household's diamond, the cursor, the
// 44px .hg-mark control, the width watcher and the print redraw. Each page
// composes these with its own layout, its own radii where the reviews set
// them apart, and its own words; nothing here reads copy.
import { h, svg } from "../dom.js";
import { indexAtX, type Layer } from "./geometry.js";

/** The one 45° hatch every zone takes, as <defs>, under the id the page's fills name. */
export function hatchDefs(id: string): SVGDefsElement {
  const defs = svg("defs");
  const pat = svg("pattern", { id, width: 7, height: 7, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" });
  pat.append(svg("line", { x1: 0, y1: 0, x2: 0, y2: 7, stroke: "var(--loss-hatch)", "stroke-width": 1.25 }));
  defs.append(pat);
  return defs;
}

/**
 * The plot's clip, and a group drawn through it. The y-range is fitted to the
 * curve in view (geometry.ts `fitY`), so elsewhere on the axis the line and
 * its marks can run past it; they are cut at the plot's top and bottom
 * rather than drawn over the ticks and the road. A few pixels spare at the
 * top so a dot sitting on the edge keeps its ring. Returns the defs to
 * append and the group the line and the marks go in.
 */
export function plotClip(id: string, W: number, top: number, bottom: number): { defs: SVGDefsElement; g: SVGGElement } {
  const defs = svg("defs"), clip = svg("clipPath", { id });
  clip.append(svg("rect", { x: 0, y: top - 8, width: W, height: bottom - top + 8 }));
  defs.append(clip);
  return { defs, g: svg("g", { "clip-path": `url(#${id})` }) };
}

/** MarkKey (#5): each entry draws the actual mark, 22×12, never a swatch alone. */
export const KEY_MARK = {
  line: `<line x1="1" y1="6" x2="21" y2="6" stroke="var(--series-1)" stroke-width="2.5" stroke-linecap="round"/>`,
  band: `<rect x="1" y="1" width="20" height="10" fill="var(--loss-wash)" stroke="var(--loss-3)" stroke-width="1"/><path d="M1 11 L11 1 M11 11 L21 1" stroke="var(--loss-hatch)" stroke-width="1.5"/>`,
  other: `<path d="M1 11 L11 1 M11 11 L21 1" stroke="var(--loss-hatch)" stroke-width="1.5"/>`,
  drop: `<line x1="11" y1="1" x2="11" y2="11" stroke="var(--loss-4)" stroke-width="2.5"/><circle cx="11" cy="2.5" r="2.5" fill="var(--loss-4)"/>`,
  later: `<line x1="11" y1="1" x2="11" y2="11" stroke="var(--ink-3)" stroke-width="2" stroke-dasharray="3 2.5"/><circle cx="11" cy="2.5" r="2.5" fill="var(--surface)" stroke="var(--ink-3)" stroke-width="1.5"/>`,
  you: `<path d="M11 1.5 L15.5 6 L11 10.5 L6.5 6 Z" fill="var(--ink)" stroke="var(--surface)" stroke-width="1.5"/>`,
  leap: `<path d="M3 2 V10 M3 6 H19 M19 2 V10" fill="none" stroke="var(--loss-3)" stroke-width="1"/>`,
  safe: `<line x1="11" y1="0" x2="11" y2="12" stroke="var(--loss-3)" stroke-width="1"/>`,
  /* The road out of poverty: a measured span under the axis, in the hairline ink, never a loss. */
  road: `<path d="M3 3 V9 M3 6 H19 M19 3 V9" fill="none" stroke="var(--rule-strong)" stroke-width="1"/>`,
  /* EligibilityBoundary (#23): the axis tick, and nothing that looks like a loss. */
  boundary: `<line x1="1" y1="11" x2="21" y2="11" stroke="var(--axis)" stroke-width="1"/><line x1="11" y1="3" x2="11" y2="11" stroke="var(--ink-3)" stroke-width="2"/>`,
} as const;

/** One key entry: the mark, then its words. A hidden entry keeps its place for a mark not on this chart. */
export function keyEntry(label: string, mark: string, hidden = false): HTMLLIElement {
  const li = h("li", { hidden }, label);
  const pic = svg("svg", { viewBox: "0 0 22 12", "aria-hidden": "true" });
  pic.innerHTML = mark;   /* a static snippet, never data */
  li.prepend(pic);
  return li;
}

/** "M x y L x y …" through the points, in order. */
export const pathD = (points: [number, number][]): string => points.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join("");

/** The series: 2px, round join and cap, pathLength 1 so .hg-draw can draw it once (the first draw only). */
export const seriesPath = (d: string, animate: boolean): SVGPathElement =>
  svg("path", { d, fill: "none", stroke: "var(--series-1)", "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round", pathLength: 1, class: animate ? "hg-draw" : undefined });

/**
 * A what-if's curve on the base household's picture (design/charts.md
 * § A what-if is a second line, 2026-09-18): the same geometry, a quieter
 * 1.5px stroke in the series-2 ink the CompareTable already rules its what-if
 * columns with, and a dash of its own. Three dashes, so three lines are told
 * apart by pattern and by their tag, never by colour alone — and greyscale,
 * a photocopier and a colour-blind reader all keep the distinction.
 */
export const WHAT_IF_DASH = ["7 4", "2 3", "10 4 2 4"] as const;
export const whatIfPath = (d: string, i: number): SVGPathElement =>
  svg("path", { d, fill: "none", stroke: "var(--series-2)", "stroke-width": 1.5, "stroke-linejoin": "round", "stroke-linecap": "round",
    "stroke-dasharray": WHAT_IF_DASH[i % WHAT_IF_DASH.length], "data-whatif": i });

/**
 * A what-if that is the SAME curve at a different pay — a raise, and nothing
 * else changed — is not a second line: its line would lie exactly under the
 * base's and say nothing, while claiming there are two curves. It is a second
 * POSITION on the one curve, drawn the way position is drawn everywhere in
 * this system: a diamond. Hollow and in the what-if ink, so it is never
 * mistaken for the household's own filled one.
 */
export const whatIfDot = (x: number, y: number, i: number): SVGPathElement =>
  svg("path", { d: `M${x} ${y - 5} L${x + 5} ${y} L${x} ${y + 5} L${x - 5} ${y} Z`, fill: "var(--surface)", stroke: "var(--series-2)", "stroke-width": 2, "data-whatif": i, "data-kind": "position" });

/** MarkKey entry for a what-if, drawn as the mark it actually is: its own dash, or the hollow diamond. */
export const whatIfKeyMark = (i: number, position = false): string =>
  position
    ? `<path d="M11 1.5 L15.5 6 L11 10.5 L6.5 6 Z" fill="var(--surface)" stroke="var(--series-2)" stroke-width="1.5"/>`
    : `<line x1="1" y1="6" x2="21" y2="6" stroke="var(--series-2)" stroke-width="1.5" stroke-dasharray="${WHAT_IF_DASH[i % WHAT_IF_DASH.length]}"/>`;

/** A zone: the household's takes the wash and the hatch, any other the hatch alone (S7). */
export function zoneRects(x0: number, x1: number, top: number, bottom: number, own: boolean, hatchId: string): SVGRectElement[] {
  const rect = (fill: string) => svg("rect", { x: x0, y: top, width: x1 - x0, height: bottom - top, fill });
  return own ? [rect("var(--loss-wash)"), rect(`url(#${hatchId})`)] : [rect(`url(#${hatchId})`)];
}

/** An immediate cliff: the solid --loss-4 dot with its surface ring and the connector down to where the line lands. */
export function dropMark(x: number, y: number, landY: number, r: number): SVGElement[] {
  return [
    svg("line", { x1: x, y1: y, x2: x, y2: landY, stroke: "var(--loss-4)", "stroke-width": 2.5, "stroke-linecap": "round" }),
    svg("circle", { cx: x, cy: y, r, fill: "var(--loss-4)", stroke: "var(--surface)", "stroke-width": 2 }),
  ];
}

/** A deferred cliff's own channel: the dashed stub above the dot (`stub` px tall); the hollow dot is `waitDot`. */
export const waitStub = (x: number, y: number, stub: number): SVGLineElement =>
  svg("line", { x1: x, y1: y - stub, x2: x, y2: y - 2, stroke: "var(--ink-3)", "stroke-width": 2, "stroke-dasharray": "4 3" });
export const waitDot = (x: number, y: number, r: number): SVGCircleElement =>
  svg("circle", { cx: x, cy: y, r, fill: "var(--surface)", stroke: "var(--ink-3)", "stroke-width": 2 });

/** The household: a diamond in --ink with a surface ring, on its own drop line to the axis — a shape, so position survives greyscale. */
export function household(x: number, y: number, bottom: number): SVGElement[] {
  return [
    svg("line", { x1: x, y1: y, x2: x, y2: bottom, stroke: "var(--ink-3)", "stroke-width": 1 }),
    svg("path", { d: `M${x} ${y - 6} L${x + 6} ${y} L${x} ${y + 6} L${x - 6} ${y} Z`, fill: "var(--ink)", stroke: "var(--surface)", "stroke-width": 2 }),
  ];
}

/** The cursor: a faint rule through the plot and a dot on the line. */
export function cursorNodes(x: number, y: number, top: number, bottom: number, r: number): [SVGLineElement, SVGCircleElement] {
  return [
    svg("line", { x1: x, y1: top, x2: x, y2: bottom, stroke: "var(--ink-3)", "stroke-width": 1, "stroke-opacity": 0.55 }),
    svg("circle", { cx: x, cy: y, r, fill: "var(--series-1)", stroke: "var(--surface)", "stroke-width": 2 }),
  ];
}

/** The mark's hit square (WCAG 2.5.5), before a neighbour takes some of it back. */
export const MARK_HIT = 44;

/**
 * How wide each mark's hit area may be, given where the marks are.
 *
 * A 44px button centred on every dot is 44px of intention and less than that
 * of hit area: where two cliffs are 24px apart the two buttons overlap by 20,
 * the topmost takes both taps, and the lower one measured 0×0 on the
 * caseworker's $51,000 cliff — a control a thumb could not reach at all
 * (REVIEW-touch B2). So the marks TILE the axis instead of stacking on it:
 * each takes 44px, or the whole gap to its nearest neighbour when that is
 * less, so two bands touch and never lie on top of one another. Where the
 * There is NO floor under the gap, and that is the decision rather than an
 * omission: a floor of 24px (WCAG 2.5.8's own) put two bands back on top of
 * one another by 3px on the caseworker's $51,000 and $53,000 cliffs, which is
 * the defect this function exists to remove. Where the axis gives a mark less
 * than 44px it gets what there is — a cliff's position IS the datum, so the
 * dots cannot be moved apart to make room (2.5.5 Essential), and every tap
 * still lands on the nearest one. `app/e2e/touch.spec.ts` allows a short mark
 * only when its width is exactly the room between it and its neighbour, so a
 * mark cannot be short for any other reason without the proof saying so.
 *
 * O(n) on a sorted list of positions, which `clusters` already is.
 */
export function markWidths(xs: number[]): number[] {
  return xs.map((x, i) => {
    const gap = Math.min(i > 0 ? x - xs[i - 1] : Infinity, i < xs.length - 1 ? xs[i + 1] - x : Infinity);
    return Math.min(MARK_HIT, gap);
  });
}

/** A cliff mark as a control (M6): a 44px .hg-mark button centred on the dot by percent of the box, narrowed to its band where its neighbour is nearer than 44px, with its count when merged (S8). */
export function markButton(x: number, y: number, L: Pick<Layer, "W" | "H" | "pad">, label: string, count: number, later: boolean, attrs: Record<string, string> = {}, width = MARK_HIT): HTMLButtonElement {
  const b = h("button", { type: "button", class: "hg-mark", tabindex: "-1", "aria-label": label, ...attrs });
  b.style.left = `${(x / L.W) * 100}%`;
  /* Held inside the plot: a mark whose dot is past the fitted y-range (somewhere the reader is not
     looking) must not hang out of the box and give the scroller a vertical overflow. It stays a
     control, so ] and [ still reach it. */
  b.style.top = `${(Math.min(L.H - L.pad.b, Math.max(L.pad.t, y)) / L.H) * 100}%`;
  /* The height is always the full square: marks are laid along the x axis, so
     only x can collide. Both are set here rather than in the class, which
     keeps the .hg-mark rule to what is true of every mark. */
  b.style.width = `${width}px`;
  b.style.marginLeft = `${-width / 2}px`;
  if (count > 1) b.append(h("span", { class: later ? "hg-mark__count hg-mark__count--later" : "hg-mark__count", "aria-hidden": "true" }, String(count)));
  return b;
}

/**
 * The chart as one figure in two parts (design/charts.md § The scroll rule):
 * a fixed gutter holding the y axis, and `.hg-scroll-x` holding the whole
 * earnings axis. The gutter is outside the scroller so the money labels stay
 * put while the curve moves — a y label that scrolls away leaves the reader
 * with a line and no idea what it is worth. Both SVGs are sized in real
 * pixels, never stretched to their box, because the scale IS the geometry.
 *
 * `.hg-marks` lives inside the scroller, over the plot, so a mark's percent
 * position is a position on the axis and scrolls with its dot.
 */
export interface Scroller {
  /** The whole figure: gutter beside scroller. Carries the chart's role and tab stop. */
  wrap: HTMLElement;
  gutter: SVGSVGElement;
  /** The scrolling box; `scrollLeft` is where the reader is looking. */
  scroll: HTMLElement;
  plot: SVGSVGElement;
  marks: HTMLElement;
}

export function scrollerParts(gutter: SVGSVGElement, plot: SVGSVGElement, marks: HTMLElement): Omit<Scroller, "wrap"> {
  /* tabindex -1 and no role: the scroller must not be a second tab stop in front of the chart's own (M6). */
  /* --bar: a picture that scrolls shows its scrollbar on a touch device, because it has nowhere to put the words a table uses (tokens.css). */
  const scroll = h("div", { class: "hg-scroll-x hg-scroll-x--bar hg-chart__scroll" }, plot, marks);
  return { gutter, scroll, plot, marks };
}

/** Size one of the figure's two SVGs in real pixels: a viewBox AND width/height, so nothing is scaled and the two halves share a baseline. */
export function sizeSvg(el: SVGSVGElement, w: number, h: number): void {
  el.setAttribute("viewBox", `0 0 ${w} ${h}`);
  el.setAttribute("width", String(w));
  el.setAttribute("height", String(h));
}

/**
 * The y axis in its gutter: the tick labels at the same `py` the plot's
 * gridlines use, right-aligned against the plot's left edge. Money is
 * formatted by the page, so nothing here reads copy.
 */
export function axisGutter(el: SVGSVGElement, width: number, H: number, ticks: number[], py: (v: number) => number, text: (v: number) => string): void {
  sizeSvg(el, width, H);
  el.textContent = "";
  for (const v of ticks) el.append(svg("text", { x: width - 8, y: py(v) + 4, "text-anchor": "end", class: "hg-tick" }, text(v)));
}

/**
 * The break (design/charts.md § The break), marked twice, because the gutter
 * and the plot are two SVGs and a reader scrolled far right sees only the
 * second: in the gutter, two short slanted strokes at the plot's edge where
 * the scale changes (`.hg-break`); across the plot, a dashed hairline at the
 * same height (`.hg-break-line`). Nothing when the layer has no band. The
 * band's own ticks go in the gutter and the gridlines like any other tick.
 */
export function breakMarks(gutter: SVGSVGElement, gutterWidth: number, plot: SVGSVGElement, L: Layer): void {
  if (!L.band) return;
  const y = L.py(L.band.y1), x = gutterWidth - 2;
  gutter.append(svg("path", { d: `M${x - 9} ${y + 3.5} L${x - 3} ${y - 3.5} M${x - 5} ${y + 3.5} L${x + 1} ${y - 3.5}`, fill: "none", stroke: "var(--ink-3)", "stroke-width": 1.5, "stroke-linecap": "round", class: "hg-break" }));
  plot.append(svg("line", { x1: 0, y1: y, x2: L.W, y2: y, stroke: "var(--rule)", "stroke-width": 1, "stroke-dasharray": "5 4", class: "hg-break-line" }));
}

/**
 * A redraw when the wrapper's width changes (a resize, or the column changing
 * under it — the caseworker's grid moves when a comparison widens), never on
 * a height change alone, and never while the page is laid out for paper:
 * the print layout changes the column too, and the width drawn on paper is
 * redrawForPrint's, not the column's (caseworker review N6).
 */
export function watchWidth(el: HTMLElement, draw: () => void): () => void {
  let last = 0;
  const ro = new ResizeObserver(() => {
    const w = el.clientWidth;
    if (w > 0 && w !== last && !matchMedia("print").matches) { last = w; draw(); }
  });
  ro.observe(el);
  return () => ro.disconnect();
}

/**
 * Paper is one width, whatever the screen was: redraw at `width` before
 * printing and back after (citizen review S2, caseworker N6). Paper also
 * cannot scroll, so the print draw is told so and fits the whole axis into
 * the page's column instead (charts.md § The scroll rule).
 */
export function redrawForPrint(draw: (width?: number, print?: boolean) => void, width: number): () => void {
  const before = () => draw(width, true), after = () => draw(undefined, false);
  addEventListener("beforeprint", before);
  addEventListener("afterprint", after);
  return () => { removeEventListener("beforeprint", before); removeEventListener("afterprint", after); };
}

/** The keyboard and pointer model on the chart's wrapper (charts.md § Cliff marks as controls): ←/→ a point, shift more, Home/End the ends, ] and [ to a mark, Escape closes. */
export interface CursorModel {
  /** The index range the cursor moves in, and where it is. */
  range(): [number, number];
  cursor(): number;
  /**
   * Move the cursor and repaint. `by` says what moved it: a key may scroll
   * the caret into view, a pointer must not — the pointer is already on the
   * pixel it named, and scrolling under it would chase the finger.
   */
  set(i: number, by: "pointer" | "key"): void;
  /** How far shift+arrow moves. */
  shift: number;
  /** "hover": the pointer moves the cursor as it passes; "drag": only pressed, and never from a mark. */
  pointer: "hover" | "drag";
  /** ] or [ pressed with `target` in focus: the page's own rule for which mark comes next. */
  bracket(key: "]" | "[", target: HTMLElement): void;
  escape(): void;
  /** The layer the pointer maps through, once one is drawn. */
  layer(): Layer | null;
  svg: SVGSVGElement;
  /** The box the plot scrolls in, so a finger held still over a travelling curve keeps reading (§ A finger on the curve). */
  scroller?(): HTMLElement;
}

/**
 * A FINGER ON THE CURVE (design/charts.md § A finger on the curve).
 *
 * A horizontal drag on a scrolling plot is two gestures wearing one coat: a
 * scrub ("what does this pay come to?") and a swipe ("show me further along").
 * They cannot both win, and the browser decides — once a pan is recognised it
 * sends `pointercancel` and no listener here hears the finger again. This pass
 * lets the pan win, because the plot is three to six screens wide and a
 * gesture that cannot reach the rest of the axis would make the scroll rule of
 * 2026-09-17 unreachable by the one input most readers have.
 *
 * The readout is not lost to that choice: it reads the pay under the finger
 * on touchdown, follows the finger for as long as the browser has not claimed
 * the gesture, and then — while the finger is still down — re-reads on every
 * scroll of the plot, because the pay under a still thumb changes when the
 * curve travels beneath it. So "move along the line for any pay" holds on a
 * phone with the line doing the moving, and no pixel of the axis is walled
 * off. A mouse is unchanged: it never pans, so hover and drag scrub as before.
 */
export function attachCursor(wrapper: HTMLElement, m: CursorModel): void {
  const move = (clientX: number): void => {
    const L = m.layer();
    if (!L) return;
    const r = m.svg.getBoundingClientRect(), [lo, hi] = m.range();
    m.set(indexAtX(L, clientX, r.left, r.width, lo, hi), "pointer");
  };
  const onMark = (e: Event) => !!(e.target as HTMLElement).closest(".hg-mark");
  /** Where the finger is, while it is down; null for every other pointer. */
  let fingerX: number | null = null;
  wrapper.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "touch") fingerX = e.clientX;
    if (m.pointer === "hover" || !onMark(e)) move(e.clientX);
  });
  wrapper.addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch") {
      /* A finger that has not been claimed by the pan yet: it is scrubbing. */
      if (fingerX !== null && !onMark(e)) { fingerX = e.clientX; move(e.clientX); }
      return;
    }
    if (m.pointer === "hover" || (e.buttons && !onMark(e))) move(e.clientX);
  });
  /* Only a real lift clears it. `pointercancel` is what the PAN sends, and it
     means the browser took the gesture, not that the thumb left the glass —
     clearing on it would end the readout at the moment the swipe begins,
     which is the moment the pay under the thumb starts to change. */
  const lift = (): void => { fingerX = null; };
  wrapper.addEventListener("pointerup", lift);
  wrapper.addEventListener("touchend", lift);
  wrapper.addEventListener("touchcancel", lift);
  m.scroller?.().addEventListener("scroll", () => { if (fingerX !== null) move(fingerX); }, { passive: true });
  wrapper.addEventListener("keydown", (e) => {
    if (!m.layer()) return;
    const [lo, hi] = m.range(), step = e.shiftKey ? m.shift : 1, at = m.cursor();
    if (e.key === "ArrowRight") m.set(Math.min(hi, at + step), "key");
    else if (e.key === "ArrowLeft") m.set(Math.max(lo, at - step), "key");
    else if (e.key === "Home") m.set(lo, "key");
    else if (e.key === "End") m.set(hi, "key");
    else if (e.key === "]" || e.key === "[") m.bracket(e.key, e.target as HTMLElement);
    else if (e.key === "Escape") m.escape();
    else return;
    e.preventDefault();
  });
}
