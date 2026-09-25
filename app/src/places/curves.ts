// Every state's money line for the chosen household, as small pictures
// (design critique 2026-09-25: "let me see a graph for each state"): one
// larger curve for the selected state beside the map, and all fifty-one
// side by side, in the map's order, each showing the road out of poverty on
// one shared scale. The curves are the committed sweep's own
// points, served per archetype as /data/curves/{id}.json (app/vite.config.ts
// derives them from core/data/states at build time); the danger zones and
// the road out of poverty are core's (analyzeCurve, povertyRoad), so a
// picture here marks exactly the stretches the measures count.
//
// A draw is O(points) per curve; the fifty-one are O(states × points) once
// per household, never per selection.
import { analyzeCurve, archetypeById, povertyRoad, type CurvePoint, type HouseholdAnswers } from "@hotgap/core";
import { $, h, svg } from "../lib/dom.js";
import { money, tickMoney } from "../lib/format.js";
import { stateName } from "../lib/names.js";
import { t } from "./copy.js";
import { rankNumbers, type Grouped, type Measure, type StateRow } from "./model.js";
import { householdPhrase, rankOrdinal, rankRange } from "./words.js";

export interface Curves {
  from: number; step: number; states: Record<string, number[]>;
  /** Per state, whether the child-care subsidy starts at the first sampled pay (app/vite.config.ts); absent on a file written before it. */
  subsidyAtFirstDollar?: Record<string, boolean>;
}

const cache = new Map<string, Promise<Curves | null>>();

/** One household's curves, fetched once; null when the file is missing (the page stands without the pictures). */
export function loadCurves(archetype: string): Promise<Curves | null> {
  let p = cache.get(archetype);
  if (!p) {
    p = fetch(`/data/curves/${archetype}.json`).then((r) => (r.ok ? (r.json() as Promise<Curves>) : null)).catch(() => null);
    cache.set(archetype, p);
  }
  return p;
}

/**
 * What a picture marks on one state's curve: its points, its danger zones and
 * its road out of poverty — the bar runs `road[0]` (the poverty line) to
 * `road[1]` (the road's last step), `roadHi` is the measured span's top, one
 * step past it (core road.ts `Road.hi`).
 */
export interface StateCurve { earnings: number[]; net: number[]; zones: [number, number][]; road: [number, number] | null; roadHi: number | null }

export function stateCurve(c: Curves, st: string, archetype: string): StateCurve | null {
  const net = c.states[st];
  if (!net || net.length < 2) return null;
  const earnings = net.map((_, i) => c.from + i * c.step);
  /* Only the money line is here, so the programs are empty: enough for the zones, which are the line's own shape. */
  const points = net.map((v, i) => ({ earnings: earnings[i], netIncome: v, medicalOOP: 0, programs: {}, childPrograms: {} })) as unknown as CurvePoint[];
  /* A zone that never closes runs to the end of the axis. */
  const zones = analyzeCurve(points, 0).dangerZones.map((z): [number, number] => [z.startEarnings, z.endEarnings ?? earnings[earnings.length - 1]]);
  /* The road needs only the state and the household's size (road.ts), so the archetype's shape is enough — no state defaults to load. */
  const shape = archetypeById(archetype);
  const r = povertyRoad({ state: st, married: shape.married, childAges: shape.childAges } as HouseholdAnswers, points);
  return { earnings, net, zones, road: r ? [r.lo, r.hiStart] : null, roadHi: r ? r.hi : null };
}

/** The shared y-range for a set of curves: $0 to the highest point any of them reaches, rounded up. */
export function sharedTop(c: Curves): number {
  let top = 0;
  for (const net of Object.values(c.states)) for (const v of net) if (v > top) top = v;
  return Math.ceil(top / 20_000) * 20_000;
}

/** How far past the road's top a small multiple runs: enough to see whether the line climbs out. */
export const ROAD_TAIL = 10_000;

/**
 * The frame the small multiples share in road mode: pay from $0 to the
 * longest road's top plus `ROAD_TAIL` (Alaska's and Hawaii's roads are the
 * long ones), and ONE y-range, in dollars relative to what each family keeps
 * at its poverty line, wide enough for every state over that pay. On the
 * whole axis a $2,000 step was one pixel of a $0–$140,000 scale; here the
 * scale is the road's own. O(states × points).
 */
export interface RoadFrame { x1: number; lo: number; hi: number }

