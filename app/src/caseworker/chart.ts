// MoneyCurve (#3), CurveReadout (#4) and MarkKey (#5) for the caseworker:
// the full axis, the line, the household's zone with its peak rule,
// exit and leap bracket, every other zone as hatch, cliff marks as 44px
// controls with the collision rule, and the keyboard model (design/charts.md
// § 1, M6, S8, S12), over the primitives both charts share (lib/chart;
// audit D10). One selection model: a mark and its DropLedger row share
// `selected`, which main.ts owns; this module reports presses and mirrors
// the selection onto the marks. Every word is copy.ts's.
//
// A draw is O(points + cliffs + zones); a width change redraws once; print
// redraws synchronously at a fixed width (review N6).
import type { Cliff, HouseholdEvaluation } from "@hotgap/core";
import { attachCursor, cursorNodes as cursorMarks, dropMark, hatchDefs, household, KEY_MARK, keyEntry, markButton, pathD, redrawForPrint, seriesPath, waitDot, waitStub, watchWidth, zoneRects } from "../lib/chart/draw.js";
import { clusterCliffs, layerFor, niceStep, niceUp, type Cluster, type Layer } from "../lib/chart/geometry.js";
import { svg as mk } from "../lib/dom.js";
import { lossFigure, money as usd, tickMoney } from "../lib/format.js";
import { pluralKey } from "../lib/copy.js";
import { copy, t } from "./copy.js";
import { cliffAt, cliffSentence, indexOf } from "./model.js";

export interface ChartHost { wrap: HTMLElement; svg: SVGSVGElement; marks: HTMLElement; readout: HTMLElement; key: HTMLElement; cap: HTMLElement }

export interface Chart {
  /** Draw an evaluation; `source` closes the caption. The first draw animates the line. */
  render(ev: HouseholdEvaluation, source: string): void;
  /** Mirror the page's selection onto the marks; a press also moves the cursor and the readout to the cliff, the initial selection does not. */
  setSelected(i: number | null, opts?: { moveCursor?: boolean }): void;
  /** Focus returns to a cliff's mark when its row closes. */
  focusMark(i: number): void;
  say(text: string): void;
}

/** A mark on this chart: its cluster (the cliffs under it, by index into the cliff list) and its control. */
interface Mark { cluster: Cluster; members: number[]; x: number; y: number; btn: HTMLButtonElement }

/** The width the curve is drawn at on paper, whatever the screen was (review N6): 42rem at 16px. */
const PRINT_WIDTH = 672;
/** A mark's ring, the box a direct label must clear (review S4). */
const RING = 10;
/** One line of a 13px label, the step a colliding label is lifted by. */
const LINE = 14;
/** The dot radii this chart draws at: a merged mark is r6, a single r4; the cursor's dot r4. */
const DOT = 4, DOT_MERGED = 6;

