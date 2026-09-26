// MoneyCurve (#3), CurveReadout (#4) and MarkKey (#5) as DOM, drawn from a
// Scene and the geometry in geometry.ts (design/charts.md § 1) with the
// primitives both charts share (lib/chart/draw.ts; audit D10). The SVG is
// aria-hidden; the wrapper is the chart's one tab stop (role="group" with
// keys), and each cliff is a 44px .hg-mark button over the dot (M6). The
// line animates through .hg-draw on the first draw of an evaluation only; a
// redraw for a resize re-creates the path without the class.
//
// A draw is O(points in the window + cliffs); a pointer move or a key is
// O(1) — an index and one readout sentence — and never redraws the curve.
import { keepRateWords, type Cliff } from "@hotgap/core";
import { attachCursor, axisGutter, breakMarks, cursorNodes as cursorMarks, dropMark, hatchDefs, household, KEY_MARK, keyEntry, markButton, markWidths, pathD, plotClip, redrawForPrint, scrollerParts, seriesPath, sizeSvg, waitDot, waitStub, watchWidth, zoneRects } from "../lib/chart/draw.js";
import { scrollToShow } from "../lib/chart/geometry.js";
import { placer, type Spot } from "../lib/chart/labels.js";
import { h, svg } from "../lib/dom.js";
import { tickMoney } from "../lib/format.js";
import { finePointer, watchScrollEdges } from "../lib/scroll.js";
import { copy, parts, t } from "./copy.js";
import { subText, worstPhrase } from "./facts.js";
import { phrase } from "./programs.js";
import { layout, MAX_DROP_LABELS, type Cluster, type Layout } from "./geometry.js";
import type { Scene } from "./model.js";

export interface ChartHooks {
  /** A mark was activated: open its first cliff's row. */
  onActivate(cliff: Cliff): void;
  /** Escape on the chart: close whatever is open and put focus back. */
  onEscape(): void;
}

export interface Chart {
  /** Mirror the open row on the marks (aria-expanded). */
  setOpen(key: number | null): void;
  /** Focus the mark for a cliff's row key, or the wrapper when none. */
  focusMark(key: number | null): void;
  destroy(): void;
}

const LOSS_LABEL = "hg-label hg-label--loss hg-label--halo";
/** The household's own marks: the ink ramp, not the loss ramp — position is not a loss. */
const INK_LABEL = "hg-label hg-label--ink";
/** The dot radii this chart draws at (the caseworker's are a half-pixel smaller): a merged mark is r6, a single r4.5. */
const DOT = 4.5, DOT_MERGED = 6;
/** Paper is the column's width, whatever the screen was: a 358px drawing stretched to Letter prints its 12px ticks at 1.7× (S2). */
const PRINT_WIDTH = 640;

/**
 * The key entries: each draws the actual mark (never a swatch alone); an
 * entry for a mark not in this picture keeps its place, hidden. Every word
 * the picture writes on itself — "flat stretch", "another flat stretch",
 * "later" (and the step list's "Comes later"), "back to even", "no more drops
 * from here", the leap's "+$13,000", the road — is defined here in one line
 * (marketing review M10), because a label is two or three words and the key
 * is where those words are met with their meaning.
 */
function keyList(s: Scene, hasOther: boolean, hasLater: boolean, hasDrop: boolean, hasRoad: boolean, hasBoundary: boolean): HTMLUListElement {
  const hasExit = s.zone !== null && !s.stuck && s.exit !== null;
  const hasSafe = s.safeExit !== null && s.safeExit > 0 && (s.zone !== null || hasOther);
  return h("ul", { class: "hg-key" },
    keyEntry(copy.key.line, KEY_MARK.line),
    keyEntry(copy.key.band, KEY_MARK.band, !s.zone),
    keyEntry(copy.key.other, KEY_MARK.other, !hasOther),
    keyEntry(copy.key.drop, KEY_MARK.drop, !hasDrop),
    keyEntry(copy.key.later, KEY_MARK.later, !hasLater),
    keyEntry(copy.key.you, KEY_MARK.you),
    keyEntry(copy.key.leap, KEY_MARK.leap, !s.zone),
    keyEntry(copy.key.exit, KEY_MARK.safe, !hasExit),
    keyEntry(copy.key.safe, KEY_MARK.safe, !hasSafe),
    keyEntry(copy.key.road, KEY_MARK.road, !hasRoad),
    keyEntry(copy.key.boundary, KEY_MARK.boundary, !hasBoundary),
  );
}

