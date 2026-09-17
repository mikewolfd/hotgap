// MoneyCurve (#3), CurveReadout (#4) and MarkKey (#5) for the caseworker:
// the full axis, the lifted line, the household's zone with its peak rule,
// exit and leap bracket, every other zone as hatch, cliff marks as 44px
// controls with the collision rule, and the keyboard model (design/charts.md
// § 1, M6, S8, S12). One selection model: a mark and its DropLedger row
// share `selected`, which main.ts owns; this module reports presses and
// mirrors the selection onto the marks. Every word is copy.ts's.
//
// A draw is O(points + cliffs + zones); a resize redraws once per frame;
// print redraws synchronously at a fixed width (review N6).
import { immediateCurve, type Cliff, type HouseholdEvaluation } from "@hotgap/core";
import { copy, fmt } from "./copy.js";
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

interface Mark { members: number[]; xLast: number; deferred: boolean; x: number; y: number; btn: HTMLButtonElement }
interface Layer { px: (e: number) => number; py: (v: number) => number; pad: { t: number; r: number; b: number; l: number }; W: number; H: number }

/** The width the curve is drawn at on paper, whatever the screen was (review N6): 42rem at 16px. */
const PRINT_WIDTH = 672;
/** A mark's ring, the box a direct label must clear (review S4). */
const RING = 10;
/** One line of a 13px label, the step a colliding label is lifted by. */
const LINE = 14;

const NS = "http://www.w3.org/2000/svg";
const mk = <K extends keyof SVGElementTagNameMap>(t: K, a: Record<string, string | number> = {}, text?: string): SVGElementTagNameMap[K] => {
  const n = document.createElementNS(NS, t);
  for (const k in a) n.setAttribute(k, String(a[k]));
  if (text !== undefined) n.textContent = text;
  return n;
};

/* Gridlines on nice values (N1): the step is range/n snapped to the nearest
   of 1, 2, 2.5 or 5 × 10^k, stepped up while it would draw more than n+1 lines. */
const NICE = [1, 2, 2.5, 5, 10];
const nice = (raw: number): number => { const p = 10 ** Math.floor(Math.log10(raw)), m = raw / p; return NICE.reduce((b, v) => (Math.abs(v - m) < Math.abs(b - m) ? v : b)) * p; };
const niceUp = (s: number): number => { const p = 10 ** Math.floor(Math.log10(s) + 1e-9), m = s / p; return (NICE.find((v) => v > m + 1e-9) ?? 10) * p; };