export function mountChart(host: ChartHost, on: { select(i: number, announce?: string): void; close(): void }): Chart {
  const { wrap, svg, marks: marksEl, readout } = host;
  const K = copy.chart;
  let ev: HouseholdEvaluation | null = null;
  let source = "";
  let net: number[] = [], earn: number[] = [];
  let cursor = 0, layer: Layer | null = null, cursorNodes: SVGElement[] = [], marks: Mark[] = [], drawn = false;
  let diamond: SVGElement | null = null, selected: number | null = null;

  const cliffs = (): Cliff[] => ev!.analysis.cliffs;
  const markSentence = (m: Mark): string => m.members.length === 1 ? cliffSentence(cliffs()[m.members[0]])
    : t("chart.merged", { n: m.members.length, from: usd(cliffs()[m.members[0]].startEarnings), to: usd(cliffs()[m.members[m.members.length - 1]].endEarnings), sum: usd(m.members.reduce((s, i) => s + cliffs()[i].drop, 0)) });
  const zoneOf = (e: number) => ev!.analysis.dangerZones.find((z) => e > z.startEarnings && (z.endEarnings === null || e < z.endEarnings)) ?? null;
  const isPersonal = (z: { startEarnings: number } | null) => !!z && !!ev!.personal.zone && z.startEarnings === ev!.personal.zone.startEarnings;
  const label = (x: number, y: number, text: string, extra: Record<string, string | number> = {}, cls = "") =>
    mk("text", { class: `hg-label hg-label--halo${cls ? ` ${cls}` : ""}`, x, y, ...extra }, text);
  /** The line's value at any earnings, interpolated between the two axis points around it. */
  const netAt = (e: number): number => {
    const f = (e - earn[0]) / (earn[1] - earn[0]), i = Math.max(0, Math.min(net.length - 2, Math.floor(f)));
    return net[i] + (net[i + 1] - net[i]) * Math.max(0, Math.min(1, f - i));
  };
  /**
   * A direct label must not sit on a mark's ring (review S4): once it is in
   * the tree its box is measured, and while it crosses a ring it is lifted
   * a line — the same test the marks run against each other.
   */
  const clearRings = (el: SVGTextElement, rings: { x: number; y: number }[]): void => {
    for (let tries = 0; tries < 3; tries++) {
      const b = el.getBBox();
      const hit = rings.some((r) => b.x < r.x + RING && b.x + b.width > r.x - RING && b.y < r.y + RING && b.y + b.height > r.y - RING);
      if (!hit) return;
      el.setAttribute("y", String(Number(el.getAttribute("y")) - LINE));
    }
  };

  function draw(width = Math.max(320, wrap.clientWidth)): void {
    if (!ev) return;
    const A = ev.analysis, P = ev.personal, DEFERRED = ev.deferred;
    const safe = ev.escape.safeExitEarnings;
    const W = width, narrow = W < 520;
    const H = narrow ? 240 : 320;
    const pad = { t: 30, r: 14, b: 34, l: 52 };
    const x0 = earn[0], x1 = earn[earn.length - 1];
    /* Axis honesty (charts.md): the floor is computed, never typed, and the
       visible range is at least 2.5× the largest plotted drop (S14). */
    let lo = Math.min(...net), hi = Math.max(...net);
    const maxDrop = Math.max(0, ...cliffs().map((c) => c.drop)), need = 2.5 * maxDrop;
    if (hi - lo < need) { const ext = (need - (hi - lo)) / 2; lo -= ext; hi += ext; }
    const n = narrow ? 3 : 5;
    let step = niceStep(hi - lo, n), y0 = Math.floor(lo / step) * step, y1 = Math.ceil(hi / step) * step;
    while ((y1 - y0) / step > n + 1) { step = niceUp(step); y0 = Math.floor(lo / step) * step; y1 = Math.ceil(hi / step) * step; }
    const L = layerFor(W, H, pad, x0, x1, y0, y1), { px, py } = L;
    const plotTop = pad.t, plotBot = H - pad.b;

    svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("height", String(H));
    svg.textContent = "";
    svg.append(hatchDefs("cw-hatch"));

    /* Zones: the household's own gets the wash, the peak rule, the exit and the
       bracket; every other zone is hatch alone (S7). */
    for (const z of A.dangerZones) svg.append(...zoneRects(px(z.startEarnings), px(z.endEarnings ?? x1), plotTop, plotBot, isPersonal(z), "cw-hatch"));
    for (let v = y0; v <= y1 + 1; v += step) {
      svg.append(mk("line", { x1: pad.l, y1: py(v), x2: W - pad.r, y2: py(v), stroke: "var(--grid)", "stroke-width": 1 }));
      svg.append(mk("text", { class: "hg-tick", x: pad.l - 7, y: py(v) + 4, "text-anchor": "end" }, tickMoney(v, "year")));
    }
    const xs = niceStep(x1 - x0, narrow ? 3 : 6);
    for (let e = x0; e <= x1; e += xs) svg.append(mk("text", { class: "hg-tick", x: px(e), y: H - 12, "text-anchor": "middle" }, tickMoney(e, "year")));
    svg.append(mk("line", { x1: pad.l, y1: plotBot, x2: W - pad.r, y2: plotBot, stroke: "var(--axis)", "stroke-width": 1 }));

    const yRange = y1 - y0;
    svg.append(seriesPath(pathD(net.map((v, i) => [px(earn[i]), py(v)])), !drawn));   /* the one orchestrated moment, first draw only */

    /* Cliff marks, with the collision rule (S8): adjacent dots closer than 10px
       merge into one mark with a count — a mixed cluster keeps the waits
       channel beside the drop, alone it is the hollow dot (citizen review
       B1); the ledger is where they separate. */
    marks = [];
    marksEl.textContent = "";
    for (const cl of clusterCliffs(cliffs(), px)) {
      const members = cl.cliffs.map((c) => cliffs().indexOf(c));
      const x = cl.x, y = py(net[indexOf(ev, cl.cliffs[0].startEarnings)]), r = cl.cliffs.length > 1 ? DOT_MERGED : DOT;
      if (cl.cliffs.some((c) => c.deferral)) {
        svg.append(waitStub(x, y, 18));
        svg.append(label(x + 7, y - 8, K.later));
      }
      if (cl.later) svg.append(waitDot(x, y, r));
      else {
        const land = Math.min(...cl.cliffs.filter((c) => !c.deferral).map((c) => net[indexOf(ev!, c.endEarnings)]));
        svg.append(...dropMark(x, y, py(land), r));
      }
      /* The marks layer: one 44px button per mark, over the SVG (M6). */
      const mark: Mark = { cluster: cl, members, x, y, btn: null as unknown as HTMLButtonElement };
      mark.btn = markButton(x, y, L, markSentence(mark), cl.cliffs.length, cl.later);
      mark.btn.addEventListener("click", () => on.select(mark.members[0], markSentence(mark)));
      marksEl.append(mark.btn);
      marks.push(mark);
    }
    const rings = marks.map((m) => ({ x: m.x, y: m.y }));

    /* Direct labels: the largest drop and the leap (charts.md § Direct labels), lifted off any ring they cross. */
    const w = cliffAt(ev, A.worstCliff);
    if (w) {
      const wm = marks.find((m) => m.members.includes(cliffs().indexOf(w)))!;
      const mid = (net[indexOf(ev, w.startEarnings)] + net[indexOf(ev, w.endEarnings)]) / 2;
      const worstLabel = label(wm.x + 9, py(mid) + 4, lossFigure(w.drop), {}, "hg-label--loss hg-label--strong");
      svg.append(worstLabel); clearRings(worstLabel, rings);
    }
    if (P.zone) {
      const bx0 = px(P.zone.startEarnings), bx1 = px(P.zone.endEarnings ?? x1), yp = py(P.zone.peakNet);
      svg.append(mk("line", { x1: bx0, y1: yp, x2: bx1, y2: yp, stroke: "var(--loss-3)", "stroke-width": 1 }));
      const peak = label(bx0 - 4, yp - 6, usd(P.zone.peakNet), { "text-anchor": "end" }, "hg-label--loss");
      svg.append(peak); clearRings(peak, rings);
      /* The leap: a bracket along the peak rule from the diamond to the exit, labelled once. */
      const lx0 = px(A.currentEarnings), lx1 = P.raiseIsLowerBound ? W - pad.r : bx1;
      svg.append(mk("path", { d: `M${lx0} ${yp - 4} V${yp + 4} M${lx0} ${yp} H${lx1}${P.raiseIsLowerBound ? "" : ` M${lx1} ${yp - 4} V${yp + 4}`}`, fill: "none", stroke: "var(--loss-3)", "stroke-width": 1 }));
      /* Below 520px the merged cliff mark sits on the peak, so the label starts under the bracket; either way it clears every ring. */
      const leap = label(lx0 + 8, narrow ? yp + 17 : yp - 6, t(`chart.leap.${P.raiseIsLowerBound ? "atLeast" : "exact"}`, { raise: usd(P.raiseToClear ?? 0) }), {}, "hg-label--loss hg-label--strong");
      svg.append(leap); clearRings(leap, rings);
      if (!P.raiseIsLowerBound) {
        svg.append(mk("line", { x1: bx1, y1: plotTop, x2: bx1, y2: plotBot, stroke: "var(--loss-3)", "stroke-width": 1 }));
        const both = safe === P.escapeEarnings;
        if (!narrow || both) svg.append(label(bx1 + 4, plotTop - 8, both ? K.backToEvenAndSafe : K.backToEven));
      }
    }
    if (safe !== null && safe !== P.escapeEarnings) {
      const sx = px(safe);
      svg.append(mk("line", { x1: sx, y1: plotTop, x2: sx, y2: plotBot, stroke: "var(--loss-3)", "stroke-width": 1 }));
      svg.append(label(sx - 4, plotTop - 8, K.safeFromHere, { "text-anchor": "end" }));
    }
    /* The diamond sits on the line at the household's own pay, which may fall between two axis points. */
    const cx = px(A.currentEarnings), cy = py(netAt(A.currentEarnings));
    const [dropLine, diamondPath] = household(cx, cy, plotBot);
    svg.append(dropLine, diamondPath);
    diamond = diamondPath;

    /* The caption's clauses each come from their condition (review S5). */
    host.cap.textContent = [
      t(`chart.axis.${y0 > 0 ? "aboveZero" : "fromZero"}`, { floor: usd(y0), ratio: (yRange / Math.max(1, maxDrop)).toFixed(1) }),
      DEFERRED.length ? t(`chart.deferred.${pluralKey(DEFERRED.length)}`, { n: DEFERRED.length }) : K.noneDeferred,
      source,
    ].join(" ");
    renderKey(A.dangerZones.length > (P.zone ? 1 : 0), cliffs().some((c) => !c.deferral), DEFERRED.length > 0, !!P.zone, safe !== null);
    layer = L; drawn = true;
    syncMarks(); paintCursor();
  }

  /* MarkKey (#5): each entry draws the actual mark; entries follow the marks drawn. */
  function renderKey(otherZones: boolean, immediate: boolean, deferred: boolean, zone: boolean, safe: boolean): void {
    host.key.replaceChildren(
      keyEntry(K.key.net, KEY_MARK.line),
      ...(zone ? [keyEntry(K.key.ownZone, KEY_MARK.band)] : []),
      ...(otherZones ? [keyEntry(zone ? K.key.otherZones : K.key.zones, KEY_MARK.other)] : []),
      ...(immediate ? [keyEntry(K.key.immediate, KEY_MARK.drop)] : []),
      ...(deferred ? [keyEntry(K.key.deferred, KEY_MARK.later)] : []),
      keyEntry(K.key.current, KEY_MARK.you),
      ...(zone ? [keyEntry(K.key.leap, KEY_MARK.leap)] : []),
      ...(safe ? [keyEntry(K.key.safe, KEY_MARK.safe)] : []),
    );
  }

  function paintCursor(): void {
    cursorNodes.forEach((n) => n.remove()); cursorNodes = [];
    if (!layer || !ev) return;
    const { px, py, pad, H } = layer;
    const e = earn[cursor], v = net[cursor];
    const [l, dot] = cursorMarks(px(e), py(v), pad.t, H - pad.b, DOT);
    svg.insertBefore(l, diamond); svg.insertBefore(dot, diamond);   /* the household's diamond stays on top */
    cursorNodes = [l, dot];
    const z = zoneOf(e);
    const R = copy.chart.readout, lead = t("chart.readout.lead", { earnings: usd(e), net: usd(v) });
    const zone = !z ? R.outside
      : isPersonal(z) ? (z.endEarnings === null ? t("chart.readout.own.toTop", { peak: usd(z.peakNet), start: usd(z.startEarnings) }) : t("chart.readout.own.toExit", { end: usd(z.endEarnings), peak: usd(z.peakNet), start: usd(z.startEarnings) }))
      : z.endEarnings === null ? t("chart.readout.other.toTop", { start: usd(z.startEarnings) }) : t("chart.readout.other.toExit", { start: usd(z.startEarnings), end: usd(z.endEarnings) });
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
    set(i) { cursor = i; paintCursor(); },
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
      draw();
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