/** The spoken shape of the curve, from the data — the whole axis, because that is what is drawn. */
function ariaLabel(s: Scene): string {
  const { m } = s;
  const worst = s.worst ? t("chart.ariaWorst", { at: m.payUnit(s.worst.endEarnings), what: worstPhrase(s) }) : "";
  const [x0, x1] = [0, s.top];
  if (!s.zone) return t("chart.ariaNoZone", { from: m.payUnit(x0), to: m.payUnit(x1), worst, pay: m.payUnit(s.current) });
  const more = s.otherZones.filter((z) => z.startEarnings > s.zone!.startEarnings)
    .map((z) => t("chart.ariaMore", { from: m.pay(z.startEarnings), to: m.pay(z.endEarnings ?? s.top) })).join("");
  return t("chart.aria", {
    from: m.payUnit(x0), to: m.payUnit(x1), zoneFrom: m.pay(s.zone.startEarnings), zoneTo: m.pay(s.stuck ? s.top : s.zone.endEarnings!),
    more, worst, pay: m.payUnit(s.current),
  });
}

function markLabel(s: Scene, cl: Cluster): string {
  const { m } = s;
  if (cl.cliffs.length > 1) {
    return t(cl.cliffs.some((c) => c.deferral) ? "chart.markMergedWaits" : "chart.markMerged", { n: cl.cliffs.length, from: m.pay(cl.cliffs[0].startEarnings), to: m.payUnit(cl.cliffs[cl.cliffs.length - 1].endEarnings),
      sum: m.about(cl.cliffs.reduce((sum, c) => sum + c.drop, 0)) });
  }
  const c = cl.cliffs[0];
  const key = c.deferral ? "chart.markLater" : c.endEarnings > s.current ? "chart.markWould" : "chart.markPast";
  return t(key, { pay: m.payUnit(c.endEarnings), drop: m.about(c.drop) });
}

