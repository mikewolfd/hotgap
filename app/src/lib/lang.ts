// The language switch (app/README.md § Languages: "the locale travels"):
// one link per language in LANGUAGES, each named in its own language
// (Intl's autonym — "English", "Español" — never a name a translator has
// to keep in every other file), the active one marked and not a link. A
// link is the page's own address with `lang=` set, so the household, the
// what-ifs or the view travel with the language; landing on it is a fresh
// page load in that language, the one path every module resolves its
// catalog through (lib/copy.ts). The switch's own label is copy
// (`shared.language.label`). Sits in the ScenarioBar's top row and the
// journalist masthead; never on paper.
import { catalog, LANG_PARAM, LANGUAGES, languageName, locale } from "./copy.js";
import { h } from "./dom.js";

/** This page's address in another language: the search as it stands, `lang` set. */
export const langHref = (tag: string): string => {
  const q = new URLSearchParams(location.search);
  q.set(LANG_PARAM, tag);
  return `?${q}${location.hash}`;
};

export function languageSwitch(): HTMLElement {
  const active = locale();
  return h("nav", { class: "hg-lang hg-no-print", "aria-label": catalog.shared.language.label },
    ...LANGUAGES.map((tag) => (tag === active
      ? h("span", { "aria-current": "true", lang: tag }, languageName(tag))
      : h("a", { href: langHref(tag), lang: tag, hreflang: tag }, languageName(tag)))));
}