export function mountChart(host: ChartHost, on: { select(i: number, announce?: string): void; close(): void }): Chart {
  const { wrap, svg, marks: marksEl, readout } = host;
  const K = copy.chart;
  let ev: HouseholdEvaluation | null = null;
  let source = "";
  let lifted: number[] = [], earn: number[] = [];
  let cursor = 0, layer: Layer | null = null, cursorNodes: SVGElement[] = [], marks: Mark[] = [], drawn = false;
  let diamond: SVGElement | null = null, selected: number | null = null;

  const cliffs = (): Cliff[] => ev!.analysis.cliffs;
  const markSentence = (m: Mark): string => m.members.length === 1 ? cliffSentence(cliffs()[m.members[0]])
    : K.merged(m.members.length, cliffs()[m.members[0]].startEarnings, cliffs()[m.members[m.members.length - 1]].endEarnings, m.members.reduce((s, i) => s + cliffs()[i].drop, 0));
  const zoneOf = (e: number) => ev!.analysis.dangerZones.find((z) => e > z.startEarnings && (z.endEarnings === null || e < z.endEarnings)) ?? null;
  const isPersonal = (z: { startEarnings: number } | null) => !!z && !!ev!.personal.zone && z.startEarnings === ev!.personal.zone.startEarnings;
  const label = (x: number, y: number, text: string, extra: Record<string, string | number> = {}, cls = "") =>
    mk("text", { class: `hg-label hg-label--halo${cls ? ` ${cls}` : ""}`, x, y, ...extra }, text);
  /** The lifted line's value at any earnings, interpolated between the two axis points around it. */
  const liftedAt = (e: number): number => {
    const f = (e - earn[0]) / (earn[1] - earn[0]), i = Math.max(0, Math.min(lifted.length - 2, Math.floor(f)));
    return lifted[i] + (lifted[i + 1] - lifted[i]) * Math.max(0, Math.min(1, f - i));
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
    const A = ev.analysis, P = ev.personal, DEFERRED = ev.deferred, IMMEDIATE = cliffs().filter((c) => !c.deferral);
    const net = ev.curve.points.map((p) => p.netIncome), safe = ev.escape.safeExitEarnings;
    const W = width, narrow = W < 520;
    const H = narrow ? 240 : 320;
    const pad = { t: 30, r: 14, b: 34, l: 52 };
    const x0 = earn[0], x1 = earn[earn.length - 1];
    /* Axis honesty (charts.md): the floor is computed, never typed, and the
       visible range is at least 2.5× the largest plotted drop (S14). */
    let lo = Math.min(...lifted), hi = Math.max(...lifted);
    const maxDrop = Math.max(0, ...IMMEDIATE.map((c) => c.drop)), need = 2.5 * maxDrop;
    if (hi - lo < need) { const ext = (need - (hi - lo)) / 2; lo -= ext; hi += ext; }
    const n = narrow ? 3 : 5;
    let step = nice((hi - lo) / n), y0 = Math.floor(lo / step) * step, y1 = Math.ceil(hi / step) * step;
    while ((y1 - y0) / step > n + 1) { step = niceUp(step); y0 = Math.floor(lo / step) * step; y1 = Math.ceil(hi / step) * step; }
    const px = (e: number) => pad.l + ((e - x0) / (x1 - x0)) * (W - pad.l - pad.r);
    const py = (v: number) => pad.t + ((y1 - v) / (y1 - y0)) * (H - pad.t - pad.b);
    const plotTop = pad.t, plotBot = H - pad.b;

    svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("height", String(H));
    svg.textContent = "";
    const defs = mk("defs");
    const pat = mk("pattern", { id: "cw-hatch", width: 7, height: 7, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" });
    pat.append(mk("line", { x1: 0, y1: 0, x2: 0, y2: 7, stroke: "var(--loss-hatch)", "stroke-width": 1.25 }));
    defs.append(pat); svg.append(defs);

    /* Zones: the household's own gets the wash, the peak rule, the exit and the
       bracket; every other zone is hatch alone (S7). */
    for (const z of A.dangerZones) {
      const zx0 = px(z.startEarnings), zx1 = px(z.endEarnings ?? x1);
      if (isPersonal(z)) svg.append(mk("rect", { x: zx0, y: plotTop, width: zx1 - zx0, height: plotBot - plotTop, fill: "var(--loss-wash)" }));
      svg.append(mk("rect", { x: zx0, y: plotTop, width: zx1 - zx0, height: plotBot - plotTop, fill: "url(#cw-hatch)" }));
    }
    for (let v = y0; v <= y1 + 1; v += step) {
      svg.append(mk("line", { x1: pad.l, y1: py(v), x2: W - pad.r, y2: py(v), stroke: "var(--grid)", "stroke-width": 1 }));
      svg.append(mk("text", { class: "hg-tick", x: pad.l - 7, y: py(v) + 4, "text-anchor": "end" }, fmt.tick(v)));
    }
    const xs = nice((x1 - x0) / (narrow ? 3 : 6));
    for (let e = x0; e <= x1; e += xs) svg.append(mk("text", { class: "hg-tick", x: px(e), y: H - 12, "text-anchor": "middle" }, fmt.tick(e)));
    svg.append(mk("line", { x1: pad.l, y1: plotBot, x2: W - pad.r, y2: plotBot, stroke: "var(--axis)", "stroke-width": 1 }));

    /* The ghost (S14): the real curve, drawn only when a deferred drop would be
       visible; the caption sentence comes from the same test below. */
    const yRange = y1 - y0, ghost = DEFERRED.some((d) => d.drop / yRange > 0.015);
    if (ghost) {
      let g = "";
      for (let i = 0; i < net.length; i++) g += `${i ? "L" : "M"}${px(earn[i])} ${py(net[i])}`;
      svg.append(mk("path", { d: g, fill: "none", stroke: "var(--ink-3)", "stroke-width": 1.5, "stroke-dasharray": "5 4" }));
    }
    let d = "";
    for (let i = 0; i < lifted.length; i++) d += `${i ? "L" : "M"}${px(earn[i])} ${py(lifted[i])}`;
    const line = mk("path", { d, fill: "none", stroke: "var(--series-1)", "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round", pathLength: 1 });
    if (!drawn) line.classList.add("hg-draw");   /* the one orchestrated moment, first draw only */
    svg.append(line);

    /* Cliff marks, with the collision rule (S8): adjacent dots closer than 10px
       merge into one mark with a count; the ledger is where they separate. */
    marks = [];
    const pending: Omit<Mark, "x" | "y" | "btn">[] = [];
    cliffs().forEach((c, i) => {
      const x = px(c.startEarnings), last = pending[pending.length - 1];
      if (last && !c.deferral && !last.deferred && x - last.xLast < 10) { last.members.push(i); last.xLast = x; }
      else pending.push({ members: [i], xLast: x, deferred: !!c.deferral });
    });
    marksEl.textContent = "";
    for (const m of pending) {
      const first = cliffs()[m.members[0]], si = indexOf(ev, first.startEarnings);
      const x = m.members.reduce((s, i) => s + px(cliffs()[i].startEarnings), 0) / m.members.length, y = py(lifted[si]);
      if (m.deferred) {
        svg.append(mk("line", { x1: x, y1: y - 18, x2: x, y2: y - 2, stroke: "var(--ink-3)", "stroke-width": 2, "stroke-dasharray": "4 3" }));
        svg.append(mk("circle", { cx: x, cy: y, r: 4, fill: "var(--surface)", stroke: "var(--ink-3)", "stroke-width": 2 }));
        svg.append(label(x + 7, y - 8, K.later));
      } else {
        const land = Math.min(...m.members.map((i) => lifted[indexOf(ev!, cliffs()[i].endEarnings)]));
        svg.append(mk("line", { x1: x, y1: y, x2: x, y2: py(land), stroke: "var(--loss-4)", "stroke-width": 2.5, "stroke-linecap": "round" }));
        svg.append(mk("circle", { cx: x, cy: y, r: m.members.length > 1 ? 6 : 4, fill: "var(--loss-4)", stroke: "var(--surface)", "stroke-width": 2 }));
      }
      /* The marks layer: one 44px button per mark, over the SVG (M6). */
      const btn = document.createElement("button");
      btn.className = "hg-mark"; btn.type = "button"; btn.tabIndex = -1;
      btn.style.left = `${(x / W) * 100}%`; btn.style.top = `${(y / H) * 100}%`;
      const mark: Mark = { ...m, x, y, btn };
      btn.setAttribute("aria-label", markSentence(mark));
      if (m.members.length > 1) { const count = document.createElement("span"); count.className = "hg-mark__count"; count.setAttribute("aria-hidden", "true"); count.textContent = String(m.members.length); btn.append(count); }
      btn.addEventListener("click", () => on.select(mark.members[0], markSentence(mark)));
      marksEl.append(btn);
      marks.push(mark);
    }
    const rings = marks.map((m) => ({ x: m.x, y: m.y }));

    /* Direct labels: the largest drop and the leap (charts.md § Direct labels), lifted off any ring they cross. */
    const w = cliffAt(ev, A.worstCliff);
    if (w) {
      const wm = marks.find((m) => m.members.includes(cliffs().indexOf(w)))!;
      const mid = (lifted[indexOf(ev, w.startEarnings)] + lifted[indexOf(ev, w.endEarnings)]) / 2;
      const t = label(wm.x + 9, py(mid) + 4, fmt.loss(w.drop), {}, "hg-label--loss cw-label--strong");
      svg.append(t); clearRings(t, rings);
    }
    if (P.zone) {
      const bx0 = px(P.zone.startEarnings), bx1 = px(P.zone.endEarnings ?? x1), yp = py(P.zone.peakNet);
      svg.append(mk("line", { x1: bx0, y1: yp, x2: bx1, y2: yp, stroke: "var(--loss-3)", "stroke-width": 1 }));
      const peak = label(bx0 - 4, yp - 6, fmt.money(P.zone.peakNet), { "text-anchor": "end" }, "hg-label--loss");
      svg.append(peak); clearRings(peak, rings);
      /* The leap: a bracket along the peak rule from the diamond to the exit, labelled once. */
      const lx0 = px(A.currentEarnings), lx1 = P.raiseIsLowerBound ? W - pad.r : bx1;
      svg.append(mk("path", { d: `M${lx0} ${yp - 4} V${yp + 4} M${lx0} ${yp} H${lx1}${P.raiseIsLowerBound ? "" : ` M${lx1} ${yp - 4} V${yp + 4}`}`, fill: "none", stroke: "var(--loss-3)", "stroke-width": 1 }));
      /* Below 520px the merged cliff mark sits on the peak, so the label starts under the bracket; either way it clears every ring. */
      const leap = label(lx0 + 8, narrow ? yp + 17 : yp - 6, K.leap(P.raiseToClear ?? 0, P.raiseIsLowerBound), {}, "hg-label--loss cw-label--strong");
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
    const cx = px(A.currentEarnings), cy = py(liftedAt(A.currentEarnings));
    svg.append(mk("line", { x1: cx, y1: cy, x2: cx, y2: plotBot, stroke: "var(--ink-3)", "stroke-width": 1 }));
    diamond = mk("path", { d: `M${cx} ${cy - 6} L${cx + 6} ${cy} L${cx} ${cy + 6} L${cx - 6} ${cy} Z`, fill: "var(--ink)", stroke: "var(--surface)", "stroke-width": 2 });
    svg.append(diamond);

    /* The caption's clauses each come from their condition (review S5). */
    host.cap.textContent = [
      K.axis(y0, (yRange / Math.max(1, maxDrop)).toFixed(1)),
      DEFERRED.length ? (ghost ? K.liftedGhost : K.liftedNoGhost) : K.noneDeferred,
      source,
    ].join(" ");
    renderKey(A.dangerZones.length > (P.zone ? 1 : 0), IMMEDIATE.length > 0, DEFERRED.length > 0, !!P.zone, safe !== null);
    layer = { px, py, pad, W, H }; drawn = true;
    syncMarks(); paintCursor();
  }

  /* MarkKey (#5): each entry draws the actual mark; entries follow the marks drawn. */
  function renderKey(otherZones: boolean, immediate: boolean, deferred: boolean, zone: boolean, safe: boolean): void {
    const sw = (inner: string) => `<svg viewBox="0 0 22 12" aria-hidden="true">${inner}</svg>`;
    const k: [string, string][] = [
      [K.key.net, sw(`<line x1="1" y1="6" x2="21" y2="6" stroke="var(--series-1)" stroke-width="2.5" stroke-linecap="round"/>`)],
    ];
    if (zone) k.push([K.key.ownZone, sw(`<rect x="1" y="1" width="20" height="10" fill="var(--loss-wash)" stroke="var(--loss-3)" stroke-width="1"/><path d="M1 11 L11 1 M11 11 L21 1" stroke="var(--loss-hatch)" stroke-width="1.5"/>`)]);
    if (otherZones) k.push([zone ? K.key.otherZones : K.key.zones, sw(`<path d="M1 11 L11 1 M11 11 L21 1" stroke="var(--loss-hatch)" stroke-width="1.5"/>`)]);
    if (immediate) k.push([K.key.immediate, sw(`<line x1="11" y1="1" x2="11" y2="11" stroke="var(--loss-4)" stroke-width="2.5"/><circle cx="11" cy="2.5" r="2.5" fill="var(--loss-4)"/>`)]);
    if (deferred) k.push([K.key.deferred, sw(`<line x1="11" y1="1" x2="11" y2="11" stroke="var(--ink-3)" stroke-width="2" stroke-dasharray="3 2.5"/><circle cx="11" cy="2.5" r="2.5" fill="var(--surface)" stroke="var(--ink-3)" stroke-width="1.5"/>`)]);
    k.push([K.key.current, sw(`<path d="M11 1.5 L15.5 6 L11 10.5 L6.5 6 Z" fill="var(--ink)" stroke="var(--surface)" stroke-width="1.5"/>`)]);
    if (zone) k.push([K.key.leap, sw(`<path d="M3 2 V10 M3 6 H19 M19 2 V10" fill="none" stroke="var(--loss-3)" stroke-width="1"/>`)]);
    if (safe) k.push([K.key.safe, sw(`<line x1="11" y1="0" x2="11" y2="12" stroke="var(--loss-3)" stroke-width="1"/>`)]);
    host.key.innerHTML = k.map(([t, s]) => `<li>${s} ${t}</li>`).join("");
  }

  function paintCursor(): void {
    cursorNodes.forEach((n) => n.remove()); cursorNodes = [];
    if (!layer || !ev) return;
    const { px, py, pad, H } = layer;
    const e = earn[cursor], v = lifted[cursor];
    const l = mk("line", { x1: px(e), y1: pad.t, x2: px(e), y2: H - pad.b, stroke: "var(--ink-3)", "stroke-width": 1, "stroke-opacity": 0.55 });
    const dot = mk("circle", { cx: px(e), cy: py(v), r: 4, fill: "var(--series-1)", stroke: "var(--surface)", "stroke-width": 2 });
    svg.insertBefore(l, diamond); svg.insertBefore(dot, diamond);   /* the household's diamond stays on top */
    cursorNodes = [l, dot];
    const z = zoneOf(e);
    readout.textContent = K.readout(e, v, z ? { own: isPersonal(z), end: z.endEarnings, peak: z.peakNet, start: z.startEarnings } : null);
  }

  function syncMarks(): void {
    for (const m of marks) m.btn.setAttribute("aria-expanded", String(selected !== null && m.members.includes(selected)));
  }

  const move = (clientX: number) => {
    if (!layer) return;
    const r = svg.getBoundingClientRect(), { pad, W } = layer;
    const f = (clientX - r.left - pad.l) / (W - pad.l - pad.r);
    cursor = Math.min(earn.length - 1, Math.max(0, Math.round(f * (earn.length - 1))));
    paintCursor();
  };
  wrap.addEventListener("pointerdown", (e) => { if (!(e.target as HTMLElement).closest(".hg-mark")) move(e.clientX); });
  wrap.addEventListener("pointermove", (e) => { if (e.buttons && !(e.target as HTMLElement).closest(".hg-mark")) move(e.clientX); });
  wrap.addEventListener("keydown", (e) => {
    if (!ev) return;
    const s = e.shiftKey ? 10 : 1, onMark = (e.target as HTMLElement).closest(".hg-mark");
    if (e.key === "ArrowRight") cursor = Math.min(earn.length - 1, cursor + s);
    else if (e.key === "ArrowLeft") cursor = Math.max(0, cursor - s);
    else if (e.key === "Home") cursor = 0;
    else if (e.key === "End") cursor = earn.length - 1;
    else if (e.key === "]" || e.key === "[") {
      /* Next or previous mark, from the mark in focus or else from the cursor —
         a merged mark counts by any member, so one holding the cursor's own
         cliff is the next stop, not skipped (review N4). */
      const here = onMark ? marks.findIndex((m) => m.btn === onMark) : -1;
      const at = earn[cursor];
      const startsAfter = (m: Mark) => m.members.some((i) => cliffs()[i].startEarnings > at);
      const startsBefore = (m: Mark) => m.members.some((i) => cliffs()[i].startEarnings < at);
      const i = e.key === "]"
        ? (here >= 0 ? here + 1 : marks.findIndex(startsAfter))
        : (here >= 0 ? here - 1 : marks.filter(startsBefore).length - 1);   /* marks are in axis order */
      e.preventDefault();
      if (i < 0 || i >= marks.length) return;
      marks[i].btn.focus(); cursor = indexOf(ev, cliffs()[marks[i].members[0]].startEarnings); paintCursor();
      readout.textContent = markSentence(marks[i]);
      return;
    }
    else if (e.key === "Escape") { on.close(); e.preventDefault(); return; }
    else return;
    e.preventDefault(); paintCursor();
  });
  /* A resize redraws once per frame, and a mark that had focus keeps it across the rebuild. */
  let raf = 0;
  addEventListener("resize", () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const focused = marks.findIndex((m) => m.btn === document.activeElement);
      draw();
      if (focused >= 0) marks[focused]?.btn.focus();
    });
  });
  /* Paper: print layout does not wait for a frame, so the curve is redrawn now, at one width, and back afterwards. */
  addEventListener("beforeprint", () => draw(PRINT_WIDTH));
  addEventListener("afterprint", () => draw());

  return {
    render(next, src) {
      ev = next; source = src;
      /* THE LIFT (design/charts.md § 1): the line the zones and the verdict describe is core's immediate curve, deferred drops removed. */
      lifted = immediateCurve(next.curve.points, next.deferred).map((p) => p.netIncome); earn = next.curve.points.map((p) => p.earnings);
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