export function mountChart(figure: HTMLElement, s: Scene, hooks: ChartHooks): Chart {
  const { m } = s;
  const [x0, x1] = [0, s.top];
  const picture = svg("svg", { "aria-hidden": "true" });
  const gutterSvg = svg("svg", { class: "hg-chart__gutter", "aria-hidden": "true" });
  const marksLayer = h("div", { class: "hg-marks" });
  /* The figure is a fixed gutter beside a scroller (charts.md § The scroll rule): the money labels hold still while the
     axis moves. The chart's one tab stop and its role stay on the wrapper that holds both. */
  const { scroll } = scrollerParts(gutterSvg, picture, marksLayer);
  /* The edge fades are measured (lib/scroll.ts): this scroller, and every other one on the page. */
  watchScrollEdges();
  const wrapper = h("div", { class: "hg-chart hg-chart--scroll", id: "chart", tabindex: "0", role: "group", "aria-roledescription": "interactive chart", "aria-describedby": "chartKeys", "aria-label": ariaLabel(s) }, gutterSvg, scroll);
  const hint = h("p", { class: "hg-chart__hint", id: "chartRange", "aria-hidden": "true" });
  const hasOther = s.otherZones.length > 0;
  const hasDrop = s.cliffs.some((c) => c.deferral?.complete !== true);
  const hasLater = s.deferred.length > 0;
  /* How the chart is operated: the readout says it until the first touch or key — the bracket keys only where there are marks and, at a
     desktop width, keys (N2) — and a visually hidden copy says all of it to a screen reader through aria-describedby. */
  /* The visible line says the one thing a finger needs; the bracket keys are
     in the hidden copy the chart is described by and in "How to read this
     picture", because eight words of keyboard instruction on every screen is
     eight words nobody reads. */
  const readout = h("p", { class: "hg-readout", "aria-live": "polite" }, t("chart.readoutHint"));
  const keys = h("p", { class: "hg-visually-hidden", id: "chartKeys" }, t("chart.readoutHint") + (s.cliffs.length ? t("chart.readoutMarks") : ""));
  const caption = h("p", { class: "caption", id: "curveCaption" });
  /* The readout paints the caret only once a person has moved it; before that it holds the hint. */
  let touched = false;
  /* Why the line is not the person's pay, and the largest part of it that
     never arrives as cash (S6): directly under the readout, always in view
     (marketing review M4). "You keep $42,797" beside a $30,000 pay is the
     moment a reader distrusts the picture, and the sentence that answers it
     sat inside the closed panel below. Once, so paper prints it once. */
  const sub = h("p", { class: "sub-line", id: "sub-line" }, subText(s));
  /* How to read this picture (inventory.md § The page is its picture): the
     plot's own title and unit, the MarkKey and the caption — inside the
     figure, because they explain the thing they sit in, and closed by
     default, because the direct labels are the first read now and a key
     nobody needs is 21 words of the reader's attention. Open on paper, one
     key press from the chart, and in the DOM throughout. The chart's
     aria-describedby therefore names only the operating sentence, which is
     visually hidden and always exposed; the caption is reached the way every
     other disclosed fact on this page is reached. */
  figure.append(wrapper, hint, readout, keys, sub,
    h("details", { class: "hg-disclosure", id: "howto" }, h("summary", {}, t("chart.howTo")),
      h("p", { class: "chart-title" }, t("chart.title"), " ",
        h("span", { class: "chart-unit" }, t(`chart.unit.${s.pay.unit}`, s.pay.unit === "hour" ? { hours: s.pay.hours } : {}))),
      keyList(s, hasOther, hasLater, hasDrop, s.road !== null, s.boundaryOnAxis), caption));

  let L: Layout | null = null;
  let firstDraw = true;
  let cursor = s.idx(s.current);
  let open: number | null = null;
  let cursorNodes: SVGElement[] = [];
  let clusters: Cluster[] = [];

  /* Direct labels (charts.md § Direct labels, rewritten 2026-09-18): the
     picture says what the prose used to. They are placed in priority order
     AFTER every mark is drawn, through the placer both charts share
     (lib/chart/labels.ts): each candidate spot is tested against the dots
     (with the open ring's box), the diamond, the curve itself and the labels
     already placed, nudged a line up or down when every spot is taken, and a
     label with no clear spot is dropped rather than drawn over something,
     because its money is always in the readout, the step row and the table.
     The one that always draws is the largest drop's — it is the label the
     page promises. A label is nudged inside whichever box the reader is
     actually looking through (the view at the layout's scroll, the whole
     plot on paper). O(labels × marks + points). */
  const P = placer(picture, () => ({ print: L!.print, scrollLeft: L!.scrollLeft, viewport: L!.viewport, W: L!.W }));
  const label = (lines: string[], spots: Spot[], cls: string, force = false, nudge = true): boolean => P.place(lines, spots, cls, force, nudge);

  /* The room the figure's own words need under the plot — the axis hint, the
     readout, the line on why the figure is more than the pay (two lines on a
     phone) and the disclosure's summary — so the height rule below leaves
     them on the first screen too. */
  const RESERVED = 196;
  /**
   * The second height floor (charts.md § Height is chosen by the biggest drop,
   * and by the screen): how much of the reader's FIRST screen is still free
   * below the figure's own top. Read once per draw — a new evaluation or a
   * resize — never per scroll or per pointer event, and measured from the top
   * of the document, because "the first screen" is where a person lands.
   */
  function screenLeft(): number {
    if (!wrapper.isConnected) return 0;
    const docTop = wrapper.getBoundingClientRect().top + scrollY;
    return Math.max(0, Math.round(innerHeight - docTop - RESERVED));
  }

  /** What ends at a cliff, as the second line of its direct label; nothing when the cliff names no program. */
  const endsLine = (c: Cliff): string | null => (c.programsLost.length ? t("chart.labels.ends", { phrase: phrase(c.programsLost[0]) }) : null);

  function draw(width = wrapper.clientWidth, print = false): void {
    /* The y-range is fitted to the part of the curve the reader is looking at — the landing view, or
       wherever they left the scroller (geometry.ts `layout`); paper fits the whole curve. */
    L = layout(s, width, print, screenLeft(), print ? null : anchor);
    P.reset();
    const { W, H, narrow, pad, px, py, y0, y1, i0, i1 } = L;
    const top = pad.t, bottom = H - pad.b;
    sizeSvg(picture, W, H);
    picture.textContent = "";
    picture.append(hatchDefs("hatch"));
    /* The line and its marks go through the plot's clip: fitted to the view, the curve elsewhere on the axis may run past the range. */
    const { defs: clipDefs, g: curve } = plotClip("plotClip", W, top, bottom);
    picture.append(clipDefs);
    /* The y axis in its own gutter, at the same py the gridlines below use, so the two halves read as one figure. */
    /* A tick label on the break itself would sit on its glyph: the glyph marks that value, and the caption names it. */
    axisGutter(gutterSvg, L.gutter, H, [...L.yTicks.filter((v) => !L!.band || Math.abs(py(v) - py(L!.band.y1)) >= 10), ...L.bandTicks], py, (v) => tickMoney(v, "year"));

    /* ── The ground ──────────────────────────────────────────────────── */
    /* Zones: the household's gets the wash, every other one hatch alone (rule 1). */
    const clip = (z: { startEarnings: number; endEarnings: number | null }) => [px(Math.max(z.startEarnings, x0)), px(Math.min(z.endEarnings ?? x1, x1))];
    for (const z of s.otherZones) {
      if ((z.endEarnings ?? Infinity) < x0 || z.startEarnings > x1) continue;
      const [a, b] = clip(z);
      picture.append(...zoneRects(a, b, top, bottom, false, "hatch"));
    }
    const [bx0, bx1] = s.zone ? clip({ startEarnings: s.zone.startEarnings, endEarnings: s.stuck ? x1 : s.zone.endEarnings }) : [0, 0];
    if (s.zone) picture.append(...zoneRects(bx0, bx1, top, bottom, true, "hatch"));

    /* Gridlines on nice values, across the whole plot; the labels are in the gutter, the x ticks scroll with the curve (S13). */
    for (const v of L.yTicks) {
      if (v > y0 && v < y1) picture.append(svg("line", { x1: 0, y1: py(v), x2: W, y2: py(v), stroke: "var(--grid)", "stroke-width": 1 }));
    }
    /* The break (lib/chart/geometry.ts § The break): the band's own gridlines, and the scale change marked in the gutter and across the plot. */
    for (const v of L.bandTicks) picture.append(svg("line", { x1: 0, y1: py(v), x2: W, y2: py(v), stroke: "var(--grid)", "stroke-width": 1 }));
    breakMarks(gutterSvg, L.gutter, picture, L);
    for (const tick of L.xTicks) picture.append(svg("text", { x: px(tick.annual), y: bottom + 24, "text-anchor": "middle", class: "hg-tick" }, tickMoney(tick.value, s.pay.unit)));
    picture.append(svg("line", { x1: 0, y1: bottom, x2: W, y2: bottom, stroke: "var(--axis)", "stroke-width": 1 }));

    /* EligibilityBoundary (#23): a tick on the axis where energy assistance stops — no dot, no connector, no drop. */
    if (s.boundaryOnAxis) {
      const tx = px(s.boundary!.earningsLimit);
      picture.append(svg("line", { x1: tx, y1: bottom - 8, x2: tx, y2: bottom, stroke: "var(--ink-3)", "stroke-width": 2, "stroke-linecap": "round", "data-boundary": "true" }));
    }

    /* The road out of poverty (charts.md § Direct labels, 6): a bar under the
       x ticks, outside the plot, where it cannot be read as part of the curve.
       Its keep rate is written on it once, in the label pass. */
    const roadY = bottom + 36;
    if (s.road) {
      const [ra, rb] = [px(s.road.lo), px(s.road.hi)];
      picture.append(svg("path", { d: `M${ra} ${roadY - 4} V${roadY + 4} M${ra} ${roadY} H${rb} M${rb} ${roadY - 4} V${roadY + 4}`,
        fill: "none", stroke: "var(--rule-strong)", "stroke-width": 1, "data-road": "true" }));
    }

    /* The peak of the household's zone: a rule across the band. Its dollar
       label went on 2026-09-18 — it printed, two inches from "you keep", a
       number within a rounding of it, and it was one of citizen review S3's
       three collisions. */
    const yPeak = s.zone ? py(s.zone.peakNet) : NaN;
    if (s.zone) picture.append(svg("line", { x1: bx0, y1: yPeak, x2: bx1, y2: yPeak, stroke: "var(--loss-3)", "stroke-width": 1 }));

    /* The exit, and safe-from-here when it is a different pay (rule 2). Both are on the axis or they do not exist. */
    const exitInWindow = s.zone !== null && !s.stuck && s.exit !== null && s.exit <= x1;
    const ex = exitInWindow ? px(s.exit!) : NaN;
    if (exitInWindow) picture.append(svg("line", { x1: ex, y1: top, x2: ex, y2: bottom, stroke: "var(--loss-3)", "stroke-width": 1 }));
    const safeInWindow = s.safeExit !== null && s.safeExit > 0 && s.safeExit !== s.exit && s.safeExit >= x0 && s.safeExit <= x1;
    const sx = safeInWindow ? px(s.safeExit!) : NaN;
    if (safeInWindow) picture.append(svg("line", { x1: sx, y1: top, x2: sx, y2: bottom, stroke: "var(--loss-3)", "stroke-width": 1 }));
    /* Whether the words "no more drops from here" are on the picture: on a phone they are not, and the caption says it instead (S4). */
    const safeSaid = !narrow && ((exitInWindow && s.safeExit === s.exit) || safeInWindow);

    /* The line: one series, 2px, round caps, no fill; .hg-draw on the first draw only. */
    const window = Array.from({ length: i1 - i0 + 1 }, (_, k) => i0 + k);
    const line = window.map((i) => [px(s.earningsAt(i)), py(s.net[i])] as [number, number]);
    picture.append(curve);
    curve.append(seriesPath(pathD(line), firstDraw));

    /* ── The marks ───────────────────────────────────────────────────── */
    const cx = px(s.current);
    let cy = py(s.currentNet);
    clusters = L.clusters;
    /* The diamond must not cover a mark (B1): within a dot's reach of one, it slides down its own drop line. */
    const RING = 10;
    const dotY = (cl: Cluster) => py(s.net[s.idx(cl.cliffs[0].startEarnings)]);
    if (clusters.some((cl) => Math.abs(cl.x - cx) < RING && Math.abs(dotY(cl) - cy) < RING)) cy += 2 * RING;

    /* Cliff marks (S8): a cluster is one dot at the first cliff's top. The
       immediate cliffs under it draw the solid --loss-4 dot and a connector to
       the lowest landing; a deferred one keeps its own channel — the dashed
       stub and the word later — beside them, and alone it is the hollow dot
       (B1: a mixed cluster never hides the loss that waits). */
    const marks = clusters.map((cl) => {
      const y = dotY(cl), r = cl.cliffs.length > 1 ? DOT_MERGED : DOT;
      const waiting = cl.cliffs.some((c) => c.deferral !== null);
      if (waiting) curve.append(waitStub(cl.x, y, 22));
      if (cl.later) { curve.append(waitDot(cl.x, y, r)); return { cl, y, landY: y, waiting }; }
      const land = Math.min(...cl.cliffs.filter((c) => c.deferral?.complete !== true).map((c) => s.net[s.idx(c.endEarnings)]));
      curve.append(...dropMark(cl.x, y, py(land), r));
      return { cl, y, landY: py(land), waiting };
    });

    /* The leap (S7): a bracket from the diamond to the exit, along the TOP of the plot — above the
       zone and everything in it. Twenty pixels over the peak rule, it stacked on "−$2,384 / cash help
       ends" and on the curve itself (TASKS 2026-09-24); the fitted range keeps room up here for it. */
    const bracket = s.zone !== null && (s.stuck || exitInWindow);
    const by = top + 16;
    const bx = s.stuck ? W - pad.r : ex;
    if (bracket) {
      picture.append(svg("path", { d: `M${cx} ${by + 4} V${by} H${bx}` + (s.stuck ? "" : ` V${by + 4}`), fill: "none", stroke: "var(--loss-3)", "stroke-width": 1 }));
    }

    /* You are here: a diamond, so position survives greyscale — drawn last, on its own drop line. */
    picture.append(...household(cx, cy, bottom));

    /* ── The labels, in the priority order charts.md sets ─────────────── */
    for (const mk of marks) P.block({ x: mk.cl.x - RING, y: mk.y - RING, w: 2 * RING, h: 2 * RING });
    P.block({ x: cx - 7, y: cy - 7, w: 14, h: 14 });
    /* The line is an obstacle too, and so are the peak rule and the bracket: a label never sits on a stroke. */
    P.blockLine(line);
    /* …and the break's hairline, so no label is struck through where the scale changes. */
    if (L.band) P.blockLine([[0, py(L.band.y1)], [W, py(L.band.y1)]]);
    if (s.zone) P.blockLine([[bx0, yPeak], [bx1, yPeak]]);
    if (bracket) P.blockLine([[cx, by], [bx, by]]);
    /* …and the x ticks and the road's bar under the plot: a label nudged down must not land on them. */
    P.block({ x: 0, y: bottom + 1, w: W, h: (s.road ? roadY + 5 : bottom + 28) - bottom });
    /* A mark past the fitted range is somewhere the reader is not looking: it keeps its button but no label (past the stable span, lib/chart/geometry.ts `stableSpan`). */
    const onPlot = (mk: { y: number }) => mk.y >= top && mk.y <= bottom;

    /* 1. What the reader keeps now, at their own diamond: the fact that left
          the answer sentence to come and label the axis here. It says in two
          words why the figure is not the pay — a fresh reader met "you keep
          $42,830" beside her own $30,000 and wanted to close the tab. */
    label([t(s.currentNet >= s.current ? "chart.labels.youKeepHelp" : "chart.labels.youKeepTax", { kept: m.money(s.currentNet) })],
      [{ x: cx, y: cy - 14, anchor: "middle" }, { x: cx, y: cy + 26, anchor: "middle" },
        { x: cx + 14, y: cy + 4, anchor: "start" }, { x: cx - 14, y: cy + 4, anchor: "end" },
        { x: cx, y: cy - 34, anchor: "middle" }, { x: cx, y: top - 8, anchor: "middle" }],
      `${INK_LABEL} hg-label--strong hg-label--halo`, true);

    /* 2. The largest drop: its money and what ends there, two lines, the
          heaviest ink on the picture. Always drawn — beside a tall connector
          first, else above the dot or below the landing, always to the right
          of the mark, so a connector flush with the left clip cannot put the
          number in the gutter (S1). */
    const dropSpots = (mk: { cl: Cluster; y: number; landY: number }): Spot[] => {
      const tall = mk.landY - mk.y >= 24;
      /* A dot high in the plot — inside the band, where the whole climb is squeezed — has no room above it for two lines: below the landing first. */
      const high = mk.y - top < 34 || (L!.band !== undefined && mk.y < py(L!.band.y1));
      return [
        /* …and where the band squeezes the drop, the clear room just under the break, beside its own connector's x. */
        ...(high ? [mk.landY + 14, ...(L!.band ? [Math.max(mk.landY + 14, py(L!.band.y1) + 16)] : [])].flatMap((y) => [{ x: mk.cl.x + 12, y, anchor: "start" } as Spot, { x: mk.cl.x - 12, y, anchor: "end" } as Spot]) : []),
        ...(tall ? [{ x: mk.cl.x + 12, y: (mk.y + mk.landY) / 2 + 4, anchor: "start" } as Spot] : []),
        { x: mk.cl.x + 12, y: mk.y - 9, anchor: "start" },
        { x: mk.cl.x + 12, y: mk.landY + 14, anchor: "start" },
        /* Then above the mark, then to its left: a flat stretch puts three
           dots and a diamond inside sixty pixels, and the right-hand side
           alone is not enough room for a label that names what ends. The
           plot's edge nudges a label in rather than dropping it (S1). */
        { x: mk.cl.x, y: mk.y - 26, anchor: "middle" },
        { x: mk.cl.x - 12, y: mk.y - 9, anchor: "end" },
        { x: mk.cl.x - 12, y: mk.landY + 14, anchor: "end" },
      ];
    };
    const dropMoney = (cl: Cluster) => t("chart.labels.drop", { drop: m.money(cl.cliffs.reduce((sum, c) => sum + c.drop, 0)) });
    /* A drop's label is its money and what ends there, two lines — the money
       alone is a number without a cause, and the cause is the sentence this
       page used to spend a paragraph on. The second line is dropped only when
       the two-line box finds no clear spot and the one-line box does. */
    const dropLabel = (mk: { cl: Cluster; y: number; landY: number }, cls: string, force = false, nudge = force): boolean => {
      const money = dropMoney(mk.cl);
      const ends = mk.cl.cliffs.length === 1 ? endsLine(mk.cl.cliffs[0]) : null;
      const both = ends !== null ? [money, ends] : [money];
      /* Only the promised label is nudged off its spots; any other drop's reads only beside its mark. */
      if (label(both, dropSpots(mk), cls, false, nudge)) return true;
      if (ends !== null && label([money], dropSpots(mk), cls, false, nudge)) return true;
      // The label the page promises keeps BOTH lines when it is forced: a drop
      // with no cause named is the number the old page put in a paragraph.
      return force ? label(both, dropSpots(mk), cls, true) : false;
    };
    const worstMark = L.labelled ? marks.find((mk) => mk.cl.cliffs.includes(L!.labelled!)) : undefined;
    let drawn = 0;
    if (worstMark && onPlot(worstMark)) { dropLabel(worstMark, `${LOSS_LABEL} hg-label--strong`, true); drawn++; }

    /* 3. The way back, on its rule — dropped on a phone, where the caption says it instead (S4). Where there is
          room it says what "even" is, the pay it gets you back to (marketing review M10); else the short label, which
          the key defines. */
    if (exitInWindow && !narrow) {
      const at: Spot[] = [{ x: ex + 6, y: top + 12, anchor: "start" }];
      const cls = `${LOSS_LABEL} hg-label--med`;
      if (s.safeExit === s.exit) label([copy.chart.labels.backToEvenSafe], at, cls);
      else if (!label([t("chart.labels.backToPeak", { peak: m.pay(s.zone!.startEarnings) })], at, cls)) label([copy.chart.labels.backToEven], at, cls);
    }
    if (safeInWindow && !narrow) label([copy.chart.labels.safe], [{ x: sx + 6, y: top + 12, anchor: "start" }], `${LOSS_LABEL} hg-label--med`);

    /* 4. "later", over each deferred mark's dashed stub: solid means this year, dashed means a later renewal. */
    for (const mk of marks) {
      if (mk.waiting) label([copy.chart.labels.later], [{ x: mk.cl.x, y: mk.y - 28, anchor: "middle" }], "hg-label hg-label--med hg-label--halo");
    }

    /* 5. The leap, once, on its bracket. */
    if (bracket) {
      label([t(s.stuck ? "chart.labels.leapMore" : "chart.labels.leap", { leap: m.diff(s.current, s.stuck ? s.top : s.exit!) })],
        [{ x: (cx + bx) / 2, y: by - 5, anchor: "middle" }], `${LOSS_LABEL} hg-label--strong`);
    }

    /* 6. The keep rate, written once on the road it measures (app/README.md
          § Keep rate): the sign and the cents are core's, so no surface
          invents its own rounding. Then the road's two ends, which it did not
          say: the poverty line and twice it — on the keep rate's own line
          where there is room, else the line under it. */
    /* It names its span (policy review R11): three keep rates are on this page — this road, the next $10,000
       and, in the zone, here to the exit — and each says which stretch it measures. The short form where the long
       does not fit still says "out of poverty". */
    if (s.road && s.road.keepRate !== null) {
      const { sign, cents } = keepRateWords(s.road.keepRate);
      const at: Spot[] = [{ x: (px(s.road.lo) + px(s.road.hi)) / 2, y: roadY + 18, anchor: "middle" }];
      if (!label([t(`chart.labels.road.${sign}`, { cents })], at, "hg-label")) label([t(`chart.labels.roadShort.${sign}`, { cents })], at, "hg-label");
    }
    if (s.road) {
      const [ra, rb] = [px(s.road.lo), px(s.road.hi)];
      label([t("chart.labels.roadFrom", { lo: m.pay(s.road.lo) })], [{ x: ra, y: roadY + 18, anchor: "start" }, { x: ra, y: roadY + 33, anchor: "start" }], "hg-label hg-label--end");
      label([t("chart.labels.roadTo", { hi: m.pay(s.road.hi) })], [{ x: rb, y: roadY + 18, anchor: "end" }, { x: rb, y: roadY + 33, anchor: "end" }], "hg-label hg-label--end");
    }

    /* 7. Every other drop's money, biggest first, while there is room. Biggest
          first and not in axis order, because a crowded stretch would
          otherwise spend the last label on the smallest step in it — a $677
          drop labelled beside a $2,387 one nobody named. */
    const rest = marks.filter((mk) => mk !== worstMark && onPlot(mk))
      .sort((a, b) => b.cl.cliffs.reduce((n, c) => n + c.drop, 0) - a.cl.cliffs.reduce((n, c) => n + c.drop, 0));
    for (const mk of rest) {
      if (drawn >= MAX_DROP_LABELS) break;
      /* The biggest of them may be nudged when the curve's own biggest drop is off the plot: then it is the view's lead label. */
      if (dropLabel(mk, `${LOSS_LABEL} hg-label--med`, false, mk === rest[0] && !(worstMark && onPlot(worstMark)))) drawn++;
    }

    /* 8. Every later zone says so at its top, so a reader told "past $43,000" who scrolls on finds the
          next flat stretch named, not only hatched (TASKS 2026-09-24: the biggest drop is often there). */
    for (const z of s.otherZones) {
      const zx = px(z.startEarnings) + 6;
      /* Not when the zone starts just off the left of the view: half a label under the edge reads as broken text. */
      if (z.startEarnings < s.current || (!print && zx < L.scrollLeft)) continue;
      label([copy.chart.labels.again], [{ x: zx, y: top + 12, anchor: "start" }], `${LOSS_LABEL} hg-label--med`);
    }

    /* The caption, from the values just computed (never typed). The axis clause says
       whether the reader is looking at a slice of a scroller or the whole thing at
       once, because on paper there is nothing to scroll (§ The scroll rule). */
    let text = t(print ? "chart.wholeOnPaper" : "chart.scrolls", { from: m.pay(0), to: m.pay(s.top) });
    if (y0 > 0) text += " " + t(L.maxDrop >= 0.1 * (y1 - y0) ? "chart.axisNote" : "chart.axisNoteBare", { floor: m.money(y0) });
    if (L.band) text += t("chart.axisBreak", { top: m.money(L.band.y1) });
    if (s.safeExit === null) text += t("chart.safeNever", { top: m.pay(s.top) });
    else if (s.safeExit > 0 && !safeSaid) text += t("chart.safeBeyond", { safe: m.pay(s.safeExit) });
    caption.textContent = (text + t("chart.estimates", { year: s.ev.curve.year, state: s.stateName })).trim();

    /* The axis's own ends under the figure, from the data, and between them
       the one thing a phone needs told in words: that the picture slides. A
       thumb reader on 2026-09-19 read the old middle word, "your pay", as a
       you-are-here marker and never learned the chart moved; the diamond
       already says where you are. The middle is drawn only while the plot
       overflows its scroller, so no wide screen gains a word
       (inventory.md § MoneyCurve; feedback: every graph swipes). */
    const slides = wrapper.querySelector<HTMLElement>(".hg-scroll-x");
    /* "Swipe" is a touch word: a mouse or a trackpad is told to scroll (TASKS 2026-09-24). */
    const mid = slides && slides.scrollWidth > slides.clientWidth + 1 ? [h("span", {}, t(finePointer() ? "chart.rangeMidPointer" : "chart.rangeMid"))] : [];
    hint.replaceChildren(h("span", {}, t("chart.rangeFrom", { from: m.pay(0) })), ...mid, h("span", {}, t("chart.rangeTo", { to: m.pay(s.top) })));

    /* The visible range, band included: every tick in the gutter lies inside it. The 2.5× rule itself is the fitted range's. */
    wrapper.dataset.yratio = L.maxDrop ? (((L.band?.yMax ?? y1) - y0) / L.maxDrop).toFixed(2) : "";
    firstDraw = false;
    paintMarks();
    restoreScroll();
    if (touched) paintCursor();
  }

  /* Where the reader is looking survives a redraw: the initial position is the
     scene's window (§ The scroll rule), and after that it is whatever pay the
     reader left at the left edge — a resize must not yank the curve back. */
  let anchor: number | null = null;
  function restoreScroll(): void {
    if (!L) return;
    scroll.scrollLeft = L.print ? 0 : anchor === null ? L.scrollLeft : Math.max(0, Math.min(L.W - L.viewport, L.px(anchor)));
  }
  scroll.addEventListener("scroll", () => {
    if (!L || L.print) return;
    anchor = (scroll.scrollLeft - L.pad.l) / (L.W - L.pad.l - L.pad.r) * s.top;
  }, { passive: true });

  /** Bring a plot-space x into view (the keyboard's job: a focused mark or the caret must be visible — proof (b)). */
  function reveal(x: number): void {
    if (!L || L.print) return;
    scroll.scrollLeft = scrollToShow(x, scroll.scrollLeft, L.viewport, L.W);
  }

  /* Cliff marks as controls (M6): one 44px button per cluster and per deferred cliff. */
  const keyOf = (c: Cliff) => c.endEarnings;
  function paintMarks(): void {
    if (!L) return;
    // A repaint (a resize) must not drop the mark that has focus.
    const focused = (document.activeElement as HTMLElement | null)?.closest(".hg-mark")?.getAttribute("data-key") ?? null;
    marksLayer.textContent = "";
    /* The marks layer is the PLOT's box, not the scroller's viewport, so a mark's percent position is a position on the axis and scrolls with its dot. */
    marksLayer.style.width = `${L.W}px`;
    marksLayer.style.height = `${L.H}px`;
    /* The hit bands, before any button is made: a mark takes 44px or the gap
       to its nearest neighbour, whichever is less, so two never stack
       (lib/chart/draw.ts `markWidths`). */
    const hitW = markWidths(clusters.map((cl) => cl.x));
    for (const [ci, cl] of clusters.entries()) {
      const key = keyOf(cl.cliffs[0]);
      const b = markButton(cl.x, L.py(s.net[s.idx(cl.cliffs[0].startEarnings)]), L, markLabel(s, cl), cl.cliffs.length, cl.later,
        { "data-key": String(key), "aria-controls": `step-${key}`, "aria-expanded": String(open === key) }, hitW[ci]);
      b.addEventListener("click", () => {
        touched = true;
        cursor = s.idx(cl.cliffs[0].startEarnings);
        paintCursor();
        readout.textContent = markLabel(s, cl);
        hooks.onActivate(cl.cliffs[0]);
      });
      /* A mark reached by keyboard may be off screen: focus scrolls it into view (M6's scroll-into-view, now in two directions). */
      b.addEventListener("focus", () => reveal(cl.x));
      marksLayer.append(b);
    }
    if (focused !== null) markFor(Number(focused))?.focus();
  }
  const markFor = (key: number | null) => (key === null ? null : marksLayer.querySelector<HTMLButtonElement>(`.hg-mark[data-key="${key}"]`));

  /* CurveReadout (#4): the same line for hover, the keyboard caret and a mark. */
  function paintCursor(): void {
    for (const n of cursorNodes) n.remove();
    cursorNodes = [];
    if (!L) return;
    const { px, py, pad, H } = L;
    /* At the household's own point the diamond is the cursor: the readout gives the person's pay and money, not the nearest sampled point's. */
    const atYou = cursor === s.idx(s.current);
    const e = atYou ? s.current : s.earningsAt(cursor), v = atYou ? s.currentNet : s.net[cursor];
    if (!atYou) {
      cursorNodes = cursorMarks(px(e), py(v), pad.t, H - pad.b, DOT);
      picture.append(...cursorNodes);
    }
    const inYours = s.zone !== null && e > s.zone.startEarnings && e < (s.stuck ? Infinity : s.zone.endEarnings!);
    const inAny = s.ev.analysis.dangerZones.some((z) => e > z.startEarnings && e < (z.endEarnings ?? Infinity));
    readout.replaceChildren(
      ...parts(copy.chart.readout, { pay: m.payUnit(e), kept: m.money(v) }).map((p) => ("slot" in p ? h("b", {}, p.text) : p.text)),
      t(inYours ? "chart.inYourZone" : inAny ? "chart.inZone" : "chart.outZone"),
    );
  }
  /* The pointer moves the cursor as it passes (a phone drags, a mouse hovers); a key moves it a point, shift five; ] and [ walk the marks —
     from the one that has focus, else from the wrapper ] goes to the first and [ to the last. */
  attachCursor(wrapper, {
    svg: picture, layer: () => L, range: () => [L!.i0, L!.i1], cursor: () => cursor, shift: 5, pointer: "hover",
    scroller: () => scroll,
    set(i, by) { cursor = i; touched = true; paintCursor(); if (by === "key" && L) reveal(L.px(s.earningsAt(i))); },
    bracket(key) {
      const marks = [...marksLayer.querySelectorAll<HTMLButtonElement>(".hg-mark")];
      if (!marks.length) return;
      const at = marks.indexOf(document.activeElement as HTMLButtonElement);
      marks[key === "]" ? (at < 0 ? 0 : Math.min(marks.length - 1, at + 1)) : (at < 0 ? marks.length - 1 : Math.max(0, at - 1))].focus();
    },
    escape: () => hooks.onEscape(),
  });

  /* A redraw for a resize re-creates the path without .hg-draw; paper is one width. */
  const unwatch = watchWidth(wrapper, () => draw());
  const unprint = redrawForPrint(draw, PRINT_WIDTH);

  return {
    setOpen(key) {
      markFor(open)?.setAttribute("aria-expanded", "false");
      open = key;
      markFor(open)?.setAttribute("aria-expanded", "true");
    },
    focusMark(key) { (markFor(key) ?? wrapper).focus(); },
    destroy() { unwatch(); unprint(); },
  };
}
