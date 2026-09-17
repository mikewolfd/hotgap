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
import type { Cliff } from "@hotgap/core";
import { attachCursor, cursorNodes as cursorMarks, dropMark, hatchDefs, household, KEY_MARK, keyEntry, markButton, pathD, redrawForPrint, seriesPath, waitDot, waitStub, watchWidth, zoneRects } from "../lib/chart/draw.js";
import { h, svg } from "../lib/dom.js";
import { tickMoney } from "../lib/format.js";
import { copy, parts, t } from "./copy.js";
import { boundaryText, creditCounted, worstPhrase } from "./facts.js";
import { layout, type Cluster, type Layout } from "./geometry.js";
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
/** The dot radii this chart draws at (the caseworker's are a half-pixel smaller): a merged mark is r6, a single r4.5. */
const DOT = 4.5, DOT_MERGED = 6;
/** Paper is the column's width, whatever the screen was: a 358px drawing stretched to Letter prints its 12px ticks at 1.7× (S2). */
const PRINT_WIDTH = 640;

/** The key entries: each draws the actual mark (never a swatch alone); an entry for a mark not in this picture keeps its place, hidden. */
function keyList(s: Scene, hasOther: boolean, hasLater: boolean, hasDrop: boolean, hasBoundary: boolean): HTMLUListElement {
  return h("ul", { class: "hg-key" },
    keyEntry(copy.key.line, KEY_MARK.line),
    keyEntry(copy.key.band, KEY_MARK.band, !s.zone),
    keyEntry(copy.key.other, KEY_MARK.other, !hasOther),
    keyEntry(copy.key.drop, KEY_MARK.drop, !hasDrop),
    keyEntry(copy.key.later, KEY_MARK.later, !hasLater),
    keyEntry(copy.key.you, KEY_MARK.you),
    keyEntry(copy.key.boundary, KEY_MARK.boundary, !hasBoundary),
  );
}

