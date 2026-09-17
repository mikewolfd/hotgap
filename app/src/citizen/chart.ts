// MoneyCurve (#3), CurveReadout (#4) and MarkKey (#5) as DOM, drawn from a
// Scene and the geometry in geometry.ts (design/charts.md § 1). The SVG is
// aria-hidden; the wrapper is the chart's one tab stop (role="group" with
// keys), and each cliff is a 44px .hg-mark button over the dot (M6). The
// line animates through .hg-draw on the first draw of an evaluation only; a
// redraw for a resize re-creates the path without the class.
//
// A draw is O(points in the window + cliffs); a pointer move or a key is
// O(1) — an index and one readout sentence — and never redraws the curve.
import type { Cliff } from "@hotgap/core";
import { h, svg } from "../lib/dom.js";
import { tickMoney } from "../lib/format.js";
import { copy, parts, t } from "./copy.js";
import { boundaryText, worstPhrase } from "./facts.js";
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

/** The key entries: each draws the actual mark (never a swatch alone). */
function keyList(s: Scene, hasOther: boolean, hasLater: boolean, hasDrop: boolean, hasBoundary: boolean): HTMLUListElement {
  const entry = (label: string, inner: string, hidden = false) => {
    const li = h("li", { hidden }, label);
    const pic = svg("svg", { viewBox: "0 0 22 12", "aria-hidden": "true" });
    pic.innerHTML = inner;
    li.prepend(pic);
    return li;
  };
  return h("ul", { class: "hg-key" },
    entry(copy.key.line, `<line x1="1" y1="6" x2="21" y2="6" stroke="var(--series-1)" stroke-width="2.5" stroke-linecap="round"/>`),
    entry(copy.key.band, `<rect x="1" y="1" width="20" height="10" fill="var(--loss-wash)" stroke="var(--loss-3)" stroke-width="1"/><path d="M1 11 L11 1 M11 11 L21 1" stroke="var(--loss-hatch)" stroke-width="1.5"/>`, !s.zone),
    entry(copy.key.other, `<path d="M1 11 L11 1 M11 11 L21 1" stroke="var(--loss-hatch)" stroke-width="1.5"/>`, !hasOther),
    entry(copy.key.drop, `<line x1="11" y1="1" x2="11" y2="11" stroke="var(--loss-4)" stroke-width="2.5"/><circle cx="11" cy="2.5" r="2.5" fill="var(--loss-4)"/>`, !hasDrop),
    entry(copy.key.later, `<line x1="11" y1="1" x2="11" y2="11" stroke="var(--ink-3)" stroke-width="2" stroke-dasharray="3 2.5"/><circle cx="11" cy="2.5" r="2.5" fill="var(--surface)" stroke="var(--ink-3)" stroke-width="1.5"/>`, !hasLater),
    entry(copy.key.you, `<path d="M11 1.5 L15.5 6 L11 10.5 L6.5 6 Z" fill="var(--ink)" stroke="var(--surface)" stroke-width="1.5"/>`),
    /* EligibilityBoundary (#23): the axis tick, and nothing that looks like a loss. */
    entry(copy.key.boundary, `<line x1="1" y1="11" x2="21" y2="11" stroke="var(--axis)" stroke-width="1"/><line x1="11" y1="3" x2="11" y2="11" stroke="var(--ink-3)" stroke-width="2"/>`, !hasBoundary),
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
  /* EligibilityBoundary (#23): one line under the key, whether or not the tick is in the window; nothing when the curve ends below the limit. */
  const boundary = boundaryText(s);
  /* The readout paints the caret only once a person has moved it; before that it holds the hint. */
  let touched = false;
  figure.append(
    h("div", { class: "chart-head" }, h("span", { class: "chart-title" }, t("chart.title")),
      h("span", { class: "chart-unit" }, t(`chart.unit.${s.pay.unit}`, s.pay.unit === "hour" ? { hours: s.pay.hours } : {}))),
    wrapper, readout, keys, keyList(s, hasOther, hasLater, hasDrop, s.boundaryInWindow),
    ...(boundary ? [h("p", { class: "boundary", id: "boundary", "data-counted": String(s.boundary!.counted) }, boundary)] : []),
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

    const defs = svg("defs");
    const pat = svg("pattern", { id: "hatch", width: 7, height: 7, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" });
    pat.append(svg("line", { x1: 0, y1: 0, x2: 0, y2: 7, stroke: "var(--loss-hatch)", "stroke-width": 1.25 }));
    defs.append(pat);
    picture.append(defs);

    /* Zones: the household's gets the wash, every other one hatch alone (rule 1). */
    const clip = (z: { startEarnings: number; endEarnings: number | null }) => [px(Math.max(z.startEarnings, x0)), px(Math.min(z.endEarnings ?? x1, x1))];
    for (const z of s.otherZones) {
      if ((z.endEarnings ?? Infinity) < x0 || z.startEarnings > x1) continue;
      const [a, b] = clip(z);
      picture.append(svg("rect", { x: a, y: top, width: b - a, height: bottom - top, fill: "url(#hatch)" }));
    }
    const [bx0, bx1] = s.zone ? clip({ startEarnings: s.zone.startEarnings, endEarnings: s.stuck ? x1 : s.zone.endEarnings }) : [0, 0];
    if (s.zone) {
      picture.append(svg("rect", { x: bx0, y: top, width: bx1 - bx0, height: bottom - top, fill: "var(--loss-wash)" }));
      picture.append(svg("rect", { x: bx0, y: top, width: bx1 - bx0, height: bottom - top, fill: "url(#hatch)" }));
    }

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
      picture.append(svg("text", { x: bx0 - 16, y: yPeak - 9, "text-anchor": "end", class: LOSS_LABEL, "font-weight": 500 }, peak));
      boxes.push(textBox(bx0 - 16, yPeak - 9, peak, "end"));
    }

    /* The exit, and safe-from-here when it is a different pay (rule 2). */
    const exitInWindow = s.zone !== null && !s.stuck && s.exit !== null && s.exit <= x1;
    if (exitInWindow) {
      const ex = px(s.exit!);
      picture.append(svg("line", { x1: ex, y1: top, x2: ex, y2: bottom, stroke: "var(--loss-3)", "stroke-width": 1 }));
      if (!narrow) picture.append(svg("text", { x: ex + 6, y: top + 12, class: LOSS_LABEL, "font-weight": 500 }, s.safeExit === s.exit ? copy.chart.labels.backToEvenSafe : copy.chart.labels.backToEven));
    }
    const safeInWindow = s.safeExit !== null && s.safeExit > 0 && s.safeExit !== s.exit && s.safeExit >= x0 && s.safeExit <= x1;
    if (safeInWindow) {
      const sx = px(s.safeExit!);
      picture.append(svg("line", { x1: sx, y1: top, x2: sx, y2: bottom, stroke: "var(--loss-3)", "stroke-width": 1 }));
      if (!narrow) picture.append(svg("text", { x: sx + 6, y: top + 12, class: LOSS_LABEL, "font-weight": 500 }, copy.chart.labels.safe));
    }
    /* Whether the words "safe from here" are on the picture: on a phone they are not, and the caption says it instead (S4). */
    const safeSaid = !narrow && ((exitInWindow && s.safeExit === s.exit) || safeInWindow);

    /* The line: one series, 2px, round caps, no fill; .hg-draw on the first draw only. */
    let d = "";
    for (let i = i0; i <= i1; i++) d += (i === i0 ? "M" : "L") + px(s.earningsAt(i)) + " " + py(s.lifted[i]);
    picture.append(svg("path", { d, fill: "none", stroke: "var(--series-1)", "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round", pathLength: 1, class: firstDraw ? "hg-draw" : undefined }));

    /* The ghost: the real curve, only when a deferred drop is visible at this range. */
    if (L.ghost) {
      let g = "";
      for (let i = i0; i <= i1; i++) g += (i === i0 ? "M" : "L") + px(s.earningsAt(i)) + " " + py(s.net[i]);
      picture.append(svg("path", { d: g, fill: "none", stroke: "var(--ink-3)", "stroke-width": 1.5, "stroke-dasharray": "4 3" }));
    }

    /* The leap (S7): a bracket 20px above the peak rule, from the diamond to the exit, labelled once. */
    /* The diamond sits at the household's own money today (analysis.currentNet is the real curve's), which is off the lifted line only past a deferred step, where the ghost shows why. */
    const cx = px(s.current);
    let cy = py(s.currentNet);
    clusters = L.clusters;
    /* The diamond must not cover a mark (B1): within a dot's reach of one, it slides down its own drop line. */
    const RING = 10;
    const dotY = (cl: Cluster) => py(s.lifted[s.idx(cl.cliffs[0].startEarnings)]);
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
      picture.append(svg("text", { x: (cx + bx) / 2, y: by - 5, "text-anchor": "middle", class: LOSS_LABEL, "font-weight": 600 }, leap));
      boxes.push(textBox((cx + bx) / 2, by - 5, leap, "middle"));
    }

    /* Cliff marks (S8): a cluster is one dot at the first cliff's top. The
       immediate cliffs under it draw the solid --loss-4 dot and a connector to
       the lowest landing; a deferred one keeps its own channel — the dashed
       stub and the word later — beside them, and alone it is the hollow dot
       (B1: a mixed cluster never hides the loss that waits). */
    for (const cl of clusters) {
      const first = cl.cliffs[0], n = cl.cliffs.length;
      const y = dotY(cl);
      const waiting = cl.cliffs.some((c) => c.deferral !== null);
      if (waiting) {
        picture.append(svg("line", { x1: cl.x, y1: y - 22, x2: cl.x, y2: y - 2, stroke: "var(--ink-3)", "stroke-width": 2, "stroke-dasharray": "4 3" }));
        picture.append(svg("text", { x: cl.x, y: y - 28, "text-anchor": "middle", class: "hg-label", "font-weight": 500 }, copy.chart.labels.later));
        boxes.push(textBox(cl.x, y - 28, copy.chart.labels.later, "middle"));
      }
      if (cl.later) {
        picture.append(svg("circle", { cx: cl.x, cy: y, r: n > 1 ? 6 : 4.5, fill: "var(--surface)", stroke: "var(--ink-3)", "stroke-width": 2 }));
        continue;
      }
      const land = Math.min(...cl.cliffs.filter((c) => c.deferral === null).map((c) => s.lifted[s.idx(c.endEarnings)]));
      picture.append(svg("line", { x1: cl.x, y1: y, x2: cl.x, y2: py(land), stroke: "var(--loss-4)", "stroke-width": 2.5, "stroke-linecap": "round" }));
      picture.append(svg("circle", { cx: cl.x, cy: y, r: n > 1 ? 6 : 4.5, fill: "var(--loss-4)", stroke: "var(--surface)", "stroke-width": 2 }));
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
        picture.append(svg("text", { x: spot[0], y: spot[1], "text-anchor": spot[2], class: LOSS_LABEL, "font-weight": 600 }, label));
        boxes.push(textBox(spot[0], spot[1], label, spot[2]));
      }
    }

    /* You are here: a diamond, so position survives greyscale — drawn last, on its own drop line. */
    picture.append(svg("line", { x1: cx, y1: cy, x2: cx, y2: bottom, stroke: "var(--ink-3)", "stroke-width": 1 }));
    picture.append(svg("path", { d: `M${cx} ${cy - 6} L${cx + 6} ${cy} L${cx} ${cy + 6} L${cx - 6} ${cy} Z`, fill: "var(--ink)", stroke: "var(--surface)", "stroke-width": 2 }));
    picture.append(svg("text", { x: cx, y: top - 8, "text-anchor": "middle", class: "hg-label hg-label--ink", "font-weight": 600 }, copy.chart.labels.you));

    /* The caption, from the values just computed (never typed). */
    let text = y0 > 0 ? t(L.maxDrop >= 0.1 * (y1 - y0) ? "chart.axisNote" : "chart.axisNoteBare", { floor: m.money(y0) }) : "";
    if (s.worst && !L.labelled) text += t("chart.biggestBeyond", { drop: m.about(s.worst.drop), pay: m.pay(s.worst.endEarnings) });
    if (s.safeExit === null) text += t("chart.safeNever", { top: m.pay(s.top) });
    else if (s.safeExit > 0 && !safeSaid) text += t("chart.safeBeyond", { safe: m.pay(s.safeExit) });
    // A household already past a deferred step is on the dashed line today (evaluate.ts: currentNet stays the real curve's).
    if (L.ghost) text += t(s.deferred.some((c) => c.startEarnings < s.current) ? "chart.ghostNow" : "chart.ghost");
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
      const b = h("button", { type: "button", class: "hg-mark", tabindex: "-1", "data-key": key,
        "aria-label": markLabel(s, cl), "aria-controls": `step-${key}`, "aria-expanded": String(open === key) });
      b.style.left = `${(cl.x / L.W) * 100}%`;
      b.style.top = `${(L.py(s.lifted[s.idx(cl.cliffs[0].startEarnings)]) / L.H) * 100}%`;
      if (cl.cliffs.length > 1) b.append(h("span", { class: cl.later ? "hg-mark__count hg-mark__count--later" : "hg-mark__count", "aria-hidden": "true" }, String(cl.cliffs.length)));
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
    const e = atYou ? s.current : s.earningsAt(cursor), v = atYou ? s.currentNet : s.lifted[cursor];
    if (!atYou) {
      const line = svg("line", { x1: px(e), y1: pad.t, x2: px(e), y2: H - pad.b, stroke: "var(--ink-3)", "stroke-width": 1, "stroke-opacity": 0.55 });
      const dot = svg("circle", { cx: px(e), cy: py(v), r: 4.5, fill: "var(--series-1)", stroke: "var(--surface)", "stroke-width": 2 });
      picture.append(line, dot);
      cursorNodes = [line, dot];
    }
    const inYours = s.zone !== null && e > s.zone.startEarnings && e < (s.stuck ? Infinity : s.zone.endEarnings!);
    const inAny = s.ev.analysis.dangerZones.some((z) => e > z.startEarnings && e < (z.endEarnings ?? Infinity));
    readout.replaceChildren(
      ...parts(copy.chart.readout, { pay: m.payUnit(e), kept: m.money(v) }).map((p) => ("slot" in p ? h("b", {}, p.text) : p.text)),
      t(inYours ? "chart.inYourZone" : inAny ? "chart.inZone" : "chart.outZone"),
    );
  }
  function moveTo(clientX: number): void {
    if (!L) return;
    touched = true;
    const r = picture.getBoundingClientRect();
    const f = ((clientX - r.left) / r.width) * L.W;
    cursor = Math.min(L.i1, Math.max(L.i0, Math.round(L.i0 + ((f - L.pad.l) / (L.W - L.pad.l - L.pad.r)) * (L.i1 - L.i0))));
    paintCursor();
  }
  wrapper.addEventListener("pointermove", (ev) => moveTo(ev.clientX));
  wrapper.addEventListener("pointerdown", (ev) => moveTo(ev.clientX));
  wrapper.addEventListener("keydown", (ev) => {
    if (!L) return;
    const step = ev.shiftKey ? 5 : 1;
    if (ev.key === "ArrowRight") cursor = Math.min(L.i1, cursor + step);
    else if (ev.key === "ArrowLeft") cursor = Math.max(L.i0, cursor - step);
    else if (ev.key === "Home") cursor = L.i0;
    else if (ev.key === "End") cursor = L.i1;
    else if (ev.key === "]" || ev.key === "[") {
      /* Next or previous mark from the one that has focus; from the wrapper, ] goes to the first and [ to the last. */
      const marks = [...marksLayer.querySelectorAll<HTMLButtonElement>(".hg-mark")];
      if (!marks.length) return;
      const at = marks.indexOf(document.activeElement as HTMLButtonElement);
      const next = ev.key === "]" ? (at < 0 ? 0 : Math.min(marks.length - 1, at + 1)) : (at < 0 ? marks.length - 1 : Math.max(0, at - 1));
      marks[next].focus();
      ev.preventDefault();
      return;
    } else if (ev.key === "Escape") { hooks.onEscape(); ev.preventDefault(); return; }
    else return;
    ev.preventDefault();
    touched = true;
    paintCursor();
  });

  /* A redraw for a resize re-creates the path without .hg-draw. */
  let lastWidth = 0;
  const ro = new ResizeObserver(() => {
    const w = wrapper.clientWidth;
    if (w > 0 && w !== lastWidth) { lastWidth = w; draw(); }
  });
  ro.observe(wrapper);

  /* Paper is the column's width, whatever the screen was: a 358px drawing stretched to Letter prints its 12px ticks at 1.7× (S2). */
  const PRINT_WIDTH = 640;
  const onBeforePrint = () => draw(PRINT_WIDTH);
  const onAfterPrint = () => draw();
  addEventListener("beforeprint", onBeforePrint);
  addEventListener("afterprint", onAfterPrint);

  return {
    setOpen(key) {
      markFor(open)?.setAttribute("aria-expanded", "false");
      open = key;
      markFor(open)?.setAttribute("aria-expanded", "true");
    },
    focusMark(key) { (markFor(key) ?? wrapper).focus(); },
    destroy() { ro.disconnect(); removeEventListener("beforeprint", onBeforePrint); removeEventListener("afterprint", onAfterPrint); },
  };
}
