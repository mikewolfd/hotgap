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
  return {
    reset() { boxes.length = 0; },
    block(box) { boxes.push(box); },
    place(lines, spots, cls, force = false) {
      const v = view();
      const w = Math.max(...lines.map((line) => line.length)) * CH;
      const fit = (sp: Spot) => {
        const window = v.print || sp.x < v.scrollLeft || sp.x > v.scrollLeft + v.viewport
          ? [2, v.W - 2] : [v.scrollLeft + 2, v.scrollLeft + v.viewport - 2];
        const left = sp.anchor === "start" ? sp.x : sp.anchor === "middle" ? sp.x - w / 2 : sp.x - w;
        /* Only the edge in the way is a nudge, not a drop: a label near $0 keeps its number. */
        const dx = left < window[0] ? window[0] - left : left + w > window[1] ? window[1] - (left + w) : 0;
        return { dx, box: { x: left + dx, y: sp.y - LH + 2, w, h: LH * lines.length } };
      };
      let at = spots.map((sp) => ({ sp, ...fit(sp) })).find((c) => !boxes.some((o) => overlaps(c.box, o)));
      if (!at) {
        if (!force) return false;
        at = { sp: spots[0], ...fit(spots[0]) };
      }
      boxes.push(at.box);
      for (const [i, text] of lines.entries()) {
        picture.append(svg("text", { x: at.sp.x + at.dx, y: at.sp.y + i * LH, "text-anchor": at.sp.anchor, class: cls }, text));
      }
      return true;
    },
  };
}
