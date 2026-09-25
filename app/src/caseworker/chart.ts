// MoneyCurve (#3), CurveReadout (#4) and MarkKey (#5) for the caseworker:
// the full axis, the line, the household's zone with its peak rule, exit and
// leap bracket, every other zone as hatch, cliff marks as 44px controls with
// the collision rule, and the keyboard model (design/charts.md § 1, M6, S8,
// S12), over the primitives both charts share (lib/chart; audit D10).
//
// Since 2026-09-18 (design/PICTURE-FIRST-2026-09-18.md) this figure is the
// page, and two things follow. The prose that used to sit beside it is gone,
// so the marks carry it: the direct labels are drawn in the priority order
// charts.md sets, through the shared placer and its collision test
// (lib/chart/labels.ts). And the comparison is drawn here rather than read
// off a table: every what-if that has an evaluation is a second line on this
// picture — quieter, its own dash, a one-word tag — so a counselor sees the
// two curves against each other before she sees any number
// (charts.md § A what-if is a second line).
//
// One selection model: a mark and its DropLedger row share `selected`, which
// main.ts owns; this module reports presses and mirrors the selection onto
// the marks. Every word is copy.ts's.
//
// A draw is O(points × (1 + what-ifs) + cliffs + zones); a width change
// redraws once; print redraws synchronously at a fixed width (review N6).
import { keepRateWords, type Cliff, type HouseholdEvaluation } from "@hotgap/core";
import { attachCursor, axisGutter, cursorNodes as cursorMarks, dropMark, hatchDefs, household, KEY_MARK, keyEntry, markButton, markWidths, pathD, plotClip, redrawForPrint, seriesPath, sizeSvg, waitDot, waitStub, watchWidth, whatIfDot, whatIfKeyMark, whatIfPath, zoneRects } from "../lib/chart/draw.js";
import { clusterCliffs, fitY, layerFor, niceStep, niceUp, plotHeight, plotWidth, PLOT_LEAD, scaleFor, scrollFor, scrollToShow, stableSpan, windowFor, type Cluster, type Layer } from "../lib/chart/geometry.js";
import { MAX_DROP_LABELS, placer, type Spot } from "../lib/chart/labels.js";
import { finePointer, watchScrollEdges } from "../lib/scroll.js";

import { svg as mk } from "../lib/dom.js";
import { lossFigure, money as usd, tickMoney } from "../lib/format.js";
import { programName } from "../lib/names.js";
import { copy, t } from "./copy.js";
import { cliffAt, cliffSentence, indexOf } from "./model.js";

export interface ChartHost { wrap: HTMLElement; gutter: SVGSVGElement; scroll: HTMLElement; hint: HTMLElement; svg: SVGSVGElement; marks: HTMLElement; readout: HTMLElement; key: HTMLElement; cap: HTMLElement }

/** A what-if drawn on the base's picture: its curve, the pay it stands at, and the tag that names it. */
export interface WhatIfLine { tag: string; earnings: number[]; net: number[]; at: number }

export interface Chart {
  /** Draw an evaluation; `source` closes the caption. The first draw animates the line. */
  render(ev: HouseholdEvaluation, source: string): void;
  /** The what-if curves drawn on this picture, in the CompareTable's own column order. */
  setWhatIfs(lines: WhatIfLine[]): void;
  /** Mirror the page's selection onto the marks; a press also moves the cursor and the readout to the cliff, the initial selection does not. */
  setSelected(i: number | null, opts?: { moveCursor?: boolean }): void;
  /** Focus returns to a cliff's mark when its row closes. */
  focusMark(i: number): void;
  say(text: string): void;
}

/** A mark on this chart: its cluster (the cliffs under it, by index into the cliff list) and its control. */
interface Mark { cluster: Cluster; members: number[]; x: number; y: number; landY: number; waiting: boolean; btn: HTMLButtonElement }

/** The width the curve is drawn at on paper, whatever the screen was (review N6): 42rem at 16px. */
const PRINT_WIDTH = 672;
/** The gutter the y axis holds still in, outside the scroller — wide enough for "$100k" at the tick size. */
const GUTTER = { narrow: 44, wide: 52 } as const;
/** A mark's ring, the box a direct label must clear (review S4). */
const RING = 10;
/** The dot radii this chart draws at: a merged mark is r6, a single r4; the cursor's dot r4. */
const DOT = 4, DOT_MERGED = 6;
/** How many what-if curves the picture carries; the rest keep their column and their rows, and the caption says so. */
export const MAX_WHAT_IF_LINES = 3;
/** The foot the road out of poverty needs below the x ticks: its bar, the line written on it, and a second line for its ends where the first has no room. */
const ROAD_FOOT = 40;

const LOSS_LABEL = "hg-label hg-label--loss hg-label--halo";
const INK_LABEL = "hg-label hg-label--ink hg-label--halo";

