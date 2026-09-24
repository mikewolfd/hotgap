// Direct labels (design/charts.md § Direct labels): the placement engine the
// money curve's labels are drawn through — the priority list is the page's,
// the collision test is here. A label is offered candidate spots in priority
// order; each is tested against the boxes already taken (a mark's ring, the
// household's diamond, every label already placed) and against the box the
// reader is actually looking through; the first clear spot wins, and a label
// with no clear spot is DROPPED rather than drawn overlapping, because its
// money is in the readout, the row and the table. One label may be forced —
// the largest drop's, which is the label the page promises.
//
// O(labels × boxes), with a handful of each; called once per draw.
//
// Since 2026-09-24 both charts draw through this one placer (the citizen's
// inline copy is gone), and it knows two more things: the CURVE is an
// obstacle — "TANF cash assistance ends" was struck through by the line it
// labels — and a label with no clear spot is nudged up, then down, a line at
// a time before it is dropped (a greedy vertical nudge, TASKS 2026-09-24).
import { svg } from "../dom.js";

/** An approximate character width and line height at the 13px label floor: enough to reserve a box before the text exists. */
const CH = 7.4, LH = 13;

/**
 * How many drops may carry their money (design/charts.md § Direct labels).
 * The old rule was one, from a page whose prose carried the answer; the
 * anti-pattern it guarded against — a number on every cliff — starts around
 * four.
 */
export const MAX_DROP_LABELS = 3;

export interface Box { x: number; y: number; w: number; h: number }
/** A candidate position for a label's first line, and how the text sits on it. */
export interface Spot { x: number; y: number; anchor: "start" | "middle" | "end" }

/**
 * The box the reader is looking through, which is not the plot: the initial
 * view when the mark is inside it, the whole plot when the mark is further
 * along the axis, and the plot on paper, where there is nothing to scroll.
 * Clamping to the plot alone put a label half off the left edge of a
 * scrolled phone.
 */
export interface View { print: boolean; scrollLeft: number; viewport: number; W: number }

export interface Placer {
  /** Forget every box: a fresh draw. */
  reset(): void;
  /** Reserve a box nothing may be drawn over — a mark's ring, the diamond. */
  block(box: Box): void;
  /**
   * Reserve a polyline — the curve, a rule a label must not sit on — as one
   * thin box per segment, so a label clears the line itself and not its
   * bounding box. O(points), once per draw.
   */
  blockLine(points: [number, number][]): void;
  /**
   * Draw one label of one or two lines at the first clear spot, or nowhere.
   * `force` falls back to the first spot for the label that must be drawn;
   * `nudge` false skips the vertical nudge, for a label that reads only
   * beside its mark and is better dropped than floated away from it.
   * Returns whether it was drawn.
   */
  place(lines: string[], spots: Spot[], cls: string, force?: boolean, nudge?: boolean): boolean;
}

const overlaps = (a: Box, b: Box): boolean => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

export function placer(picture: SVGSVGElement, view: () => View): Placer {
  const boxes: Box[] = [];

  /** The window a label is nudged inside for a spot at this x. */
  const windowFor = (x: number): [number, number] => {
    const v = view();
    return v.print || x < v.scrollLeft || x > v.scrollLeft + v.viewport
      ? [2, v.W - 2] : [v.scrollLeft + 2, v.scrollLeft + v.viewport - 2];
  };

  /**
   * Draw the lines at a spot and hand back their real ink box. Measured, not
   * estimated: a box computed from a character-width constant is a pixel or
   * two short of the glyphs at the top and the bottom, and a pixel is the
   * difference between a clear label and one sitting on a mark's ring
   * (caseworker review S4). The estimate is still used to nudge the label
   * inside the view before it is measured, because that needs a width before
   * there is anything to measure.
   */
  const draw = (lines: string[], sp: Spot, cls: string): { nodes: SVGTextElement[]; box: Box } => {
    const est = Math.max(...lines.map((line) => line.length)) * CH;
    const left = sp.anchor === "start" ? sp.x : sp.anchor === "middle" ? sp.x - est / 2 : sp.x - est;
    const [lo, hi] = windowFor(sp.x);
    /* Only the edge in the way is a nudge, not a drop: a label near $0 keeps its number. */
    const dx = left < lo ? lo - left : left + est > hi ? hi - (left + est) : 0;
    const nodes = lines.map((text, i) => svg("text", { x: sp.x + dx, y: sp.y + i * LH, "text-anchor": sp.anchor, class: cls }, text));
    for (const n of nodes) picture.append(n);
    let box = { x: left + dx, y: sp.y - LH + 2, w: est, h: LH * lines.length };
    try {
      const b = nodes.map((n) => n.getBBox());
      box = {
        x: Math.min(...b.map((r) => r.x)), y: Math.min(...b.map((r) => r.y)),
        w: Math.max(...b.map((r) => r.x + r.width)) - Math.min(...b.map((r) => r.x)),
        h: Math.max(...b.map((r) => r.y + r.height)) - Math.min(...b.map((r) => r.y)),
      };
    } catch { /* no layout (a detached or hidden figure): the estimate stands */ }
    return { nodes, box };
  };

  return {
    reset() { boxes.length = 0; },
    block(box) { boxes.push(box); },
    blockLine(points) {
      for (let i = 1; i < points.length; i++) {
        const [[ax, ay], [bx, by]] = [points[i - 1], points[i]];
        boxes.push({ x: Math.min(ax, bx) - 1, y: Math.min(ay, by) - 1.5, w: Math.abs(bx - ax) + 2, h: Math.abs(by - ay) + 3 });
      }
    },
    place(lines, spots, cls, force = false, nudge = true) {
      /* A cheap test first, on the estimate shrunk a little so it can only under-claim: a spot whose
         rough box is already taken is skipped without drawing and measuring it, which keeps the nudge's
         extra spots from costing a layout each. */
      const est = Math.max(...lines.map((line) => line.length)) * CH * 0.8;
      const rough = (sp: Spot): Box => {
        const left = sp.anchor === "start" ? sp.x : sp.anchor === "middle" ? sp.x - est / 2 : sp.x - est, [lo, hi] = windowFor(sp.x);
        return { x: Math.min(Math.max(left, lo), hi - est), y: sp.y - LH + 4, w: est, h: LH * lines.length - 4 };
      };
      const tryAt = (sp: Spot): boolean => {
        if (boxes.some((o) => overlaps(rough(sp), o))) return false;
        const at = draw(lines, sp, cls);
        /* Inside the picture top to bottom, too: a nudged label must not leave the SVG and be cut off. */
        const inside = at.box.y >= 0 && at.box.y + at.box.h <= (picture.viewBox.baseVal?.height || Infinity);
        if (inside && !boxes.some((o) => overlaps(at.box, o))) { boxes.push(at.box); return true; }
        for (const n of at.nodes) n.remove();
        return false;
      };
      for (const sp of spots) if (tryAt(sp)) return true;
      /* The greedy nudge: every spot again, a line higher, then a line lower, out to two lines — further and a label no longer reads as its mark's — above
         first, because above the line is where the plot keeps its room. */
      for (const k of nudge ? [-1, 1, -2, 2] : []) {
        for (const sp of spots) if (tryAt({ ...sp, y: sp.y + k * LH })) return true;
      }
      /* Nowhere clear. The label the page promises is drawn at its first spot anyway; every other one is
         dropped, because its money is in the readout, the row and the table, all a key press away. */
      if (!force) return false;
      const at = draw(lines, spots[0], cls);
      boxes.push(at.box);
      return true;
    },
  };
}