/** The spoken shape of the curve, from the data. */
function ariaLabel(s: Scene): string {
  const { m } = s;
  const worst = s.worst ? t("chart.ariaWorst", { at: m.payUnit(s.worst.endEarnings), what: worstPhrase(s) }) : "";
  const [x0, x1] = s.window;
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
  const [x0, x1] = s.window;
  const picture = svg("svg", { "aria-hidden": "true" });
  const marksLayer = h("div", { class: "hg-marks" });
  const wrapper = h("div", { class: "hg-chart", id: "chart", tabindex: "0", role: "group", "aria-roledescription": "interactive chart", "aria-describedby": "curveCaption chartKeys", "aria-label": ariaLabel(s) }, picture, marksLayer);
  const hasOther = s.otherZones.some((z) => (z.endEarnings ?? Infinity) >= x0 && z.startEarnings <= x1);
  const hasDrop = s.inWindow.some((c) => c.deferral === null);
  const hasLater = s.inWindow.some((c) => c.deferral !== null);
  /* How the chart is operated: the readout says it until the first touch or key — the bracket keys only where there are marks and, at a
     desktop width, keys (N2) — and a visually hidden copy says all of it to a screen reader through aria-describedby. */
  const readout = h("p", { class: "hg-readout", "aria-live": "polite" }, t("chart.readoutHint") + (s.inWindow.length && innerWidth >= 720 ? t("chart.readoutMarks") : ""));
  const keys = h("p", { class: "hg-visually-hidden", id: "chartKeys" }, t("chart.readoutHint") + (s.inWindow.length ? t("chart.readoutMarks") : ""));
  const caption = h("figcaption", { id: "curveCaption" });
  /* EligibilityBoundary (#23): one line under the key, whether or not the tick is in the window; nothing when the curve ends below the
     limit. The invitation to the toggle is its own sentence and stays off paper, where there is nothing to turn on (liheap review S2);
     data-counted says which of the three states the paragraph is in — a boundary, the toggle's end, or a state credit already in the line (B1). */
  const boundary = boundaryText(s);
  const boundaryState = s.boundary?.counted ? "true" : creditCounted(s) ? "credit" : "false";
  /* The readout paints the caret only once a person has moved it; before that it holds the hint. */
  let touched = false;
  figure.append(
    h("div", { class: "chart-head" }, h("span", { class: "chart-title" }, t("chart.title")),
      h("span", { class: "chart-unit" }, t(`chart.unit.${s.pay.unit}`, s.pay.unit === "hour" ? { hours: s.pay.hours } : {}))),
    wrapper, readout, keys, keyList(s, hasOther, hasLater, hasDrop, s.boundaryInWindow),
    ...(boundary ? [h("p", { class: "boundary", id: "boundary", "data-counted": boundaryState }, boundary.facts, ...(boundary.invite ? [" ", h("span", { class: "hg-no-print" }, boundary.invite)] : []))] : []),
    caption,
  );

  let L: Layout | null = null;
  let firstDraw = true;
  let cursor = s.idx(s.current);
  let open: number | null = null;
  let cursorNodes: SVGElement[] = [];
  let clusters: Cluster[] = [];

  /* Direct labels never sit on a mark (S3): each candidate spot is tested against the dots (with the open ring's box), the diamond and the labels already placed. O(labels × marks). */
  const CH = 7.4, LH = 13;
  type Box = { x: number; y: number; w: number; h: number };
  const boxes: Box[] = [];
  const overlaps = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  const textBox = (x: number, y: number, text: string, anchor: "start" | "middle" | "end"): Box => {
    const w = text.length * CH;
    return { x: anchor === "start" ? x : anchor === "middle" ? x - w / 2 : x - w, y: y - LH, w, h: LH + 2 };
  };
  const clear = (b: Box) => !boxes.some((o) => overlaps(b, o));

  function draw(width = wrapper.clientWidth): void {
    L = layout(s, width);
    boxes.length = 0;
    const { W, H, narrow, pad, px, py, y0, y1, i0, i1 } = L;
    const top = pad.t, bottom = H - pad.b;
    picture.setAttribute("viewBox", `0 0 ${W} ${H}`);
    picture.setAttribute("width", String(W));
    picture.setAttribute("height", String(H));
    picture.textContent = "";
    picture.append(hatchDefs("hatch"));

    /* Zones: the household's gets the wash, every other one hatch alone (rule 1). */
    const clip = (z: { startEarnings: number; endEarnings: number | null }) => [px(Math.max(z.startEarnings, x0)), px(Math.min(z.endEarnings ?? x1, x1))];
    for (const z of s.otherZones) {
      if ((z.endEarnings ?? Infinity) < x0 || z.startEarnings > x1) continue;
      const [a, b] = clip(z);
      picture.append(...zoneRects(a, b, top, bottom, false, "hatch"));
    }
    const [bx0, bx1] = s.zone ? clip({ startEarnings: s.zone.startEarnings, endEarnings: s.stuck ? x1 : s.zone.endEarnings }) : [0, 0];
    if (s.zone) picture.append(...zoneRects(bx0, bx1, top, bottom, true, "hatch"));

    /* Gridlines on nice values; ticks take .hg-tick (S13). */
    for (const v of L.yTicks) {
      if (v > y0 && v < y1) picture.append(svg("line", { x1: pad.l, y1: py(v), x2: W - pad.r, y2: py(v), stroke: "var(--grid)", "stroke-width": 1 }));
      picture.append(svg("text", { x: pad.l - 8, y: py(v) + 4, "text-anchor": "end", class: "hg-tick" }, tickMoney(v, "year")));
    }
    for (const tick of L.xTicks) picture.append(svg("text", { x: px(tick.annual), y: H - 14, "text-anchor": "middle", class: "hg-tick" }, tickMoney(tick.value, s.pay.unit)));
    picture.append(svg("line", { x1: pad.l, y1: bottom, x2: W - pad.r, y2: bottom, stroke: "var(--axis)", "stroke-width": 1 }));

    /* EligibilityBoundary (#23): a tick on the axis where energy assistance stops — no dot, no connector, no drop. */
    if (s.boundaryInWindow) {
      const tx = px(s.boundary!.earningsLimit);
      picture.append(svg("line", { x1: tx, y1: bottom - 8, x2: tx, y2: bottom, stroke: "var(--ink-3)", "stroke-width": 2, "stroke-linecap": "round", "data-boundary": "true" }));
    }

    /* The peak of the household's zone: a rule across the band, labelled with the dollar (N2). */
    const yPeak = s.zone ? py(s.zone.peakNet) : NaN;
    if (s.zone) {
      picture.append(svg("line", { x1: bx0, y1: yPeak, x2: bx1, y2: yPeak, stroke: "var(--loss-3)", "stroke-width": 1 }));
      const peak = m.money(s.zone.peakNet);
      picture.append(svg("text", { x: bx0 - 16, y: yPeak - 9, "text-anchor": "end", class: `${LOSS_LABEL} hg-label--med` }, peak));
      boxes.push(textBox(bx0 - 16, yPeak - 9, peak, "end"));
    }

    /* The exit, and safe-from-here when it is a different pay (rule 2). */
    const exitInWindow = s.zone !== null && !s.stuck && s.exit !== null && s.exit <= x1;
    if (exitInWindow) {
      const ex = px(s.exit!);
      picture.append(svg("line", { x1: ex, y1: top, x2: ex, y2: bottom, stroke: "var(--loss-3)", "stroke-width": 1 }));
      if (!narrow) picture.append(svg("text", { x: ex + 6, y: top + 12, class: `${LOSS_LABEL} hg-label--med` }, s.safeExit === s.exit ? copy.chart.labels.backToEvenSafe : copy.chart.labels.backToEven));
    }
    const safeInWindow = s.safeExit !== null && s.safeExit > 0 && s.safeExit !== s.exit && s.safeExit >= x0 && s.safeExit <= x1;
    if (safeInWindow) {
      const sx = px(s.safeExit!);
      picture.append(svg("line", { x1: sx, y1: top, x2: sx, y2: bottom, stroke: "var(--loss-3)", "stroke-width": 1 }));
      if (!narrow) picture.append(svg("text", { x: sx + 6, y: top + 12, class: `${LOSS_LABEL} hg-label--med` }, copy.chart.labels.safe));
    }
    /* Whether the words "safe from here" are on the picture: on a phone they are not, and the caption says it instead (S4). */
    const safeSaid = !narrow && ((exitInWindow && s.safeExit === s.exit) || safeInWindow);

    /* The line: one series, 2px, round caps, no fill; .hg-draw on the first draw only. */
    const window = Array.from({ length: i1 - i0 + 1 }, (_, k) => i0 + k);
    picture.append(seriesPath(pathD(window.map((i) => [px(s.earningsAt(i)), py(s.net[i])])), firstDraw));

    /* The leap (S7): a bracket 20px above the peak rule, from the diamond to the exit, labelled once. */
    const cx = px(s.current);
    let cy = py(s.currentNet);
    clusters = L.clusters;
    /* The diamond must not cover a mark (B1): within a dot's reach of one, it slides down its own drop line. */
    const RING = 10;
    const dotY = (cl: Cluster) => py(s.net[s.idx(cl.cliffs[0].startEarnings)]);
    if (clusters.some((cl) => Math.abs(cl.x - cx) < RING && Math.abs(dotY(cl) - cy) < RING)) cy += 2 * RING;
    const diamond: Box = { x: cx - 7, y: cy - 7, w: 14, h: 14 };
    for (const cl of clusters) boxes.push({ x: cl.x - RING, y: dotY(cl) - RING, w: 2 * RING, h: 2 * RING });
    boxes.push(diamond);

    const bracket = s.zone !== null && (s.stuck || exitInWindow);
    const by = yPeak - 20;
    if (bracket) {
      const bx = s.stuck ? W - pad.r : px(s.exit!);
      picture.append(svg("path", { d: `M${cx} ${by + 4} V${by} H${bx}` + (s.stuck ? "" : ` V${by + 4}`), fill: "none", stroke: "var(--loss-3)", "stroke-width": 1 }));
      const leap = t(s.stuck ? "chart.labels.leapMore" : "chart.labels.leap", { leap: m.diff(s.current, s.stuck ? s.top : s.exit!) });
      picture.append(svg("text", { x: (cx + bx) / 2, y: by - 5, "text-anchor": "middle", class: `${LOSS_LABEL} hg-label--strong` }, leap));
      boxes.push(textBox((cx + bx) / 2, by - 5, leap, "middle"));
    }

    /* Cliff marks (S8): a cluster is one dot at the first cliff's top. The
       immediate cliffs under it draw the solid --loss-4 dot and a connector to
       the lowest landing; a deferred one keeps its own channel — the dashed
       stub and the word later — beside them, and alone it is the hollow dot
       (B1: a mixed cluster never hides the loss that waits). */
    for (const cl of clusters) {
      const y = dotY(cl), r = cl.cliffs.length > 1 ? DOT_MERGED : DOT;
      const waiting = cl.cliffs.some((c) => c.deferral !== null);
      if (waiting) {
        picture.append(waitStub(cl.x, y, 22));
        picture.append(svg("text", { x: cl.x, y: y - 28, "text-anchor": "middle", class: "hg-label hg-label--med" }, copy.chart.labels.later));
        boxes.push(textBox(cl.x, y - 28, copy.chart.labels.later, "middle"));
      }
      if (cl.later) {
        picture.append(waitDot(cl.x, y, r));
        continue;
      }
      const land = Math.min(...cl.cliffs.filter((c) => c.deferral === null).map((c) => s.net[s.idx(c.endEarnings)]));
      picture.append(...dropMark(cl.x, y, py(land), r));
      /* The chart's other direct label: the biggest drop. Beside a tall
         connector first; else above the dot, below the landing, or on the
         other side of the connector — the first spot that lies on nothing
         already drawn (S3). */
      if (L.labelled && cl.cliffs.includes(L.labelled)) {
        const label = t("chart.labels.drop", { drop: m.money(L.labelled.drop) });
        const tall = py(land) - y >= 24;
        const spots: [number, number, "start" | "end"][] = [
          ...(tall ? [[cl.x + 12, (y + py(land)) / 2 + 4, "start"] as [number, number, "start"]] : []),
          [cl.x + 12, y - 9, "start"], [cl.x + 12, py(land) + 14, "start"], [cl.x - 12, y - 9, "end"], [cl.x - 12, py(land) + 14, "end"],
        ];
        const spot = spots.find(([x, yy, a]) => clear(textBox(x, yy, label, a))) ?? spots[0];
        picture.append(svg("text", { x: spot[0], y: spot[1], "text-anchor": spot[2], class: `${LOSS_LABEL} hg-label--strong` }, label));
        boxes.push(textBox(spot[0], spot[1], label, spot[2]));
      }
    }

    /* You are here: a diamond, so position survives greyscale — drawn last, on its own drop line. */
    picture.append(...household(cx, cy, bottom));
    picture.append(svg("text", { x: cx, y: top - 8, "text-anchor": "middle", class: "hg-label hg-label--ink hg-label--strong" }, copy.chart.labels.you));

    /* The caption, from the values just computed (never typed). */
    let text = y0 > 0 ? t(L.maxDrop >= 0.1 * (y1 - y0) ? "chart.axisNote" : "chart.axisNoteBare", { floor: m.money(y0) }) : "";
    if (s.worst && !L.labelled) text += t("chart.biggestBeyond", { drop: m.about(s.worst.drop), pay: m.pay(s.worst.endEarnings) });
    if (s.safeExit === null) text += t("chart.safeNever", { top: m.pay(s.top) });
    else if (s.safeExit > 0 && !safeSaid) text += t("chart.safeBeyond", { safe: m.pay(s.safeExit) });
    caption.textContent = (text + t("chart.estimates", { year: s.ev.curve.year, state: s.stateName })).trim();

    wrapper.dataset.yratio = L.maxDrop ? ((y1 - y0) / L.maxDrop).toFixed(2) : "";
    firstDraw = false;
    paintMarks();
    if (touched) paintCursor();
  }

  /* Cliff marks as controls (M6): one 44px button per cluster and per deferred cliff. */
  const keyOf = (c: Cliff) => c.endEarnings;
  function paintMarks(): void {
    if (!L) return;
    // A repaint (a resize) must not drop the mark that has focus.
    const focused = (document.activeElement as HTMLElement | null)?.closest(".hg-mark")?.getAttribute("data-key") ?? null;
    marksLayer.textContent = "";
    for (const cl of clusters) {
      const key = keyOf(cl.cliffs[0]);
      const b = markButton(cl.x, L.py(s.net[s.idx(cl.cliffs[0].startEarnings)]), L, markLabel(s, cl), cl.cliffs.length, cl.later,
        { "data-key": String(key), "aria-controls": `step-${key}`, "aria-expanded": String(open === key) });
      b.addEventListener("click", () => {
        touched = true;
        cursor = s.idx(cl.cliffs[0].startEarnings);
        paintCursor();
        readout.textContent = markLabel(s, cl);
        hooks.onActivate(cl.cliffs[0]);
      });
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
    set(i) { cursor = i; touched = true; paintCursor(); },
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
