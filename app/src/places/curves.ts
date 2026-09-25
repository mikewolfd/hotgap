// Every state's money line for the chosen household, as small pictures
// (design critique 2026-09-25: "let me see a graph for each state"): one
// larger curve for the selected state beside the map, and all fifty-one
// side by side on one shared scale. The curves are the committed sweep's own
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
import { householdPhrase } from "./words.js";

export interface Curves { from: number; step: number; states: Record<string, number[]> }

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

/** What a picture marks on one state's curve: its points, its danger zones and its road out of poverty. */
export interface StateCurve { earnings: number[]; net: number[]; zones: [number, number][]; road: [number, number] | null }

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
  return { earnings, net, zones, road: r ? [r.lo, r.hiStart] : null };
}

/** The shared y-range for a set of curves: $0 to the highest point any of them reaches, rounded up. */
export function sharedTop(c: Curves): number {
  let top = 0;
  for (const net of Object.values(c.states)) for (const v of net) if (v > top) top = v;
  return Math.ceil(top / 20_000) * 20_000;
}

export interface CurveOpts {
  w: number; h: number;
  /** The y-axis top; $0 is the floor, so every picture reads on one scale. */
  top: number;
  /** Axis labels and gridlines: the larger picture has them, a small multiple does not. */
  axes?: boolean;
}

/**
 * One state's curve as an SVG: the danger zones as the loss wash, the road
 * out of poverty as a bar under the axis, the money line over both. The SVG
 * is aria-hidden; whoever places it says in words what it shows.
 */
export function curveSvg(c: StateCurve, o: CurveOpts): SVGSVGElement {
  const pad = o.axes ? { t: 8, r: 8, b: 22, l: 40 } : { t: 3, r: 2, b: 5, l: 2 };
  const x1 = c.earnings[c.earnings.length - 1];
  const px = (e: number) => pad.l + (e / x1) * (o.w - pad.l - pad.r);
  const py = (v: number) => pad.t + (1 - Math.max(0, v) / o.top) * (o.h - pad.t - pad.b);
  const root = svg("svg", { viewBox: `0 0 ${o.w} ${o.h}`, width: String(o.w), height: String(o.h), class: "curve", "aria-hidden": "true", focusable: "false" });
  const base = o.h - pad.b;
  if (o.axes) {
    for (let v = 0; v <= o.top; v += o.top / 4) {
      root.append(svg("line", { x1: pad.l, x2: o.w - pad.r, y1: py(v), y2: py(v), class: "grid" }));
      root.append(svg("text", { x: pad.l - 4, y: py(v) + 3, "text-anchor": "end", class: "tick" }, tickMoney(v, "year")));
    }
    for (const e of [0, x1 / 2, x1]) root.append(svg("text", { x: px(e), y: o.h - 6, "text-anchor": e === 0 ? "start" : e === x1 ? "end" : "middle", class: "tick" }, tickMoney(e, "year")));
  }
  for (const [a, b] of c.zones) root.append(svg("rect", { x: px(a), y: pad.t, width: Math.max(1, px(b) - px(a)), height: base - pad.t, class: "zone" }));
  if (c.road) root.append(svg("rect", { x: px(c.road[0]), y: base - 2, width: Math.max(1, px(c.road[1]) - px(c.road[0])), height: 3, class: "road" }));
  root.append(svg("path", { d: c.net.map((v, i) => `${i ? "L" : "M"}${px(c.earnings[i]).toFixed(1)} ${py(v).toFixed(1)}`).join(""), class: "line" }));
  return root;
}

/* ── The two places the pictures go ─────────────────────────────────────── */


/** The run's own household (summary.json), which is all the pictures need of it. */
type Arch = { id: string; married: boolean; childAges: number[] };

const who = (a: Arch): string => householdPhrase(a.married, a.id.includes("dual"), a.childAges);

/**
 * Every state's curve, one button each, alphabetical by the state's name so a
 * reader finds their own; one shared y-scale so a taller line is more money.
 * `sel` takes aria-current like a tile (render.ts applySelection keeps it).
 */
export function renderCurves(c: Curves | null, arch: Arch, sel: string | null): void {
  const box = $("multiples");
  $("curvesPanel").hidden = c === null;
  if (!c) { box.replaceChildren(); return; }
  const top = sharedTop(c);
  const x1 = c.from + c.step * (Object.values(c.states)[0].length - 1);
  $("curvesLead").textContent = t("curves.lead", { household: who(arch), top: money(x1) });
  const states = Object.keys(c.states).sort((a, b) => stateName(a).localeCompare(stateName(b)));
  box.replaceChildren(...states.flatMap((st) => {
    const curve = stateCurve(c, st, arch.id);
    if (!curve) return [];
    return [h("button", { type: "button", class: "mult", "data-st": st, tabindex: st === (sel ?? states[0]) ? 0 : -1, ...(st === sel ? { "aria-current": "true" } : {}) },
      h("span", { class: "name" }, stateName(st)), curveSvg(curve, { w: 160, h: 72, top }))];
  }));
}

/** The selected state's curve beside the map, larger and with its axes; hidden with nothing selected. */
export function renderStateCurve(c: Curves | null, arch: Arch, sel: string | null): void {
  const fig = $("stateCurve");
  const curve = c && sel ? stateCurve(c, sel, arch.id) : null;
  fig.hidden = curve === null;
  if (!curve || !sel) return;
  $("stateCurveSvg").replaceChildren(curveSvg(curve, { w: 320, h: 170, top: sharedTop(c!), axes: true }));
  $("stateCurveCap").textContent = t("curves.cap", { state: stateName(sel), household: who(arch) });
}
