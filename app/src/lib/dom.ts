// Two element builders, so a page composes its DOM without innerHTML for
// anything that carries data. `h` for HTML, `svg` for the SVG namespace.
type Attrs = Record<string, string | number | boolean | undefined>;

function setAttrs(el: Element, attrs: Attrs): void {
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (k === "class") el.setAttribute("class", String(v));
    else el.setAttribute(k, v === true ? "" : String(v));
  }
}

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...children: (Node | string | null | undefined | false)[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  setAttrs(el, attrs);
  for (const c of children) if (c !== null && c !== undefined && c !== false) el.append(c);
  return el;
}

const NS = "http://www.w3.org/2000/svg";
export function svg<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Attrs = {}, text?: string): SVGElementTagNameMap[K] {
  const el = document.createElementNS(NS, tag);
  setAttrs(el, attrs);
  if (text !== undefined) el.textContent = text;
  return el;
}
