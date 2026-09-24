// What a sideways scroller says about itself (design/TASKS.md, 2026-09-24):
// the edge fade on `.hg-scroll-x` is drawn only on a side that still has
// content, and the words that invite the gesture name the gesture the reader
// actually has.
//
// The fade used to be pure CSS — covering gradients that scroll with the
// content over shadows that do not — which needs the scroller's ground to be
// exactly one colour. It is not: the curve sits on the figure's surface, the
// map on the page's plane, the "Show the numbers" table inside a disclosure,
// and wherever the two disagreed a grey band stood at both edges of a figure
// that did not scroll at all (the chart gutters and the /places map at 1280).
// So the page measures instead: `data-overflow-start` / `data-overflow-end`
// are set while there is content past that edge, and tokens.css keys the
// shadows on them. O(1) per scroll or resize; no layout is forced beyond the
// three numbers read.

/**
 * Whether the reader has a mouse or a trackpad rather than a finger: "swipe"
 * is a touch word, and on a fine pointer the same invitation says "scroll".
 * A hybrid laptop reports its primary pointer, which is the one it is held by.
 */
export const finePointer = (): boolean =>
  typeof matchMedia === "function" && matchMedia("(hover: hover) and (pointer: fine)").matches;

/** Each watched scroller's own re-measure, so a disclosure opening can ask the ones inside it. */
const updaters = new WeakMap<HTMLElement, () => void>();

/** Keep `el`'s two overflow attributes true: on scroll, on a resize of the box or of what is in it, and when its children change. Idempotent. */
export function scrollEdges(el: HTMLElement): void {
  if (updaters.has(el)) return;
  const update = (): void => {
    const max = el.scrollWidth - el.clientWidth, at = Math.abs(el.scrollLeft);   /* abs: an RTL scroller counts down from 0 */
    el.toggleAttribute("data-overflow-start", max > 1 && at > 1);
    el.toggleAttribute("data-overflow-end", max > 1 && at < max - 1);
  };
  updaters.set(el, update);
  el.addEventListener("scroll", update, { passive: true });
  const ro = new ResizeObserver(update);
  const watch = (): void => { ro.observe(el); for (const c of el.children) ro.observe(c); };
  /* A new child (the map's tiles are re-rendered, a table replaced) is a new width the box itself never sees change. */
  new MutationObserver(() => { watch(); update(); }).observe(el, { childList: true });
  watch();
  update();
}

let watching = false;

/**
 * Every `.hg-scroll-x` in the document, now and later — a scroller a page
 * builds after this call (the "Show the numbers" table, the map's grid, which
 * becomes a scroller only when render adds the class) included. Idempotent,
 * so each surface that owns a scroller may call it. One observer; its
 * callback runs once per batch of mutations, however large the redraw.
 */
export function watchScrollEdges(root: ParentNode & Node = document.body): void {
  const all = (): void => { for (const el of root.querySelectorAll<HTMLElement>(".hg-scroll-x")) scrollEdges(el); };
  all();
  if (watching) return;
  watching = true;
  new MutationObserver(all).observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
  /* A scroller inside a closed disclosure keeps reporting its last box, so no resize is seen when the
     disclosure opens: re-measure the ones inside it on toggle (which does not bubble, hence capture). */
  document.addEventListener("toggle", (e) => {
    const d = e.target as HTMLElement;
    if (d instanceof HTMLElement) for (const el of d.querySelectorAll<HTMLElement>(".hg-scroll-x")) updaters.get(el)?.();
  }, true);
}