/** What the family keeps at each point, less what it keeps at its poverty line (the road's start); null without a road. */
export function relativeNet(c: StateCurve): number[] | null {
  if (!c.road) return null;
  const base = c.net[Math.round((c.road[0] - c.earnings[0]) / (c.earnings[1] - c.earnings[0]))];
  return base === undefined ? null : c.net.map((v) => v - base);
}

export function roadFrame(curves: StateCurve[]): RoadFrame | null {
  const roads = curves.filter((c) => c.roadHi !== null);
  if (!roads.length) return null;
  const end = Math.min(...curves.map((c) => c.earnings[c.earnings.length - 1]));
  const x1 = Math.min(end, Math.max(...roads.map((c) => c.roadHi as number)) + ROAD_TAIL);
  let lo = 0, hi = 0;
  for (const c of roads) {
    const rel = relativeNet(c);
    if (!rel) continue;
    for (let i = 0; i < rel.length && c.earnings[i] <= x1; i++) { if (rel[i] < lo) lo = rel[i]; if (rel[i] > hi) hi = rel[i]; }
  }
  /* A little room either side, so no line runs along the box's edge. */
  const pad = Math.max(500, (hi - lo) * 0.06);
  return { x1, lo: lo - pad, hi: hi + pad };
}

export interface CurveOpts {
  w: number; h: number;
  /** The y-axis top; $0 is the floor, so every picture reads on one scale. */
  top: number;
  /** Axis labels and gridlines: the larger picture has them, a small multiple does not. */
  axes?: boolean;
  /** Road mode: the pay and the relative y-range the small multiples share, with a zero rule at the poverty-line level. */
  frame?: RoadFrame;
}

/**
 * One state's curve as an SVG: the danger zones as the loss wash, the road
 * out of poverty as a bar under the axis, the money line over both. The SVG
 * is aria-hidden; whoever places it says in words what it shows.
 */
export function curveSvg(c: StateCurve, o: CurveOpts): SVGSVGElement {
  const pad = o.axes ? { t: 8, r: 8, b: 22, l: 40 } : { t: 3, r: 2, b: 5, l: 2 };
  const f = o.frame, rel = f ? relativeNet(c) : null;
  const x1 = f ? f.x1 : c.earnings[c.earnings.length - 1];
  const px = (e: number) => pad.l + (Math.min(e, x1) / x1) * (o.w - pad.l - pad.r);
  const py = f
    ? (v: number) => pad.t + ((f.hi - v) / (f.hi - f.lo)) * (o.h - pad.t - pad.b)
    : (v: number) => pad.t + (1 - Math.max(0, v) / o.top) * (o.h - pad.t - pad.b);
  /* In road mode the line stops at the frame's pay; past it is another picture's business. */
  let n = c.net.length;
  if (f) while (n > 1 && c.earnings[n - 1] > x1) n--;
  const ys = (rel ?? c.net).slice(0, n);
  const root = svg("svg", { viewBox: `0 0 ${o.w} ${o.h}`, width: String(o.w), height: String(o.h), class: "curve", "aria-hidden": "true", focusable: "false" });
  const base = o.h - pad.b;
  if (o.axes) {
    for (let v = 0; v <= o.top; v += o.top / 4) {
      root.append(svg("line", { x1: pad.l, x2: o.w - pad.r, y1: py(v), y2: py(v), class: "grid" }));
      root.append(svg("text", { x: pad.l - 4, y: py(v) + 3, "text-anchor": "end", class: "tick" }, tickMoney(v, "year")));
    }
    for (const e of [0, x1 / 2, x1]) root.append(svg("text", { x: px(e), y: o.h - 6, "text-anchor": e === 0 ? "start" : e === x1 ? "end" : "middle", class: "tick" }, tickMoney(e, "year")));
  }
  for (const [a, b] of c.zones) if (a < x1) root.append(svg("rect", { x: px(a), y: pad.t, width: Math.max(1, px(b) - px(a)), height: base - pad.t, class: "zone" }));
  if (c.road) root.append(svg("rect", { x: px(c.road[0]), y: base - 2, width: Math.max(1, px(c.road[1]) - px(c.road[0])), height: 3, class: "road" }));
  /* The poverty-line level: a line under it is a family poorer than it was there. */
  if (f) root.append(svg("line", { x1: pad.l, x2: o.w - pad.r, y1: py(0), y2: py(0), class: "zero" }));
  if (!f || rel) root.append(svg("path", { d: ys.map((v, i) => `${i ? "L" : "M"}${px(c.earnings[i]).toFixed(1)} ${py(v).toFixed(1)}`).join(""), class: "line" }));
  return root;
}

/* ── The two places the pictures go ─────────────────────────────────────── */