export function mountChart(host: ChartHost, on: { select(i: number, announce?: string): void; close(): void }): Chart {
  const { wrap, svg, marks: marksEl, readout } = host;
  const K = copy.chart;
  let ev: HouseholdEvaluation | null = null;
  let source = "";
  let net: number[] = [], earn: number[] = [];
  let cursor = 0, layer: Layer | null = null, cursorNodes: SVGElement[] = [], marks: Mark[] = [], drawn = false;
  let diamond: SVGElement | null = null, selected: number | null = null;
  let whatIfs: WhatIfLine[] = [];
  /* The pay at the scroller's left edge once the reader has moved it; whether this draw is for paper; the viewport it drew into. */
  let anchor: number | null = null, printing = false, viewportW = 0;
  /* The edge fades are measured (lib/scroll.ts): this scroller, the ledger's and the table's. */
  watchScrollEdges();

  const label = placer(svg, () => ({ print: printing, scrollLeft: host.scroll.scrollLeft, viewport: viewportW, W: layer?.W ?? 0 }));

  const cliffs = (): Cliff[] => ev!.analysis.cliffs;
  const markSentence = (m: Mark): string => m.members.length === 1 ? cliffSentence(cliffs()[m.members[0]])
    : t("chart.merged", { n: m.members.length, from: usd(cliffs()[m.members[0]].startEarnings), to: usd(cliffs()[m.members[m.members.length - 1]].endEarnings), sum: usd(m.members.reduce((s, i) => s + cliffs()[i].drop, 0)) });
  const zoneOf = (e: number) => ev!.analysis.dangerZones.find((z) => e > z.startEarnings && (z.endEarnings === null || e < z.endEarnings)) ?? null;
  const isPersonal = (z: { startEarnings: number } | null) => !!z && !!ev!.personal.zone && z.startEarnings === ev!.personal.zone.startEarnings;
  const mkSpan = (text: string) => { const el = document.createElement("span"); el.textContent = text; return el; };
  /** The what-ifs this picture carries, capped; the rest keep their column and their rows. */
  const drawnWhatIfs = (): WhatIfLine[] => whatIfs.slice(0, MAX_WHAT_IF_LINES);
  /**
   * Whether a what-if's curve IS the base's — a raise, and nothing else
   * changed, which the sweep answers with the same points at a different
   * position. Read off the points rather than off the diff, because the same
   * raise in another state is a real second curve.
   */
  const samePoints = (l: WhatIfLine): boolean =>
    l.net.length === net.length && l.net.every((v, i) => v === net[i] && l.earnings[i] === earn[i]);
  /** The line's value at any earnings, interpolated between the two axis points around it. */
  const netAt = (e: number): number => {
    const f = (e - earn[0]) / (earn[1] - earn[0]), i = Math.max(0, Math.min(net.length - 2, Math.floor(f)));
    return net[i] + (net[i + 1] - net[i]) * Math.max(0, Math.min(1, f - i));
  };
  /** What ends at a cliff, as the second line of its direct label; nothing where the cliff names no program. */
  const endsLine = (c: Cliff): string | null => (c.programsLost.length ? t("chart.labels.ends", { program: programName(c.programsLost[0]) }) : null);

  function draw(width = Math.max(320, wrap.clientWidth), print = false): void {
    if (!ev) return;
    const A = ev.analysis, P = ev.personal, DEFERRED = ev.deferred;
    const safe = ev.escape.safeExitEarnings;
    const box = width, narrow = !print && box < 520;
    const gutter = narrow ? GUTTER.narrow : GUTTER.wide;
    const viewport = Math.max(200, box - gutter);
    const road = ev.road;
    const pad = { t: 30, r: 20, b: 34 + (road ? ROAD_FOOT : 0), l: PLOT_LEAD };
    const x0 = earn[0], x1 = earn[earn.length - 1];
    const lines = drawnWhatIfs();
    /* Two kinds, told apart by the data: a what-if with a curve of its own, and one that is the base's own
       curve at a different pay. The caption names them separately because they are different claims. */
    const positions = lines.filter(samePoints), curves = lines.filter((l) => !samePoints(l));
    /* Where the reader lands, and therefore the scale: the window in one viewport, the rest a swipe away.
       Paper cannot scroll, so the whole axis is fitted to the column instead (charts.md § The scroll rule).
       x does not depend on y, so where the reader is looking is known before the y-range is. */
    const view = windowFor({ current: A.currentEarnings, zone: P.zone, stuck: P.raiseIsLowerBound, exit: P.escapeEarnings, next: A.nextCliff, worst: A.worstCliff, top: x1, step: earn[1] - earn[0] });
    const scale = print ? (viewport - pad.l - pad.r) / x1 : scaleFor(viewport, view, x1);
    const W = print ? viewport : plotWidth(x1, pad, scale);
    const xOnly = layerFor(W, 1, pad, x0, x1, 0, 1), payAt = (x: number) => x0 + ((x - pad.l) / (W - pad.l - pad.r)) * (x1 - x0);
    const landing = print ? 0 : scrollFor(xOnly, viewport, view, A.currentEarnings);
    const left = print ? 0 : anchor === null ? landing : Math.max(0, Math.min(W - viewport, xOnly.px(anchor)));
    /* Axis honesty (charts.md): the floor is computed, never typed, and the visible range is at least
       2.5× the largest drop on the WHOLE curve (S14). The range is fitted once per draw to the household's
       own stretch — through its own exit and next cliff, not the whole curve's safe exit (lib/chart/geometry.ts
       `stableSpan`) — every line drawn there, what-ifs included, is inside it — and never refitted on
       scroll; past it the line is clipped. */
    const n = narrow ? 3 : 5;
    const maxDrop = Math.max(0, ...cliffs().map((c) => c.drop));
    const [e0, e1] = print ? [x0, x1] : stableSpan(view, Math.max(P.escapeEarnings ?? 0, A.nextCliff?.endEarnings ?? 0) || null, x1);
    const { y0, y1, step } = yFit(e0, e1, lines, maxDrop, n);
    /* The plot is as tall as the biggest drop needs to clear 24px, clamped, and — since the figure is the
       page — at least what is left of the reader's first screen (charts.md § Height). The same rule and the
       same numbers as the citizen's, so one figure is not read at a different scale from the other. It is
       one range for the whole draw, so scrolling never moves the page. */
    const H = plotHeight(y1 - y0, maxDrop, print ? 0 : screenLeft() - pad.t - pad.b) + pad.t + pad.b;
    const L = layerFor(W, H, pad, x0, x1, y0, y1), { px, py } = L;
    const plotTop = pad.t, plotBot = H - pad.b;
    /* The placer reads where the reader is looking, so the scroll and the viewport have to be current before any label is drawn. */
    layer = L; printing = print; viewportW = viewport;
    host.scroll.scrollLeft = left;

    sizeSvg(svg, W, H);
    svg.textContent = "";
    label.reset();
    svg.append(hatchDefs("cw-hatch"));
    /* The lines and the marks go through the plot's clip: fitted to the view, a curve elsewhere on the axis may run past the range. */
    const { defs: clipDefs, g: curve } = plotClip("cw-plot-clip", W, plotTop, plotBot);
    svg.append(clipDefs);
    /* The y axis holds still in its gutter while the curve scrolls under it. */
    const yTicks: number[] = [];
    for (let v = y0; v <= y1 + 1; v += step) yTicks.push(v);
    axisGutter(host.gutter, gutter, H, yTicks, py, (v) => tickMoney(v, "year"));

    /* Zones: the household's own gets the wash, the peak rule, the exit and the
       bracket; every other zone is hatch alone (S7). */
    for (const z of A.dangerZones) svg.append(...zoneRects(px(z.startEarnings), px(z.endEarnings ?? x1), plotTop, plotBot, isPersonal(z), "cw-hatch"));
    for (const v of yTicks) svg.append(mk("line", { x1: 0, y1: py(v), x2: W, y2: py(v), stroke: "var(--grid)", "stroke-width": 1 }));
    /* The x ticks scroll with the curve, one about every 110px — or half as many on paper, where the axis is squeezed and the type floor still holds. */
    const xs = niceStep(x1 - x0, Math.max(2, Math.round((W - pad.l - pad.r) / (print ? 150 : 110))));
    for (let e = x0; e <= x1; e += xs) svg.append(mk("text", { class: "hg-tick", x: px(e), y: plotBot + 22, "text-anchor": "middle" }, tickMoney(e, "year")));
    svg.append(mk("line", { x1: 0, y1: plotBot, x2: W, y2: plotBot, stroke: "var(--axis)", "stroke-width": 1 }));

    /* The road out of poverty (charts.md § Direct labels, 6): a bar under the x
       ticks, outside the plot, where it cannot be read as part of the curve. */
    const roadY = plotBot + 36;
    if (road) {
      const [ra, rb] = [px(road.lo), px(road.hi)];
      svg.append(mk("path", { d: `M${ra} ${roadY - 4} V${roadY + 4} M${ra} ${roadY} H${rb} M${rb} ${roadY - 4} V${roadY + 4}`,
        fill: "none", stroke: "var(--rule-strong)", "stroke-width": 1, "data-road": "true" }));
    }

    const yRange = y1 - y0;
    svg.append(curve);
    /* The what-ifs first, under the base: the household's own curve is never the line a reader has to hunt for.
       A what-if whose curve IS the base's — a raise, and nothing else changed — draws no line; it is a second
       position on the one curve, and its diamond goes on top with the marks (charts.md § A what-if is a
       second line). Read off the data, not off the diff: the same raise in another state is a real second curve. */
    for (const [i, l] of lines.entries()) {
      if (samePoints(l)) continue;
      const pts = l.earnings.map((e, k) => [px(e), py(l.net[k])] as [number, number]).filter(([x]) => x >= 0 && x <= W);
      if (pts.length > 1) curve.append(whatIfPath(pathD(pts), i));
    }
    const line = net.map((v, i) => [px(earn[i]), py(v)] as [number, number]);
    curve.append(seriesPath(pathD(line), !drawn));   /* the one orchestrated moment, first draw only */

    /* Cliff marks, with the collision rule (S8): adjacent dots closer than 10px
       merge into one mark with a count — a mixed cluster keeps the waits
       channel beside the drop, alone it is the hollow dot (citizen review
       B1); the ledger is where they separate. */
    marks = [];
    marksEl.textContent = "";
    /* The marks layer is the PLOT's box, not the scroller's viewport, so a mark scrolls with its dot. */
    marksEl.style.width = `${W}px`;
    marksEl.style.height = `${H}px`;
    const clustered = clusterCliffs(cliffs(), px);
    /* The hit bands, before any button is made: a mark takes 44px or the gap
       to its nearest neighbour, whichever is less, so two never stack
       (lib/chart/draw.ts `markWidths`). */
    const hitW = markWidths(clustered.map((cl) => cl.x));
    for (const [ci, cl] of clustered.entries()) {
      const members = cl.cliffs.map((c) => cliffs().indexOf(c));
      const x = cl.x, y = py(net[indexOf(ev, cl.cliffs[0].startEarnings)]), r = cl.cliffs.length > 1 ? DOT_MERGED : DOT;
      const waiting = cl.cliffs.some((c) => c.deferral !== null);
      let landY = y;
      if (waiting) curve.append(waitStub(x, y, 18));
      if (cl.later) curve.append(waitDot(x, y, r));
      else {
        const land = Math.min(...cl.cliffs.filter((c) => c.deferral?.complete !== true).map((c) => net[indexOf(ev!, c.endEarnings)]));
        landY = py(land);
        curve.append(...dropMark(x, y, landY, r));
      }
      /* The marks layer: one 44px button per mark, over the SVG (M6). */
      const mark: Mark = { cluster: cl, members, x, y, landY, waiting, btn: null as unknown as HTMLButtonElement };
      mark.btn = markButton(x, y, L, markSentence(mark), cl.cliffs.length, cl.later, {}, hitW[ci]);
      mark.btn.addEventListener("click", () => on.select(mark.members[0], markSentence(mark)));
      /* A mark reached by keyboard may be off screen: focus scrolls it into view. */
      mark.btn.addEventListener("focus", () => reveal(x));
      marksEl.append(mark.btn);
      marks.push(mark);
    }

    /* The household's zone: the peak rule, the exit, and the leap bracket. The
       peak's own dollar went on 2026-09-18 — it printed, two inches from the
       diamond's label, a number within a rounding of it (citizen review S3). */
    const yPeak = P.zone ? py(P.zone.peakNet) : NaN;
    const bx1 = P.zone ? px(P.zone.endEarnings ?? x1) : NaN;
    const lx0 = px(A.currentEarnings);
    const bracket = P.zone !== null;
    /* The leap's bracket runs along the TOP of the plot, above the zone and everything in it: on the peak
       rule it went through the diamond, and "+$13,000" sat on "net $42,797" (TASKS 2026-09-24). */
    const by = plotTop + 16, lx1 = P.raiseIsLowerBound ? W - pad.r : bx1;
    if (P.zone) {
      svg.append(mk("line", { x1: px(P.zone.startEarnings), y1: yPeak, x2: bx1, y2: yPeak, stroke: "var(--loss-3)", "stroke-width": 1 }));
      svg.append(mk("path", { d: `M${lx0} ${by - 4} V${by + 4} M${lx0} ${by} H${lx1}${P.raiseIsLowerBound ? "" : ` M${lx1} ${by - 4} V${by + 4}`}`, fill: "none", stroke: "var(--loss-3)", "stroke-width": 1 }));
      if (!P.raiseIsLowerBound) svg.append(mk("line", { x1: bx1, y1: plotTop, x2: bx1, y2: plotBot, stroke: "var(--loss-3)", "stroke-width": 1 }));
    }
    const safeApart = safe !== null && safe !== P.escapeEarnings;
    const sx = safeApart ? px(safe) : NaN;
    if (safeApart) svg.append(mk("line", { x1: sx, y1: plotTop, x2: sx, y2: plotBot, stroke: "var(--loss-3)", "stroke-width": 1 }));

    /* A what-if that is the same curve at a different pay: its own hollow diamond on the one line, under the
       household's own, which is drawn last and stays the filled one. */
    for (const [i, l] of lines.entries()) {
      if (!samePoints(l)) continue;
      const lx = Math.min(Math.max(l.at, x0), x1);
      svg.append(whatIfDot(px(lx), py(netAt(lx)), i));
    }

    /* The diamond sits on the line at the household's own pay, which may fall between two axis points. */
    const cx = px(A.currentEarnings), cy = py(netAt(A.currentEarnings));
    const [dropLine, diamondPath] = household(cx, cy, plotBot);
    svg.append(dropLine, diamondPath);
    diamond = diamondPath;

    /* ── The direct labels, in the priority order charts.md sets ────────
       Each is offered its spots and drawn at the first clear one, or dropped:
       every figure here is also in the readout, the drop row and the table. */
    for (const m of marks) label.block({ x: m.x - RING, y: m.y - RING, w: 2 * RING, h: 2 * RING });
    label.block({ x: cx - 7, y: cy - 7, w: 14, h: 14 });
    /* The line, the peak rule and the bracket are obstacles too: "TANF cash assistance ends" was struck
       through by the very curve it labels (TASKS 2026-09-24). */
    label.blockLine(line);
    if (P.zone) { label.blockLine([[px(P.zone.startEarnings), yPeak], [bx1, yPeak]]); label.blockLine([[lx0, by], [lx1, by]]); }
    /* …and the x ticks and the road's bar under the plot: a label nudged down must not land on them. */
    label.block({ x: 0, y: plotBot + 1, w: W, h: (road ? roadY + 5 : plotBot + 26) - plotBot });
    /* A mark past the fitted range is somewhere the reader is not looking: it keeps its button but no label (past the stable span, lib/chart/geometry.ts `stableSpan`). */
    const onPlot = (m: Mark) => m.y >= plotTop && m.y <= plotBot;

    /* 1. What the household keeps now, at its own diamond: the one place the y axis is named in dollars —
          and, in two words, why it is not the pay. A counselor read "net $84,371" beside a $38,000 wage and
          said her client would decide the page was about some other family. */
    const kept = netAt(A.currentEarnings);
    label.place([t(`chart.labels.net.${kept >= A.currentEarnings ? "help" : "tax"}`, { net: usd(kept) })],
      [{ x: cx, y: cy - 14, anchor: "middle" }, { x: cx, y: cy + 26, anchor: "middle" },
        { x: cx + 14, y: cy + 4, anchor: "start" }, { x: cx - 14, y: cy + 4, anchor: "end" },
        { x: cx, y: cy - 34, anchor: "middle" }, { x: cx, y: plotTop - 8, anchor: "middle" }],
      `${INK_LABEL} hg-label--strong`, true);

    /* 2. The largest drop: its money and what ends there, two lines, the heaviest ink on the picture. Always drawn. */
    const dropSpots = (m: Mark): Spot[] => {
      const tall = m.landY - m.y >= 24;
      return [
        ...(tall ? [{ x: m.x + 12, y: (m.y + m.landY) / 2 + 4, anchor: "start" } as Spot] : []),
        { x: m.x + 12, y: m.y - 9, anchor: "start" },
        { x: m.x + 12, y: m.landY + 14, anchor: "start" },
        { x: m.x, y: m.y - 26, anchor: "middle" },
        { x: m.x - 12, y: m.y - 9, anchor: "end" },
        { x: m.x - 12, y: m.landY + 14, anchor: "end" },
      ];
    };
    /* A drop's label is two lines — its money, then what ends there. A number with no cause is half a label;
       the second line is dropped only when the two-line box finds no clear spot and the one-line box does. */
    const dropLabel = (m: Mark, cls: string, force = false, nudge = force): boolean => {
      const n = m.cluster.cliffs.length;
      const money = lossFigure(m.cluster.cliffs.reduce((sum, c) => sum + c.drop, 0));
      /* A merged mark's money is the SUM of the cliffs under it, and at a phone's scale that is a different
         figure from the one a laptop prints for the same step — a counselor said she would not know which
         number to read out. The second line says how many it added up; the rows are where they separate. */
      const ends = n === 1 ? endsLine(m.cluster.cliffs[0]) : t("chart.labels.merged", { n });
      const both = ends !== null ? [money, ends] : [money];
      /* Only the promised label is nudged off its spots; any other drop's reads only beside its mark. */
      if (label.place(both, dropSpots(m), cls, false, nudge)) return true;
      if (ends !== null && label.place([money], dropSpots(m), cls, false, nudge)) return true;
      return force ? label.place(both, dropSpots(m), cls, true) : false;
    };
    const w = cliffAt(ev, A.worstCliff);
    const worstMark = w ? marks.find((m) => m.cluster.cliffs.includes(w)) : undefined;
    let labelled = 0;
    if (worstMark && onPlot(worstMark)) { dropLabel(worstMark, `${LOSS_LABEL} hg-label--strong`, true); labelled++; }

    /* 3. Every what-if's tag, at its own pay on its own curve: a second mark with no name is a mark that
          lies, so this comes before the base's own rules. Dash (or the hollow diamond) and tag together,
          never colour alone. */
    for (const l of lines) {
      const at = Math.min(Math.max(l.at, x0), x1);
      const k = Math.max(0, Math.min(l.net.length - 1, Math.round((at - l.earnings[0]) / Math.max(1, l.earnings[1] - l.earnings[0]))));
      const lx = px(at), ly = py(l.net[k]);
      label.place([l.tag],
        [{ x: lx + 10, y: ly - 6, anchor: "start" }, { x: lx + 10, y: ly + 16, anchor: "start" },
          { x: lx - 10, y: ly - 6, anchor: "end" }, { x: lx, y: ly - 22, anchor: "middle" }],
        "hg-label hg-label--whatif hg-label--halo hg-label--med");
    }

    /* 4. The way back, on its rule — dropped on a phone, where the caption says it instead. */
    if (P.zone && !P.raiseIsLowerBound && !narrow) {
      label.place([safe === P.escapeEarnings ? K.backToEvenAndSafe : K.backToEven], [{ x: bx1 + 5, y: plotTop + 12, anchor: "start" }], `${LOSS_LABEL} hg-label--med`);
    }
    if (safeApart && !narrow) label.place([K.safeFromHere], [{ x: sx + 5, y: plotTop + 12, anchor: "start" }], `${LOSS_LABEL} hg-label--med`);

    /* 5. "later", over each deferred mark's dashed stub: solid means this year, dashed means a later renewal. */
    for (const m of marks) {
      if (m.waiting) label.place([K.later], [{ x: m.x, y: m.y - 24, anchor: "middle" }], "hg-label hg-label--med hg-label--halo");
    }

    /* 6. The leap, once, on its bracket. */
    if (bracket) {
      label.place([t(`chart.leap.${P.raiseIsLowerBound ? "atLeast" : "exact"}`, { raise: usd(P.raiseToClear ?? 0) })],
        [{ x: (lx0 + lx1) / 2, y: by - 6, anchor: "middle" }, { x: (lx0 + lx1) / 2, y: by + 15, anchor: "middle" },
          { x: lx0 + 8, y: by + 15, anchor: "start" }], `${LOSS_LABEL} hg-label--strong`);
    }

    /* 7. The keep rate, written once on the road it measures: core owns the sign and the rounding, so no
          surface invents its own (app/README.md § Keep rate). */
    if (road && road.keepRate !== null) {
      const { sign, cents } = keepRateWords(road.keepRate);
      label.place([t(`chart.labels.road.${sign}`, { cents })], [{ x: (px(road.lo) + px(road.hi)) / 2, y: roadY + 18, anchor: "middle" }], "hg-label");
    }
    /* …and the road's two ends, which it did not say: the poverty line and twice it — on the keep rate's
       own line where there is room, else the line under it. */
    if (road) {
      const [ra, rb] = [px(road.lo), px(road.hi)];
      label.place([K.labels.roadFrom], [{ x: ra, y: roadY + 18, anchor: "start" }, { x: ra, y: roadY + 33, anchor: "start" }], "hg-label hg-label--end");
      label.place([K.labels.roadTo], [{ x: rb, y: roadY + 18, anchor: "end" }, { x: rb, y: roadY + 33, anchor: "end" }], "hg-label hg-label--end");
    }

    /* 8. Every remaining drop, biggest first, while there is room: a crowded stretch would otherwise spend
          its last label on the smallest step in it. Only marks inside the box the reader is looking
          through: a label for a mark off the left of the view is drawn half under the scroller's edge,
          where it reads as broken text rather than as "more over there" — two readers, in two languages,
          stopped on "…o TANF" against the left edge. The label the page promises (2) is exempt: it always
          draws, wherever its mark is. The mark, the readout and the row carry the rest. */
    const inView = (x: number) => print || (x >= host.scroll.scrollLeft && x <= host.scroll.scrollLeft + viewport);
    const rest = [...marks].filter((m) => m !== worstMark && inView(m.x) && onPlot(m)).sort((a, b) => b.cluster.cliffs.reduce((n, c) => n + c.drop, 0) - a.cluster.cliffs.reduce((n, c) => n + c.drop, 0));
    for (const m of rest) {
      if (labelled >= MAX_DROP_LABELS) break;
      /* The biggest of them may be nudged when the curve's own biggest drop is off the plot: then it is the view's lead label. */
      if (dropLabel(m, `${LOSS_LABEL} hg-label--med`, false, m === rest[0] && !(worstMark && onPlot(worstMark)))) labelled++;
    }

    /* 9. Every zone past the household's own says so at its top, so the one a counselor scrolls on to
          — often where the biggest drop is — is named as well as hatched. */
    for (const z of A.dangerZones) {
      const zx = px(z.startEarnings) + 5;
      /* Not when the zone starts just off the left of the view: half a label under the edge reads as broken text. */
      if (isPersonal(z) || z.startEarnings < A.currentEarnings || (!print && zx < host.scroll.scrollLeft)) continue;
      label.place([K.labels.again], [{ x: zx, y: plotTop + 12, anchor: "start" }], `${LOSS_LABEL} hg-label--med`);
    }

    /* The caption's clauses each come from their condition (review S5); the axis clause
       says whether the whole axis is on screen or in a scroller (§ The scroll rule). */
    host.cap.textContent = [
      t(`chart.axis.${y0 > 0 ? "aboveZero" : "fromZero"}`, { floor: usd(y0), ratio: (yRange / Math.max(1, maxDrop)).toFixed(1) }),
      t(`chart.span.${print ? "whole" : "scrolls"}`, { from: usd(x0), to: usd(x1) }),
      DEFERRED.length ? t("chart.deferred", { n: DEFERRED.length }) : K.noneDeferred,
      curves.length ? t("chart.whatIfLines", { n: curves.length }) : "",
      positions.length ? t("chart.whatIfPositions", { n: positions.length }) : "",
      whatIfs.length > lines.length ? t("chart.whatIfHeld", { held: whatIfs.length - lines.length }) : "",
      source,
      /* The one definition the shading needs (design/TASKS.md § Captions say what shading is), under the key that draws it. */
      A.dangerZones.length ? K.glossary : "",
    ].filter(Boolean).join(" ");
    /* The axis's own ends under the figure, and between them the words that
       say it slides, only while it does (the citizen chart's rule; a thumb
       reader on 2026-09-19 never learned the chart moved). */
    const slides = host.scroll.scrollWidth > host.scroll.clientWidth + 1;
    /* "Swipe" is a touch word: a mouse or a trackpad is told to scroll (TASKS 2026-09-24). */
    host.hint.replaceChildren(mkSpan(t("chart.rangeFrom", { from: usd(x0) })), ...(slides ? [mkSpan(t(finePointer() ? "chart.rangeMidPointer" : "chart.rangeMid"))] : []), mkSpan(t("chart.rangeTo", { to: usd(x1) })));
    renderKey(A.dangerZones.length > (P.zone ? 1 : 0), cliffs().some((c) => !c.deferral), DEFERRED.length > 0, !!P.zone, safe !== null, road !== null, lines);
    drawn = true;
    syncMarks(); paintCursor();
  }

  /**
   * How much of the reader's FIRST screen is still free below the figure's own
   * top (charts.md § Height): on a phone that is the difference between a
   * picture you look at and a picture you scroll past. Read once per draw,
   * never per scroll, and measured from the top of the document, because "the
   * first screen" is where a person lands. RESERVED is the figure's own words
   * under the plot — the axis hint, the readout and the disclosure's summary.
   */
  const RESERVED = 150;
  function screenLeft(): number {
    if (!wrap.isConnected) return 0;
    return Math.max(0, Math.round(innerHeight - (wrap.getBoundingClientRect().top + scrollY) - RESERVED));
  }

  /* The pay at the scroller's left edge, once the reader has moved it: a redraw for a resize must not yank the curve back to the start. */
  host.scroll.addEventListener("scroll", () => {
    if (!layer || printing) return;
    const { pad, W } = layer, x0 = earn[0], x1 = earn[earn.length - 1];
    anchor = x0 + ((host.scroll.scrollLeft - pad.l) / (W - pad.l - pad.r)) * (x1 - x0);
  }, { passive: true });

  /**
   * The y-range for the pay in [e0, e1]: `fitY` over the base's points there
   * (and the neighbours either side of the view's edges), every drawn
   * what-if's, and the diamond — then nice-stepped and snapped to a whole
   * step, at most n + 1 gridlines. `lo`/`hi` are what it was fitted to.
   */
  function yFit(e0: number, e1: number, lines: WhatIfLine[], maxDrop: number, n: number): { y0: number; y1: number; step: number; lo: number; hi: number } {
    const within = (xs: number[], vs: number[]) => vs.filter((_, i) => xs[i] >= e0 - (xs[1] - xs[0]) && xs[i] <= e1 + (xs[1] - xs[0]));
    const values = [...within(earn, net), ...lines.flatMap((l) => within(l.earnings, l.net))];
    if (ev && ev.analysis.currentEarnings >= e0 && ev.analysis.currentEarnings <= e1) values.push(netAt(ev.analysis.currentEarnings));
    if (!values.length) values.push(...net);
    const [lo, hi] = fitY(values, maxDrop);
    let step = niceStep(hi - lo, n), y0 = Math.floor(lo / step) * step, y1 = Math.ceil(hi / step) * step;
    while ((y1 - y0) / step > n + 1) { step = niceUp(step); y0 = Math.floor(lo / step) * step; y1 = Math.ceil(hi / step) * step; }
    return { y0, y1, step, lo: Math.min(...values), hi: Math.max(...values) };
  }

  /** Bring a plot-space x into view — a focused mark or the keyboard caret has to be visible. */
  function reveal(x: number): void {
    if (!layer || printing) return;
    host.scroll.scrollLeft = scrollToShow(x, host.scroll.scrollLeft, viewportW, layer.W);
  }

  /* MarkKey (#5): each entry draws the actual mark; entries follow the marks drawn. Since the direct labels
     carry the answer it is the fallback rather than the first read, and it lives inside the figure's own
     "How to read this picture" (inventory.md § The page is its picture). */
  function renderKey(otherZones: boolean, immediate: boolean, deferred: boolean, zone: boolean, safe: boolean, road: boolean, lines: WhatIfLine[]): void {
    host.key.replaceChildren(
      keyEntry(K.key.net, KEY_MARK.line),
      ...lines.map((l, i) => keyEntry(t("chart.key.whatIf", { tag: l.tag }), whatIfKeyMark(i, samePoints(l)))),
      ...(zone ? [keyEntry(K.key.ownZone, KEY_MARK.band)] : []),
      ...(otherZones ? [keyEntry(zone ? K.key.otherZones : K.key.zones, KEY_MARK.other)] : []),
      ...(immediate ? [keyEntry(K.key.immediate, KEY_MARK.drop)] : []),
      ...(deferred ? [keyEntry(K.key.deferred, KEY_MARK.later)] : []),
      keyEntry(K.key.current, KEY_MARK.you),
      ...(zone ? [keyEntry(K.key.leap, KEY_MARK.leap)] : []),
      ...(safe ? [keyEntry(K.key.safe, KEY_MARK.safe)] : []),
      ...(road ? [keyEntry(K.key.road, KEY_MARK.road)] : []),
    );
  }

  function paintCursor(): void {
    cursorNodes.forEach((n) => n.remove()); cursorNodes = [];
    if (!layer || !ev) return;
    const { px, py, pad, H } = layer;
    const e = earn[cursor], v = net[cursor];
    /* At the household's own point the diamond IS the cursor: a second dot on top of it would say nothing,
       and it is a ring the direct label at the diamond ("net $84,371") would then have to clear — the label
       the picture most needs (review S4). The readout still speaks for the point either way. */
    if (cursor !== indexOf(ev, ev.analysis.currentEarnings)) {
      const [l, dot] = cursorMarks(px(e), py(v), pad.t, H - pad.b, DOT);
      svg.insertBefore(l, diamond); svg.insertBefore(dot, diamond);   /* the household's diamond stays on top */
      cursorNodes = [l, dot];
    }
    const z = zoneOf(e);
    const R = copy.chart.readout, lead = t("chart.readout.lead", { earnings: usd(e), net: usd(v) });
    const zone = !z ? R.outside
      : isPersonal(z) ? (z.endEarnings === null ? t("chart.readout.own.toTop", { peak: usd(z.peakNet), start: usd(z.startEarnings) }) : t("chart.readout.own.toExit", { end: usd(z.endEarnings), peak: usd(z.peakNet), start: usd(z.startEarnings) }))
      : z.endEarnings === null ? t("chart.readout.other.toTop", { peak: usd(z.peakNet), start: usd(z.startEarnings) }) : t("chart.readout.other.toExit", { end: usd(z.endEarnings), peak: usd(z.peakNet), start: usd(z.startEarnings) });
    readout.textContent = `${lead} ${zone}`;
  }

  function syncMarks(): void {
    for (const m of marks) m.btn.setAttribute("aria-expanded", String(selected !== null && m.members.includes(selected)));
  }

  /* The pointer drags the cursor (never from a mark); a key moves it a point, shift ten; ] and [ walk the marks from the
     one in focus or else from the cursor — a merged mark counts by any member, so one holding the cursor's own cliff is
     the next stop, not skipped (review N4). */
  attachCursor(wrap, {
    svg, layer: () => layer, range: () => [0, earn.length - 1], cursor: () => cursor, shift: 10, pointer: "drag",
    scroller: () => host.scroll,
    set(i, by) { cursor = i; paintCursor(); if (by === "key") reveal(layer ? layer.px(earn[i]) : 0); },
    bracket(key, target) {
      const onMark = target.closest(".hg-mark");
      const here = onMark ? marks.findIndex((m) => m.btn === onMark) : -1;
      const at = earn[cursor];
      const startsAfter = (m: Mark) => m.cluster.cliffs.some((c) => c.startEarnings > at);
      const startsBefore = (m: Mark) => m.cluster.cliffs.some((c) => c.startEarnings < at);
      const i = key === "]"
        ? (here >= 0 ? here + 1 : marks.findIndex(startsAfter))
        : (here >= 0 ? here - 1 : marks.filter(startsBefore).length - 1);   /* marks are in axis order */
      if (i < 0 || i >= marks.length) return;
      marks[i].btn.focus(); cursor = indexOf(ev!, cliffs()[marks[i].members[0]].startEarnings); paintCursor();
      readout.textContent = markSentence(marks[i]);
    },
    escape: () => on.close(),
  });
  /* A width change redraws once (the column, not only the window, can change under the chart — K9), and a mark that had
     focus keeps it across the rebuild; paper is redrawn now, at one width, and back afterwards. */
  watchWidth(wrap, () => {
    const focused = marks.findIndex((m) => m.btn === document.activeElement);
    draw();
    if (focused >= 0) marks[focused]?.btn.focus();
  });
  redrawForPrint(draw, PRINT_WIDTH);

  return {
    render(next, src) {
      ev = next; source = src;
      net = next.curve.points.map((p) => p.netIncome); earn = next.curve.points.map((p) => p.earnings);
      cursor = indexOf(next, next.analysis.currentEarnings);
      selected = null;
      anchor = null;   /* a new evaluation lands on its own window, not the last one's scroll */
      draw();
    },
    setWhatIfs(next) {
      whatIfs = next;
      if (ev) draw();
    },
    setSelected(i, { moveCursor = true } = {}) {
      selected = i;
      syncMarks();
      if (i === null || !ev || !moveCursor) return;
      cursor = indexOf(ev, cliffs()[i].startEarnings);
      paintCursor();
      readout.textContent = cliffSentence(cliffs()[i]);
    },
    focusMark(i) { marks.find((m) => m.members.includes(i))?.btn.focus(); },
    say(text) { readout.textContent = text; },
  };
}
