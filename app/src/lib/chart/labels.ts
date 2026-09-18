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
// TODO(system): src/citizen/chart.ts holds this same placer inline — it was
// written there first and left untouched by the caseworker pass so its
// freshly reviewed proofs stayed a control on this change. The citizen chart
// should import this module next time it is opened; the two must not drift.
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
   * Draw one label of one or two lines at the first clear spot, or nowhere.
   * `force` falls back to the first spot for the label that must be drawn.
   * Returns whether it was drawn.
   */
  place(lines: string[], spots: Spot[], cls: string, force?: boolean): boolean;
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
    place(lines, spots, cls, force = false) {
      let last: { nodes: SVGTextElement[]; box: Box } | null = null;
      for (const sp of spots) {
        last = draw(lines, sp, cls);
        if (!boxes.some((o) => overlaps(last!.box, o))) { boxes.push(last.box); return true; }
        for (const n of last.nodes) n.remove();
        last = null;
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