/** The run's own household (summary.json), which is all the pictures need of it. */
type Arch = { id: string; married: boolean; childAges: number[] };

const who = (a: Arch): string => householdPhrase(a.married, a.id.includes("dual"), a.childAges);

/** One small multiple's place in the map's order: its state, its rank label (null outside the ranking) and the tile it matches. */
export interface CurveRow {
  st: string;
  rank: string | null;
  /** The tile's class: a ramp step (`loss-4`, `keep-2`) or `none`, `past`, `incomplete`. */
  cls: string;
}

/**
 * The map's order for the multiples, the rank strip's own (render.ts
 * `renderRank`): the lower-bound rows sharing the top ranks, the ranking
 * worst first with its competition ranks, then no cliff, then incomplete.
 * O(states).
 */
export function curveOrder(g: Pick<Grouped, "ranked" | "past" | "none" | "incomplete" | "bins">, measure: Measure): CurveRow[] {
  const ranks = rankNumbers(g, measure);
  const lifted = (rows: StateRow[], cls: string, rank: string | null): CurveRow[] => rows.map((r) => ({ st: r.st, rank, cls }));
  return [
    ...lifted(g.past, "past", g.past.length ? rankRange(g.past.length) : null),
    ...g.ranked.map((r, i): CurveRow => {
      const c = g.bins.classes[g.bins.index(r.value as number)];
      return { st: r.st, rank: rankOrdinal(ranks[i]), cls: `${c.hue}-${c.ramp + 1}` };
    }),
    ...lifted(g.none, "none", null),
    ...lifted(g.incomplete, "incomplete", null),
  ];
}

/** The tile's mark before the name, drawn with the tiles' own classes so it cannot drift from the map. */
const swatch = (cls: string): HTMLElement =>
  cls === "none" || cls === "past" ? h("i", { class: `hg-swatch hg-swatch--${cls}` })
    : cls === "incomplete" ? h("i", { class: "hg-swatch hg-swatch--incomplete hg-hatch-incomplete" })
      : h("i", { class: "hg-swatch", style: `background:var(--${cls})` });

/**
 * Every state's curve, one button each, in the map's order (`curveOrder`)
 * with the rank before the name and the tile's mark beside it, so the
 * multiples read as the ranking drawn. Each shows the road out of poverty on
 * one shared relative scale (`roadFrame`), so a line below the rule is a
 * family poorer than it was at the poverty line, in every state alike.
 * `sel` takes aria-current like a tile (render.ts applySelection keeps it).
 */
export function renderCurves(c: Curves | null, arch: Arch, sel: string | null, order: CurveRow[]): void {
  const box = $("multiples");
  $("curvesPanel").hidden = c === null;
  if (!c) { box.replaceChildren(); return; }
  const rows = order.flatMap((r) => { const curve = stateCurve(c, r.st, arch.id); return curve ? [{ ...r, curve }] : []; });
  const frame = roadFrame(rows.map((r) => r.curve));
  const top = sharedTop(c);
  const axisEnd = c.from + c.step * (Object.values(c.states)[0].length - 1);
  $("curvesLead").textContent = t("curves.lead", { household: who(arch), hi: money(frame?.x1 ?? axisEnd) });
  const first = rows.some((r) => r.st === sel) ? sel : rows[0]?.st;
  box.replaceChildren(...rows.map((r) =>
    h("button", { type: "button", class: "mult", "data-st": r.st, "data-class": r.cls, tabindex: r.st === first ? 0 : -1, ...(r.st === sel ? { "aria-current": "true" } : {}) },
      h("span", { class: "name" }, swatch(r.cls), r.rank ? `${r.rank} ${stateName(r.st)}` : stateName(r.st)),
      curveSvg(r.curve, { w: 160, h: 72, top, ...(frame ? { frame } : {}) }))));
}

/** The selected state's curve beside the map, larger and with its axes; hidden with nothing selected. */
export function renderStateCurve(c: Curves | null, arch: Arch, sel: string | null): void {
  const fig = $("stateCurve");
  const curve = c && sel ? stateCurve(c, sel, arch.id) : null;
  fig.hidden = curve === null;
  if (!curve || !sel) return;
  $("stateCurveSvg").replaceChildren(curveSvg(curve, { w: 320, h: 170, top: sharedTop(c!), axes: true }));
  $("stateCurveCap").textContent = t("curves.cap", { state: stateName(sel), household: who(arch) }) +
    (c!.subsidyAtFirstDollar?.[sel] ? ` ${t("curves.firstDollar", {})}` : "");
}
