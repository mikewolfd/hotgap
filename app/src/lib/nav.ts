// The site's own way around: the wordmark links home, and a three-item nav
// names the three pages, the current one marked. Both sit in the top row of
// every page — the editor's ScenarioBar on the citizen and caseworker pages,
// the masthead on /places — and never on paper. The language travels with
// the links, as it does with the language switch (lang.ts).
import { catalog, withLang } from "./copy.js";
import { h } from "./dom.js";

export type Page = "citizen" | "places" | "caseworker";

const PATH: Record<Page, string> = { citizen: "/", places: "/places", caseworker: "/caseworker" };

/** A page's address, `params` as its query and the active language carried. */
export function pageHref(page: Page, params = new URLSearchParams()): string {
  const q = withLang(params).toString();
  return PATH[page] + (q ? `?${q}` : "");
}

/** The wordmark as a link home. */
export const wordmark = (text: string, cls = "hg-wordmark"): HTMLElement =>
  h("a", { class: cls, href: pageHref("citizen") }, text);

/** The three pages, the current one `aria-current="page"`. */
export function siteNav(current: Page): HTMLElement {
  const N = catalog.shared.nav;
  return h("nav", { class: "hg-nav hg-no-print", "aria-label": N.label },
    ...(["citizen", "places", "caseworker"] as const).map((p) =>
      h("a", { href: pageHref(p), ...(p === current ? { "aria-current": "page" } : {}) }, N[p])));
}
