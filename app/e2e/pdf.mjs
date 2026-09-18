// Enough of a PDF reader to ask what Chromium drew where: the objects with
// their streams inflated, a page's content walked with the transform
// tracked, and the images reachable from a form. Written for the proofs
// because a raster print check cannot see the PDF path (places review B1):
// Chromium prints a CSS gradient as a function shading one viewer draws as
// stripes and another as a smear, and only the drawing ops say which mark
// went on paper. Skia's output is regular — direct /Length, whitespace-
// separated tokens, `q … cm … Do Q` for a form — and that is all this reads.
import { inflateSync } from "node:zlib";

/** Every `N 0 obj` as { dict, stream } — `stream` inflated when FlateDecode, else raw, else null. */
export function pdfObjects(buf) {
  const text = buf.toString("latin1");
  const objects = new Map();
  const re = /(\d+) 0 obj\s*/g;
  let m;
  while ((m = re.exec(text))) {
    const num = Number(m[1]);
    let at = m.index + m[0].length;
    const end = text.indexOf("endobj", at);
    let dict = text.slice(at, end);
    let stream = null;
    const s = dict.indexOf("stream");
    if (s >= 0 && /\/Length/.test(dict.slice(0, s))) {
      dict = dict.slice(0, s);
      const start = at + s + "stream".length + (text[at + s + 6] === "\r" ? 2 : 1);
      const len = lengthOf(dict, text);
      const raw = buf.subarray(start, start + len);
      stream = /\/FlateDecode/.test(dict) ? inflateSync(raw) : raw;
      re.lastIndex = start + len;
    }
    objects.set(num, { dict, stream });
  }
  return objects;
}

function lengthOf(dict, text) {
  const direct = dict.match(/\/Length (\d+)(?! 0 R)/);
  if (direct) return Number(direct[1]);
  const ref = dict.match(/\/Length (\d+) 0 R/);
  return Number(text.match(new RegExp(`${ref[1]} 0 obj\\s*(\\d+)`))[1]);
}

/** Object numbers referenced from a dictionary, in order. */
export const refs = (dict) => [...dict.matchAll(/(\d+) 0 R/g)].map((m) => Number(m[1]));

/** The page objects in reading order, from the page tree. */
export function pdfPages(objects) {
  const root = [...objects.values()].find((o) => /\/Type \/Pages/.test(o.dict) && !/\/Parent/.test(o.dict));
  const kids = (o) => refs(o.dict.match(/\/Kids\s*\[([^\]]*)\]/)[1]).map((n) => objects.get(n));
  const walk = (o) => (/\/Type \/Pages/.test(o.dict) ? kids(o).flatMap(walk) : [o]);
  return walk(root);
}

/** A page's height in points, from its MediaBox. */
export const pageHeight = (page) => Number(page.dict.match(/\/MediaBox\s*\[\s*[-\d.]+\s+[-\d.]+\s+[-\d.]+\s+([-\d.]+)/)[1]);

/** A page's width in points, from the same MediaBox. */
export const pageWidth = (page) => Number(page.dict.match(/\/MediaBox\s*\[\s*[-\d.]+\s+[-\d.]+\s+([-\d.]+)/)[1]);

/** A page's content stream(s), concatenated. */
export function pageContent(objects, page) {
  const list = page.dict.match(/\/Contents\s*(\[[^\]]*\]|\d+ 0 R)/)[1];
  return Buffer.concat(refs(list).map((n) => objects.get(n).stream));
}

const mul = (a, b) => [
  a[0] * b[0] + a[1] * b[2], a[0] * b[1] + a[1] * b[3],
  a[2] * b[0] + a[3] * b[2], a[2] * b[1] + a[3] * b[3],
  a[4] * b[0] + a[5] * b[2] + b[4], a[4] * b[1] + a[5] * b[3] + b[5],
];
const apply = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
/** PDF points (origin bottom-left) to CSS px from the top-left of a page `h` points tall: 0.75pt per px. */
const px = ([x, y], h) => [x / 0.75, (h - y) / 0.75];

/**
 * Walk a content stream and report every form XObject drawn: its name, where
 * its origin landed (CSS px), and the last rectangle filled before it with
 * that rectangle's fill colour — for a masked hatch, the element's own
 * ground painted just before its stripes. O(tokens).
 */
export function formsDrawn(content, pageHeight) {
  const out = [];
  const stack = [];
  let ctm = [1, 0, 0, 1, 0, 0], fill = null, rect = null, ground = null;
  const ops = [];
  for (const tok of content.toString("latin1").split(/\s+/)) {
    if (/^[-+.\d]/.test(tok)) { ops.push(Number(tok)); continue; }
    switch (tok) {
      case "q": stack.push(ctm); break;
      case "Q": ctm = stack.pop() ?? ctm; break;
      case "cm": ctm = mul(ops.slice(-6), ctm); break;
      case "rg": fill = ops.slice(-3).map((c) => Math.round(c * 255)); break;
      case "re": {
        const [x, y, w, h] = ops.slice(-4);
        const [x0, y0] = px(apply(ctm, x, y), pageHeight), [x1, y1] = px(apply(ctm, x + w, y + h), pageHeight);
        rect = { x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.abs(x1 - x0), h: Math.abs(y1 - y0) };
        break;
      }
      case "m": case "l": case "c": case "n": rect = null; break;   /* a path that is not one rectangle, or a clip */
      case "f": case "f*": if (rect) ground = { ...rect, fill }; rect = null; break;
      case "Do": {
        const [x, y] = px(apply(ctm, 0, 0), pageHeight);
        out.push({ name: ops.at(-1), x, y, ground });
        break;
      }
    }
    if (tok.startsWith("/")) ops.push(tok); else ops.length = 0;
  }
  return out;
}

/** The fill colours in force when text was drawn (at each BT), as [r, g, b] strings — the inks on the page. O(tokens). */
export function textInks(content) {
  const inks = new Set();
  let ops = [], fill = null;
  for (const tok of content.toString("latin1").split(/\s+/)) {
    if (/^[-+.\d]/.test(tok)) { ops.push(Number(tok)); continue; }
    if (tok === "rg") fill = ops.slice(-3).map((c) => Math.round(c * 255)).join();
    else if (tok === "BT" && fill) inks.add(fill);
    ops = [];
  }
  return [...inks];
}

/** The named resource (an XObject) of a page or form: `/X12 12 0 R` → object 12. */
export function resource(objects, dict, name) {
  const m = dict.match(new RegExp(`${name.replace("/", "\\/")} (\\d+) 0 R`));
  return m ? objects.get(Number(m[1])) : undefined;
}

/** Every object reachable from a dictionary, transitively. O(objects). */
export function reachable(objects, dict) {
  const seen = new Set(), queue = refs(dict);
  while (queue.length) {
    const n = queue.shift();
    if (seen.has(n) || !objects.has(n)) continue;
    seen.add(n);
    queue.push(...refs(objects.get(n).dict));
  }
  return [...seen].map((n) => objects.get(n));
}

/**
 * How many times the middle row of a grey image crosses mid-grey: a striped
 * mask alternates many times, a flat one never, so the number is the
 * pattern's survival measured on the bytes a viewer will paint.
 */
export function greyRowTransitions(o) {
  const w = Number(o.dict.match(/\/Width (\d+)/)[1]), h = Number(o.dict.match(/\/Height (\d+)/)[1]);
  const row = o.stream.subarray(Math.floor(h / 2) * w, Math.floor(h / 2) * w + w);
  let n = 0;
  for (let i = 1; i < row.length; i++) if ((row[i] > 127) !== (row[i - 1] > 127)) n++;
  return n;
}
